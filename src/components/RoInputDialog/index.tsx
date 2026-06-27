import { defineComponent, ref, computed } from 'vue'
import { ElDialog, ElInput, ElButton } from 'element-plus'

export default defineComponent({
  name: 'RoInputDialog',
  props: {
    visible: { type: Boolean, default: false },
    step:    { type: Number, default: 1 },
  },
  emits: ['confirm'],
  setup(props, { emit }) {
    const inputValue = ref('')
    const errorMsg   = ref('')

    const isValidUrl = computed(() => {
      if (!inputValue.value.trim()) return false
      try { new URL(inputValue.value.trim()); return true } catch { return false }
    })

    function handleConfirm() {
      const url = inputValue.value.trim()
      if (!url) {
        errorMsg.value = '请输入预览地址'
        return
      }
      try { new URL(url) } catch {
        errorMsg.value = '请输入合法的 URL（如 https://example.com）'
        return
      }
      errorMsg.value = ''
      emit('confirm', url)
    }

    return () => (
      <ElDialog
        modelValue={props.visible}
        title="设置预览地址"
        width="480px"
        closeOnClickModal={false}
        closeOnPressEscape={false}
        showClose={false}
        alignCenter
        v-slots={{
          footer: () => (
            <ElButton
              type="primary"
              size="large"
              disabled={!isValidUrl.value}
              onClick={handleConfirm}
            >
              确认
            </ElButton>
          ),
        }}
      >
        <div class="flex flex-col gap-3">
          <p class="text-sm text-gray-500">请输入步骤三 iframe 预览的完整 URL 地址</p>
          <ElInput
            v-model={inputValue.value}
            placeholder="https://example.com/preview"
            size="large"
            clearable
            onInput={() => { errorMsg.value = '' }}
          />
          {errorMsg.value && (
            <p class="text-xs text-red-500">{errorMsg.value}</p>
          )}
        </div>
      </ElDialog>
    )
  },
})
