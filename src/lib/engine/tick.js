import { NODE_REGISTRY } from '../nodes/registry.js'
import { runTransport } from './transport.js'

export function runTick(state) {
  for (const node of state.nodes) {
    const def = NODE_REGISTRY[node.type]
    if (def && def.onTick) def.onTick(node)
  }

  return runTransport(state)
}
