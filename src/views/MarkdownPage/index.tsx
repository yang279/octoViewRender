import { defineComponent, ref, watch, onMounted, onBeforeUnmount } from 'vue'
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

    function initVditor() {
      if (vditorReady.value || !containerRef.value) return
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

    // DOM 在 onMounted 时已存在（页面始终通过 v-show 挂载），
    // 故首屏即步骤一时可立即初始化；watch 负责后续切回步骤一。
    onMounted(() => {
      if (props.active) initVditor()
    })

    watch(() => props.active, (isVisible) => {
      if (isVisible) initVditor()
    })

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
