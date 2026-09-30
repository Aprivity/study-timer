# Android 安装包构建

Android 工程将 Next.js 的 `out/` 静态导出打入 APK，保留现有界面与本地数据结构。不是运行时加载网站首页：断网仍可打开首页、计时、查看历史和设置；可选 AI 功能需要网络。支持 Android 8.0/API 26 及以上，不依赖 Google Play 服务。设备须具备可用且较新的系统 WebView。

## 获取测试包

合并到 main、向 main 提交代码或创建 PR 都会触发 **Android APK** 工作流。

1. 打开仓库 **Actions → Android APK**，选择成功的运行。
2. 下载页面底部的 **android-debug** artifact 并解压。
3. 将 `aprivity-focus-版本-debug.apk` 传到手机，允许文件管理器安装应用后打开。
4. 同目录的 `.sha256` 可校验 APK 内容。

测试包包名为 `xyz.aprivity.focus.debug`。正式包为 `xyz.aprivity.focus`，二者可以同时安装，但数据彼此独立。CI 测试包使用构建环境生成的 debug 签名，不保证不同运行之间可以覆盖安装；若提示签名冲突，先在旧测试包导出备份，再卸载并安装新包。正式包使用下述固定密钥，支持后续覆盖升级。

## 首次配置正式签名

在自己可信任的电脑生成并保管密钥（不要提交进 Git）：

```bash
keytool -genkeypair -v -keystore focus-release.jks -alias focus \
  -keyalg RSA -keysize 2048 -validity 10000
```

记录并安全备份文件、keystore 密码、alias 和 key 密码。丢失密钥后无法用新密钥覆盖升级已经安装的正式 APK。

打开 GitHub 仓库 **Settings → Secrets and variables → Actions → New repository secret**：

| Secret | 内容 |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | JKS 文件的单行 Base64 |
| `ANDROID_KEYSTORE_PASSWORD` | keystore 密码 |
| `ANDROID_KEY_ALIAS` | 上面的 alias，例如 `focus` |
| `ANDROID_KEY_PASSWORD` | key 密码，常与 keystore 密码相同 |

Linux 编码：

```bash
base64 -w 0 focus-release.jks > focus-release.base64.txt
```

PowerShell 编码：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("focus-release.jks")) | Set-Content -NoNewline focus-release.base64.txt
```

将文本内容填入对应 secret，完成后妥善处理包含密钥的 Base64 文件。工作流不会打印密钥或密码，临时 JKS 在任务结束后删除。

## 发布正式包

只需要正式 APK：在 main 上手动运行 **Android APK**，勾选 `release`；成功后下载 **android-release** artifact。

同时发布网页与 APK：

1. 用 `npm version 1.7.1 --no-git-tag-version` 同步更新 `package.json`、`package-lock.json`，提交到 main。
2. 手动运行现有 **Release** 工作流，填写相同版本号，例如 `1.7.1`。
3. 工作流先构建、测试和签名 Android 包，再完成网页发布检查，最后创建原有 `v1.7.1` Release。
4. Release 同时包含网页静态归档、正式 APK，以及各自 SHA-256 校验文件。

缺少任一签名 secret 会明确失败，既不发布未签名 APK，也不会继续创建新 Release。已存在的 Release 不被覆盖。`workflow_call` 集成避免了使用 GitHub Token 创建 tag 后无法触发另一工作流的问题。

Android 版本取自 `package.json`；构建也检查 lockfile 的版本一致性。使用稳定的 `major.minor.patch`，对应 `versionCode = major × 1,000,000 + minor × 1,000 + patch`，minor/patch 最大 999。升级时递增版本号；同版本重建用于排查，不作为新的正式升级版本。

## 本地构建

需要 Node.js 22+、JDK 17、Android SDK 36 和 Build Tools 36.0.0。Gradle Wrapper 使用固定的 Gradle 8.13 并校验发行包 SHA-256。首次构建需要网络下载依赖和网页字体；字体最终嵌入网页资源。

```bash
npm ci
export ANDROID_HOME=/你的/Android/Sdk
npm run android:check
npm run android:debug
```

Windows PowerShell 设置 `$env:ANDROID_HOME="C:\你的\Android\Sdk"` 后执行相同 npm 命令。Android Studio 可安装 SDK；本地也可在 `android/local.properties` 设置 `sdk.dir`。

测试 APK 输出：`android/app/build/outputs/apk/debug/app-debug.apk`。

正式构建在环境变量中设置 `ANDROID_KEYSTORE_PATH`（绝对路径）、`ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD`，再执行 `npm run android:release`。输出：`android/app/build/outputs/apk/release/app-release.apk`。

打开 Android Studio 前，先运行：

```bash
DEPLOY_TARGET=android NEXT_PUBLIC_AI_API_BASE_URL=/api npm run build
npm run android:prepare
```

之后打开 `android/`。`android:prepare` 清理旧资源，再将 `out/` 复制到生成目录，不能用 GitHub Pages 的 `/study-timer` 前缀版本。`android:debug` 和 `android:release` 会自动完成网页重建与资源准备。

## API 与本地存储

Android 用 `WebViewAssetLoader` 在应用内部的虚拟 `https://focus.aprivity.xyz` 源提供本地页面；只有 `/api/` 走真实 HTTPS 网络，沿用现有同源 API 路径，不需要更改后端 CORS。站点域名写在 `MainActivity.java`，更换正式服务域名时同时修改 `HOST`。APK 构建固定 AI 基础路径为 `/api`，不继承网页部署专用的跨域配置。

所有静态页面、脚本、字体和本地资源只从 APK 读取，缺失资源返回本地 404，不会退回网站首页。外部网页链接使用系统浏览器。应用内 WebView 数据与 Chrome/手机浏览器数据相互独立；使用设置页 JSON 导出/导入迁移历史和设置。卸载或清除应用数据会删除本地记录，自定义背景图片遵循现有备份规则，不包含在 JSON 中。

文件导入使用系统选择器；JSON 导出与计划 PNG 保存通过限制到主页面来源的消息接口调用系统“另存为”，无需申请共享存储权限。仅允许 JSON/PNG，保存上限 20MB；导入沿用网页的 10MB 限制。返回键先退出全屏、再回到上一页，在首页将应用移至后台。页面保持打开时屏幕常亮。

## 验证与当前范围

自动检查包括现有网页测试、TypeScript 生产构建、ESLint、打包脚本测试、Android 路径映射单元测试、Android lint，以及 APK 签名完整性校验。

首次安装请在真机确认：离线启动和页面导航；计时结束与恢复；背景图片选择；备份保存、取消保存和导入；计划图保存；返回键、键盘和屏幕旋转。

这版完成安装包链路与基本原生文件交互。现有浏览器桌面通知不是 Android 原生通知，WebView 不保证后台执行；锁屏、系统省电、强制结束进程时无法承诺准点声音或提醒。后续若需要可靠后台提醒，应增加原生计时、AlarmManager/通知及相应权限，再进行真机验证。iOS 安装包需要独立的 Apple 签名和 macOS 构建流程，本次不包含。
