import { useCallback, useRef } from "react";
import { notify } from "@/lib/notify";

/**
 * Optimistic update utilities for CRUD operations.
 * Applies changes to UI immediately, rolls back on API failure.
 */
export function useOptimistic<T>(
  items: T[],
  setItems: (items: T[]) => void,
  keyFn: (item: T) => string | number
) {
  const snapshotRef = useRef<T[]>([]);

  const rollback = useCallback((msg?: string) => {
    setItems(snapshotRef.current);
    notify(msg || "Operasi gagal, perubahan dibatalkan", "error");
  }, [setItems]);

  const optimisticDelete = useCallback(
    async (item: T, apiFn: () => Promise<any>) => {
      snapshotRef.current = items;
      setItems(items.filter(i => keyFn(i) !== keyFn(item)));
      try {
        await apiFn();
      } catch (err: any) {
        rollback(err?.message);
      }
    },
    [items, setItems, keyFn, rollback]
  );

  const optimisticAdd = useCallback(
    async (item: T, apiFn: () => Promise<any>) => {
      snapshotRef.current = items;
      setItems([item, ...items]);
      try {
        await apiFn();
      } catch (err: any) {
        rollback(err?.message);
      }
    },
    [items, setItems, rollback]
  );

  const optimisticUpdate = useCallback(
    async (item: T, apiFn: () => Promise<any>) => {
      snapshotRef.current = items;
      setItems(items.map(i => keyFn(i) === keyFn(item) ? item : i));
      try {
        await apiFn();
      } catch (err: any) {
        rollback(err?.message);
      }
    },
    [items, setItems, keyFn, rollback]
  );

  return { optimisticAdd, optimisticUpdate, optimisticDelete };
}
