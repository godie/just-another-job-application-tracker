job-application-tracker/api/data/schema.sql
```sql
-- JAJAT (Just Another Job Application Tracker) - MySQL Schema
-- Multi-tenant support with organization_id for multi-organization deployment

-- =====================================================
-- ORGANIZATIONS (for future multi-tenant support)
-- =====================================================
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    settings JSON, -- Organization-level settings (JSON)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_organization_active (is_active)
);

-- =====================================================
-- USERS (with multi-tenant support)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT DEFAULT NULL, -- NULL for standalone, references organizations for multi-tenant
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    username VARCHAR(50) UNIQUE,
    display_name VARCHAR(100),
    avatar_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    bio TEXT,
    role VARCHAR(20) DEFAULT 'member', -- 'owner', 'admin', 'member', 'mentor'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    INDEX idx_user_organization (organization_id),
    INDEX idx_user_email (email),
    INDEX idx_user_active (is_active)
);

-- =====================================================
-- USER PREFERENCES
-- =====================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INT PRIMARY KEY,
    theme VARCHAR(20) DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'en',
    preferred_view VARCHAR(20) DEFAULT 'table',
    page_size INT DEFAULT 10,
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    enabled_fields JSON, -- Array of field IDs that are enabled/visible
    column_order JSON, -- Array of field IDs in display order
    custom_fields JSON, -- User-defined custom field definitions
    custom_interview_events JSON, -- User-defined interview event types
    ats_search JSON, -- ATS search preferences (roles, keywords, location)
    email_scan_months INT DEFAULT 3,
    enabled_chatbots JSON, -- Array of enabled chatbot names
    notification_settings JSON, -- Notification preferences
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =====================================================
-- APPLICATIONS (Job Applications)
-- =====================================================
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id INT DEFAULT NULL, -- For multi-tenant queries
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
    follow_up_date DATE, -- Added: follow-up date
    contact_name VARCHAR(255),
    custom_fields TEXT, -- JSON string
    last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    INDEX idx_application_user (user_id),
    INDEX idx_application_organization (organization_id),
    INDEX idx_application_status (status),
    INDEX idx_application_company (company),
    INDEX idx_application_deleted (is_deleted)
);

-- =====================================================
-- TIMELINE EVENTS (Interview History)
-- =====================================================
CREATE TABLE IF NOT EXISTS timeline_events (
    id VARCHAR(50) PRIMARY KEY,
    application_id VARCHAR(50) NOT NULL,
    user_id INT NOT NULL, -- Added: to easily query user's timeline
    organization_id INT DEFAULT NULL, -- For multi-tenant queries
    type VARCHAR(50) NOT NULL,
    custom_type_name VARCHAR(255),
    date DATETIME NOT NULL,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    interviewer_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    INDEX idx_timeline_application (application_id),
    INDEX idx_timeline_user (user_id),
    INDEX idx_timeline_organization (organization_id),
    INDEX idx_timeline_date (date),
    INDEX idx_timeline_type (type)
);

-- =====================================================
-- OPPORTUNITIES (Saved Job Listings)
-- =====================================================
CREATE TABLE IF NOT EXISTS opportunities (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    organization_id INT DEFAULT NULL,
    company VARCHAR(255) NOT NULL,
    position VARCHAR(255) NOT NULL,
    link TEXT,
    description TEXT,
    salary VARCHAR(100),
    location VARCHAR(255),
    work_type VARCHAR(50),
    platform VARCHAR(100),
    notes TEXT,
    status VARCHAR(50) DEFAULT 'interested',
    posted_date DATE, -- Added: when job was posted
    captured_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- Renamed from created_at for clarity
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    INDEX idx_opportunity_user (user_id),
    INDEX idx_opportunity_organization (organization_id),
    INDEX idx_opportunity_status (status),
    INDEX idx_opportunity_company (company),
    INDEX idx_opportunity_deleted (is_deleted)
);

-- =====================================================
-- ORGANIZATION MEMBERS (User-Organization relationships)
-- =====================================================
CREATE TABLE IF NOT EXISTS organization_members (
    organization_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'mentor', 'member'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, user_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_org_member_user (user_id)
);

-- =====================================================
-- AUTH TOKENS (for session management)
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_tokens (
    id VARCHAR(50) PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    token_type VARCHAR(20) DEFAULT 'access', -- 'access', 'refresh'
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token_user (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_token_expires (expires_at)
);

-- =====================================================
-- AUDIT LOG (for tracking changes)
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    organization_id INT DEFAULT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'application', 'opportunity', 'user', etc.
    entity_id VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_created (created_at),
    INDEX idx_audit_organization (organization_id)
);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default organization (for multi-tenant setup)
INSERT INTO organizations (name, description)
VALUES ('Default Organization', 'Default organization for single-tenant deployments');

-- Note: For now, users will have organization_id = NULL (standalone mode)
-- When multi-tenant is enabled, users can be assigned to organizations
-- The application logic will handle both cases:
--   - organization_id IS NULL -> standalone mode (current behavior)
--   - organization_id IS NOT NULL -> multi-tenant mode
