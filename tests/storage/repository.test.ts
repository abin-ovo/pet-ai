import { mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { Repository } from '../../src/main/storage/repository'
import { createSnapshot } from '../../src/shared/defaults'
it('restores a saved relationship and falls back to the last valid backup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'xiaotuan-store-'))
  const repo = new Repository(dir)
  const s = createSnapshot(0); s.pet.name = '年糕'
  await repo.save(s)
  await repo.save({ ...s, pet: { ...s.pet, name: '团团' } })
  expect((await repo.load()).snapshot.pet.name).toBe('团团')
  await writeFile(join(dir, 'pet.json'), 'broken')
  const recovered = await repo.load()
  expect(recovered.recovered).toBe(true)
  expect(recovered.snapshot.pet.name).toBe('年糕')
})
it('does not overwrite a newer schema and preserves corrupt files for recovery', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'xiaotuan-store-'))
  await writeFile(join(dir, 'pet.json'), JSON.stringify({ version: 99 }))
  await expect(new Repository(dir).load()).rejects.toThrow('较新版本')
  expect(JSON.parse(await readFile(join(dir, 'pet.json'), 'utf8')).version).toBe(99)
  await writeFile(join(dir, 'pet.json'), '{broken')
  const loaded = await new Repository(dir).load()
  expect(loaded.recovered).toBe(true)
  expect((await readdir(dir)).some(f => f.includes('.corrupt-'))).toBe(true)
})
it('preserves the primary file when writing a temporary file fails', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'xiaotuan-store-'))
  const good = createSnapshot(0); good.pet.name = '保留'
  await new Repository(dir).save(good)
  const fail = new Repository(dir, async () => { throw new Error('disk full') })
  await expect(fail.save(createSnapshot(1))).rejects.toThrow('disk full')
  expect((await new Repository(dir).load()).snapshot.pet.name).toBe('保留')
})
