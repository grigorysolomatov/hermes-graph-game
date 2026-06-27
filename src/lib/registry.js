export const NODE_REGISTRY = {
  lumberjack: { label: 'Lumberjack', emoji: '🪓', color: '#84cc16', produces: { wood: 1 }, recipe: null, isMerchant: false, isSink: false, defaultSettings: {} },
  carpenter:  { label: 'Carpenter',  emoji: '🔨', color: '#a78bfa', produces: null, recipe: { inputs: { wood: 2 }, outputs: { chair: 1 } }, isMerchant: false, isSink: false, defaultSettings: {} },
  merchant:   { label: 'Merchant',   emoji: '🏪', color: '#f59e0b', produces: null, recipe: null, isMerchant: true,  isSink: false, defaultSettings: { sellItem: null } },
  chest:      { label: 'Chest',      emoji: '📦', color: '#6b7280', produces: null, recipe: null, isMerchant: false, isSink: true,  defaultSettings: {} },
}

export const NODE_TYPES = Object.keys(NODE_REGISTRY)
export const RESOURCES = ['wood', 'chair', 'coin']
export const RESOURCE_ICONS = { wood: '🪵', chair: '🪑', coin: '🪙' }
export const RESOURCE_COLORS = { wood: '#92400e', chair: '#d97706', coin: '#fbbf24' }
export const NODE_RADIUS = 28
export const ANIM_DURATION = 400
export const TICK_BASE = 500
export const SCALE_MIN = 0.2
export const SCALE_MAX = 4
