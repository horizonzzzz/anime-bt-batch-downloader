# Kisssub Batch Downloader

基于 `Plasmo + React 19 + TypeScript` 的浏览器扩展项目，用来在 `kisssub` 列表页勾选多个帖子，自动进入详情页注入 `acgscript` 远端辅助脚本，提取真实磁力或种子链接，然后一次性提交到本机 `qBittorrent WebUI API`。

本次改造只升级工程结构、前端框架和测试体系，不改原有业务逻辑。

## 当前能力

- 在 `kisssub` 列表页为每条 `show-*.html` 帖子插入复选框
- 右下角固定面板支持全选、清空、批量下载、打开设置
- 后台 Service Worker 会为每条帖子创建后台标签页
- 详情页若仍显示 `开启虫洞`，扩展会注入 `//1.acgscript.com/script/miobt/4.js?3`
- 注入完成后读取被改写的 `#magnet` 和 `#download`
- 优先提交 magnet，没有 magnet 时回退到 torrent URL
- 提交前会按 `btih` hash 或 URL 去重

## 技术栈

- `Plasmo 0.90.x`
- `React 19`
- `TypeScript 5`
- `Vitest + Testing Library`
- `Playwright`

## 开发命令

```bash
pnpm install
pnpm dev
pnpm build
pnpm test
pnpm test:e2e
pnpm test:all
```

说明：

- `pnpm test` 会运行单元测试、组件测试并输出覆盖率
- `pnpm test:e2e` 会先构建扩展，再运行 Playwright 扩展测试
- `pnpm test:all` 会串行执行全部验证

## 加载方式

1. 运行 `pnpm build`
2. 打开 `chrome://extensions` 或 `edge://extensions`
3. 开启“开发者模式”
4. 选择“加载已解压的扩展程序”
5. 选择目录 `build/chrome-mv3-prod`

## 使用步骤

1. 先在 qBittorrent 的 `Tools/Options -> WebUI` 中确认 WebUI 已启用
2. 如果 WebUI 只供本机使用，建议关闭 `Enable Cross-Site Request Forgery (CSRF) protection`
3. 若关闭后浏览器扩展测试仍返回 401，再关闭 `Host header validation`
4. 打开扩展设置页，填写 `qBittorrent WebUI` 地址、用户名和密码
5. 在设置页点击“测试 qB 连接”
6. 打开 `kisssub` 的首页、搜索页或分类列表页
7. 勾选要下载的帖子
8. 点击“批量下载”

## 测试说明

- 单元测试覆盖设置规范化、qB 登录错误提示、批处理分类逻辑
- 组件测试覆盖设置页和批量面板的基础交互
- E2E 测试覆盖扩展加载、设置页保存、Kisssub 列表页面板注入和打开设置页

## 已知边界

- 只针对 `kisssub` 单站
- 没有实现取消任务
- 没有实现分类、标签、保存目录等 qB 参数
- 依赖第三方 `acgscript` 和 `v2.uploadbt.com` 的现有行为
- 当前 qB WebUI 兼容方案面向本机自用场景；若 WebUI 暴露到局域网或公网，不建议关闭 `Enable Cross-Site Request Forgery (CSRF) protection` 与 `Host header validation`
