import { onMounted, onUnmounted } from 'vue'
import { useDslStore } from '@/stores/dsl'
import { useMdStore } from '@/stores/md'
import { usePreviewStore } from '@/stores/preview'
import router from '@/router'
import type { ZipResource, DslNode } from '@/types/dsl'

const PIPELINE_URL = 'http://localhost:3204/pipeline'

const MIME: Record<string, string> = {
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.css':  'text/css',
  '.js':   'text/javascript',
  '.html': 'text/html',
  '.json': 'application/json',
}

export function useWindowBridge() {
  const dslStore     = useDslStore()
  const mdStore      = useMdStore()
  const previewStore = usePreviewStore()

  // ── shared: extract ZIP buffer → previewStore ─────────────────────
  async function processZipBuffer(buffer: ArrayBuffer) {
    const JSZip = (await import('jszip')).default
    const zip   = await JSZip.loadAsync(buffer)

    const entries = Object.keys(zip.files).filter(
      p => !zip.files[p].dir && !p.startsWith('__MACOSX')
    )

    if (entries.length === 0) {
      previewStore.setError('ZIP 中未找到任何文件')
      return
    }

    const resList: ZipResource[] = []
    let txtBuf: ArrayBuffer | null = null
    const resourceMap: Record<string, string | Uint8Array> = {}
    let hexStr = ''

    for (const key of entries) {
      const ext  = key.slice(key.lastIndexOf('.')).toLowerCase()
      const mime = MIME[ext] || 'application/octet-stream'

      if (ext === '.txt') {
        const rawTxt = await zip.files[key].async('string')
        hexStr = rawTxt.replace(/^<!--.*?-->\n?/, '')
        txtBuf = await zip.files[key].async('arraybuffer')
        const blob = new Blob([txtBuf], { type: 'text/plain' })
        const url  = URL.createObjectURL(blob)
        resList.push({ filename: key, blobUrl: url, mimeType: mime, content: txtBuf })
      } else if (ext === '.svg') {
        const svgText = await zip.files[key].async('string')
        const bareName = key.replace(/^.*\/([^/]+)$/, '$1')
        resourceMap[bareName] = svgText
        const buf  = await zip.files[key].async('arraybuffer')
        const blob = new Blob([buf], { type: mime })
        const url  = URL.createObjectURL(blob)
        resList.push({ filename: key, blobUrl: url, mimeType: mime })
      } else if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp' || ext === '.gif') {
        const buf      = await zip.files[key].async('arraybuffer')
        const bytes    = new Uint8Array(buf)
        const detached = new Uint8Array(bytes)
        const bareName = key.replace(/^.*\/([^/]+)$/, '$1')
        resourceMap[bareName] = detached
        const blob = new Blob([buf], { type: mime })
        const url  = URL.createObjectURL(blob)
        resList.push({ filename: key, blobUrl: url, mimeType: mime, content: bytes })
      } else {
        const buf  = await zip.files[key].async('arraybuffer')
        const blob = new Blob([buf], { type: mime })
        const url  = URL.createObjectURL(blob)
        resList.push({ filename: key, blobUrl: url, mimeType: mime })
      }
    }

    previewStore.setResources(resList)
    if (txtBuf) previewStore.setTxt(txtBuf)
    previewStore.setHexData(hexStr)
    previewStore.setResourceMap(resourceMap)
    console.log(`[ZIP] loaded ${resList.length} files, hex: ${hexStr.length} chars, svgs: ${Object.keys(resourceMap).join(',')}`)
  }

  // ── DSL: apply parsed data (shared by file upload & postMessage) ──
  function applyDslData(data: unknown, name = '') {
    try {
      const node = data as DslNode
      dslStore.setRoot(node, name)
      window.parent?.postMessage({ type: 'NODE_DSL_LOADED', payload: { success: true } }, '*')
    } catch (err) {
      window.parent?.postMessage({ type: 'NODE_DSL_LOADED', payload: { success: false, error: (err as Error).message } }, '*')
    }
  }

  // ── DSL: upload JSON ──────────────────────────────────────────────
  function uploadDsl() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string)
          applyDslData(data, file.name)
        } catch (err) {
          console.error('[DSL] JSON parse failed:', err)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // ── DSL: download JSON ────────────────────────────────────────────
  function downloadDsl() {
    const json = JSON.stringify(dslStore.root, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${dslStore.sourceName.replace(/\s+/g, '_') || 'dsl'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Preview: upload ZIP ───────────────────────────────────────────
  let zipInput: HTMLInputElement | null = null

  async function uploadZip() {
    if (zipInput) {
      zipInput.value = ''
    } else {
      zipInput = document.createElement('input')
      zipInput.type   = 'file'
      zipInput.accept = '.zip,application/zip'
      zipInput.onchange = async (e: Event) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        try {
          await processZipBuffer(await file.arrayBuffer())
        } catch (err) {
          previewStore.setError(`解压失败: ${(err as Error).message}`)
          console.error('[ZIP] Extract failed:', err)
        }
      }
    }

    zipInput.click()
  }

  // ── DSL → pipeline API → ZIP → Pixso ─────────────────────────────
  async function dslToPipeline(json: unknown) {
    previewStore.pipelineLoading = true
    try {
      const pageName = (json as any)?.meta?.file_name || ''
      const fileBlob = new Blob([JSON.stringify(json)], { type: 'application/json' })
      const formData = new FormData()
      formData.append('file', fileBlob, 'node-dsl.json')
      if (pageName) formData.append('page_name', pageName)

      console.log(`[Pipeline] Submitting to ${PIPELINE_URL}`)
      const res = await fetch(PIPELINE_URL, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }))
        previewStore.setError(`pipeline 请求失败: ${body.error || res.statusText}`)
        window.parent?.postMessage({ type: 'PIPELINE_LOADED', payload: { success: false, error: body.error || res.statusText } }, '*')
        return
      }

      const result = await res.json()
      if (!result.success) {
        const errMsg = result.error ?? '未知错误'
        previewStore.setError(`pipeline 失败: ${errMsg}`)
        window.parent?.postMessage({ type: 'PIPELINE_LOADED', payload: { success: false, error: errMsg } }, '*')
        return
      }

      if (!result.zip) {
        const errMsg = result.error ?? '未返回 zip'
        previewStore.setError(`pipeline 未返回 zip: ${errMsg}`)
        window.parent?.postMessage({ type: 'PIPELINE_LOADED', payload: { success: false, error: errMsg } }, '*')
        return
      }

      if (result.missing_keys?.length) {
        console.warn('[Pipeline] missing_keys:', result.missing_keys)
      }

      const binaryStr = atob(result.zip)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

      const zipData = bytes.buffer.slice(0)
      await processZipBuffer(bytes.buffer)
      window.parent?.postMessage({ type: 'PIPELINE_LOADED', payload: { success: true, zipData } }, '*', [zipData])
    } catch (err) {
      const errMsg = (err as Error).message
      previewStore.setError(`pipeline 异常: ${errMsg}`)
      window.parent?.postMessage({ type: 'PIPELINE_LOADED', payload: { success: false, error: errMsg } }, '*')
      console.error('[Pipeline] Failed:', err)
    } finally {
      previewStore.pipelineLoading = false
    }
  }

  async function uploadDslToPipeline() {
    const input = document.createElement('input')
    input.type   = 'file'
    input.accept = '.json,application/json'
    input.onchange = async (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const text = await file.text()
      const json = JSON.parse(text)
      applyDslData(json, file.name)
      await dslToPipeline(json)
    }
    input.click()
  }

  async function renderDslToPipeline(json: unknown) {
    await dslToPipeline(json)
  }

  // ── DSL: clear wireframe ──────────────────────────────────────────
  function clearDsl() {
    dslStore.setRoot(null, '')
    dslStore.isConfirmed = false
  }

  // ── postMessage bridge ────────────────────────────────────────────
  async function handlePipelineZipData(buffer: ArrayBuffer) {
    try {
      const zipData = buffer.slice(0)
      await processZipBuffer(buffer)
      window.parent?.postMessage({ type: 'ZIP_LOADED', payload: { success: true, zipData } }, '*', [zipData])
    } catch (err) {
      window.parent?.postMessage({ type: 'ZIP_LOADED', payload: { success: false, error: (err as Error).message } }, '*')
      console.error('[ZIP] PIPELINE_ZIP_DATA process failed:', err)
    }
  }

  function onMessage(event: MessageEvent) {
    if (event.source === window) return
    if (event.data?.type === 'NODE_DSL_JSON') {
      const payload = event.data.payload
      if (!payload) return
      applyDslData(payload)
    } else if (event.data?.type === 'NODE_DSL_PIPELINE') {
      const payload = event.data.payload
      if (!payload) return
      dslToPipeline(payload)
    } else if (event.data?.type === 'NODE_DSL_CLEAR') {
      clearDsl()
    } else if (event.data?.type === 'PIPELINE_ZIP_DATA') {
      const payload = event.data.payload
      if (!(payload instanceof ArrayBuffer)) return
      handlePipelineZipData(payload)
    } else if (event.data?.type === 'MD_STREAM_START') {
      mdStore.startStream()
    } else if (event.data?.type === 'MD_STREAM_CHUNK') {
      const payload = event.data.payload
      if (!payload?.text) return
      mdStore.appendChunk(payload.text)
    } else if (event.data?.type === 'MD_STREAM_END') {
      mdStore.endStream()
    } else if (event.data?.type === 'MD_FULL_TEXT') {
      const payload = event.data.payload
      if (!payload?.text) return
      mdStore.setFullText(payload.text, payload.lock ?? false)
    } else if (event.data?.type === 'MD_CLEAR') {
      mdStore.clearMd()
    } else if (event.data?.type === 'MD_CONFIRM') {
      mdStore.confirmMd()
    } else if (event.data?.type === 'DSL_CONFIRM') {
      dslStore.confirmDsl()
    } else if (event.data?.type === 'INIT_PREVIEW_URL') {
      const url = event.data.payload?.url
      if (!url) return
      const currentStep = Number(router.currentRoute.value.query.step) || 1
      router.replace({ path: '/', query: { step: String(currentStep >= 1 && currentStep <= 3 ? currentStep : 1), ro: url } })
    }
  }

  onMounted(() => {
    window.uploadDsl           = uploadDsl
    window.downloadDsl         = downloadDsl
    window.uploadZip           = uploadZip
    window.uploadDslToPipeline = uploadDslToPipeline
    window.renderDslToPipeline = renderDslToPipeline
    window.clearDsl            = clearDsl
    window.confirmDsl          = () => dslStore.confirmDsl()
    window.startMdStream       = () => mdStore.startStream()
    window.appendMdChunk       = (text: string) => mdStore.appendChunk(text)
    window.endMdStream         = () => mdStore.endStream()
    window.setMdFullText       = (text: string, lock?: boolean) => mdStore.setFullText(text, lock)
    window.getMdContent        = () => mdStore.getMdContent()
    window.clearMd             = () => mdStore.clearMd()
    window.confirmMd           = () => mdStore.confirmMd()
    window.addEventListener('message', onMessage)
  })

  onUnmounted(() => {
    const w = window as unknown as Record<string, unknown>
    delete w.uploadDsl
    delete w.downloadDsl
    delete w.uploadZip
    delete w.uploadDslToPipeline
    delete w.renderDslToPipeline
    delete w.clearDsl
    delete w.confirmDsl
    delete w.startMdStream
    delete w.appendMdChunk
    delete w.endMdStream
    delete w.setMdFullText
    delete w.getMdContent
    delete w.clearMd
    delete w.confirmMd
    window.removeEventListener('message', onMessage)
  })
}
