<script>
  import { onMount } from 'svelte'
  import { state as gs, addNode, addEdge, ui, cycleNodeType } from '../state.svelte.js'
  import { NODE_REGISTRY, NODE_TYPES } from '../nodes/registry.js'
  import { RESOURCE_REGISTRY } from '../resources/registry.js'
  import { createCamera, applyPan, applyZoom, screenToWorld } from '../camera.js'
  import NodeMenu from './NodeMenu.svelte'
  import EdgeMenu from './EdgeMenu.svelte'

  const NODE_R = 30

  let camera = $state(createCamera())
  let nodeMenu = $state(null)
  let edgeMenu = $state(null)
  let edgeDrag = $state(null)

  let svgEl
  let isPanning = false
  let panLast = { x: 0, y: 0 }
  let didMove = false

  const nodeMap = $derived(
    Object.fromEntries(gs.nodes.map(n => [n.id, n]))
  )

  const cameraTransform = $derived(
    `translate(${camera.x},${camera.y}) scale(${camera.scale})`
  )

  function closeMenus() {
    nodeMenu = null
    edgeMenu = null
  }

  function toWorld(e) {
    const r = svgEl.getBoundingClientRect()
    return screenToWorld(camera, e.clientX - r.left, e.clientY - r.top)
  }

  function hitNode(wx, wy) {
    for (const n of gs.nodes) {
      const dx = wx - n.x, dy = wy - n.y
      if (dx * dx + dy * dy <= NODE_R * NODE_R) return n
    }
    return null
  }

  function hitEdge(wx, wy) {
    const thr = Math.max(64, (12 / camera.scale) ** 2)
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

  function onMousedown(e) {
    if (e.button !== 0) return
    if (nodeMenu || edgeMenu) { closeMenus(); return }
    e.preventDefault()
    const w = toWorld(e)
    const n = hitNode(w.x, w.y)
    if (n) {
      edgeDrag = { fromId: n.id, curX: w.x, curY: w.y }
      didMove = false
    } else {
      isPanning = true
      panLast = { x: e.clientX, y: e.clientY }
      didMove = false
    }
  }

  function onMousemove(e) {
    if (edgeDrag) {
      const w = toWorld(e)
      edgeDrag.curX = w.x
      edgeDrag.curY = w.y
      didMove = true
    } else if (isPanning) {
      const dx = e.clientX - panLast.x
      const dy = e.clientY - panLast.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didMove = true
      applyPan(camera, dx, dy)
      panLast = { x: e.clientX, y: e.clientY }
    }
  }

  function onMouseup(e) {
    if (e.button !== 0) return
    if (edgeDrag) {
      const w = toWorld(e)
      const n = hitNode(w.x, w.y)
      if (n && n.id !== edgeDrag.fromId) addEdge(edgeDrag.fromId, n.id)
      edgeDrag = null
    } else if (isPanning) {
      if (!didMove) {
        const w = toWorld(e)
        addNode(NODE_TYPES[ui.nodeTypeIdx], w.x, w.y)
        cycleNodeType()
      }
      isPanning = false
    }
  }

  function onWheel(e) {
    e.preventDefault()
    const r = svgEl.getBoundingClientRect()
    applyZoom(camera, e.deltaY, e.clientX - r.left, e.clientY - r.top)
  }

  function onContextmenu(e) {
    e.preventDefault()
    const w = toWorld(e)
    const n = hitNode(w.x, w.y)
    if (n) { nodeMenu = { node: n, x: e.clientX, y: e.clientY }; edgeMenu = null; return }
    const edge = hitEdge(w.x, w.y)
    if (edge) { edgeMenu = { edge, x: e.clientX, y: e.clientY }; nodeMenu = null; return }
    closeMenus()
  }

  onMount(() => {
    svgEl.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('mousemove', onMousemove)
    window.addEventListener('mouseup', onMouseup)
    return () => {
      svgEl.removeEventListener('wheel', onWheel)
      window.removeEventListener('mousemove', onMousemove)
      window.removeEventListener('mouseup', onMouseup)
    }
  })

  function invEntries(node) {
    return Object.entries(node.inventory).filter(([, v]) => v > 0)
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
<svg
  bind:this={svgEl}
  class="canvas"
  role="application"
  aria-label="Graph canvas"
  onmousedown={onMousedown}
  oncontextmenu={onContextmenu}
>
  <g transform={cameraTransform}>

    <!-- Edges -->
    {#each gs.edges as edge (edge.id)}
      {@const src = nodeMap[edge.from]}
      {@const dst = nodeMap[edge.to]}
      {#if src && dst}
        <line x1={src.x} y1={src.y} x2={dst.x} y2={dst.y} class="edge-line" />
        <line x1={src.x} y1={src.y} x2={dst.x} y2={dst.y} class="edge-hit" />
        {#if edge.resource}
          {@const res = RESOURCE_REGISTRY[edge.resource]}
          <text
            x={(src.x + dst.x) / 2}
            y={(src.y + dst.y) / 2 - 10}
            class="edge-res"
          >{res?.icon}</text>
        {/if}
      {/if}
    {/each}

    <!-- Edge drag preview -->
    {#if edgeDrag && nodeMap[edgeDrag.fromId]}
      {@const src = nodeMap[edgeDrag.fromId]}
      <line
        x1={src.x} y1={src.y}
        x2={edgeDrag.curX} y2={edgeDrag.curY}
        class="edge-preview"
        pointer-events="none"
      />
    {/if}

    <!-- Nodes -->
    {#each gs.nodes as node (node.id)}
      {@const def = NODE_REGISTRY[node.type]}
      {@const inv = invEntries(node)}
      <circle cx={node.x} cy={node.y} r={NODE_R} fill={def?.color ?? '#555'} class="node-circle" />
      <text x={node.x} y={node.y} class="node-icon" text-anchor="middle" dominant-baseline="middle">{def?.icon}</text>
      <text x={node.x} y={node.y + NODE_R + 14} class="node-label" text-anchor="middle">{def?.label}</text>
      {#each inv as [rid, count], k}
        {@const res = RESOURCE_REGISTRY[rid]}
        <text
          x={node.x + (k - (inv.length - 1) / 2) * 24}
          y={node.y + NODE_R + 30}
          class="inv-icon"
          text-anchor="middle"
        >{res?.icon}{count > 1 ? `×${count}` : ''}</text>
      {/each}
    {/each}

    <!-- Transport animations -->
    {#each gs.animations as anim, i (gs.tick + '_' + i)}
      {@const res = RESOURCE_REGISTRY[anim.resource]}
      <g pointer-events="none">
        <animateTransform
          attributeName="transform"
          type="translate"
          from="{anim.fromX},{anim.fromY}"
          to="{anim.toX},{anim.toY}"
          dur="0.9s"
          fill="freeze"
        />
        <circle r="13" fill="rgba(10,10,10,0.75)" />
        <text text-anchor="middle" dominant-baseline="middle" font-size="14">{res?.icon}</text>
      </g>
    {/each}

  </g>
</svg>

{#if nodeMenu}
  <NodeMenu node={nodeMenu.node} x={nodeMenu.x} y={nodeMenu.y} onclose={closeMenus} />
{/if}
{#if edgeMenu}
  <EdgeMenu edge={edgeMenu.edge} x={edgeMenu.x} y={edgeMenu.y} onclose={closeMenus} />
{/if}

<style>
  .canvas { width: 100%; height: 100%; display: block; cursor: default; }
  .edge-line { stroke: #333; stroke-width: 2; pointer-events: none; }
  .edge-hit { stroke: transparent; stroke-width: 18; cursor: pointer; }
  .edge-preview { stroke: #555; stroke-width: 2; stroke-dasharray: 6 3; }
  .edge-res { font-size: 14px; text-anchor: middle; dominant-baseline: middle; pointer-events: none; }
  .node-circle { stroke: #2a2a2a; stroke-width: 2; }
  .node-icon { font-size: 20px; pointer-events: none; }
  .node-label { font-size: 11px; fill: #888; pointer-events: none; }
  .inv-icon { font-size: 13px; pointer-events: none; }
</style>
