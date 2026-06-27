<script>
  import { onMount } from 'svelte'
  import { state as gs, startLoop, stopLoop, addNode } from './lib/state.svelte.js'
  import { NODE_REGISTRY, NODE_TYPES } from './lib/nodes/registry.js'
  import { screenToWorld } from './lib/camera.js'
  import GraphCanvas from './lib/ui/GraphCanvas.svelte'

  let canvasWrap

  onMount(() => {
    startLoop()
    return () => stopLoop()
  })

  let speedCollapsed = $state(false)

  function onToolPointerDown(e, type) {
    e.preventDefault()
    gs.toolDrag = { type, clientX: e.clientX, clientY: e.clientY }

    function onMove(ev) {
      if (gs.toolDrag) {
        gs.toolDrag.clientX = ev.clientX
        gs.toolDrag.clientY = ev.clientY
      }
    }

    function onUp(ev) {
      if (gs.toolDrag) {
        const rect = canvasWrap?.getBoundingClientRect()
        if (rect &&
            ev.clientX >= rect.left && ev.clientX <= rect.right &&
            ev.clientY >= rect.top && ev.clientY <= rect.bottom) {
          const w = screenToWorld(gs.cam, ev.clientX - rect.left, ev.clientY - rect.top)
          addNode(gs.toolDrag.type, w.x, w.y)
        }
        gs.toolDrag = null
      }
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }
</script>

<div class="app">
  <div class="canvas-wrap" bind:this={canvasWrap}>
    <GraphCanvas />
  </div>

  <!-- Time controls: right side, vertically centered, collapsible -->
  <div class="time-panel" class:collapsed={speedCollapsed}>
    <button
      class="collapse-tab"
      onpointerdown={(e) => { e.preventDefault(); speedCollapsed = !speedCollapsed }}
      aria-label="Toggle time controls"
    >{speedCollapsed ? '◀' : '▶'}</button>
    <div class="time-buttons">
      <button
        class="speed-btn"
        class:active={gs.speed === 0}
        onpointerdown={(e) => { e.preventDefault(); gs.speed = 0 }}
        aria-label="Pause"
      >⏸</button>
      <button
        class="speed-btn"
        class:active={gs.speed === 1}
        onpointerdown={(e) => { e.preventDefault(); gs.speed = 1 }}
        aria-label="Normal speed"
      >▶️</button>
      <button
        class="speed-btn"
        class:active={gs.speed === 3}
        onpointerdown={(e) => { e.preventDefault(); gs.speed = 3 }}
        aria-label="Fast"
      >⏩</button>
    </div>
  </div>

  <!-- Bottom toolbar: drag-to-place node buttons -->
  <div class="toolbar">
    {#each NODE_TYPES as type}
      {@const def = NODE_REGISTRY[type]}
      <button
        class="tool-btn"
        onpointerdown={(e) => onToolPointerDown(e, type)}
        aria-label="Place {def?.label}"
      >
        <span class="tool-icon">{def?.icon}</span>
        <span class="tool-label">{def?.label}</span>
      </button>
    {/each}
    <span class="tick-display">#{gs.tick}</span>
  </div>
</div>

<!-- Ghost follows finger/cursor during drag -->
{#if gs.toolDrag}
  {@const def = NODE_REGISTRY[gs.toolDrag.type]}
  <div
    class="ghost"
    style="left:{gs.toolDrag.clientX}px;top:{gs.toolDrag.clientY}px"
    aria-hidden="true"
  >
    <div class="ghost-circle">{def?.icon}</div>
  </div>
{/if}

<style>
  .app {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100dvh;
    position: relative;
    overflow: hidden;
  }

  .canvas-wrap {
    flex: 1;
    overflow: hidden;
    position: relative;
    min-height: 0;
  }

  /* ── Time panel ── */
  .time-panel {
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    z-index: 50;
    transition: translate 0.2s;
  }
  .time-panel.collapsed {
    translate: calc(100% - 28px) 0;
  }

  .collapse-tab {
    width: 28px;
    height: 60px;
    background: #111;
    border: 1px solid #333;
    border-right: none;
    border-radius: 6px 0 0 6px;
    color: #666;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
    flex-shrink: 0;
  }
  .collapse-tab:hover { color: #aaa; }

  .time-buttons {
    display: flex;
    flex-direction: column;
    background: #111;
    border: 1px solid #333;
    border-left: none;
    border-radius: 0 6px 6px 0;
    padding: 6px 5px;
    gap: 4px;
  }

  .speed-btn {
    width: 44px;
    height: 44px;
    background: transparent;
    border: 1px solid #333;
    border-radius: 6px;
    color: #888;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
  }
  .speed-btn:hover { background: #1a1a1a; color: #ccc; }
  .speed-btn.active {
    border-color: #7c3aed;
    background: rgba(124, 58, 237, 0.15);
    color: #a78bfa;
  }

  /* ── Toolbar ── */
  .toolbar {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    padding-bottom: max(8px, env(safe-area-inset-bottom));
    background: #111;
    border-top: 1px solid #222;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .toolbar::-webkit-scrollbar { display: none; }

  .tool-btn {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 56px;
    height: 56px;
    background: #1a1a1a;
    border: 1px solid #2a2a2a;
    border-radius: 10px;
    color: #e0e0e0;
    cursor: grab;
    touch-action: none;
    user-select: none;
    transition: background 0.1s, border-color 0.1s;
  }
  .tool-btn:active { background: #222; border-color: #7c3aed; cursor: grabbing; }

  .tool-icon { font-size: 22px; line-height: 1; }
  .tool-label { font-size: 10px; color: #666; }

  .tick-display {
    margin-left: auto;
    font-size: 11px;
    color: #444;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* ── Ghost drag ── */
  .ghost {
    position: fixed;
    pointer-events: none;
    z-index: 200;
    transform: translate(-50%, -50%);
  }
  .ghost-circle {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: rgba(124, 58, 237, 0.25);
    border: 2px dashed #7c3aed;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    opacity: 0.85;
  }
</style>
