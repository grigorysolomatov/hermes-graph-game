export default {
  id: 'worker',
  label: 'Worker',
  icon: '👷',
  color: '#4ade80',
  accepts: [],
  inventoryCap: 1,
  onTick(node) {
    const total = Object.values(node.inventory).reduce((s, v) => s + v, 0)
    if (total < this.inventoryCap) {
      node.inventory.labor = (node.inventory.labor || 0) + 1
    }
  }
}
