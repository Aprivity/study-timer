import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { androidVersion, prepareAndroid } from "./android-build.mjs";

test("Android upgrades keep monotonically increasing version codes", () => {
  assert.equal(androidVersion("1.7.0").code, 1007000);
  assert.ok(androidVersion("2.0.0").code > androidVersion("1.999.999").code);
  for (const value of ["v1.7.0", "1.7.0-beta", "1.1000.0", "2100.0.0", "01.0.0", "0.0.0"]) {
    assert.throws(() => androidVersion(value));
  }
});

test("Packaging copies exported routes and removes stale assets; rejects Pages and version mismatch", async () => {
  const root = await mkdtemp(join(tmpdir(), "focus-android-"));
  try {
    await writeFile(join(root, "package.json"), JSON.stringify({ version: "1.7.0" }));
    const lock = { version: "1.7.0", packages: { "": { version: "1.7.0" } } };
    await writeFile(join(root, "package-lock.json"), JSON.stringify(lock));
    await mkdir(join(root, "out/_next"), { recursive: true });
    await mkdir(join(root, "out/history"));
    await writeFile(join(root, "out/index.html"), '<script src="/_next/app.js"></script>');
    await writeFile(join(root, "out/history/index.html"), "history");
    await prepareAndroid(root);
    await writeFile(join(root, "android/build/web-assets/stale.html"), "old");
    await prepareAndroid(root);
    assert.equal(await readFile(join(root, "android/build/web-assets/history/index.html"), "utf8"), "history");
    await assert.rejects(readFile(join(root, "android/build/web-assets/stale.html")));
    assert.equal(JSON.parse(await readFile(join(root, "android/build/app-version.json"))).code, 1007000);
    await writeFile(join(root, "out/index.html"), '<script src="/study-timer/_next/app.js"></script>');
    await assert.rejects(prepareAndroid(root), /GitHub Pages/);
    lock.version = "1.6.0";
    await writeFile(join(root, "package-lock.json"), JSON.stringify(lock));
    await assert.rejects(prepareAndroid(root), /versions must match/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
