import { NODE_REGISTRY } from '../nodes/registry.js'

export function runTransport(state) {
  const animations = []
  const nodeMap = Object.fromEntries(state.nodes.map(n => [n.id, n]))

  for (const edge of state.edges) {
    if (!edge.resource) continue
    const src = nodeMap[edge.from]
    const dst = nodeMap[edge.to]
    if (!src || !dst) continue

    const def = NODE_REGISTRY[dst.type]
    if (!def.accepts.includes(edge.resource)) continue

    const srcAmt = src.inventory[edge.resource] || 0
    if (srcAmt < 1) continue

    const dstTotal = Object.values(dst.inventory).reduce((s, v) => s + v, 0)
    if (dstTotal >= dst.inventoryCap) continue

    src.inventory[edge.resource] = srcAmt - 1
    if (src.inventory[edge.resource] === 0) delete src.inventory[edge.resource]
    src.inventory = { ...src.inventory }
    dst.inventory[edge.resource] = (dst.inventory[edge.resource] || 0) + 1
    dst.inventory = { ...dst.inventory }

    animations.push({
      edgeId: edge.id,
      resource: edge.resource,
      fromX: src.x,
      fromY: src.y,
      toX: dst.x,
      toY: dst.y,
    })
  }

  return animations
}
