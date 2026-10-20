import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
let app: ElectronApplication
let panel: Page
let pet: Page
let dir: string
test.describe.configure({ mode: 'serial' })
const launch = async (dataDir: string) => {
  const instance = await electron.launch({ args: ['.'], env: { ...process.env, XIAOTUAN_DATA_DIR: dataDir, ELECTRON_ENABLE_LOGGING: '1' } })
  await expect.poll(async () => instance.windows().length).toBe(2)
  const pages = instance.windows()
  return { app: instance, pet: pages.find(p => p.url().includes('view=pet'))!, panel: pages.find(p => p.url().includes('view=panel'))! }
}
test.beforeAll(async () => { dir = await mkdtemp(join(tmpdir(), 'xiaotuan-e2e-')); ({ app, pet, panel } = await launch(dir)) })
test.afterAll(async () => { if (app) await app.close() })
test('starts a secure transparent pet and completes a real local introduction', async () => {
  const errors: string[] = []; panel.on('pageerror', e => errors.push(e.message)); pet.on('pageerror', e => errors.push(e.message))
  await expect(panel).toHaveTitle('小团 · 你的桌面小伙伴')
  await expect(panel.getByRole('heading', { name: '嗨，以后就一起啦。' })).toBeVisible()
  await panel.getByLabel('给它起个名字').fill('年糕')
  await panel.getByRole('button', { name: '认识一下' }).click()
  await panel.getByRole('button', { name: '摸摸它' }).click()
  await panel.getByRole('button', { name: '喂它吃一点' }).click()
  await expect(panel.getByRole('heading', { name: '今天，也一起慢慢来。' })).toBeVisible()
  const backgrounds = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(w => w.getBackgroundColor()))
  expect(backgrounds).toContain('#000000')
  expect(await pet.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
  expect(await panel.evaluate(() => typeof (globalThis as { require?: unknown }).require)).toBe('undefined')
  expect(await pet.evaluate(() => typeof (globalThis as { process?: unknown }).process)).toBe('undefined')
  await expect(pet.getByRole('button', { name: '年糕' })).toBeVisible()
  await panel.screenshot({ path: '/tmp/xiaotuan-companion.png' })
  expect(errors).toEqual([])
})
test('persists quiet settings and memories, and makes disconnected chat explicit', async () => {
  const quiet = panel.getByRole('switch', { name: '安静陪伴', exact: true })
  await quiet.click()
  await expect(quiet).toBeChecked()
  await expect(pet.locator('.cat-motion')).toHaveAttribute('data-animation', 'sleep')
  await panel.getByRole('button', { name: '回忆', exact: true }).click()
  await panel.getByLabel('想让小团记住的事').fill('我喜欢下雨天喝热茶')
  await panel.getByRole('button', { name: '记住这件事' }).click()
  await expect(panel.locator('.memory-list')).toContainText('我喜欢下雨天喝热茶')
  await panel.getByRole('button', { name: '聊天', exact: true }).click()
  await expect(panel.getByText('聊天尚未连接', { exact: true })).toBeVisible()
  await panel.getByRole('button', { name: '去设置连接' }).click()
  await expect(panel.getByLabel('服务地址')).toBeVisible()
  await app.close()
  ;({ app, pet, panel } = await launch(dir))
  const snapshot = await panel.evaluate(() => window.xiaotuan.getSnapshot())
  expect(snapshot.pet.name).toBe('年糕')
  expect(snapshot.settings.quiet).toBe(true)
  expect(snapshot.memories[0].text).toBe('我喜欢下雨天喝热茶')
  await pet.evaluate(() => window.xiaotuan.openPanel('memories'))
  await panel.getByRole('button', { name: '删除回忆' }).click()
  await expect(panel.locator('.memory-list')).toHaveCount(0)
  expect(JSON.parse(await readFile(join(dir, 'pet.json'), 'utf8')).memories).toHaveLength(0)
  await panel.screenshot({ path: '/tmp/xiaotuan-memories.png' })
})
test('returns to autonomous behavior after a manual care animation ends', async () => {
  await panel.evaluate(() => window.xiaotuan.dispatch({ type: 'settings', patch: { quiet: false } }))
  await app.evaluate(() => { Math.random = () => 0.4 })
  await panel.evaluate(() => window.xiaotuan.dispatch({ type: 'care', action: 'play' }))
  await expect(pet.locator('.cat-motion')).toHaveAttribute('data-animation', 'play')
  await expect(pet.locator('.cat-motion')).toHaveAttribute('data-animation', 'groom', { timeout: 17000 })
})
test('pauses all visible animations when the companion is hidden', async () => {
  await pet.evaluate(() => window.xiaotuan.openPanel('pet'))
  await expect(panel.locator('.companion .cat-motion')).toBeVisible()
  expect(await panel.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBeGreaterThan(0)
  await pet.evaluate(() => window.xiaotuan.hide())
  await expect.poll(() => panel.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0)
  await expect.poll(() => pet.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length)).toBe(0)
  await pet.evaluate(() => window.xiaotuan.openPanel('pet'))
  await expect(panel.getByRole('heading', { name: '今天，也一起慢慢来。' })).toBeVisible()
})
test('sends configured chat through Chromium networking and saves its reply', async () => {
  // This HTTPS handler is available only to Chromium networking. Node fetch
  // cannot reach this test provider, so this also guards the production wiring.
  await app.evaluate(({ session }) => {
    session.defaultSession.protocol.handle('https', async request => {
      if (request.url !== 'https://provider.example.test/v1/chat/completions') return new Response('', { status: 404 })
      if (request.method !== 'POST' || request.headers.get('authorization') !== 'Bearer desktop-regression-key') return new Response('', { status: 403 })
      const body = await request.json()
      if (body.model !== 'desktop-test-model' || body.messages.at(-1)?.content !== '你好，小团') return new Response('', { status: 400 })
      return new Response(JSON.stringify({ choices: [{ message: { content: '你好，已经收到你的消息啦。' } }] }), { headers: { 'Content-Type': 'application/json' } })
    })
  })
  try {
    await panel.getByRole('button', { name: '设置', exact: true }).click()
    await panel.getByLabel('服务地址').fill('https://provider.example.test/v1/chat/completions')
    await panel.getByLabel('模型名称').fill('desktop-test-model')
    await panel.getByLabel('连接密钥').fill('desktop-regression-key')
    await panel.getByRole('button', { name: '保存连接', exact: true }).click()
    await expect(panel.getByText('连接已保存，可以去聊聊了', { exact: true })).toBeVisible()
    await panel.getByRole('button', { name: '聊天', exact: true }).click()
    const composer = panel.getByRole('textbox', { name: '想跟小团说点什么' })
    await composer.fill('你好，小团')
    await panel.getByRole('button', { name: '发送', exact: true }).click()
    await expect(panel.getByRole('log')).toContainText('你好，已经收到你的消息啦。')
    await expect(composer).toHaveValue('')
    const saved = JSON.parse(await readFile(join(dir, 'pet.json'), 'utf8'))
    expect(saved.messages.at(-1)).toMatchObject({ role: 'assistant', text: '你好，已经收到你的消息啦。' })
  } finally {
    await app.evaluate(({ session }) => session.defaultSession.protocol.unhandle('https'))
  }
})
test('reports exhausted API balance in settings and chat without losing the draft', async () => {
  await app.evaluate(({ session }) => {
    session.defaultSession.protocol.handle('https', () => new Response(JSON.stringify({ error: { code: 'credit_balance_exhausted', type: 'insufficient_quota', message: 'desktop-regression-key reflected by provider' } }), { status: 429, headers: { 'Content-Type': 'application/json' } }))
  })
  try {
    await panel.getByRole('button', { name: '设置', exact: true }).click()
    const before = await panel.evaluate(() => window.xiaotuan.getSnapshot())
    await panel.getByRole('button', { name: '检测连接', exact: true }).click()
    await expect(panel.locator('.settings-notice')).toContainText('API 预付余额已耗尽')
    await expect(panel.locator('.settings-notice')).not.toContainText('desktop-regression-key')
    const after = await panel.evaluate(() => window.xiaotuan.getSnapshot())
    expect(after.messages).toEqual(before.messages)
    expect(after.memories).toEqual(before.memories)
    expect(after.pet.bond).toBe(before.pet.bond)
    await panel.getByRole('button', { name: '聊天', exact: true }).click()
    const composer = panel.getByRole('textbox', { name: '想跟小团说点什么' })
    await composer.fill('额度不足时保留这句话')
    await panel.getByRole('button', { name: '发送', exact: true }).click()
    await expect(panel.locator('.chat-notice')).toContainText('API 预付余额已耗尽')
    await expect(composer).toHaveValue('额度不足时保留这句话')
  } finally {
    await app.evaluate(({ session }) => session.defaultSession.protocol.unhandle('https'))
  }
})
test('checks a recovered connection using only the synthetic test message', async () => {
  await app.evaluate(({ session }) => {
    session.defaultSession.protocol.handle('https', async request => {
      const body = await request.json()
      if (body.messages.length !== 1 || body.messages[0].role !== 'user' || body.messages[0].content !== '请只回复：连接成功') return new Response('', { status: 400 })
      return new Response(JSON.stringify({ choices: [{ message: { content: '连接成功' } }] }), { headers: { 'Content-Type': 'application/json' } })
    })
  })
  try {
    await panel.getByRole('button', { name: '设置', exact: true }).click()
    await panel.getByRole('button', { name: '检测连接', exact: true }).click()
    await expect(panel.locator('.settings-notice')).toContainText('连接正常，模型已成功回复')
    await panel.locator('.settings-notice').scrollIntoViewIfNeeded()
    await panel.screenshot({ path: '/tmp/xiaotuan-connection-check.png' })
  } finally {
    await app.evaluate(({ session }) => session.defaultSession.protocol.unhandle('https'))
  }
})
