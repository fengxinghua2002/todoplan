import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const files = ['index.js', 'index.mjs'].map((name) => path.join(projectRoot, 'node_modules', 'vite-plugin-electron', 'dist', name))
const original = '    cp.execSync(`taskkill /pid ${pid} /T /F`);'
const replacement = [
  '    try {',
  '      cp.execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });',
  '    } catch {',
  '      // Electron may already have exited before Vite shuts down.',
  '    }',
].join('\n')

for (const file of files) {
  if (!fs.existsSync(file)) continue
  const source = fs.readFileSync(file, 'utf8')
  if (source.includes(replacement)) continue
  if (!source.includes(original)) throw new Error(`Unable to patch unexpected vite-plugin-electron file: ${file}`)
  fs.writeFileSync(file, source.replace(original, replacement), 'utf8')
}
