# Aprivity Focus

Aprivity Focus 是一个面向学生和个人学习场景的沉浸式倒计时网页。它采用安静克制的 Forest Sage 视觉语言，围绕“填写任务 → 选择时长 → 专注 → 保存记录 → 查看统计”的单一流程设计。

> V1 完全运行在浏览器中，不需要账号、后端或数据库。

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
- 完成提示音开关、动态网页标题和全屏专注模式
- 响应式桌面/移动布局、键盘焦点样式和减少动画模式

## 技术栈

- Next.js 16 App Router
- React 19、TypeScript 严格模式
- Tailwind CSS 3、原生 CSS
- Lucide React
- 原生 SVG 与 CSS 3D Transform / Keyframes
- Vitest、React Testing Library、jsdom

## 页面截图

> 截图占位：合并并部署 V1 后补充首页、移动端和历史页面截图。

## 本地运行

需要 Node.js 20.9 或更高版本。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

生产构建：

```bash
npm run lint
npm run test
npm run build
npm start
```

## 项目结构

```text
app/                 页面、布局和全局视觉变量
  history/           历史记录页面
  settings/          设置页面
components/
  focus/             计时器、圆环、翻页时钟、任务和控制
  history/           历史列表和记录项
  stats/             今日统计
  dialogs/           完成及提前结束对话框
  layout/            顶部导航和页面容器
hooks/               倒计时、localStorage、全屏 Hook
lib/                 时间、存储、会话去重和统计纯函数
types/               严格类型定义
styles/              翻页时钟样式
```

## 数据存储

数据使用统一封装读写以下 localStorage 键：

```text
aprivity-focus:timer
aprivity-focus:sessions
aprivity-focus:settings
```

读取时会验证 JSON、字段类型和时间范围。非法或旧数据会安全回退，不会阻止页面启动。清除浏览器站点数据会同步删除这些数据。

## 隐私

V1 不发送、上传或同步任务和学习记录。所有内容仅保存在当前浏览器。项目不包含密钥、追踪脚本、用户账户或远程数据库。

## 测试

测试覆盖时间格式化、跨小时显示、时间戳剩余时间、归零、暂停/继续、今日统计、连续天数、非法存储容错、完成记录防重复及核心按钮交互。

## Roadmap

- 用户注册、登录、云端数据库和多设备同步
- 好友、排行榜、社交分享和多人自习室
- AI 学习建议、复杂成就及复杂数据图表
- PWA 离线安装
- 可选通知、数据导入导出与部署后的视觉回归截图

## 视觉参考

翻页数字的机械分区视觉受到 [`xiaxiangfeng/react-flip-clock`](https://github.com/xiaxiangfeng/react-flip-clock) 启发。本项目未复制其旧代码，也未将它作为依赖；翻页结构和动画使用现代 React 与原生 CSS 独立实现。

## License

当前仓库暂未指定开源许可证。
