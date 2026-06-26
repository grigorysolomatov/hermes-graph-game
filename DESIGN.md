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
| Wood     | 🪵   | #92400e   |
| Chair    | 🪑   | #d97706   |
| Coin     | 🪙   | #fbbf24   |

---

## Node Types

### Lumberjack
- **Produces:** 1 wood per tick (no input needed)
- **Sends:** wood along one randomly-chosen outgoing edge

### Carpenter
- **Recipe:** 2 wood → 1 chair
- **Buffers** incoming wood
- Each tick: if buffer has ≥ 2 wood, spend 2 wood, produce 1 chair, send along random outgoing edge
- Otherwise: idle

### Merchant
- **Sells** non-coin resources for coins
- Each tick: if buffer has any non-coin resources, pick one at random, convert to coins at its market price, send coins along random outgoing edge
- **Coins are never sold** — they pass through if forwarded via edges, or accumulate if no edges
- Market prices: assigned randomly (1–3 coins) at game start, fixed for the session

### Chest
- **Terminal sink** — accepts any resource including coins
- Never sends anything out
- Accumulates indefinitely

---

## Resource Routing

- Each tick, a node with a produced/converted resource picks one random outgoing edge and sends it
- If no outgoing edges: resource stays in the node's buffer
- Resources **animate** as small icons travelling along the edge over ~400ms

---

## Buffers (Visual)

- Each node displays its buffered resources **below** the node circle
- Grouped by type: shown as `[icon] [count]` e.g. 🪵 3
- Icon size scales slightly with count, **capped at half the node radius**

---

## Market / Price Table

- Always visible at the **top of the screen**
- Shows: e.g. `🪵 = 2🪙   🪑 = 3🪙`
- Prices randomised at game start (1–3 each), fixed for session

---

## Time Controls

Bottom toolbar, right section:
- ⏸ Pause
- ▶ Play
- ⏩ Fast (3×)

Graph is **fully editable at any time** — paused or running.

---

## Interaction (Mobile-First, Touch-Based)

No keyboard shortcuts. No right-click. No hover-only affordances.
All touch targets ≥ 48px.

### Toolbar (bottom of screen)
- **Left section:** node type buttons — Lumberjack | Carpenter | Merchant | Chest
- **Right section:** time controls — ⏸ | ▶ | ⏩

### Modes

**Place mode** — activated by tapping a node type button:
- Tap empty canvas → place node of selected type
- Tap same button again or tap canvas background → exit place mode

**Select mode** (default):
- Tap a node → select it (shows white ring + two action buttons nearby: **Connect** and **Delete**)
- Drag a node → move it; edges follow automatically
- Tap an edge → delete it
- Tap empty space → deselect

**Connect mode** — activated by tapping Connect on a selected node:
- Tap any other node → draw directed edge from selected → tapped
- Auto-returns to select mode

---

## Visual Style

- **Background:** #0a0a0a (full screen)
- **Graph layer:** SVG, full screen
- **Node circles:** radius 28px, filled by type:
  - Lumberjack: #84cc16 (lime)
  - Carpenter: #a78bfa (purple)
  - Merchant: #f59e0b (amber)
  - Chest: #6b7280 (gray)
- **Selected node:** additional white stroke ring (3px)
- **Edges:** #555 thin lines with small filled arrowhead at the target end
- **Animating resources:** small emoji travelling along edge path
- **Node label:** type name, below circle, monospace, small
- **Font:** system monospace throughout

---

## Starting State

One **Lumberjack** placed near the centre of the canvas.
Player immediately sees wood being produced each tick.

---

## Implementation Notes

- Svelte 5 with runes (`$state`, `$derived`, `$effect`) — no legacy stores
- SVG for the graph (nodes, edges, animations)
- All game state in one top-level reactive object: nodes map, edges array, tick interval ref, market prices
- Single self-contained file: `src/games/graph-game/index.svelte`
- Register in `src/lib/store.js`: `{ id: 'graph-game', title: 'Graph Game', category: 'strategy', archived: false }`
