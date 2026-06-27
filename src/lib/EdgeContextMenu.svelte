<script>
  let { x, y, onSetResource, onDelete } = $props()
</script>

<g
  class="action-btn"
  transform={`translate(${x - 28}, ${y - 36})`}
  onpointerdown={e => { e.stopPropagation(); onSetResource() }}
>
  <rect x="-24" y="-24" width="48" height="48" rx="10" fill="#374151" />
  <text class="action-label" x="0" y="7">🎯</text>
</g>

<g
  class="action-btn"
  transform={`translate(${x + 28}, ${y - 36})`}
  onpointerdown={e => { e.stopPropagation(); onDelete() }}
>
  <rect x="-24" y="-24" width="48" height="48" rx="10" fill="#dc2626" />
  <text class="action-label" x="0" y="7">🗑️</text>
</g>
