const path = require('node:path')
process.env.electron_config_cache = path.resolve('.cache/electron')
if (process.argv.includes('--mirror')) process.env.ELECTRON_MIRROR = 'https://npmmirror.com/mirrors/electron/'
// Electron's installer still verifies against the checksum bundled with its package.
require('../node_modules/electron/install.js')
