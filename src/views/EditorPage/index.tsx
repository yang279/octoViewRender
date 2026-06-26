import { defineComponent, ref } from 'vue'
import { useDslStore } from '@/stores/dsl'
import type { DslNode } from '@/types/dsl'
import type { ClickPayload } from '@/components/WireframeRenderer'
import WireframeRenderer from '@/components/WireframeRenderer'
import WireframeLegend from '@/components/WireframeRenderer/Legend'
import NodeInfoPopover from './NodeInfoPopover'

export default defineComponent({
  name: 'EditorPage',
  setup() {
    const store = useDslStore()

    const selectedNode = ref<DslNode | null>(null)
    const popoverPos   = ref<{ x: number; y: number } | null>(null)

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

    const disabled = () => store.isEmpty || store.isConfirmed

    const EmptyState = () => (
      <div class="h-full flex flex-col items-center justify-center gap-4 text-gray-400 select-none">
        <svg class="w-14 h-14 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
        <div class="text-center">
          <p class="text-sm font-medium">等待 DSL 数据…</p>
          <p class="text-xs mt-1 opacity-60">uploadDsl() · NODE_DSL_JSON</p>
        </div>
      </div>
    )

    return () => (
      <div class="flex flex-col h-full">
        <div class="flex items-center justify-end px-4 h-10 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            class={[
              'px-4 py-1.5 rounded text-sm font-medium transition',
              disabled()
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600',
            ]}
            disabled={disabled()}
            onClick={() => { store.confirmDsl(); window.renderDslToPipeline?.(store.root) }}
          >
            确认渲染
          </button>
        </div>
        <div class="flex-1 min-h-0 relative">
          {store.isEmpty
            ? <EmptyState />
            : (
              <div class="h-full relative">
                <WireframeRenderer
                  root={store.root}
                  selectedNid={selectedNode.value?.nid}
                  onNodeClick={onNodeClick}
                  onScroll={() => { selectedNode.value = null; popoverPos.value = null }}
                />
                <WireframeLegend />
                <NodeInfoPopover
                  node={selectedNode.value}
                  position={popoverPos.value}
                  onClose={() => { selectedNode.value = null; popoverPos.value = null }}
                />
              </div>
            )
          }
        </div>
      </div>
    )
  },
})
