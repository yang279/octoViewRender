import { defineComponent, ref, watch } from 'vue'
import { useDslStore } from '@/stores/dsl'
import type { DslNode } from '@/types/dsl'
import type { ClickPayload } from '@/components/WireframeRenderer'
import WireframeRenderer from '@/components/WireframeRenderer'
import NodeInfoPopover from './NodeInfoPopover'

export default defineComponent({
  name: 'EditorPage',
  setup() {
    const store = useDslStore()

    const selectedNode = ref<DslNode | null>(null)
    const popoverPos   = ref<{ x: number; y: number } | null>(null)

    watch(() => store.root, () => {
      selectedNode.value = null
      popoverPos.value   = null
    })

    function onNodeClick(payload: ClickPayload | null) {
      if (!payload) {
        selectedNode.value = null
        popoverPos.value   = null
        return
      }
      if (payload.node.nid === selectedNode.value?.nid) {
        selectedNode.value = null
        popoverPos.value   = null
        return
      }
      selectedNode.value = payload.node
      popoverPos.value   = { x: payload.clientX, y: payload.clientY }
    }

    return () => (
      <div class="flex flex-col h-full">
        <div class="flex-1 min-h-0 relative">
          <div class="h-full relative">
            <WireframeRenderer
              root={store.root}
              selectedNid={selectedNode.value?.nid}
              onNodeClick={onNodeClick}
              onScroll={() => { selectedNode.value = null; popoverPos.value = null }}
            />
            <NodeInfoPopover
              node={selectedNode.value}
              position={popoverPos.value}
              onClose={() => { selectedNode.value = null; popoverPos.value = null }}
            />
          </div>
        </div>
      </div>
    )
  },
})
