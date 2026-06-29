import { defineComponent, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '@/components/Navbar'
import MarkdownPage from '@/views/MarkdownPage/index'
import EditorPage from '@/views/EditorPage/index'
import PreviewPage from '@/views/PreviewPage/index'
import { usePreviewStore } from '@/stores/preview'
import { sanitizeRoUrl } from '@/utils/url'

export default defineComponent({
  name: 'WorkspaceLayout',
  setup() {
    const route = useRoute()
    const router = useRouter()
    const previewStore = usePreviewStore()

    const step = computed(() => {
      const s = Number(route.query.step)
      return (s >= 1 && s <= 3) ? s : 1
    })

    const rawRo = computed(() => {
      void route.fullPath
      const hash = window.location.hash
      const m = hash.match(/[?&]ro=(.+)/)
      if (!m) return ''
      try { return decodeURIComponent(m[1]) } catch { return m[1] }
    })

    const ro = computed(() => sanitizeRoUrl(rawRo.value))

    onMounted(() => {
      window.parent?.postMessage({ type: 'STEP_CHANGED', payload: { step: step.value } }, '*')
    })

    watch([rawRo, ro, step], () => {
      if (rawRo.value !== ro.value) {
        router.replace({ path: '/', query: { step: String(step.value), ro: ro.value } })
      }
    }, { immediate: true })

    watch(ro, (url) => {
      if (url) previewStore.load(url)
    }, { immediate: true })

    return () => (
      <div class="flex flex-col h-screen bg-white">
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
