-- JAJAT (Just Another Job Application Tracker) - MySQL Schema

## Canonical Source

The canonical legacy SQL schema lives in [api/data/schema.sql](../api/data/schema.sql).

This document is a documentation companion for Phinx adoption and migration planning. If this file and `api/data/schema.sql` ever differ, use `api/data/schema.sql` as the source of truth for the already-deployed legacy schema.

## Phinx Migration Strategy For This Existing Schema

This SQL schema already exists in production and must not be replayed there through Phinx table-by-table migrations.

Production rule:

- Run only the baseline migration `20260622090000_InitialDatabaseBaseline`
- Do not convert the current production schema into pending executable Phinx migrations under `db/migrations`, because Phinx could try to apply them to an already live database

After the baseline is recorded, apply only the new incremental branch migrations that evolve the already-live schema.

Recommended usage:

- Use this document as the source of truth for the legacy schema already deployed
- Use the baseline migration to tell Phinx that the current production schema is already in place
- Create only incremental migrations in Phinx from this point forward

Suggested logical migration breakdown by table for reference only:

1. `CreateUsersTable`
2. `CreateApplicationsTable`
3. `CreateTimelineEventsTable`
4. `CreateOpportunitiesTable`
5. `CreateUserPreferencesTable`
6. `CreateOrganizationsTable`
7. `CreateOrganizationMembersTable`
8. `CreateAuthTokensTable`
9. `CreateAuditLogTable`

If at some point you need a clean bootstrap flow for a brand-new database using Phinx only, create those migrations in a separate controlled branch or separate migration path, and do not run them against the existing production database that has already been baselined.

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    company VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,
    platform VARCHAR(100),
    location VARCHAR(255),
    work_type VARCHAR(50),
    hybrid_days INT,
    salary VARCHAR(100),
    link TEXT,
    notes TEXT,
    application_date DATE,
    interview_date DATE,
    contact_name VARCHAR(255),
    custom_fields TEXT, -- JSON string
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS timeline_events (
    id VARCHAR(50) PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    custom_type_name VARCHAR(255),
    date DATETIME NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    interviewer_name VARCHAR(255),
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS opportunities (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    company VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    link TEXT,
    salary VARCHAR(100),
    location VARCHAR(255),
    work_type VARCHAR(50),
    platform VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'interested',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INT PRIMARY KEY,
    theme VARCHAR(20) DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'en',
    preferred_view VARCHAR(20) DEFAULT 'table',
    page_size INT DEFAULT 10,
    columns_visibility TEXT, -- JSON string
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS organization_members (
    organization_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'mentor', 'member'
    PRIMARY KEY (organization_id, user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

## Table-To-Migration Mapping Reference

### 1. `CreateUsersTable`

Contains:

- `id`
- `email`
- `password_hash`
- `google_id`
- `username`
- `display_name`
- `avatar_url`
- `is_public`
- `bio`
- `created_at`
- `updated_at`

### 2. `CreateApplicationsTable`

Contains:

- `id`
- `user_id`
- `company`
- `position`
- `status`
- `platform`
- `location`
- `work_type`
- `hybrid_days`
- `salary`
- `link`
- `notes`
- `application_date`
- `interview_date`
- `contact_name`
- `custom_fields`
- `last_update`
- `is_deleted`

Dependencies:

- foreign key to `users(id)`

### 3. `CreateTimelineEventsTable`

Contains:

- `id`
- `application_id`
- `type`
- `custom_type_name`
- `date`
- `status`
- `notes`
- `interviewer_name`

Dependencies:

- foreign key to `applications(id)`

### 4. `CreateOpportunitiesTable`

Contains:

- `id`
- `user_id`
- `company`
- `position`
- `link`
- `salary`
- `location`
- `work_type`
- `platform`
- `notes`
- `status`
- `created_at`

Dependencies:

- foreign key to `users(id)`

### 5. `CreateUserPreferencesTable`

Contains:

- `user_id`
- `theme`
- `language`
- `preferred_view`
- `page_size`
- `columns_visibility`

Dependencies:

- foreign key to `users(id)`

### 6. `CreateOrganizationsTable`

Contains:

- `id`
- `name`
- `description`
- `created_at`

### 7. `CreateOrganizationMembersTable`

Contains:

- `organization_id`
- `user_id`
- `role`

Dependencies:

- foreign key to `organizations(id)`
- foreign key to `users(id)`

### 8. `CreateAuthTokensTable`

Contains:

- `id`
- `user_id`
- `token_hash`
- `token_type`
- `expires_at`
- `created_at`
- `last_used_at`
- `ip_address`
- `user_agent`

Dependencies:

- foreign key to `users(id)`

### 9. `CreateAuditLogTable`

Contains:

- `id`
- `user_id`
- `organization_id`
- `entity_type`
- `entity_id`
- `action`
- `old_values`
- `new_values`
- `ip_address`
- `user_agent`
- `created_at`

Dependencies:

- foreign key to `users(id)`
- foreign key to `organizations(id)`
