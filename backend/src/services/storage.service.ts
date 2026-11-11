import { constants } from 'node:fs'
import { copyFile, mkdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { config } from '../config/env.js'

const storageRoot = resolve(process.cwd(), config.storage.directory)
const uploadsDir = join(storageRoot, 'uploads')
const processedDir = join(storageRoot, 'processed')

export async function ensureStorage() {
  await Promise.all([
    mkdir(uploadsDir, { recursive: true }),
    mkdir(processedDir, { recursive: true }),
  ])
}

export function safeExtension(originalName: string) {
  const match = /\.([a-zA-Z0-9]{1,8})$/.exec(originalName)
  return match ? `.${match[1].toLowerCase()}` : '.audio'
}

export async function persistUpload(sourcePath: string, originalName: string) {
  await ensureStorage()

  const audioId = `aud_${randomUUID().replaceAll('-', '')}`
  const filePath = join(uploadsDir, `${audioId}${safeExtension(originalName)}`)

  await copyFile(sourcePath, filePath, constants.COPYFILE_EXCL)
  return { audioId, filePath }
}

export async function removeStoredFile(filePath: string) {
  if (!resolve(filePath).startsWith(storageRoot)) return
  await unlink(filePath).catch(() => undefined)
}
