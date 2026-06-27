import { SCALE_MIN, SCALE_MAX } from './registry.js'

export { SCALE_MIN, SCALE_MAX }

function svgRect() {
  return document.querySelector('#graph-svg').getBoundingClientRect()
}

export function svgCoords(evt, cam) {
  const rect = svgRect()
  const touch = evt.touches ? evt.touches[0] : evt
  const sx = touch.clientX - rect.left
  const sy = touch.clientY - rect.top
  return { x: (sx - cam.x) / cam.scale, y: (sy - cam.y) / cam.scale }
}

export function screenPt(clientX, clientY) {
  const rect = svgRect()
  return { x: clientX - rect.left, y: clientY - rect.top }
}

export function getTouchDist(t1, t2) {
  const dx = t1.clientX - t2.clientX
  const dy = t1.clientY - t2.clientY
  return Math.sqrt(dx * dx + dy * dy)
}

export function getTouchMid(t1, t2) {
  const rect = svgRect()
  return {
    x: (t1.clientX + t2.clientX) / 2 - rect.left,
    y: (t1.clientY + t2.clientY) / 2 - rect.top,
  }
}

export function edgeLine(from, to, radius) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
  const ux = dx / len
  const uy = dy / len
  return {
    x1: from.x + ux * (radius + 2),
    y1: from.y + uy * (radius + 2),
    x2: to.x - ux * (radius + 2),
    y2: to.y - uy * (radius + 2),
  }
}

export function arrowHead(x1, y1, x2, y2, radius) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return ''
  const ux = dx / len
  const uy = dy / len
  const tipX = x2 - ux * (radius + 2)
  const tipY = y2 - uy * (radius + 2)
  const baseX = tipX - ux * 12
  const baseY = tipY - uy * 12
  const perpX = -uy * 5
  const perpY = ux * 5
  return `M${tipX},${tipY} L${baseX + perpX},${baseY + perpY} L${baseX - perpX},${baseY - perpY} Z`
}

// Full edge geometry with optional perpendicular offset.
// offsetPx > 0 shifts the edge to the left (counter-clockwise) of direction from→to.
// Returns null if the edge is degenerate (length < 1).
export function computeEdgeGeometry(from, to, radius, offsetPx) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return null
  const ux = dx / len
  const uy = dy / len
  const perpX = -uy * offsetPx
  const perpY = ux * offsetPx
  // Virtual node centres after the perpendicular shift
  const vfx = from.x + perpX
  const vfy = from.y + perpY
  const vtx = to.x + perpX
  const vty = to.y + perpY
  return {
    // Clipped line endpoints (pulled in by node radius so the line starts/ends at the circle edge)
    x1: vfx + ux * (radius + 2),
    y1: vfy + uy * (radius + 2),
    x2: vtx - ux * (radius + 2),
    y2: vty - uy * (radius + 2),
    // Midpoint of the offset line (for icon and context-menu placement)
    mx: (vfx + vtx) / 2,
    my: (vfy + vty) / 2,
    // Full virtual node centres (passed to arrowHead)
    vfx, vfy, vtx, vty,
  }
}
