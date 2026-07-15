"use client";

import { useCallback, useEffect, useState } from "react";
import { readStorage, writeStorage } from "@/lib/storage";

export function useLocalStorage<T>(key: string, parser: (raw: string | null) => T) {
  const [value, setValue] = useState<T>(() => parser(null));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setValue(readStorage(key, parser));
      setHydrated(true);
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) setValue(parser(event.newValue));
    };
    window.addEventListener("storage", onStorage);
    return () => { active = false; window.removeEventListener("storage", onStorage); };
  }, [key, parser]);

  const update = useCallback((next: T | ((current: T) => T)) => {
    setValue((current) => {
      const result = typeof next === "function" ? (next as (value: T) => T)(current) : next;
      writeStorage(key, result);
      return result;
    });
  }, [key]);

  return [value, update, hydrated] as const;
}
