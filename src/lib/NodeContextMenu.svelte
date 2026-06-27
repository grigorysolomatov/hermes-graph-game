<script>
  import { NODE_REGISTRY, NODE_RADIUS } from './registry.js'

  let { node, onConnect, onCustomize, onDelete } = $props()

  const isMerchant = $derived(NODE_REGISTRY[node.type].isMerchant)
</script>

<g
  class="action-btn"
  transform={`translate(${node.x - 52}, ${node.y - NODE_RADIUS - 32})`}
  onpointerdown={e => { e.stopPropagation(); onConnect() }}
>
  <rect x="-24" y="-24" width="48" height="48" rx="10" fill="#7c3aed" />
  <text class="action-label" x="0" y="7">🔗</text>
</g>

<g
  class="action-btn"
  transform={`translate(${node.x}, ${node.y - NODE_RADIUS - 32})`}
  opacity={isMerchant ? 1 : 0.35}
  onpointerdown={e => { e.stopPropagation(); if (isMerchant) onCustomize() }}
>
  <rect x="-24" y="-24" width="48" height="48" rx="10" fill={isMerchant ? '#374151' : '#1f2937'} />
  <text class="action-label" x="0" y="7">⚙️</text>
</g>

<g
  class="action-btn"
  transform={`translate(${node.x + 52}, ${node.y - NODE_RADIUS - 32})`}
  onpointerdown={e => { e.stopPropagation(); onDelete() }}
>
  <rect x="-24" y="-24" width="48" height="48" rx="10" fill="#dc2626" />
  <text class="action-label" x="0" y="7">🗑️</text>
</g>
