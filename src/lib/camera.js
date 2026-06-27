export function createCamera() {
  return { x: 0, y: 0, scale: 1 }
}

export function screenToWorld(camera, sx, sy) {
  return {
    x: (sx - camera.x) / camera.scale,
    y: (sy - camera.y) / camera.scale,
  }
}

export function worldToScreen(camera, wx, wy) {
  return {
    x: wx * camera.scale + camera.x,
    y: wy * camera.scale + camera.y,
  }
}

export function applyPan(camera, dx, dy) {
  camera.x += dx
  camera.y += dy
}

export function applyZoom(camera, delta, cx, cy) {
  const factor = delta > 0 ? 0.9 : 1.1
  const newScale = Math.max(0.1, Math.min(10, camera.scale * factor))
  const ratio = newScale / camera.scale
  camera.x = cx - ratio * (cx - camera.x)
  camera.y = cy - ratio * (cy - camera.y)
  camera.scale = newScale
}
