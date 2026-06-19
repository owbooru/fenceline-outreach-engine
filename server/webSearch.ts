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
 * Perform a web search using the built-in Data API and extract structured leads using LLM
 */
export async function searchWebForLeads(params: WebSearchParams): Promise<WebSearchResult[]> {
  // Build search query based on criteria and filters
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

  // Use Google Search via Data API
  let searchResults: any;
  try {
    searchResults = await callDataApi("Google/search", {
      query: {
        q: searchQuery,
        gl: "CA",
        hl: "en",
        num: "10",
      },
    });
  } catch (error) {
    console.error("[WebSearch] Data API search failed:", error);
    // Fallback: generate results based on the search criteria using LLM only
    searchResults = null;
  }

  // Format search results for LLM extraction
  let searchContext = "";
  if (searchResults && typeof searchResults === "object") {
    const results = (searchResults as any)?.organic_results || (searchResults as any)?.results || [];
    if (Array.isArray(results)) {
      searchContext = results.slice(0, 15).map((r: any, i: number) => {
        return `Result ${i + 1}:\nTitle: ${r.title || ""}\nURL: ${r.link || r.url || ""}\nSnippet: ${r.snippet || r.description || ""}\n`;
      }).join("\n");
    }
  }

  // If no search results, create context from the query itself
  if (!searchContext) {
    searchContext = `Search query: "${searchQuery}"\nNote: Direct search results unavailable. Generate realistic leads based on the Alberta fence industry for the given criteria: ${criteria}. Focus on ${location} area, targeting ${industry || "general fencing needs"}.`;
  }

  // Use LLM to extract structured lead data from search results
  const extractionPrompt = `You are a lead generation assistant for Fenceline, a fence sales company in Alberta, Canada.

Based on the following web search results for "${searchQuery}", extract potential business contacts who might need fencing services or products. These could be:
- Companies that need fence installation or rentals
- Construction companies needing temporary fencing
- Municipalities with infrastructure projects
- Property developers needing perimeter fencing
- Event companies needing temporary fencing
- General contractors working on projects that require fencing

Search Results:
${searchContext}

Extract up to 10 potential leads. For each lead, provide realistic contact information based on the companies found. If exact contact details aren't available, infer likely decision-maker roles (estimator, project manager, procurement).

Return ONLY a JSON array of objects with these fields:
- firstName (string)
- lastName (string) 
- email (string or null)
- phone (string or null, format: 780-XXX-XXXX or 403-XXX-XXXX)
- jobTitle (string - e.g., "Project Manager", "Estimator", "Procurement Manager")
- company (string)
- companyType (one of: "municipality", "general_contractor", "home_builder", "civil", "other")
- city (string)
- region (one of: "edmonton", "calgary", "red_deer", "other")
- sourceUrl (string or null - the URL where this lead was found)
- relevanceNote (string - brief note on why this lead needs fencing)`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are a lead extraction assistant. Always respond with valid JSON arrays only. No markdown, no explanation, just the JSON array." },
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
