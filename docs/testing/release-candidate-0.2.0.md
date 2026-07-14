# MediaCookies 0.2.0 本地候选验收

验收日期：2026-07-13

## Chrome

- 浏览器：Google Chrome for Testing 151.0.7922.10，独立持久化资料目录。
- 加载对象：生产构建 `dist/`，Manifest V3，版本 0.2.0。
- 使用专用合成 Bilibili Cookie 验证快速导出与导出工作台，没有连接日常浏览器资料。
- 首次快速导出会主动申请当前来源权限；拒绝后仍可重新授权，允许但没有登录标记时会显示“请先登录”，不会下载空包。
- 快速导出覆盖中文可导出、中文请先登录、英文导出完成与手动语言持久化。
- 导出工作台完成广泛权限说明、来源扫描、安全预览与自定义 Cookie 包下载；底部低价值的“偏好与支持”区域已移除。
- 实际扫描得到 1 个来源、2 条 Cookie；界面只出现域名、名称、路径、有效期、状态、安全标记与数量，不出现 Cookie 值。
- 键盘 Tab 可聚焦“媒体站点（推荐）”和“全部 Cookie 域名”，当前扫描范围通过 `aria-pressed` 与深色选中态同步表达；640x800 视口下页面无横向溢出，覆盖 1280 宽页面的 200% 重排要求。
- 最终工作台控制台为 0 个错误、0 个警告。
- 隔离 Google Chrome 使用生产 Manifest（无 `downloads` 权限）完成真实导出，实际文件名为 `MediaCookies_2026-07-13_19-48-30.zip`，ZIP 根目录同名，不再出现 Blob UUID。
- 商店截图使用真实生产扩展界面，并在完成后移除含合成 Cookie 的浏览器资料与测试 ZIP。

## Microsoft Edge

- 当前 Mac 未安装 Microsoft Edge，且任务未授权安装新的系统软件。
- 本轮将 Edge 记为可复现的平台环境限制，不把未执行的 Edge 冒烟测试写成通过。
- Chromium 兼容性由 Chrome for Testing 的真实扩展流程覆盖；发布前仍建议在装有 Edge 的设备上补一次加载、来源授权、快速导出和工作台冒烟测试。

## Opera Neon

- 使用当前 Opera Neon 和独立临时资料，分别加载项目根目录入口与生产 `dist/` 构建。
- 项目根目录入口成功加载 `dist/` 的脚本、样式和图标，弹窗宽度为 400px，控制台为 0 个错误、0 个警告；不再出现裸 HTML 或按钮无响应。
- “仅打开导出工作台”在真实 Neon 中创建工作台新标签页。
- “识别整个浏览器”会在授权后打开工作台，并自动选中“媒体站点（推荐）”，不会替普通用户默认展示所有 Cookie 域名。
- 全来源按钮会触发 Neon 原生广泛访问提示。由于浏览器外壳提示不由页面自动化控制，扫描阶段另使用仅限临时资料的预授权测试 Manifest；生产 Manifest 未增加固定 host 权限。
- 使用三个合成 Cookie 验证两种范围：“媒体站点（推荐）”只显示 Bilibili 与 Vimeo，并隐藏 1 条推荐范围外的 Cookie；“全部 Cookie 域名”会额外显示 `example.com`。页面不包含合成 Cookie 值，控制台为 0 个错误、0 个警告。
- 修复后再次在隔离 Opera Neon 导出，浏览器实际落盘为 `MediaCookies_2026-07-13_19-44-51.zip`，证明下载名不再取自 Blob URL UUID。

## Media Dock 2.1.2

- 使用当前 Media Dock 开发版的真实界面和现有 `cookies:importZip` IPC 导入器测试浏览器生成的 ZIP。
- macOS 原生文件选择器在自动化会话中把项目内所有 ZIP 的“打开”按钮保持为禁用；这不是特定于 MediaCookies 测试包的现象。
- 为隔离原生选择器边界，仅在本次运行时把选择结果指向测试 ZIP，随后点击应用里的“导入 Cookie ZIP”；未修改 Media Dock 仓库或持久化运行时补丁。
- Media Dock 显示“已导入 5 个 Cookie 文件”，并把 `by-service/bilibili-b-site.cookies.txt` 识别为“2 条 Cookie · bilibili.com”。
- 验证后恢复“自动按链接匹配”，撤销运行时补丁，并删除导入目录和合成 Cookie 临时文件。
- 这证明 ZIP 结构和 Media Dock 导入器兼容；原生选择器的人手点击流程仍建议在发布前补一次非自动化冒烟测试。

## 发布素材与门禁

- `npm run validate:assets`：4 组图标、5 张 1280x800 商店截图、4 张发布卡片全部通过。
- 商店截图为中文 3 张、英文 2 张，均为 24 位 RGB PNG、无 alpha。
- `npm run check`：项目校验、素材校验、28 项测试、类型检查、生产构建和 0.2.0 打包全部通过。
- 发布 ZIP 仅包含生产 HTML、构建产物、四个运行图标与 `manifest.json`。
