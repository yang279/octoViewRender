import { defineComponent, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const STEPS = [
  { key: '1', label: '步骤一', desc: 'MD 编辑' },
  { key: '2', label: '步骤二', desc: '线框渲染' },
  { key: '3', label: '步骤三', desc: '预览' },
]

export default defineComponent({
  name: 'Navbar',
  setup() {
    const route = useRoute()
    const router = useRouter()

    const currentStep = computed(() => {
      const s = Number(route.query.step)
      return (s >= 1 && s <= 3) ? s : 1
    })

    const currentRo = computed(() => (route.query.ro as string) || '')

    function goToStep(n: number) {
      router.replace({ path: '/', query: { step: String(n), ro: currentRo.value } })
      window.parent?.postMessage({ type: 'STEP_CHANGED', payload: { step: n } }, '*')
    }

    return () => (
      <nav class="flex items-center justify-start px-5 h-12 bg-white border-b border-gray-200 flex-shrink-0">
        <div class="flex items-center gap-1">
          {STEPS.map((s) => (
            <button
              key={s.key}
              class={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
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
              <span class="opacity-50 hidden sm:inline">· {s.desc}</span>
            </button>
          ))}
        </div>
      </nav>
    )
  },
})
