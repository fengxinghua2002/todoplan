import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import type { SceneryImageResult } from '../../shared/types'
import type { StorageAdapter } from '../storage/StorageAdapter'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
}

export class SceneryService {
  constructor(private readonly storage: StorageAdapter) {}

  async countImages(directory: string): Promise<number> {
    return (await this.listImages(directory)).length
  }

  async getDailyImage(date: string, offset = 0): Promise<SceneryImageResult> {
    const settings = await this.storage.loadSettings()
    const directory = settings.sceneryDirectory?.trim()
    if (!directory) return { available: false }

    try {
      const images = await this.listImages(directory)
      if (!images.length) return { available: false }
      const parsedDate = Date.parse(`${date}T00:00:00Z`)
      const dayNumber = Number.isFinite(parsedDate) ? Math.floor(parsedDate / 86_400_000) : 0
      const safeOffset = Number.isInteger(offset) ? offset : 0
      const index = ((dayNumber + safeOffset) % images.length + images.length) % images.length
      const filePath = images[index]
      const extension = path.extname(filePath).toLowerCase()
      const data = await readFile(filePath)
      return {
        available: true,
        url: `data:${MIME_TYPES[extension]};base64,${data.toString('base64')}`,
        name: path.basename(filePath, extension),
        index,
        total: images.length,
      }
    } catch {
      return { available: false }
    }
  }

  private async listImages(directory: string): Promise<string[]> {
    const entries = await readdir(directory, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && MIME_TYPES[path.extname(entry.name).toLowerCase()])
      .map((entry) => path.join(directory, entry.name))
      .sort((left, right) => left.localeCompare(right, 'zh-CN', { numeric: true, sensitivity: 'base' }))
  }
}
