# Graph Game — Design Document

*Prototype v1. Mobile-first sandbox. Last updated: June 2026.*

---

## Concept

A directed-graph resource-flow sandbox inspired by Mini Metro.
The player places nodes on a canvas and draws directed edges between them.
Resources are produced and converted inside nodes; edges control all transport between nodes.
No goals, no failure state — just a playground to experiment with flows.

---

## Tick

- Base tick: **500ms**
- Can be **paused**, **played**, or **fast-forwarded at 3× speed**
- All node logic and edge transport fires once per tick
- The graph is **fully editable at any time** — paused or running

---

## Resources

- Food  🥕  #f97316
- Wood  🪵  #92400e
- Chair 🪑  #d97706
- Coin  🪙  #fbbf24

---

## Node Types

### Farmer 👨‍🌾 (#65a30d)
- Produces 1 food per tick, no input needed
- No recipe, no settings, no customization

### Lumberjack 🪓 (#84cc16)
- Recipe: 1 food → 1 wood
- Each tick: if buffer has ≥ 1 food, consumes 1 food and produces 1 wood into its own buffer
- If no food in buffer: idle that tick
- Requires food to be routed in via an edge

### Carpenter 🔨 (#a78bfa)
- Recipe: 1 wood + 1 food → 1 chair
- Each tick: if buffer has ≥ 1 wood AND ≥ 1 food, consumes both and produces 1 chair
- If either ingredient is missing: idle that tick

### Merchant 🏪 (#f59e0b)
- Sells one specific resource per tick, converting it to coins at the market price
- `settings.sellItem` must be explicitly set by the player (a resource key like `'wood'`)
- If `sellItem === null` (default): merchant does nothing that tick
- If `sellItem` is set and buffer has ≥ 1 of that resource: removes 1 unit, adds coins (at market price) to its own buffer
- Coins are never sold — they must be routed out via edges to other nodes
- Market prices: randomly assigned 1–3 coins per resource at game start, fixed for the session
- The assigned `sellItem` emoji is shown to the **right** of the merchant node circle

### Chest 📦 (#6b7280)
- Accepts any resource including coins via incoming edges
- Never produces or converts anything
- Has a large buffer cap (100) — intended as a long-term accumulator
- Has no outgoing transport (edges from a chest can be drawn but will never fire unless the chest has resources in its buffer)

---

## Buffer Caps

Every node has a maximum total buffer size (`bufferCap`). When full, incoming resources are silently dropped.

- Farmer, Lumberjack, Carpenter, Merchant: **10**
- Chest: **100**

The cap counts total items across all resource types combined.

**In-flight tracking:** At fast speed (3× = tick every ~167ms), multiple animated resources can be in transit simultaneously. The cap check accounts for in-flight resources already en route to a node, preventing overshoot.

---

## Edge-Based Routing

**All resource transport is controlled by edges.** Nodes never broadcast randomly.

### Edge data
```
{ id, from, to, resource: null | 'food' | 'wood' | 'chair' | 'coin' }
```

### Transport logic (per tick, after node production/conversion)
For every edge where `edge.resource !== null`:
- If the **parent node's** buffer contains ≥ 1 of `edge.resource`:
  - Remove 1 from parent buffer
  - Animate the resource emoji travelling along the edge (~400ms)
  - Deliver 1 to child buffer when animation completes (cap-checked at delivery)
- If parent buffer is empty for that resource: edge does nothing this tick

If `edge.resource === null` (default for new edges): the edge is **inactive** — transport nothing.

### Tick sequence (each tick)
1. **Produce:** nodes with `produces` add output to their own buffer
2. **Convert:** nodes with recipes consume inputs and add outputs to their own buffer
3. **Merchant sell:** merchants with `sellItem` set convert one unit to coins
4. **Edge transport:** each active edge moves one resource unit from parent → child

---

## Edge Icons

Each edge displays a small emoji at its midpoint:
- `edge.resource === null`: no icon shown (edge is inactive)
- Otherwise: shows the resource emoji centred on the edge line (~14px SVG text)

---

## Parallel Edge Offset

When two edges connect the **same pair of nodes in opposite directions** (A→B and B→A), they are rendered as two parallel lines:
- Each edge is offset **10px to its own left** (counter-clockwise relative to direction of travel)
- Total separation between the two lines: 20px
- A lone edge (only one direction between a pair) renders centred with no offset
- The offset applies to: the visible stroke, arrowhead, resource icon, hit area, and context-menu spawn point
- If one of a pair is deleted, the remaining edge snaps back to centre

---

## Market / Price Table

- Always visible at the **top of the screen**
- Shows current sell prices, e.g. `🪵 = 2🪙   🪑 = 3🪙`
- Prices fixed for the session

---

## Time Controls

Floating collapsible panel on the **right side** of the screen:
- Fixed position, right edge, vertically centred
- Vertical stack of buttons: ⏸ Pause / ▶ Play / ⏩ Fast (3×)
- A ◀/▶ chevron tab on the panel's left edge toggles collapse
- When collapsed: only the tab is visible; panel slides off-screen to the right
- Style: `rgba(10,10,10,0.88)` background, `backdrop-filter: blur(8px)`, #222 border

---

## Interaction (Mobile-First)

No keyboard shortcuts. No right-click. No hover-only affordances.
All touch targets ≥ 48px.

### Bottom toolbar
- Horizontally scrollable strip of node type buttons: Farmer | Lumberjack | Carpenter | Merchant | Chest
- Swipe left/right to scroll; no visible scrollbar
- **Drag to place:** drag a node button from the toolbar onto the canvas to place it

### Select mode (default)
- Tap a node → select it → node context menu appears
- Drag a node → move it; connected edges follow
- Tap an edge → edge context menu appears
- Tap empty space → deselect / close menus

### Connect mode
- Activated by tapping 🔗 in the node context menu
- Tap any other node → draw directed edge from selected → tapped node (new edge has `resource: null`)
- Auto-returns to select mode after connecting

### Node context menu (SVG inline buttons above node)
- 🔗 — enter Connect mode
- ⚙️ Customize — opens per-node settings panel (**only shown** when the node type has configurable settings; hidden entirely for Farmer, Lumberjack, Carpenter, Chest)
- 🗑️ Delete — removes the node and all its edges

### Edge context menu (SVG inline buttons near tap point)
- 🎯 Set Resource — opens resource picker overlay
- 🗑️ Delete Edge — removes the edge
- Tapped edge highlights in violet while menu is open

### Edge resource picker (HTML overlay)
- Options: None (inactive) / 🥕 Food / 🪵 Wood / 🪑 Chair / 🪙 Coin

### Merchant customize panel (HTML overlay)
- Options: None (inactive) / 🥕 Food / 🪵 Wood / 🪑 Chair
- Coins excluded (merchants only sell non-coin resources)

---

## Visual Style

- Background: #0a0a0a (full screen)
- Graph: SVG layer, full screen
- Node circles: radius 28px, colour per node type (see Node Types above)
- Selected node: white stroke ring (3px)
- Edges: #555 lines with filled arrowhead; selected/active edge in #7c3aed
- Edge resource icon: emoji at midpoint, 14px
- Animating resources: emoji travelling along edge (~400ms)
- Node label: type name below circle, system monospace, small
- Merchant sell icon: resource emoji to the right of the node circle, 13px
- Buffer display: grouped by resource type below node, `[icon] [count]`
- Font: system monospace throughout
- Overlays: `rgba(10,10,10,0.88)` + `backdrop-filter: blur(8px)`, #222 border

---

## Starting State

One **Farmer** placed at the centre of the canvas, immediately producing food each tick.

---

## File Structure

```
src/
  App.svelte                  — thin root: market bar, toolbar, ghost node, overlays, tick/RAF effects
  app.css                     — empty (all game styles live in component <style> blocks)
  main.js                     — Svelte mount entry point
  lib/
    registry.js               — NODE_REGISTRY, RESOURCES, RESOURCE_ICONS, constants (NODE_RADIUS, TICK_BASE, …)
    state.svelte.js           — GameState class with $state runes; exported singleton `gs`
    tick.js                   — pure runTick(): production, conversion, merchant sell, edge transport
    camera.js                 — svgCoords, screenPt, getTouchDist/Mid, arrowHead, computeEdgeGeometry
    interactions.js           — all pointer/touch/wheel event handlers; node/edge/tool-drag actions;
                                computeReverseEdgeIds; EDGE_OFFSET; getNodeAt/getEdgeAt hit helpers
    GraphCanvas.svelte        — SVG canvas: edges, arrowheads, animations, nodes, context menus,
                                connect-mode ring; imports interaction handlers from interactions.js
    NodeContextMenu.svelte    — SVG action buttons (🔗 Connect / ⚙️ Customize / 🗑️ Delete) for selected node
    EdgeContextMenu.svelte    — SVG action buttons (🎯 Set Resource / 🗑️ Delete) for selected edge
    CustomizePanel.svelte     — HTML overlay: merchant sell-item picker
    EdgeResourcePicker.svelte — HTML overlay: edge resource picker
    TimeControlPanel.svelte   — fixed right-side collapsible time controls (⏸ / ▶ / ⏩)
```

---

## Tech Stack

- Svelte 5 runes (`$state`, `$derived`, `$effect`) — no legacy stores
- Vite build
- SVG for the graph canvas
- `100dvh` (not `100vh`) for mobile full-screen
- `viewport-fit=cover` + `env(safe-area-inset-bottom)` on the toolbar
- GitHub Pages deployment via `gh-pages` npm package
