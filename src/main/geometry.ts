import type { Point, Rect, Size } from '../shared/types'
export function clampPosition(p: Point, size: Size, areas: Rect[]): Point {
  if (!areas.length) return { x: 0, y: 0 }
  const candidates = areas.map(a => ({ x: Math.round(Math.max(a.x, Math.min(p.x, a.x + Math.max(0, a.width - size.width)))), y: Math.round(Math.max(a.y, Math.min(p.y, a.y + Math.max(0, a.height - size.height)))) }))
  return candidates.reduce((best, q) => Math.hypot(q.x-p.x, q.y-p.y) < Math.hypot(best.x-p.x, best.y-p.y) ? q : best)
}
export const isDrag = (a: Point, b: Point) => Math.hypot(a.x-b.x, a.y-b.y) > 5
export const pointInRegions = (p: Point, regions: Rect[]) => regions.some(r => p.x >= r.x && p.y >= r.y && p.x < r.x+r.width && p.y < r.y+r.height)
