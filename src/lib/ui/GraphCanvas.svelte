<script>
  import { onMount } from 'svelte'
  import { state as gs, addEdge, removeNode, removeEdge, setEdgeResource, ANIM_DURATION } from '../state.svelte.js'
  import { NODE_REGISTRY } from '../nodes/registry.js'
  import { RESOURCE_REGISTRY } from '../resources/registry.js'
  import { applyPan, applyZoom, screenToWorld } from '../camera.js'

  const NODE_R = 28
  const BTN_R = 20
  const BTN_GAP = 50

  let svgEl
  let isPanning = false
  let panLast = { x: 0, y: 0 }
  let edgePickerMenu = $state(null)      // { edge, x, y } in client coords
  let dragState = null                   // { nodeId, startWX, startWY, nodeStartX, nodeStartY }
  let isDragging = false

  const nodeMap = $derived(Object.fromEntries(gs.nodes.map(n => [n.id, n])))
  const selectedNode = $derived(gs.selectedId ? nodeMap[gs.selectedId] : null)
  const cameraTransform = $derived(
    `translate(${gs.cam.x},${gs.cam.y}) scale(${gs.cam.scale})`
  )

  function svgBounds() {
    return svgEl?.getBoundingClientRect() ?? { left: 0, top: 0 }
  }

  function toWorld(clientX, clientY) {
    const r = svgBounds()
    return screenToWorld(gs.cam, clientX - r.left, clientY - r.top)
  }

  function hitNode(wx, wy) {
    for (const n of gs.nodes) {
      const dx = wx - n.x, dy = wy - n.y
      if (dx * dx + dy * dy <= NODE_R * NODE_R) return n
    }
    return null
  }

  function hitEdge(wx, wy) {
    const thr = Math.max(100, (14 / gs.cam.scale) ** 2)
    for (const edge of gs.edges) {
      const a = nodeMap[edge.from], b = nodeMap[edge.to]
      if (!a || !b) continue
      const dx = b.x - a.x, dy = b.y - a.y
      const len2 = dx * dx + dy * dy
      if (len2 === 0) continue
      const t = Math.max(0, Math.min(1, ((wx - a.x) * dx + (wy - a.y) * dy) / len2))
      const px = a.x + t * dx - wx, py = a.y + t * dy - wy
      if (px * px + py * py <= thr) return edge
    }
    return null
  }

  function dismiss() {
    gs.selectedId = null
    gs.selectedEdgeId = null
    gs.mode = 'select'
    gs.connectSourceId = null
    edgePickerMenu = null
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    const w = toWorld(e.clientX, e.clientY)

    // Connect mode: next tap on a different node creates edge
    if (gs.mode === 'connect') {
      const n = hitNode(w.x, w.y)
      if (n && n.id !== gs.connectSourceId) {
        addEdge(gs.connectSourceId, n.id)
      }
      gs.mode = 'select'
      gs.connectSourceId = null
      gs.selectedId = null
      return
    }

    const n = hitNode(w.x, w.y)
    if (n) {
      gs.selectedId = n.id
      gs.selectedEdgeId = null
      edgePickerMenu = null
      dragState = { nodeId: n.id, startWX: w.x, startWY: w.y, nodeStartX: n.x, nodeStartY: n.y }
      isDragging = false
      svgEl?.setPointerCapture(e.pointerId)
      return
    }

    const edge = hitEdge(w.x, w.y)
    if (edge) {
      gs.selectedId = null
      gs.selectedEdgeId = edge.id
      edgePickerMenu = { edge, x: e.clientX, y: e.clientY }
      return
    }

    // Empty canvas — dismiss menus, start pan
    dismiss()
    isPanning = true
    panLast = { x: e.clientX, y: e.clientY }
    svgEl?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (dragState) {
      const w = toWorld(e.clientX, e.clientY)
      const dx = w.x - dragState.startWX
      const dy = w.y - dragState.startWY
      if (!isDragging && Math.hypot(dx, dy) * gs.cam.scale > 4) {
        isDragging = true
      }
      if (isDragging) {
        const node = gs.nodes.find(n => n.id === dragState.nodeId)
        if (node) {
          node.x = dragState.nodeStartX + dx
          node.y = dragState.nodeStartY + dy
        }
      }
      return
    }
    if (!isPanning) return
    const dx = e.clientX - panLast.x
    const dy = e.clientY - panLast.y
    applyPan(gs.cam, dx, dy)
    panLast = { x: e.clientX, y: e.clientY }
  }

  function onPointerUp(e) {
    if (dragState) {
      dragState = null
      isDragging = false
      svgEl?.releasePointerCapture(e.pointerId)
      return
    }
    if (isPanning) {
      isPanning = false
      svgEl?.releasePointerCapture(e.pointerId)
    }
  }

  function onWheel(e) {
    e.preventDefault()
    const r = svgBounds()
    applyZoom(gs.cam, e.deltaY, e.clientX - r.left, e.clientY - r.top)
  }

  // Context menu actions — stopPropagation prevents SVG handler from firing
  function handleConnect(nodeId, e) {
    e.stopPropagation()
    e.preventDefault()
    gs.mode = 'connect'
    gs.connectSourceId = nodeId
    gs.selectedId = null
  }

  function handleDelete(nodeId, e) {
    e.stopPropagation()
    e.preventDefault()
    removeNode(nodeId)
    gs.selectedId = null
  }

  function pickEdgeResource(rid) {
    if (edgePickerMenu) setEdgeResource(edgePickerMenu.edge.id, rid)
    edgePickerMenu = null
    gs.selectedEdgeId = null
  }

  function deleteEdge() {
    if (edgePickerMenu) removeEdge(edgePickerMenu.edge.id)
    edgePickerMenu = null
    gs.selectedEdgeId = null
  }

  onMount(() => {
    svgEl.addEventListener('wheel', onWheel, { passive: false })
    return () => svgEl.removeEventListener('wheel', onWheel)
  })

  function animPos(anim) {
    const t = Math.min(1, (gs.animFrame - anim.startTime) / ANIM_DURATION)
    const ease = t * t * (3 - 2 * t)
    return {
      x: anim.x1 + (anim.x2 - anim.x1) * ease,
      y: anim.y1 + (anim.y2 - anim.y1) * ease,
    }
  }

  function invEntries(inv) {
    return Object.entries(inv).filter(([, v]) => v > 0)
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
<svg
  bind:this={svgEl}
  class="canvas"
  class:connect-mode={gs.mode === 'connect'}
  role="application"
  aria-label="Graph canvas"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
>
  <defs>
    <marker id="arr" markerWidth="7" markerHeight="7" refX="7" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#666" />
    </marker>
  </defs>

  <g transform={cameraTransform}>

    <!-- Edges -->
    {#each gs.edges as edge (edge.id)}
      {@const src = nodeMap[edge.from]}
      {@const dst = nodeMap[edge.to]}
      {#if src && dst}
        {@const _len = Math.sqrt((dst.x-src.x)**2 + (dst.y-src.y)**2)}
        {@const ux = _len > 0 ? (dst.x-src.x)/_len : 0}
        {@const uy = _len > 0 ? (dst.y-src.y)/_len : 0}
        {@const x1 = src.x + ux * NODE_R}
        {@const y1 = src.y + uy * NODE_R}
        {@const x2 = dst.x - ux * NODE_R}
        {@const y2 = dst.y - uy * NODE_R}
        {@const mx = (src.x + dst.x) / 2}
        {@const my = (src.y + dst.y) / 2}
        <line
          x1={x1} y1={y1} x2={x2} y2={y2}
          class="edge-line"
          class:edge-sel={gs.selectedEdgeId === edge.id}
          marker-end="url(#arr)"
        />
        <!-- Wide transparent hit area -->
        <line x1={x1} y1={y1} x2={x2} y2={y2} class="edge-hit" />
        {#if edge.resource}
          {@const res = RESOURCE_REGISTRY[edge.resource]}
          <text x={mx} y={my} dy={-12} class="edge-res">{res?.icon}</text>
        {/if}
      {/if}
    {/each}

    <!-- Nodes -->
    {#each gs.nodes as node (node.id)}
      {@const def = NODE_REGISTRY[node.type]}
      {@const inv = invEntries(node.inventory)}
      {@const isConnSrc = gs.connectSourceId === node.id}
      <circle
        cx={node.x} cy={node.y} r={NODE_R}
        fill={def?.color ?? '#555'}
        class="node-circle"
        class:node-sel={gs.selectedId === node.id}
        class:node-conn-src={isConnSrc}
      />
      <text x={node.x} y={node.y} class="node-icon" text-anchor="middle" dominant-baseline="middle">
        {def?.icon}
      </text>
      <text x={node.x} y={node.y + NODE_R + 14} class="node-label" text-anchor="middle">
        {def?.label}
      </text>
      <!-- Inventory: each resource type with count -->
      {#each inv as [rid, count], k}
        {@const res = RESOURCE_REGISTRY[rid]}
        <text
          x={node.x + (k - (inv.length - 1) / 2) * 26}
          y={node.y + NODE_R + 44}
          class="inv-icon"
          text-anchor="middle"
        >{res?.icon}{count}</text>
      {/each}
    {/each}

    <!-- Transport animations -->
    {#each gs.animations as anim (anim.id)}
      {@const pos = animPos(anim)}
      {@const res = RESOURCE_REGISTRY[anim.resource]}
      <text
        x={pos.x} y={pos.y}
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="16"
        pointer-events="none"
        style="user-select:none"
      >{res?.icon}</text>
    {/each}

    <!-- Node context menu (SVG buttons rendered above everything) -->
    {#if selectedNode}
      {@const nx = selectedNode.x}
      {@const ny = selectedNode.y - NODE_R - BTN_R - 10}
      <!-- Connect button -->
      <g
        transform="translate({nx - BTN_GAP / 2},{ny})"
        class="ctx-btn"
        onpointerdown={(e) => handleConnect(selectedNode.id, e)}
        role="button"
        aria-label="Connect"
      >
        <circle r={BTN_R} fill="#7c3aed" />
        <text text-anchor="middle" dominant-baseline="middle" font-size="16">🔗</text>
      </g>
      <!-- Delete button -->
      <g
        transform="translate({nx + BTN_GAP / 2},{ny})"
        class="ctx-btn"
        onpointerdown={(e) => handleDelete(selectedNode.id, e)}
        role="button"
        aria-label="Delete"
      >
        <circle r={BTN_R} fill="#dc2626" />
        <text text-anchor="middle" dominant-baseline="middle" font-size="16">🗑️</text>
      </g>
    {/if}

  </g>
</svg>

<!-- Edge resource picker overlay -->
{#if edgePickerMenu}
  {@const targetNode = gs.nodes.find(n => n.id === edgePickerMenu.edge.to)}
  {@const targetDef = targetNode ? NODE_REGISTRY[targetNode.type] : null}
  {@const accepts = targetDef?.accepts ?? []}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="edge-picker"
    style="left:{edgePickerMenu.x}px;top:{edgePickerMenu.y}px"
    onpointerdown={(e) => e.stopPropagation()}
  >
    <div class="picker-title">Assign resource</div>
    {#if accepts.length === 0}
      <div class="picker-dim">Target accepts nothing</div>
    {:else}
      {#each accepts as rid}
        {@const res = RESOURCE_REGISTRY[rid]}
        <button
          class="picker-btn"
          class:picker-active={edgePickerMenu.edge.resource === rid}
          onpointerdown={(e) => { e.preventDefault(); pickEdgeResource(rid) }}
        >{res?.icon} {res?.label}</button>
      {/each}
    {/if}
    <button
      class="picker-btn"
      onpointerdown={(e) => { e.preventDefault(); pickEdgeResource(null) }}
    >✕ Clear</button>
    <div class="picker-sep"></div>
    <button
      class="picker-btn picker-danger"
      onpointerdown={(e) => { e.preventDefault(); deleteEdge() }}
    >🗑 Delete edge</button>
  </div>
{/if}

<style>
  .canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: default;
    touch-action: none;
    user-select: none;
  }
  .canvas.connect-mode { cursor: crosshair; }

  .edge-line {
    stroke: #2e2e2e;
    stroke-width: 2;
    pointer-events: none;
  }
  .edge-line.edge-sel { stroke: #7c3aed; stroke-width: 2.5; }
  .edge-hit { stroke: transparent; stroke-width: 22; cursor: pointer; }
  .edge-res {
    font-size: 15px;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  .node-circle {
    stroke: #1a1a1a;
    stroke-width: 2;
    cursor: pointer;
    transition: stroke 0.1s;
  }
  .node-circle.node-sel { stroke: #7c3aed; stroke-width: 3; }
  .node-circle.node-conn-src {
    stroke: #7c3aed;
    stroke-width: 3;
    stroke-dasharray: 5 3;
  }

  .node-icon { font-size: 20px; pointer-events: none; }
  .node-label { font-size: 11px; fill: #555; pointer-events: none; }
  .inv-icon { font-size: 12px; fill: #e8e8e8; pointer-events: none; }

  .ctx-btn { cursor: pointer; }

  /* Edge picker overlay */
  .edge-picker {
    position: fixed;
    z-index: 120;
    background: #111;
    border: 1px solid #333;
    border-radius: 10px;
    padding: 10px;
    min-width: 170px;
    display: flex;
    flex-direction: column;
    gap: 5px;
    transform: translate(-50%, -115%);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  }

  .picker-title {
    font-size: 10px;
    font-weight: 600;
    color: #555;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding-bottom: 2px;
  }

  .picker-dim { font-size: 12px; color: #444; padding: 4px 0; }

  .picker-btn {
    background: transparent;
    border: 1px solid #2a2a2a;
    color: #ccc;
    border-radius: 7px;
    padding: 9px 12px;
    cursor: pointer;
    text-align: left;
    font-size: 14px;
    min-height: 44px;
    touch-action: none;
    transition: background 0.1s, border-color 0.1s;
  }
  .picker-btn:hover, .picker-btn:active { background: #1a1a1a; border-color: #444; }
  .picker-btn.picker-active { border-color: #7c3aed; color: #a78bfa; }
  .picker-btn.picker-danger { color: #ef4444; }

  .picker-sep {
    height: 1px;
    background: #222;
    margin: 2px 0;
  }
</style>
