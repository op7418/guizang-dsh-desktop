import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { test } from 'node:test'
import sharp from 'sharp'

const appRoot = resolve(import.meta.dirname, '..')

async function alphaBounds(file: string): Promise<{
  width: number
  height: number
  left: number
  top: number
}> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let minX = info.width
  let minY = info.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3]! <= 8) continue
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  return { width: maxX - minX + 1, height: maxY - minY + 1, left: minX, top: minY }
}

void test('native launcher art uses the macOS optical inset', async () => {
  assert.deepEqual(
    await alphaBounds(resolve(appRoot, 'assets/icons/1024x1024.png')),
    { width: 856, height: 856, left: 84, top: 84 },
  )
})

void test('in-app brand art does not inherit launcher padding', async () => {
  assert.deepEqual(
    await alphaBounds(resolve(appRoot, 'assets/brand-icon.png')),
    { width: 256, height: 256, left: 0, top: 0 },
  )
})
