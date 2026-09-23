# TodoPlan

本地优先的 PC 桌面 Todo、完成记录与周/月/年复盘应用。

## 开发

```bash
npm install
npm run dev
```

## 构建与运行

```bash
npm run build
npm start
```

## 打包

Windows（默认 x64，同时生成 NSIS 安装包与便携版）：

```powershell
.\scripts\build-windows.ps1
# 或指定 ARM64
.\scripts\build-windows.ps1 -Architecture arm64
```

macOS（必须在 macOS 上运行，默认生成 Universal DMG 与 ZIP）：

```bash
bash ./scripts/build-mac.sh
# 也可指定 x64 或 arm64
bash ./scripts/build-mac.sh arm64
```

脚本默认依次执行 `npm ci`、测试、应用构建和安装包构建。Windows 产物放在 `out/windows/`，macOS 产物放在 `out/macos/`。本地依赖已经就绪时，Windows 可传入 `-SkipInstall`，macOS 可设置 `SKIP_INSTALL=1`。签名信息可通过 electron-builder 支持的环境变量提供；未配置证书时生成未签名的本地测试包。

应用数据保存在 Electron 的 `userData` 目录，核心文件为 `tasks.json`、`categories.json`、`settings.json`，每日首次写入前会在 `backups/` 创建备份。

## 架构

- `src/main`：Electron 生命周期、服务、IPC 和 JSON 文件访问。
- `src/preload`：通过 `contextBridge` 暴露最小强类型 API。
- `src/renderer`：Vue 3、Pinia、Vue Router 页面和组件。
- `src/shared`：跨 Main / Preload / Renderer 共享的数据与 IPC 类型。

周/月/年统计及 Markdown 报告只使用 `completedAt`，不会误用创建时间。
