import { defineComponent, ref } from 'vue'
import { SEMANTIC_COLOR } from './colors'

const ITEMS = [
  { type: 'frame', label: '框架', color: SEMANTIC_COLOR.frame },
  { type: 'component', label: '组件', color: SEMANTIC_COLOR.component },
  { type: 'icon', label: '图标', color: SEMANTIC_COLOR.icon },
  { type: 'image', label: '图片', color: SEMANTIC_COLOR.image },
  { type: 'text', label: '文字', color: SEMANTIC_COLOR.text },
]

export default defineComponent({
  name: 'WireframeLegend',
  setup() {
    const expanded = ref(false)

    return () => (
      <div
        class="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm cursor-pointer"
        onClick={() => { expanded.value = !expanded.value }}
      >
        {expanded.value ? (
          <div class="flex flex-col gap-2 px-3 py-2">
            {ITEMS.map(item => (
              <div key={item.type} class="flex items-center gap-1.5">
                <span
                  class="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span class="text-xs text-gray-600 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div class="flex items-center gap-1.5 px-3 py-2">
            <svg class="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a4 4 0 014-4h14a4 4 0 014 4v12a4 4 0 01-4 4H7z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h10" />
            </svg>
            <span class="text-xs text-gray-500 font-medium">图例</span>
          </div>
        )}
      </div>
    )
  },
})
