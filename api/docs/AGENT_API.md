# Agent Job Applications API

API segura para que agentes automatizados registren postulaciones laborales realizadas.

## Autenticación

Todas las rutas requieren un **API Key** enviado en el header `Authorization`:

```http
Authorization: Bearer <AGENT_API_KEY>
```

La clave se lee desde la variable de entorno `AGENT_API_KEY` (ver `.env`).

## Variables de Entorno

Agregar a `api/.env`:

```env
AGENT_API_KEY="sk-agent-jajat-<random-hex>"
```

Generar una clave segura:

```bash
openssl rand -hex 32
```

## Endpoints

### POST /api/agent/job-applications

Registra una nueva postulación. Es **idempotente**: enviar el mismo payload dos veces no crea duplicados.

#### Request Body

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `job_title` | string | ✅ | Título del puesto |
| `company_name` | string | ✅ | Nombre de la empresa |
| `source_url` | string | ✅ | URL de la vacante (debe ser URL válida) |
| `applied_at` | string | ✅ | Fecha/hora ISO 8601 de la postulación |
| `salary_text` | string | ❌ | Texto del rango salarial |
| `technologies` | string[] | ❌ | Stack tecnológico (se normaliza a minúsculas) |
| `location_text` | string | ❌ | Ubicación completa |
| `province` | string | ❌ | Provincia/estado |
| `country` | string | ❌ | País |
| `work_mode` | string | ❌ | `remote`, `hybrid`, `onsite`, `unknown` |
| `application_status` | string | ❌ | `submitted`, `skipped`, `failed` |
| `notes` | string | ❌ | Notas adicionales |
| `external_job_id` | string | ❌ | ID externo de la vacante |
| `raw_payload` | object | ❌ | Payload crudo para auditoría |
| `agent_name` | string | ❌ | Nombre del agente/automatización |

#### Response

**201 Created** (nuevo registro):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "idempotencyHash": "a1b2c3...",
    "jobTitle": "Software Engineer",
    "companyName": "Acme Corp",
    "salaryText": "$120k - $150k CAD",
    "technologies": ["php", "react", "mysql"],
    "appliedAt": "2026-01-15T10:30:00+00:00",
    "sourceUrl": "https://example.com/jobs/123",
    "locationText": "Toronto, ON",
    "province": "Ontario",
    "country": "Canada",
    "workMode": "remote",
    "applicationStatus": "submitted",
    "notes": "Applied via company portal",
    "externalJobId": "acme-12345",
    "rawPayload": null,
    "agentName": "codex-automation",
    "createdAt": "2026-01-15T10:35:00Z",
    "updatedAt": "2026-01-15T10:35:00Z"
  },
  "isDuplicate": false,
  "message": "Application recorded successfully"
}
```

**200 OK** (duplicado detectado):

```json
{
  "success": true,
  "data": { /* existing record */ },
  "isDuplicate": true,
  "message": "Application already exists (duplicate detected)"
}
```

#### Ejemplo cURL

```bash
curl -X POST https://jajat.godieboy.com/api/agent/job-applications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-agent-jajat-..." \
  -d '{
    "job_title": "Software Engineer",
    "company_name": "Shopify",
    "salary_text": "$130k - $170k CAD",
    "technologies": ["Ruby", "Rails", "React"],
    "applied_at": "2026-06-22T14:30:00Z",
    "source_url": "https://www.shopify.com/careers/engineering",
    "location_text": "Vancouver, BC",
    "province": "British Columbia",
    "country": "Canada",
    "work_mode": "remote",
    "application_status": "submitted",
    "notes": "Applied via Lever portal. Cover letter included.",
    "external_job_id": "shopify-se-2026-001",
    "agent_name": "codex-job-bot"
  }'
```

---

### GET /api/agent/job-applications

Lista postulaciones registradas con filtros opcionales.

#### Query Parameters

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `status` | string | — | Filtrar por `application_status` |
| `company` | string | — | Filtrar por nombre de empresa (LIKE) |
| `work_mode` | string | — | `remote`, `hybrid`, `onsite` |
| `province` | string | — | Filtrar por provincia |
| `country` | string | — | Filtrar por país |
| `agent_name` | string | — | Filtrar por nombre de agente |
| `limit` | int | 50 | Máximo 100 |
| `offset` | int | 0 | Paginación |
| `sort_by` | string | `created_at` | `applied_at`, `created_at`, `company_name`, `job_title` |
| `sort_order` | string | `DESC` | `ASC` o `DESC` |

#### Response

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "jobTitle": "Software Engineer",
      "companyName": "Shopify",
      ...
    }
  ],
  "meta": {
    "total": 42,
    "limit": 50,
    "offset": 0
  }
}
```

#### Ejemplo cURL

```bash
# Listar las últimas 10 postulaciones remotas en BC
curl "https://jajat.godieboy.com/api/agent/job-applications?work_mode=remote&province=British+Columbia&limit=10" \
  -H "Authorization: Bearer sk-agent-jajat-..."

# Listar postulaciones fallidas
curl "https://jajat.godieboy.com/api/agent/job-applications?status=failed" \
  -H "Authorization: Bearer sk-agent-jajat-..."
```

---

## Idempotencia

El sistema calcula un hash SHA-256 a partir de:

```
company_name | job_title | source_url | applied_at
```

Si un registro con el mismo hash ya existe, se devuelve el existente en lugar de crear uno nuevo. Esto permite que un agente reintente en caso de timeout de red sin crear duplicados.

## Normalización

- **`technologies`**: minúsculas, trim, deduplicadas
- **`work_mode`**: se fuerza a `remote`, `hybrid`, `onsite` o `unknown`
- **`application_status`**: se fuerza a `submitted`, `skipped` o `failed`
- **`applied_at`**: se convierte a UTC en formato ISO 8601

## Notas para Integración con Codex

1. **Generar la clave API** y agregarla a las variables de entorno del agente.
2. **Después de cada postulación exitosa**, enviar un POST a `/api/agent/job-applications`.
3. **Manejar `isDuplicate: true`** como éxito (la postulación ya está registrada).
4. **Incluir `raw_payload`** con datos adicionales del scraping para auditoría futura.
5. **Usar `agent_name`** para identificar qué automatización envió el registro.

## Migración de Base de Datos

Ejecutar en MySQL:

```sql
-- El schema completo está en api/data/schema.sql
-- La tabla agent_job_applications se crea automáticamente si usas el schema.sql completo
```

Para aplicar solo la migración de esta tabla:

```sql
CREATE TABLE IF NOT EXISTS agent_job_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    idempotency_hash VARCHAR(64) UNIQUE NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    salary_text VARCHAR(255),
    technologies JSON,
    applied_at DATETIME NOT NULL,
    source_url TEXT NOT NULL,
    location_text VARCHAR(255),
    province VARCHAR(100),
    country VARCHAR(100),
    work_mode VARCHAR(20) DEFAULT 'unknown',
    application_status VARCHAR(20) DEFAULT 'submitted',
    notes TEXT,
    external_job_id VARCHAR(255),
    raw_payload JSON,
    agent_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_agent_hash (idempotency_hash),
    INDEX idx_agent_company (company_name),
    INDEX idx_agent_status (application_status),
    INDEX idx_agent_applied (applied_at),
    INDEX idx_agent_created (created_at),
    INDEX idx_agent_work_mode (work_mode),
    INDEX idx_agent_province (province)
);
```
