import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { DslNode } from '@/types/dsl'

function findNode(node: DslNode | null, nid: number): DslNode | null {
  if (!node) return null
  if (node.nid === nid) return node
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, nid)
      if (found) return found
    }
  }
  return null
}

function postToParent(type: string, payload: unknown) {
  window.parent?.postMessage({ type, payload }, '*')
}

export const useDslStore = defineStore('dsl', () => {
  const root        = ref<DslNode | null>(null)
  const sourceName  = ref('')
  const isConfirmed = ref(false)

  const isEmpty = computed(() => root.value === null)

  function setRoot(data: DslNode | null, name = '') {
    root.value = data
    sourceName.value = name
    if (data) {
      isConfirmed.value = false
    }
  }

  function updateNodeMeta(nid: number, layerType: string, layerName: string, layerDescription: string) {
    const node = findNode(root.value, nid)
    if (!node) return
    node.layerType        = layerType
    node.layerName        = layerName
    node.layerDescription = layerDescription
    postToParent('DSL_NODE_UPDATED', { nid, changes: { layerType, layerName, layerDescription } })
  }

  function confirmDsl() {
    if (isEmpty.value || isConfirmed.value) return
    isConfirmed.value = true
    postToParent('DSL_RENDER_CONFIRMED', { dsl: root.value })
  }

  return { root, sourceName, isEmpty, isConfirmed, setRoot, updateNodeMeta, confirmDsl }
})
