import { expect, it } from 'vitest'
import { clampPosition, isDrag, pointInRegions } from '../../src/main/geometry'
it('keeps a pet on negative-coordinate displays and recovers from a removed display', () => {
  const displays = [{ x: -1200, y: 0, width: 1200, height: 800 }, { x: 0, y: 0, width: 1400, height: 900 }]
  expect(clampPosition({ x: -1000, y: 300 }, { width: 360, height: 260 }, displays)).toEqual({ x: -1000, y: 300 })
  expect(clampPosition({ x: 3000, y: 1400 }, { width: 360, height: 260 }, [displays[1]])).toEqual({ x: 1040, y: 640 })
  expect(clampPosition({ x: 900, y: 800 }, { width: 440, height: 640 }, [{ x: 0, y: 0, width: 800, height: 600 }])).toEqual({ x: 360, y: 0 })
})
it('distinguishes a drag from a click and excludes transparent empty space', () => {
  expect(isDrag({ x: 0, y: 0 }, { x: 6, y: 0 })).toBe(true)
  expect(isDrag({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(false)
  expect(pointInRegions({ x: 10, y: 10 }, [{ x: 20, y: 20, width: 100, height: 100 }])).toBe(false)
  expect(pointInRegions({ x: 30, y: 30 }, [{ x: 20, y: 20, width: 100, height: 100 }])).toBe(true)
})
