import { readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

export async function readPngMetadata(path) {
  const buffer = await readFile(path)
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${path} is not a PNG file`)
  }

  const chunks = parseChunks(buffer)
  const ihdr = chunks.find((chunk) => chunk.type === 'IHDR')?.data
  if (!ihdr || ihdr.length !== 13) throw new Error(`${path} has no valid IHDR chunk`)

  const width = ihdr.readUInt32BE(0)
  const height = ihdr.readUInt32BE(4)
  const bitDepth = ihdr[8]
  const colorType = ihdr[9]
  const compression = ihdr[10]
  const filter = ihdr[11]
  const interlace = ihdr[12]
  if (compression !== 0 || filter !== 0) throw new Error(`${path} uses unsupported PNG encoding`)

  return {
    path,
    width,
    height,
    bitDepth,
    colorType,
    interlace,
    hasAlpha: colorType === 4 || colorType === 6 || chunks.some((chunk) => chunk.type === 'tRNS'),
    alphaBounds: colorType === 6 && bitDepth === 8 && interlace === 0
      ? decodeAlphaBounds(chunks, width, height)
      : null,
  }
}

function parseChunks(buffer) {
  const chunks = []
  let offset = 8
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('ascii', offset + 4, offset + 8)
    const dataStart = offset + 8
    const dataEnd = dataStart + length
    if (dataEnd + 4 > buffer.length) throw new Error('Truncated PNG chunk')
    chunks.push({ type, data: buffer.subarray(dataStart, dataEnd) })
    offset = dataEnd + 4
    if (type === 'IEND') break
  }
  return chunks
}

function decodeAlphaBounds(chunks, width, height) {
  const compressed = Buffer.concat(
    chunks.filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.data),
  )
  const inflated = inflateSync(compressed)
  const bytesPerPixel = 4
  const stride = width * bytesPerPixel
  const expectedLength = height * (stride + 1)
  if (inflated.length !== expectedLength) throw new Error('Unexpected RGBA PNG scanline length')

  let previous = Buffer.alloc(stride)
  let offset = 0
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < height; y += 1) {
    const filterType = inflated[offset]
    offset += 1
    const filtered = inflated.subarray(offset, offset + stride)
    offset += stride
    const row = unfilterRow(filtered, previous, filterType, bytesPerPixel)

    for (let x = 0; x < width; x += 1) {
      if (row[(x * bytesPerPixel) + 3] > 0) {
        minX = Math.min(minX, x)
        minY = Math.min(minY, y)
        maxX = Math.max(maxX, x)
        maxY = Math.max(maxY, y)
      }
    }
    previous = row
  }

  return maxX >= 0 ? { minX, minY, maxX, maxY } : null
}

function unfilterRow(filtered, previous, filterType, bytesPerPixel) {
  const row = Buffer.alloc(filtered.length)
  for (let index = 0; index < filtered.length; index += 1) {
    const left = index >= bytesPerPixel ? row[index - bytesPerPixel] : 0
    const up = previous[index] ?? 0
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] ?? 0 : 0
    const value = filtered[index]
    if (filterType === 0) row[index] = value
    else if (filterType === 1) row[index] = (value + left) & 0xff
    else if (filterType === 2) row[index] = (value + up) & 0xff
    else if (filterType === 3) row[index] = (value + Math.floor((left + up) / 2)) & 0xff
    else if (filterType === 4) row[index] = (value + paeth(left, up, upLeft)) & 0xff
    else throw new Error(`Unsupported PNG filter type: ${filterType}`)
  }
  return row
}

function paeth(left, up, upLeft) {
  const prediction = left + up - upLeft
  const leftDistance = Math.abs(prediction - left)
  const upDistance = Math.abs(prediction - up)
  const upLeftDistance = Math.abs(prediction - upLeft)
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left
  if (upDistance <= upLeftDistance) return up
  return upLeft
}
