# Window Bridge API

宿主 WebView 与本应用之间的通信桥梁。本应用通过 `window` 暴露方法供宿主直接调用，同时通过 `postMessage` 与父窗口双向通信。

---

## 暴露方法（window.xxx）

以下方法在组件挂载时挂载到 `window`，卸载时清除。

| 方法 | 签名 | 说明 |
|------|------|------|
| `uploadDsl` | `() => void` | 弹出文件选择器，选择 `.json` 文件并加载 DSL 数据到架构编辑器 |
| `downloadDsl` | `() => void` | 将当前 DSL 树导出为 `.json` 文件并触发浏览器下载 |
| `uploadZip` | `() => void` | 弹出文件选择器，选择 `.zip` 文件并解压加载到设计预览 |
| `uploadDslToPipeline` | `() => void` | 弹出文件选择器，选择 `.json` 文件后加载 DSL 数据（仅加载，不触发 dsl-to-hex 转换） |
| `renderDslToPipeline` | `(json: unknown) => Promise<void>` | 传入 DSL JSON 对象，调用 dsl-to-hex API 转换并加载 ZIP 结果到设计预览 |
| `clearDsl` | `() => void` | 清空当前 DSL 树数据及确认状态 |
| `confirmDsl` | `() => void` | 确认渲染当前 DSL，标记为已确认状态 |

---

## 接收消息（从父窗口 postMessage 发来）

| 消息类型 | Payload 结构 | 说明 |
|----------|-------------|------|
| `NODE_DSL_JSON` | `unknown`（DSL JSON 对象） | 加载 DSL 数据到架构编辑器（Step 1） |
| `NODE_DSL_PIPELINE` | `unknown`（DSL JSON 对象） | 加载 DSL 后自动调用 dsl-to-hex API 进入设计生成（Step 2） |
| `NODE_DSL_CLEAR` | 无 | 清空 DSL 数据 |
| `DSL_CONFIRM` | 无 | 确认渲染 DSL |
| `PIPELINE_ZIP_DATA` | `ArrayBuffer`（ZIP 二进制，Transferable） | 直接接收 ZIP 数据，解压并加载到设计预览 |
| `STEP_CHANGE` | `{ step: number }`（范围 1-2） | 切换步骤：1=架构生成，2=设计生成 |
| `INIT_PREVIEW_URL` | `{ url: string }` | 初始化预览 iframe URL，会经过 `sanitizeRoUrl` 校验 |

---

## 发出消息（向父窗口 postMessage 发回）

| 消息类型 | Payload 结构 | 触发时机 |
|----------|-------------|----------|
| `DSL_NODE_UPDATED` | `{ nid: number, changes: { layerType: string, layerName: string, layerDescription: string } }` | 用户在 NodeInfoPopover 中编辑节点元信息时 |
| `NODE_DSL_LOADED` | `{ success: true }` 或 `{ success: false, error: string }` | DSL 数据加载完成或失败时（`uploadDsl`、`NODE_DSL_JSON`、`NODE_DSL_PIPELINE` 均触发） |
| `DSL_RENDER_CONFIRMED` | `{ dsl: unknown }`（DSL 树的深拷贝） | 用户确认渲染 DSL 时 |
| `PIPELINE_LOADED` | `{ success: true, zipData: ArrayBuffer }` 或 `{ success: false, error: string }` | dsl-to-hex API 转换完成时；成功时 `zipData` 通过 Transferable 传输 |
| `ZIP_LOADED` | `{ success: true, zipData: ArrayBuffer }` 或 `{ success: false, error: string }` | 处理 `PIPELINE_ZIP_DATA` 完成时；成功时 `zipData` 通过 Transferable 传输 |
| `STEP_CHANGED` | `{ step: number }` | **仅类型声明，当前代码未实际发送** |

---

## 消息流程示例

### 架构生成（Step 1）—— 加载 DSL

```
宿主 → postMessage({ type: 'NODE_DSL_JSON', payload: dslObj })
应用 → postMessage({ type: 'NODE_DSL_LOADED', payload: { success: true } })
```

### 架构生成（Step 1）—— 编辑节点

```
宿主 → 调用 window.uploadDsl() / 或 postMessage NODE_DSL_JSON
用户 → 在 NodeInfoPopover 编辑元信息
应用 → postMessage({ type: 'DSL_NODE_UPDATED', payload: { nid, changes: {...} } })
```

### 架构生成 → 设计生成（Step 2）—— Pipeline 转换

```
宿主 → postMessage({ type: 'NODE_DSL_PIPELINE', payload: dslObj })
应用 → 加载 DSL → 调用 dsl-to-hex API → 解压 ZIP
应用 → postMessage({ type: 'NODE_DSL_LOADED', payload: { success: true } })
应用 → postMessage({ type: 'PIPELINE_LOADED', payload: { success: true, zipData } })  [Transferable]
```

### 直接接收 ZIP

```
宿主 → postMessage({ type: 'PIPELINE_ZIP_DATA', payload: arrayBuffer })  [Transferable]
应用 → 解压 ZIP → 加载预览
应用 → postMessage({ type: 'ZIP_LOADED', payload: { success: true, zipData } })  [Transferable]
```

### 确认渲染

```
宿主 → 调用 window.confirmDsl() / 或 postMessage DSL_CONFIRM
应用 → postMessage({ type: 'DSL_RENDER_CONFIRMED', payload: { dsl } })
```

### 切换步骤

```
宿主 → postMessage({ type: 'STEP_CHANGE', payload: { step: 2 } })
应用 → router.replace({ query: { step: '2', ro: currentRo } })
```
