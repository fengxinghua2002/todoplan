import path from 'node:path'
import type { ChildProcess, StdioOptions } from 'node:child_process'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron, { type ElectronOptions } from 'vite-plugin-electron'

type ProcessWithElectron = NodeJS.Process & { electronApp?: ChildProcess }

const electronStdio: StdioOptions = process.platform === 'win32'
  ? ['inherit', 'inherit', 'pipe', 'ipc']
  : process.platform === 'linux'
    ? ['inherit', 'inherit', 'inherit', 'ignore', 'ipc']
    : ['inherit', 'inherit', 'inherit', 'ipc']

type ElectronStartup = Parameters<NonNullable<ElectronOptions['onstart']>>[0]['startup']

async function startElectronWithoutWindowsNoise(startup: ElectronStartup): Promise<void> {
  await startup(undefined, { stdio: electronStdio })
  if (process.platform !== 'win32') return

  const electronApp = (process as ProcessWithElectron).electronApp
  const stderr = electronApp?.stderr
  if (!stderr) return

  let remainder = ''
  stderr.setEncoding('utf8')
  stderr.on('data', (chunk: string) => {
    const lines = `${remainder}${chunk}`.split(/\r?\n/)
    remainder = lines.pop() ?? ''
    for (const line of lines) {
      if (!isKnownWindowsNoise(line)) process.stderr.write(`${line}\n`)
    }
  })
  stderr.on('end', () => {
    if (remainder && !isKnownWindowsNoise(remainder)) process.stderr.write(remainder)
  })
}

function isKnownWindowsNoise(line: string): boolean {
  return line.includes('dns_config_service.cc') && line.includes('DNS config watch failed')
}

export default defineConfig({
  base: './',
  plugins: [
    vue(),
    electron([
      {
        entry: 'src/main/index.ts',
        onstart: ({ startup }) => startElectronWithoutWindowsNoise(startup),
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: { output: { format: 'cjs', entryFileNames: 'index.js' } },
          },
        },
      },
      {
        entry: 'src/preload/index.ts',
        onstart(options) { options.reload() },
        vite: {
          build: {
            outDir: 'dist-electron/preload',
            rollupOptions: { output: { format: 'cjs', entryFileNames: 'index.js' } },
          },
        },
      },
    ]),
  ],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  build: { outDir: 'dist/renderer' },
})
