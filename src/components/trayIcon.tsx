import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CAMOUFLAGE_COMPONENTS } from './camouflage'
import { slotFor } from '../lib/answer'
import alyacIconUrl from '../assets/alyac-icon.ico'

export interface TrayIconSpec {
  rgba: number[]
  width: number
  height: number
  tooltip: string
}

const cache = new Map<string, Promise<HTMLImageElement>>()

function iconImage(name: string): Promise<HTMLImageElement> | null {
  const Comp = CAMOUFLAGE_COMPONENTS[name]
  if (!Comp && name !== 'alyac') return null
  let p = cache.get(name)
  if (!p) {
    const src =
      name === 'alyac'
        ? alyacIconUrl
        : 'data:image/svg+xml;charset=utf-8,' +
          encodeURIComponent(
            renderToStaticMarkup(
              React.createElement(Comp, { size: 18, color: '#ffffff', strokeWidth: 2.2 }),
            ),
          )
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('icon'))
      img.src = src
    })
    cache.set(name, p)
  }
  return p
}

export async function renderTrayIcon(choice: string | null, glyph: string | null, tooltip: string): Promise<TrayIconSpec> {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#303036'
  ctx.beginPath()
  ctx.roundRect(2, 2, 28, 28, 7)
  ctx.fill()
  if (choice) {
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 19px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(choice.slice(0, 2), 16, 17)
  } else if (glyph) {
    const p = iconImage(glyph)
    if (p) {
      try {
        const img = await p
        const size = glyph === 'alyac' ? 26 : 18
        const off = (32 - size) / 2
        ctx.drawImage(img, off, off, size, size)
      } catch {
        /* 아이콘 로드 실패 시 배경만 유지 */
      }
    }
  }
  const data = ctx.getImageData(0, 0, 32, 32).data
  return { rgba: Array.from(data), width: 32, height: 32, tooltip }
}

export function answerGlyph(
  label: string,
  settings: { byAnswer: Record<string, string> },
): { choice: string | null; glyph: string | null } {
  const slot = slotFor(label)
  const mapping = slot ? settings.byAnswer[String(slot)] : undefined
  if (mapping && mapping !== 'char') return { choice: null, glyph: mapping }
  return { choice: label, glyph: null }
}
