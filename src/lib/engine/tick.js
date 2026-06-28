import { NODE_REGISTRY } from '../nodes/registry.js'
import { runTransport } from './transport.js'

export function runTick(state) {
  // Create new plain objects so Svelte 5 sees the inventory change (v0.1 pattern)
  const newNodes = state.nodes.map(n => ({ ...n, inventory: { ...n.inventory } }))

  for (const node of newNodes) {
    const def = NODE_REGISTRY[node.type]
    if (def && def.onTick) def.onTick(node, def)
  }

  const anims = runTransport(newNodes, state.edges)
  return { newNodes, anims }
}
