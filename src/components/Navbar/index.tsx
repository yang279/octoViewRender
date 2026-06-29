import { defineComponent, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMdStore } from '@/stores/md'
import { useDslStore } from '@/stores/dsl'
import { usePreviewStore } from '@/stores/preview'
import WireframeLegend from '@/components/WireframeRenderer/Legend'
import { sanitizeRoUrl } from '@/utils/url'

const STEPS = [
  { key: '1', label: '意图扩写' },
  { key: '2', label: '架构生成' },
  { key: '3', label: '设计生成' },
]

export default defineComponent({
  name: 'Navbar',
  setup() {
    const route        = useRoute()
    const router       = useRouter()
    const mdStore      = useMdStore()
    const dslStore     = useDslStore()
    const previewStore = usePreviewStore()

    const currentStep = computed(() => {
      const s = Number(route.query.step)
      return (s >= 1 && s <= 3) ? s : 1
    })

    const currentRo = computed(() => {
      void route.fullPath
      const hash = window.location.hash
      const m = hash.match(/[?&]ro=(.+)/)
      if (!m) return ''
      try { return sanitizeRoUrl(decodeURIComponent(m[1])) } catch { return '' }
    })

    function goToStep(n: number) {
      router.replace({ path: '/', query: { step: String(n), ro: currentRo.value } })
      window.parent?.postMessage({ type: 'STEP_CHANGED', payload: { step: n } }, '*')
    }

    const mdDisabled  = () => mdStore.isEmpty || mdStore.isStreaming || mdStore.isConfirmed
    const dslDisabled = () => dslStore.isEmpty || dslStore.isConfirmed

    function onConfirmMd() {
      if (mdDisabled()) return
      mdStore.confirmMd()
    }

    function onConfirmDsl() {
      if (dslDisabled()) return
      dslStore.confirmDsl()
      window.renderDslToPipeline?.(dslStore.root)
    }

    function onUploadDsl() {
      window.uploadDsl?.()
    }

    return () => (
      <nav class="flex items-center justify-between px-4 h-12 bg-gray-100 border-b border-gray-200 flex-shrink-0">
        <div class="flex items-center gap-0.5">
          {STEPS.map((s) => (
            <button
              key={s.key}
              class={[
                'flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-150',
                currentStep.value === Number(s.key)
                  ? 'bg-blue-50 text-blue-600 ring-1 ring-blue-200'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
              ]}
              onClick={() => goToStep(Number(s.key))}
            >
              <span class={[
                'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                currentStep.value === Number(s.key)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500',
              ]}>
                {s.key}
              </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
        <div class="flex items-center gap-1.5">
          {currentStep.value === 1 && (
            <button
              class={[
                'px-3 py-1 rounded text-sm font-medium transition',
                mdDisabled()
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600',
              ]}
              disabled={mdDisabled()}
              onClick={onConfirmMd}
            >
              确认生成
            </button>
          )}
          {currentStep.value === 2 && (
            <>
              <WireframeLegend />
              <button
                class="px-3 py-1 rounded text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                onClick={onUploadDsl}
              >
                上传 DSL
              </button>
              <button
                v-show={currentRo.value && previewStore.pixsoReady}
                class={[
                  'px-3 py-1 rounded text-sm font-medium transition',
                  dslDisabled()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600',
                ]}
                disabled={dslDisabled()}
                onClick={onConfirmDsl}
              >
                确认渲染
              </button>
            </>
          )}
        </div>
      </nav>
    )
  },
})
