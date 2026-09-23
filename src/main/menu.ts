import { app, BrowserWindow, dialog, Menu, type MenuItemConstructorOptions } from 'electron'

export function installApplicationMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [createMacAppMenu()] : []),
    {
      label: '文件',
      submenu: [
        ...(isMac ? [] : [{ role: 'quit' as const, label: '退出' }]),
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' as const, label: '粘贴并匹配样式' },
          { role: 'delete' as const, label: '删除' },
          { role: 'selectAll' as const, label: '全选' },
          { type: 'separator' as const },
          { role: 'startSpeaking' as const, label: '开始朗读' },
          { role: 'stopSpeaking' as const, label: '停止朗读' },
        ] : [
          { role: 'delete' as const, label: '删除' },
          { type: 'separator' as const },
          { role: 'selectAll' as const, label: '全选' },
        ]),
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        ...(process.env.VITE_DEV_SERVER_URL ? [{ role: 'toggleDevTools' as const, label: '开发者工具' }] : []),
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '切换全屏' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        ...(isMac ? [{ role: 'zoom' as const, label: '缩放' }] : []),
        { role: 'close', label: '关闭窗口' },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const, label: '前置全部窗口' },
        ] : []),
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: 'TodoPlan 隐私政策',
          click: () => {
            const target = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
            if (!target) return
            target.show()
            target.focus()
            void target.webContents.executeJavaScript("window.location.hash = '#/privacy'").catch(() => undefined)
          },
        },
        { type: 'separator' },
        {
          label: '关于 TodoPlan',
          click: async () => {
            await dialog.showMessageBox({
              type: 'info',
              title: '关于 TodoPlan',
              message: 'TodoPlan',
              detail: `版本 ${app.getVersion()}\n本地优先的任务、完成记录与专注复盘应用。`,
              buttons: ['确定'],
            })
          },
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createMacAppMenu(): MenuItemConstructorOptions {
  return {
    label: app.name,
    submenu: [
      { role: 'about', label: '关于 TodoPlan' },
      { type: 'separator' },
      { role: 'services', label: '服务' },
      { type: 'separator' },
      { role: 'hide', label: '隐藏 TodoPlan' },
      { role: 'hideOthers', label: '隐藏其他' },
      { role: 'unhide', label: '全部显示' },
      { type: 'separator' },
      { role: 'quit', label: '退出 TodoPlan' },
    ],
  }
}
