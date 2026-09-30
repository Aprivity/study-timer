import { cp, mkdir, readFile, rm, writeFile, stat } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

export function androidVersion(version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version);
  if (!match) throw new Error("Android requires a stable package version: major.minor.patch");
  const [major, minor, patch] = match.slice(1).map(Number);
  const code = major * 1_000_000 + minor * 1_000 + patch;
  if (major > 2099 || minor > 999 || patch > 999 || code < 1) {
    throw new Error("Android version exceeds the supported versionCode range");
  }
  return { name: version, code };
}

export async function prepareAndroid(root) {
  const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  const lock = JSON.parse(await readFile(resolve(root, "package-lock.json"), "utf8"));
  if (pkg.version !== lock.version || pkg.version !== lock.packages[""].version) {
    throw new Error("package.json and package-lock.json versions must match");
  }
  const version = androidVersion(pkg.version);
  const html = await readFile(resolve(root, "out/index.html"), "utf8");
  if (html.includes('"/study-timer/') || html.includes('"/study-timer\\/')) {
    throw new Error("Use DEPLOY_TARGET=android; GitHub Pages paths cannot be packaged");
  }
  if (!(await stat(resolve(root, "out/_next"))).isDirectory()) throw new Error("Missing Next.js assets");
  const buildDir = resolve(root, "android/build");
  const destination = resolve(buildDir, "web-assets");
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await cp(resolve(root, "out"), destination, { recursive: true });
  await writeFile(resolve(buildDir, "app-version.json"), JSON.stringify(version));
  return version;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] || "debug";
  if (!["debug", "release", "prepare"].includes(mode)) throw new Error("Expected debug, release or prepare");
  if (mode !== "prepare") {
    const web = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
      cwd: root, stdio: "inherit", shell: process.platform === "win32",
      env: { ...process.env, DEPLOY_TARGET: "android", NEXT_PUBLIC_AI_API_BASE_URL: "/api" },
    });
    if (web.error) throw web.error;
    if (web.status !== 0) process.exit(web.status ?? 1);
  }
  const version = await prepareAndroid(root);
  console.log(`Prepared Android ${version.name} (${version.code})`);
  if (mode !== "prepare") {
    const native = spawnSync(resolve(root, "android", process.platform === "win32" ? "gradlew.bat" : "gradlew"), [
      "--no-daemon", "-p", "android", mode === "release" ? "assembleRelease" : "assembleDebug",
    ], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
    if (native.error) throw new Error("Check JDK 17 and Android SDK, then retry", { cause: native.error });
    process.exit(native.status ?? 1);
  }
}
