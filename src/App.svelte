<script>
  import { gs } from './lib/state.svelte.js'
  import { NODE_REGISTRY, NODE_TYPES, RESOURCE_ICONS, NODE_RADIUS, ANIM_DURATION, TICK_BASE } from './lib/registry.js'
  import { svgCoords, screenPt, getTouchDist, getTouchMid, edgeLine, arrowHead, SCALE_MIN, SCALE_MAX } from './lib/camera.js'
  import NodeContextMenu from './lib/NodeContextMenu.svelte'
  import EdgeContextMenu from './lib/EdgeContextMenu.svelte'
  import CustomizePanel from './lib/CustomizePanel.svelte'
  import EdgeResourcePicker from './lib/EdgeResourcePicker.svelte'
  import TimeControlPanel from './lib/TimeControlPanel.svelte'

  // Non-reactive interaction state
  let panState = null
  let isPinching = false
  let pinchState = null
  let tickInterval = null
  let rafId = null

  // Derived
  const selectedNode = $derived(gs.nodes.find(n => n.id === gs.selectedId))
  const customizeNode = $derived(gs.nodes.find(n => n.id === gs.customizeId))
  const pickerEdge = $derived(gs.edges.find(e => e.id === gs.edgePickerId))

  // Initial farmer
  gs.nodes = [gs.mkNode('farmer', 50, 50)]

  // Centre initial node once viewport is known
  $effect(() => {
    if (gs.nodes.length === 1 && gs.nodes[0].x === 50) {
      gs.nodes[0] = { ...gs.nodes[0], x: Math.round(window.innerWidth / 2), y: Math.round(window.innerHeight / 2 - 60) }
    }
  })

  // Tick interval — re-runs when gs.speed changes
  $effect(() => {
    if (tickInterval) clearInterval(tickInterval)
    if (gs.speed === 0) { tickInterval = null; return }
    tickInterval = setInterval(() => gs.tick(), TICK_BASE / gs.speed)
    return () => { if (tickInterval) clearInterval(tickInterval) }
  })

  // Animation RAF loop
  $effect(() => {
    function loop() { gs.animFrame = performance.now(); rafId = requestAnimationFrame(loop) }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  })

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getNodeAt(x, y) {
    for (let i = gs.nodes.length - 1; i >= 0; i--) {
      const n = gs.nodes[i]
      const dx = n.x - x, dy = n.y - y
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) return n
    }
    return null
  }

  function getEdgeAt(x, y) {
    for (const e of gs.edges) {
      const from = gs.nodes.find(n => n.id === e.from)
      const to = gs.nodes.find(n => n.id === e.to)
      if (!from || !to) continue
      const dx = to.x - from.x, dy = to.y - from.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / len2))
      const px = from.x + t * dx - x
      const py = from.y + t * dy - y
      if (px * px + py * py < 15 * 15) return e
    }
    return null
  }

  function animPos(anim) {
    const t = Math.min(1, (gs.animFrame - anim.startTime) / ANIM_DURATION)
    return { x: anim.x1 + (anim.x2 - anim.x1) * t, y: anim.y1 + (anim.y2 - anim.y1) * t }
  }

  function bufferEntries(node) {
    return Object.entries(node.buffer).filter(([, c]) => c > 0)
  }

  // ── SVG pointer events ─────────────────────────────────────────────────────
  function onSvgPointerDown(evt) {
    if (isPinching) return
    evt.preventDefault()
    evt.currentTarget.setPointerCapture(evt.pointerId)
    const { x, y } = svgCoords(evt, gs.cam)
    const node = getNodeAt(x, y)

    if (gs.mode === 'select') {
      if (node) {
        gs.selectedId = node.id
        gs.selectedEdgeId = null
        gs.edgeTapPos = null
        gs.isDragging = false
        gs.dragState = { nodeId: node.id, startX: x, startY: y, nodeStartX: node.x, nodeStartY: node.y }
      } else {
        const edge = getEdgeAt(x, y)
        if (edge) {
          gs.selectedEdgeId = edge.id
          gs.edgeTapPos = { x, y }
          gs.selectedId = null
        } else {
          gs.selectedId = null
          gs.selectedEdgeId = null
          gs.edgeTapPos = null
          const sc = screenPt(evt.clientX, evt.clientY)
          panState = { startScreenX: sc.x, startScreenY: sc.y, camStartX: gs.cam.x, camStartY: gs.cam.y }
        }
        gs.dragState = null
        gs.isDragging = false
      }
    } else if (gs.mode === 'connect') {
      if (node && node.id !== gs.connectSourceId) {
        const alreadyExists = gs.edges.some(e => e.from === gs.connectSourceId && e.to === node.id)
        if (!alreadyExists) {
          gs.edges = [...gs.edges, { id: gs.nextId++, from: gs.connectSourceId, to: node.id, resource: null }]
        }
        gs.connectSourceId = null
        gs.mode = 'select'
      } else if (!node) {
        gs.connectSourceId = null
        gs.mode = 'select'
      }
    }
  }

  function onSvgPointerMove(evt) {
    if (isPinching) return
    if (panState) {
      evt.preventDefault()
      const sc = screenPt(evt.clientX, evt.clientY)
      gs.cam.x = panState.camStartX + (sc.x - panState.startScreenX)
      gs.cam.y = panState.camStartY + (sc.y - panState.startScreenY)
      return
    }
    if (!gs.dragState || gs.mode !== 'select') return
    evt.preventDefault()
    const { x, y } = svgCoords(evt, gs.cam)
    const dx = x - gs.dragState.startX, dy = y - gs.dragState.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) gs.isDragging = true
    if (gs.isDragging) {
      const idx = gs.nodes.findIndex(n => n.id === gs.dragState.nodeId)
      if (idx !== -1) {
        const updated = [...gs.nodes]
        updated[idx] = { ...updated[idx], x: gs.dragState.nodeStartX + dx, y: gs.dragState.nodeStartY + dy }
        gs.nodes = updated
      }
    }
  }

  function onSvgPointerUp() {
    panState = null
    if (gs.dragState && !gs.isDragging && gs.mode === 'select') {
      gs.selectedId = gs.dragState.nodeId
    }
    gs.dragState = null
    gs.isDragging = false
  }

  function onSvgPointerCancel() {
    panState = null
    gs.dragState = null
    gs.isDragging = false
  }

  function onTouchStart(evt) {
    if (evt.touches.length === 2) {
      isPinching = true
      gs.dragState = null
      gs.isDragging = false
      panState = null
      const t1 = evt.touches[0], t2 = evt.touches[1]
      pinchState = {
        startDist: getTouchDist(t1, t2),
        startMid: getTouchMid(t1, t2),
        camStartX: gs.cam.x, camStartY: gs.cam.y, camStartScale: gs.cam.scale,
      }
      evt.preventDefault()
    }
  }

  function onTouchMove(evt) {
    if (!isPinching || evt.touches.length < 2) return
    evt.preventDefault()
    const t1 = evt.touches[0], t2 = evt.touches[1]
    const dist = getTouchDist(t1, t2)
    const mid = getTouchMid(t1, t2)
    const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, pinchState.camStartScale * (dist / pinchState.startDist)))
    const worldMidX = (pinchState.startMid.x - pinchState.camStartX) / pinchState.camStartScale
    const worldMidY = (pinchState.startMid.y - pinchState.camStartY) / pinchState.camStartScale
    gs.cam.x = mid.x - worldMidX * newScale
    gs.cam.y = mid.y - worldMidY * newScale
    gs.cam.scale = newScale
  }

  function onTouchEnd(evt) {
    if (evt.touches.length < 2) { isPinching = false; pinchState = null }
  }

  function onWheel(evt) {
    evt.preventDefault()
    const sc = screenPt(evt.clientX, evt.clientY)
    const factor = evt.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, gs.cam.scale * factor))
    const worldX = (sc.x - gs.cam.x) / gs.cam.scale
    const worldY = (sc.y - gs.cam.y) / gs.cam.scale
    gs.cam.x = sc.x - worldX * newScale
    gs.cam.y = sc.y - worldY * newScale
    gs.cam.scale = newScale
  }

  // ── Node actions ───────────────────────────────────────────────────────────
  function onConnectBtn() {
    gs.connectSourceId = gs.selectedId
    gs.mode = 'connect'
  }

  function onDeleteNodeBtn() {
    const id = gs.selectedId
    gs.nodes = gs.nodes.filter(n => n.id !== id)
    gs.edges = gs.edges.filter(e => e.from !== id && e.to !== id)
    gs.selectedId = null
  }

  function onCustomizeBtn() {
    gs.customizeId = gs.selectedId
  }

  function setMerchantSellItem(nodeId, value) {
    gs.nodes = gs.nodes.map(n =>
      n.id === nodeId ? { ...n, settings: { ...n.settings, sellItem: value || null } } : n
    )
    gs.customizeId = null
  }

  // ── Edge actions ───────────────────────────────────────────────────────────
  function onDeleteEdgeBtn() {
    gs.edges = gs.edges.filter(e => e.id !== gs.selectedEdgeId)
    gs.selectedEdgeId = null
    gs.edgeTapPos = null
  }

  function onSetResourceBtn() {
    gs.edgePickerId = gs.selectedEdgeId
    gs.selectedEdgeId = null
    gs.edgeTapPos = null
  }

  function setEdgeResource(edgeId, value) {
    gs.edges = gs.edges.map(e =>
      e.id === edgeId ? { ...e, resource: value || null } : e
    )
    gs.edgePickerId = null
  }

  // ── Tool drag (toolbar → canvas) ──────────────────────────────────────────
  function startToolDrag(type, evt) {
    evt.preventDefault()
    evt.stopPropagation()
    evt.currentTarget.setPointerCapture(evt.pointerId)
    gs.toolDrag = { type, clientX: evt.clientX, clientY: evt.clientY }
    window.addEventListener('pointermove', moveToolDrag)
    window.addEventListener('pointerup', endToolDrag)
    window.addEventListener('pointercancel', cancelToolDrag)
  }

  function moveToolDrag(evt) {
    if (!gs.toolDrag) return
    gs.toolDrag = { ...gs.toolDrag, clientX: evt.clientX, clientY: evt.clientY }
  }

  function endToolDrag(evt) {
    window.removeEventListener('pointermove', moveToolDrag)
    window.removeEventListener('pointerup', endToolDrag)
    window.removeEventListener('pointercancel', cancelToolDrag)
    if (!gs.toolDrag) return
    const { type } = gs.toolDrag
    gs.toolDrag = null
    const svgEl = document.querySelector('#graph-svg')
    const svgR = svgEl.getBoundingClientRect()
    const cx = evt.clientX, cy = evt.clientY
    if (cx < svgR.left || cx > svgR.right || cy < svgR.top || cy > svgR.bottom) return
    gs.nodes = [...gs.nodes, gs.mkNode(type,
      (cx - svgR.left - gs.cam.x) / gs.cam.scale,
      (cy - svgR.top - gs.cam.y) / gs.cam.scale
    )]
  }

  function cancelToolDrag() {
    window.removeEventListener('pointermove', moveToolDrag)
    window.removeEventListener('pointerup', endToolDrag)
    window.removeEventListener('pointercancel', cancelToolDrag)
    gs.toolDrag = null
  }
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Graph Game</title>
</svelte:head>

<div class="app">
  <!-- Market price bar -->
  <div class="market-bar">
    <span class="market-label">Market:</span>
    {#each Object.entries(gs.marketPrices) as [res, price]}
      <span class="market-item">{RESOURCE_ICONS[res]} = {price}{RESOURCE_ICONS['coin']}</span>
    {/each}
    <span class="market-mode">
      {#if gs.mode === 'connect'}🔗 Connect{:else}✏️ Select{/if}
    </span>
  </div>

  <!-- Graph SVG canvas -->
  <svg
    id="graph-svg"
    class="graph"
    onpointerdown={onSvgPointerDown}
    onpointermove={onSvgPointerMove}
    onpointerup={onSvgPointerUp}
    onpointercancel={onSvgPointerCancel}
    oncontextmenu={e => e.preventDefault()}
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
    onwheel={onWheel}
  >
    <g transform="translate({gs.cam.x},{gs.cam.y}) scale({gs.cam.scale})">

      <!-- Edges -->
      {#each gs.edges as edge (edge.id)}
        {@const from = gs.nodes.find(n => n.id === edge.from)}
        {@const to = gs.nodes.find(n => n.id === edge.to)}
        {#if from && to}
          {@const line = edgeLine(from, to, NODE_RADIUS)}
          {@const isEdgeSel = edge.id === gs.selectedEdgeId}
          <line
            class="edge"
            x1={line.x1} y1={line.y1}
            x2={line.x2} y2={line.y2}
            stroke={isEdgeSel ? '#7c3aed' : '#555'}
          />
          <path
            class="arrowhead"
            d={arrowHead(from.x, from.y, to.x, to.y, NODE_RADIUS)}
            fill={isEdgeSel ? '#7c3aed' : '#555'}
          />
          <!-- Edge resource icon at midpoint -->
          {#if edge.resource}
            <text class="edge-resource-icon"
              x={(from.x + to.x) / 2}
              y={(from.y + to.y) / 2}
            >{RESOURCE_ICONS[edge.resource]}</text>
          {/if}
        {/if}
      {/each}

      <!-- Animations -->
      {#each gs.animations as anim (anim.id)}
        {@const pos = animPos(anim)}
        <text class="anim-resource" x={pos.x} y={pos.y}>{RESOURCE_ICONS[anim.resource]}</text>
      {/each}

      <!-- Nodes -->
      {#each gs.nodes as node (node.id)}
        {@const isSelected = node.id === gs.selectedId}
        {@const buf = bufferEntries(node)}
        {@const def = NODE_REGISTRY[node.type]}

        {#if isSelected}
          <circle class="selected-ring" cx={node.x} cy={node.y} r={NODE_RADIUS + 5} />
        {/if}

        <circle class="node" cx={node.x} cy={node.y} r={NODE_RADIUS} fill={def.color} />
        <text class="node-emoji" x={node.x} y={node.y + 9}>{def.emoji}</text>
        <text class="node-label" x={node.x} y={node.y + NODE_RADIUS + 14}>{def.label}</text>

        <!-- Merchant sell item icon -->
        {#if def.isMerchant && node.settings.sellItem}
          <text class="merchant-sell-icon" x={node.x} y={node.y + NODE_RADIUS + 28}>
            {RESOURCE_ICONS[node.settings.sellItem]}
          </text>
        {/if}

        <!-- Buffer display -->
        {#each buf as [res, count], i}
          <text
            class="buffer-resource"
            x={node.x + (i - (buf.length - 1) / 2) * 32}
            y={node.y + NODE_RADIUS + (def.isMerchant && node.settings.sellItem ? 46 : 30)}
          >
            {RESOURCE_ICONS[res]}{count > 1 ? count : ''}
          </text>
        {/each}

        <!-- Node context menu when selected -->
        {#if isSelected && gs.mode === 'select'}
          <NodeContextMenu
            {node}
            onConnect={onConnectBtn}
            onCustomize={onCustomizeBtn}
            onDelete={onDeleteNodeBtn}
          />
        {/if}
      {/each}

      <!-- Edge context menu -->
      {#if gs.selectedEdgeId && gs.edgeTapPos}
        <EdgeContextMenu
          x={gs.edgeTapPos.x}
          y={gs.edgeTapPos.y}
          onSetResource={onSetResourceBtn}
          onDelete={onDeleteEdgeBtn}
        />
      {/if}

      <!-- Connect mode: dashed ring on source node -->
      {#if gs.mode === 'connect' && gs.connectSourceId}
        {@const src = gs.nodes.find(n => n.id === gs.connectSourceId)}
        {#if src}
          <circle cx={src.x} cy={src.y} r={NODE_RADIUS + 8}
            fill="none" stroke="#7c3aed" stroke-width="2" stroke-dasharray="6 4" />
        {/if}
      {/if}

    </g>
  </svg>

  <!-- Ghost node while dragging from toolbar -->
  {#if gs.toolDrag}
    <div
      class="ghost-node"
      style="left: {gs.toolDrag.clientX - 25}px; top: {gs.toolDrag.clientY - 25}px; --color: {NODE_REGISTRY[gs.toolDrag.type].color}"
    >
      <span class="ghost-emoji">{NODE_REGISTRY[gs.toolDrag.type].emoji}</span>
    </div>
  {/if}

  <!-- Merchant customize panel -->
  {#if gs.customizeId && customizeNode}
    <CustomizePanel
      node={customizeNode}
      onClose={() => gs.customizeId = null}
      onSetSellItem={setMerchantSellItem}
    />
  {/if}

  <!-- Edge resource picker -->
  {#if gs.edgePickerId && pickerEdge}
    <EdgeResourcePicker
      edge={pickerEdge}
      onClose={() => gs.edgePickerId = null}
      onSetResource={setEdgeResource}
    />
  {/if}

  <!-- Toolbar: horizontally scrollable node strip -->
  <div class="toolbar">
    <div class="tool-strip">
      {#each NODE_TYPES as type}
        <button
          class="tool-btn"
          style="--accent: {NODE_REGISTRY[type].color}"
          onpointerdown={e => startToolDrag(type, e)}
        >
          <span class="tool-icon">{NODE_REGISTRY[type].emoji}</span>
          <span class="tool-label">{NODE_REGISTRY[type].label.slice(0, 4)}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Time controls: collapsible right-side panel -->
  <TimeControlPanel />
</div>

<style>
  :global(*) {
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(html, body) {
    width: 100%;
    height: 100%;
    background: #0a0a0a;
    overflow: hidden;
    font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
    color: #e8e8e8;
  }

  .app {
    display: flex;
    flex-direction: column;
    width: 100vw;
    height: 100dvh;
    background: #0a0a0a;
    overflow: hidden;
  }

  .market-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 8px 16px;
    background: #111;
    border-bottom: 1px solid #222;
    font-size: 13px;
    flex-shrink: 0;
    min-height: 40px;
    flex-wrap: wrap;
  }

  .market-label { color: #666; }
  .market-item { color: #fbbf24; font-weight: 600; }
  .market-mode { margin-left: auto; color: #7c3aed; font-size: 12px; }

  .graph {
    flex: 1;
    width: 100%;
    touch-action: none;
    cursor: crosshair;
  }

  :global(.edge) {
    stroke-width: 1.5;
    pointer-events: none;
  }

  :global(.arrowhead) {
    pointer-events: none;
  }

  :global(.node) {
    stroke: #0a0a0a;
    stroke-width: 2;
    cursor: pointer;
  }

  :global(.selected-ring) {
    fill: none;
    stroke: white;
    stroke-width: 3;
    pointer-events: none;
  }

  :global(.node-label) {
    fill: #e8e8e8;
    font-size: 10px;
    font-family: ui-monospace, monospace;
    text-anchor: middle;
    pointer-events: none;
  }

  :global(.node-emoji) {
    font-size: 20px;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  :global(.merchant-sell-icon) {
    font-size: 13px;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
    opacity: 0.9;
  }

  :global(.buffer-resource) {
    fill: #e8e8e8;
    font-size: 13px;
    text-anchor: middle;
    pointer-events: none;
  }

  :global(.anim-resource) {
    font-size: 16px;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  :global(.edge-resource-icon) {
    font-size: 14px;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  :global(.action-btn) { cursor: pointer; }

  :global(.action-label) {
    font-size: 16px;
    text-anchor: middle;
    pointer-events: none;
  }

  .toolbar {
    padding: 8px 0;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
    background: #111;
    border-top: 1px solid #222;
    flex-shrink: 0;
    min-height: 64px;
    overflow: hidden;
  }

  .tool-strip {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 0 12px;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .tool-strip::-webkit-scrollbar { display: none; }

  .tool-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 52px;
    min-height: 52px;
    flex-shrink: 0;
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 10px;
    color: #e8e8e8;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.15s;
    gap: 2px;
    padding: 4px 6px;
    touch-action: none;
  }

  .tool-icon { font-size: 20px; line-height: 1; }
  .tool-label { font-size: 9px; color: #aaa; font-family: ui-monospace, monospace; }

  .ghost-node {
    position: fixed;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--color);
    opacity: 0.6;
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .ghost-emoji { font-size: 24px; line-height: 1; }
</style>
