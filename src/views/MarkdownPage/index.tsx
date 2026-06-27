import { defineComponent, ref, watch, onBeforeUnmount } from 'vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { useMdStore } from '@/stores/md'

export default defineComponent({
  name: 'MarkdownPage',
  props: {
    active: { type: Boolean, default: false },
  },
  setup(props) {
    const mdStore = useMdStore()
    const containerRef = ref<HTMLElement | null>(null)
    const vditorReady = ref(false)

    watch(() => props.active, (isVisible) => {
      if (isVisible && !vditorReady.value && containerRef.value) {
        const vditor = new Vditor(containerRef.value, {
          mode: 'ir',
          placeholder: '',
          height: '100%',
          toolbar: [],
          cache: { enable: false },
          after: () => {
            mdStore.setVditor(vditor)
          },
        })
        vditorReady.value = true
      }
    }, { immediate: true })

    onBeforeUnmount(() => {
      mdStore.setVditor(null)
      mdStore.isStreaming = false
      vditorReady.value = false
    })

    return () => (
      <div class="flex flex-col h-full">
        <div class="flex-1 min-h-0 relative">
          <div ref={containerRef} class="absolute inset-0" id="vditor-container"></div>
        </div>
      </div>
    )
  },
})
