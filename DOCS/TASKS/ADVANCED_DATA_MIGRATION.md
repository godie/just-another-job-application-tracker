# Task: Advanced Data Migration

## Description
Improve the handling of conflicts between local (localStorage) and cloud (MySQL/PostgreSQL) data. Currently, the sync might overwrite changes if not careful. The system needs a robust way to merge data, detect collisions, and allow user-driven resolution when automatic merging is not possible.

## Acceptance Criteria
- [ ] Implement a versioning or last-modified timestamp system for application records.
- [ ] Create a "Conflict Resolution" UI that appears when local and remote data differ significantly.
- [ ] Support "Keep Local", "Keep Remote", or "Merge" options.
- [ ] Ensure that background sync doesn't cause data loss.
- [ ] Offline changes are queued and synced correctly when connection is restored.

## Tests
- **Unit Tests**: Test the merge logic with various conflict scenarios (e.g., both sides modified different fields, both sides modified the same field).
- **Integration Tests**: Simulate network failure during sync and verify data consistency.
- **E2E Tests**: Trigger a conflict manually and verify the resolution UI appears and works as expected.
