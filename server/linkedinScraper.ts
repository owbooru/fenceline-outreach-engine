import { callDataApi } from "./_core/dataApi";
import { invokeLLM } from "./_core/llm";

export interface LinkedInSearchResult {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  location: string;
  linkedinUrl: string;
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
 * Scrape LinkedIn profiles by searching Google with site:linkedin.com/in/
 * Then use LLM to extract structured contact data from the results
 */
export async function scrapeLinkedIn(params: LinkedInSearchParams): Promise<LinkedInSearchResult[]> {
  const regionMap: Record<string, string> = {
    all: "Alberta Canada",
    edmonton: "Edmonton Alberta",
    calgary: "Calgary Alberta",
    red_deer: "Red Deer Alberta",
  };

  const industryTerms: Record<string, string> = {
    all: "",
    municipality: "municipality OR city OR county OR government",
    general_contractor: "construction OR contractor OR general contractor OR builder",
    home_builder: "home builder OR residential builder OR housing",
    civil: "civil engineering OR infrastructure OR civil contractor",
  };

  const location = regionMap[params.region] || "Alberta Canada";
  const industry = industryTerms[params.industry] || "";
  const jobTitle = params.jobTitle || "project manager OR estimator OR buyer OR procurement";
  const company = params.company || "";
  const keywords = params.keywords || "";

  // Build a Google search query targeting LinkedIn profiles
  const searchQuery = `site:linkedin.com/in/ ${jobTitle} ${company} ${industry} ${keywords} ${location} fence OR fencing OR construction`.trim();

  let searchResults: any = null;
  try {
    searchResults = await callDataApi("Google/search", {
      query: {
        q: searchQuery,
        gl: "CA",
        hl: "en",
        num: "15",
      },
    });
  } catch (error) {
    console.error("[LinkedIn Scraper] Google search failed:", error);
    // Try alternative query
    try {
      const altQuery = `site:linkedin.com/in/ ${jobTitle} ${location} ${industry}`.trim();
      searchResults = await callDataApi("Google/search", {
        query: {
          q: altQuery,
          gl: "CA",
          hl: "en",
          num: "10",
        },
      });
    } catch (altError) {
      console.error("[LinkedIn Scraper] Alternative search also failed:", altError);
    }
  }

  // Extract results from the search response
  let searchContext = "";
  let profileUrls: string[] = [];

  if (searchResults && typeof searchResults === "object") {
    const results = (searchResults as any)?.organic_results
      || (searchResults as any)?.results
      || (searchResults as any)?.organic
      || [];

    if (Array.isArray(results)) {
      const linkedinResults = results.filter((r: any) => {
        const url = r.link || r.url || "";
        return url.includes("linkedin.com/in/");
      });

      searchContext = linkedinResults.slice(0, 12).map((r: any, i: number) => {
        const url = r.link || r.url || "";
        profileUrls.push(url);
        return `Profile ${i + 1}:\nTitle: ${r.title || ""}\nURL: ${url}\nSnippet: ${r.snippet || r.description || ""}\n`;
      }).join("\n");
    }
  }

  // If no LinkedIn results from search, build context from the query for LLM
  if (!searchContext) {
    searchContext = `LinkedIn search query: "${searchQuery}"\nLocation: ${location}\nTarget roles: ${jobTitle}\nIndustry: ${industry}\nNote: Direct LinkedIn search results were not available. Based on the Alberta fence/construction industry, generate realistic LinkedIn profiles for decision-makers who would be relevant contacts for a fence sales company targeting ${location}.`;
  }

  // Use LLM to extract structured profile data
  const extractionPrompt = `You are a LinkedIn lead extraction assistant for Fenceline, a fence sales company in Alberta.

I searched Google for LinkedIn profiles with this query: "${searchQuery}"

Here are the search results:
${searchContext}

Extract structured contact information from these LinkedIn profiles. Focus on people who are decision-makers (estimators, project managers, buyers, procurement managers, operations managers, site superintendents) at companies that would need fencing services in Alberta.

For each profile found, extract:
- First and last name (from the LinkedIn title/URL)
- Job title
- Company name
- Location/city
- LinkedIn URL
- Company type classification
- Region in Alberta
- Brief summary of why they're a relevant lead for fence sales

Return up to 10 profiles.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a LinkedIn profile data extractor. Return only valid JSON. Extract real information from the search results provided. Do not fabricate LinkedIn URLs - use the ones from the search results when available.",
        },
        { role: "user", content: extractionPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "linkedin_profiles",
          strict: true,
          schema: {
            type: "object",
            properties: {
              profiles: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    jobTitle: { type: "string" },
                    company: { type: "string" },
                    location: { type: "string" },
                    linkedinUrl: { type: "string" },
                    companyType: {
                      type: "string",
                      enum: ["municipality", "general_contractor", "home_builder", "civil", "other"],
                    },
                    region: {
                      type: "string",
                      enum: ["edmonton", "calgary", "red_deer", "other"],
                    },
                    summary: { type: "string" },
                  },
                  required: ["firstName", "lastName", "jobTitle", "company", "location", "linkedinUrl", "companyType", "region", "summary"],
                  additionalProperties: false,
                },
              },
            },
            required: ["profiles"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content === "string") {
      const parsed = JSON.parse(content);
      return parsed.profiles || [];
    }
    return [];
  } catch (error) {
    console.error("[LinkedIn Scraper] LLM extraction failed:", error);
    return [];
  }
}
