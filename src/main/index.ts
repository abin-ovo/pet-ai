import { app, BrowserWindow, dialog, safeStorage, screen, Menu } from 'electron'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Repository } from './storage/repository'
import { CredentialStore } from './storage/credentials'
import { Store } from './store'
import { createWindows, PET_SIZE, PANEL_SIZE, workAreas } from './windows'
import { pointInRegions, clampPosition } from './geometry'
import { registerIpc } from './ipc'
import { createTray } from './tray'
import { ChatController } from './ai/controller'
import { requestReply } from './ai/client'
import { reduceSnapshot } from '../pet/commands'
import { tickPet, pickIdle } from '../pet/engine'
import { validateCommand } from '../shared/validation'
import type { Point, Rect, RuntimeStatus, Tab } from '../shared/types'

app.setName('小团')
if (!app.isPackaged && process.env.XIAOTUAN_DATA_DIR) {
  mkdirSync(process.env.XIAOTUAN_DATA_DIR, { recursive: true })
  app.setPath('userData', process.env.XIAOTUAN_DATA_DIR)
}
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()
let quitting = false
let requestQuit = () => app.quit()
let showApp = () => {}
app.on('second-instance', () => showApp())
app.on('activate', () => showApp())
app.on('window-all-closed', () => {})
if (gotLock) void app.whenReady().then(async () => {
  app.dock?.setIcon(join(app.getAppPath(), 'resources/icon.png'))
  const repository = new Repository(app.getPath('userData'))
  let initial: Awaited<ReturnType<Repository['load']>>
  try { initial = await repository.load() }
  catch (e) { dialog.showErrorBox('无法打开小团存档', e instanceof Error ? e.message : '无法读取本机存档'); app.quit(); return }
  const windows = createWindows(initial.snapshot.position)
  const credentials = new CredentialStore(app.getPath('userData'), { available: () => safeStorage.isEncryptionAvailable(), encrypt: text => safeStorage.encryptStringAsync(text), decrypt: async bytes => (await safeStorage.decryptStringAsync(bytes)).result })
  let connected = false
  try { connected = Boolean(initial.snapshot.connection && await credentials.read(initial.snapshot.connection.endpoint)) } catch { /* Existing locked key remains untouched; settings can remove the connection. */ }
  const runtime: RuntimeStatus = { connected, busy: false, recovered: initial.recovered, storageError: false, hidden: false }
  const broadcast = (channel: string, value: unknown) => { for (const w of [windows.pet, windows.panel]) if (!w.isDestroyed()) w.webContents.send(channel, value) }
  const publishStatus = () => broadcast('pet:status-changed', runtime)
  const store = new Store(initial.snapshot, repository, s => broadcast('pet:changed', s), failed => { runtime.storageError = failed; publishStatus() })
  const chat = new ChatController({ snapshot: () => store.snapshot, update: change => store.update(change), readKey: () => credentials.read(store.snapshot.connection?.endpoint), request: requestReply, onBusy: busy => { runtime.busy = busy; publishStatus() } })
  let resetAnimation: ReturnType<typeof setTimeout> | undefined
  const resetLater = () => { clearTimeout(resetAnimation); resetAnimation = setTimeout(() => { resetAnimation = undefined; void store.update(s => ({ ...s, pet: { ...s.pet, animation: s.settings.quiet ? 'sleep' : 'idle' } }), false).catch(() => {}) }, 3200) }
  const dispatch = async (input: unknown) => {
    const command = validateCommand(input)
    if (runtime.busy && (command.type === 'messages-clear' || command.type === 'message-delete' || command.type.startsWith('memory-'))) chat.cancel()
    const oldSettings = store.snapshot.settings
    if (command.type === 'settings' && command.patch.launchAtLogin !== undefined) {
      app.setLoginItemSettings({ openAtLogin: command.patch.launchAtLogin })
    }
    try { await store.update(s => reduceSnapshot(s, command, Date.now())) }
    catch (e) { if (command.type === 'settings' && command.patch.launchAtLogin !== undefined) app.setLoginItemSettings({ openAtLogin: oldSettings.launchAtLogin }); throw e }
    windows.pet.setAlwaysOnTop(store.snapshot.settings.alwaysOnTop)
    windows.panel.setAlwaysOnTop(store.snapshot.settings.alwaysOnTop)
    if (command.type === 'care') resetLater()
  }
  const hide = () => { windows.pet.hide(); windows.panel.hide(); runtime.hidden = true; publishStatus() }
  const showPet = () => { windows.pet.showInactive(); runtime.hidden = false; publishStatus() }
  const openPanel = (tab: Tab) => { showPet(); windows.openPanel(tab) }
  showApp = () => openPanel('pet')
  let hitRegions: Rect[] = []
  let drag: { cursor: Point; origin: Point; moved: boolean } | null = null
  registerIpc({ store, chat, credentials, ...windows, status: () => ({ ...runtime }), setConnected: v => { runtime.connected = v; publishStatus() }, dispatch, hide, openPanel, setHitRegions: regions => { hitRegions = regions }, drag: command => {
    const point = { x: command.screenX, y: command.screenY }
    if (command.phase === 'start') { const [x,y] = windows.pet.getPosition(); drag = { cursor: point, origin: { x,y }, moved: false }; return }
    if (!drag) return
    if (command.phase === 'move') {
      if (Math.hypot(point.x-drag.cursor.x, point.y-drag.cursor.y) <= 5 && !drag.moved) return
      drag.moved = true
      windows.movePet({ x: drag.origin.x+point.x-drag.cursor.x, y: drag.origin.y+point.y-drag.cursor.y })
      if (store.snapshot.pet.animation !== 'lifted') void store.update(s => ({ ...s, pet: { ...s.pet, animation: 'lifted' } }), false)
    } else {
      const moved = drag.moved; drag = null
      if (moved) { const [x,y] = windows.pet.getPosition(); void store.update(s => ({ ...s, position: { x,y }, pet: { ...s.pet, animation: 'land' } })).then(resetLater).catch(() => {}) }
    }
  } })
  windows.pet.setAlwaysOnTop(store.snapshot.settings.alwaysOnTop)
  windows.panel.setAlwaysOnTop(store.snapshot.settings.alwaysOnTop)
  windows.panel.on('close', e => { if (!quitting) { e.preventDefault(); windows.panel.hide() } })
  windows.pet.on('close', e => { if (!quitting) { e.preventDefault(); hide() } })
  const timers: ReturnType<typeof setInterval>[] = []
  let ignored: boolean | null = null
  timers.push(setInterval(() => {
    if (!windows.pet.isVisible() || windows.pet.isDestroyed()) return
    const cursor = screen.getCursorScreenPoint(), [x,y] = windows.pet.getPosition()
    const ignore = !drag && !pointInRegions({ x: cursor.x-x, y: cursor.y-y }, hitRegions)
    if (ignore !== ignored) { ignored = ignore; windows.pet.setIgnoreMouseEvents(ignore, { forward: true }) }
  }, 100))
  timers.push(setInterval(() => {
    if (runtime.hidden || drag || resetAnimation) return
    void store.update(s => {
      const pet = tickPet(s.pet, Date.now(), s.settings.quiet)
      const animation = s.settings.quiet ? 'sleep' : pickIdle(pet, Math.random())
      if (animation === 'walk' && !s.settings.reducedMotion) {
        const [x,y] = windows.pet.getPosition()
        const originalArea = screen.getDisplayMatching(windows.pet.getBounds()).workArea
        const p = clampPosition({ x: x+(Math.random()-.5)*30, y }, PET_SIZE, [originalArea]); windows.pet.setPosition(p.x,p.y)
      }
      return { ...s, pet: { ...pet, animation } }
    }, false).catch(() => {})
  }, 12000))
  timers.push(setInterval(() => { const [x,y] = windows.pet.getPosition(); void store.update(s => ({ ...s, position: { x,y } })).catch(() => {}) }, 60000))
  const correctPosition = () => {
    const [x,y] = windows.pet.getPosition(); windows.movePet({ x,y })
    const [px,py] = windows.panel.getPosition(), p = clampPosition({ x:px,y:py }, PANEL_SIZE, workAreas()); windows.panel.setPosition(p.x,p.y)
  }
  screen.on('display-removed', correctPosition); screen.on('display-metrics-changed', correctPosition)
  requestQuit = () => { if (quitting) return; quitting = true; chat.cancel(); clearTimeout(resetAnimation); timers.forEach(clearInterval); void store.flush().catch(() => {}).finally(() => app.quit()) }
  app.on('before-quit', e => { if (!quitting) { e.preventDefault(); requestQuit() } })
  const tray = createTray({ show: () => openPanel('pet'), hide, quiet: () => { void dispatch({ type: 'settings', patch: { quiet: !store.snapshot.settings.quiet } }).catch(() => {}) }, isQuiet: () => store.snapshot.settings.quiet, settings: () => openPanel('settings'), quit: () => requestQuit() })
  app.on('will-quit', () => tray.destroy())
  if (process.platform === 'darwin') Menu.setApplicationMenu(Menu.buildFromTemplate([{ label: '小团', submenu: [{ label: '看看小团', click: () => openPanel('pet') }, { label: '设置', accelerator: 'Cmd+,', click: () => openPanel('settings') }, { type: 'separator' }, { label: '退出小团', accelerator: 'Cmd+Q', click: () => requestQuit() }] }, { role: 'editMenu' }]))
  else Menu.setApplicationMenu(null)
  if (!store.snapshot.onboardingComplete) openPanel('pet')
}).catch(() => { dialog.showErrorBox('小团暂时没能启动', '请重新启动。如果问题持续，请检查本机存档目录的访问权限。'); app.quit() })
