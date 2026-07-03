# Google OAuth Scopes Justification

## Application Information

- **Application Name**: Just Another Job Application Tracker (JAJAT)
- **Website**: https://jajat.godieboy.com
- **Contact Email**: godie.mendoza@gmail.com
- **Project ID**: []

## OAuth Scopes Requested

### 1. `openid` (OpenID Connect)

**Purpose**: User Authentication

**Justification**:
This scope is required to establish a secure user session using OpenID Connect. It allows us to verify the user's identity and create an authenticated session without requiring a separate username/password system. This is the industry-standard baseline for Google Sign-In integrations.

**Data Collected**: User's Google account ID
**How it's used**: To create a unique session identifier for the user
**Storage**: Stored in HTTP-only session cookie (server-side)
**User benefit**: Seamless, secure login without password management

---

### 2. `email` (Google Account Email)

**Purpose**: User Identification

**Justification**:
The user's email address is used to associate job application data with their account session. This enables personalized experiences and allows users to be identified within the application. The email is NOT used for marketing or communications.

**Data Collected**: Primary Google account email address
**How it's used**: Displayed in the UI to confirm logged-in user; used for session association
**Storage**: Stored temporarily in browser session storage
**User benefit**: Personalized experience and account identification

---

### 3. `profile` (userinfo.profile)

**Purpose**: User Profile Display

**Justification**:
Basic profile information (name, profile picture URL) is used to display the user's identity in the application header. This provides a personalized, friendly user experience.

**Data Collected**: Full name, profile picture URL
**How it's used**: Displayed in the application header for user recognition
**Storage**: Stored temporarily in browser session storage
**User benefit**: Personalized interface with user's name and photo

---

### 4. `https://www.googleapis.com/auth/spreadsheets` (Google Sheets API)

**Purpose**: Google Sheets Synchronization

**Justification**:
This scope enables the optional Google Sheets Sync feature. Users can choose to sync their job application data to a Google Spreadsheet for backup, analysis, or sharing purposes. The application:
- Creates spreadsheets only when explicitly requested by the user
- Syncs data only when the user clicks "Sync Now"
- Only accesses spreadsheets created by or explicitly linked to the application
- Does NOT access, modify, or delete any other Google Drive files

**Data Collected**: Job application data (position, company, dates, status, etc.)
**How it's used**: Create and update Google Sheets with user's job application data
**Storage**: Data stored in user's own Google Drive account
**User benefit**: Backup, data portability, and advanced analysis capabilities

**User Control**:
- Feature is completely optional
- Users must explicitly create or link a spreadsheet
- Sync only occurs on user action
- Users can disconnect at any time

---

### 5. `https://www.googleapis.com/auth/gmail.readonly` (Gmail API - READ ONLY)

**Purpose**: Gmail Email Scan for Job Applications

**Justification**:
This read-only scope powers the optional Gmail Scan feature, which helps users discover job application-related emails (confirmation receipts, interview invitations, rejection notices) and automatically proposes additions or updates to their job application tracker.

**What we do**:
- Search for emails matching job application-related keywords (e.g., "interview", "application confirmation", "hiring", "recruiter")
- Read email content to extract: company name, position title, dates, recruiter name
- Parse email metadata (sender, subject, date)
- Present extracted data as proposed additions/updates for user review

**What we DO NOT do**:
- Send emails on behalf of users
- Modify or delete emails
- Access contacts or calendar
- Scan emails for advertising or marketing
- Sell or share email data with third parties
- Use email data for building user profiles beyond the immediate service

**Data Processing**:
- **Client-side only**: All email content is processed locally in the user's browser
- **No server transmission**: Email data is NEVER sent to our servers
- **Temporary processing**: Email content is held only in browser memory during the scan session
- **No persistent storage**: Email content is discarded after the session ends; only extracted job data (company, position, dates) may be saved to localStorage if user approves

**User Control**:
- Feature is completely optional
- Users must explicitly navigate to Gmail Scan page
- Scans only occur when user clicks "Scan Gmail"
- Users review all proposed changes before applying
- Gmail access can be revoked anytime at myaccount.google.com/permissions

**Compliance with Gmail API Limited Use Requirements**:
- ✅ Used only to provide the Gmail Scan feature
- ✅ No human access to Gmail data except as necessary to provide the service
- ✅ Not used for serving advertisements
- ✅ Not sold or shared with third parties for advertising/marketing
- ✅ Not used for data mining or reselling
- ✅ User can revoke access at any time

---

## Security Measures

### Data Protection
- **HTTPS Only**: All communications use encrypted HTTPS connections
- **HTTP-only Cookies**: Authentication tokens stored in HTTP-only, Secure, SameSite cookies
- **Client-side Processing**: Gmail data processed locally, never transmitted to servers
- **No Server Storage**: We do not store user application data on our servers
- **CORS Policies**: API endpoints restricted to known origins only

### User Controls
- Users can revoke all Google API access at: https://myaccount.google.com/permissions
- Users can delete all local data by clearing browser localStorage
- Users can unlink Google Sheets at any time
- Logout clears all authentication tokens

### Data Retention
- **Authentication tokens**: Stored in HTTP-only cookies, cleared on logout
- **Job application data**: Stored in user's browser localStorage, deleted when user clears browser data
- **Gmail data**: Processed temporarily in browser memory, discarded after session
- **Google Sheets data**: Stored in user's own Google Drive, user controls retention

---

## Third-Party Data Sharing

**We do NOT share user data with any third parties.**

The only third-party services used are:
1. **Google OAuth**: For authentication (user initiates)
2. **Google Sheets API**: For optional user-initiated sync to user's own Drive
3. **Gmail API**: For optional user-initiated email scanning

All data remains under user control. We do not sell, rent, or share data for marketing purposes.

---

## Data Deletion Process

Users can delete their data through:

1. **Clear Browser Data**: Delete localStorage and cookies via browser settings
2. **Uninstall Extension**: Remove Chrome extension to delete extension data
3. **Delete Google Sheets**: Remove synced spreadsheets from Google Drive
4. **Revoke Access**: Visit https://myaccount.google.com/permissions to revoke all permissions
5. **Contact Us**: Email godie.mendoza@gmail.com for assistance

Response time: Within 30 days of request.

---

## OAuth Consent Screen Configuration

### App Information
- **App name**: Just Another Job Application Tracker
- **App domain**: jajat.godieboy.com
- **Privacy Policy**: https://jajat.godieboy.com/privacy.html
- **Terms of Service**: https://jajat.godieboy.com/terms.html
- **Support email**: godie.mendoza@gmail.com
- **Developer contact**: godie.mendoza@gmail.com

### Scopes Summary Table

| Scope | Type | Purpose | User Benefit |
|-------|------|---------|--------------|
| `openid` | OpenID Connect | Authentication | Secure login without password |
| `email` | User Info | User identification | Personalized experience |
| `profile` | User Info | Profile display | Name/photo in UI |
| `spreadsheets` | Google API | Sheets sync | Data backup & analysis |
| `gmail.readonly` | Google API | Email scanning | Auto-discover job applications |

---

## Verification Checklist

Before submitting for verification:

- ✅ Privacy Policy updated with Gmail API data usage details
- ✅ Terms of Service includes Google API compliance section
- ✅ OAuth consent screen configured with all scopes
- ✅ Privacy Policy URL and Terms of Service URL are publicly accessible
- ✅ Support email and developer contact information are current (godie.mendoza@gmail.com)
- ✅ Authorized domains and redirect URIs are configured
- ✅ App logo and branding are uploaded
- ✅ Test users configured (for testing mode)

---

## Additional Notes for Google Review Team

### Why Gmail Read-Only Access is Necessary

The Gmail Scan feature solves a real user problem: job seekers apply to many positions and receive confirmation emails across multiple email threads. Manually tracking each application is time-consuming and error-prone.

Our Gmail Scan feature:
1. **Saves time**: Automatically discovers application-related emails
2. **Reduces errors**: Ensures no application is forgotten
3. **Provides context**: Extracts interview dates, recruiter names, and next steps
4. **User-controlled**: Only scans when explicitly requested
5. **Privacy-focused**: All processing happens client-side

### Limited Use Compliance

We strictly adhere to Google's Limited Use requirements:

- **Minimal data access**: Only read emails matching job application queries
- **No permanent storage**: Email content is not stored persistently
- **No secondary use**: Data used only for the immediate feature
- **User consent**: Explicit opt-in required for Gmail Scan
- **Easy revocation**: Users can revoke access anytime

### Testing Instructions for Google Review Team

To test our Gmail integration:

1. Log in with a test Google account
2. Navigate to Settings → Gmail Scan
3. Click "Scan Gmail" button
4. Review proposed additions/updates
5. Approve or reject each item
6. Verify that only approved items are saved
7. Revoke access at myaccount.google.com/permissions
8. Verify that re-login is required for further scans

---

## Contact Information

For questions about this justification or our use of Google API services:

**Email**: godie.mendoza@gmail.com
**Website**: https://jajat.godieboy.com
**Privacy Policy**: https://jajat.godieboy.com/privacy.html
**Terms of Service**: https://jajat.godieboy.com/terms.html

---

**Last Updated**: July 2026
