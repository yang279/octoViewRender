import { createRouter, createWebHashHistory } from 'vue-router'
import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import WorkspaceLayout from '@/layouts/WorkspaceLayout'

// 默认的 query 编码只做「部分编码」（保留 : / ? 等可读字符）。这里改成对每个
// query 值整体 encodeURIComponent / decodeURIComponent，使 `ro` 这类内嵌 URL 在
// 地址栏里是完整单层编码（https%3A%2F%2F...），与读取端的 decodeURIComponent 对称。
function decode(text: string): string {
  try { return decodeURIComponent(text) } catch { return text }
}

function parseQuery(search: string): LocationQuery {
  const query: LocationQuery = {}
  const trimmed = search[0] === '?' ? search.slice(1) : search
  if (!trimmed) return query
  for (const pair of trimmed.split('&')) {
    if (!pair) continue
    const eqIdx = pair.indexOf('=')
    const key = decode(eqIdx < 0 ? pair : pair.slice(0, eqIdx))
    const value = eqIdx < 0 ? null : decode(pair.slice(eqIdx + 1))
    const existing = query[key]
    if (existing === undefined) {
      query[key] = value
    } else if (Array.isArray(existing)) {
      existing.push(value)
    } else {
      query[key] = [existing, value]
    }
  }
  return query
}

function stringifyQuery(query: LocationQueryRaw | undefined): string {
  const parts: string[] = []
  if (!query) return ''
  const push = (key: string, value: string | number | null | undefined) => {
    if (value === undefined) return
    const k = encodeURIComponent(key)
    parts.push(value === null ? k : `${k}=${encodeURIComponent(String(value))}`)
  }
  for (const key in query) {
    const value = query[key]
    if (Array.isArray(value)) value.forEach(v => push(key, v))
    else push(key, value)
  }
  return parts.join('&')
}

const router = createRouter({
  history: createWebHashHistory(),
  parseQuery,
  stringifyQuery,
  routes: [
    {
      path: '/',
      component: WorkspaceLayout,
    },
  ],
})

export default router
