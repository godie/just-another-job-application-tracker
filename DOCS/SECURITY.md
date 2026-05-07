# Security Policy

This document outlines the security measures implemented in this project to ensure the safety and integrity of user data. We take security seriously and have taken steps to mitigate common web vulnerabilities.

## Vulnerabilities Addressed

### 1. Cross-Site Scripting (XSS)

- **Vulnerability:** XSS attacks occur when malicious scripts are injected into a website. In this application, user-provided data was rendered directly to the DOM without proper sanitization, creating a risk of stored XSS.

- **Mitigation:** We have implemented a two-pronged approach to prevent XSS:
    - **Input Sanitization:** All user data is sanitized on the frontend using the `dompurify` library before it is stored in `localStorage` or rendered in the application. This is done in `src/utils/localStorage.ts` and `src/components/ApplicationTable.tsx`.
    - **Backend Sanitization:** As a second layer of defense, all data sent to the backend is sanitized using `htmlspecialchars` in the PHP API. This ensures that even if malicious data is sent to the server, it is rendered harmless.

- **Why this is a good practice:** By sanitizing data at multiple layers (both on the client and server), we create a robust defense against XSS. `dompurify` is a well-regarded library that is highly effective at preventing XSS, and `htmlspecialchars` is a standard PHP function for escaping HTML.

### 2. Injection Attacks

- **Vulnerability:** Injection attacks, such as SQL injection, occur when an attacker can send malicious data to an application that is then executed by the backend. While this application does not use a SQL database, it does interact with the Google Sheets API, and unsanitized data could still be sent to that service.

- **Mitigation:** All user-provided data is sanitized on the backend using `htmlspecialchars` before it is processed or sent to the Google Sheets API. This is done in `api/google-sheets.php`. We also validate the format of the `spreadsheetId` to ensure it is a valid Google Sheets ID.

- **Why this is a good practice:** Sanitizing all data on the backend is a critical security measure that prevents a wide range of injection attacks. It ensures that the data is safe before it is used by the application or any external services.

### 3. Cross-Origin Resource Sharing (CORS)

- **Vulnerability:** The PHP backend had a permissive CORS policy (`Access-Control-Allow-Origin: *`), which would have allowed any website to make requests to the API. This could have enabled Cross-Site Request Forgery (CSRF) attacks and other malicious activities.

- **Mitigation:** We have implemented a strict CORS policy on the backend that only allows requests from the application's frontend. This is configured in all the PHP files in the `api/` directory.

- **Why this is a good practice:** A strict CORS policy is essential for preventing unauthorized cross-origin requests. By only allowing requests from trusted origins, we can ensure that the API is only used by the intended frontend application.

## Reporting a Vulnerability

If you discover a security vulnerability, please open an issue on GitHub. We will address it as quickly as possible.
