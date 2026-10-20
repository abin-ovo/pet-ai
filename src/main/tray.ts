import { Tray, Menu, nativeImage, app } from 'electron'
import { join } from 'node:path'
export type TrayDependencies = { show(): void; hide(): void; quiet(): void; isQuiet(): boolean; settings(): void; quit(): void }
export function createTray(d: TrayDependencies): Tray {
  const icon = nativeImage.createFromPath(join(app.getAppPath(), process.platform === 'darwin' ? 'resources/trayTemplate.png' : 'resources/icon.png'))
  if (process.platform === 'darwin') icon.setTemplateImage(true)
  const tray = new Tray(icon.resize({ width: 18, height: 18 }))
  tray.setToolTip('小团 · 你的桌面小伙伴')
  const refresh = () => tray.setContextMenu(Menu.buildFromTemplate([
    { label: '看看小团', click: d.show }, { label: '暂时隐藏', click: d.hide },
    { label: '安静陪伴', type: 'checkbox', checked: d.isQuiet(), click: () => { d.quiet(); refresh() } },
    { type: 'separator' }, { label: '设置', click: d.settings }, { label: '退出小团', click: d.quit }
  ]))
  refresh()
  tray.on('right-click', refresh)
  tray.on('double-click', d.show)
  return tray
}
