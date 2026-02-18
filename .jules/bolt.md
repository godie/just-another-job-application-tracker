# Bolt's Journal ⚡

This journal is for CRITICAL learnings only.

## 2026-02-06 - Loop Fusion and Memoization for Metrics
**Learning:** Fusing multiple array iterations (filter, map, reduce) into a single pass and wrapping them in `useMemo` significantly reduces computational overhead, especially when processing complex data like application timelines for insights.
**Action:** Always look for multiple passes over the same data array and combine them into a single loop when calculating derived metrics.

## 2026-02-13 - Referential Cache for Filtered Data
**Learning:** Even with `useMemo`, mapping over an array to add metadata creates new object references on every change to the source array. This breaks memoization in downstream components (like list items). Implementing a manual cache using `useRef` and a `Map` preserves referential identity for unchanged items.
**Action:** Use a referential cache in hooks that transform large arrays of objects to ensure that unchanged items maintain their identity, allowing `React.memo` to work effectively in the UI layer.

## 2026-02-15 - CSS-based Hover for Table Performance
**Learning:** Using React state to track row hover in a large table triggers re-renders of the entire table component on every mouse movement. This is a common bottleneck that can be easily solved by using CSS `group-hover` logic.
**Action:** Replace React-managed hover states for UI-only effects (like showing action buttons) with Tailwind's `group` and `group-hover` classes to eliminate unnecessary render cycles.

## 2026-02-16 - Referential Stability for Derived Arrays
**Learning:** Derived arrays calculated inside `useMemo` (like unique statuses or platforms) create new references on every dependency change, even if the content is identical. This triggers unnecessary re-renders in memoized child components.
**Action:** Use `useRef` to store and stabilize references for derived arrays by performing a content check (e.g., `join('|')`) before updating the ref and returning it from the hook. This ensures that downstream `React.memo` components truly skip re-renders.

## 2026-02-18 - Efficient Storage Migration
**Learning:** Using `setTimeout` to persist migrated data in a storage getter creates a redundant and potentially explosive chain of operations. Moving migration persistence to a single-pass check during the initial load in the store is much more efficient.
**Action:** Always separate data retrieval/transformation from persistence. Ensure migration happens in-memory during retrieval but is persisted once by the application's lifecycle manager (like a Zustand store).
