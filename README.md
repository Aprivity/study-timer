# Aprivity Focus

Aprivity Focus 是一个面向学生和个人学习场景的沉浸式倒计时网页。它采用安静克制的 Forest Sage 视觉语言，围绕“填写任务 → 选择时长 → 专注 → 保存记录 → 查看统计”的单一流程设计。

> V1 完全运行在浏览器中，不需要账号、后端或数据库。

## 在线访问

GitHub Pages 地址：[https://aprivity.github.io/study-timer/](https://aprivity.github.io/study-timer/)

部署工作流合并到 `main` 并首次成功运行后，该地址开始提供服务。

## 功能

- 基于结束时间戳计算的准确倒计时，降低后台标签页限频造成的误差
- 开始、暂停、继续、提前结束与完成闭环
- 刷新后恢复运行中、暂停中和已完成的计时器
- 原生 SVG 圆环进度，末尾 10% 进入陶土色提醒状态
- 原生 CSS 3D 翻页时钟，支持 `MM:SS` 和 `HH:MM:SS`
- 25、45、60、80 分钟预设与 1–720 分钟自定义时长
- 任务名称和数学、英语、项目、阅读、其他分类
- localStorage 学习记录，完成记录 UUID 防重复写入
- 今日专注时长、完成次数和连续专注天数统计
- 按日期分组的历史页面、分类筛选、单条删除和二次确认清空
- 默认时长、提示音、提前结束确认、自动全屏和减少动画设置
- 六种内置学习背景，覆盖深色夜间、浅色纸张和清晨雾感等场景
- 自定义纯色、双色渐变与仅存于本地的图片背景
- 背景亮度、遮罩、模糊、图片缩放、显示方式和位置调节
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

### 技术实现

- CSS 渐变负责六个内置背景和自定义双色渐变
- `BackgroundLayer` 使用独立固定图层处理背景、滤镜、遮罩和柔和光晕
- localStorage 保存轻量背景配置，IndexedDB 保存本地图片 Blob
- Object URL 仅在需要图片时创建，并在替换或组件卸载时释放
- CSS 变量和根节点 `data-color-mode` 统一适配导航、计时器、圆环、表单、历史和对话框
- 减少动画设置或系统 `prefers-reduced-motion` 开启时取消背景过渡

## 页面截图

> 截图占位：部署后补充森林深夜、暖纸书桌、背景设置面板和自定义图片背景的真实截图。当前环境未伪造截图。

## 本地运行

需要 Node.js 20.9 或更高版本。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

本地开发不启用 `/study-timer` 基础路径；生产构建会自动使用该路径，以适配 GitHub Pages 项目站点。

生产构建：

```bash
npm run lint
npm run test
npm run build
```

`output: "export"` 会将可部署站点生成到 `out/`，无需运行 Next.js 服务端。

## 自动部署

`.github/workflows/deploy-pages.yml` 使用 GitHub Pages 官方 Actions：

1. 推送到 `main` 或手动触发 `workflow_dispatch`。
2. 使用 `npm ci` 安装锁定依赖。
3. 依次运行 ESLint、Vitest 和 Next.js 静态构建。
4. 将生成的 `out/` 上传为 Pages artifact。
5. 通过 `github-pages` environment 部署到 GitHub Pages。

部署采用并发控制，避免多个生产部署相互覆盖。工作流在 Draft PR 阶段不会部署；合并到 `main` 后才会自动执行。

## 项目结构

```text
app/                 页面、布局和全局视觉变量
  history/           历史记录页面
  settings/          设置页面
components/
  background/        背景 Provider、渲染层、预设和自定义编辑器
  focus/             计时器、圆环、翻页时钟、任务和控制
  history/           历史列表和记录项
  stats/             今日统计
  dialogs/           完成及提前结束对话框
  layout/            顶部导航和页面容器
hooks/               倒计时、背景设置/图片、localStorage、全屏 Hook
lib/                 时间、背景预设/存储/IndexedDB、会话和统计纯函数
types/               计时器、记录、设置与背景严格类型定义
styles/              翻页时钟样式
```

## 数据存储

数据使用统一封装读写以下 localStorage 键：

```text
aprivity-focus:timer
aprivity-focus:sessions
aprivity-focus:settings
aprivity-focus:background-settings
```

读取时会验证 JSON、字段类型和时间范围。非法或旧数据会安全回退，不会阻止页面启动。清除浏览器站点数据会同步删除这些数据。

### 统计口径

- 今日专注时长：累加今天所有 `completed` 和已保存 `stopped` 记录的 `focusedSeconds`。
- 今日完成次数：只统计 `status === "completed"`。
- 连续专注天数：按浏览器本地自然日计算；如果今天还没有记录，则从昨天开始保留已有连续天数，今天完成一次专注后再从今天向前计算。

## 隐私

V1 不发送、上传或同步任务和学习记录。所有内容仅保存在当前浏览器。项目不包含密钥、追踪脚本、用户账户或远程数据库。

localStorage 数据按浏览器配置和站点来源（协议、域名及端口）隔离。因此 GitHub Pages、localhost、其他浏览器或无痕窗口之间不会共享专注状态、历史记录或背景设置。

自定义背景图片不会以 Base64 写入 localStorage，而是作为 Blob 保存在浏览器 IndexedDB 的 `aprivity-focus` 数据库、`background-images` store、`custom-background` key 中。图片不会上传到服务器、GitHub 或 GitHub Pages；更换浏览器、使用无痕窗口或清理站点数据后，自定义背景可能丢失。

### 浏览器支持

- 计时和背景配置需要浏览器支持 localStorage。
- 本地图片背景需要 IndexedDB 和 Object URL。
- IndexedDB 不可用或图片读取失败时，页面会回退到默认背景；内置背景、纯色和渐变仍可正常使用。

## 测试

测试覆盖时间格式化边界、跨小时显示、时间戳剩余时间、归零、暂停/继续、刷新恢复、提前结束实际时长、今日统计、连续天数、非法存储容错、设置回退、完成记录防重复及核心按钮交互。

背景测试覆盖六个预设、选择与深浅模式、非法颜色和 preset 回退、数值钳制、刷新恢复、文件格式/大小、IndexedDB 降级、图片删除回退、减少动画和 Object URL 释放。

## 当前限制

- 数据仅存在当前浏览器中，清理站点数据后无法恢复，也不会跨设备同步。
- 全屏和提示音受浏览器权限及自动播放策略约束；失败时计时功能仍会正常工作。
- GitHub Pages 是纯静态站点，不提供服务器通知、后台任务或云端备份。
- 浏览器不支持 AVIF 时可以改用 JPEG、PNG 或 WebP；应用不会在 Canvas 中转换图片。
- README 的背景实机截图仍为占位，建议部署后补充桌面端和移动端截图。

## Roadmap

- 用户注册、登录、云端数据库和多设备同步
- 好友、排行榜、社交分享和多人自习室
- AI 学习建议、复杂成就及复杂数据图表
- PWA 离线安装
- 可选通知、数据导入导出与部署后的视觉回归截图
- 在线背景图库、背景导入导出和按时间自动切换背景
- 多设备背景同步和可选动态天气背景

## 视觉参考

翻页数字的机械分区视觉受到 [`xiaxiangfeng/react-flip-clock`](https://github.com/xiaxiangfeng/react-flip-clock) 启发。本项目未复制其旧代码，也未将它作为依赖；翻页结构和动画使用现代 React 与原生 CSS 独立实现。

## License

当前仓库暂未指定开源许可证。
