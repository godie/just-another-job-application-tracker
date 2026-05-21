# Task: Document Management

## Description
Allow users to upload, store, and link documents (Resumes, Cover Letters, Portfolios) to specific job applications. This centralizes all materials used for a particular role.

## Acceptance Criteria
- [ ] File upload support (PDF, DOCX, Images) up to 5MB.
- [ ] Documents can be tagged (e.g., "Resume V1", "Cover Letter - Specialized").
- [ ] Ability to preview documents within the app or download them.
- [ ] Storage strategy: Local (indexedDB/FileSystem API) or Cloud (S3/Server-side storage).
- [ ] Documents are included in the backup/sync process.

## Tests
- **Unit Tests**: Test file validation (size, type) and storage/retrieval logic.
- **UI Tests**: Test the drag-and-drop upload component.
- **E2E Tests**: Upload a resume to an application, refresh, and verify it can be downloaded/viewed.
