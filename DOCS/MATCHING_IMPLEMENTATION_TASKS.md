# AI-Powered Job Matching - Tareas Atómicas Independientes

## Estado Actual (Julio 2026)

| Fase | Tarea | Estado |
|------|-------|--------|
| FASE 1 | T1: Tipos de Matching | ✅ Implementado |
| FASE 1 | T2: Capa de Persistencia | ✅ Implementado |
| FASE 1 | T3: Motor de Scoring Determinístico | ✅ Implementado |
| FASE 1 | T4: Síntesis de Perfil con Gemini | ✅ Implementado |
| FASE 1 | T5: Scoring de Jobs con Gemini | ✅ Implementado |
| FASE 1 | T6: Zustand Store de Matching | ✅ Implementado |
| FASE 1 | T7: MatchScoreBadge Component | ✅ Implementado |
| FASE 1 | T8: MatchBreakdownModal Component | ✅ Implementado |
| FASE 1 | T9: ProfileSetupModal Component | ✅ Implementado |
| FASE 1 | T10: MatchingSettings Component | ✅ Implementado |
| FASE 1 | T11: RecommendationPanel Component | ✅ Implementado |
| FASE 2 | T12: Integrar Matching en OpportunitiesPage | ⬜ Pendiente |
| FASE 2 | T13: Integrar Matching en SettingsPage | ✅ Implementado |
| FASE 2 | T14: Integrar Matching en HomePage | ⬜ Pendiente |
| FASE 2 | T15: Integrar Barrel Exports | ✅ Implementado |

**Resumen:** 13/15 tareas completadas. Faltan T12 (OpportunitiesPage) y T14 (HomePage).

---

## Principio de Independencia

Cada tarea crea **archivos nuevos** (cero conflictos de merge entre agentes en paralelo).  
Los tipos necesarios se definen **inline** dentro de cada archivo o se importan de archivos **existentes** (`src/types/applications.ts`, `src/types/opportunities.ts`, `src/types/preferences.ts`, `src/utils/geminiApi.ts`).

Las tareas de integración (que modifican archivos existentes) están agrupadas en **Fase 2** y requieren que la Fase 1 esté completa.

---

## FASE 1 - Núcleo Independiente (5+ agentes en paralelo)

### TAREA 1: Tipos de Matching (Agente A)
**Archivo nuevo:** `src/types/matching.ts`

**Objetivo:** Definir el contrato de datos completo para todo el sistema de matching.

**Tipos a definir:**

```typescript
export type MatchConfidence = 'low' | 'medium' | 'high';
export type MatchVerdict = 'excellent_fit' | 'good_fit' | 'partial_fit' | 'low_fit';
export type SeniorityLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'staff' | 'lead' | 'principal' | 'executive';

export interface UserMatchProfile {
  targetRoles: string[];
  seniority: SeniorityLevel | null;
  topSkills: string[];
  preferredWorkTypes: ('remote' | 'on-site' | 'hybrid')[];
  preferredLocations: string[];
  salaryRange: { min?: number; max?: number; currency: string } | null;
  preferredIndustries: string[];
  explicitRoles?: string[];
  explicitSkills?: string[];
  cvText?: string;
  profileSummary: string;
  successPatterns: string[];
  avoidPatterns: string[];
  profileVersion: number;
  confidence: MatchConfidence;
  lastComputed: string;
}

export interface JobMatchSubscores {
  semanticFit: number;      // 0-100
  historicalFit: number;      // 0-100
  skillsFit: number;          // 0-100
  locationWorkTypeFit: number;// 0-100
  compensationFit: number;    // 0-100
  seniorityFit: number;       // 0-100
}

export interface JobMatchResult {
  opportunityId: string;
  overallScore: number;     // 0-100
  confidence: MatchConfidence;
  subscores: JobMatchSubscores;
  strengths: string[];
  gaps: string[];
  verdict: MatchVerdict;
  explanation: string;
  profileVersion: number;
  computedAt: string;
  computationMethod: 'deterministic' | 'gemini' | 'hybrid';
}

export interface MatchingPreferences {
  enabled: boolean;
  useGemini: boolean;
  includeCvText: boolean;
  includeNotes: boolean;
  includeTimeline: boolean;
  minMatchThreshold: number;  // 0-100, default 40
  prioritizeRemote: boolean;
  autoComputeOnOpportunityAdd: boolean;
}

export interface UserFeedbackOnMatch {
  opportunityId: string;
  profileVersion: number;
  feedback: 'thumbs_up' | 'thumbs_down' | 'irrelevant';
  timestamp: string;
  notes?: string;
}
```

**Criterio de aceptación:**
- ✅ Exporta todos los tipos
- ✅ Tipos consistentes con `JobApplication` (applications.ts) y `JobOpportunity` (opportunities.ts)
- ✅ `seniority` usa niveles estándar de la industria
- ✅ Ningún `any`
- ✅ Barrel export agregado a `src/types/index.ts`

---

### TAREA 2: Capa de Persistencia (Agente B)
**Archivo nuevo:** `src/storage/matching.ts`

**Objetivo:** Persistencia en localStorage para perfil de matching, resultados y feedback.

**Funciones a implementar:**

```typescript
import type { UserMatchProfile, JobMatchResult, UserFeedbackOnMatch, MatchingPreferences } from '../types/matching';

const MATCH_PROFILE_KEY = 'jat_match_profile_v1';
const MATCH_RESULTS_KEY = 'jat_match_results_v1';
const MATCH_FEEDBACK_KEY = 'jat_match_feedback_v1';
const MATCH_PREFS_KEY = 'jat_matching_prefs_v1';

export function getMatchProfile(): UserMatchProfile | null;
export function saveMatchProfile(profile: UserMatchProfile): void;
export function clearMatchProfile(): void;

export function getMatchResults(): Record<string, JobMatchResult>; // map by opportunityId
export function saveMatchResults(results: Record<string, JobMatchResult>): void;
export function getMatchResult(opportunityId: string): JobMatchResult | null;
export function saveMatchResult(result: JobMatchResult): void;
export function clearMatchResults(): void;

export function getMatchingPreferences(): MatchingPreferences; // con defaults
export function saveMatchingPreferences(prefs: MatchingPreferences): void;

export function getMatchFeedback(): UserFeedbackOnMatch[];
export function addMatchFeedback(feedback: UserFeedbackOnMatch): void;
export function clearMatchFeedback(): void;
```

**Defaults para `MatchingPreferences`:**
```typescript
{
  enabled: false,
  useGemini: true,
  includeCvText: true,
  includeNotes: false,
  includeTimeline: true,
  minMatchThreshold: 40,
  prioritizeRemote: false,
  autoComputeOnOpportunityAdd: true,
}
```

**Criterio de aceptación:**
- ✅ Try/catch en todas las operaciones localStorage
- ✅ Retorna defaults en caso de error
- ✅ No muta objetos de entrada
- ✅ Barrel export en `src/storage/index.ts`

---

### TAREA 3: Motor de Scoring Determinístico (Agente C)
**Archivo nuevo:** `src/utils/matching.ts`

**Objetivo:** Algoritmo puro (sin AI) que calcula match score usando datos estructurados.

**Funciones públicas:**

```typescript
import type { JobOpportunity } from '../types/opportunities';
import type { JobApplication } from '../types/applications';
import type { UserMatchProfile, JobMatchResult, JobMatchSubscores } from '../types/matching';

/**
 * Build a UserMatchProfile from application history (no AI).
 * Uses timeline signals: technical_interview+ = positive, rejected = negative.
 */
export function buildProfileFromHistory(
  applications: JobApplication[],
  explicitOverrides?: Partial<UserMatchProfile>
): UserMatchProfile;

/**
 * Calculate deterministic match score between a job opportunity and user profile.
 * No network calls, no AI, pure computation.
 */
export function calculateDeterministicScore(
  opportunity: JobOpportunity,
  profile: UserMatchProfile
): JobMatchResult;

/**
 * Batch score multiple opportunities.
 */
export function batchCalculateScores(
  opportunities: JobOpportunity[],
  profile: UserMatchProfile
): Record<string, JobMatchResult>;
```

**Algoritmo de scoring (pesos):**

| Factor | Peso | Cómo calcular |
|--------|------|---------------|
| Role similarity | 25% | Jaro-Winkler / substring match entre `opportunity.position` y `profile.targetRoles` |
| Skills match | 25% | % de `profile.topSkills` que aparecen en `opportunity.description` (case-insensitive word match) |
| Location + WorkType | 20% | Exact match location (10%), workType in preferredWorkTypes (10%) |
| Compensation | 15% | Si salary está en rango o parseable vs profile.salaryRange |
| Seniority | 15% | Parse seniority from title keywords ("Senior", "Staff", "Junior", etc.) vs profile.seniority |

**Funciones helpers internas:**
- `extractSeniorityFromTitle(title: string): SeniorityLevel | null`
- `calculateRoleSimilarity(title: string, targetRoles: string[]): number`
- `extractSkillsFromDescription(description: string | undefined): string[]`
- `calculateSkillsMatch(jobSkills: string[], profileSkills: string[]): number`
- `calculateCompensationFit(oppSalary: string | undefined, range: UserMatchProfile['salaryRange']): number`
- `isWorkTypeMatch(jobType: string | undefined, preferred: string[]): number`

**Criterio de aceptación:**
- ✅ Funciones puras (no side effects)
- ✅ Devuelve `JobMatchResult` con `computationMethod: 'deterministic'`
- ✅ `explanation` auto-generada en español/inglés (template string, no AI)
- ✅ `strengths` y `gaps` derivados de los subscores
- ✅ Maneja `undefined`/`null` gracefulmente
- ✅ Tests: `src/utils/matching.test.ts` con 10+ casos edge

---

### TAREA 4: Síntesis de Perfil con Gemini (Agente D)
**Archivo nuevo:** `src/utils/geminiProfile.ts`

**Objetivo:** Prompt engineering para que Gemini infiera un `UserMatchProfile` a partir del historial del usuario.

**Función pública:**

```typescript
import type { JobApplication } from '../types/applications';
import type { UserMatchProfile } from '../types/matching';
import { callGeminiApi } from './geminiApi';

/**
 * Synthesize a professional profile using Gemini AI.
 * Sends redacted application history to Gemini and returns a structured profile.
 */
export async function synthesizeUserProfileWithGemini(
  apiKey: string,
  applications: JobApplication[],
  options?: {
    cvText?: string;
    includeNotes?: boolean;
    includeTimeline?: boolean;
    existingProfile?: UserMatchProfile | null;
  }
): Promise<UserMatchProfile>;
```

**Prompt design (JSON schema output):**

```typescript
const SYSTEM_INSTRUCTION = `You are a career analyst. Analyze the user's job application history and synthesize a professional profile for job matching. 

Rules:
- Identify target roles from positions applied to (especially ones that reached interview stages)
- Infer seniority level from titles
- Extract top skills from descriptions and notes
- Identify location and work type preferences
- Infer salary expectations if possible
- Identify patterns in successful applications (reached technical_interview or beyond)
- Identify patterns in unsuccessful/rejected applications

Output STRICT JSON matching this schema. No markdown, no explanation outside JSON.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    targetRoles: { type: "array", items: { type: "string" } },
    seniority: { type: "string", enum: ["intern", "junior", "mid", "senior", "staff", "lead", "principal", "executive", null] },
    topSkills: { type: "array", items: { type: "string" } },
    preferredWorkTypes: { type: "array", items: { type: "string", enum: ["remote", "on-site", "hybrid"] } },
    preferredLocations: { type: "array", items: { type: "string" } },
    salaryRange: { type: ["object", "null"], properties: { min: { type: "number" }, max: { type: "number" }, currency: { type: "string" } } },
    preferredIndustries: { type: "array", items: { type: "string" } },
    profileSummary: { type: "string" },
    successPatterns: { type: "array", items: { type: "string" } },
    avoidPatterns: { type: "array", items: { type: "string" } },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
  },
  required: ["targetRoles", "topSkills", "profileSummary", "successPatterns", "avoidPatterns", "confidence"]
};
```

**Data redaction antes de enviar:**
- Reemplazar company names con `[COMPANY_1]`, `[COMPANY_2]`, etc.
- Reemplazar contactName con `[CONTACT]`
- Reemplazar links con `[LINK]`
- Mantener position, location, workType, salary, timeline types, notes (si includeNotes=true)

**Criterio de aceptación:**
- ✅ Usa `callGeminiApi` con `responseSchema` y `responseMimeType: 'application/json'`
- ✅ Parsea JSON de respuesta
- ✅ Valida que el output tenga los campos requeridos
- ✅ Si falla Gemini, retorna `null` (caller puede fallback a buildProfileFromHistory)
- ✅ Redacta PII antes de enviar
- ✅ profileVersion = (existingProfile?.profileVersion || 0) + 1
- ✅ lastComputed = new Date().toISOString()

---

### TAREA 5: Scoring de Jobs con Gemini (Agente E)
**Archivo nuevo:** `src/utils/geminiJobScoring.ts`

**Objetivo:** Prompt engineering para que Gemini compare un job opportunity con el perfil del usuario y retorne un score estructurado.

**Función pública:**

```typescript
import type { JobOpportunity } from '../types/opportunities';
import type { UserMatchProfile, JobMatchResult } from '../types/matching';
import { callGeminiApi } from './geminiApi';

/**
 * Score a single job opportunity against the user profile using Gemini.
 */
export async function scoreJobWithGemini(
  apiKey: string,
  opportunity: JobOpportunity,
  profile: UserMatchProfile
): Promise<JobMatchResult | null>;

/**
 * Batch score opportunities with Gemini (sequential with delay to avoid rate limits).
 */
export async function batchScoreJobsWithGemini(
  apiKey: string,
  opportunities: JobOpportunity[],
  profile: UserMatchProfile,
  options?: { delayMs?: number; onProgress?: (done: number, total: number) => void }
): Promise<Record<string, JobMatchResult | null>>;
```

**Prompt design:**

```typescript
const SYSTEM_INSTRUCTION = `You are a job match analyzer. Compare the given job opportunity with the candidate's professional profile. 

Return a structured analysis with:
1. Overall match score (0-100)
2. Sub-scores: semanticFit, historicalFit, skillsFit, locationWorkTypeFit, compensationFit, seniorityFit (each 0-100)
3. Verdict: excellent_fit (85+), good_fit (65-84), partial_fit (40-64), low_fit (0-39)
4. Confidence: high (clear data), medium (some inference needed), low (insufficient data)
5. 3-5 specific strengths (why this is a good match)
6. 2-4 specific gaps (why this might not be ideal)
7. A concise explanation (2-3 sentences)

Be objective and evidence-based. Do not inflate scores.`;

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    overallScore: { type: "integer", minimum: 0, maximum: 100 },
    subscores: {
      type: "object",
      properties: {
        semanticFit: { type: "integer", minimum: 0, maximum: 100 },
        historicalFit: { type: "integer", minimum: 0, maximum: 100 },
        skillsFit: { type: "integer", minimum: 0, maximum: 100 },
        locationWorkTypeFit: { type: "integer", minimum: 0, maximum: 100 },
        compensationFit: { type: "integer", minimum: 0, maximum: 100 },
        seniorityFit: { type: "integer", minimum: 0, maximum: 100 },
      },
      required: ["semanticFit", "historicalFit", "skillsFit", "locationWorkTypeFit", "compensationFit", "seniorityFit"]
    },
    verdict: { type: "string", enum: ["excellent_fit", "good_fit", "partial_fit", "low_fit"] },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    strengths: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
    gaps: { type: "array", items: { type: "string" }, minItems: 0, maxItems: 4 },
    explanation: { type: "string", maxLength: 500 },
  },
  required: ["overallScore", "subscores", "verdict", "confidence", "strengths", "gaps", "explanation"]
};
```

**Criterio de aceptación:**
- ✅ Usa `callGeminiApi` con `responseSchema`
- ✅ Redacta company names en el opportunity antes de enviar (usar `[COMPANY]`)
- ✅ `computationMethod: 'gemini'`
- ✅ `profileVersion` propagado desde el profile input
- ✅ Batch con delay configurable (default 500ms) para respetar rate limits
- ✅ Si falla una llamada individual, retorna `null` para esa opportunity (no falla todo el batch)
- ✅ `onProgress` callback opcional para UI

---

### TAREA 6: Zustand Store de Matching (Agente F)
**Archivo nuevo:** `src/stores/matchingStore.ts`

**Objetivo:** Estado centralizado para todo el sistema de matching.

**Store a implementar (patrón idéntico a `applicationsStore.ts` / `opportunitiesStore.ts`):**

```typescript
import { create } from 'zustand';
import type { UserMatchProfile, JobMatchResult, MatchingPreferences, UserFeedbackOnMatch } from '../types/matching';
import {
  getMatchProfile, saveMatchProfile, clearMatchProfile,
  getMatchResults, saveMatchResults, clearMatchResults,
  getMatchingPreferences, saveMatchingPreferences,
  getMatchFeedback, addMatchFeedback,
} from '../storage/matching';

interface MatchingState {
  // State
  matchProfile: UserMatchProfile | null;
  matchResults: Record<string, JobMatchResult>;
  matchingPreferences: MatchingPreferences;
  feedback: UserFeedbackOnMatch[];
  isLoading: boolean;
  isComputing: boolean;
  computeProgress: { done: number; total: number } | null;
  error: string | null;

  // Actions
  loadMatchingData: () => void;
  
  setMatchProfile: (profile: UserMatchProfile | null) => void;
  updateMatchProfile: (updates: Partial<UserMatchProfile>) => void;
  clearMatchProfile: () => void;
  
  setMatchResults: (results: Record<string, JobMatchResult>) => void;
  setMatchResult: (result: JobMatchResult) => void;
  clearMatchResults: () => void;
  
  updateMatchingPreferences: (updates: Partial<MatchingPreferences>) => void;
  resetMatchingPreferences: () => void;
  
  addFeedback: (feedback: UserFeedbackOnMatch) => void;
  
  // Orchestration
  computeAllScores: (options: {
    apiKey?: string;
    opportunities: JobOpportunity[];
    applications: JobApplication[];
    useGemini: boolean;
  }) => Promise<void>;
  
  // Selectors (computed)
  getTopMatches: (limit?: number, minScore?: number) => JobMatchResult[];
  getMatchForOpportunity: (opportunityId: string) => JobMatchResult | null;
}
```

**Implementación de `computeAllScores`:**
1. Si no hay `matchProfile`, primero construir con `buildProfileFromHistory(applications)`
2. Si `useGemini` y hay `apiKey`:
   - Primero intenta `synthesizeUserProfileWithGemini` para mejorar el perfil
   - Luego `batchScoreJobsWithGemini` para todas las opportunities
3. Si no hay Gemini o falla:
   - Usar `batchCalculateScores` (determinístico)
4. Guardar resultados en storage y state
5. Actualizar `computeProgress` durante el proceso

**Criterio de aceptación:**
- ✅ Patrón Zustand idéntico a stores existentes (`applicationsStore.ts`)
- ✅ Persistencia via storage layer (no localStorage directo en el store)
- ✅ `getTopMatches` ordena por `overallScore` descendente, filtra por `minScore`
- ✅ Error handling: si falla Gemini, automáticamente fallback a deterministic
- ✅ No usa `any`

---

### TAREA 7: MatchScoreBadge Component (Agente G)
**Archivo nuevo:** `src/components/MatchScoreBadge.tsx`

**Props:**
```typescript
interface MatchScoreBadgeProps {
  score: number;
  confidence?: 'low' | 'medium' | 'high';
  verdict?: 'excellent_fit' | 'good_fit' | 'partial_fit' | 'low_fit';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  onClick?: () => void;
  className?: string;
}
```

**Diseño:**
- Size `sm`: badge compacto con solo número y color
- Size `md`: badge con número + label corto ("90% - Excelente")
- Size `lg`: badge grande con círculo de progreso visual (SVG ring)
- Colores por score: 85+ verde (`bg-emerald-500`), 65-84 amarillo (`bg-amber-500`), 40-64 naranja (`bg-orange-500`), 0-39 rojo (`bg-red-500`)
- Low confidence: añade icono `?` o dashed border
- Dark mode compatible (`dark:` prefixes)
- Hover scale micro-interaction

**Criterio de aceptación:**
- ✅ Componente funcional con TypeScript
- ✅ Usa Tailwind, responsive
- ✅ Dark mode
- ✅ Test: `src/components/MatchScoreBadge.test.tsx`
- ✅ Export nombrado

---

### TAREA 8: MatchBreakdownModal Component (Agente H)
**Archivo nuevo:** `src/components/MatchBreakdownModal.tsx`

**Props:**
```typescript
interface MatchBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchResult: JobMatchResult | null;
  opportunity?: JobOpportunity | null; // para mostrar contexto
}
```

**Diseño (dentro de modal con backdrop):**
- Header: "Match Analysis" + score grande con color
- Section "Subscores": 6 barras de progreso horizontales con labels
  - Semantic Fit, Historical Fit, Skills Fit, Location & Work Type, Compensation, Seniority
- Section "Strengths": lista con iconos ✅ verdes
- Section "Gaps": lista con iconos ⚠️ amarillos/naranjas
- Section "Explanation": card con texto explicativo
- Footer: botones "Close" + "Apply to Job" (si hay opportunity)

**Usa componentes existentes:**
- `Card`, `Badge` de `src/components/ui/`
- Focus trap y ESC para cerrar

**Criterio de aceptación:**
- ✅ No renderiza nada si `!isOpen`
- ✅ Barras animadas (width transition)
- ✅ Dark mode
- ✅ Test: `src/components/MatchBreakdownModal.test.tsx`
- ✅ Usa `useFocusTrap` si existe, o implementa focus trap simple

---

### TAREA 9: ProfileSetupModal Component (Agente I)
**Archivo nuevo:** `src/components/ProfileSetupModal.tsx`

**Props:**
```typescript
interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: Partial<UserMatchProfile>) => void;
  existingProfile?: UserMatchProfile | null;
}
```

**Diseño (wizard de 3 pasos o formulario simple):**
- Paso 1: Información básica
  - Target Roles: TagInput (múltiples strings)
  - Seniority: Select dropdown
  - Preferred Work Types: Checkboxes (Remote, On-site, Hybrid)
- Paso 2: Skills & Preferences
  - Top Skills: TagInput
  - Preferred Locations: TagInput
  - Preferred Industries: TagInput
- Paso 3: Compensation & CV (opcional)
  - Salary Range: Dos inputs numéricos + select de moneda (USD, EUR, etc.)
  - CV Text: Textarea grande (paste CV text aquí)
  - O: Upload de archivo (TXT, PDF - usar FileReader para extraer texto, no parsing de PDF, solo txt por ahora)

**Criterio de aceptación:**
- ✅ Estado local con useState, validate antes de save
- ✅ Si `existingProfile`, pre-popula todos los campos
- ✅ TagInput reutilizable (múltiples tags, comma-separated, backspace to remove)
- ✅ Dark mode
- ✅ Test: `src/components/ProfileSetupModal.test.tsx`
- ✅ Mobile responsive (flex-col en móvil)

---

### TAREA 10: MatchingSettings Component (Agente J)
**Archivo nuevo:** `src/components/settings/MatchingSettings.tsx`

**Props:**
```typescript
interface MatchingSettingsProps {
  preferences: MatchingPreferences;
  profile: UserMatchProfile | null;
  hasGeminiKey: boolean;
  onUpdatePreferences: (updates: Partial<MatchingPreferences>) => void;
  onOpenProfileModal: () => void;
  onComputeScores: () => void;
  isComputing: boolean;
}
```

**Diseño:**
- Toggle "Enable AI Job Matching" (principal)
- Toggle "Use Gemini AI for advanced analysis" (disabled si no hay Gemini key)
- Slider "Minimum match threshold" (0-100, con label dinámico)
- Toggle "Prioritize remote positions" 
- Toggle "Include my application notes in AI analysis"
- Toggle "Include my CV in AI analysis"
- Toggle "Auto-compute match scores when new opportunities are added"
- Card "Your Profile":
  - Si hay profile: muestra resumen (target roles count, top skills count, seniority, confidence badge)
  - Botón "Edit Profile"
  - Botón "Re-compute with AI" (usa Gemini key)
- Si no hay profile: mensaje "Set up your profile for better matches" + botón "Create Profile"

**Criterio de aceptación:**
- ✅ Consistente con otros settings components (`EmailScanSettings.tsx`)
- ✅ Todos los toggles funcionan con onUpdatePreferences
- ✅ States disabled correctamente cuando no aplica
- ✅ Test: `src/components/settings/MatchingSettings.test.tsx`

---

### TAREA 11: RecommendationPanel Component (Agente K)
**Archivo nuevo:** `src/components/RecommendationPanel.tsx`

**Props:**
```typescript
interface RecommendationPanelProps {
  matchResults: JobMatchResult[];
  opportunities: JobOpportunity[];
  onViewOpportunity: (opportunity: JobOpportunity) => void;
  onApply: (opportunity: JobOpportunity) => void;
  maxItems?: number;
}
```

**Diseño:**
- Card con título "Recommended for You" o "Top Matches"
- Lista vertical de items:
  - Cada item: MatchScoreBadge (sm) + position + company + location
  - Subtitle: "Strong match: 4/6 skills align" (primer strength)
  - Botón "View" y "Apply" a la derecha
- Si no hay matches: "Add opportunities to see AI-powered recommendations"
- Si matching disabled: "Enable matching in settings"

**Criterio de aceptación:**
- ✅ Muestra top matches ordenados por score
- ✅ Limita a maxItems (default 5)
- ✅ Responsive (scroll horizontal en móvil, lista vertical en desktop)
- ✅ Dark mode
- ✅ Test: `src/components/RecommendationPanel.test.tsx`

---

## FASE 2 - Integración (secuencial, después de Fase 1)

### TAREA 12: Integrar Matching en OpportunitiesPage
**Archivos a modificar:**
- `src/pages/OpportunitiesPage.tsx`
- `src/components/OpportunitiesTable.tsx`

**Cambios:**
1. OpportunitiesTable: agregar columna "Match" al inicio de la tabla (opcional, toggleable)
2. Mostrar MatchScoreBadge en cada row cuando hay match result
3. Click en badge abre MatchBreakdownModal
4. Agregar RecommendationPanel debajo de la tabla (o en sidebar)
5. Agregar filtros: "Show only matches above [threshold]%"

### TAREA 13: Integrar Matching en SettingsPage
**Archivo a modificar:** `src/pages/SettingsPage.tsx`

**Cambios:**
1. Agregar `matching` a `settingsTabs` (icono 🤖 o 🎯)
2. Renderizar `MatchingSettings` cuando la tab está activa
3. Conectar con `useMatchingStore` o props pasadas desde SettingsPage
4. Agregar traducciones en i18n para la nueva sección

### TAREA 14: Integrar Matching en HomePage
**Archivo a modificar:** `src/pages/HomePage.tsx`

**Cambios:**
1. Agregar RecommendationPanel en sidebar o debajo del resumen
2. Mostrar "Top opportunities based on your profile"
3. Quick action: "Set up matching" si no está configurado

### TAREA 15: Integrar en App.tsx y Barrel Exports
**Archivos a modificar:**
- `src/types/index.ts` (exportar tipos de matching)
- `src/storage/index.ts` (exportar funciones de matching storage)
- Verificar que no hay imports rotos

---

## Diagrama de Dependencias

```
FASE 1 (Paralelo):
  T1 (types) ──┬── T6 (store) ── FASE 2
               ├── T2 (storage) ─┤
               ├── T3 (deterministic)
               ├── T4 (gemini profile)
               ├── T5 (gemini scoring)
               ├── T7 (badge)
               ├── T8 (breakdown modal)
               ├── T9 (profile modal)
               ├── T10 (settings)
               └── T11 (recommendation panel)

FASE 2 (Secuencial):
  T12 (opportunities integration)
  T13 (settings integration)
  T14 (home integration)
  T15 (barrel exports)
```

**Nota importante para agentes:** En Fase 1, cada agente puede asumir que los tipos de `src/types/matching.ts` existen (serán creados por T1). Si un agente corre antes que T1, debe definir los tipos necesarios **inline** en su archivo y luego consolidar en la integración.
