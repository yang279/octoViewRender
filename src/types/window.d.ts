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

    startMdStream: () => void
    appendMdChunk: (text: string) => void
    endMdStream: () => void
    setMdFullText: (text: string, lock?: boolean) => void
    getMdContent: () => string
    clearMd: () => void
    confirmMd: () => void
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
  MD_STREAM_STARTED: {
    success: boolean
    error?: string
  }
  MD_STREAM_ENDED: {
    success: boolean
    error?: string
  }
  MD_FULL_TEXT_LOADED: {
    success: boolean
    error?: string
  }
  MD_CLEARED: undefined
  MD_CONTENT_CONFIRMED: { text: string }
  STEP_CHANGED: { step: number }
}

export interface PreviewPostMessageEvent {
  NODE_DSL_JSON: unknown
  NODE_DSL_CLEAR: undefined
  DSL_CONFIRM: undefined
  NODE_DSL_PIPELINE: unknown
  PIPELINE_ZIP_DATA: ArrayBuffer

  MD_STREAM_START: undefined
  MD_STREAM_CHUNK: { text: string }
  MD_STREAM_END: undefined
  MD_FULL_TEXT: { text: string; lock?: boolean }
  MD_CLEAR: undefined
  MD_CONFIRM: undefined
}
