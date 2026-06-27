# Graph Game — Design Document

*Prototype v1. Mobile-first sandbox.*

---

## Concept

A directed-graph resource-flow sandbox inspired by Mini Metro.
The player places nodes on a canvas and draws edges between them.
Resources are produced, converted, and consumed automatically each tick.
No goals, no failure state — just a playground to experiment with flows.

---

## Tick

- Base tick: **500ms**
- Can be paused, played, or fast-forwarded at **3× speed**
- All node logic fires once per tick

---

## Resources

| Resource | Icon | Color     |
|----------|------|-----------|
| Food     | 🥕   | #f97316   |
| Wood     | 🪵   | #92400e   |
| Chair    | 🪑   | #d97706   |
| Coin     | 🪙   | #fbbf24   |

---

## Node Types

### Farmer
- **Produces:** 1 food per tick (adds directly to its buffer)
- No recipe, no settings

### Lumberjack
- **Recipe:** 1 food → 1 wood
- Each tick: if buffer has ≥ 1 food, spend 1 food, produce 1 wood (into own buffer)
- Otherwise: idle (food must be routed in via an edge from a Farmer)

### Carpenter
- **Recipe:** 1 wood + 1 food → 1 chair
- Buffers incoming wood and food each tick
- Each tick: if buffer has ≥ 1 wood AND ≥ 1 food, spend both, produce 1 chair (into own buffer)
- Otherwise: idle

### Merchant
- **Sells** a specific resource for coins each tick
- `settings.sellItem` is set by the player (specific resource key) or `null` (inactive)
- If `sellItem === null`: merchant does nothing that tick
- If `sellItem` is set and buffer has ≥ 1 of that resource: convert 1 unit → coins at market price, add coins to own buffer
- Coins are never sold — they must be routed out via edges
- Market prices: assigned randomly (1–3 coins) at game start, fixed for the session
- **Merchant icon:** the assigned `sellItem` emoji is displayed below the node circle

### Chest
- **Terminal sink** — accepts any resource including coins
- Never sends anything out
- Accumulates indefinitely

---

## Resource Routing — Edge-Based Transport

**Nodes no longer broadcast randomly.** All transport is controlled by edges.

### Edge data shape
```
{ id, from, to, resource: null | 'wood' | 'chair' | 'coin' }
```

### Transport logic (per tick, after node production/conversion)
For every edge where `edge.resource !== null`:
- If the parent node's buffer contains ≥ 1 of `edge.resource`:
  - Remove 1 from parent buffer
  - Animate the resource emoji travelling along the edge (~400ms)
  - Add 1 to child buffer when animation completes
- If parent buffer is empty for that resource: edge does nothing this tick

If `edge.resource === null` (default for newly created edges), the edge is **inactive** and transports nothing.

### Tick sequence
1. **Produce/Convert:** each node adds production or recipe outputs to its own buffer
2. **Merchant sell:** merchants with `sellItem` set convert one unit to coins in their buffer
3. **Edge transport:** each active edge moves one resource unit from parent → child buffer

---

## Edge Icon

Each edge displays a small emoji at its midpoint:
- `edge.resource === null`: no icon shown
- Otherwise: shows the resource emoji (🪵 / 🪑 / 🪙) centred on the edge line
- Rendered as an SVG `<text>` element, ~14px

---

## Buffers (Visual)

- Each node displays its buffered resources **below** the node circle
- Grouped by type: shown as `[icon] [count]` e.g. 🪵 3
- On Merchant nodes with a `sellItem` set, the sell item icon is shown between the label and buffer display

## Buffer Caps

Every node type has a `bufferCap` — the maximum total number of items (sum of all resource counts) it can hold:

| Node type  | bufferCap |
|------------|-----------|
| Farmer     | 10        |
| Lumberjack | 10        |
| Carpenter  | 10        |
| Merchant   | 10        |
| Chest      | 100       |

**Rule:** before any resource is added to a node's buffer (via production, recipe output, merchant sale, or edge transport), check: `sum(buffer values) < bufferCap`. If at or above cap, the incoming resource is silently dropped. For edge transport, the resource is removed from the sender but not delivered to the full receiver.

---

## Market / Price Table

- Always visible at the **top of the screen**
- Shows: e.g. `🪵 = 2🪙   🪑 = 3🪙`
- Prices randomised at game start (1–3 each), fixed for session

---

## Time Controls

Floating collapsible panel on the **right side** of the screen:
- Position: fixed, right edge, vertically centred
- Contains: ⏸ Pause / ▶ Play / ⏩ Fast (3×) as a vertical stack of buttons
- A ◀/▶ chevron tab on the panel's left edge toggles collapse
- When collapsed: only the tab is visible; panel slides off-screen to the right
- Style: `rgba(10,10,10,0.88)` background, `backdrop-filter: blur(8px)`, #222 border
- Touch targets ≥ 52px

Graph is **fully editable at any time** — paused or running.

---

## Interaction (Mobile-First, Touch-Based)

No keyboard shortcuts. No right-click. No hover-only affordances.
All touch targets ≥ 48px.

### Toolbar (bottom of screen)
- **Horizontally scrollable node strip** — Farmer | Lumberjack | Carpenter | Merchant | Chest (and any future node types)
- Scroll by swiping left/right; no visible scrollbar
- Time controls are in the separate right-side collapsible panel (see Time Controls above)

### Modes

**Select mode** (default):
- Tap a node → select it (shows white ring + action buttons: 🔗 Connect / ⚙️ Customize / 🗑️ Delete)
- Drag a node → move it; edges follow automatically
- Tap an edge → open edge context menu (see below)
- Tap empty space → deselect / close menus

**Connect mode** — activated by tapping 🔗 on a selected node:
- Tap any other node → draw directed edge from selected → tapped (new edge has `resource: null`)
- Auto-returns to select mode

### Node Context Menu (SVG inline buttons near node)
Appears above the selected node. Two or three buttons (48px tap targets):
1. **🔗** — enter Connect mode to draw a new edge
2. **⚙️** — open Merchant customize panel (**only shown** when the node type has configurable settings, i.e. `Object.keys(defaultSettings).length > 0`; hidden entirely for Farmer, Lumberjack, Carpenter, Chest)
3. **🗑️** — delete the node and all its edges

When only 2 buttons are shown (no Customize), they are centred ±26px from the node centre.

### Edge Context Menu (SVG inline buttons near tap point)
Appears when tapping an edge in select mode. Two buttons (48px tap targets):
1. **🎯 Set Resource** — opens resource picker overlay
2. **🗑️ Delete Edge** — removes the edge

The tapped edge highlights in violet while the menu is open.

### Edge Resource Picker (HTML overlay)
- Dark modal overlay (same style as Merchant settings)
- Options: None (inactive) / 🥕 Food / 🪵 Wood / 🪑 Chair / 🪙 Coin
- Selecting an option sets `edge.resource` and closes the picker

### Merchant Customize Panel (HTML overlay)
- Options: None (inactive) / 🪵 Wood / 🪑 Chair
- Coins are excluded — merchants only sell non-coin resources

---

## Visual Style

- **Background:** #0a0a0a (full screen)
- **Graph layer:** SVG, full screen
- **Node circles:** radius 28px, filled by type:
  - Farmer: #65a30d (green)
  - Lumberjack: #84cc16 (lime)
  - Carpenter: #a78bfa (purple)
  - Merchant: #f59e0b (amber)
  - Chest: #6b7280 (gray)
- **Selected node:** additional white stroke ring (3px)
- **Edges:** #555 thin lines with small filled arrowhead at the target end; selected edge highlighted in #7c3aed
- **Edge resource icon:** emoji at edge midpoint, 14px SVG text
- **Animating resources:** small emoji travelling along edge path (~400ms)
- **Node label:** type name, below circle, monospace, small
- **Merchant sell icon:** resource emoji below node label, 13px
- **Font:** system monospace throughout

---

## Starting State

One **Farmer** placed near the centre of the canvas.
Its food production accumulates in its buffer until edges are drawn to a Lumberjack.
(Lumberjack now requires food input, so starting with a Farmer ensures the player has something immediately useful.)

---

## File Structure

```
src/
  App.svelte                  — thin orchestrator: SVG canvas + toolbar + overlays
  lib/
    registry.js               — NODE_REGISTRY, RESOURCES, RESOURCE_ICONS, constants
    state.svelte.js           — reactive game state (Svelte 5 class with $state runes)
    tick.js                   — pure tick function: production + edge transport
    camera.js                 — pan/zoom/svgCoords helpers (pure functions)
    NodeContextMenu.svelte    — SVG action buttons for selected node
    EdgeContextMenu.svelte    — SVG action buttons for selected edge
    CustomizePanel.svelte     — HTML overlay: merchant sell-item picker
    EdgeResourcePicker.svelte — HTML overlay: edge resource picker
    TimeControlPanel.svelte   — fixed right-side collapsible time controls panel
```

---

## Implementation Notes

- Svelte 5 with runes (`$state`, `$derived`, `$effect`) — no legacy stores
- SVG for the graph (nodes, edges, animations)
- Game state in a `GameState` class exported as `gs` from `state.svelte.js`
- Edge hit-testing uses 15px radius threshold for wide touch targets
