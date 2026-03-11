-- JAJAT (Just Another Job Application Tracker) - MySQL Schema

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
