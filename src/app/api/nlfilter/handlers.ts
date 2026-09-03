import { Effect, Schema } from "effect";
import {
  ok,
  decodeBody,
  sessionOrService,
  ValidationError,
  ServiceUnavailableError,
  BadGatewayError,
  UnprocessableEntityError,
} from "@/lib/effect";

interface RouteInfo {
  label: string;
  path: string;
  columns: string[];
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, "");
  return /\/v1$/.test(trimmed) ? trimmed : `${trimmed}/v1`;
}

const dateNotes = (today: string, yesterday: string, sevenDaysAgo: string) => `
Date filtering (column "date" stores ISO strings like ${today}T10:30:00.000Z):
- Today is ${today}. Yesterday is ${yesterday}.
- Exact day: wildcard on "date" -> today: {"date":"${today}*"}, yesterday: {"date":"${yesterday}*"}
- This month: {"date":"${today.slice(0, 7)}*"}, this year: {"date":"${today.slice(0, 4)}*"}
- Since a date / last N days: use "date_gte" key -> last 7 days: {"date_gte":"${sevenDaysAgo}"}
- Date range: use both keys -> {"date_gte":"${sevenDaysAgo}","date_lte":"${today}"}`;

const PAGE_SYSTEM_PROMPT = (
  columns: string[],
  today: string,
  yesterday: string,
  sevenDaysAgo: string,
) => `You are a URL query parameter generator for a biological sample database.
Convert the user's natural language query into URL query parameters that filter a sample table.

Available filterable columns: ${columns.join(", ")}

Column notes:
- "name" is the sample ID/name (e.g. Araatr1, Erasp.1_wlk1)
- "box" is the physical storage box identifier (e.g. pw01, dl03)
- "slot" is the position within the box (e.g. A1, B3)
- "type" is the sample type (animal, subsample, silk, plant, preserved, artificial)
- "subsampletype" is the subtype of a subsample (e.g. dragline, walking)
- "responsibleName" is the full name of the responsible person
- "parentName" is the name of the parent sample
${dateNotes(today, yesterday, sevenDaysAgo)}

Filter rules:
- AND logic: use separate params (box=31 AND type=silk -> {"box":"31","type":"silk"})
- OR logic: comma-separated values (box pw01 or pw02 -> {"box":"pw01,pw02"})
- Wildcard/contains: use * for partial matches (name contains _wlk -> {"name":"*_wlk*"})
- Starts with: pw* -> {"box":"pw*"}
- Exact match: no wildcards (box=31 -> {"box":"31"})

Respond with ONLY a valid JSON object. No explanation, no markdown, no code fences. Example: {"box":"31","name":"*_wlk*"}`;

const GLOBAL_SYSTEM_PROMPT = (
  routes: RouteInfo[],
  today: string,
  yesterday: string,
  sevenDaysAgo: string,
) => `You are a navigation assistant for EvoNEST, a biological research database.
Convert the user's natural language query into a destination page and URL filter parameters.

Available sections:
${routes
  .map((r) => `- ${r.label} (path: ${r.path})\n  Filterable columns: ${r.columns.join(", ")}`)
  .join("\n")}

Column notes:
- "name" is the sample or experiment ID (e.g. Araatr1, Erasp.1_wlk1)
- "box" is the physical storage box (e.g. pw01, dl03)
- "slot" is the storage slot position (e.g. A1, B3)
- "type" is the category/type
- "subsampletype" is the subtype of a subsample (e.g. dragline, walking)
- "responsibleName" is the full name of the responsible person
- "sampleName" is the name of the associated sample
- "animalName" is the name of the parent animal
${dateNotes(today, yesterday, sevenDaysAgo)}

Filter rules:
- Exact match: {"box":"31","type":"silk"}
- Wildcard/contains: use * -> {"name":"*_wlk*"}
- OR values: comma-separated -> {"box":"pw01,pw02"}
- AND: separate keys -> {"box":"31","genus":"Argiope"}

Respond with ONLY a valid JSON with exactly this shape:
{"route":"/samples/general","params":{"box":"31","name":"*_wlk*"}}
If no filters apply, use empty params: {"route":"/samples/general","params":{}}
Do not include any other text, markdown, or code fences.`;

const Body = Schema.Struct(
  {
    query: Schema.optional(Schema.Unknown),
    columns: Schema.optional(Schema.Array(Schema.String)),
    routes: Schema.optional(Schema.Array(Schema.Unknown)),
  },
  Schema.Record({ key: Schema.String, value: Schema.Unknown }),
);

const callLlm = (systemPrompt: string, query: string) =>
  Effect.gen(function* () {
    const baseUrl = process.env.LLM_BASE_URL;
    const token = process.env.LLM_AUTH_TOKEN;
    const model = process.env.LLM_MODEL;
    if (!baseUrl || !token || !model) {
      return yield* Effect.fail(new ServiceUnavailableError({ message: "LLM not configured" }));
    }

    const data = yield* Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            model,
            temperature: 0,
            // Headroom for reasoning models that emit <think> tokens before the
            // JSON. The answer itself is small; a tight limit truncated it.
            max_tokens: 800,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: query },
            ],
          }),
        });
        if (!response.ok) {
          throw new Error(`LLM responded ${response.status}: ${await response.text()}`);
        }
        return (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      },
      catch: (cause) => new BadGatewayError({ message: "LLM request failed", cause }),
    });

    const raw = (data.choices?.[0]?.message?.content ?? "")
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return yield* Effect.fail(
        new UnprocessableEntityError({ message: "LLM returned no parseable JSON", details: raw }),
      );
    }
    return yield* Effect.try({
      try: () => JSON.parse(jsonMatch[0]) as Record<string, unknown>,
      catch: () => new UnprocessableEntityError({ message: "LLM returned invalid JSON", details: raw }),
    });
  });

export const runNlFilter = (request: Request) =>
  Effect.gen(function* () {
    yield* sessionOrService(request);
    const body = yield* decodeBody(Body)(request);

    const query = typeof body.query === "string" ? body.query : "";
    if (!query) return yield* Effect.fail(new ValidationError({ message: "query is required" }));

    const routes = Array.isArray(body.routes) ? (body.routes as RouteInfo[]) : null;
    const columns = Array.isArray(body.columns) ? (body.columns as string[]) : [];

    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);

    const isGlobal = !!routes && routes.length > 0;
    const systemPrompt = isGlobal
      ? GLOBAL_SYSTEM_PROMPT(routes, today, yesterday, sevenDaysAgo)
      : PAGE_SYSTEM_PROMPT(columns, today, yesterday, sevenDaysAgo);

    const result = yield* callLlm(systemPrompt, query);

    return yield* ok(
      isGlobal
        ? { route: (result as { route?: string }).route, params: (result as { params?: unknown }).params ?? {} }
        : { params: result },
    );
  });
