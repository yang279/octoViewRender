# iframe 集成指南

本应用通过 hash 路由提供三个页面，可被外部项目以 iframe 嵌入，通过 `window` 方法或 `postMessage` 双向通信。

## 嵌入方式

```html
<iframe id="app" src="http://host:port/#/markdown"></iframe>
```

| 路由 | 步骤 | 页面 | 说明 |
|---|---|---|---|
| `#/markdown` | 1 | Markdown 编辑器 | Vditor IR 模式，无工具栏，上方"确认生成"按钮 |
| `#/editor` | 2 | 线框编辑器 | DSL 树渲染，上方"确认渲染"按钮 |
| `#/preview` | 3 | 预览 | iframe 加载 URL 或 ZIP |
| `#/` | — | 默认重定向到 `#/editor` | |

> 三个页面共享同一个 Pinia 状态，切换路由不会丢失数据。

## 通信方式

两种方式均可使用，效果一致：

1. **window 方法** — 通过 `iframe.contentWindow.xxx()` 直接调用
2. **postMessage** — 通过 `iframe.contentWindow.postMessage({ type, payload }, '*')` 发送

> window 方法在 iframe 加载后即可使用（Vditor 等组件初始化后才有完整功能），postMessage 无需等待。

---

## 全局事件

### 步骤切换

用户点击导航栏步骤按钮时，iframe 会向宿主发出 `STEP_CHANGED` 消息：

```js
window.addEventListener('message', (e) => {
  if (e.data?.type === 'STEP_CHANGED') {
    console.log('当前步骤:', e.data.payload.step)  // 1 | 2 | 3
  }
})
```

宿主也可通过修改 iframe src 的 hash 来切换页面：

```js
iframe.src = 'http://host:port/#/preview'  // 切到步骤三
```

### 空状态

每个步骤在无数据时显示空状态提示（图标 + 文案），有数据后自动隐藏：

| 步骤 | 空状态文案 | 隐藏条件 |
|---|---|---|
| 1 | 等待 Markdown 内容… | 有内容（`isEmpty=false`）或正在流式输入 |
| 2 | 等待 DSL 数据… | DSL 数据已加载（`root !== null`） |
| 3 | 调用 uploadZip() 加载压缩包 | ZIP 已加载或 URL 已设置 |

---

## 一、Markdown 模块（步骤一）

### 状态流转

```
初始（空）          →  解锁，按钮灰色（isEmpty）, 空状态可见
手动输入内容        →  解锁，按钮蓝色, 空状态隐藏
startStream         →  锁定，按钮灰色（isStreaming）, 空状态隐藏
appendChunk × N     →  锁定，按钮灰色（isStreaming）
endStream           →  解锁，按钮蓝色（可编辑/确认）
setFullText(text)   →  解锁，按钮蓝色
setFullText(text,1) →  锁定，按钮灰色（isConfirmed）
confirmMd           →  锁定，按钮灰色（isConfirmed）→ 发出 MD_CONTENT_CONFIRMED
clearMd             →  解锁，按钮灰色（isEmpty）, 空状态可见
```

按钮禁用条件：`isEmpty || isStreaming || isConfirmed`

### window 方法

| 方法 | 签名 | 说明 |
|---|---|---|
| `startMdStream()` | `() → void` | 清空编辑器，锁定，开始流式输入 |
| `appendMdChunk(text)` | `(text: string) → void` | 追加一段文本（流式模式中） |
| `endMdStream()` | `() → void` | 结束流式，解锁编辑器供用户审阅 |
| `setMdFullText(text, lock?)` | `(text: string, lock?: boolean) → void` | 一次性设置全文；`lock=true` 锁定，默认解锁 |
| `getMdContent()` | `() → string` | 获取当前 markdown 内容（同步） |
| `clearMd()` | `() → void` | 清空编辑器 |
| `confirmMd()` | `() → void` | 确认生成：锁定编辑器，发出 `MD_CONTENT_CONFIRMED` |

### postMessage 入站（宿主 → iframe）

| type | payload | 对应 action |
|---|---|---|
| `MD_STREAM_START` | 无 | `startStream()` |
| `MD_STREAM_CHUNK` | `{ text: string }` | `appendChunk(text)` |
| `MD_STREAM_END` | 无 | `endStream()` |
| `MD_FULL_TEXT` | `{ text: string; lock?: boolean }` | `setFullText(text, lock)` |
| `MD_CLEAR` | 无 | `clearMd()` |
| `MD_CONFIRM` | 无 | `confirmMd()` |

### postMessage 出站（iframe → 宿主）

| type | payload | 触发时机 |
|---|---|---|
| `MD_STREAM_STARTED` | `{ success: boolean; error?: string }` | `startStream()` 完成后 |
| `MD_STREAM_ENDED` | `{ success: boolean; error?: string }` | `endStream()` 完成后 |
| `MD_FULL_TEXT_LOADED` | `{ success: boolean; error?: string }` | `setFullText()` 完成后 |
| `MD_CLEARED` | 无 | `clearMd()` 完成后 |
| `MD_CONTENT_CONFIRMED` | `{ text: string }` | 用户点击"确认生成"或调用 `confirmMd()` 后 |

> `success: false` 时 `error` 字段包含错误描述（如"编辑器未初始化"）。

---

## 二、DSL 模块（步骤二）

### 状态流转

```
初始（空）          →  解锁，按钮灰色（isEmpty）, 空状态可见
加载 DSL 数据       →  解锁，按钮蓝色, 空状态隐藏
编辑节点元数据      →  解锁，按钮蓝色（持续可确认）
confirmDsl          →  锁定，按钮灰色（isConfirmed）→ 发出 DSL_RENDER_CONFIRMED
clearDsl            →  解锁，按钮灰色（isEmpty）, 空状态可见
```

按钮禁用条件：`isEmpty || isConfirmed`

### window 方法

| 方法 | 签名 | 说明 |
|---|---|---|
| `uploadDsl()` | `() → void` | 弹出文件选择器加载 JSON |
| `downloadDsl()` | `() → void` | 下载当前 DSL 为 JSON 文件 |
| `clearDsl()` | `() → void` | 清空线框数据 |
| `confirmDsl()` | `() → void` | 确认渲染：锁定编辑器，发出 `DSL_RENDER_CONFIRMED` |

### postMessage 入站（宿主 → iframe）

| type | payload | 说明 |
|---|---|---|
| `NODE_DSL_JSON` | DSL 树 JSON 对象 | 加载 DSL 数据到编辑器 |
| `NODE_DSL_CLEAR` | 无 | 清空 DSL |
| `DSL_CONFIRM` | 无 | 确认渲染 |

### postMessage 出站（iframe → 宿主）

| type | payload | 触发时机 |
|---|---|---|
| `NODE_DSL_LOADED` | `{ success: boolean; error?: string }` | DSL 加载完成 |
| `DSL_NODE_UPDATED` | `{ nid: number; changes: { layerType, layerName, layerDescription } }` | 用户在编辑器修改节点元数据 |
| `DSL_RENDER_CONFIRMED` | `{ dsl: DslNode }` | 用户点击"确认渲染"或调用 `confirmDsl()` 后 |

---

## 三、Preview 模块（步骤三）

> `uploadDslToPipeline` 和 `NODE_DSL_PIPELINE` 虽然涉及 DSL JSON 输入，但最终目标是调用 dsl-to-hex API 生成 ZIP 并加载到预览页，因此归入 Preview 模块。

> 步骤三无确认按钮，预览结果由宿主自行获取。

### window 方法

| 方法 | 签名 | 说明 |
|---|---|---|
| `uploadDslToPipeline()` | `() → void` | 弹出文件选择器加载 JSON → 调 dsl-to-hex API → 加载 ZIP 预览 |
| `uploadZip()` | `() → void` | 弹出文件选择器加载 ZIP |
| `runPlugin()` | `() → Promise<void>` | Pixso 插件执行 |

### postMessage 入站（宿主 → iframe）

| type | payload | 说明 |
|---|---|---|
| `NODE_DSL_PIPELINE` | DSL 树 JSON 对象 | 加载 DSL 并调 dsl-to-hex API → 生成 ZIP 预览 |
| `PIPELINE_ZIP_DATA` | `ArrayBuffer`（Transferable） | 直接传入 ZIP 二进制数据 |

> `PIPELINE_ZIP_DATA` 的 payload 是 `ArrayBuffer`，可通过 Transferable 零拷贝传输。

### postMessage 出站（iframe → 宿主）

| type | payload | 触发时机 |
|---|---|---|
| `PIPELINE_LOADED` | `{ success: boolean; error?: string; zipData?: ArrayBuffer }` | dsl-to-hex API 调用完成；成功时附带 zipData（Transferable） |
| `ZIP_LOADED` | `{ success: boolean; error?: string; zipData?: ArrayBuffer }` | ZIP 数据处理完成；成功时附带 zipData（Transferable） |

---

## 完整类型定义

TypeScript 类型见 `src/types/window.d.ts`：

- `Window` 接口 — 所有 window 方法签名
- `PostMessageEvent` — iframe → 宿主出站消息类型
- `PreviewPostMessageEvent` — 宿主 → iframe 入站消息类型

---

## 完整使用示例

### 1. 基础嵌入 + 事件监听

```js
const iframe = document.createElement('iframe')
iframe.id = 'app'
iframe.src = 'http://localhost:5173/#/markdown'
iframe.style.width = '100%'
iframe.style.height = '100%'
document.body.appendChild(iframe)

window.addEventListener('message', (e) => {
  if (e.source !== iframe.contentWindow) return
  const { type, payload } = e.data
  switch (type) {
    case 'STEP_CHANGED':
      console.log('步骤切换:', payload.step)
      break
    case 'MD_CONTENT_CONFIRMED':
      console.log('MD 确认:', payload.text)
      break
    case 'DSL_RENDER_CONFIRMED':
      console.log('DSL 确认:', payload.dsl)
      break

    case 'MD_STREAM_STARTED':
      console.log('流式开始:', payload.success)
      break
    case 'MD_STREAM_ENDED':
      console.log('流式结束:', payload.success)
      break
    case 'NODE_DSL_LOADED':
      console.log('DSL 加载:', payload.success)
      break
    case 'DSL_NODE_UPDATED':
      console.log('节点更新:', payload.nid, payload.changes)
      break
    case 'PIPELINE_LOADED':
      console.log('Pipeline:', payload.success, payload.zipData)
      break
    case 'ZIP_LOADED':
      console.log('ZIP 加载:', payload.success)
      break
  }
})
```

### 2. AI 流式生成 Markdown（典型场景）

```js
async function aiGenerateMd(iframe, prompt) {
  iframe.contentWindow.startMdStream()

  const response = await fetch('/api/ai/stream', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  })
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    iframe.contentWindow.appendMdChunk(chunk)
  }

  iframe.contentWindow.endMdStream()
  // 编辑器解锁，用户可审阅/编辑后点击"确认生成"
}

window.addEventListener('message', (e) => {
  if (e.data?.type === 'MD_CONTENT_CONFIRMED') {
    const confirmedMd = e.data.payload.text
    // 将确认的 markdown 发给后端保存
    fetch('/api/save', { method: 'POST', body: confirmedMd })
  }
})
```

### 3. 一次性加载 Markdown 全文（带锁定）

```js
const iframe = document.getElementById('app')

iframe.contentWindow.setMdFullText('# 已生成的文档\n\n内容…', false)   // 解锁，用户可修改后确认
iframe.contentWindow.setMdFullText('# 仅展示\n\n不可编辑', true)      // 锁定，只读展示
```

### 4. 加载 DSL 到线框编辑器 + 确认渲染

```js
const iframe = document.getElementById('app')
iframe.src = 'http://localhost:5173/#/editor'

const dslJson = {
  nid: 1,
  layerType: 'frame',
  layerName: 'Root',
  rect: { x: 0, y: 0, w: 800, h: 600 },
  children: [
    { nid: 2, layerType: 'text', layerName: 'Title', rect: { x: 100, y: 50, w: 200, h: 30 } },
  ],
}

iframe.contentWindow.postMessage({ type: 'NODE_DSL_JSON', payload: dslJson }, '*')

window.addEventListener('message', (e) => {
  if (e.data?.type === 'NODE_DSL_LOADED') {
    console.log('DSL 加载完成:', e.data.payload.success)
  }
  if (e.data?.type === 'DSL_NODE_UPDATED') {
    console.log('用户修改了节点:', e.data.payload)
  }
  if (e.data?.type === 'DSL_RENDER_CONFIRMED') {
    console.log('用户确认渲染:', e.data.payload.dsl)
  }
})
```

### 5. DSL → Pipeline → 预览

```js
const iframe = document.getElementById('app')
iframe.src = 'http://localhost:5173/#/preview'

iframe.contentWindow.postMessage({ type: 'NODE_DSL_PIPELINE', payload: dslJson }, '*')

window.addEventListener('message', (e) => {
  if (e.data?.type === 'PIPELINE_LOADED' && e.data.payload.success) {
    console.log('ZIP 预览已加载')
  }
})
```

### 6. 直接传入 ZIP 到预览

```js
const iframe = document.getElementById('app')
iframe.src = 'http://localhost:5173/#/preview'

const zipBuffer = await fetch('/some.zip').then(r => r.arrayBuffer())
iframe.contentWindow.postMessage(
  { type: 'PIPELINE_ZIP_DATA', payload: zipBuffer },
  '*',
  [zipBuffer]   // Transferable 零拷贝
)

window.addEventListener('message', (e) => {
  if (e.data?.type === 'ZIP_LOADED') {
    console.log('ZIP 加载完成:', e.data.payload.success)
  }
})
```

### 7. 封装 SDK 类（推荐）

```js
class AppBridge {
  constructor(src = 'http://localhost:5173/#/markdown') {
    this.handlers = {}
    this.iframe = document.createElement('iframe')
    this.iframe.id = 'app'
    this.iframe.src = src
    this.iframe.style.cssText = 'width:100%;height:100%;border:none'

    window.addEventListener('message', (e) => {
      if (e.source !== this.iframe.contentWindow) return
      const { type, payload } = e.data
      this.handlers[type]?.forEach(fn => fn(payload))
    })
  }

  mount(container) {
    container.appendChild(this.iframe)
    return this
  }

  on(type, fn) {
    (this.handlers[type] ??= []).push(fn)
    return this
  }

  off(type, fn) {
    this.handlers[type] = this.handlers[type]?.filter(f => f !== fn)
    return this
  }

  navigate(step) {
    const paths = { 1: '#/markdown', 2: '#/editor', 3: '#/preview' }
    const base = new URL(this.iframe.src).origin
    this.iframe.src = base + '/' + paths[step]
    return this
  }

  call(method, ...args) {
    this.iframe.contentWindow[method](...args)
    return this
  }

  post(type, payload, transfer = []) {
    this.iframe.contentWindow.postMessage({ type, payload }, '*', transfer)
    return this
  }
}

// 使用
const bridge = new AppBridge()
bridge
  .mount(document.getElementById('container'))
  .on('STEP_CHANGED', (p) => console.log('步骤', p.step))
  .on('MD_CONTENT_CONFIRMED', (p) => console.log('确认:', p.text))
  .on('DSL_RENDER_CONFIRMED', (p) => console.log('渲染确认:', p.dsl))
  .on('PIPELINE_LOADED', (p) => console.log('Pipeline:', p.success))

// 流式 MD
bridge.call('startMdStream')
bridge.call('appendMdChunk', '# Hello\n')
bridge.call('endMdStream')

// 一次性全文
bridge.call('setMdFullText', '# Title\n\nBody', false)

// 切到线框编辑器
bridge.navigate(2)
bridge.post('NODE_DSL_JSON', dslJson)

// 切到预览
bridge.navigate(3)
bridge.post('PIPELINE_ZIP_DATA', zipBuffer, [zipBuffer])
```
