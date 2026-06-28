import { runTick } from './engine/tick.js'
import { NODE_TYPES, NODE_REGISTRY } from './nodes/registry.js'

let _id = 1
function nextId() { return String(_id++) }

export const state = $state({
  nodes: [],
  edges: [],
  tick: 0,
  running: true,
  animations: [],
  animFrame: 0,
  selectedId: null,
  selectedEdgeId: null,
  mode: 'select',        // 'select' | 'connect'
  connectSourceId: null,
  speed: 1,              // 0=paused, 1=normal, 3=fast
  cam: { x: 0, y: 0, scale: 1 },
  toolDrag: null,        // null | { type, clientX, clientY }
})

export const ANIM_DURATION = 500

export function launchAnim(fromX, fromY, resource, toX, toY) {
  const anim = {
    id: nextId(),
    resource,
    x1: fromX, y1: fromY,
    x2: toX, y2: toY,
    startTime: performance.now(),
  }
  state.animations = [...state.animations, anim]
  setTimeout(() => {
    state.animations = state.animations.filter(a => a.id !== anim.id)
  }, ANIM_DURATION + 50)
}

export const ui = $state({ nodeTypeIdx: 0 })

export function cycleNodeType() {
  ui.nodeTypeIdx = (ui.nodeTypeIdx + 1) % NODE_TYPES.length
}

let _interval = null
let _frame = 0
let _raf = null

function rafLoop() {
  state.animFrame = performance.now()
  _raf = requestAnimationFrame(rafLoop)
}

function tick() {
  if (state.speed === 0) return
  _frame++
  // speed=1: fire every 3rd frame at 333ms base ≈ 1/sec
  // speed=3: fire every frame ≈ 3/sec
  if (state.speed === 1 && _frame % 3 !== 0) return
  const { newNodes, anims } = runTick(state)
  state.nodes = newNodes
  for (const a of anims) {
    launchAnim(a.fromX, a.fromY, a.resource, a.toX, a.toY)
  }
  state.tick++
}

export function startLoop() {
  if (_interval) return
  _interval = setInterval(tick, 333)
  rafLoop()
}

export function stopLoop() {
  clearInterval(_interval)
  _interval = null
  if (_raf) cancelAnimationFrame(_raf)
  _raf = null
}

export function toggleRunning() {
  state.speed = state.speed === 0 ? 1 : 0
  state.running = state.speed > 0
}

export function addNode(type, x, y) {
  const def = NODE_REGISTRY[type]
  state.nodes.push({ id: nextId(), type, x, y, inventory: {}, inventoryCap: def?.inventoryCap ?? 10 })
}

export function removeNode(id) {
  state.nodes = state.nodes.filter(n => n.id !== id)
  state.edges = state.edges.filter(e => e.from !== id && e.to !== id)
  if (state.selectedId === id) state.selectedId = null
  if (state.connectSourceId === id) {
    state.mode = 'select'
    state.connectSourceId = null
  }
}

export function addEdge(from, to) {
  if (from === to) return
  if (state.edges.some(e => e.from === from && e.to === to)) return
  state.edges.push({ id: nextId(), from, to, resource: null })
}

export function removeEdge(id) {
  state.edges = state.edges.filter(e => e.id !== id)
  if (state.selectedEdgeId === id) state.selectedEdgeId = null
}

export function setEdgeResource(id, resource) {
  const edge = state.edges.find(e => e.id === id)
  if (edge) edge.resource = resource
}
