import { gs } from './state.svelte.js'
import { NODE_RADIUS } from './registry.js'
import { svgCoords, screenPt, getTouchDist, getTouchMid, computeEdgeGeometry, SCALE_MIN, SCALE_MAX } from './camera.js'

export const EDGE_OFFSET = 10

export function computeReverseEdgeIds(edges) {
  const seen = new Set()
  const result = new Set()
  for (const e of edges) {
    const revKey = `${e.to}:${e.from}`
    if (seen.has(revKey)) {
      result.add(e.id)
      const rev = edges.find(r => r.from === e.to && r.to === e.from)
      if (rev) result.add(rev.id)
    } else {
      seen.add(`${e.from}:${e.to}`)
    }
  }
  return result
}

// Non-reactive interaction state (module-level, lives for the app lifetime)
let panState = null
let isPinching = false
let pinchState = null

export function getNodeAt(x, y) {
  for (let i = gs.nodes.length - 1; i >= 0; i--) {
    const n = gs.nodes[i]
    const dx = n.x - x, dy = n.y - y
    if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) return n
  }
  return null
}

export function getEdgeAt(x, y, reverseEdgeIds) {
  for (const e of gs.edges) {
    const from = gs.nodes.find(n => n.id === e.from)
    const to = gs.nodes.find(n => n.id === e.to)
    if (!from || !to) continue
    const dx = to.x - from.x, dy = to.y - from.y
    const len2 = dx * dx + dy * dy
    if (len2 === 0) continue
    const len = Math.sqrt(len2)
    const offset = reverseEdgeIds.has(e.id) ? EDGE_OFFSET : 0
    const perpX = -(dy / len) * offset
    const perpY = (dx / len) * offset
    const fx = from.x + perpX, fy = from.y + perpY
    const tx = to.x + perpX, ty = to.y + perpY
    const edx = tx - fx, edy = ty - fy
    const t = Math.max(0, Math.min(1, ((x - fx) * edx + (y - fy) * edy) / len2))
    const px = fx + t * edx - x
    const py = fy + t * edy - y
    if (px * px + py * py < 15 * 15) return e
  }
  return null
}

export function onSvgPointerDown(evt) {
  if (isPinching) return
  evt.preventDefault()
  evt.currentTarget.setPointerCapture(evt.pointerId)
  const { x, y } = svgCoords(evt, gs.cam)
  const node = getNodeAt(x, y)

  if (gs.mode === 'select') {
    if (node) {
      gs.selectedId = node.id
      gs.selectedEdgeId = null
      gs.edgeTapPos = null
      gs.isDragging = false
      gs.dragState = { nodeId: node.id, startX: x, startY: y, nodeStartX: node.x, nodeStartY: node.y }
    } else {
      const reverseEdgeIds = computeReverseEdgeIds(gs.edges)
      const edge = getEdgeAt(x, y, reverseEdgeIds)
      if (edge) {
        gs.selectedEdgeId = edge.id
        const efrom = gs.nodes.find(n => n.id === edge.from)
        const eto = gs.nodes.find(n => n.id === edge.to)
        if (efrom && eto) {
          const eoffset = reverseEdgeIds.has(edge.id) ? EDGE_OFFSET : 0
          const geo = computeEdgeGeometry(efrom, eto, NODE_RADIUS, eoffset)
          gs.edgeTapPos = geo ? { x: geo.mx, y: geo.my } : { x, y }
        } else {
          gs.edgeTapPos = { x, y }
        }
        gs.selectedId = null
      } else {
        gs.selectedId = null
        gs.selectedEdgeId = null
        gs.edgeTapPos = null
        const sc = screenPt(evt.clientX, evt.clientY)
        panState = { startScreenX: sc.x, startScreenY: sc.y, camStartX: gs.cam.x, camStartY: gs.cam.y }
      }
      gs.dragState = null
      gs.isDragging = false
    }
  } else if (gs.mode === 'connect') {
    if (node && node.id !== gs.connectSourceId) {
      const alreadyExists = gs.edges.some(e => e.from === gs.connectSourceId && e.to === node.id)
      if (!alreadyExists) {
        gs.edges = [...gs.edges, { id: gs.nextId++, from: gs.connectSourceId, to: node.id, resource: null }]
      }
      gs.connectSourceId = null
      gs.mode = 'select'
    } else if (!node) {
      gs.connectSourceId = null
      gs.mode = 'select'
    }
  }
}

export function onSvgPointerMove(evt) {
  if (isPinching) return
  if (panState) {
    evt.preventDefault()
    const sc = screenPt(evt.clientX, evt.clientY)
    gs.cam.x = panState.camStartX + (sc.x - panState.startScreenX)
    gs.cam.y = panState.camStartY + (sc.y - panState.startScreenY)
    return
  }
  if (!gs.dragState || gs.mode !== 'select') return
  evt.preventDefault()
  const { x, y } = svgCoords(evt, gs.cam)
  const dx = x - gs.dragState.startX, dy = y - gs.dragState.startY
  if (Math.abs(dx) > 4 || Math.abs(dy) > 4) gs.isDragging = true
  if (gs.isDragging) {
    const idx = gs.nodes.findIndex(n => n.id === gs.dragState.nodeId)
    if (idx !== -1) {
      const updated = [...gs.nodes]
      updated[idx] = { ...updated[idx], x: gs.dragState.nodeStartX + dx, y: gs.dragState.nodeStartY + dy }
      gs.nodes = updated
    }
  }
}

export function onSvgPointerUp() {
  panState = null
  if (gs.dragState && !gs.isDragging && gs.mode === 'select') {
    gs.selectedId = gs.dragState.nodeId
  }
  gs.dragState = null
  gs.isDragging = false
}

export function onSvgPointerCancel() {
  panState = null
  gs.dragState = null
  gs.isDragging = false
}

export function onTouchStart(evt) {
  if (evt.touches.length === 2) {
    isPinching = true
    gs.dragState = null
    gs.isDragging = false
    panState = null
    const t1 = evt.touches[0], t2 = evt.touches[1]
    pinchState = {
      startDist: getTouchDist(t1, t2),
      startMid: getTouchMid(t1, t2),
      camStartX: gs.cam.x, camStartY: gs.cam.y, camStartScale: gs.cam.scale,
    }
    evt.preventDefault()
  }
}

export function onTouchMove(evt) {
  if (!isPinching || evt.touches.length < 2) return
  evt.preventDefault()
  const t1 = evt.touches[0], t2 = evt.touches[1]
  const dist = getTouchDist(t1, t2)
  const mid = getTouchMid(t1, t2)
  const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, pinchState.camStartScale * (dist / pinchState.startDist)))
  const worldMidX = (pinchState.startMid.x - pinchState.camStartX) / pinchState.camStartScale
  const worldMidY = (pinchState.startMid.y - pinchState.camStartY) / pinchState.camStartScale
  gs.cam.x = mid.x - worldMidX * newScale
  gs.cam.y = mid.y - worldMidY * newScale
  gs.cam.scale = newScale
}

export function onTouchEnd(evt) {
  if (evt.touches.length < 2) { isPinching = false; pinchState = null }
}

export function onWheel(evt) {
  evt.preventDefault()
  const sc = screenPt(evt.clientX, evt.clientY)
  const factor = evt.deltaY > 0 ? 0.9 : 1.1
  const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, gs.cam.scale * factor))
  const worldX = (sc.x - gs.cam.x) / gs.cam.scale
  const worldY = (sc.y - gs.cam.y) / gs.cam.scale
  gs.cam.x = sc.x - worldX * newScale
  gs.cam.y = sc.y - worldY * newScale
  gs.cam.scale = newScale
}

// ── Node actions ──────────────────────────────────────────────────────────────

export function onConnectBtn() {
  gs.connectSourceId = gs.selectedId
  gs.mode = 'connect'
}

export function onDeleteNodeBtn() {
  const id = gs.selectedId
  gs.nodes = gs.nodes.filter(n => n.id !== id)
  gs.edges = gs.edges.filter(e => e.from !== id && e.to !== id)
  gs.selectedId = null
}

export function onCustomizeBtn() {
  gs.customizeId = gs.selectedId
}

export function setMerchantSellItem(nodeId, value) {
  gs.nodes = gs.nodes.map(n =>
    n.id === nodeId ? { ...n, settings: { ...n.settings, sellItem: value || null } } : n
  )
  gs.customizeId = null
}

// ── Edge actions ──────────────────────────────────────────────────────────────

export function onDeleteEdgeBtn() {
  gs.edges = gs.edges.filter(e => e.id !== gs.selectedEdgeId)
  gs.selectedEdgeId = null
  gs.edgeTapPos = null
}

export function onSetResourceBtn() {
  gs.edgePickerId = gs.selectedEdgeId
  gs.selectedEdgeId = null
  gs.edgeTapPos = null
}

export function setEdgeResource(edgeId, value) {
  gs.edges = gs.edges.map(e =>
    e.id === edgeId ? { ...e, resource: value || null } : e
  )
  gs.edgePickerId = null
}

// ── Tool drag (toolbar → canvas) ──────────────────────────────────────────────

export function startToolDrag(type, evt) {
  evt.preventDefault()
  evt.stopPropagation()
  evt.currentTarget.setPointerCapture(evt.pointerId)
  gs.toolDrag = { type, clientX: evt.clientX, clientY: evt.clientY }
  window.addEventListener('pointermove', moveToolDrag)
  window.addEventListener('pointerup', endToolDrag)
  window.addEventListener('pointercancel', cancelToolDrag)
}

function moveToolDrag(evt) {
  if (!gs.toolDrag) return
  gs.toolDrag = { ...gs.toolDrag, clientX: evt.clientX, clientY: evt.clientY }
}

function endToolDrag(evt) {
  window.removeEventListener('pointermove', moveToolDrag)
  window.removeEventListener('pointerup', endToolDrag)
  window.removeEventListener('pointercancel', cancelToolDrag)
  if (!gs.toolDrag) return
  const { type } = gs.toolDrag
  gs.toolDrag = null
  const svgEl = document.querySelector('#graph-svg')
  const svgR = svgEl.getBoundingClientRect()
  const cx = evt.clientX, cy = evt.clientY
  if (cx < svgR.left || cx > svgR.right || cy < svgR.top || cy > svgR.bottom) return
  gs.nodes = [...gs.nodes, gs.mkNode(type,
    (cx - svgR.left - gs.cam.x) / gs.cam.scale,
    (cy - svgR.top - gs.cam.y) / gs.cam.scale
  )]
}

function cancelToolDrag() {
  window.removeEventListener('pointermove', moveToolDrag)
  window.removeEventListener('pointerup', endToolDrag)
  window.removeEventListener('pointercancel', cancelToolDrag)
  gs.toolDrag = null
}
