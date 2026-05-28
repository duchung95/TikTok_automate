/**
 * Zips the built artifacts into a dated archive on the Desktop.
 * Run via: pnpm package
 *
 * With vite-plugin-singlefile, all JS/CSS is inlined into index.html,
 * so users can open the HTML file directly — no server required.
 */
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve, join } from 'path'
import { homedir } from 'os'

const ROOT     = resolve(import.meta.dirname, '..')
const DIST     = join(ROOT, 'dist')
const DESKTOP  = join(homedir(), 'Desktop')
const DATE     = new Date().toISOString().slice(0, 10)   // YYYY-MM-DD
const OUT_FILE = join(DESKTOP, `flashpod_${DATE}.zip`)

if (!existsSync(DIST)) {
  console.error('❌  dist/ not found — run pnpm build first')
  process.exit(1)
}

// Zip only index.html and flashship_mapping.json — no assets folder needed
console.log(`📦  Zipping → ${OUT_FILE} …`)
execSync(
  `zip "${OUT_FILE}" index.html flashship_mapping.json`,
  { cwd: DIST, stdio: 'inherit' }
)

console.log('')
console.log('✅  Done!')
console.log(`   📁  ${OUT_FILE}`)
console.log('   Share the zip. Users unzip and open index.html directly in their browser.')

