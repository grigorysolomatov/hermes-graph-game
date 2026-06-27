export default {
  id: 'sea',
  label: 'Sea',
  icon: '🌊',
  color: '#38bdf8',
  accepts: ['labor'],
  inventoryCap: 100,
  onTick(node) {
    const labor = node.inventory.labor || 0
    if (labor > 0) {
      delete node.inventory.labor
      node.inventory.fish = (node.inventory.fish || 0) + labor
    }
  }
}
