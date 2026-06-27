<script>
  import { RESOURCE_REGISTRY } from '../resources/registry.js'
  import { removeNode } from '../state.svelte.js'

  let { node, x, y, onclose } = $props()

  function del() {
    removeNode(node.id)
    onclose()
  }

  const entries = $derived(
    Object.entries(node.inventory).filter(([, v]) => v > 0)
  )
</script>

<div class="menu" style="left:{x}px; top:{y}px">
  <div class="title">{node.type}</div>
  <div class="inventory">
    {#if entries.length === 0}
      <span class="dim">empty</span>
    {:else}
      {#each entries as [rid, count]}
        {@const res = RESOURCE_REGISTRY[rid]}
        <span class="item">{res?.icon ?? rid} ×{count}</span>
      {/each}
    {/if}
  </div>
  <hr />
  <button onclick={del}>Delete node</button>
  <button onclick={onclose}>Close</button>
</div>

<style>
  .menu {
    position: fixed;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    min-width: 140px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .title {
    font-weight: 600;
    text-transform: capitalize;
    margin-bottom: 4px;
  }
  .inventory {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 20px;
  }
  .item { font-size: 13px; }
  .dim { color: var(--text-dim); font-size: 12px; }
  hr { border: none; border-top: 1px solid var(--border); margin: 4px 0; }
  button {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    text-align: left;
  }
  button:hover { background: var(--border); }
</style>
