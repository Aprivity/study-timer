"use client";

import { useCallback, useEffect, useState } from "react";
import { getNotificationPermission, isNotificationSupported, requestNotificationPermission, type BrowserNotificationPermission } from "@/lib/notifications";

export function useBrowserNotifications(enabled: boolean, onEnabledChange: (enabled: boolean) => void) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<BrowserNotificationPermission>("default");
  const [requesting, setRequesting] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setSupported(isNotificationSupported());
      setPermission(getNotificationPermission());
    });
    return () => { active = false; };
  }, []);

  const toggle = useCallback(async () => {
    if (requesting) return;
    setRequestFailed(false);
    if (enabled) {
      onEnabledChange(false);
      return;
    }
    if (!supported || permission === "denied") {
      onEnabledChange(false);
      return;
    }
    if (permission === "granted") {
      onEnabledChange(true);
      return;
    }

    setRequesting(true);
    try {
      const result = await requestNotificationPermission();
      setPermission(result);
      onEnabledChange(result === "granted");
      if (result === "default") setRequestFailed(true);
    } catch {
      onEnabledChange(false);
      setRequestFailed(true);
    } finally {
      setRequesting(false);
    }
  }, [enabled, onEnabledChange, permission, requesting, supported]);

  return {
    supported,
    permission,
    requesting,
    requestFailed,
    checked: enabled && supported && permission === "granted",
    toggle,
  };
}
