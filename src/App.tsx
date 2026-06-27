import { defineComponent } from 'vue'
import { RouterView } from 'vue-router'
import { useWindowBridge } from '@/composables/useWindowBridge'
import { usePreviewStore } from '@/stores/preview'

export default defineComponent({
  name: 'App',
  setup() {
    useWindowBridge()
    const previewStore = usePreviewStore()

    return () => (
      <div class="min-h-screen bg-gray-50">
        <RouterView />
        {previewStore.pipelineLoading && (
          <div class="fixed top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow-md text-sm text-blue-500">
            <span class="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            正在生成…
          </div>
        )}
      </div>
    )
  },
})
