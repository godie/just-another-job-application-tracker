# non-essential-comment

**Risk:** The rule's banner-comment heuristic is non-deterministic — it
flagged a `// --- Sub-components ---` divider in `LandingPage.tsx`
(commit 9bdc2ac) but missed the identical banners in
`JobPreviewPanel.tsx` and `EmailScanReview.tsx`; we had to delete the
last two proactively (commit 536385f). It also strips the trailing
`-- <WHY>` rationale from `eslint-disable` and
`react-doctor-disable-next-line` directives, which is the only line
explaining why a lint opt-out is intentional.

**Solution:** When one banner-style `// --- ... ---` divider is
flagged anywhere, scan the whole `src/` tree for the same pattern
and remove every match in the same commit — they're cosmetically
redundant and the heuristic misses them inconsistently. For any
directive line containing `eslint-disable`, `react-doctor-disable`,
or `ts-ignore`, ALWAYS keep anything that starts with `--` on the
same line — that's the WHY, not a non-essential comment.

**Expected outcome:** A single commit normalises every banner of the
same shape class-wide; suppression directives keep their rationale
so future reviewers see the justification for every lint opt-out.
