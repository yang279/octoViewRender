import { defineStore } from 'pinia'
import { ref } from 'vue'
import Vditor from 'vditor'

function postToParent(type: string, payload?: unknown) {
  window.parent?.postMessage({ type, payload }, '*')
}

export const useMdStore = defineStore('md', () => {
  const vditorInstance   = ref<Vditor | null>(null)
  const isStreaming       = ref(false)
  const isEmpty           = ref(true)
  const isConfirmed       = ref(false)
  const streamBuffer      = ref('')
  const pendingFullText   = ref<{ text: string; lock: boolean } | null>(null)
  const pendingClear      = ref(false)

  function setVditor(instance: Vditor | null) {
    vditorInstance.value = instance
    if (!instance) return
    instance.vditor.options.input = () => {
      isEmpty.value = instance.getValue().trim() === ''
    }
    if (pendingClear.value) {
      instance.setValue('')
      isEmpty.value = true
      isConfirmed.value = false
      instance.enable()
      pendingClear.value = false
      pendingFullText.value = null
      postToParent('MD_CLEARED')
    }
    if (pendingFullText.value) {
      instance.setValue(pendingFullText.value.text)
      isEmpty.value = pendingFullText.value.text.trim() === ''
      isConfirmed.value = pendingFullText.value.lock
      if (pendingFullText.value.lock) instance.disabled()
      else instance.enable()
      postToParent('MD_FULL_TEXT_LOADED', { success: true })
      pendingFullText.value = null
    }
  }

  function startStream() {
    const vd = vditorInstance.value
    if (!vd) {
      postToParent('MD_STREAM_STARTED', { success: false, error: '编辑器未初始化' })
      return
    }
    isStreaming.value = true
    isEmpty.value = true
    isConfirmed.value = false
    streamBuffer.value = ''
    pendingFullText.value = null
    pendingClear.value = false
    vd.setValue('')
    postToParent('MD_STREAM_STARTED', { success: true })
  }

  function appendChunk(text: string) {
    streamBuffer.value += text
    const vd = vditorInstance.value
    if (!vd) return
    try {
      vd.setValue(streamBuffer.value)
    } catch {
    }
    isEmpty.value = false
  }

  function endStream() {
    const vd = vditorInstance.value
    if (!vd) {
      postToParent('MD_STREAM_ENDED', { success: false, error: '编辑器未初始化' })
      return
    }
    isStreaming.value = false
    isEmpty.value = false
    streamBuffer.value = ''
    if (!isConfirmed.value) {
      vd.enable()
    }
    postToParent('MD_STREAM_ENDED', { success: true })
  }

  function setFullText(text: string, lock = false) {
    const vd = vditorInstance.value
    if (!vd) {
      pendingFullText.value = { text, lock }
      pendingClear.value = false
      return
    }
    vd.setValue(text)
    isEmpty.value = text.trim() === ''
    isConfirmed.value = lock
    if (lock) {
      vd.disabled()
    } else {
      vd.enable()
    }
    postToParent('MD_FULL_TEXT_LOADED', { success: true })
  }

  function getMdContent(): string {
    return vditorInstance.value?.getValue() ?? ''
  }

  function clearMd() {
    pendingFullText.value = null
    pendingClear.value = true
    const vd = vditorInstance.value
    if (!vd) return
    vd.setValue('')
    isEmpty.value = true
    isConfirmed.value = false
    vd.enable()
    pendingClear.value = false
    postToParent('MD_CLEARED')
  }

  function confirmMd() {
    const vd = vditorInstance.value
    if (!vd || isEmpty.value || isStreaming.value || isConfirmed.value) return
    const text = vd.getValue()
    isConfirmed.value = true
    vd.disabled()
    postToParent('MD_CONTENT_CONFIRMED', { text })
  }

  return {
    vditorInstance, isStreaming, isEmpty, isConfirmed,
    setVditor, startStream, appendChunk, endStream, setFullText, getMdContent, clearMd, confirmMd,
  }
})
