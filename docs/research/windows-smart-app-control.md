# Windows 11 Smart App Control：官方资料结论

核验日期：2026-07-16

本文只引用 Microsoft 与 Chrome/Chromium 官方资料。需要特别区分三层机制：Windows 11 Smart App Control（SAC）、浏览器下载保护/SmartScreen，以及 Chrome Web Store 的扩展签名与分发规则。本文只判断 SAC，不能据此推断另外两层一定放行。

## 结论摘要

| 问题 | 结论 |
| --- | --- |
| SAC 评估什么 | 它是代码执行控制：评估将要运行或加载的应用、二进制和受支持脚本，而不是笼统检查磁盘上的每一个普通文件。安装器、卸载器、DLL、集成组件等会在各自被加载时分别进入判断。 |
| 签名与信誉的作用 | 云端服务先判断代码信誉。确认安全则允许，确认恶意或 PUA 则阻止；无法确定时，再以有效的受信任代码签名作为放行依据。对新发布的软件，正确签署所有二进制比等待信誉形成更可控。 |
| 未签名 EXE 改成 BAT | **不能视为可靠绕过。** App Control 不直接控制 `cmd.exe` 执行的 `.bat`/`.cmd` 内容，但 BAT 启动的 EXE、DLL 或其他受控代码仍会被检查。只有“完全不再分发或运行原未签名 EXE”的纯批处理入口，才消除了那个具体 EXE 的 SAC 风险；BAT 不能替同一个 EXE 洗白。 |
| Chrome 扩展 ZIP | **普通、纯扩展 ZIP 不属于 SAC 的 Windows 原生可执行文件分发链。** Chrome 官方把 ZIP 定义为 Web Store 上传包；用户直接安装的正式扩展由 Chrome Web Store 托管和签名。这是依据两套官方执行/分发模型得出的边界判断，并非 Microsoft 发布了“扩展 ZIP 白名单”。如果 ZIP 携带并启动 native messaging host、EXE 或其他原生代码，该原生代码仍单独适用 SAC。 |

## 1. SAC 会评估哪些文件和应用

Microsoft 将 SAC 定义为“应用执行控制”，只允许被应用信誉服务识别为安全，或由受信任证书签名的应用和二进制运行。[SAC overview](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/overview)

范围上，官方开发者测试指南强调 SAC 会在二进制**加载时**评估它，因此需要覆盖：

- 安装与卸载使用的全部二进制；
- 应用所有功能路径加载的二进制；
- 被其他应用加载的集成组件，例如 Office add-in；
- 二进制和受支持脚本，而不只是主 EXE。

参见 [Test your app's signature with Smart App Control](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/test-your-app-with-smart-app-control)。该页还说明，发生安装失败时要从事件日志定位安装包内部被拦截的**具体文件**，说明一个安装包不是只按外壳做一次整体判断。

Microsoft 的 Windows 11 Security Book 进一步要求开发者签署所有应用代码，并明确点名 `exe`、`dll`、临时安装文件、脚本和卸载程序；它还说明 SAC 会阻止来自 Web 的未知脚本和宏。[Application and driver control](https://learn.microsoft.com/en-us/windows/security/book/application-security-application-and-driver-control)

SAC 完全建立在 Windows App Control 之上。Microsoft 对底层范围列出的典型对象还包括 MSI、命令行批处理，以及受约束模式下的交互式 PowerShell。[Application Control for Windows](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/appcontrol)

Microsoft 没有在 SAC 文档中提供一个可当作长期稳定契约的完整扩展名清单，因此更稳妥的规则是：凡是会作为 Windows 代码运行或加载的文件，都应按 SAC 兼容性验证；普通图片、JSON、HTML、CSS 或仅作为容器存在的 ZIP，不应仅因文件存在就被描述成 SAC 的执行对象。

## 2. 代码签名和信誉分别做什么

SAC 的官方决策顺序是：

1. 云端安全服务对应用作出高置信度判断；安全则允许，恶意或潜在不需要应用（PUA）则阻止。
2. 云端无法确定时检查签名；有效签名允许，未签名或无效签名按不受信任处理并阻止。

来源：[Smart App Control FAQ](https://support.microsoft.com/en-us/windows/smart-app-control-frequently-asked-questions-285ea03d-fa88-4d56-882e-6698afdb7003)。底层 App Control 文档进一步说明，信誉会随新信号变化，而已判定不安全的代码始终被阻止；签名不是对恶意判定的豁免。[App Control and Smart App Control](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/appcontrol#app-control-and-smart-app-control)

签名还必须满足 SAC 自己的技术条件：证书来自受信任提供者，并使用 RSA；SAC 当前不支持 ECC 签名。Microsoft 推荐 Trusted Signing，也支持使用受信任证书配合 SignTool。[Sign your app for Smart App Control compliance](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control)

因此：

- 未签名并不等于必然被挡；若云端能确认安全，仍可运行。
- 但“新、未知、未签名”正是最容易被拦截的组合。
- 有效受信任签名是未知信誉场景下更稳定的放行路径；自签名或仅有一个签名文件的外壳不能替代对实际加载二进制的完整签名。

## 3. 用 BAT 替代未签名 EXE 是否可靠

Microsoft 对底层 App Control 的说明很明确：它**不直接控制** Windows Command Processor（`cmd.exe`）运行的 `.bat`/`.cmd`，但批处理尝试启动的任何内容仍受 App Control 控制。[Script enforcement with App Control for Business](https://learn.microsoft.com/en-us/windows/security/application-security/application-control/app-control-for-business/design/script-enforcement#scripts-that-arent-directly-controlled-by-app-control)

所以应分两种情况：

- BAT 仍调用原来的未签名 `launcher.exe`：没有解决问题，EXE 运行时仍被评估。
- BAT 只调用系统已有且受信任的 Chrome/Edge，并让用户加载纯扩展目录：不再存在那个自制 EXE，因而可能避开**该 EXE**触发的 SAC；这属于移除原生二进制后的不同交付方案，不是稳定的 SAC 绕过保证。

Microsoft 也明确表示 SAC 当前没有“仅放行这一个应用”的绕过选项。[SAC FAQ](https://support.microsoft.com/en-us/windows/smart-app-control-frequently-asked-questions-285ea03d-fa88-4d56-882e-6698afdb7003)

对 MediaCookies，更稳妥的产品边界是不要把 EXE/BAT/CMD 启动器混入浏览器扩展包。若未来确实需要 Windows 原生助手，应把它作为独立、完整签名并单独验证的原生产物，而不是借 BAT 包装未签名 EXE。

## 4. Chrome 扩展 ZIP 是否适用 SAC

Chrome 官方将扩展 ZIP 定义为包含 `manifest.json` 和扩展文件的 **Chrome Web Store 上传包**。[Prepare your extension](https://developer.chrome.com/docs/webstore/prepare#zip-your-extension-files) 正式面向用户分发时，只有 Chrome Web Store 托管并签名的扩展可以被用户直接安装；Windows 上的站外分发只在企业策略管理场景受支持。[Distribute your extension](https://developer.chrome.com/docs/extensions/how-to/distribute)

结合 Microsoft 的“运行/加载代码时评估”模型，可以得出：

- 仅包含扩展 HTML、JS、CSS、图片和 manifest 的 ZIP，本身是上传/传输容器，不是 SAC 所说的 Windows 应用或二进制；无需为了 SAC 给这个 ZIP 配一个 Authenticode EXE 外壳。
- Chrome Web Store 对扩展的签名属于 Chrome 分发信任链，不等于 Windows 对 EXE/DLL 的代码签名，也不能替扩展中夹带的原生程序取得 SAC 信任。
- 如果扩展使用 native messaging，Chrome 会把 host binary 作为独立进程启动；这个二进制是单独的 Windows 执行对象，仍需按 SAC 规则签名和测试。[Chrome native messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging#native-messaging-host)

最终建议：MediaCookies 的 Chrome Web Store ZIP 保持为纯 Manifest V3 扩展包；开发测试时解压后用 Chrome 的“加载已解压的扩展程序”，正式分发走 Chrome Web Store。不要为了“避开 SAC”额外附带 BAT 或未签名 EXE，因为这会把一个浏览器扩展问题重新变成 Windows 原生代码信誉问题。
