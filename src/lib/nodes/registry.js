import worker from './worker.js'
import sea from './sea.js'

export const NODE_REGISTRY = {
  [worker.id]: worker,
  [sea.id]: sea,
}

export const NODE_TYPES = Object.keys(NODE_REGISTRY)
