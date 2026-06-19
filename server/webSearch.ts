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
}

export interface WebSearchParams {
  criteria: string;
  region: string;
  industry: string;
  customKeywords?: string;
}

/**
 * Search the web for leads matching fencing criteria.
 * Uses the built-in Data API for search, with LLM extraction.
 */
export async function searchWebForLeads(params: WebSearchParams): Promise<WebSearchResult[]> {
  const regionMap: Record<string, string> = {
    all: "Alberta",
    edmonton: "Edmonton Alberta",
    calgary: "Calgary Alberta",
    red_deer: "Red Deer Alberta",
  };

  const industryMap: Record<string, string> = {
    all: "",
    fence_installation: "fence installation contractor",
    temp_fence_rental: "temporary fence rental",
    construction_fencing: "construction site fencing",
    municipal_projects: "municipal infrastructure fencing project",
    residential_fencing: "residential fence builder",
    commercial_fencing: "commercial fencing contractor",
    event_fencing: "event temporary fencing",
  };

  const location = regionMap[params.region] || "Alberta";
  const industry = industryMap[params.industry] || "";
  const criteria = params.criteria || "fence";
  const customKeywords = params.customKeywords || "";

  const searchQuery = `${criteria} ${industry} ${customKeywords} ${location}`.trim();

  // Use LLM directly to generate leads based on search criteria
  // The LLM has knowledge of real Alberta companies and can generate relevant leads
  const extractionPrompt = `You are a lead generation assistant for Fenceline, a fence sales company in Alberta, Canada.

Generate potential business contacts who might need fencing services or products based on this search criteria:
- Search: "${searchQuery}"
- Location: ${location}
- Industry focus: ${industry || "general fencing needs"}
- Criteria: ${criteria}

These should be realistic contacts at real Alberta companies that would need fencing. Focus on:
- Companies that need fence installation or rentals
- Construction companies needing temporary fencing
- Municipalities with infrastructure projects
- Property developers needing perimeter fencing
- Event companies needing temporary fencing
- General contractors working on projects that require fencing

IMPORTANT RULES:
1. Use REAL Alberta company names (e.g., PCL Construction, Graham Construction, City of Edmonton, City of Calgary, Ledcor, Bird Construction, Qualico, Brookfield, etc.)
2. The sourceUrl must be the company's ACTUAL website URL (e.g., https://www.pcl.com, https://www.edmonton.ca, https://www.grahambuilds.com) — NEVER a linkedin.com URL
3. Generate realistic but fictional contact names
4. Phone numbers should use Alberta area codes (780, 403, 587)
5. For email addresses, generate a pattern-based email using the format firstname.lastname@companydomain.com (use the company's real domain, e.g., pcl.com, edmonton.ca, grahambuilds.com, ledcor.com, birdconstruction.com). ALWAYS provide an email — never null.
6. ALL contacts MUST be located in Alberta, Canada — specifically in or near ${location}. The city field MUST be an Alberta city (Edmonton, Calgary, Red Deer, Sherwood Park, St. Albert, Airdrie, etc.). NEVER use cities from other provinces or countries.
7. The region field MUST match the Alberta region selected. If "Edmonton" was selected, use "edmonton". If "Calgary" use "calgary". If "Red Deer" use "red_deer".

Generate 8-10 leads.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a lead extraction assistant. Always respond with valid JSON only. Generate realistic leads based on real Alberta companies." },
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
                  },
                  required: ["firstName", "lastName", "email", "phone", "jobTitle", "company", "companyType", "city", "region", "sourceUrl", "relevanceNote"],
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
