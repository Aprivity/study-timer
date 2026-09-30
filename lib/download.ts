interface NativeDownloadBridge {
  postMessage(message: string): void;
  onmessage: ((event: { data: string }) => void) | null;
}

declare global {
  interface Window { AprivityDownloads?: NativeDownloadBridge; }
}

export function isNativeDownloadAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.AprivityDownloads);
}

/** Uses the system save picker in Android and an ordinary download in browsers. */
export async function saveBlob(blob: Blob, fileName: string): Promise<void> {
  const bridge = window.AprivityDownloads;
  if (!bridge) {
    const url = URL.createObjectURL(blob);
    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally { window.setTimeout(() => URL.revokeObjectURL(url), 0); }
    return;
  }
  const mime = blob.type.split(";", 1)[0];
  if (!["application/json", "image/png"].includes(mime)) throw new Error("不支持的文件格式");
  if (blob.size > 20 * 1024 * 1024) throw new Error("文件不能超过 20MB");
  if (bridge.onmessage) throw new Error("请先完成当前保存");
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
    reader.onerror = () => reject(new Error("无法读取待保存文件"));
    reader.readAsDataURL(blob);
  });
  if (bridge.onmessage) throw new Error("请先完成当前保存");
  const id = crypto.randomUUID();
  await new Promise<void>((resolve, reject) => {
    bridge.onmessage = (event) => {
      try {
        const result = JSON.parse(event.data) as { id: string; ok: boolean; error?: string };
        if (result.id !== id) return;
        bridge.onmessage = null;
        if (result.ok) resolve();
        else reject(new Error(result.error || "文件保存失败"));
      } catch { bridge.onmessage = null; reject(new Error("无法确认保存结果")); }
    };
    try { bridge.postMessage(JSON.stringify({ id, name: fileName, mime, base64 })); }
    catch { bridge.onmessage = null; reject(new Error("无法打开保存窗口")); }
  });
}
