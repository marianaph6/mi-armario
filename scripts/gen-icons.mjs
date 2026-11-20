// Genera los íconos PNG de la app (gancho blanco sobre fondo terracota).
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const BG = [184, 83, 47]
const FG = [255, 250, 244]

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

const segs = [
  [0.5, 0.4, 0.17, 0.66], [0.5, 0.4, 0.83, 0.66], [0.17, 0.66, 0.83, 0.66], [0.5, 0.4, 0.5, 0.33],
]
// gancho: arco desde abajo (90°) pasando por la derecha y arriba hasta la izquierda (-180°)
const arc = []
for (let a = -180; a < 90; a += 6) {
  const p = (d) => [0.5 + 0.065 * Math.cos((d * Math.PI) / 180), 0.265 + 0.065 * Math.sin((d * Math.PI) / 180)]
  arc.push([...p(a), ...p(a + 6)])
}
const all = [...segs, ...arc]

function crc32(buf) {
  let c, crc = ~0
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return ~crc >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size) {
  const raw = Buffer.alloc(size * (size * 3 + 1))
  const half = 0.024
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1)
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / size, py = (y + 0.5) / size
      let d = Infinity
      for (const s of all) d = Math.min(d, distSeg(px, py, ...s))
      const aa = 1 / size
      const m = Math.max(0, Math.min(1, (half + aa - d) / (2 * aa)))
      for (let c = 0; c < 3; c++) raw[row + 1 + x * 3 + c] = Math.round(BG[c] + (FG[c] - BG[c]) * m)
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ])
}
for (const s of [180, 192, 512]) writeFileSync(`public/icons/icon-${s}.png`, png(s))
console.log('íconos listos')
