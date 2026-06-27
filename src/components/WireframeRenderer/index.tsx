import { defineComponent, ref, onMounted } from 'vue'
import type { PropType } from 'vue'
import type { DslNode } from '@/types/dsl'
import NodeBlock from './NodeBlock'

export interface ClickPayload {
  node: DslNode
  clientX: number
  clientY: number
}

export default defineComponent({
  name: 'WireframeRenderer',
  props: {
    root:        { type: Object as PropType<DslNode | null>, default: null },
    selectedNid: { type: Number, default: undefined },
  },
  emits: ['nodeClick', 'scroll'],
  setup(props, { emit }) {
    const containerRef = ref<HTMLElement | null>(null)

    onMounted(() => {
      const el = containerRef.value
      if (!el) return
      el.addEventListener('scroll', () => {
        emit('scroll')
      }, { passive: true })
    })

    return () => (
      <div
        ref={containerRef}
        class="w-full h-full overflow-auto bg-white"
        onClick={() => emit('nodeClick', null)}
      >
        {props.root && (
          <NodeBlock
            node={props.root}
            selected={props.root.nid === props.selectedNid}
            isRoot={true}
            parentRect={null}
            onClick={(node: DslNode, e: MouseEvent) =>
              emit('nodeClick', { node, clientX: e.clientX, clientY: e.clientY } as ClickPayload)
            }
          />
        )}
      </div>
    )
  },
})
