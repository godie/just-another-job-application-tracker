# Code Audit Report

**Generated:** 2026-04-08T19:17:37.451Z
**Branch:** jules-522951310453559166-518a0c30

## Summary

| Metric | Count |
|--------|-------|
| Total Issues | 0 |
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |
| Warnings | 0 |
| Files Analyzed | 164 |

## All Issues by Category

## Files Analyzed

- ./audit/audit.cjs
- ./eslint.config.js
- ./playwright.config.ts
- ./src/App.tsx
- ./src/components/ATSSearch.tsx
- ./src/components/AddJobComponent.tsx
- ./src/components/Alert.tsx
- ./src/components/AlertProvider.tsx
- ./src/components/ApplicationCard.test.tsx
- ./src/components/ApplicationCard.tsx
- ./src/components/ApplicationTable.store.integration.test.tsx
- ./src/components/ApplicationTable.test.tsx
- ./src/components/ApplicationTable.tsx
- ./src/components/ApplicationTableRow.test.tsx
- ./src/components/ApplicationTableRow.tsx
- ./src/components/ApplicationTimelineCard.tsx
- ./src/components/BottomNav.tsx
- ./src/components/CSVActions.tsx
- ./src/components/CalendarView.tsx
- ./src/components/ConfirmDialog.tsx
- ./src/components/CurrentViewRenderer.tsx
- ./src/components/DonationSection.tsx
- ./src/components/EmailScanReview.tsx
- ./src/components/FiltersBar.tsx
- ./src/components/Footer.tsx
- ./src/components/GoogleSheetsSync.tsx
- ./src/components/Header.tsx
- ./src/components/InterviewBarChart.tsx
- ./src/components/KanbanView.tsx
- ./src/components/MetricsSummary.tsx
- ./src/components/OpportunitiesEmptyState.tsx
- ./src/components/OpportunitiesTable.tsx
- ./src/components/OpportunityForm.tsx
- ./src/components/PWAReloadPrompt.tsx
- ./src/components/ProposedAdditionItem.tsx
- ./src/components/ProposedUpdateItem.tsx
- ./src/components/Sidebar.test.tsx
- ./src/components/Sidebar.tsx
- ./src/components/StatCard.test.tsx
- ./src/components/StatCard.tsx
- ./src/components/StatusBarChart.tsx
- ./src/components/SuggestionForm.tsx
- ./src/components/SyncActions.tsx
- ./src/components/SyncStatusInfo.tsx
- ./src/components/TimelineEditor.tsx
- ./src/components/TimelineEventList.tsx
- ./src/components/TimelineView.tsx
- ./src/components/ViewSwitcher.tsx
- ./src/components/settings/ATSSearchSettings.tsx
- ./src/components/settings/CustomFieldsSettings.tsx
- ./src/components/settings/DateFormatSettings.tsx
- ./src/components/settings/EmailScanSettings.tsx
- ./src/components/settings/FieldsSettings.tsx
- ./src/components/settings/InterviewingSettings.tsx
- ./src/components/settings/ViewSettings.tsx
- ./src/components/ui/Badge.test.tsx
- ./src/components/ui/Badge.tsx
- ./src/components/ui/Button.test.tsx
- ./src/components/ui/Button.tsx
- ./src/components/ui/Card.test.tsx
- ./src/components/ui/Card.tsx
- ./src/components/ui/Input.test.tsx
- ./src/components/ui/Input.tsx
- ./src/components/ui/Select.test.tsx
- ./src/components/ui/Select.tsx
- ./src/components/ui/Separator.test.tsx
- ./src/components/ui/Separator.tsx
- ./src/components/ui/Table.test.tsx
- ./src/components/ui/Table.tsx
- ./src/components/ui/TagInput.tsx
- ./src/components/ui/index.ts
- ./src/hooks/useCloudSync.ts
- ./src/hooks/useFilteredApplications.test.ts
- ./src/hooks/useFilteredApplications.ts
- ./src/hooks/useFormatDate.ts
- ./src/hooks/useInsightsData.ts
- ./src/hooks/useIsLoggedIn.ts
- ./src/hooks/useKeyboardEscape.ts
- ./src/hooks/useKeyboardKey.ts
- ./src/hooks/useSelection.ts
- ./src/hooks/useTableColumns.test.ts
- ./src/hooks/useTableColumns.ts
- ./src/i18n.ts
- ./src/layouts/MainLayout.test.tsx
- ./src/layouts/MainLayout.tsx
- ./src/mails/adapter/emailAdapter.test.ts
- ./src/mails/adapter/emailAdapter.ts
- ./src/mails/errors.ts
- ./src/mails/hooks/useEmailScan.test.ts
- ./src/mails/hooks/useEmailScan.ts
- ./src/mails/providers/emailProvider.ts
- ./src/mails/providers/fake/fakeData.ts
- ./src/mails/providers/fake/fakeProvider.test.ts
- ./src/mails/providers/fake/fakeProvider.ts
- ./src/mails/providers/gmail/gmailClient.ts
- ./src/mails/services/scanService.test.ts
- ./src/mails/services/scanService.ts
- ./src/mails/types.ts
- ./src/main.tsx
- ./src/pages/GmailScanPage.tsx
- ./src/pages/HomePage.tsx
- ./src/pages/InsightsPage.test.tsx
- ./src/pages/InsightsPage.tsx
- ./src/pages/LandingPage.tsx
- ./src/pages/LoginPage.tsx
- ./src/pages/OpportunitiesPage.tsx
- ./src/pages/RegisterPage.tsx
- ./src/pages/SettingsPage.tsx
- ./src/pages/SuggestionsViewerPage.tsx
- ./src/pages/SupportPage.tsx
- ./src/pwa.d.ts
- ./src/services/api.test.ts
- ./src/services/api.ts
- ./src/setupTests.ts
- ./src/storage/applications.test.ts
- ./src/storage/applications.ts
- ./src/storage/auth.ts
- ./src/storage/index.ts
- ./src/storage/opportunities.ts
- ./src/storage/preferences.ts
- ./src/stores/applicationsStore.ts
- ./src/stores/authStore.ts
- ./src/stores/opportunitiesStore.ts
- ./src/stores/preferencesStore.ts
- ./src/tests/Alert.test.tsx
- ./src/tests/AlertProvider.test.tsx
- ./src/tests/App.test.tsx
- ./src/tests/CalendarView.test.tsx
- ./src/tests/DarkModeIntegration.test.tsx
- ./src/tests/EmailScanReview.test.tsx
- ./src/tests/FiltersBar.test.tsx
- ./src/tests/GoogleSheetsSync.test.tsx
- ./src/tests/Header.test.tsx
- ./src/tests/HomePage.test.tsx
- ./src/tests/KanbanView.test.tsx
- ./src/tests/OpportunitiesPage.test.tsx
- ./src/tests/OpportunityForm.test.tsx
- ./src/tests/SettingsPage.test.tsx
- ./src/tests/SuggestionsViewerPage.test.tsx
- ./src/tests/SupportPage.test.tsx
- ./src/tests/Theme.test.tsx
- ./src/tests/TimelineEditor.test.tsx
- ./src/tests/date.test.ts
- ./src/tests/google-oauth-mock.ts
- ./src/tests/googleSheets.test.ts
- ./src/types/applications.ts
- ./src/types/index.ts
- ./src/types/opportunities.ts
- ./src/types/preferences.ts
- ./src/types/table.ts
- ./src/utils/api.ts
- ./src/utils/applications.ts
- ./src/utils/constants.ts
- ./src/utils/csv.test.ts
- ./src/utils/csv.ts
- ./src/utils/date.ts
- ./src/utils/googleSheets.ts
- ./src/utils/id.ts
- ./src/utils/localStorage.ts
- ./src/utils/manualScan.ts
- ./src/utils/status.ts
- ./src/utils/url.ts
- ./tailwind.config.js
- ./vite.config.ts

## Recommendations

1. **Fix Critical Issues First**: Address all `@typescript-eslint/no-explicit-any` and `@typescript-eslint/no-unused-vars` issues
2. **Type Safety**: Replace `any` types with proper TypeScript types
3. **Code Cleanup**: Remove unused variables and imports
4. **Dependency Arrays**: Fix React hooks with missing dependencies in useCallback/useEffect
5. **Consistency**: Use `const` instead of `let` for variables that are never reassigned
