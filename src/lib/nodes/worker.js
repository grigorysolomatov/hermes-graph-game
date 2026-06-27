export default {
  id: 'worker',
  label: 'Worker',
  icon: '👷',
  color: '#4ade80',
  accepts: [],
  inventoryCap: 1,
  onTick(node, def) {
    const total = Object.values(node.inventory).reduce((s, v) => s + v, 0)
    if (total < def.inventoryCap) {
      node.inventory.labor = (node.inventory.labor || 0) + 1
    }
  }
}
