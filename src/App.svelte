<script>
  import { gs } from './lib/state.svelte.js'
  import { NODE_REGISTRY, NODE_TYPES, TICK_BASE } from './lib/nodes.js'
  import { RESOURCE_ICONS } from './lib/resources.js'
  import { startToolDrag, setMerchantSellItem, setEdgeResource } from './lib/interactions.js'
  import GraphCanvas from './lib/GraphCanvas.svelte'
  import CustomizePanel from './lib/CustomizePanel.svelte'
  import EdgeResourcePicker from './lib/EdgeResourcePicker.svelte'
  import TimeControlPanel from './lib/TimeControlPanel.svelte'

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
  let tickInterval = null
  $effect(() => {
    if (tickInterval) clearInterval(tickInterval)
    if (gs.speed === 0) { tickInterval = null; return }
    tickInterval = setInterval(() => gs.tick(), TICK_BASE / gs.speed)
    return () => { if (tickInterval) clearInterval(tickInterval) }
  })

  // Animation RAF loop
  let rafId = null
  $effect(() => {
    function loop() { gs.animFrame = performance.now(); rafId = requestAnimationFrame(loop) }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  })
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
  <GraphCanvas />

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
