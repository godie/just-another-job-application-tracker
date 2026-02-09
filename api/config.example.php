<?php
/**
 * API configuration template.
 * - Local: copy to config.php and set real values for google_client_id / google_client_secret.
 * - Deploy: config.php is generated from this file; placeholders are replaced by GitHub Actions secrets.
 */ 

return [
    'allowed_origins' => [
        'https://jajat.godieboy.com',
    ],
    'cookie_name' => 'google_auth_token',
    'access_expires_cookie_name' => 'google_auth_expires', // timestamp when access token expires
    'cookie_expiry_seconds' => 3600, // 1 hour for access token; refresh used when expired
    'refresh_cookie_name' => 'google_refresh_token',
    'refresh_cookie_days' => 30,
    'google_client_id' => '__VITE_GOOGLE_CLIENT_ID__',
    'google_client_secret' => '__VITE_GOOGLE_CLIENT_SECRET__',
    'suggestions_db_path' => __DIR__ . '/suggestions.db',
];
