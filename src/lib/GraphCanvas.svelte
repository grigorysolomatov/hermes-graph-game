<script>
  import { gs } from './state.svelte.js'
  import { NODE_REGISTRY, NODE_RADIUS, ANIM_DURATION, RESOURCE_ICONS } from './registry.js'
  import { computeEdgeGeometry, arrowHead } from './camera.js'
  import {
    computeReverseEdgeIds, EDGE_OFFSET,
    onSvgPointerDown, onSvgPointerMove, onSvgPointerUp, onSvgPointerCancel,
    onTouchStart, onTouchMove, onTouchEnd, onWheel,
    onConnectBtn, onDeleteNodeBtn, onCustomizeBtn,
    onDeleteEdgeBtn, onSetResourceBtn,
  } from './interactions.js'
  import NodeContextMenu from './NodeContextMenu.svelte'
  import EdgeContextMenu from './EdgeContextMenu.svelte'

  const reverseEdgeIds = $derived(computeReverseEdgeIds(gs.edges))

  function animPos(anim) {
    const t = Math.min(1, (gs.animFrame - anim.startTime) / ANIM_DURATION)
    return { x: anim.x1 + (anim.x2 - anim.x1) * t, y: anim.y1 + (anim.y2 - anim.y1) * t }
  }

  function bufferEntries(node) {
    return Object.entries(node.buffer).filter(([, c]) => c > 0)
  }
</script>

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
        {@const offset = reverseEdgeIds.has(edge.id) ? EDGE_OFFSET : 0}
        {@const geo = computeEdgeGeometry(from, to, NODE_RADIUS, offset)}
        {@const isEdgeSel = edge.id === gs.selectedEdgeId}
        {#if geo}
          <line
            class="edge"
            x1={geo.x1} y1={geo.y1}
            x2={geo.x2} y2={geo.y2}
            stroke={isEdgeSel ? '#7c3aed' : '#555'}
          />
          <path
            class="arrowhead"
            d={arrowHead(geo.vfx, geo.vfy, geo.vtx, geo.vty, NODE_RADIUS)}
            fill={isEdgeSel ? '#7c3aed' : '#555'}
          />
          {#if edge.resource}
            <text class="edge-resource-icon" x={geo.mx} y={geo.my}>
              {RESOURCE_ICONS[edge.resource]}
            </text>
          {/if}
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

      {#if def.isMerchant && node.settings.sellItem}
        <text class="merchant-sell-icon" x={node.x + NODE_RADIUS + 10} y={node.y + 6}>
          {RESOURCE_ICONS[node.settings.sellItem]}
        </text>
      {/if}

      {#each buf as [res, count], i}
        <text
          class="buffer-resource"
          x={node.x + (i - (buf.length - 1) / 2) * 32}
          y={node.y + NODE_RADIUS + 30}
        >
          {RESOURCE_ICONS[res]}{count > 1 ? count : ''}
        </text>
      {/each}

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

<style>
  .graph {
    flex: 1;
    width: 100%;
    touch-action: none;
    cursor: crosshair;
  }

  .edge {
    stroke-width: 1.5;
    pointer-events: none;
  }

  .arrowhead { pointer-events: none; }

  .node {
    stroke: #0a0a0a;
    stroke-width: 2;
    cursor: pointer;
  }

  .selected-ring {
    fill: none;
    stroke: white;
    stroke-width: 3;
    pointer-events: none;
  }

  .node-label {
    fill: #e8e8e8;
    font-size: 10px;
    font-family: ui-monospace, monospace;
    text-anchor: middle;
    pointer-events: none;
  }

  .node-emoji {
    font-size: 20px;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  .merchant-sell-icon {
    font-size: 13px;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
    opacity: 0.9;
  }

  .buffer-resource {
    fill: #e8e8e8;
    font-size: 13px;
    text-anchor: middle;
    pointer-events: none;
  }

  .anim-resource {
    font-size: 16px;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }

  .edge-resource-icon {
    font-size: 14px;
    text-anchor: middle;
    dominant-baseline: middle;
    pointer-events: none;
  }
</style>
