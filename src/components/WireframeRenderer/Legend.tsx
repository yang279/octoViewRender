import { defineComponent } from 'vue'
import { SEMANTIC_COLOR } from './colors'

const ITEMS = [
  { type: 'frame', label: '框架', color: SEMANTIC_COLOR.frame },
  { type: 'component', label: '组件', color: SEMANTIC_COLOR.component },
  { type: 'icon', label: '图标', color: SEMANTIC_COLOR.icon },
  { type: 'image', label: '图片', color: SEMANTIC_COLOR.image },
  { type: 'rectangle', label: '矩形', color: SEMANTIC_COLOR.rectangle },
  { type: 'text', label: '文字', color: SEMANTIC_COLOR.text },
]

const DOT_COLORS = [SEMANTIC_COLOR.frame, SEMANTIC_COLOR.component, SEMANTIC_COLOR.icon]

export default defineComponent({
  name: 'WireframeLegend',
  setup() {
    return () => (
      <div class="group relative inline-flex items-center">
        <div class="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white shadow-sm cursor-default border border-gray-200">
          {DOT_COLORS.map((c, i) => (
            <span
              key={i}
              class="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
        <div class="absolute top-full right-0 mt-1 hidden group-hover:flex flex-col gap-1.5 min-w-[80px] px-3 py-2 bg-white rounded-lg shadow-md z-50">
          {ITEMS.map(item => (
            <div key={item.type} class="flex items-center gap-1.5 whitespace-nowrap">
              <span
                class="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span class="text-xs text-gray-600 font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    )
  },
})
