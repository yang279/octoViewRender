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

    const disabled = () => mdStore.isEmpty || mdStore.isStreaming || mdStore.isConfirmed

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
            onClick={() => mdStore.confirmMd()}
          >
            确认生成
          </button>
        </div>
        <div class="flex-1 min-h-0 relative">
          <div ref={containerRef} class="absolute inset-0" id="vditor-container"></div>
          {mdStore.isEmpty && !mdStore.isStreaming && (
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-4 text-gray-400 select-none pointer-events-none z-10">
              <svg class="w-14 h-14 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"
                  d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H8m0 3v3m0-3h4m-4 0H6" />
              </svg>
              <div class="text-center">
                <p class="text-sm font-medium">等待 Markdown 内容…</p>
                <p class="text-xs mt-1 opacity-60">startMdStream() · setMdFullText() · 或手动输入</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  },
})
