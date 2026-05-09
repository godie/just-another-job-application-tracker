# Job Search API Integration — Design Plan

## Overview

Replace the current ATS Search (which opens Google search tabs in the browser) with a **real inline search experience** powered by external job board APIs (Jooble + TheirStack + Adzuna). Results are displayed directly in OpportunitiesPage, can be saved as opportunities, and fed into the existing AI matching engine.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React SPA)                      │
│                                                              │
│  OpportunitiesPage                                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  JobSearchForm (replaces ATSSearch collapse section) │   │
│  │  ┌──────────────┬──────────────┬─────────────────┐   │   │
│  │  │ Keywords     │ Location     │ Remote toggle    │   │   │
│  │  │ TagInput     │ Input        │ Checkbox         │   │   │
│  │  ├──────────────┴──────────────┴─────────────────┤   │   │
│  │  │ Source picker: All / Both / Jooble / TheirStack/│   │   │
│  │  │                     Adzuna                      │   │   │
│  │  │ [Search] button with loading spinner            │   │   │
│  │  └───────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  JobSearchResults                                     │   │
│  │  ┌────────────────────────────────────────────────┐   │   │
│  │  │ Card 1: Sr. Engineer at Acme — SF, Remote      │   │   │
│  │  │   85% Match │ [Save as Opp] │ [Open Link]       │   │   │
│  │  │   Source: Jooble badge │ Tech chips (TheirStack)│   │   │
│  │  ├────────────────────────────────────────────────┤   │   │
│  │  │ Card 2: Backend Dev at Beta — NY, Hybrid       │   │   │
│  │  │   Source: TheirStack badge │ Tech stack chips   │   │   │
│  │  ├────────────────────────────────────────────────┤   │   │
│  │  │ Card 3: DevOps Engineer — Remote               │   │   │
│  │  │   Source: Adzuna badge (amber)                 │   │   │
│  │  ├────────────────────────────────────────────────┤   │   │
│  │  │ ...pagination... (Load more button)             │   │   │
│  │  └────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Existing OpportunitiesTable (unchanged)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ fetch() via authenticated PHP proxy
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  PHP BACKEND PROXY (api/)                    │
│                                                              │
│  POST /api/job-search                                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  JobSearchController@search                           │   │
│  │  - Validates input (keywords required, max 200 chars) │   │
│  │  - Calls Jooble API (POST, no CORS → needs proxy)    │   │
│  │  - Calls TheirStack API (POST + Bearer auth)          │   │
│  │  - Calls Adzuna API (GET, app_id/app_key in URL)      │   │
│  │  - Parallel execution via curl_multi_exec (3-way)     │   │
│  │  - Merges + deduplicates results                      │   │
│  │  - Normalizes into unified JobSearchResult[]          │   │
│  │  - Returns JSON                                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  Auth: Requires user session (prevents API credit abuse)     │
│  API keys stored server-side in config.php (never exposed)   │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP calls (5s timeout each)
                              ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Jooble API     │  │  TheirStack API  │  │   Adzuna API     │
│  (free tier)     │  │  (200 cr/mo free) │  │  (free tier)     │
│  POST /api/key   │  │  POST /jobs/search│  │  GET with creds  │
│  67 countries    │  │  315k+ sources    │  │  US/UK/CA/...    │
│  No CORS         │  │  Rich tech stack  │  │  Salary data     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## API Layer Design

### PHP Proxy Endpoint

**File:** `api/src/Controllers/JobSearchController.php`

```
POST /api/job-search
```

**Request:**
```json
{
  \"keywords\": \"customer success engineer\",
  \"location\": \"remote\",
  \"remoteOnly\": true,
  \"source\": \"all\",
  \"techStack\": [\"react\", \"typescript\"],
  \"page\": 1,
  \"pageSize\": 20
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `keywords` | `string` | ✅ | Search keywords (max 200 chars) |
| `location` | `string` | ❌ | Location filter (city, country, or \"remote\") |
| `remoteOnly` | `boolean` | ❌ | Filter to remote-only jobs |
| `source` | `string` | ❌ | One of: `jooble`, `theirstack`, `adzuna`, `both`, `all`. Default: `both` |
| `techStack` | `string[]` | ❌ | Technology filters (TheirStack only, ignored for other sources) |
| `page` | `integer` | ❌ | Page number, default `1` |
| `pageSize` | `integer` | ❌ | Results per page, default `20`, max `50` |

**Source behavior:**

| Source | APIs called | Notes |
|--------|-------------|-------|
| `jooble` | Jooble only | Fast, free, 67 countries |
| `theirstack` | TheirStack only | Rich tech stack data, 200 cr/mo free |
| `adzuna` | Adzuna only | Free tier, salary data, US/UK/CA/AU/NZ |
| `both` | Jooble + TheirStack | Parallel via curl_multi, 2-way |
| `all` | Jooble + TheirStack + Adzuna | Parallel via curl_multi, 3-way |

**Response:**
```json
{
  \"results\": [
    {
      \"id\": \"jooble_abc123def4\",
      \"position\": \"Senior Customer Success Engineer\",
      \"company\": \"Acme Corp\",
      \"location\": \"San Francisco, CA\",
      \"remote\": true,
      \"salary\": \"$120,000 - $150,000\",
      \"description\": \"...truncated to 1000 chars...\",
      \"url\": \"https://jooble.org/...\",
      \"postedDate\": \"2025-05-01\",
      \"source\": \"jooble\",
      \"techStack\": []
    },
    {
      \"id\": \"theirstack_567890ab\",
      \"position\": \"Backend Engineer\",
      \"company\": \"Beta Inc\",
      \"location\": \"New York, NY\",
      \"remote\": false,
      \"salary\": \"$140,000 - $170,000\",
      \"description\": \"...\",
      \"url\": \"https://theirstack.com/...\",
      \"postedDate\": \"2025-05-03\",
      \"source\": \"theirstack\",
      \"techStack\": [\"python\", \"aws\", \"postgresql\"]
    },
    {
      \"id\": \"adzuna_cdef1234\",
      \"position\": \"DevOps Engineer\",
      \"company\": \"Gamma LLC\",
      \"location\": \"London, UK\",
      \"remote\": true,
      \"salary\": \"£60,000 - £80,000\",
      \"description\": \"...\",
      \"url\": \"https://adzuna.com/...\",
      \"postedDate\": \"2025-05-04\",
      \"source\": \"adzuna\",
      \"techStack\": []
    }
  ],
  \"total\": 142,
  \"page\": 1,
  \"pageSize\": 20,
  \"hasMore\": true,
  \"errors\": []
}
```

`errors` is a non-fatal array of per-source warnings. If a source is unavailable, its error is appended here and the remaining sources' results are still returned.

**Error responses:**
```json
// 400 — Validation
{ \"error\": \"keywords_required\", \"message\": \"At least one keyword is required\" }

// 400 — Source validation
{ \"error\": \"invalid_source\", \"message\": \"Source must be jooble, theirstack, adzuna, both, or all\" }

// 429 — Rate limited (upstream or our own limiter)
{ \"error\": \"rate_limited\", \"message\": \"Too many requests. Try again in 60s\", \"retryAfter\": 60 }

// 503 — No API keys configured
{ \"error\": \"not_configured\", \"message\": \"Job search API key(s) not configured: Jooble, TheirStack, Adzuna\" }

// 504 — All upstream APIs timed out
{ \"error\": \"upstream_error\", \"message\": \"All job board APIs unavailable\" }
```

### Auth: Proxy Endpoint Requires Authentication

To prevent credit draining and abuse, the `POST /api/job-search` endpoint requires the user's session cookie (same as `/sync/*` and `/google-sheets`). The frontend includes `credentials: 'include'` on the fetch call, and the PHP controller validates via `RequireAuth::handle()` before making any external API calls.

**Rationale:** This is a POST endpoint that costs external API credits. Making it unauthenticated would allow anonymous users to drain the TheirStack quota in minutes.

### External API Timeout

All upstream API calls use a 5-second timeout (`CURLOPT_TIMEOUT = 5`). If Jooble, TheirStack, or Adzuna don't respond within 5 seconds, the proxy returns whatever results it has from the other sources (for `source: 'both'` or `source: 'all'`) or returns a 504 Gateway Timeout error.

---

## External API Integrations

### Jooble API

- **Base URL:** `https://jooble.org/api/{API_KEY}`
- **Auth:** API key in URL path (no CORS → requires proxy)
- **Method:** POST with JSON body
- **Rate limits:** Generous free tier
- **Coverage:** 67 countries, aggregates multiple job boards

```http
POST https://jooble.org/api/{API_KEY}
Content-Type: application/json

{
  \"keywords\": \"customer success engineer\",
  \"location\": \"remote\",
  \"page\": \"1\"
}

Response:
{
  \"jobs\": [
    {
      \"title\": \"Senior Customer Success Engineer\",
      \"company\": \"Acme Corp\",
      \"location\": \"San Francisco, CA\",
      \"snippet\": \"...job description snippet...\",
      \"salary\": \"$120,000 - $150,000\",
      \"link\": \"https://jooble.org/...\",
      \"updated\": \"2025-05-01\"
    }
  ],
  \"totalCount\": 142
}
```

### TheirStack API

- **Base URL:** `https://api.theirstack.com/v1/jobs/search`
- **Auth:** `Authorization: Bearer {API_KEY}`
- **Method:** POST with JSON body
- **Free tier:** 200 API credits/month, 50 company credits/month
- **Coverage:** 315k+ sources including LinkedIn, Indeed, ATS platforms
- **Special:** Technology stack filtering (`technology_slug_or`), remote flag, country code filter

```http
POST https://api.theirstack.com/v1/jobs/search
Authorization: Bearer {API_KEY}
Content-Type: application/json

{
  \"page\": 0,
  \"limit\": 20,
  \"job_title_or\": [\"customer success engineer\"],
  \"order_by\": [{ \"field\": \"date_posted\", \"desc\": true }],
  \"posted_at_max_age_days\": 30,
  \"remote\": true,
  \"technology_slug_or\": [\"react\", \"typescript\"],
  \"job_country_code_or\": [\"US\"]
}

Response:
{
  \"data\": [
    {
      \"job_title\": \"Backend Engineer\",
      \"company_name\": \"Beta Inc\",
      \"location\": \"New York, NY\",
      \"remote\": true,
      \"salary\": \"$140,000 - $170,000\",
      \"description\": \"...\",
      \"url\": \"https://theirstack.com/...\",
      \"date_posted\": \"2025-05-03\",
      \"technology_slugs\": [\"python\", \"aws\", \"postgresql\"]
    }
  ],
  \"meta\": { \"total\": 200 }
}
```

### Adzuna API

- **Base URL:** `https://api.adzuna.com/v1/api/jobs/{countryCode}/search/{page}`
- **Auth:** `app_id` and `app_key` as URL query parameters
- **Method:** GET (query params in URL)
- **Free tier:** Generous free tier with salary data
- **Coverage:** US, UK, Canada, Australia, New Zealand, France, Germany, Spain, Italy, Netherlands, Ireland, Singapore, India, Brazil
- **Special:** Salary range data (min/max), location-based search, remote keyword in query

```http
GET https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=YOUR_APP_ID&app_key=YOUR_API_KEY&what=customer+success+engineer&where=remote&results_per_page=20&content-type=application/json

Response:
{
  \"results\": [
    {
      \"title\": \"DevOps Engineer\",
      \"company\": { \"display_name\": \"Gamma LLC\" },
      \"location\": { \"display_name\": \"London, UK\" },
      \"salary_min\": 60000,
      \"salary_max\": 80000,
      \"description\": \"...\",
      \"redirect_url\": \"https://adzuna.com/...\",
      \"date_published\": \"2025-05-04\"
    }
  ],
  \"count\": 142
}
```

**Location-to-country code mapping:** The controller maps location keywords to ISO 3166-1 alpha-2 codes (e.g., `united states` → `US`, `uk` → `GB`). Defaults to `us` if no match.

### API Key Storage

Keys are stored in `api/config.php` (server-side only, never exposed to the client). Placeholders (`__JOOBLE_API_KEY__`, etc.) are replaced at deploy time via the GitHub Actions workflow:

```php
'job_search' => [
    'jooble_api_key'    => getenv('JOOBLE_API_KEY') ?: '__JOOBLE_API_KEY__',
    'theirstack_api_key'=> getenv('THEIRSTACK_API_KEY') ?: '__THEIRSTACK_API_KEY__',
    'adzuna_app_id'     => getenv('ADZUNA_APP_ID') ?: '__ADZUNA_APP_ID__',
    'adzuna_api_key'    => getenv('ADZUNA_API_KEY') ?: '__ADZUNA_API_KEY__',
],
```

**Default source:** The frontend `JobSearchForm` defaults to `'both'` (Jooble + TheirStack) when no source is selected. The controller also falls back to `'jooble'` for invalid source values.

---

## Frontend Component Design

### 1. `JobSearchForm`

**File:** `src/components/JobSearchForm.tsx`

```
Props:
  onSearch: (params: JobSearchParams) => void
  isSearching: boolean
  defaultKeywords?: string[]
  defaultLocation?: string
  defaultSource?: JobSearchSource

Internal state:
  keywords: string[]      // TagInput
  location: string        // plain input
  remoteOnly: boolean     // toggle
  source: JobSearchSource // 'jooble' | 'theirstack' | 'adzuna' | 'both' | 'all'
  techStack: string[]     // TagInput (shown for theirstack/both)

Layout:
  - Row 1: Keywords (TagInput) | Location (text) | Remote toggle | Search button
  - Row 2 (collapsible): Source dropdown + Tech Stack TagInput (for theirstack/both)

Source dropdown options:
  - All (Jooble + TheirStack + Adzuna)
  - Both (Jooble + TheirStack)
  - Jooble
  - TheirStack
  - Adzuna
```

### 2. `JobSearchResults`

**File:** `src/components/JobSearchResults.tsx`

```
Props:
  results: UnifiedJobResult[]
  isLoading: boolean
  error: string | null
  totalCount: number
  hasMore: boolean
  onLoadMore: () => void
  onSaveAsOpportunity: (result: UnifiedJobResult) => void
  savedIds: Set<string>
  errors?: Array<{ source: string; message: string }>

Layout per card:
  ├── Position (bold, clickable → opens job URL)
  ├── Company · Location · Source badge (Jooble=violet, TheirStack=cyan, Adzuna=amber)
  ├── Remote badge (sage green)
  ├── Salary (if available)
  ├── Tech stack chips (TheirStack only, cycling colors)
  ├── Description preview (2 lines, expandable)
  ├── Posted date
  └── [Save as Opportunity] [Open in new tab] buttons

Source badge colors:
  - jooble:    bg-violet-100 dark:bg-violet-900/40 text-violet-700
  - theirstack: bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700
  - adzuna:    bg-amber-100 dark:bg-amber-900/40 text-amber-700

Tech stack chip colors (cycling):
  - emerald, sky, amber, rose (6 chips max + overflow count)
```

### 3. Integration into `OpportunitiesPage`

```
Current layout:
  ┌─────────────────────────┐
  │ ATSSearch (collapse)    │
  ├─────────────────────────┤
  │ OpportunitiesTable      │
  └─────────────────────────┘

New layout:
  ┌─────────────────────────┐
  │ JobSearchForm (fixed, always visible)  │
  ├─────────────────────────┤
  │ JobSearchResults        │  ← NEW: appears when search is active
  │ (source badges + tech chips + salary) │
  ├─────────────────────────┤
  │ OpportunitiesTable      │  ← unchanged
  └─────────────────────────┘
```

New state in OpportunitiesPage:
```typescript
const [searchResults, setSearchResults] = useState<UnifiedJobResult[]>([]);
const [isSearching, setIsSearching] = useState(false);
const [searchError, setSearchError] = useState<string | null>(null);
const [searchTotal, setSearchTotal] = useState(0);
const [searchPage, setSearchPage] = useState(1);
```

### 4. Unified Data Model

**File:** `src/types/jobSearch.ts`

```typescript
export interface JobSearchParams {
  keywords: string;
  location?: string;
  remoteOnly: boolean;
  source: JobSearchSource;
  techStack: string[];
  page: number;
  pageSize: number;
}

export type JobSearchSource = 'jooble' | 'theirstack' | 'adzuna' | 'both' | 'all';

export interface UnifiedJobResult {
  id: string;                // \"{source}_\" + sha256(normalizeUrl(url)).slice(0,12)
  position: string;
  company: string;
  location?: string | null;
  remote: boolean;
  salary?: string | null;
  description?: string | null;  // truncated to 1000 chars
  url: string;
  postedDate?: string | null;   // ISO date
  source: 'jooble' | 'theirstack' | 'adzuna';
  techStack: string[];          // tech slugs (TheirStack), empty for Jooble/Adzuna
}

export interface JobSearchResponse {
  results: UnifiedJobResult[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  errors: Array<{ source: string; message: string }>;
}
```

---

## Parallel API Call Behavior

### source='both' (2-way parallel)

Fires Jooble + TheirStack **concurrently** using `curl_multi_exec`. Results are merged and deduplicated by URL hash.

```
Jooble ──┐
         ├──► merge + dedupe ──► response
TheirStack┘
```

### source='all' (3-way parallel)

Fires Jooble + TheirStack + Adzuna **concurrently** using `curl_multi_exec`. Results are merged and deduplicated by URL hash.

```
Jooble ─────┐
            │
TheirStack ──┼──► merge + dedupe ──► response
            │
Adzuna ─────┘
```

**Partial failure handling:**

| Scenario | Response |
|----------|----------|
| Jooble succeeds, TheirStack + Adzuna fail | Jooble results + `errors[]` with TheirStack + Adzuna errors |
| TheirStack succeeds, Jooble + Adzuna fail | TheirStack results + `errors[]` with Jooble + Adzuna errors |
| All fail | 504 `upstream_error` |
| Some succeed, some fail | Partial results + `errors[]` for failed sources |

**Fallback:** If `curl_multi_init` is unavailable (rare), falls back to sequential execution.

---

## Result Deduplication Strategy

Before returning results, the proxy deduplicates by **normalized URL**. The `id` field is a SHA-256 hash of the normalized URL truncated to 12 hex chars, prefixed by source:

```
id = \"{source}_\" + sha256(normalizeUrl(url)).substring(0, 12)
```

**URL normalization rules:**
- Lowercase scheme + host
- Strip `www.` prefix
- Strip trailing slash
- Strip query params except `?jk=` (LinkedIn job ID)

This ensures the same job posted on multiple boards gets a consistent ID regardless of which source returned it first.

When the frontend saves a result as an opportunity, it also checks by normalized URL against existing opportunities in the store to prevent duplicates.

---

## Matching Engine Integration Flow

```
User searches \"customer success engineer\" → All 3 APIs → merged results
                                                                  │
                                                                  ▼
                                                    JobSearchResults displayed
                                                                  │
                    ┌─────────────────────────────────────────────┤
                    │ User clicks \"Save as Opportunity\"           │
                    ▼                                             │
          UnifiedJobResult → JobOpportunity                        │
                    │                                             │
                    ▼                                             │
          addOpportunity() store                                   │
                    │                                             │
                    ▼                                             │
          Save to localStorage                                     │
                    │                                             │
                    ▼                                             │
          matchingStore.computeScores() triggers                   │
          (if autoComputeOnOpportunityAdd enabled)                 │
                    │                                             │
                    ▼                                             │
          MatchScoreBadge appears on saved opportunity             │
```

**Key design decisions:**
1. **Match scores on search results (optional, Phase 2):** After saving opportunities, match scores can also be computed on-the-fly for search results before saving. This requires the matching profile to exist.
2. **Batch save:** \"Save all matching\" button — saves all results above the match threshold as opportunities in one click.
3. **Tech stack chips:** Only populated for TheirStack results (which returns `technology_slugs`). Jooble and Adzuna return empty `techStack[]`.

---

## Error Handling Strategy

| Scenario | User sees | Retry? |
|----------|-----------|--------|
| No API keys configured | \"Job search API key(s) not configured: Jooble, TheirStack, Adzuna\" | No (configure in Settings) |
| Jooble down | \"Jooble is temporarily unavailable. Results from TheirStack + Adzuna shown.\" | Auto-fallback to other sources |
| TheirStack rate limited (429) | \"Too many searches. Try again in 60 seconds.\" with countdown | Yes, after delay |
| Adzuna down | \"Adzuna is temporarily unavailable.\" (non-blocking, other sources still shown) | Auto-fallback |
| Network error (fetch fail) | \"Unable to reach search service. Check your connection.\" + Retry button | Yes |
| Empty results | \"No jobs found. Try broader keywords or remove location filter.\" | N/A |
| All APIs fail | \"All job board APIs unavailable. Try again later.\" | Yes |
| PHP proxy down (500) | \"Search service error. Please try again later.\" | Yes |
| Rate limited (our own limiter) | \"Too many searches. Try again in {seconds}s.\" | After countdown |

---

## Rate Limiting Strategy

### Server-side (PHP)

The proxy enforces **10 searches per minute per user** via an in-memory `RateLimiter`. Additionally, it forwards upstream rate limit errors (429 from TheirStack, Jooble's built-in throttling) as `retryAfter` values.

### Client-side (React)

- Debounce search button clicks (500ms)
- Disable \"Search\" button during active request
- Show countdown timer when rate limited (from `retryAfter` response field)

### API credits management

| API | Free tier | Approximate usage |
|-----|-----------|-------------------|
| Jooble | Generous free tier | ~10–50 searches/day |
| TheirStack | 200 credits/month | ~10 searches/day at 20 results each |
| Adzuna | Generous free tier | ~10–50 searches/day |

**UX:** Show a banner when TheirStack credits are running low (based on error responses).

---

## i18n Key Inventory

All new strings follow the `opportunities.jobSearch.*` namespace:

| Key | English | Spanish |
|-----|---------|---------|
| `opportunities.jobSearch.title` | \"Find Opportunities\" | \"Buscar Oportunidades\" |
| `opportunities.jobSearch.keywords` | \"Keywords\" | \"Palabras clave\" |
| `opportunities.jobSearch.location` | \"Location\" | \"Ubicación\" |
| `opportunities.jobSearch.remoteOnly` | \"Remote only\" | \"Solo remoto\" |
| `opportunities.jobSearch.source` | \"Source\" | \"Fuente\" |
| `opportunities.jobSearch.sourceAll` | \"All (Jooble + TheirStack + Adzuna)\" | \"Todas (Jooble + TheirStack + Adzuna)\" |
| `opportunities.jobSearch.sourceBoth` | \"Both (Jooble + TheirStack)\" | \"Ambas (Jooble + TheirStack)\" |
| `opportunities.jobSearch.sourceJooble` | \"Jooble\" | \"Jooble\" |
| `opportunities.jobSearch.sourceTheirstack` | \"TheirStack\" | \"TheirStack\" |
| `opportunities.jobSearch.sourceAdzuna` | \"Adzuna\" | \"Adzuna\" |
| `opportunities.jobSearch.techStack` | \"Tech Stack\" | \"Tecnologías\" |
| `opportunities.jobSearch.techStackHint` | \"Filter by technologies — uses TheirStack data\" | \"Filtrar por tecnologías — usa datos de TheirStack\" |
| `opportunities.jobSearch.advancedFilters` | \"Advanced filters\" | \"Filtros avanzados\" |
| `opportunities.jobSearch.search` | \"Search\" | \"Buscar\" |
| `opportunities.jobSearch.searching` | \"Searching...\" | \"Buscando...\" |
| `opportunities.jobSearch.noResults` | \"No jobs found. Try broader keywords.\" | \"Sin resultados. Intenta con términos más amplios.\" |
| `opportunities.jobSearch.noApiKeys` | \"Job search not configured. Add API keys in Settings.\" | \"Búsqueda no configurada. Agrega claves API en Configuración.\" |
| `opportunities.jobSearch.rateLimited` | \"Too many searches. Try again in {seconds}s.\" | \"Demasiadas búsquedas. Intenta de nuevo en {seconds}s.\" |
| `opportunities.jobSearch.networkError` | \"Unable to reach search service.\" | \"No se pudo conectar al servicio de búsqueda.\" |
| `opportunities.jobSearch.saveAsOpp` | \"Save as Opportunity\" | \"Guardar como Oportunidad\" |
| `opportunities.jobSearch.openLink` | \"Open in new tab\" | \"Abrir en nueva pestaña\" |
| `opportunities.jobSearch.saved` | \"Saved!\" | \"¡Guardado!\" |
| `opportunities.jobSearch.alreadySaved` | \"Already saved\" | \"Ya guardado\" |
| `opportunities.jobSearch.loadMore` | \"Load more results\" | \"Cargar más resultados\" |
| `opportunities.jobSearch.resultsCount` | \"{count} results\" | \"{count} resultados\" |

---

## GitHub Actions Deployment — API Key Injection

API keys are injected at deploy time via GitHub Secrets. The deploy workflow replaces placeholder values in `api/config.php` using a Python script.

**Required GitHub Secrets:**

| Secret | Description | Used in |
|--------|-------------|---------|
| `JOOBLE_API_KEY` | Jooble API key | `config.php` → `job_search.jooble_api_key` |
| `THEIRSTACK_API_KEY` | TheirStack Bearer token | `config.php` → `job_search.theirstack_api_key` |
| `ADZUNA_APP_ID` | Adzuna app ID | `config.php` → `job_search.adzuna_app_id` |
| `ADZUNA_API_KEY` | Adzuna API key | `config.php` → `job_search.adzuna_api_key` |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Database credentials | `config.php` + `.env` |
| `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_SECRET` | Google OAuth | `config.php` + `.env` |

**`.github/workflows/deploy.yml`** — secrets injection step:
```yaml
- name: Inject secrets into api/config.php
  env:
    JOOBLE_API_KEY: ${{ secrets.JOOBLE_API_KEY }}
    THEIRSTACK_API_KEY: ${{ secrets.THEIRSTACK_API_KEY }}
    ADZUNA_APP_ID: ${{ secrets.ADZUNA_APP_ID }}
    ADZUNA_API_KEY: ${{ secrets.ADZUNA_API_KEY }}
    DB_HOST: ${{ secrets.DB_HOST }}
    DB_PORT: ${{ secrets.DB_PORT }}
    DB_NAME: ${{ secrets.DB_NAME }}
    DB_USER: ${{ secrets.DB_USER }}
    DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
  run: |
    python3 -c \"
    import os
    replacements = {
      '__JOOBLE_API_KEY__': os.environ.get('JOOBLE_API_KEY', ''),
      '__THEIRSTACK_API_KEY__': os.environ.get('THEIRSTACK_API_KEY', ''),
      '__ADZUNA_APP_ID__': os.environ.get('ADZUNA_APP_ID', ''),
      '__ADZUNA_API_KEY__': os.environ.get('ADZUNA_API_KEY', ''),
      '__DB_HOST__': os.environ.get('DB_HOST', ''),
      '__DB_PORT__': os.environ.get('DB_PORT', ''),
      '__DB_NAME__': os.environ.get('DB_NAME', ''),
      '__DB_USER__': os.environ.get('DB_USER', ''),
      '__DB_PASSWORD__': os.environ.get('DB_PASSWORD', ''),
    }
    path = 'dist/api/config.php'
    with open(path) as f:
      content = f.read()
    for placeholder, value in replacements.items():
      content = content.replace(placeholder, value)
    with open(path, 'w') as f:
      f.write(content)
    print('Secrets injected successfully')
    \"
```

The `.env` file is also generated at deploy time with all non-secret configuration.

---

## File Tree Summary

```
New files:
  api/src/Controllers/JobSearchController.php   ✓
  src/types/jobSearch.ts                        ✓
  src/components/JobSearchForm.tsx              ✓
  src/components/JobSearchResults.tsx           ✓
  src/utils/jobSearchApi.ts                     ✓
  src/components/JobSearchForm.test.tsx         ✓
  src/components/JobSearchResults.test.tsx      ✓

Modified files:
  api/index.php                                 (+1 route)
  api/config.example.php                        (+Adzuna placeholders)
  src/pages/OpportunitiesPage.tsx               (integrate new components)
  src/utils/constants.ts                        (default search prefs)
  src/locales/en/translation.json               (new strings)
  src/locales/es/translation.json               (new strings)
  .github/workflows/deploy.yml                  (+Adzuna secrets)
```

---

## Dependencies

None. Uses only existing infrastructure:
- PHP API proxy (existing router pattern)
- `fetch()` in browser with `credentials: 'include'`
- Zustand stores (opportunitiesStore, matchingStore)
- Tailwind CSS for styling (utility-first)
- `curl_multi_exec` for parallel HTTP calls
- react-i18next for translations