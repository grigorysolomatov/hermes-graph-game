<script>
  // Graph Game — Svelte 5 runes implementation
  // Directed graph resource-flow sandbox

  // ── Types ──────────────────────────────────────────────────────────────────
  // Node: { id, type, x, y, buffer: Map<resource, count> }
  // Edge: { id, from, to }
  // Anim: { id, resource, x1, y1, x2, y2, startTime }
  // mode: 'select' | 'connect'

  const NODE_TYPES = ['lumberjack', 'carpenter', 'merchant', 'chest']
  const RESOURCES = ['wood', 'chair', 'coin']
  const RESOURCE_ICONS = { wood: '🪵', chair: '🪑', coin: '🪙' }
  const RESOURCE_COLORS = { wood: '#92400e', chair: '#d97706', coin: '#fbbf24' }
  const NODE_COLORS = {
    lumberjack: '#84cc16',
    carpenter: '#a78bfa',
    merchant: '#f59e0b',
    chest: '#6b7280',
  }
  const NODE_LABELS = {
    lumberjack: 'Lumberjack',
    carpenter: 'Carpenter',
    merchant: 'Merchant',
    chest: 'Chest',
  }
  const NODE_EMOJIS = {
    lumberjack: '🪓',
    carpenter: '🔨',
    merchant: '🏪',
    chest: '📦',
  }
  const NODE_RADIUS = 28
  const ANIM_DURATION = 400
  const TICK_BASE = 500

  // ── State ──────────────────────────────────────────────────────────────────
  let nextId = $state(1)
  let nodes = $state([]) // array of node objects
  let edges = $state([]) // array of edge objects
  let animations = $state([]) // flying resources
  let mode = $state('select') // 'select' | 'connect'
  let selectedId = $state(null)
  let connectSourceId = $state(null)
  let speed = $state(1) // 0=paused, 1=normal, 3=fast
  let dragState = $state(null) // { nodeId, startX, startY, nodeStartX, nodeStartY }
  let isDragging = $state(false)
  let toolDrag = $state(null) // { type, clientX, clientY }

  // Camera state
  let cam = $state({ x: 0, y: 0, scale: 1 })
  const SCALE_MIN = 0.2
  const SCALE_MAX = 4

  // Canvas pan/pinch state (non-reactive, only used in event handlers)
  let panState = null  // { startScreenX, startScreenY, camStartX, camStartY }
  let isPinching = false
  let pinchState = null // { startDist, startMid, camStartX, camStartY, camStartScale }

  // Market prices: fixed at game start
  const marketPrices = { wood: Math.ceil(Math.random() * 3), chair: Math.ceil(Math.random() * 3) }

  // Ensure prices are distinct-ish — just keep as-is, spec says 1–3 each
  function mkNode(type, x, y) {
    return { id: nextId++, type, x, y, buffer: {} }
  }

  // Starting state: one lumberjack near centre
  nodes = [mkNode('lumberjack', 50, 50)] // will be centred on mount

  // ── Tick logic ─────────────────────────────────────────────────────────────
  function getOutEdges(nodeId) {
    return edges.filter(e => e.from === nodeId)
  }

  function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
  }

  function tick() {
    // Process each node
    const newNodes = nodes.map(n => ({ ...n, buffer: { ...n.buffer } }))
    // We'll mutate newNodes in place, then assign

    for (const node of newNodes) {
      if (node.type === 'lumberjack') {
        // Produce 1 wood, send along random outgoing edge
        sendResourceFrom(node, 'wood', newNodes)
      } else if (node.type === 'carpenter') {
        const woodCount = node.buffer['wood'] || 0
        if (woodCount >= 2) {
          node.buffer['wood'] = woodCount - 2
          if (node.buffer['wood'] === 0) delete node.buffer['wood']
          sendResourceFrom(node, 'chair', newNodes)
        }
      } else if (node.type === 'merchant') {
        // Find a non-coin resource in buffer
        const sellable = Object.keys(node.buffer).filter(r => r !== 'coin' && node.buffer[r] > 0)
        if (sellable.length > 0) {
          const res = pickRandom(sellable)
          node.buffer[res] -= 1
          if (node.buffer[res] === 0) delete node.buffer[res]
          const coins = marketPrices[res] || 1
          sendResourceFrom(node, 'coin', newNodes, coins)
        }
        // Coins in buffer: if outgoing edges, send them
        const coinCount = node.buffer['coin'] || 0
        if (coinCount > 0) {
          const outs = getOutEdges(node.id)
          if (outs.length > 0) {
            const edge = pickRandom(outs)
            const toNode = newNodes.find(n => n.id === edge.to)
            if (toNode) {
              node.buffer['coin'] -= 1
              if (node.buffer['coin'] === 0) delete node.buffer['coin']
              launchAnimNodes(node, 'coin', toNode)
            }
          }
        }
      }
      // chest: does nothing, just accumulates
    }

    nodes = newNodes
  }

  function sendResourceFrom(node, res, allNodes, count = 1) {
    const outs = getOutEdges(node.id)
    if (outs.length === 0) {
      node.buffer[res] = (node.buffer[res] || 0) + count
    } else {
      const edge = pickRandom(outs)
      const toNode = allNodes.find(n => n.id === edge.to)
      if (toNode) {
        launchAnimNodes(node, res, toNode, count)
      } else {
        node.buffer[res] = (node.buffer[res] || 0) + count
      }
    }
  }

  function launchAnimNodes(fromNode, res, toNode, count = 1) {
    const anim = {
      id: nextId++,
      resource: res,
      count,
      x1: fromNode.x,
      y1: fromNode.y,
      x2: toNode.x,
      y2: toNode.y,
      startTime: performance.now(),
    }
    animations = [...animations, anim]
    const toId = toNode.id
    setTimeout(() => {
      animations = animations.filter(a => a.id !== anim.id)
      const dest = nodes.find(n => n.id === toId)
      if (dest) {
        dest.buffer = { ...dest.buffer, [res]: (dest.buffer[res] || 0) + count }
        nodes = [...nodes]
      }
    }, ANIM_DURATION)
  }

  // ── Tick interval ──────────────────────────────────────────────────────────
  let tickInterval = null

  function startTick() {
    if (tickInterval) clearInterval(tickInterval)
    if (speed === 0) return
    tickInterval = setInterval(tick, TICK_BASE / speed)
  }

  $effect(() => {
    startTick()
    return () => { if (tickInterval) clearInterval(tickInterval) }
  })

  // Centre the initial lumberjack once we know viewport size
  $effect(() => {
    if (nodes.length === 1 && nodes[0].x === 50) {
      const w = window.innerWidth
      const h = window.innerHeight
      nodes[0] = { ...nodes[0], x: Math.round(w / 2), y: Math.round(h / 2 - 60) }
    }
  })

  // ── SVG animation frame ────────────────────────────────────────────────────
  let animFrame = $state(0)
  let rafId = null

  function rafLoop() {
    animFrame = performance.now()
    rafId = requestAnimationFrame(rafLoop)
  }

  $effect(() => {
    rafId = requestAnimationFrame(rafLoop)
    return () => cancelAnimationFrame(rafId)
  })

  // ── Interaction ────────────────────────────────────────────────────────────
  function getNodeAt(x, y) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i]
      const dx = n.x - x
      const dy = n.y - y
      if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) return n
    }
    return null
  }

  function getEdgeAt(x, y) {
    for (const e of edges) {
      const from = nodes.find(n => n.id === e.from)
      const to = nodes.find(n => n.id === e.to)
      if (!from || !to) continue
      // Distance from point to line segment
      const dx = to.x - from.x
      const dy = to.y - from.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / len2))
      const px = from.x + t * dx - x
      const py = from.y + t * dy - y
      if (px * px + py * py < 10 * 10) return e
    }
    return null
  }

  function svgRect() {
    return document.querySelector('#graph-svg').getBoundingClientRect()
  }

  function svgCoords(evt) {
    const rect = svgRect()
    const touch = evt.touches ? evt.touches[0] : evt
    const sx = touch.clientX - rect.left
    const sy = touch.clientY - rect.top
    return { x: (sx - cam.x) / cam.scale, y: (sy - cam.y) / cam.scale }
  }

  function screenPt(clientX, clientY) {
    const rect = svgRect()
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  function getTouchDist(t1, t2) {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  function getTouchMid(t1, t2) {
    const rect = svgRect()
    return {
      x: (t1.clientX + t2.clientX) / 2 - rect.left,
      y: (t1.clientY + t2.clientY) / 2 - rect.top,
    }
  }

  function onSvgPointerDown(evt) {
    if (isPinching) return
    evt.preventDefault()
    evt.currentTarget.setPointerCapture(evt.pointerId)
    const { x, y } = svgCoords(evt)
    const node = getNodeAt(x, y)

    if (mode === 'select') {
      if (node) {
        selectedId = node.id
        isDragging = false
        dragState = { nodeId: node.id, startX: x, startY: y, nodeStartX: node.x, nodeStartY: node.y }
      } else {
        const edge = getEdgeAt(x, y)
        if (edge) {
          edges = edges.filter(e => e.id !== edge.id)
        } else {
          selectedId = null
          // Start canvas pan
          const sc = screenPt(evt.clientX, evt.clientY)
          panState = { startScreenX: sc.x, startScreenY: sc.y, camStartX: cam.x, camStartY: cam.y }
        }
        dragState = null
        isDragging = false
      }
    } else if (mode === 'connect') {
      if (node && node.id !== connectSourceId) {
        const alreadyExists = edges.some(e => e.from === connectSourceId && e.to === node.id)
        if (!alreadyExists) {
          edges = [...edges, { id: nextId++, from: connectSourceId, to: node.id }]
        }
        connectSourceId = null
        mode = 'select'
      } else if (!node) {
        connectSourceId = null
        mode = 'select'
      }
    }
  }

  function onSvgPointerMove(evt) {
    if (isPinching) return

    if (panState) {
      evt.preventDefault()
      const sc = screenPt(evt.clientX, evt.clientY)
      cam.x = panState.camStartX + (sc.x - panState.startScreenX)
      cam.y = panState.camStartY + (sc.y - panState.startScreenY)
      return
    }

    if (!dragState || mode !== 'select') return
    evt.preventDefault()
    const { x, y } = svgCoords(evt)
    const dx = x - dragState.startX
    const dy = y - dragState.startY
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) isDragging = true
    if (isDragging) {
      const idx = nodes.findIndex(n => n.id === dragState.nodeId)
      if (idx !== -1) {
        const updated = [...nodes]
        updated[idx] = { ...updated[idx], x: dragState.nodeStartX + dx, y: dragState.nodeStartY + dy }
        nodes = updated
      }
    }
  }

  function onSvgPointerUp(evt) {
    panState = null
    if (dragState && !isDragging && mode === 'select') {
      selectedId = dragState.nodeId
    }
    dragState = null
    isDragging = false
  }

  function onSvgPointerCancel() {
    panState = null
    dragState = null
    isDragging = false
  }

  function onTouchStart(evt) {
    if (evt.touches.length === 2) {
      isPinching = true
      dragState = null
      isDragging = false
      panState = null
      const t1 = evt.touches[0]
      const t2 = evt.touches[1]
      pinchState = {
        startDist: getTouchDist(t1, t2),
        startMid: getTouchMid(t1, t2),
        camStartX: cam.x,
        camStartY: cam.y,
        camStartScale: cam.scale,
      }
      evt.preventDefault()
    }
  }

  function onTouchMove(evt) {
    if (!isPinching || evt.touches.length < 2) return
    evt.preventDefault()
    const t1 = evt.touches[0]
    const t2 = evt.touches[1]
    const dist = getTouchDist(t1, t2)
    const mid = getTouchMid(t1, t2)
    const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX,
      pinchState.camStartScale * (dist / pinchState.startDist)))
    // Keep the initial midpoint's world position fixed under the current midpoint
    const worldMidX = (pinchState.startMid.x - pinchState.camStartX) / pinchState.camStartScale
    const worldMidY = (pinchState.startMid.y - pinchState.camStartY) / pinchState.camStartScale
    cam.x = mid.x - worldMidX * newScale
    cam.y = mid.y - worldMidY * newScale
    cam.scale = newScale
  }

  function onTouchEnd(evt) {
    if (evt.touches.length < 2) {
      isPinching = false
      pinchState = null
    }
  }

  function onWheel(evt) {
    evt.preventDefault()
    const sc = screenPt(evt.clientX, evt.clientY)
    const factor = evt.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(SCALE_MIN, Math.min(SCALE_MAX, cam.scale * factor))
    const worldX = (sc.x - cam.x) / cam.scale
    const worldY = (sc.y - cam.y) / cam.scale
    cam.x = sc.x - worldX * newScale
    cam.y = sc.y - worldY * newScale
    cam.scale = newScale
  }

  function onConnectBtn() {
    connectSourceId = selectedId
    mode = 'connect'
  }

  function onDeleteBtn() {
    const id = selectedId
    nodes = nodes.filter(n => n.id !== id)
    edges = edges.filter(e => e.from !== id && e.to !== id)
    selectedId = null
    mode = 'select'
  }

  function startToolDrag(type, evt) {
    evt.preventDefault()
    evt.stopPropagation()
    evt.currentTarget.setPointerCapture(evt.pointerId)
    toolDrag = { type, clientX: evt.clientX, clientY: evt.clientY }
  }

  function moveToolDrag(evt) {
    if (!toolDrag) return
    toolDrag = { ...toolDrag, clientX: evt.clientX, clientY: evt.clientY }
  }

  function endToolDrag(evt) {
    if (!toolDrag) return
    const { type } = toolDrag
    const clientX = evt.clientX
    const clientY = evt.clientY
    toolDrag = null

    // Cancel if released over toolbar
    const toolbar = document.querySelector('.toolbar')
    const toolbarTop = toolbar.getBoundingClientRect().top
    if (clientY >= toolbarTop) return

    // Cancel if outside the SVG canvas
    const svgEl = document.querySelector('#graph-svg')
    const svgR = svgEl.getBoundingClientRect()
    if (clientX < svgR.left || clientX > svgR.right || clientY < svgR.top || clientY > svgR.bottom) return

    const wx = (clientX - svgR.left - cam.x) / cam.scale
    const wy = (clientY - svgR.top - cam.y) / cam.scale
    nodes = [...nodes, mkNode(type, wx, wy)]
  }

  function cancelToolDrag() {
    toolDrag = null
  }

  // ── Derived: animated positions ────────────────────────────────────────────
  function animPos(anim) {
    const now = animFrame
    const t = Math.min(1, (now - anim.startTime) / ANIM_DURATION)
    return {
      x: anim.x1 + (anim.x2 - anim.x1) * t,
      y: anim.y1 + (anim.y2 - anim.y1) * t,
    }
  }

  // Arrow head helper
  function arrowHead(x1, y1, x2, y2) {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) return ''
    const ux = dx / len
    const uy = dy / len
    // Tip: at node radius + small gap from target
    const tipX = x2 - ux * (NODE_RADIUS + 2)
    const tipY = y2 - uy * (NODE_RADIUS + 2)
    const baseX = tipX - ux * 12
    const baseY = tipY - uy * 12
    const perpX = -uy * 5
    const perpY = ux * 5
    return `M${tipX},${tipY} L${baseX + perpX},${baseY + perpY} L${baseX - perpX},${baseY - perpY} Z`
  }

  // Line endpoints clipped to node edge
  function edgeLine(from, to) {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1) return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
    const ux = dx / len
    const uy = dy / len
    return {
      x1: from.x + ux * (NODE_RADIUS + 2),
      y1: from.y + uy * (NODE_RADIUS + 2),
      x2: to.x - ux * (NODE_RADIUS + 2),
      y2: to.y - uy * (NODE_RADIUS + 2),
    }
  }

  // Buffer display
  function bufferEntries(node) {
    return Object.entries(node.buffer).filter(([, c]) => c > 0)
  }

  // Action button positions relative to node
  function actionBtnPos(node, index) {
    return { x: node.x + (index === 0 ? -36 : 36), y: node.y - NODE_RADIUS - 20 }
  }

  const selectedNode = $derived(nodes.find(n => n.id === selectedId))
</script>

<svelte:head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Graph Game</title>
</svelte:head>

<div class="app">
  <!-- Market price bar -->
  <div class="market-bar">
    <span class="market-label">Market:</span>
    {#each Object.entries(marketPrices) as [res, price]}
      <span class="market-item">
        {RESOURCE_ICONS[res]} = {price}{RESOURCE_ICONS['coin']}
      </span>
    {/each}
    <span class="market-mode">
      {#if mode === 'connect'}🔗 Connect{:else}✏️ Select{/if}
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
  <g transform="translate({cam.x},{cam.y}) scale({cam.scale})">
    <!-- Edges -->
    {#each edges as edge (edge.id)}
      {@const from = nodes.find(n => n.id === edge.from)}
      {@const to = nodes.find(n => n.id === edge.to)}
      {#if from && to}
        {@const line = edgeLine(from, to)}
        <line
          class="edge"
          x1={line.x1} y1={line.y1}
          x2={line.x2} y2={line.y2}
        />
        <path
          class="arrowhead"
          d={arrowHead(from.x, from.y, to.x, to.y)}
        />
      {/if}
    {/each}

    <!-- Animations -->
    {#each animations as anim (anim.id)}
      {@const pos = animPos(anim)}
      <text class="anim-resource" x={pos.x} y={pos.y}>
        {RESOURCE_ICONS[anim.resource]}
      </text>
    {/each}

    <!-- Nodes -->
    {#each nodes as node (node.id)}
      {@const isSelected = node.id === selectedId}
      {@const buf = bufferEntries(node)}

      <!-- Selected ring -->
      {#if isSelected}
        <circle
          class="selected-ring"
          cx={node.x} cy={node.y}
          r={NODE_RADIUS + 5}
        />
      {/if}

      <!-- Node circle -->
      <circle
        class="node"
        cx={node.x} cy={node.y}
        r={NODE_RADIUS}
        fill={NODE_COLORS[node.type]}
      />

      <!-- Node emoji icon -->
      <text class="node-emoji" x={node.x} y={node.y + 9}>
        {NODE_EMOJIS[node.type]}
      </text>

      <!-- Node label -->
      <text class="node-label" x={node.x} y={node.y + NODE_RADIUS + 14}>
        {NODE_LABELS[node.type]}
      </text>

      <!-- Buffer display -->
      {#each buf as [res, count], i}
        <text
          class="buffer-resource"
          x={node.x + (i - (buf.length - 1) / 2) * 32}
          y={node.y + NODE_RADIUS + 30}
        >
          {RESOURCE_ICONS[res]}{count > 1 ? count : ''}
        </text>
      {/each}

      <!-- Action buttons when selected -->
      {#if isSelected && mode === 'select'}
        <!-- Connect button -->
        <g
          class="action-btn"
          transform={`translate(${node.x - 36}, ${node.y - NODE_RADIUS - 32})`}
          onpointerdown={e => { e.stopPropagation(); onConnectBtn() }}
        >
          <rect x="-24" y="-24" width="48" height="48" rx="10" fill="#7c3aed" />
          <text class="action-label" x="0" y="7">🔗</text>
        </g>

        <!-- Delete button -->
        <g
          class="action-btn"
          transform={`translate(${node.x + 36}, ${node.y - NODE_RADIUS - 32})`}
          onpointerdown={e => { e.stopPropagation(); onDeleteBtn() }}
        >
          <rect x="-24" y="-24" width="48" height="48" rx="10" fill="#dc2626" />
          <text class="action-label" x="0" y="7">🗑️</text>
        </g>
      {/if}
    {/each}

    <!-- Connect mode: show dashed line from source to indicate -->
    {#if mode === 'connect' && connectSourceId}
      {@const src = nodes.find(n => n.id === connectSourceId)}
      {#if src}
        <circle cx={src.x} cy={src.y} r={NODE_RADIUS + 8} fill="none" stroke="#7c3aed" stroke-width="2" stroke-dasharray="6 4" />
      {/if}
    {/if}
  </g>
  </svg>

  <!-- Ghost node while dragging from toolbar -->
  {#if toolDrag}
    <div
      class="ghost-node"
      style="left: {toolDrag.clientX}px; top: {toolDrag.clientY}px; --color: {NODE_COLORS[toolDrag.type]}"
    >
      <span class="ghost-emoji">{NODE_EMOJIS[toolDrag.type]}</span>
    </div>
  {/if}

  <!-- Toolbar -->
  <div class="toolbar">
    <div class="toolbar-left">
      {#each NODE_TYPES as type}
        <button
          class="tool-btn"
          style="--accent: {NODE_COLORS[type]}"
          onpointerdown={e => startToolDrag(type, e)}
          onpointermove={moveToolDrag}
          onpointerup={endToolDrag}
          onpointercancel={cancelToolDrag}
        >
          <span class="tool-icon">{NODE_EMOJIS[type]}</span>
          <span class="tool-label">{NODE_LABELS[type].slice(0, 4)}</span>
        </button>
      {/each}
    </div>
    <div class="toolbar-right">
      <button class="time-btn {speed === 0 ? 'active' : ''}" onpointerdown={() => speed = 0}>⏸</button>
      <button class="time-btn {speed === 1 ? 'active' : ''}" onpointerdown={() => speed = 1}>▶</button>
      <button class="time-btn {speed === 3 ? 'active' : ''}" onpointerdown={() => speed = 3}>⏩</button>
    </div>
  </div>
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

  /* Market bar */
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

  .market-label {
    color: #666;
  }

  .market-item {
    color: #fbbf24;
    font-weight: 600;
  }

  .market-mode {
    margin-left: auto;
    color: #7c3aed;
    font-size: 12px;
  }

  /* SVG canvas */
  .graph {
    flex: 1;
    width: 100%;
    touch-action: none;
    cursor: crosshair;
  }

  :global(.edge) {
    stroke: #555;
    stroke-width: 1.5;
    pointer-events: none;
  }

  :global(.arrowhead) {
    fill: #555;
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

  :global(.action-btn) {
    cursor: pointer;
  }

  :global(.action-label) {
    font-size: 16px;
    text-anchor: middle;
    pointer-events: none;
  }

  /* Toolbar */
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
    background: #111;
    border-top: 1px solid #222;
    flex-shrink: 0;
    min-height: 64px;
    gap: 8px;
  }

  .toolbar-left {
    display: flex;
    gap: 8px;
  }

  .toolbar-right {
    display: flex;
    gap: 8px;
  }

  .tool-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 52px;
    min-height: 52px;
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 10px;
    color: #e8e8e8;
    cursor: pointer;
    font-family: inherit;
    transition: border-color 0.15s;
    gap: 2px;
    padding: 4px 6px;
  }

  .tool-icon {
    font-size: 20px;
    line-height: 1;
  }

  .tool-label {
    font-size: 9px;
    color: #aaa;
    font-family: ui-monospace, monospace;
  }

  .time-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    min-height: 48px;
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 10px;
    color: #e8e8e8;
    font-size: 18px;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .time-btn.active {
    border-color: #7c3aed;
    background: #1e1330;
  }

  .ghost-node {
    position: fixed;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: var(--color);
    opacity: 0.6;
    pointer-events: none;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .ghost-emoji {
    font-size: 24px;
    line-height: 1;
  }
</style>
