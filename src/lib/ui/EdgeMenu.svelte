<script>
  import { RESOURCE_REGISTRY } from '../resources/registry.js'
  import { NODE_REGISTRY } from '../nodes/registry.js'
  import { state as gs, setEdgeResource, removeEdge } from '../state.svelte.js'

  let { edge, x, y, onclose } = $props()

  const targetNode = $derived(gs.nodes.find(n => n.id === edge.to))
  const targetDef = $derived(targetNode ? NODE_REGISTRY[targetNode.type] : null)
  const acceptedResources = $derived(targetDef ? targetDef.accepts : [])

  function pick(rid) {
    setEdgeResource(edge.id, rid)
    onclose()
  }

  function del() {
    removeEdge(edge.id)
    onclose()
  }
</script>

<div class="menu" style="left:{x}px; top:{y}px">
  <div class="title">Edge resource</div>
  {#if acceptedResources.length === 0}
    <span class="dim">Target accepts nothing</span>
  {:else}
    {#each acceptedResources as rid}
      {@const res = RESOURCE_REGISTRY[rid]}
      <button
        class:active={edge.resource === rid}
        onclick={() => pick(rid)}
      >
        {res?.icon ?? rid} {res?.label ?? rid}
      </button>
    {/each}
  {/if}
  <button onclick={() => pick(null)}>Clear</button>
  <hr />
  <button onclick={del}>Delete edge</button>
  <button onclick={onclose}>Close</button>
</div>

<style>
  .menu {
    position: fixed;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 8px;
    min-width: 150px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .title { font-weight: 600; margin-bottom: 4px; }
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
  button.active { border-color: var(--accent); color: var(--accent); }
</style>
