import { afterEach, describe, expect, it, vi } from "vitest";
import { saveBlob } from "./download";

afterEach(() => { delete window.AprivityDownloads; vi.restoreAllMocks(); });

describe("Android document saving", () => {
  it("encodes JSON and resolves only after native save succeeds", async () => {
    const postMessage = vi.fn();
    window.AprivityDownloads = { postMessage, onmessage: null };
    const pending = saveBlob(new Blob(['{"hello":1}'], { type: "application/json;charset=utf-8" }), "backup.json");
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce());
    const request = JSON.parse(postMessage.mock.calls[0][0]);
    expect(request.mime).toBe("application/json");
    expect(atob(request.base64)).toBe('{"hello":1}');
    window.AprivityDownloads.onmessage?.({ data: JSON.stringify({ id: request.id, ok: true }) });
    await expect(pending).resolves.toBeUndefined();
    expect(window.AprivityDownloads.onmessage).toBeNull();
  });
  it("reports cancellation without claiming a successful export", async () => {
    const postMessage = vi.fn();
    window.AprivityDownloads = { postMessage, onmessage: null };
    const pending = saveBlob(new Blob(["png"], { type: "image/png" }), "plan.png");
    const rejected = expect(pending).rejects.toThrow("已取消保存");
    await vi.waitFor(() => expect(postMessage).toHaveBeenCalledOnce());
    const request = JSON.parse(postMessage.mock.calls[0][0]);
    window.AprivityDownloads.onmessage?.({ data: JSON.stringify({ id: request.id, ok: false, error: "已取消保存" }) });
    await rejected;
  });
  it("rejects unsupported files and concurrent system pickers", async () => {
    window.AprivityDownloads = { postMessage: vi.fn(), onmessage: () => undefined };
    await expect(saveBlob(new Blob(["x"], { type: "text/html" }), "file.html")).rejects.toThrow("不支持");
    await expect(saveBlob(new Blob(["{}"], { type: "application/json" }), "file.json")).rejects.toThrow("当前保存");
  });
});
