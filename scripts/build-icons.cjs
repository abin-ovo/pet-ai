const { execFileSync } = require('node:child_process')
const { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } = require('node:fs')
const { join, resolve } = require('node:path')
const { tmpdir } = require('node:os')

// Native macOS tools preserve the generated source's transparent corners.
// The resulting PNG, ICNS and ICO are reusable on every build platform.
if (process.platform !== 'darwin') throw new Error('Run icon generation on macOS; Windows builds can use the checked-in icon files.')
const root = resolve(__dirname, '..')
const source = join(root, 'docs/design/app-icon-source.png')
const resources = join(root, 'resources')
const temporary = mkdtempSync(join(tmpdir(), 'xiaotuan-icons-'))
const resize = (size, target) => execFileSync('sips', ['-z', String(size), String(size), source, '--out', target], { stdio: 'pipe' })
mkdirSync(resources, { recursive: true })
try {
  resize(1024, join(resources, 'icon.png'))
  const iconset = join(temporary, 'xiaotuan.iconset')
  mkdirSync(iconset)
  for (const size of [16, 32, 128, 256, 512]) {
    resize(size, join(iconset, `icon_${size}x${size}.png`))
    resize(size * 2, join(iconset, `icon_${size}x${size}@2x.png`))
  }
  execFileSync('iconutil', ['-c', 'icns', iconset, '-o', join(resources, 'icon.icns')], { stdio: 'pipe' })

  // Modern Windows ICO files support lossless PNG frames, including alpha.
  const sizes = [16, 24, 32, 48, 64, 128, 256]
  const header = Buffer.alloc(6 + 16 * sizes.length)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(sizes.length, 4)
  let offset = header.length
  const frames = sizes.map((size, index) => {
    const filename = join(temporary, `${size}.png`)
    resize(size, filename)
    const frame = readFileSync(filename)
    const entry = 6 + index * 16
    header[entry] = size === 256 ? 0 : size
    header[entry + 1] = header[entry]
    header.writeUInt16LE(1, entry + 4)
    header.writeUInt16LE(32, entry + 6)
    header.writeUInt32LE(frame.length, entry + 8)
    header.writeUInt32LE(offset, entry + 12)
    offset += frame.length
    return frame
  })
  writeFileSync(join(resources, 'icon.ico'), Buffer.concat([header, ...frames]))
  console.log('Generated resources/icon.png (1024px), icon.icns and icon.ico (16–256px).')
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
