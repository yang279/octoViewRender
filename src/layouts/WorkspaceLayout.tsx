import { defineComponent, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import Navbar from '@/components/Navbar'
import MarkdownPage from '@/views/MarkdownPage/index'
import EditorPage from '@/views/EditorPage/index'
import PreviewPage from '@/views/PreviewPage/index'
import { usePreviewStore } from '@/stores/preview'

export default defineComponent({
  name: 'WorkspaceLayout',
  setup() {
    const route = useRoute()
    const previewStore = usePreviewStore()

    const step = computed(() => {
      const s = Number(route.query.step)
      return (s >= 1 && s <= 3) ? s : 1
    })

    const ro = computed(() => {
      const raw = route.query.ro as string || ''
      return raw ? decodeURIComponent(raw) : ''
    })

    watch(ro, (url) => {
      if (url) previewStore.load(url)
    }, { immediate: true })

    return () => (
      <div class="flex flex-col h-screen bg-gray-50">
        <Navbar />
        <div class="flex-1 min-h-0">
          <div v-show={step.value === 1} class="h-full">
            <MarkdownPage active={step.value === 1} />
          </div>
          <div v-show={step.value === 2} class="h-full">
            <EditorPage />
          </div>
          <div v-show={step.value === 3} class="h-full">
            <PreviewPage />
          </div>
        </div>
      </div>
    )
  },
})
