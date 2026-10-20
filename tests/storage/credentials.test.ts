import { mkdtemp, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { expect, it } from 'vitest'
import { CredentialStore } from '../../src/main/storage/credentials'
it('fails closed if platform encryption is not available', async () => {
  const store = new CredentialStore(await mkdtemp(join(tmpdir(), 'xiaotuan-key-')), { available: () => false, encrypt: async () => Buffer.alloc(0), decrypt: async () => '' })
  await expect(store.write('private-test-key')).rejects.toThrow('加密')
})
it('stores only encrypted bytes and can remove the credential', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'xiaotuan-key-'))
  // The system keychain is external; test its adapter with reversible non-plaintext bytes.
  const store = new CredentialStore(dir, { available: () => true, encrypt: async s => Buffer.from([...s].reverse().join('')), decrypt: async b => [...b.toString()].reverse().join('') })
  await store.write('private-test-key')
  expect((await readFile(join(dir, 'connection.key'))).toString()).not.toContain('private-test-key')
  expect(await store.read()).toBe('private-test-key')
  await store.clear()
  expect(await store.read()).toBeNull()
})
it('never returns a key for a different endpoint after a partial save or old-backup recovery', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'xiaotuan-key-'))
  const codec = { available: () => true, encrypt: async (s: string) => Buffer.from([...s].reverse().join('')), decrypt: async (b: Buffer) => [...b.toString()].reverse().join('') }
  const store = new CredentialStore(dir, codec)
  await store.write('new-service-key', 'https://new.test/chat')
  const restarted = new CredentialStore(dir, codec)
  expect(await restarted.read('https://old.test/chat')).toBeNull()
  expect(await restarted.read('https://new.test/chat')).toBe('new-service-key')
})
