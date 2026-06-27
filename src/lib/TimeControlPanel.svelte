<script>
  import { gs } from './state.svelte.js'

  let collapsed = $state(false)
</script>

<div class="time-panel" class:collapsed>
  <button
    class="collapse-tab"
    onpointerdown={() => collapsed = !collapsed}
  >{collapsed ? '◀' : '▶'}</button>
  <div class="time-buttons">
    <button
      class="time-btn"
      class:active={gs.speed === 0}
      onpointerdown={() => gs.speed = 0}
    >⏸</button>
    <button
      class="time-btn"
      class:active={gs.speed === 1}
      onpointerdown={() => gs.speed = 1}
    >▶</button>
    <button
      class="time-btn"
      class:active={gs.speed === 3}
      onpointerdown={() => gs.speed = 3}
    >⏩</button>
  </div>
</div>

<style>
  .time-panel {
    position: fixed;
    right: 0;
    top: 50%;
    transform: translateY(-50%) translateX(0);
    transition: transform 0.25s ease;
    display: flex;
    flex-direction: row;
    align-items: center;
    z-index: 100;
  }

  .time-panel.collapsed {
    transform: translateY(-50%) translateX(68px);
  }

  .collapse-tab {
    width: 28px;
    min-height: 84px;
    background: rgba(10, 10, 10, 0.88);
    backdrop-filter: blur(8px);
    border: 1px solid #222;
    border-right: none;
    border-radius: 8px 0 0 8px;
    color: #e8e8e8;
    font-size: 11px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    touch-action: none;
  }

  .time-buttons {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px 6px;
    background: rgba(10, 10, 10, 0.88);
    backdrop-filter: blur(8px);
    border: 1px solid #222;
    border-radius: 0 8px 8px 0;
  }

  .time-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    background: #1a1a1a;
    border: 2px solid #333;
    border-radius: 10px;
    color: #e8e8e8;
    font-size: 20px;
    cursor: pointer;
    touch-action: none;
  }

  .time-btn.active {
    border-color: #7c3aed;
    background: #1e1330;
  }
</style>
