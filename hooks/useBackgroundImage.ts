"use client";

import { useEffect, useState } from "react";
import { getBackgroundImage } from "@/lib/indexed-db";

export function useBackgroundImage(storageKey: string | null, onFailure: () => void) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!storageKey) return;
    let active = true;
    let objectUrl: string | null = null;
    void getBackgroundImage().then((blob) => {
      if (!active) return;
      if (!blob) { onFailure(); return; }
      objectUrl = URL.createObjectURL(blob);
      setImageUrl(objectUrl);
    }).catch(() => { if (active) onFailure(); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [onFailure, storageKey]);

  return storageKey ? imageUrl : null;
}
