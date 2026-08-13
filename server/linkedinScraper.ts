import { callDataApi } from "./_core/dataApi";

export interface LinkedInSearchResult {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  location: string;
  linkedinUrl: string;
  email: string;
  companyType: "municipality" | "general_contractor" | "home_builder" | "civil" | "other";
  region: "edmonton" | "calgary" | "red_deer" | "other";
  summary: string;
}

export interface LinkedInSearchParams {
  jobTitle: string;
  company: string;
  region: string;
  industry: string;
  keywords: string;
}

/**
 * Search LinkedIn profiles using the built-in LinkedIn/search_people Data API
 */
export async function scrapeLinkedIn(params: LinkedInSearchParams): Promise<LinkedInSearchResult[]> {
  const regionTerms: Record<string, string> = {
    all: "Alberta",
    edmonton: "Edmonton",
    calgary: "Calgary",
    red_deer: "Red Deer",
  };

  const industryTerms: Record<string, string> = {
    all: "construction fence",
    municipality: "municipality government",
    general_contractor: "construction contractor",
    home_builder: "home builder residential",
    civil: "civil engineering infrastructure",
  };

  const location = regionTerms[params.region] || "Alberta";
  const industry = industryTerms[params.industry] || "";
  const jobTitle = params.jobTitle || "project manager";
  const company = params.company || "";
  const keywords = params.keywords || "";

  // Build keywords for LinkedIn search
  const searchKeywords = `${jobTitle} ${industry} ${keywords} ${location}`.trim();

  let searchResults: any = null;
  try {
    // Use the real LinkedIn/search_people API
    const queryParams: Record<string, string> = {
      keywords: searchKeywords,
    };
    if (jobTitle) queryParams.keywordTitle = jobTitle.replace(/ OR /g, " ");
    if (company) queryParams.company = company;

    searchResults = await callDataApi("LinkedIn/search_people", {
      query: queryParams,
    });
  } catch (error) {
    console.error("[LinkedIn Scraper] LinkedIn API search failed:", error);
  }

  // Extract profiles from the API response
  let profiles: any[] = [];
  if (searchResults && typeof searchResults === "object") {
    const data = (searchResults as any)?.data || searchResults;
    const items = data?.items || data?.results || [];
    if (Array.isArray(items)) {
      profiles = items;
    }
  }

  // If we got real LinkedIn results, format them directly
  if (profiles.length > 0) {
    return profiles.slice(0, 10).map((p: any) => {
      const fullName = p.fullName || p.name || "";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";
      const headline = p.headline || p.title || "";
      const profileUrl = p.profileURL || p.url || p.profileUrl || "";
      const loc = p.location || "";

      // Determine company type based on headline/company
      let companyType: "municipality" | "general_contractor" | "home_builder" | "civil" | "other" = "other";
      const headlineLower = headline.toLowerCase();
      if (headlineLower.includes("city") || headlineLower.includes("county") || headlineLower.includes("municipal") || headlineLower.includes("government")) {
        companyType = "municipality";
      } else if (headlineLower.includes("construction") || headlineLower.includes("contractor") || headlineLower.includes("builder")) {
        companyType = "general_contractor";
      } else if (headlineLower.includes("home") || headlineLower.includes("residential")) {
        companyType = "home_builder";
      } else if (headlineLower.includes("civil") || headlineLower.includes("infrastructure")) {
        companyType = "civil";
      }

      // Determine region
      let region: "edmonton" | "calgary" | "red_deer" | "other" = "other";
      const locLower = loc.toLowerCase();
      if (locLower.includes("edmonton")) region = "edmonton";
      else if (locLower.includes("calgary")) region = "calgary";
      else if (locLower.includes("red deer")) region = "red_deer";

      // Extract company from headline (usually "Title at Company")
      let extractedCompany = "";
      if (headline.includes(" at ")) {
        extractedCompany = headline.split(" at ").pop() || "";
      } else if (headline.includes(" | ")) {
        extractedCompany = headline.split(" | ").pop() || "";
      }

      // Extract job title from headline
      let extractedTitle = headline;
      if (headline.includes(" at ")) {
        extractedTitle = headline.split(" at ")[0] || headline;
      } else if (headline.includes(" | ")) {
        extractedTitle = headline.split(" | ")[0] || headline;
      }

      // Generate pattern-based email from name + company
      const companyDomain = (extractedCompany || headline).toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 20) + ".com";
      const patternEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase().split(" ")[0]}@${companyDomain}`;

      return {
        firstName,
        lastName,
        jobTitle: extractedTitle.trim(),
        company: extractedCompany.trim() || headline,
        location: loc,
        linkedinUrl: profileUrl.startsWith("http") ? profileUrl : `https://www.linkedin.com/in/${p.username || ""}`,
        email: patternEmail,
        companyType,
        region,
        summary: headline,
      };
    });
  }

  // No real LinkedIn results. We intentionally do NOT fabricate profiles here.
  // The real LinkedIn people-search ran through Manus's hosted Data API, which
  // isn't available off-Manus — so rather than invent fake leads, we return an
  // empty list and keep "Find" honest (real data only). Use the tender/web-search
  // path or CSV import for real contacts.
  return [];
}
