# Aprivity Focus

Aprivity Focus 是一个面向学生和个人学习场景的沉浸式倒计时网页。它采用安静克制的 Forest Sage 视觉语言，围绕“填写任务 → 选择时长 → 专注 → 保存记录 → 查看统计”的单一流程设计。

> 核心计时、历史、统计和设置完全运行在浏览器中，不需要账号或数据库。AI 自然语言设置、AI 计划图和 AI 历史专注分析是可选能力，依赖独立 AI Backend。

## 在线访问

GitHub Pages 地址：[https://aprivity.github.io/study-timer/](https://aprivity.github.io/study-timer/)

自有域名示例：[https://focus.aprivity.xyz](https://focus.aprivity.xyz)

部署工作流合并到 `main` 并首次成功运行后，该地址开始提供服务。

## 功能

- 基于结束时间戳计算的准确倒计时，降低后台标签页限频造成的误差
- 开始、暂停、继续、提前结束与完成闭环
- 自由专注与番茄循环双模式，支持专注、短休息和长休息自动流转
- 番茄阶段时长、长休息前轮数及自动开始规则可配置
- 当前轮次、下一阶段和轮次进度提示，休息可随时跳过
- 刷新后恢复运行中、暂停中和已完成的计时器
- 原生 SVG 圆环进度，末尾 10% 进入陶土色提醒状态
- 原生 CSS 3D 翻页时钟，支持 `MM:SS` 和 `HH:MM:SS`
- 25、45、60、80 分钟预设与 1–720 分钟自定义时长
- 首页统一 AI 自然语言输入，自动识别自由专注或番茄循环并填写现有设置
- “更多”扩展能力入口，以及 AI 计划图与两个 7 天周期的轻量专注趋势分析
- 任务名称和数学、英语、项目、阅读、其他分类
- localStorage 学习记录，完成记录 UUID 防重复写入
- 今日专注时长、完成次数和连续专注天数统计
- 过去 365 天专注热力图、历史概览、共享分类筛选和单日详情
- 按日期分组的历史列表，以及二次确认后的单条删除和清空全部
- 默认时长、提示音、提前结束确认、自动全屏和减少动画设置
- 可选浏览器桌面通知，在后台标签页中提醒专注完成和休息结束
- 六种内置学习背景，覆盖深色夜间、浅色纸张和清晨雾感等场景
- 自定义纯色、双色渐变与仅存于本地的图片背景
- 背景亮度、遮罩、模糊、图片缩放、显示方式和位置调节
- 带预览、合并、覆盖、恢复点和撤销能力的版本化 JSON 本地备份
- 深浅色界面自动适配，背景设置刷新和页面导航后保持
- 动态网页标题与手动全屏专注模式
- 响应式桌面/移动布局、键盘焦点样式和减少动画模式

## 技术栈

- Next.js 16 App Router
- React 19、TypeScript 严格模式
- Tailwind CSS 3、原生 CSS
- Lucide React
- 原生 SVG 与 CSS 3D Transform / Keyframes
- Vitest、React Testing Library、jsdom

## AI 自然语言设置

首页任务区下方只有一个 AI 输入框，不需要用户预先选择计时模式。前端将整句描述发送给 AI Backend 的统一接口：

```http
POST /api/v1/timer/parse
Content-Type: application/json

{"text":"看50分钟美股视频"}
```

自由专注响应：

```json
{
  "mode": "free",
  "task_name": "美股视频",
  "duration_minutes": 50,
  "focus_minutes": null,
  "short_break_minutes": null,
  "rounds": null,
  "long_break_minutes": null
}
```

输入“物理笔记50分钟，休息10分钟，4轮”时，番茄循环响应为：

```json
{
  "mode": "pomodoro",
  "task_name": "物理笔记",
  "duration_minutes": null,
  "focus_minutes": 50,
  "short_break_minutes": 10,
  "rounds": 4,
  "long_break_minutes": null
}
```

`mode=free` 时页面自动切换到自由专注并填写任务和一次性时长；`mode=pomodoro` 时自动切换到番茄循环并写入现有任务、每轮专注、短休息、轮数和长休息设置。所有 `null` 字段均保持当前模式对应的已有值，不清空也不猜测。37 分钟等非预设自由时长会同步显示为“自定义”；番茄参数仍可在现有设置页继续手动修改。

AI 结果只在计时器仍为 `idle` 且没有已经开始的番茄循环时应用。解析期间如果用户点击开始，迟到的结果会被拒绝。AI 处理逻辑不调用 start、pause、resume 或 stop；只有用户点击“开始专注”才会启动计时。运行中、暂停中以及已进入循环后的阶段间空闲状态均禁止 AI 改写配置。

前端不包含 OpenASI API Key，也没有新增 Next.js API Route、Server Action 或其他服务端代码。默认请求同源 `/api`，适合由 Nginx 将 `/api/` 反向代理到 AI Backend。也可以在构建时配置公开的后端基础地址：

```bash
NEXT_PUBLIC_AI_API_BASE_URL=https://ai.example.com/api npm run build
```

该变量只填写 API 基础路径，不包含 `/v1/timer/parse`。若前后端跨域，AI Backend 还需要允许网页域名的 CORS 请求。OpenASI API Key 只配置在 AI Backend 服务器。GitHub Pages 部署可通过仓库变量 `NEXT_PUBLIC_AI_API_BASE_URL` 指定可公开访问的后端；未配置时仍使用默认同源 `/api`。

## AI 计划图

AI 计划图位于 `更多 → AI 计划图`。用户可以直接用自然语言写下学习或工作计划，前端调用：

```http
POST /api/v1/plan-image/generate
Content-Type: application/json

{"text":"明天上午学习两小时高数，下午背一小时四级单词。"}
```

成功响应为 `image/png`。前端将 PNG 作为 Blob 预览，并提供重新生成和下载，不把生成图片写入专注历史。

当前后端采用“事实锁定 + 创意自由”的计划图生成方式：学习任务名称和时长保持来自用户计划；只有用户明确给出的具体钟点才允许作为固定安排展示，不会为没有具体时间的学习任务自动推断开始或结束时间。在这些事实边界内，图片可以自由使用彩色模块、学习海报、信息图、插画、重点模块和“建议执行顺序”等视觉表达，建议顺序也只能重排已有事项，不能新增无关学习任务。

计划图 V1 不提供模板编辑器、历史图库或云端图片存储。页面刷新后当前 Blob 预览会消失，需要重新生成；图片模型仍可能出现字体、排版或视觉细节波动，适合将“重新生成”作为正常工作流的一部分。

## AI 历史专注分析

AI 历史专注分析位于 `更多 → AI 历史专注分析`，固定对比最近 7 个本地自然日与前一个 7 天周期。前端先从本地历史中确定性计算两个周期的总专注时间、专注次数、平均单次时长、主要任务，以及总时长比例、次数、平均单次和任务投入变化；关键数字与趋势会立即显示，不等待 AI。

前端只把按日和按任务的汇总统计发送到：

```http
POST /api/v1/history/analyze
Content-Type: application/json
```

请求继续以最近 7 天作为顶层统计，并用可选 `previous_period` 携带前一个完整 7 天的同结构汇总；原 Phase 1 请求仍兼容。后端会再次校验每个周期的按日与按任务口径一致，并由程序计算最终统计、变化比例和显著任务变化。AI 只解释经过校验的统计包，返回简短总体总结、1～3 条专注规律和 1～3 条改进建议。页面只新增一条克制的周期对比，不提供聊天输入、评分、雷达图或复杂 Dashboard。

逐条历史记录、精确开始/结束时间、分类和计时器状态不会发送到该接口；两个周期都没有正专注时长时不会请求 AI。AI 失败时，本地统计和趋势仍保持可见。

## 背景系统

背景由独立的固定图层渲染，不参与页面布局，也不会随着倒计时每秒重新计算。六个内置预设如下：

| 背景 | 风格 | 界面模式 |
| --- | --- | --- |
| 森林深夜 | 深墨绿、夜间专注 | 深色 |
| 苔藓薄雾 | 灰绿、白天学习 | 深色 |
| 暖纸书桌 | 米白、纸张与书桌感 | 浅色 |
| 清晨薄雾 | 低饱和灰绿、清晨氛围 | 浅色 |
| 深色墨影 | 极简深色、低干扰 | 深色 |
| 陶土暮色 | 暖棕陶土、傍晚氛围 | 深色 |

在设置页还可以：

- 使用颜色选择器或合法十六进制值创建纯色背景
- 组合两个颜色并选择垂直、水平、对角或径向渐变
- 上传 JPEG、PNG、WebP 或 AVIF 图片，单张最大 5MB
- 调整背景亮度、模糊、遮罩，以及图片缩放、位置和显示方式
- 为自定义背景手动选择浅色文字或深色文字模式
- 一键确认恢复默认背景，并删除浏览器中保存的自定义图片

设置变更会即时预览并自动保存，不需要额外点击保存。

## 番茄循环模式

首页可以在没有活动计时任务时切换“自由专注”和“番茄循环”。自由专注完整保留原有预设、自定义时长、提前结束与恢复行为；番茄循环复用同一个时间戳倒计时，在其上增加独立的阶段状态机。

默认流程：

```text
25 分钟专注
→ 5 分钟短休息
→ 重复 4 轮
→ 15 分钟长休息
→ 新一轮循环
```

番茄设置支持：

- 专注 1–180 分钟
- 短休息 1–60 分钟
- 长休息 1–120 分钟
- 长休息前 2–12 轮专注
- 可选自动开始短休息和长休息
- 可选自动开始下一轮专注
- 单独恢复番茄默认参数，不影响自由专注或背景设置

每个完整专注阶段保存为一条独立历史记录，并显示“番茄 · 第 N/M 轮”。休息阶段不创建 `FocusSession`，不会进入今日专注时长或完成次数。提前结束专注并选择保存时记录为 `stopped`，随后结束当前循环，避免把不完整专注算作完成轮次。

模式、阶段、当前轮次、循环 ID、剩余时间和结束时间戳都会保存在浏览器中。运行中或暂停中刷新、进入历史/设置后返回，都会恢复原阶段；后台过期阶段只处理一次。旧版自由专注计时状态会自动迁移为 V2 的 `free` 模式，无需清理 localStorage。

## 浏览器桌面通知

桌面通知是可选功能，只在页面处于后台时发送；页面可见时继续使用原有提示音、完成弹窗和阶段提示，避免重复提醒。当前覆盖：

- 自由专注正常完成
- 番茄专注阶段完成，包括最后一轮进入长休息
- 短休息结束
- 长休息结束

开启路径：`设置 → 桌面通知 → 确认浏览器权限`。首次打开页面、开始计时和计时结束时都不会自动申请权限，只有用户主动打开开关时才会调用权限请求。权限被拒绝后，应用不会重复弹窗；需要在浏览器的网站权限设置中手动允许。

通知设置与完成提示音相互独立。任务名称只用于当前浏览器生成通知正文，不会因为通知功能而发送到服务器。应用不使用第三方推送服务、Web Push 后端、Service Worker 或服务器定时任务。

桌面通知需要 HTTPS 或浏览器认可的安全上下文，GitHub Pages 满足 HTTPS 条件。页面必须仍在浏览器中打开；关闭所有相关页面后不保证继续通知。系统勿扰模式、浏览器后台策略以及不同移动端系统可能限制通知显示，本功能不等同于服务器推送。

## 专注热力图

历史页将自由专注和番茄专注统一整理为过去一年的学习轨迹，包括：

- 过去 365 天每天的固定强度等级，并扩展到完整的周一至周日网格
- 过去一年累计专注、活跃天数、最长连续天数和完成次数
- 数学、英语、项目、阅读、其他分类筛选
- 点击日期后查看当天专注时间、完成/提前结束次数、主要分类与任务记录
- 分类时长分布，以及番茄第 N/M 轮或自由专注标记
- 移动端独立水平滚动并自动定位到最近日期，不产生页面级横向滚动

热力等级使用固定区间，不会因新增记录而改变旧日期的颜色含义：

| 等级 | 每日专注时长 |
| --- | --- |
| 0 | 0 分钟 |
| 1 | 1–29 分钟 |
| 2 | 30–59 分钟 |
| 3 | 60–119 分钟 |
| 4 | 120 分钟及以上 |

热力图与首页统计统一使用浏览器本地时区。记录按照 `endedAt` 对应的本地自然日归属，不能通过 UTC 日期字符串截取日期。`completed` 和用户选择保存的 `stopped` 都计入专注时长，只有 `completed` 计入完成次数；短休息和长休息不创建记录，也不会进入热力图。缺少 `mode`、`cycleId` 或番茄轮次字段的旧记录继续按自由专注解析。

最长连续天数表示当前热力图范围内，连续存在正专注时长记录的最长自然日序列；它不同于首页展示的当前连续天数。

### 技术实现

- CSS 渐变负责六个内置背景和自定义双色渐变
- `BackgroundLayer` 使用独立固定图层处理背景、滤镜、遮罩和柔和光晕
- localStorage 保存轻量背景配置，IndexedDB 保存本地图片 Blob
- Object URL 仅在需要图片时创建，并在替换或组件卸载时释放
- CSS 变量和根节点 `data-color-mode` 统一适配导航、计时器、圆环、表单、历史和对话框
- 减少动画设置或系统 `prefers-reduced-motion` 开启时取消背景过渡

## 页面截图

### 专注计时器

![Aprivity Focus 自由专注主页](docs/screenshots/focus-home.webp)

Forest Sage 深色首页把任务、分类、AI 填写、自由专注 / 番茄循环与翻页计时器收拢在同一条专注路径中；顶部只保留历史记录、更多、设置和全屏。

![专注时长预设与今日统计](docs/screenshots/today-summary.webp)

快捷时长支持 25、45、60、80 分钟和自定义输入；首页同步展示今日专注时长、完成次数与连续专注天数。

### 更多与 AI 计划图

![“更多”功能中心](docs/screenshots/more-hub.webp)

“更多”作为扩展能力入口，保持主计时界面克制；当前提供 AI 计划图和最近 7 天 AI 历史专注分析。

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/plan-image-studio.webp" alt="AI 计划图输入页面" /></td>
    <td width="50%"><img src="docs/screenshots/plan-image-generating.webp" alt="AI 计划图生成中状态" /></td>
  </tr>
  <tr>
    <td align="center">用自然语言写下任务、时长和已有时间约束</td>
    <td align="center">生成过程中保留输入，并展示明确的等待状态</td>
  </tr>
</table>

<p align="center">
  <img src="docs/screenshots/plan-image-result.webp" alt="AI 计划图生成结果与下载入口" width="340" />
</p>

生成结果直接在页面预览，可重新生成或下载 PNG。图片允许用建议执行顺序、重点模块和更有活力的视觉设计增强可执行感，但不会擅自修改学习内容、任务时长，也不会为用户没有给出具体钟点的学习任务自动排时间。

### 专注历史

![过去一年专注热力图与历史概览](docs/screenshots/history-dashboard.webp)

过去一年热力图、累计专注、活跃天数、最长连续天数和完成次数使用同一分类筛选范围。

![选中日期详情与历史记录列表](docs/screenshots/history-day-details.webp)

选择日期后可查看当天统计、分类分布、任务详情和完整历史记录。

### 设置与个性化

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/settings-preferences.webp" alt="基础偏好设置，包括默认时长、提示音、桌面通知、全屏和减少动画" /></td>
    <td width="50%"><img src="docs/screenshots/settings-pomodoro.webp" alt="番茄循环时长、轮数和自动开始设置" /></td>
  </tr>
  <tr>
    <td align="center">基础偏好与浏览器通知</td>
    <td align="center">番茄循环参数</td>
  </tr>
</table>

![内置背景、自定义颜色、渐变和本地图片设置](docs/screenshots/settings-backgrounds.webp)

背景设置支持六种内置主题、自定义纯色与渐变、本地图片，以及亮度、模糊和遮罩调节。

## 本地运行

需要 Node.js 20.9 或更高版本。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

本地开发和普通生产构建都使用根路径 `/`。GitHub Pages 工作流会设置 `DEPLOY_TARGET=github-pages`，自动将 `basePath` 和 `assetPrefix` 切换为 `/study-timer`。

自有服务器生产构建：

```bash
npm run lint
npm run test
npm run build
```

`output: "export"` 会将适合 Nginx 根路径托管的静态站点生成到 `out/`，无需运行 Next.js 服务端。不要为自有域名设置 `DEPLOY_TARGET=github-pages`。

如需在本地复现 GitHub Pages 构建，可运行：

```bash
DEPLOY_TARGET=github-pages npm run build
```

## 自动部署

### GitHub Pages

`.github/workflows/deploy-pages.yml` 使用 GitHub Pages 官方 Actions：

1. 推送到 `main` 或手动触发 `workflow_dispatch`。
2. 使用 `npm ci` 安装锁定依赖。
3. 依次运行 ESLint、Vitest 和 Next.js 静态构建。
4. 构建步骤设置 `DEPLOY_TARGET=github-pages`，生成带 `/study-timer` 基础路径的静态站点。
5. 将生成的 `out/` 上传为 Pages artifact。
6. 通过 `github-pages` environment 部署到 GitHub Pages。

Pages 部署采用独立并发控制，避免多个生产部署相互覆盖。

### 自有 VPS

`.github/workflows/ci-cd-self-hosted.yml` 保留自托管版本的 CI 检查；PR、`main` 更新或手动触发时会执行依赖安装、测试、ESLint、根路径静态构建和 `out/` 校验。既有检查名称保持不变，供分支保护规则继续使用。

独立的 `.github/workflows/deploy-vps.yml` 负责生产部署：

1. `main` 的 `Self-hosted CI/CD` 成功完成后自动触发，也支持 `workflow_dispatch` 手动部署所选分支。
2. 检出刚通过 CI 的准确提交，并在 Actions 中重新运行 `npm ci`、测试、ESLint，以及 `NEXT_PUBLIC_AI_API_BASE_URL=/api npm run build`。
3. 使用 Repository Secrets `SSH_HOST`、`SSH_USER`、`SSH_PRIVATE_KEY` 和 `SSH_KNOWN_HOSTS` 连接 VPS；部署账号必须为无 root 的 `deploy`。
4. 将 Actions 生成的 `out/` 用 rsync 上传到 `/var/www/study-timer/.deploy-<run-id>/`。VPS 不执行 `git pull`、`npm ci` 或 `npm build`，也不修改 Nginx。
5. 校验临时目录后，在同一文件系统内将当前 `out/` 移为 `/var/www/study-timer/out.previous`，再将临时目录重命名为新的 `out/`。
6. 请求 [https://focus.aprivity.xyz/](https://focus.aprivity.xyz/) 验证线上服务。检查失败时恢复 `out.previous`，并让 workflow 保持失败状态；成功时保留 `out.previous` 作为上一版。

VPS 部署使用固定 concurrency group，同一时间只允许一个生产部署执行。Secret 只写入 runner 的临时 SSH 文件，不输出到日志或传入前端构建产物。

## 项目结构

```text
app/                 页面、布局和全局视觉变量
  history/           历史记录页面
  more/              扩展功能中心与 AI 计划图页面
  settings/          设置页面
components/
  background/        背景 Provider、渲染层、预设和自定义编辑器
  focus/             计时器、圆环、翻页时钟、任务和控制
  more/              AI 计划图输入、生成状态、预览与下载 UI
  pomodoro/          模式选择、阶段信息、轮次进度、控制和过渡弹窗
  history/
    HistoryDashboard.tsx  历史页统一状态和数据流
    HistoryOverview.tsx   过去一年四项概览
    FocusHeatmap.tsx      周列热力图、月份和滚动行为
    HeatmapCell.tsx       可访问的日期单元格
    HeatmapLegend.tsx     固定强度图例
    DayFocusDetails.tsx   单日统计、分类分布和任务
    HistoryList.tsx       受控历史记录列表
    HistoryItem.tsx       单条历史记录
  stats/             今日统计
  dialogs/           完成及提前结束对话框
  layout/            顶部导航和页面容器
  settings/          偏好、通知、备份预览、确认和导入结果 UI
hooks/
  useBrowserNotifications.ts  通知权限读取与主动授权流程
  useCountdown.ts             时间戳倒计时与恢复
  usePomodoroCycle.ts         番茄阶段和轮次
lib/
  backup/                    备份结构、导出、验证、合并、事务写入与恢复
  local-date.ts              统一本地日期和周边界工具
  history-analytics.ts       热力等级、每日聚合和概览纯函数
  notifications.ts          通知策略、消息、图标路径和安全发送
  plan-image.ts              AI 计划图客户端、Blob 与下载处理
  pomodoro.ts                番茄状态机纯函数
  storage.ts                 localStorage 校验与兼容迁移
types/
  backup.ts                  备份、预览、导入和恢复点类型
  history-analytics.ts       热力图每日摘要和概览类型
  其余文件                    计时器、番茄、记录、设置与背景类型
styles/              翻页时钟样式
```

## 数据存储

数据使用统一封装读写以下 localStorage 键：

```text
aprivity-focus:timer
aprivity-focus:sessions
aprivity-focus:settings
aprivity-focus:background-settings
aprivity-focus:pre-import-backup
```

读取时会验证 JSON、字段类型和时间范围。非法或旧数据会安全回退，不会阻止页面启动。清除浏览器站点数据会同步删除这些数据。

计时器存储结构当前为 V2，包含 `mode`、`pomodoro` 阶段状态和通知去重 token。读取 V1 状态时默认迁移为自由专注；设置缺少番茄字段时自动补入 25/5/15 分钟和 4 轮默认值，缺少 `notificationsEnabled` 时默认关闭；旧历史记录缺少模式字段时仍按自由专注显示。

`aprivity-focus:pre-import-backup` 仅保存最近一次导入前的恢复点。完成下一次导入时会被覆盖，撤销成功后会被删除。

## 数据备份与迁移

设置页底部提供“数据备份与迁移”。导出与导入都完全在当前浏览器中完成，文件不会上传到 GitHub Pages、服务器或第三方服务。

### 导出内容

版本 1 的 JSON 备份包含：

- 已保存的自由专注与番茄专注历史记录
- 默认时长、提示音、通知应用内开关、确认结束、自动全屏、减少动画和番茄参数
- 内置背景、纯色、渐变或图片背景的轻量配置
- 应用版本、备份格式版本、导出时间、记录摘要和图片元数据

备份明确不包含：

- 正在运行或暂停的计时状态
- IndexedDB 中的自定义背景图片 Blob、Base64 图片或音频二进制
- 浏览器通知权限、Object URL、全屏状态等运行时信息

因此，在另一浏览器导入使用自定义图片的备份时，如果该浏览器没有对应 IndexedDB 图片，背景会安全回退到“森林深夜”，并提示重新上传图片；导入和撤销都不会删除当前 IndexedDB 中已有的图片。

### 导入策略

选择最大 10MB 的文件后，应用会先验证 JSON、格式版本、字段和记录范围，并展示导出时间、应用版本、有效/无效记录、完成/提前结束数量、日期范围、设置与背景摘要。在用户确认前不会写入存储。高于当前支持版本的备份会被拒绝；未知字段会显式忽略，单条非法记录会跳过并计数。

- **合并（推荐）**：通过记录 ID 加入新记录；完全相同的记录跳过，ID 相同但内容冲突时保留当前浏览器记录。默认保留当前设置和背景，也可主动勾选应用备份配置。
- **覆盖**：二次确认后，用备份中的历史、设置和背景配置替换当前对应数据。
- **恢复点**：每次成功写入前保存一份当前 JSON 数据。设置页可撤销最近一次导入；系统只保留一个恢复点。

导入采用“校验 → 预览 → 创建恢复点 → 写入并回读校验”的顺序。如果中途写入失败，会尝试回滚到原数据。运行中或暂停中的专注不会被导入覆盖，必须先结束计时；此时仍可安全导出，因为活动计时本来就不在备份中。

JSON 可能包含任务名称和完整学习历史，请像保管个人文档一样保管，不要把备份公开上传或随意分享。该格式为版本化本地迁移格式，不是云端同步协议。

### 统计口径

- 今日专注时长：累加今天所有 `completed` 和已保存 `stopped` 记录的 `focusedSeconds`。
- 今日完成次数：只统计 `status === "completed"`。
- 连续专注天数：按浏览器本地自然日计算；如果今天还没有记录，则从昨天开始保留已有连续天数，今天完成一次专注后再从今天向前计算。
- 历史热力图：按 `endedAt` 的本地日期归属，`completed` 与正时长 `stopped` 都计入时长，只有 `completed` 计入完成次数。
- 历史最长连续：只在当前过去一年完整周范围内计算连续存在正专注时长的自然日。

## 隐私

核心计时、专注历史、热力图、设置和备份都保存在当前浏览器中，不会自动同步原始记录。只有使用 AI 填写或 AI 计划图时，对应自然语言才会发送到 AI Backend；进入 AI 历史专注分析页时只发送两个 7 天周期的按日和按任务汇总，不发送逐条记录或精确时间。AI 计划图以 PNG Blob 返回浏览器用于预览和下载，V1 不提供前端图片历史或云端图库。

桌面通知正文只在本地生成，不会因为通知功能上传任务名称或交给第三方推送服务。前端不包含 AI Provider API Key；密钥只应配置在 AI Backend 服务器。

localStorage 数据按浏览器配置和站点来源（协议、域名及端口）隔离。因此 GitHub Pages、localhost、其他浏览器或无痕窗口之间不会共享专注状态、历史记录、热力图或背景设置。清理浏览器站点数据后，历史记录及由它生成的热力图可能永久丢失。

自定义背景图片不会以 Base64 写入 localStorage，而是作为 Blob 保存在浏览器 IndexedDB 的 `aprivity-focus` 数据库、`background-images` store、`custom-background` key 中。图片不会上传到服务器、GitHub 或 GitHub Pages；更换浏览器、使用无痕窗口或清理站点数据后，自定义背景可能丢失。

### 浏览器支持

- 计时和背景配置需要浏览器支持 localStorage。
- 本地图片背景需要 IndexedDB 和 Object URL。
- 桌面通知需要 Notification API、用户主动授权和安全上下文；权限被阻止后只能由用户在浏览器设置中修改。
- 页面完全关闭、系统勿扰模式开启或移动端浏览器限制后台能力时，桌面通知可能无法显示。
- IndexedDB 不可用或图片读取失败时，页面会回退到默认背景；内置背景、纯色和渐变仍可正常使用。

## 测试

测试覆盖时间格式化边界、跨小时显示、时间戳剩余时间、归零、暂停/继续、刷新恢复、提前结束实际时长、今日统计、连续天数、非法存储容错、设置回退、完成记录防重复及核心按钮交互。

背景测试覆盖六个预设、选择与深浅模式、非法颜色和 preset 回退、数值钳制、刷新恢复、文件格式/大小、IndexedDB 降级、图片删除回退、减少动画和 Object URL 释放。

番茄测试覆盖默认参数、2/4/8 轮状态流转、短休息与长休息、自动开始规则、休息不记录、V1 计时迁移、旧设置补全、非法范围钳制、阶段恢复、模式锁定、跳过休息、提前结束 stopped 记录和自由专注回归。

通知测试覆盖 API 支持检测、default/granted/denied 权限、仅主动请求、前后台发送策略、自由专注和番茄阶段文案、刷新与 Strict Mode 去重、构造失败降级、点击聚焦、GitHub Pages 图标路径，以及提示音设置与通知设置互不影响。

备份测试覆盖 v1 导出结构、图片元数据、10MB 限制、非法 JSON、版本拒绝、缺失字段回退、未知字段与原型污染防护、单条无效记录跳过、ID 去重与冲突、合并/覆盖、活动计时锁定、事务回滚、图片背景降级、单恢复点和撤销，以及预览、二次确认和结果对话框交互。

热力图测试覆盖本地日期键、月末/年末换日、周一边界、完整周日期范围、UTC 偏移防回归、固定五级阈值、空日期补齐、自由/番茄/提前结束聚合、休息排除、分类筛选、跨月跨年最长连续、默认日期选择、日期详情、删除同步、清空空状态、ARIA 标签和移动端滚动容器。

AI 测试覆盖统一自然语言计时输入、自由专注/番茄配置应用时机、计划图请求与 Blob 生命周期，以及相邻 7 天周期聚合、程序趋势计算、Phase 1 兼容、空历史、分析加载和错误重试。

## 当前限制

- 数据仅存在当前浏览器中，清理站点数据后无法恢复，也不会跨设备同步。
- JSON v1 不包含自定义背景图片；跨浏览器迁移时图片背景需要重新上传。当前仅保留最近一次导入恢复点。
- 全屏和提示音受浏览器权限及自动播放策略约束；失败时计时功能仍会正常工作。
- GitHub Pages 是纯静态站点，不提供服务器通知、后台任务或云端备份；AI 功能需要可访问的独立 AI Backend。
- AI 计划图当前不保存生成历史，且图片模型可能出现字体、排版或视觉细节波动，可使用“重新生成”继续尝试。
- 桌面通知要求页面仍在浏览器中打开；权限拒绝后需手动修改网站权限，部分移动端浏览器的支持和后台行为可能不同。
- 浏览器不支持 AVIF 时可以改用 JPEG、PNG 或 WebP；应用不会在 Canvas 中转换图片。
- 当前截图以桌面端深色模式为主；移动端和浅色背景仍建议在后续版本补充视觉回归覆盖。

## Roadmap

- 用户注册、登录、云端数据库和多设备同步
- 好友、排行榜、社交分享和多人自习室
- 月度/年度 AI 历史复盘、复杂成就及复杂数据图表
- AI 计划图历史、更多风格控制与可选文字稳定化渲染
- PWA 离线安装
- 可选加密备份、包含图片资源的 ZIP 备份，以及更多历史恢复点
- 自动化视觉回归检查
- 在线背景图库和按时间自动切换背景
- 多设备背景同步和可选动态天气背景
- 可选环境音和番茄循环数据概览

## 视觉参考

翻页数字的机械分区视觉受到 [`xiaxiangfeng/react-flip-clock`](https://github.com/xiaxiangfeng/react-flip-clock) 启发。本项目未复制其旧代码，也未将它作为依赖；翻页结构和动画使用现代 React 与原生 CSS 独立实现。

## License

当前仓库暂未指定开源许可证。
