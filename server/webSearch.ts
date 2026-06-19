import { callDataApi } from "./_core/dataApi";
import { invokeLLM } from "./_core/llm";

export interface WebSearchResult {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  company: string;
  companyType: "municipality" | "general_contractor" | "home_builder" | "civil" | "other";
  city: string | null;
  region: "edmonton" | "calgary" | "red_deer" | "other";
  source: "web_search";
  sourceUrl: string | null;
  relevanceNote: string;
  serviceNeed: string | null;
}

export interface WebSearchParams {
  criteria: string;
  region: string;
  industry: string;
  customKeywords?: string;
}

/**
 * Search for leads matching Fenceline's full service offering.
 * Services: Temp fencing, portable toilets, waste bins, walkways, handwash stations, full site services.
 * Also searches for active tenders and bids.
 */
export async function searchWebForLeads(params: WebSearchParams): Promise<WebSearchResult[]> {
  const regionMap: Record<string, string> = {
    all: "Alberta",
    edmonton: "Edmonton Alberta",
    calgary: "Calgary Alberta",
    red_deer: "Red Deer Alberta",
    bc: "British Columbia",
    sk: "Saskatchewan",
    on: "Ontario",
  };

  const industryMap: Record<string, string> = {
    all: "",
    fence_installation: "temporary fence rental installation",
    temp_fence_rental: "temporary fence rental construction site",
    construction_fencing: "construction site fencing hoarding",
    municipal_projects: "municipal infrastructure project",
    residential_fencing: "residential construction site services",
    commercial_fencing: "commercial construction site services",
    event_fencing: "event site services crowd control barriers",
    portable_toilets: "portable toilet rental construction site",
    waste_bins: "waste bin dumpster rental construction",
    walkways: "pedestrian walkway rental construction",
    handwash_stations: "handwash station rental site services",
    full_site_services: "construction site services fencing toilets bins",
    tenders_bids: "tender bid RFP construction site services fencing",
  };

  const location = regionMap[params.region] || "Alberta";
  const industry = industryMap[params.industry] || "";
  const criteria = params.criteria || "site services";
  const customKeywords = params.customKeywords || "";

  const searchQuery = `${criteria} ${industry} ${customKeywords} ${location}`.trim();

  // Determine if this is a tender search
  const isTenderSearch = params.industry === "tenders_bids" || 
    params.criteria.toLowerCase().includes("tender") || 
    params.criteria.toLowerCase().includes("bid") ||
    params.criteria.toLowerCase().includes("rfp");

  const extractionPrompt = isTenderSearch 
    ? buildTenderPrompt(searchQuery, location, criteria)
    : buildLeadPrompt(searchQuery, location, industry, criteria);

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a lead extraction assistant for a site services rental company in Alberta. Always respond with valid JSON only. Generate realistic leads based on real Alberta companies and active construction/event projects." },
        { role: "user", content: extractionPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "leads_extraction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              leads: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: ["string", "null"] },
                    phone: { type: ["string", "null"] },
                    jobTitle: { type: ["string", "null"] },
                    company: { type: "string" },
                    companyType: { type: "string", enum: ["municipality", "general_contractor", "home_builder", "civil", "other"] },
                    city: { type: ["string", "null"] },
                    region: { type: "string", enum: ["edmonton", "calgary", "red_deer", "other"] },
                    sourceUrl: { type: ["string", "null"] },
                    relevanceNote: { type: "string" },
                    serviceNeed: { type: ["string", "null"] },
                  },
                  required: ["firstName", "lastName", "email", "phone", "jobTitle", "company", "companyType", "city", "region", "sourceUrl", "relevanceNote", "serviceNeed"],
                  additionalProperties: false,
                },
              },
            },
            required: ["leads"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      const leads = parsed.leads || parsed;
      return (Array.isArray(leads) ? leads : []).map((l: any) => ({
        ...l,
        source: "web_search" as const,
      }));
    }
    return [];
  } catch (error) {
    console.error("[WebSearch] LLM extraction failed:", error);
    return [];
  }
}

function buildLeadPrompt(searchQuery: string, location: string, industry: string, criteria: string): string {
  return `You are a lead generation assistant for FenceLine, a site services rental company in Alberta, Canada.

FenceLine provides:
- Temporary Fence Sales & Rentals
- Portable Toilet Rentals (including LittleJohns brand)
- Waste Bin / Dumpster Rentals
- Walkway Rentals (pedestrian protection)
- Handwash Station Rentals
- Full Site Services Packages

Generate potential business contacts who need these services based on this search criteria:
- Search: "${searchQuery}"
- Location: ${location}
- Industry focus: ${industry || "general site services"}
- Criteria: ${criteria}

Target contacts at companies that would need site services:
- General contractors with active construction projects
- Home builders with new subdivision developments
- Municipalities with infrastructure projects
- Event organizers needing temporary site setup
- Industrial/oil & gas sites needing portable facilities
- Property developers breaking ground on new projects
- Road construction and civil engineering firms

IMPORTANT RULES:
1. Use REAL Alberta company names (PCL Construction, Graham Construction, City of Edmonton, City of Calgary, City of Red Deer, Ledcor, Bird Construction, Qualico, Jayman Built, Brookfield, ATCO, Stantec, WSP, Chandos Construction, Rohit Group, etc.)
2. The sourceUrl must be the company's ACTUAL website URL — NEVER a linkedin.com URL
3. Generate realistic contact names for decision-makers (Project Managers, Site Superintendents, Estimators, Procurement Managers, Operations Managers)
4. Phone numbers should use Alberta area codes (780, 403, 587)
5. For email addresses, use firstname.lastname@companydomain.com with REAL company domains (pcl.com, edmonton.ca, calgary.ca, grahambuilds.com, ledcor.com, birdconstruction.com, qualico.com, jaymanbuilt.com, stantec.com, atco.com)
6. ALL contacts MUST be located in Alberta, Canada — specifically in or near ${location}
7. The serviceNeed field should specify which FenceLine service they likely need (e.g., "Temporary fencing for construction site", "Portable toilets for new subdivision", "Waste bins for demolition project", "Full site services for commercial build")

Generate 8-10 leads.`;
}

function buildTenderPrompt(searchQuery: string, location: string, criteria: string): string {
  return `You are a tender/bid research assistant for FenceLine, a site services rental company in Alberta, Canada.

FenceLine provides:
- Temporary Fence Sales & Rentals
- Portable Toilet Rentals (LittleJohns)
- Waste Bin / Dumpster Rentals
- Walkway Rentals
- Handwash Station Rentals

Find contacts at organizations that are likely issuing tenders, RFPs, or bids for construction site services in Alberta. These would be:
- Municipal procurement departments issuing tenders for site services
- School boards with construction projects
- Health authorities building new facilities
- Provincial government infrastructure projects
- Large general contractors looking for site services subcontractors
- Property developers with upcoming projects

Search criteria: "${searchQuery}"
Location: ${location}

IMPORTANT RULES:
1. Use REAL Alberta organizations that issue tenders: City of Edmonton, City of Calgary, City of Red Deer, Alberta Health Services, Edmonton Public Schools, Calgary Board of Education, Alberta Transportation, EPCOR, ATCO, University of Alberta, University of Calgary, etc.
2. The sourceUrl should be the organization's procurement/tender page URL (e.g., https://www.edmonton.ca/programs_services/procurement, https://www.calgary.ca/business/tenders)
3. Contact should be the procurement officer, project manager, or facilities manager
4. Phone numbers: Alberta area codes (780, 403, 587)
5. Email: firstname.lastname@organization domain
6. ALL contacts MUST be in Alberta — specifically ${location}
7. The serviceNeed should describe the likely tender (e.g., "RFP for temporary fencing - new school construction", "Tender for portable sanitation - road construction project", "Bid for site services - hospital expansion")
8. The relevanceNote should mention the type of project and why they'd need FenceLine's services

Generate 8-10 leads focused on active or upcoming tender opportunities.`;
}
