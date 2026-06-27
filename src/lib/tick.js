import { NODE_REGISTRY } from './registry.js'

export function runTick(nodes, edges, marketPrices) {
  const newNodes = nodes.map(n => ({ ...n, buffer: { ...n.buffer } }))
  const anims = []

  // Phase 1: node production and conversion
  for (const node of newNodes) {
    const def = NODE_REGISTRY[node.type]
    if (!def) continue

    if (def.produces) {
      for (const [res, count] of Object.entries(def.produces)) {
        node.buffer[res] = (node.buffer[res] || 0) + count
      }
    }

    if (def.recipe) {
      const { inputs, outputs } = def.recipe
      const canProcess = Object.entries(inputs).every(([r, n]) => (node.buffer[r] || 0) >= n)
      if (canProcess) {
        for (const [r, n] of Object.entries(inputs)) {
          node.buffer[r] -= n
          if (node.buffer[r] === 0) delete node.buffer[r]
        }
        for (const [r, n] of Object.entries(outputs)) {
          node.buffer[r] = (node.buffer[r] || 0) + n
        }
      }
    }

    if (def.isMerchant) {
      const sellItem = node.settings?.sellItem ?? null
      if (sellItem && (node.buffer[sellItem] || 0) > 0) {
        node.buffer[sellItem] -= 1
        if (node.buffer[sellItem] === 0) delete node.buffer[sellItem]
        const coins = marketPrices[sellItem] || 1
        node.buffer['coin'] = (node.buffer['coin'] || 0) + coins
      }
    }
  }

  // Phase 2: edge-based transport
  for (const edge of edges) {
    if (!edge.resource) continue
    const fromNode = newNodes.find(n => n.id === edge.from)
    const toNode = newNodes.find(n => n.id === edge.to)
    if (!fromNode || !toNode) continue
    if ((fromNode.buffer[edge.resource] || 0) >= 1) {
      fromNode.buffer[edge.resource] -= 1
      if (fromNode.buffer[edge.resource] === 0) delete fromNode.buffer[edge.resource]
      anims.push({
        fromX: fromNode.x, fromY: fromNode.y,
        resource: edge.resource,
        toId: toNode.id, toX: toNode.x, toY: toNode.y,
      })
    }
  }

  return { newNodes, anims }
}
