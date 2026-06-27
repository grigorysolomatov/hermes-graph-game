<script>
  import { NODE_REGISTRY, NODE_RADIUS } from './registry.js'

  let { node, onConnect, onCustomize, onDelete } = $props()

  const hasSettings = $derived(Object.keys(NODE_REGISTRY[node.type].defaultSettings).length > 0)
  const connectX = $derived(node.x + (hasSettings ? -52 : -26))
  const deleteX = $derived(node.x + (hasSettings ? 52 : 26))
  const menuY = $derived(node.y - NODE_RADIUS - 32)
</script>

<g
  class="action-btn"
  transform={`translate(${connectX}, ${menuY})`}
  onpointerdown={e => { e.stopPropagation(); onConnect() }}
>
  <rect x="-24" y="-24" width="48" height="48" rx="10" fill="#7c3aed" />
  <text class="action-label" x="0" y="7">🔗</text>
</g>

{#if hasSettings}
<g
  class="action-btn"
  transform={`translate(${node.x}, ${menuY})`}
  onpointerdown={e => { e.stopPropagation(); onCustomize() }}
>
  <rect x="-24" y="-24" width="48" height="48" rx="10" fill="#374151" />
  <text class="action-label" x="0" y="7">⚙️</text>
</g>
{/if}

<g
  class="action-btn"
  transform={`translate(${deleteX}, ${menuY})`}
  onpointerdown={e => { e.stopPropagation(); onDelete() }}
>
  <rect x="-24" y="-24" width="48" height="48" rx="10" fill="#dc2626" />
  <text class="action-label" x="0" y="7">🗑️</text>
</g>

<style>
  .action-btn { cursor: pointer; }
  .action-label {
    font-size: 16px;
    text-anchor: middle;
    pointer-events: none;
  }
</style>
