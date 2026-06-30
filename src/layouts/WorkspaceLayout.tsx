import { defineComponent, computed, watch } from 'vue'
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

    watch(step, (s) => {
      window.parent?.postMessage({ type: 'STEP_CHANGED', payload: { step: s } }, '*')
    }, { immediate: true })

    watch([rawRo, ro, step], () => {
      // 语义变化（ro 被补全/清洗）→ 正常导航回写，vue-router 会用 stringifyQuery 编码
      if (rawRo.value !== ro.value) {
        router.replace({ path: '/', query: { step: String(step.value), ro: ro.value } })
        return
      }
      // 语义未变，但地址栏当前显示不是规范编码态 → 强制重写。
      // vue-router 会把「相同 query」判为重复导航而跳过，故直接用 history 覆盖地址栏。
      if (!ro.value) return
      const href = router.resolve({ path: '/', query: { step: String(step.value), ro: ro.value } }).href
      const targetHash = href.startsWith('#') ? href : '#' + href.replace(/^\/?#?/, '')
      if (window.location.hash !== targetHash) {
        history.replaceState(history.state, '', targetHash)
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
