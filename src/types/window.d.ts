export {}

declare global {
  interface Window {
    uploadDsl: () => void
    downloadDsl: () => void
    uploadZip: () => void
    uploadDslToPipeline: () => void
    renderDslToPipeline: (json: unknown) => Promise<void>
    clearDsl: () => void
    confirmDsl: () => void
  }
}

export interface PostMessageEvent {
  DSL_NODE_UPDATED: {
    nid: number
    changes: {
      layerType: string
      layerName: string
      layerDescription: string
    }
  }
  NODE_DSL_LOADED: {
    success: boolean
    error?: string
  }
  DSL_RENDER_CONFIRMED: {
    dsl: unknown
  }
  PIPELINE_LOADED: {
    success: boolean
    zipData?: ArrayBuffer
    error?: string
  }
  ZIP_LOADED: {
    success: boolean
    zipData?: ArrayBuffer
    error?: string
  }
  STEP_CHANGED: { step: number }
}

export interface PreviewPostMessageEvent {
  NODE_DSL_JSON: unknown
  NODE_DSL_CLEAR: undefined
  DSL_CONFIRM: undefined
  NODE_DSL_PIPELINE: unknown
  PIPELINE_ZIP_DATA: ArrayBuffer
  STEP_CHANGE: { step: number }
  INIT_PREVIEW_URL: { url: string }
}
