const ALLOWED_PREFIXES = [
  'https://octo-v2beta.hdesign.huawei.com/app/design/',
]

export function sanitizeRoUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  if (!ALLOWED_PREFIXES.some(prefix => rawUrl.startsWith(prefix))) return ''
  const url = new URL(rawUrl)
  url.searchParams.set('fullscreen', '1')
  url.searchParams.set('mode', 'fullScreen')
  return url.toString()
}
