<script>
  import { onMount } from 'svelte'
  import { state as gs, ui, startLoop, stopLoop, toggleRunning, addNode, cycleNodeType } from './lib/state.svelte.js'
  import { NODE_REGISTRY, NODE_TYPES } from './lib/nodes/registry.js'
  import GraphCanvas from './lib/ui/GraphCanvas.svelte'

  let placeOffset = $state(0)

  onMount(() => {
    startLoop()
    return () => stopLoop()
  })

  const currentDef = $derived(NODE_REGISTRY[NODE_TYPES[ui.nodeTypeIdx]])

  function placeNode() {
    const col = placeOffset % 4
    const row = Math.floor(placeOffset / 4)
    addNode(NODE_TYPES[ui.nodeTypeIdx], 120 + col * 140, 120 + row * 140)
    placeOffset++
    cycleNodeType()
  }
</script>

<div class="app">
  <div class="canvas-wrap">
    <GraphCanvas />
  </div>
  <div class="toolbar">
    <button class="btn-play" onclick={toggleRunning}>
      {gs.running ? '⏸ Pause' : '▶ Play'}
    </button>
    <div class="sep"></div>
    <button class="btn-add" onclick={placeNode}>
      + {currentDef?.icon} {currentDef?.label}
    </button>
    <button class="btn-cycle" onclick={cycleNodeType} title="Cycle node type">⟳</button>
    <span class="hint">or left-click canvas</span>
    <span class="tick">tick {gs.tick}</span>
  </div>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
  }
  .canvas-wrap {
    flex: 1;
    overflow: hidden;
    position: relative;
  }
  .toolbar {
    flex-shrink: 0;
    height: 48px;
    background: var(--surface);
    border-top: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
  }
  button {
    background: #1a1a1a;
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 4px;
    padding: 5px 12px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
  }
  button:hover { background: var(--border); }
  .btn-play { min-width: 80px; }
  .btn-cycle { padding: 5px 8px; font-size: 15px; }
  .sep { width: 1px; height: 24px; background: var(--border); margin: 0 4px; }
  .hint { font-size: 11px; color: var(--text-dim); }
  .tick { margin-left: auto; font-size: 11px; color: var(--text-dim); font-variant-numeric: tabular-nums; }
</style>
