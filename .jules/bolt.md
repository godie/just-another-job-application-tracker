# Bolt's Journal ⚡

This journal is for CRITICAL learnings only.

## 2026-02-06 - Loop Fusion and Memoization for Metrics
**Learning:** Fusing multiple array iterations (filter, map, reduce) into a single pass and wrapping them in `useMemo` significantly reduces computational overhead, especially when processing complex data like application timelines for insights.
**Action:** Always look for multiple passes over the same data array and combine them into a single loop when calculating derived metrics.

## 2026-02-13 - Referential Cache for Filtered Data
**Learning:** Even with `useMemo`, mapping over an array to add metadata creates new object references on every change to the source array. This breaks memoization in downstream components (like list items). Implementing a manual cache using `useRef` and a `Map` preserves referential identity for unchanged items.
**Action:** Use a referential cache in hooks that transform large arrays of objects to ensure that unchanged items maintain their identity, allowing `React.memo` to work effectively in the UI layer.

## 2026-02-14 - CSS-based Hover for List Actions
**Learning:** Using React state to track hover (e.g., `hoveredRowId`) triggers re-renders of the entire list and all its items on every mouse movement. This is a major performance bottleneck for large tables.
**Action:** Implement hover-only actions (like Delete buttons) using CSS (`group-hover` in Tailwind) and ensure accessibility with `focus-within`. This eliminates re-renders during interaction.

## 2026-02-14 - Reactive Cache and i18n
**Learning:** When using a referential cache (`useRef` + `Map`) to store translated strings, the cache must be invalidated when the language changes. Otherwise, the UI will stay in the previous language until the cache is naturally cleared.
**Action:** Track the current language (e.g., via `i18n.language` from `useTranslation`) and clear the cache when it changes.
