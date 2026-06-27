import { NODE_REGISTRY, ANIM_DURATION } from './registry.js'
import { runTick } from './tick.js'

class GameState {
  nextId = $state(1)
  nodes = $state([])
  edges = $state([])
  animations = $state([])
  mode = $state('select')
  selectedId = $state(null)
  customizeId = $state(null)
  selectedEdgeId = $state(null)
  edgeTapPos = $state(null)
  edgePickerId = $state(null)
  connectSourceId = $state(null)
  speed = $state(1)
  inFlight = $state({})
  dragState = $state(null)
  isDragging = $state(false)
  toolDrag = $state(null)
  cam = $state({ x: 0, y: 0, scale: 1 })
  animFrame = $state(0)

  marketPrices = { food: Math.ceil(Math.random() * 3), wood: Math.ceil(Math.random() * 3), chair: Math.ceil(Math.random() * 3) }

  mkNode(type, x, y) {
    return {
      id: this.nextId++,
      type,
      x,
      y,
      buffer: {},
      settings: { ...NODE_REGISTRY[type].defaultSettings },
    }
  }

  launchAnim(fromX, fromY, resource, toId, toX, toY) {
    const anim = {
      id: this.nextId++,
      resource,
      x1: fromX, y1: fromY,
      x2: toX, y2: toY,
      startTime: performance.now(),
    }
    this.animations = [...this.animations, anim]
    this.inFlight = { ...this.inFlight, [toId]: (this.inFlight[toId] || 0) + 1 }
    setTimeout(() => {
      this.animations = this.animations.filter(a => a.id !== anim.id)
      this.inFlight = { ...this.inFlight, [toId]: Math.max(0, (this.inFlight[toId] || 0) - 1) }
      const idx = this.nodes.findIndex(n => n.id === toId)
      if (idx !== -1) {
        const dest = this.nodes[idx]
        const def = NODE_REGISTRY[dest.type]
        if (!def) return
        const total = Object.values(dest.buffer).reduce((s, v) => s + v, 0)
        if (total >= def.bufferCap) return
        const updated = [...this.nodes]
        updated[idx] = {
          ...dest,
          buffer: { ...dest.buffer, [resource]: (dest.buffer[resource] || 0) + 1 },
        }
        this.nodes = updated
      }
    }, ANIM_DURATION)
  }

  tick() {
    const { newNodes, anims } = runTick(this.nodes, this.edges, this.marketPrices, this.inFlight)
    this.nodes = newNodes
    for (const a of anims) {
      this.launchAnim(a.fromX, a.fromY, a.resource, a.toId, a.toX, a.toY)
    }
  }
}

export const gs = new GameState()
