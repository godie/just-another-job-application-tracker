# JAJAT Roadmap & Ideas

## Completed 🚀
- **Core Tracking:** Basic application and opportunity management.
- **Multiple Views:** Table, Kanban, Timeline, Calendar.
- **Chrome Extension:** One-click job capture.
- **Insights:** Funnel and performance analytics.
- **Google Sheets Sync:** Basic synchronization.
- **PWA:** Basic offline support.
- **Authentication:** Email/Password and Google OAuth linking.
- **Cloud Sync:** Optional MySQL-backed data persistence.
- **Accessibility:** WCAG 2.2 AA compliance across all main pages.

## Short-term 🛠️
- [ ] **Advanced Data Migration:** Better handling of conflicts between local and cloud data.
- [ ] **Email Notifications:** Get notified of follow-ups or upcoming interviews via email.
- [ ] **Interview Preparation AI:** Integration with LLMs to generate prep questions based on the job description.
- [ ] **Document Management:** Upload and link resumes/cover letters to specific applications.

## Mid-term 📈
- [ ] **Multi-user Organizations:** Support for mentors or career coaches to view and help with candidate pipelines.
- [ ] **Company Research Integration:** Automatically pull company news, glassdoor ratings, and tech stack info.
- [ ] **Public Profiles:** Option to share a curated version of your job search progress (e.g., for "Building in Public").
- [ ] **Extension Expansion:** Support more job boards (Indeed, Glassdoor, local boards).

## Long-term 🌟
- [ ] **Mobile App:** Native iOS/Android apps for better push notifications and mobile experience.
- [ ] **ATS Optimization:** Tools to help scan and optimize resumes for specific job descriptions.
- [ ] **Salary Benchmarking:** Aggregated, anonymized data to show market trends for roles.

## Deferred refactors 🔧

Maintenance triggers + candidate splits already documented; not active work, but the **trigger condition** is the open PR-checklist that flips them into the active backlog. New trackers follow the `DOCS/FOLLOWUP_*.md` convention; **add a bullet here whenever you create one** (recommended) so they appear in the master index. Once the refactor lands, retire the bullet (move it under **Completed** or delete it).

- [DOCS/FOLLOWUP_SETTINGS_PAGE_REFACTOR.md](./FOLLOWUP_SETTINGS_PAGE_REFACTOR.md) — SettingsPage deferred refactor. Trigger: SettingsPage > ~700 LOC OR `npx react-doctor` flags `no-giant-component`. Two candidates in yield-vs-blast-radius order (co-locate per-section JSX first; `useSettingsMatching()` sub-hook second). Anchored at commit `23ff536` (SettingsPage.tsx 578 LOC at working tree).
