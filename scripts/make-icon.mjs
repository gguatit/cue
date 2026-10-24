import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const SS = 4
const S = 512
const C = (S / 2) * SS

const TILE = [17, 17, 19, 255]
const WHITE = [250, 250, 250, 255]
const AMBER = [251, 191, 36, 255]

const W = S * SS
const px = new Uint8Array(W * W * 4)

for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    const r = 96 * SS
    const dx = Math.max(r - x, x - (W - 1 - r), 0)
    const dy = Math.max(r - y, y - (W - 1 - r), 0)
    if (Math.hypot(dx, dy) > r) continue
    const i = (y * W + x) * 4
    px[i] = TILE[0]; px[i + 1] = TILE[1]; px[i + 2] = TILE[2]; px[i + 3] = 255
  }
}

const rin = 124 * SS
const rout = 196 * SS
const capR = (rout - rin) / 2
const mid = (rin + rout) / 2
const gapHalf = 0.72
const cap1 = [C + mid * Math.cos(gapHalf), C + mid * Math.sin(gapHalf)]
const cap2 = [C + mid * Math.cos(gapHalf), C - mid * Math.sin(gapHalf)]

for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    let inside = false
    const d = Math.hypot(x - C, y - C)
    if (d >= rin && d <= rout && Math.abs(Math.atan2(y - C, x - C)) >= gapHalf) inside = true
    if (!inside) {
      const d1 = (x - cap1[0]) ** 2 + (y - cap1[1]) ** 2
      const d2 = (x - cap2[0]) ** 2 + (y - cap2[1]) ** 2
      if (d1 <= capR * capR || d2 <= capR * capR) inside = true
    }
    if (!inside) continue
    const i = (y * W + x) * 4
    px[i] = WHITE[0]; px[i + 1] = WHITE[1]; px[i + 2] = WHITE[2]; px[i + 3] = 255
  }
}

const dot = 52 * SS
for (let y = 0; y < W; y++) {
  for (let x = 0; x < W; x++) {
    if ((x - C) ** 2 + (y - C) ** 2 > dot * dot) continue
    const i = (y * W + x) * 4
    px[i] = AMBER[0]; px[i + 1] = AMBER[1]; px[i + 2] = AMBER[2]; px[i + 3] = 255
  }
}

const out = Buffer.alloc(S * S * 4)
for (let y = 0; y < S; y++) {
  for (let x = 0; x < S; x++) {
    let sr = 0, sg = 0, sb = 0, sa = 0
    for (let yy = 0; yy < SS; yy++) {
      for (let xx = 0; xx < SS; xx++) {
        const i = ((y * SS + yy) * W + x * SS + xx) * 4
        const a = px[i + 3] / 255
        sr += px[i] * a; sg += px[i + 1] * a; sb += px[i + 2] * a; sa += a
      }
    }
    const n = SS * SS
    const a = sa / n
    const o = (y * S + x) * 4
    out[o] = a > 0 ? Math.round(sr / sa) : 0
    out[o + 1] = a > 0 ? Math.round(sg / sa) : 0
    out[o + 2] = a > 0 ? Math.round(sb / sa) : 0
    out[o + 3] = Math.round(a * 255)
  }
}

let crcTable
function crc32(buf) {
  if (!crcTable) {
    crcTable = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const t = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(S, 0)
ihdr.writeUInt32BE(S, 4)
ihdr[8] = 8; ihdr[9] = 6
const raw = Buffer.alloc((S * 4 + 1) * S)
for (let y = 0; y < S; y++) {
  raw[y * (S * 4 + 1)] = 0
  out.copy(raw, y * (S * 4 + 1) + 1, y * S * 4, (y + 1) * S * 4)
}
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
])
writeFileSync(new URL('../app-icon.png', import.meta.url), png)
console.log('app-icon.png written')
