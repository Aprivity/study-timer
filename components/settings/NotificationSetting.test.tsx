import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationSetting } from "./NotificationSetting";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { parseSettings, STORAGE_KEYS } from "@/lib/storage";

const originalNotification = Object.getOwnPropertyDescriptor(window, "Notification");

function installPermission(permission: NotificationPermission, result: NotificationPermission = permission) {
  const requestPermission = vi.fn().mockResolvedValue(result);
  class FakeNotification {
    static permission = permission;
    static requestPermission = requestPermission;
  }
  Object.defineProperty(window, "Notification", { configurable: true, value: FakeNotification });
  return requestPermission;
}

beforeEach(() => window.localStorage.clear());

afterEach(() => {
  if (originalNotification) Object.defineProperty(window, "Notification", originalNotification);
  else Reflect.deleteProperty(window, "Notification");
  vi.restoreAllMocks();
});

describe("NotificationSetting", () => {
  it("does not request permission on first render", async () => {
    const request = installPermission("default", "granted");
    render(<NotificationSetting enabled={false} onChange={vi.fn()} />);
    expect(await screen.findByText("未授权")).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();
  });

  it("requests on an explicit enable and stores the granted choice through onChange", async () => {
    const request = installPermission("default", "granted");
    const onChange = vi.fn();
    render(<NotificationSetting enabled={false} onChange={onChange} />);
    const toggle = await screen.findByRole("switch", { name: "桌面通知" });
    fireEvent.click(toggle);
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("persists the granted setting without changing the sound preference", async () => {
    installPermission("default", "granted");
    window.localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify({ soundEnabled: false }));
    function Harness() {
      const [settings, setSettings, hydrated] = useLocalStorage(STORAGE_KEYS.settings, parseSettings);
      return hydrated ? <NotificationSetting enabled={settings.notificationsEnabled} onChange={(enabled) => setSettings({ ...settings, notificationsEnabled: enabled })} /> : null;
    }
    render(<Harness />);
    fireEvent.click(await screen.findByRole("switch", { name: "桌面通知" }));
    await waitFor(() => {
      const saved = parseSettings(window.localStorage.getItem(STORAGE_KEYS.settings));
      expect(saved.notificationsEnabled).toBe(true);
      expect(saved.soundEnabled).toBe(false);
    });
  });

  it("never re-requests denied permission and keeps the switch off", async () => {
    const request = installPermission("denied");
    render(<NotificationSetting enabled={false} onChange={vi.fn()} />);
    const toggle = await screen.findByRole("switch", { name: "桌面通知" });
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("alert")).toHaveTextContent("通知权限已被浏览器阻止");
    expect(request).not.toHaveBeenCalled();
  });

  it("disables the switch when Notification API is unavailable", async () => {
    Reflect.deleteProperty(window, "Notification");
    render(<NotificationSetting enabled={false} onChange={vi.fn()} />);
    expect(await screen.findByRole("switch", { name: "桌面通知" })).toBeDisabled();
    expect(screen.getByText("当前浏览器不支持桌面通知。")).toBeInTheDocument();
  });

  it("turns off without trying to revoke browser permission", async () => {
    const request = installPermission("granted");
    const onChange = vi.fn();
    render(<NotificationSetting enabled onChange={onChange} />);
    const toggle = await screen.findByRole("switch", { name: "桌面通知" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    fireEvent.click(toggle);
    expect(onChange).toHaveBeenCalledWith(false);
    expect(request).not.toHaveBeenCalled();
  });
});
