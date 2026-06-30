# react-doctor-suppression-sync

**Risk:** Adding or removing a `react-doctor-disable-next-line`
silently drifts the inventory table in `DOCS/REACT_DOCTOR_AUDIT.md`
(commit `23ff536`). The next contributor then re-derives the WHY
from the file comment instead of inheriting it.

**Dormant:** This filename does NOT match any of the 11 rule slugs
habit-hooks ships, so the prompt is NOT auto-loaded today. It is
forward-documented for a future rule named
`react-doctor-suppression-sync`; until then, **only reviewers (and
any pre-commit / `git grep` automation that gets wired later)**
enforce the cross-doc refresh. Do not assume the gate is currently
closed — it is not.

**Solution:** When you add, edit, or remove a
`react-doctor-disable-next-line` anywhere in `src/`, **also amend
the inventory table in `DOCS/REACT_DOCTOR_AUDIT.md` in the same
commit** — update the file / line / rule / literal `-- <WHY>` row.
For JSX `{/* … */}` directives (cannot end with `--`), follow the
FiltersBar.tsx pattern and use the **extracted helper function
name** as the rationale. Re-anchor the inventory's commit stamp
whenever `git show <anchor>:<path>` differs from the working tree
at any inventory row's line number — concrete drift signal, not a
vague "many commits" rule.

**Expected outcome:** `DOCS/HABIT_HOOKS_AUDIT.md` and
`DOCS/REACT_DOCTOR_AUDIT.md` reflect the live suppression state at
the same commit hash; future contributors inherit the WHY.

**See also:** `habit-hooks-prompts/non-essential-comment.md` —
the comment-side half of the same coupling.
