# Graph Game 0.2 — Build Spec

## Stack
- Svelte 5 + Vite, dark theme (#0a0a0a bg, #111 surfaces, #222 borders)
- Canvas for graph rendering, Svelte overlays for UI panels
- Deploy target: GitHub Pages at /hermes-graph-game/

## Architecture — STRICTLY MODULAR
Keep files small and single-responsibility. Each node type and resource type lives in its own file.

## File structure to create:
```
src/
  main.js
  app.css
  App.svelte
  lib/
    state.svelte.js       — reactive game state ($state runes)
    camera.js             — pan/zoom helpers
    nodes/
      registry.js         — imports all node defs, exports NODE_REGISTRY object
      worker.js           — Worker node definition
      sea.js              — Sea node definition
    resources/
      registry.js         — imports all resource defs, exports RESOURCE_REGISTRY object
      labor.js            — labor resource definition
      fish.js             — fish resource definition
    engine/
      tick.js             — tick loop: calls each node's onTick, then transport phase
      transport.js        — edge transport: move 1 unit along each assigned edge per tick
    ui/
      GraphCanvas.svelte  — SVG/canvas graph: nodes, edges, animations
      NodeMenu.svelte     — right-click node context menu
      EdgeMenu.svelte     — right-click edge context menu (pick resource for edge)
```

## Node definition format (in each node file):
```js
export default {
  id: 'worker',
  label: 'Worker',
  icon: '👷',
  color: '#4ade80',
  accepts: [],           // resource IDs this node accepts as INPUT (empty = accepts nothing)
  inventoryCap: 1,       // max total items in inventory
  onTick(node) {
    // mutate node.inventory in place
    // node.inventory is a plain object: { resourceId: count }
    // return nothing
  }
}
```

## Resource definition format (in each resource file):
```js
export default {
  id: 'labor',
  label: 'Labor',
  icon: '🖐️',
  category: 'labor',
}
```

## Specific nodes to implement:

### Worker (src/lib/nodes/worker.js)
- accepts: []  (no inputs)
- inventoryCap: 1
- onTick: add 1 labor to inventory each tick, up to cap

### Sea (src/lib/nodes/sea.js)
- accepts: ['labor']
- inventoryCap: 10
- onTick: convert ALL labor in inventory to fish (1 labor → 1 fish), no accumulation of labor

## Resources:
- labor: id='labor', icon='🖐️', category='labor'
- fish: id='fish', icon='🐟', category='food'

## Edge resource picker (EdgeMenu.svelte):
- Show only resources that the TARGET node's `accepts` array contains
- Source node does NOT affect the choices

## Tick timing:
- 1 tick = 1 second real time
- Controlled by a setInterval in state.svelte.js

## Transport (transport.js):
- Each edge with an assigned resource: move 1 unit per tick from source.inventory to target.inventory
- Only move if: source has ≥1 of that resource AND target.inventory total < target.inventoryCap AND target.accepts includes the resource
- Produce animation data (fromX, fromY, toX, toY, resource) for GraphCanvas to render

## State shape (state.svelte.js):
```js
{
  nodes: [{ id, type, x, y, inventory: {} }],
  edges: [{ id, from, to, resource: null }],
  tick: 0,
  running: true,
}
```

## UI/UX:
- Dark theme throughout
- Pan with drag on empty canvas, zoom with scroll wheel
- Right-click node → NodeMenu (shows inventory, delete option)
- Right-click edge → EdgeMenu (pick resource from target's accepts list)
- Left-click empty canvas → place new node (cycle through node types or picker)
- Toolbar at bottom: play/pause, add node button
- Animate resource travel along edges (small icon moving from node to node)
- Show node inventory as small icons below the node circle
- Node circle shows node icon (emoji) centered

## DO NOT:
- Do not use TypeScript
- Do not add features beyond this spec
- Do not combine multiple node/resource types into one file
- Do not put game logic inside Svelte components — keep engine/ pure JS
