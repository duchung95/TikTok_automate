/**
 * Zips the built artifacts into a dated archive on the Desktop.
 * Run via: pnpm package
 *
 * With vite-plugin-singlefile, all JS/CSS is inlined into index.html,
 * so users can open the HTML file directly — no server required.
 */
import { execSync } from 'child_process'
import { existsSync, copyFileSync, chmodSync } from 'fs'
import { resolve, join } from 'path'
import { homedir } from 'os'

const ROOT     = resolve(import.meta.dirname, '..')
const DIST     = join(ROOT, 'dist')
const SCRIPTS  = join(ROOT, 'scripts')
const DESKTOP  = join(homedir(), 'Desktop')
const DATE     = new Date().toISOString().slice(0, 10)   // YYYY-MM-DD
const OUT_FILE = join(DESKTOP, `flashpod_${DATE}.zip`)

if (!existsSync(DIST)) {
  console.error('❌  dist/ not found — run pnpm build first')
  process.exit(1)
}

// Copy start.command into dist/
const START_COMMAND_SRC = join(SCRIPTS, 'start.command')
const START_COMMAND_DEST = join(DIST, 'start.command')
copyFileSync(START_COMMAND_SRC, START_COMMAND_DEST)
chmodSync(START_COMMAND_DEST, 0o755) // Make it executable

// Zip index.html, flashship_mapping.json, and start.command
console.log(`📦  Zipping → ${OUT_FILE} …`)
execSync(
  `zip "${OUT_FILE}" index.html flashship_mapping.json start.command`,
  { cwd: DIST, stdio: 'inherit' }
)

console.log('')
console.log('✅  Done!')
console.log(`   📁  ${OUT_FILE}`)
console.log('   Share the zip. Users unzip and double-click start.command or open index.html directly in their browser.')

