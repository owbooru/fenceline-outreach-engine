import axios from "axios";

export interface WebSearchResult {
  name: string;
  company: string;
  role: string;
  region: string;
  email: string;
  pattern: string;
  status: string;
  source: string;
  serviceNeed?: string;
}

export interface WebSearchParams {
  criteria: string;
  region: string;
  industry: string;
  customKeywords?: string;
}

const regionMap: Record<string, string> = {
  all_alberta: "Alberta",
  edmonton: "Edmonton",
  calgary: "Calgary",
  red_deer: "Red Deer",
  ontario: "Ontario",
  bc: "British Columbia",
  saskatchewan: "Saskatchewan",
};

const serviceMap: Record<string, string> = {
  all_fencing: "fencing fence chain link",
  temp_fence_rentals: "temporary fence rental",
  temp_fence_sales: "temporary fence",
  perm_fence_sales: "permanent fence chain link ornamental",
  construction_hoarding: "hoarding construction barrier",
  event_fencing: "event fencing crowd control",
  security_fencing: "security fence perimeter",
};

/**
 * Attempts to launch Puppeteer for JavaScript-rendered pages.
 * On the VPS (8 vCore, 16GB RAM), Chromium will be installed.
 * In dev/sandbox, falls back to HTTP scraping.
 */
async function scrapeWithBrowser(url: string): Promise<string> {
  try {
    const puppeteer = await import("puppeteer-core");
    // Try common Chromium paths on Linux
    const executablePaths = [
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/google-chrome",
      "/usr/bin/google-chrome-stable",
      "/snap/bin/chromium",
    ];
    
    let executablePath = "";
    const fs = await import("fs");
    for (const p of executablePaths) {
      if (fs.existsSync(p)) { executablePath = p; break; }
    }
    
    if (!executablePath) {
      console.log("[WebSearch] No Chromium found — falling back to HTTP scraping");
      throw new Error("No Chromium installed");
    }

    const browser = await puppeteer.default.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
    
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 20000 });
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const html = await page.content();
    await browser.close();
    return html;
  } catch (err) {
    // Fallback to simple HTTP
    const resp = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" },
    });
    return resp.data as string;
  }
}

export async function searchWebForLeads(params: WebSearchParams): Promise<WebSearchResult[]> {
  const location = regionMap[params.region] || "Alberta";
  const service = serviceMap[params.criteria] || "fencing";
  const results: WebSearchResult[] = [];
  console.log(`[WebSearch] Starting search: criteria=${params.criteria}, region=${params.region}, industry=${params.industry}`);

  // NOTE: the LinkedIn people-search step was removed. It relied on Manus's
  // hosted Data API (forge), which is not available off-Manus. "Find" now sources
  // real leads purely from live scraping of the public tender/procurement portals
  // below (Alberta Purchasing Connection, MERX, City of Edmonton) — no fake data.

  // Step 1: Scrape Alberta Purchasing Connection for REAL fencing tenders
  try {
    console.log("[WebSearch] Scraping Alberta Purchasing Connection...");
    const html = await scrapeWithBrowser("https://purchasing.alberta.ca/search?npo=1");
    
    // Look for tender posting links (AB-YYYY-NNNNN format)
    const tenderPattern = /AB-\d{4}-\d{5}/g;
    const allMatches = html.match(tenderPattern) || [];
    const tenderIds = Array.from(new Set(allMatches)).slice(0, 8);
    console.log(`[WebSearch] Found ${tenderIds.length} tender IDs on APC`);
    
    // For each tender, try to get details
    for (const tenderId of tenderIds.slice(0, 5)) {
      try {
        const tenderHtml = await scrapeWithBrowser(`https://purchasing.alberta.ca/posting/${tenderId}`);
        const lowerHtml = tenderHtml.toLowerCase();
        
        // Only include fencing-related tenders
        if (!lowerHtml.includes("fenc") && !lowerHtml.includes("chain link") && 
            !lowerHtml.includes("hoarding") && !lowerHtml.includes("barrier") &&
            !lowerHtml.includes("guardrail")) continue;
        
        // Extract title
        const titleMatch = tenderHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const title = titleMatch?.[1]?.replace(/<[^>]*>/g, "").trim() || tenderId;
        
        // Extract emails
        const emailMatches = tenderHtml.match(/[\w.-]+@[\w.-]+\.\w{2,}/g) || [];
        const contactEmails = emailMatches.filter(e => 
          !e.includes("trans.tender") && !e.includes("merx") && !e.includes("noreply")
        );
        
        // Extract organization
        const orgPatterns = [
          /Contracting Organization[\s\S]*?<[^>]*>([^<]+)/,
          /Organization[\s\S]*?<[^>]*>([^<]+)/,
        ];
        let org = "Government of Alberta";
        for (const pat of orgPatterns) {
          const m = tenderHtml.match(pat);
          if (m && m[1]?.trim().length > 3) { org = m[1].trim(); break; }
        }

        if (contactEmails.length > 0) {
          results.push({
            name: contactEmails[0].split("@")[0].replace(/[._]/g, " "),
            company: org,
            role: "Procurement Contact",
            region: "Alberta",
            email: contactEmails[0],
            pattern: "Verified — from tender posting",
            status: "Verified",
            source: "Alberta Purchasing Connection",
            serviceNeed: `${title} — https://purchasing.alberta.ca/posting/${tenderId}`,
          });
        }

        // Extract interested suppliers with emails
        const supplierSection = tenderHtml.split(/[Ii]nterested [Ss]uppliers/)[1] || "";
        const supplierEmails = supplierSection.match(/[\w.-]+@[\w.-]+\.\w{2,}/g) || [];
        for (const email of supplierEmails.slice(0, 3)) {
          if (email.includes("gov.ab") || email.includes("merx") || email.includes("noreply")) continue;
          const domain = email.split("@")[1] || "";
          const companyFromDomain = domain.split(".")[0] || "";
          results.push({
            name: email.split("@")[0].replace(/[._]/g, " "),
            company: companyFromDomain,
            role: "Fencing Contractor / Supplier",
            region: "Alberta",
            email,
            pattern: "Verified — from tender bidder list",
            status: "Verified",
            source: "APC — Interested Supplier",
            serviceNeed: `Bidding on: ${title}`,
          });
        }
      } catch (tenderErr) {
        // Skip individual tender errors
      }
    }
  } catch (err) {
    console.log("[WebSearch] Alberta Purchasing Connection scrape error:", (err as Error).message);
  }
  console.log(`[WebSearch] After APC scrape: ${results.length} total results`);

  // Step 3: Try MERX for Alberta construction tenders
  try {
    console.log("[WebSearch] Checking MERX...");
    const merxHtml = await scrapeWithBrowser("https://www.merx.com/public/solicitations/alberta-373?search=fencing");
    
    // Look for solicitation links
    const solicitationLinks = merxHtml.match(/href="([^"]*solicitations\/open-bids[^"]*)"/g) || [];
    console.log(`[WebSearch] Found ${solicitationLinks.length} MERX solicitations`);
    
    for (const linkMatch of solicitationLinks.slice(0, 3)) {
      const href = linkMatch.replace('href="', '').replace('"', '');
      const fullUrl = href.startsWith("http") ? href : `https://www.merx.com${href}`;
      
      try {
        const solHtml = await scrapeWithBrowser(fullUrl);
        const lowerSol = solHtml.toLowerCase();
        if (!lowerSol.includes("fenc") && !lowerSol.includes("chain link") && !lowerSol.includes("construction")) continue;
        
        const titleMatch = solHtml.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
        const title = titleMatch?.[1]?.replace(/<[^>]*>/g, "").trim() || "MERX Tender";
        
        const emails = solHtml.match(/[\w.-]+@[\w.-]+\.\w{2,}/g) || [];
        const contactEmail = emails.find(e => !e.includes("merx") && !e.includes("noreply")) || "";
        
        if (contactEmail) {
          results.push({
            name: contactEmail.split("@")[0].replace(/[._]/g, " "),
            company: contactEmail.split("@")[1]?.split(".")[0] || "Unknown",
            role: "Procurement / Project Contact",
            region: "Alberta",
            email: contactEmail,
            pattern: "Verified — from MERX posting",
            status: "Verified",
            source: "MERX",
            serviceNeed: `${title} — ${fullUrl}`,
          });
        }
      } catch (solErr) {
        // Skip individual solicitation errors
      }
    }
  } catch (err) {
    console.log("[WebSearch] MERX scrape error:", (err as Error).message);
  }

  // Step 4: City of Edmonton procurement
  try {
    results.push({
      name: "City of Edmonton Procurement",
      company: "City of Edmonton",
      role: "Procurement Department",
      region: "Edmonton",
      email: "",
      pattern: "View active tenders on SAP Ariba",
      status: "Public Portal",
      source: "City of Edmonton",
      serviceNeed: "Active procurement opportunities — https://www.edmonton.ca/business_economy/selling_to_the_city/bid-procurement-opportunities",
    });
  } catch (err) {
    // Skip
  }

  console.log(`[WebSearch] Final results: ${results.length}`);

  // If no results from real sources, return a helpful message
  if (results.length <= 1) {
    results.push({
      name: "No live results — Chromium required",
      company: "System",
      role: "Info",
      region: location,
      email: "",
      pattern: "",
      status: "Info",
      source: "System",
      serviceNeed: "Install Chromium on the VPS to enable real-time scraping of tender portals. Run: sudo apt install chromium-browser. Then restart the app.",
    });
  }

  // Deduplicate
  const seen = new Set<string>();
  return results.filter(r => {
    const key = (r.email || r.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}
