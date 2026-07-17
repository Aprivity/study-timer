"use client";

import { Bell } from "lucide-react";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

export function NotificationSetting({ enabled, onChange }: { enabled: boolean; onChange: (enabled: boolean) => void }) {
  const notification = useBrowserNotifications(enabled, onChange);
  const status = !notification.supported ? "不支持" : notification.permission === "denied" ? "已阻止" : notification.permission === "granted" ? "已授权" : "未授权";
  const description = !notification.supported
    ? "当前浏览器不支持桌面通知。"
    : notification.permission === "denied"
      ? "通知权限已被浏览器阻止，请在浏览器的网站权限设置中手动允许。"
      : notification.permission === "granted"
        ? notification.checked ? "桌面通知已启用。" : "浏览器已授权，开启后会在页面处于后台时发送通知。"
        : "开启后，浏览器会询问是否允许发送通知。";

  return <div className="setting-row notification-setting">
    <span className="setting-icon" aria-hidden="true"><Bell /></span>
    <div>
      <div className="setting-title-line"><h2>桌面通知</h2><span className={`permission-badge permission-${notification.permission}`} aria-label={`通知权限状态：${status}`}>{status}</span></div>
      <p>在页面处于后台时，专注或休息结束后发送浏览器通知。</p>
      <p className="notification-permission-status" role={notification.permission === "denied" || notification.requestFailed ? "alert" : "status"} aria-live="polite">
        {notification.requesting ? "正在请求通知权限…" : notification.requestFailed ? "权限请求未完成，桌面通知仍保持关闭。" : description}
      </p>
    </div>
    <button
      type="button"
      role="switch"
      aria-label="桌面通知"
      aria-checked={notification.checked}
      aria-busy={notification.requesting}
      className={`switch ${notification.checked ? "on" : ""}`}
      disabled={!notification.supported || notification.requesting || notification.permission === "denied"}
      onClick={() => void notification.toggle()}
    ><span /></button>
  </div>;
}
