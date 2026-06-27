import { defineComponent, ref, watch, onMounted, onUnmounted, toRaw } from 'vue'
import { usePreviewStore } from '@/stores/preview'

export default defineComponent({
  name: 'IframePanel',
  setup() {
    const previewStore = usePreviewStore()

    const iframeSrc   = ref('')
    const loading     = ref(false)
    const iframeRef   = ref<HTMLIFrameElement | null>(null)
    const iframeReady = ref(false)
    const pixsoReady  = ref(false)

    watch(() => previewStore.src, (src) => {
      if (src) {
        iframeSrc.value  = src
        loading.value    = true
        iframeReady.value = false
        pixsoReady.value  = false
      }
    }, { immediate: true })

    watch(() => previewStore.version, () => {
      if (!previewStore.hexData) return
      tryRunPlugin()
    })

    function tryRunPlugin() {
      if (!pixsoReady.value || !iframeReady.value) return
      if (!previewStore.hexData && !Object.keys(previewStore.resourceMap).length) return
      runPlugin()
    }

    async function runPlugin() {
      const iframe = iframeRef.value
      if (!iframe) { console.warn('[Plugin] No iframe found'); return }
      if (!iframeReady.value) { console.warn('[Plugin] iframe not loaded yet'); return }

      const fsEvent = (iframe.contentWindow as any)?.__fullsecreenEvent__
      if (!fsEvent) { console.warn('[Plugin] __fullsecreenEvent__ not found on iframe window'); return }

      const hex = previewStore.hexData
      const svgs = previewStore.resourceMap
      if (!hex && !Object.keys(svgs).length) {
        console.warn('[Plugin] No hex/svg data available')
        return
      }

      const rawMap: Record<string, string | Uint8Array> = {}
      for (const [k, v] of Object.entries(svgs)) {
        rawMap[k] = typeof v === 'string' ? v : (toRaw(v) as Uint8Array)
      }

      console.info(`[Plugin] Passing data to iframe, hex: ${hex.length} chars, svgs: ${Object.keys(svgs).join(',')}`)

      try {
        fsEvent.insert({ hex, resourceMap: rawMap })
        console.info('[Plugin] Execution completed')
      } catch (err) {
        console.error(`[Plugin] Execution failed: ${(err as Error).message}`)
      }
    }

    function onIframeLoad() {
      loading.value   = false
      iframeReady.value = true
      tryRunPlugin()
    }

    function onPixsoMessage(event: MessageEvent) {
      if (event.source !== iframeRef.value?.contentWindow) return
      if (event.data?.type === '__pixso_init__') {
        console.info('[Plugin] Received __pixso_init__ from iframe')
        pixsoReady.value = true
        tryRunPlugin()
      }
    }

    onMounted(() => { window.addEventListener('message', onPixsoMessage) })
    onUnmounted(() => { window.removeEventListener('message', onPixsoMessage) })

    return () => (
      <div class="flex flex-col h-full bg-white">
        <div class="flex-1 relative min-h-0">
          {previewStore.error && (
            <div class="absolute top-2 inset-x-2 z-20 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg shadow-sm">
              <svg class="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-sm text-red-600 font-medium break-all">{previewStore.error}</p>
              <button
                class="ml-auto p-1 rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                onClick={() => { previewStore.clearError() }}
              >
                <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          {loading.value && iframeSrc.value && (
            <div class="absolute inset-0 flex items-center justify-center bg-white/70 z-10 pointer-events-none">
              <div class="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!iframeSrc.value
            ? (
              <div class="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400 select-none h-full">
                <svg class="w-14 h-14 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"
                    d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
                <div class="text-center">
                  <p class="text-sm font-medium">等待预览数据…</p>
                  <p class="text-xs mt-1 opacity-60">ro 参数 · uploadZip()</p>
                </div>
              </div>
            )
            : (
              <iframe
                ref={iframeRef}
                key={iframeSrc.value}
                src={iframeSrc.value}
                class="absolute inset-0 w-full h-full border-0"
                onLoad={onIframeLoad}
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            )
          }
        </div>
      </div>
    )
  },
})
