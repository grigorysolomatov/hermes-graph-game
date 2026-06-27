<script>
  import { RESOURCES, RESOURCE_ICONS } from './registry.js'

  let { edge, onClose, onSetResource } = $props()
</script>

<div class="modal-backdrop" onpointerdown={onClose}>
  <div class="modal-panel" onpointerdown={e => e.stopPropagation()}>
    <div class="modal-title">Edge Resource</div>
    <label class="modal-field">
      <span class="modal-field-label">Transport resource</span>
      <select
        class="modal-select"
        value={edge.resource ?? ''}
        onchange={e => onSetResource(edge.id, e.currentTarget.value)}
      >
        <option value="">None (inactive)</option>
        {#each RESOURCES as res}
          <option value={res}>{RESOURCE_ICONS[res]} {res.charAt(0).toUpperCase() + res.slice(1)}</option>
        {/each}
      </select>
    </label>
    <button class="modal-close-btn" onpointerdown={onClose}>Done</button>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
  }

  .modal-panel {
    background: #111;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 20px;
    min-width: 260px;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modal-title {
    font-size: 15px;
    font-weight: 600;
    color: #e8e8e8;
  }

  .modal-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .modal-field-label {
    font-size: 12px;
    color: #aaa;
  }

  .modal-select {
    background: #1a1a1a;
    border: 1px solid #444;
    border-radius: 8px;
    color: #e8e8e8;
    font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
    font-size: 14px;
    padding: 8px 10px;
    cursor: pointer;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
  }

  .modal-close-btn {
    align-self: flex-end;
    background: #7c3aed;
    border: none;
    border-radius: 8px;
    color: #e8e8e8;
    font-family: ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 20px;
    cursor: pointer;
    min-height: 40px;
  }
</style>
