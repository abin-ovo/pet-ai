import { app, BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import { clampPosition } from './geometry'
import type { Point, Tab } from '../shared/types'
export const PET_SIZE = { width: 360, height: 300 }
export const PANEL_SIZE = { width: 440, height: 640 }
export const workAreas = () => screen.getAllDisplays().map(d => d.workArea)
function createWindow(kind: 'pet' | 'panel') {
  const pet = kind === 'pet'
  const window = new BrowserWindow({ ...(pet ? PET_SIZE : PANEL_SIZE), icon: join(app.getAppPath(), 'resources/icon.png'), show: false, frame: false, transparent: pet, resizable: false, backgroundColor: pet ? '#00000000' : '#ffffff', alwaysOnTop: true, skipTaskbar: pet, focusable: !pet, acceptFirstMouse: true, title: '小团 · 你的桌面小伙伴', webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, sandbox: true, nodeIntegration: false, devTools: !process.env.XIAOTUAN_PRODUCTION } })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', e => e.preventDefault())
  window.webContents.session.setPermissionRequestHandler((_web, _permission, callback) => callback(false))
  if (process.env.ELECTRON_RENDERER_URL) void window.loadURL(`${process.env.ELECTRON_RENDERER_URL}?view=${kind}`)
  else void window.loadFile(join(__dirname, '../renderer/index.html'), { query: { view: kind } })
  return window
}
export function createWindows(position: Point | null) {
  const pet = createWindow('pet'), panel = createWindow('panel')
  const area = screen.getPrimaryDisplay().workArea
  const initial = position ?? { x: area.x + area.width - PET_SIZE.width - 24, y: area.y + area.height - PET_SIZE.height - 8 }
  const movePet = (p: Point) => { const next = clampPosition(p, PET_SIZE, workAreas()); pet.setPosition(next.x, next.y); return next }
  movePet(initial)
  pet.once('ready-to-show', () => pet.showInactive())
  let pending: Tab = 'pet'
  const openPanel = (tab: Tab) => {
    pending = tab
    const [x, y] = pet.getPosition()
    const next = clampPosition({ x: x - PANEL_SIZE.width - 12, y: y + PET_SIZE.height - PANEL_SIZE.height }, PANEL_SIZE, workAreas())
    panel.setPosition(next.x, next.y)
    panel.webContents.send('pet:tab', tab)
    if (panel.webContents.isLoading()) panel.webContents.once('did-finish-load', () => { panel.webContents.send('pet:tab', pending); panel.show(); panel.focus() })
    else { panel.show(); panel.focus() }
  }
  return { pet, panel, movePet, openPanel }
}
