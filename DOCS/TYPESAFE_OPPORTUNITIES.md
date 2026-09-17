# TypeSafe opportunities

Where this codebase does fragile parsing (regexes, `JSON.parse`, exact string matching,
prompt-and-parse) and a TypeSafe judgment would be a better fit.

TypeSafe ([docs](https://docs.typesafe.ai/llms.txt)) exposes small typed judgments that
code composes: **Choice** (one of a defined set, with a probability distribution),
**Noul** (probability that a statement is true) and **Score** (position along ordered
levels). Answers are constrained to the options we supply, so code never recovers a value
from generated prose. Questions over the same state run in parallel in one request, and
every answer carries a calibrated confidence we can threshold.

The rule this document follows, from
[How to build with TypeSafe](https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md):
**code owns the workflow, deterministic rules and side effects; TypeSafe owns the narrow
semantic judgments.** Nothing here asks a model to generate text or choose its own next
step.

> Status: **partly implemented as of 2.7.9**. The email → application match (§2) and the
> email event classification (§3) now run through `POST /api/ai/judgments`; both keep the
> deterministic behaviour whenever the service is unavailable or the answer falls below
> the confidence gates. Still open: composite scoring (§1), field extraction (§3, the
> company/position spans), CSV header mapping (§5), work-type and date normalisation (§6).
> Before extending the integration, read
> [the HTTP API](https://docs.typesafe.ai/api.md) or
> [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript.md) for the current contracts.

## Ranked opportunities

| # | Where | Today | Proposed judgments |
| --- | --- | --- | --- |
| 1 | `src/utils/geminiJobScoring.ts:87-127` | One prompt returns 6 numeric subscores as JSON, `JSON.parse`, clamps, fixed weighted sum, model-invented `confidence` string | 6 × `Score` + confidence-gated routing |
| 2 | `src/utils/manualScan.ts:56-60`, `src/mails/services/scanService.ts` | Updates matched to existing applications by exact `company` + `position` lowercase equality | 1 × `Choice` over code-built candidates |
| 3 | `src/mails/adapter/emailAdapter.ts` (`JOB_TITLE_ENDS`, `EXCLUDED_DOMAIN_PATTERN`, 57 regexes) | Regex heuristics extract position/company and map the event type | `Choice` selection over regex candidates + `Choice` for stage |
| 4 | `src/utils/matching.ts:24-77` | Keyword dictionaries for seniority and ~80 tech skills, substring matched | 1 × `Score` (seniority) + 1 × `Noul` per profile skill |
| 5 | `src/utils/csv.ts:36-45` | `parseCSV` requires headers to match internal field names exactly | 1 × `Choice` per column → canonical field or `ignore` |
| 6 | `src/utils/applications.ts:58`, `src/utils/date.ts:3` | `toWorkType` is enum membership; `parseLocalDate` only accepts `YYYY-MM-DD` | `Choice` over work types; date parts + `Noul` for D/M/Y ambiguity |

### 1. Opportunity match scoring (composite scoring)

Today `scoreOpportunityWithGemini` sends a long prompt and asks for a JSON object with
`semanticFit`, `historicalFit`, `skillsFit`, `locationWorkTypeFit`, `compensationFit`,
`seniorityFit`, then weights them 0.30/0.20/0.25/0.15/0.05/0.05 in code and reports
`confidence: parsed.confidence ?? 'medium'`.

This already *is* the
[composite scoring pattern](https://docs.typesafe.ai/patterns/composite-scoring.md); it
just goes through a generative round trip. Replace it with one request:

```json
{
  "state": {
    "opportunity": { "title": "...", "company": "...", "location": "...", "salary": "..." },
    "profile": { "skills": ["..."], "seniorityTarget": "senior", "salaryRange": { "...": "..." } },
    "history": { "applications": [{ "company": "...", "stage": "technical_interview" }] }
  },
  "questions": {
    "semantic_fit":            { "type": "score", "instructions": "...", "criteria": ["...", "..."] },
    "historical_fit":          { "type": "score", "instructions": "...", "criteria": ["...", "..."] },
    "skills_fit":              { "type": "score", "instructions": "...", "criteria": ["...", "..."] },
    "location_work_type_fit":  { "type": "score", "instructions": "...", "criteria": ["...", "..."] },
    "compensation_fit":        { "type": "score", "instructions": "...", "criteria": ["...", "..."] },
    "seniority_fit":           { "type": "score", "instructions": "...", "criteria": ["...", "..."] }
  }
}
```

Code keeps the weights, the normalisation and the verdict thresholds; the answer's real
`confidence` replaces the invented string, so
[confidence-gated routing](https://docs.typesafe.ai/patterns/confidence-routing.md) can
send uncertain cases to a reasoning model or to review. No JSON parsing, tunable weights,
one parallel request.

### 2. Email → existing application matching

`processManualScanJson` finds the target application with:

```ts
app.company.toLowerCase().trim() === (u.company || '').toLowerCase().trim() &&
app.position.toLowerCase().trim() === (u.position || '').toLowerCase().trim()
```

"Acme Corp" vs "ACME, Inc." vs "Acme" misses, so an interview update becomes a duplicate
application. Build a small candidate list in code (token overlap on company, most recent
applications, ≤255 options), then one `Choice` per email — *which of these applications
does this email refer to, or `none`?* — with the email subject/snippet in the state. Code
copies the chosen id and performs the merge; low confidence falls back to "propose as new
+ review", which the UI already supports.

### 3. Field and event extraction from email

`emailAdapter` decides titles, companies and event types with regexes and domain
blocklists. Use
[pre-parsed value extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md):
regex finds candidates (recall-tuned, deduped), a `Choice` selects the span the email
actually means, and code copies it verbatim — the model can never transpose a digit or
rename a company. A second `Choice` maps the email to an `InterviewStageType` (plus
`none`), replacing the `toTimelineType` heuristics.

### 4. Seniority and skills

`SENIORITY_KEYWORDS` and `COMMON_TECH_SKILLS` are dictionaries that age badly ("Sr.",
"Staff-level", "Ingeniero Senior", "Postgres"). Ask seniority as a `Score` whose levels are
the existing `SeniorityLevel` union, and one `Noul` per skill **in the user's profile**
(bounded, so a handful of questions), all in one request. Code keeps the weights and
thresholds it uses today.

### 5. CSV / Sheets header mapping

`parseCSV` matches headers against internal field names, so a file with "Job Title",
"Empresa" or "Puesto" imports incorrectly or silently drops columns — the same gap that
blocks importing a sheet. Ask one `Choice` per column (options = canonical fields +
`ignore`), then map and validate in code. Maximum value for minimum risk.

### 6. Work type and dates

`toWorkType` is `WORK_TYPES.includes(value)`, so "Remote (EU)" or "Híbrido" become
`undefined`; `parseLocalDate` accepts only `YYYY-MM-DD`. Use a `Choice` over the work-type
enum (hybrid days extracted by regex), and for dates the
[date extraction](https://docs.typesafe.ai/cookbooks/date_extraction_cookbook.md) shape:
extract the parts, resolve and validate in code, and ask a `Noul` only for the
day/month-order ambiguity.

## Integration notes for this repo

- **API key server-side.** The frontend currently calls Gemini with an encrypted key held
  client-side. TypeSafe calls must go through the PHP backend (`api/`, same proxy shape as
  `GoogleSheetsController`) or another server-side process; never ship the key in the
  bundle.
- **One request per unit of work.** Batch every question about the same state (per email,
  per opportunity) into a single call — that is where the cost and latency wins are
  (see [parallel questions](https://docs.typesafe.ai/cookbooks/parallel_questions.md)).
- **Limits.** A `Choice` allows at most 255 options; the state and questions share a
  ~32k-token budget.
- **Thresholds are ours to validate.** Cookbook numbers are examples. Calibrate on real
  data: log answers with confidence next to the outcome the user accepted, then pick
  thresholds.
- **Keep in code** (per the design rule): ids and exact lookups, date arithmetic, CSV
  escaping, dedupe by `id`, the application status machine, all weights and routing.

## Suggested spike order

1. **#1 scoring** — self-contained, already shaped like composite scoring, easy to compare
   against the Gemini path.
2. **#2 email matching** — fixes a user-visible duplicate-application bug.
3. **#5 CSV mapping** — small, high usability value, unblocks sheet import.
4. **#3/#4/#6** — extraction and normalisation, once the plumbing (#1) exists.

## Sources

- <https://docs.typesafe.ai/llms.txt>
- <https://docs.typesafe.ai/concepts/how-to-build-with-system-one.md>
- <https://docs.typesafe.ai/primitives.md>
- <https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md>
