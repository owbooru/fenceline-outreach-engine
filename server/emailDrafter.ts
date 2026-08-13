import { invokeLLM } from "./_core/llm";

// Audience framing per campaign track. Kept factual — no invented numbers.
const TRACK_CONTEXT: Record<string, string> = {
  existing_customers:
    "an EXISTING customer who has rented from FenceLine before. Reference the prior relationship warmly and let them know FenceLine now also SELLS fence wholesale (temporary fence, chain link, ornamental, construction hoarding), not just rentals.",
  new_local:
    "a NEW local Alberta prospect — a general contractor, home builder, or municipality. Offer temporary construction fencing, permanent perimeter fence, and hoarding, supplied and installed across Alberta.",
  new_national:
    "a NEW national prospect in Ontario, BC, or elsewhere in Canada. Emphasize competitive national fence pricing — temporary fence, chain link, security fencing, and construction hoarding shipped anywhere in Canada.",
};

export interface DraftEmailInput {
  track: "existing_customers" | "new_local" | "new_national";
  company?: string;
  contactName?: string;
  projectContext?: string;
  tone?: string;
  service?: string;
}

export interface DraftEmailResult {
  subject: string;
  body: string;
}

export async function draftOutreachEmail(
  input: DraftEmailInput
): Promise<DraftEmailResult> {
  const trackCtx = TRACK_CONTEXT[input.track] || TRACK_CONTEXT.new_local;
  const tone =
    input.tone?.trim() ||
    "friendly, direct, and concise — reads hand-written, not automated";

  const system = [
    "You are an expert B2B cold-outreach copywriter for FenceLine, a fencing supplier and installer based in Alberta, Canada.",
    "FenceLine sells and rents: temporary construction fencing, permanent chain link and ornamental fence, security/perimeter fence, and construction hoarding.",
    "Write ONE short outreach email (60-110 words) that reads like a real salesperson wrote it. No fluff, no buzzwords. End with one clear, low-friction ask (a quick conversation or a quote).",
    "Use merge fields where natural: {{first_name}}, {{company_name}}. Do NOT invent specific prices, statistics, or fake project names.",
  ].join(" ");

  const user = [
    `Audience: ${trackCtx}`,
    input.company ? `Company: ${input.company}` : "",
    input.contactName ? `Contact name: ${input.contactName}` : "",
    input.projectContext ? `Known context / project: ${input.projectContext}` : "",
    input.service ? `Emphasize this service: ${input.service}` : "",
    `Tone: ${tone}`,
    "Return a subject line and the email body.",
  ]
    .filter(Boolean)
    .join("\n");

  let result: any;
  try {
    result = await invokeLLM({
      model: "gpt-4o-mini",
      max_tokens: 600,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "outreach_email",
          strict: true,
          schema: {
            type: "object",
            properties: {
              subject: { type: "string" },
              body: { type: "string" },
            },
            required: ["subject", "body"],
            additionalProperties: false,
          },
        },
      },
    });
  } catch (err) {
    const msg = (err as Error).message || "";
    // invokeLLM throws synchronously when no LLM key is configured.
    if (/api[_ ]?key|not configured/i.test(msg)) {
      throw new Error(
        "AI drafting isn't configured yet — add an OpenAI key (BUILT_IN_FORGE_API_URL=https://api.openai.com and BUILT_IN_FORGE_API_KEY=<key>) to the server .env, then restart."
      );
    }
    throw new Error("AI drafting failed: " + msg);
  }

  const content = result?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI drafting returned an empty response.");
  let parsed: DraftEmailResult;
  try {
    parsed = typeof content === "string" ? JSON.parse(content) : content;
  } catch {
    throw new Error("AI drafting returned an unparseable response.");
  }
  return { subject: parsed.subject || "", body: parsed.body || "" };
}
