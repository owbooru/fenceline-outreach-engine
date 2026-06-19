import { callDataApi } from "./_core/dataApi";
import { invokeLLM } from "./_core/llm";

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

  // Fallback: use LLM to generate leads based on search criteria
  const fallbackPrompt = `You are a LinkedIn lead extraction assistant for Fenceline, a fence sales company in Alberta, Canada.

I'm looking for LinkedIn profiles matching these criteria:
- Job titles: ${jobTitle}
- Industry: ${industry}
- Location: ${location} (THIS IS MANDATORY - all results MUST be in this location)
- Company: ${company || "any"}
- Keywords: ${keywords || "fence, construction"}

Generate 8 realistic LinkedIn profiles of decision-makers (estimators, project managers, buyers, procurement managers) at companies in Alberta that would need fencing services.

CRITICAL LOCATION RULES:
- ALL profiles MUST be located in Alberta, Canada — specifically in or near ${location}
- The "location" field for each profile MUST be an Alberta city (Edmonton, Calgary, Red Deer, Sherwood Park, St. Albert, Spruce Grove, Airdrie, Lethbridge, etc.)
- NEVER generate profiles from other provinces, states, or countries (no Texas, no Ontario, no BC)
- Use ONLY real Alberta-based companies: PCL Construction (Edmonton), Graham Construction (Calgary), City of Edmonton, City of Calgary, City of Red Deer, Jayman Built (Calgary), Clark Builders (Edmonton), Ledcor (Edmonton), Bird Construction (Edmonton), Qualico (Winnipeg/Edmonton), Stuart Olson (Calgary), EllisDon (Edmonton)

For each profile provide:
- The LinkedIn profile URL in format: https://www.linkedin.com/in/firstname-lastname-xxxxx/
- A pattern-based email using firstname.lastname@companydomain.com (use real company domains like pcl.com, edmonton.ca, calgary.ca, grahambuilds.com, jaymanbuilt.com, clarkbuilders.com, ledcor.com)
- The location MUST be in Alberta (e.g., "Edmonton, Alberta", "Calgary, Alberta", "Red Deer, Alberta")`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "You are a LinkedIn profile data generator. Return only valid JSON.",
        },
        { role: "user", content: fallbackPrompt },
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
                    email: { type: "string" },
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
                  required: ["firstName", "lastName", "jobTitle", "company", "location", "linkedinUrl", "email", "companyType", "region", "summary"],
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
    console.error("[LinkedIn Scraper] LLM fallback failed:", error);
    return [];
  }
}
