import { runTick } from './engine/tick.js'
import { NODE_TYPES } from './nodes/registry.js'

let _id = 1
function nextId() { return String(_id++) }

export const state = $state({
  nodes: [],
  edges: [],
  tick: 0,
  running: true,
  animations: [],
})

export const ui = $state({ nodeTypeIdx: 0 })

export function cycleNodeType() {
  ui.nodeTypeIdx = (ui.nodeTypeIdx + 1) % NODE_TYPES.length
}

let _interval = null

function tick() {
  if (!state.running) return
  state.animations = runTick(state)
  state.tick++
}

export function startLoop() {
  if (_interval) return
  _interval = setInterval(tick, 1000)
}

export function stopLoop() {
  clearInterval(_interval)
  _interval = null
}

export function toggleRunning() {
  state.running = !state.running
}

export function addNode(type, x, y) {
  state.nodes.push({ id: nextId(), type, x, y, inventory: {} })
}

export function removeNode(id) {
  state.nodes = state.nodes.filter(n => n.id !== id)
  state.edges = state.edges.filter(e => e.from !== id && e.to !== id)
}

export function addEdge(from, to) {
  if (from === to) return
  if (state.edges.some(e => e.from === from && e.to === to)) return
  state.edges.push({ id: nextId(), from, to, resource: null })
}

export function removeEdge(id) {
  state.edges = state.edges.filter(e => e.id !== id)
}

export function setEdgeResource(id, resource) {
  const edge = state.edges.find(e => e.id === id)
  if (edge) edge.resource = resource
}
