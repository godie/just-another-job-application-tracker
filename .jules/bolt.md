# Bolt's Journal ⚡

This journal is for CRITICAL learnings only.

## 2026-02-06 - Loop Fusion and Memoization for Metrics
**Learning:** Fusing multiple array iterations (filter, map, reduce) into a single pass and wrapping them in `useMemo` significantly reduces computational overhead, especially when processing complex data like application timelines for insights.
**Action:** Always look for multiple passes over the same data array and combine them into a single loop when calculating derived metrics.

## 2026-02-12 - Referential Caching for List Performance
**Learning:** Even with `useMemo`, creating new objects inside a `map` loop triggers re-renders of all memoized child components because the object references change every time the parent re-renders (if the input array changed). Using a `useRef` to cache objects by their original (immutable) reference preserves identity and skips downstream re-renders.
**Action:** Implement referential caching in hooks that transform large arrays into objects with metadata.
