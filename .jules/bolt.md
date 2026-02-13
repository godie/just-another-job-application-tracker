# Bolt's Journal ⚡

This journal is for CRITICAL learnings only.

## 2026-02-06 - Loop Fusion and Memoization for Metrics
**Learning:** Fusing multiple array iterations (filter, map, reduce) into a single pass and wrapping them in `useMemo` significantly reduces computational overhead, especially when processing complex data like application timelines for insights.
**Action:** Always look for multiple passes over the same data array and combine them into a single loop when calculating derived metrics.

## 2026-02-13 - Referential Cache for Filtered Data
**Learning:** Even with `useMemo`, mapping over an array to add metadata creates new object references on every change to the source array. This breaks memoization in downstream components (like list items). Implementing a manual cache using `useRef` and a `Map` preserves referential identity for unchanged items.
**Action:** Use a referential cache in hooks that transform large arrays of objects to ensure that unchanged items maintain their identity, allowing `React.memo` to work effectively in the UI layer.
