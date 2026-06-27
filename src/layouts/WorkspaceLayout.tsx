import { defineComponent, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Navbar from '@/components/Navbar'
import RoInputDialog from '@/components/RoInputDialog'
import MarkdownPage from '@/views/MarkdownPage/index'
import EditorPage from '@/views/EditorPage/index'
import PreviewPage from '@/views/PreviewPage/index'
import { usePreviewStore } from '@/stores/preview'

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

    // Read ro from the raw hash to avoid Vue Router truncating unencoded URLs
    // at '&' characters (e.g. ro=https://x.com/a?id=1&foo=2 → only id=1 survives).
    // route.fullPath is accessed only to trigger reactivity on navigation.
    const ro = computed(() => {
      void route.fullPath
      const hash = window.location.hash
      const m = hash.match(/[?&]ro=(.+)/)
      if (!m) return ''
      try { return decodeURIComponent(m[1]) } catch { return m[1] }
    })
    const showDialog = computed(() => ro.value === '')

    onMounted(() => {
      const s = Number(route.query.step)
      if (!(s >= 1 && s <= 3)) {
        router.replace({ path: '/', query: { step: '1', ro: ro.value } })
      }
      window.parent?.postMessage({ type: 'STEP_CHANGED', payload: { step: step.value } }, '*')
    })

    watch(ro, (url) => {
      if (url) previewStore.load(url)
    }, { immediate: true })

    function onRoConfirm(url: string) {
      router.replace({ path: '/', query: { step: String(step.value), ro: url } })
    }

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
        <RoInputDialog visible={showDialog.value} step={step.value} onConfirm={onRoConfirm} />
      </div>
    )
  },
})
