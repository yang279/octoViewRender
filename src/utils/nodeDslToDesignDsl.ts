import type {
  DesignDsl,
  DesignDslBox,
  DesignDslFill,
  DesignDslStroke,
  DesignDslEffect,
  DesignDslPlaceholder,
  DesignDslTextStyle,
  DesignDslAutoLayout,
  DesignDslLayer,
  DesignDslInstance,
  LayerStats,
} from '@/types/design-dsl'

interface NodeDslRect {
  x: number
  y: number
  w: number
  h: number
}

interface NodeDslComponent {
  componentKey?: string
  path?: string
  variant?: {
    guid?: string
    variantKey?: string
  }
}

interface NodeDslNode {
  nid: number
  tag?: string
  label?: string
  layerName?: string
  layerType?: string
  rect?: NodeDslRect
  text?: string
  style?: Record<string, string>
  component?: NodeDslComponent
  children?: NodeDslNode[]
}

function cssColorToHex(css: string | undefined | null): string | null {
  if (!css) return null
  const s = css.trim()
  if (s === 'transparent' || s === 'rgba(0, 0, 0, 0)') return null
  let m: RegExpMatchArray | null
  m = s.match(/^rgb\(\s*(\d+),\s*(\d+),\s*(\d+)\s*\)$/)
  if (m) return '#' + [m[1], m[2], m[3]].map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('').toUpperCase() + 'FF'
  m = s.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/)
  if (m) {
    const a = Math.round(parseFloat(m[4]) * 255)
    return '#' + [m[1], m[2], m[3]].map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('').toUpperCase()
      + a.toString(16).padStart(2, '0').toUpperCase()
  }
  m = s.match(/^#([0-9a-fA-F]{6})$/)
  if (m) return '#' + m[1].toUpperCase() + 'FF'
  m = s.match(/^#([0-9a-fA-F]{8})$/)
  if (m) return '#' + m[1].toUpperCase()
  return null
}

function nidToId(nid: number): string {
  return `1:${nid}`
}

function parseGradientStops(str: string): { position: number; color: string }[] {
  const stops: { position: number; color: string }[] = []
  const re = /(#[0-9a-fA-F]{6,8}|rgba?\([^)]+\))\s+([\d.]+)%/g
  let m: RegExpMatchArray | null
  while ((m = re.exec(str)) !== null) {
    const color = cssColorToHex(m[1])
    if (color) stops.push({ position: parseFloat(m[2]) / 100, color })
  }
  return stops
}

function buildFills(style: Record<string, string>): DesignDslFill[] {
  const fills: DesignDslFill[] = []
  const bgColor = cssColorToHex(style.backgroundColor)
  if (bgColor) fills.push({ type: 'solid', visible: true, opacity: 1, color: bgColor })
  const bgImg = style.backgroundImage
  if (bgImg && bgImg !== 'none') {
    if (bgImg.startsWith('url(')) {
      const m = bgImg.match(/url\(["']?([^"')]+)["']?\)/)
      if (m) fills.push({ type: 'image', visible: true, opacity: 1, image_hash: m[1].split('/').pop()!.replace(/\.[^.]+$/, '') })
    } else if (bgImg.includes('gradient')) {
      fills.push({ type: 'gradient_linear', visible: true, opacity: 1, stops: parseGradientStops(bgImg) })
    }
  }
  return fills
}

function buildStrokes(style: Record<string, string>): DesignDslStroke[] {
  const strokes: DesignDslStroke[] = []
  const b = style.border
  if (b && !b.startsWith('0px')) {
    const m = b.match(/^([\d.]+)px\s+\S+\s+(.+)$/)
    if (m) {
      const color = cssColorToHex(m[2].trim())
      if (color) strokes.push({ type: 'solid', visible: true, opacity: 1, color })
    }
  }
  return strokes
}

function buildEffects(style: Record<string, string>): DesignDslEffect[] {
  const effects: DesignDslEffect[] = []
  const shadow = style.boxShadow
  if (shadow && shadow !== 'none') {
    const m = shadow.match(/^([-\d.]+)px\s+([-\d.]+)px\s+([\d.]+)px(?:\s+([\d.]+)px)?\s+(.+)$/)
    if (m) {
      const color = cssColorToHex(m[5].trim())
      effects.push({
        type: 'drop_shadow', visible: true,
        offset_x: parseFloat(m[1]), offset_y: parseFloat(m[2]),
        blur: parseFloat(m[3]), spread: parseFloat(m[4] || '0'),
        ...(color ? { color } : {}),
      })
    }
  }
  return effects
}

function buildCornerRadius(style: Record<string, string>): { corner_radius?: number; corner_radii?: [number, number, number, number] } {
  const r = style.borderRadius
  if (!r || r === '0px') return {}
  const parts = r.trim().split(/\s+/)
  if (parts.length === 1) return { corner_radius: parseFloat(parts[0]) }
  if (parts.length === 4) return { corner_radii: parts.map(parseFloat) as [number, number, number, number] }
  return { corner_radius: parseFloat(parts[0]) }
}

function fontWeightToStyle(w: string | undefined): string {
  const n = parseInt(w || '400', 10) || 400
  if (n >= 700) return 'Bold'
  if (n >= 600) return 'SemiBold'
  if (n >= 500) return 'Medium'
  return 'Regular'
}

function buildTextStyle(style: Record<string, string>): DesignDslTextStyle {
  const ts: DesignDslTextStyle = { font_family: style.fontFamily || '', font_style: fontWeightToStyle(style.fontWeight), font_size: style.fontSize ? parseFloat(style.fontSize) : 14, letter_spacing: style.letterSpacing ? parseFloat(style.letterSpacing) : 0, line_height: 'auto', align_h: 'left', align_v: 'center' }
  const color = cssColorToHex(style.color)
  if (color) ts.color = color
  const lh = style.lineHeight
  ts.line_height = (lh && lh !== 'normal') ? (parseFloat(lh) || 'auto') : 'auto'
  const align = style.textAlign
  ts.align_h = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left'
  return ts
}

function buildAutoLayout(style: Record<string, string>): DesignDslAutoLayout | null {
  if (style.display !== 'flex') return null
  const mapAlign = (v: string): 'min' | 'center' | 'max' | 'stretch' => {
    if (v === 'center') return 'center'
    if (v === 'flex-end') return 'max'
    if (v === 'stretch') return 'stretch'
    return 'min'
  }
  const mapJustify = (v: string): 'min' | 'center' | 'max' | 'space_evenly' => {
    if (v === 'center') return 'center'
    if (v === 'flex-end') return 'max'
    if (/space/.test(v || '')) return 'space_evenly'
    return 'min'
  }
  return {
    direction: style.flexDirection === 'column' ? 'vertical' : 'horizontal',
    gap: style.gap ? parseFloat(style.gap) : 0,
    counter_gap: 0,
    padding: [0, 0, 0, 0],
    align_items: mapAlign(style.alignItems || ''),
    justify_content: mapJustify(style.justifyContent || ''),
    wrap: style.flexWrap === 'wrap',
  }
}

function buildChildLayout(style: Record<string, string>): { layout_grow?: number; layout_align?: 'stretch' | 'center' | 'max' | 'min' | 'inherit' } {
  const out: { layout_grow?: number; layout_align?: 'stretch' | 'center' | 'max' | 'min' | 'inherit' } = {}
  const grow = parseFloat(style.flexGrow)
  if (!isNaN(grow) && grow > 0) out.layout_grow = grow
  const self = style.alignSelf
  if (self && self !== 'auto') {
    out.layout_align =
      self === 'stretch'    ? 'stretch' :
      self === 'center'     ? 'center'  :
      self === 'flex-end'   ? 'max'     :
      self === 'flex-start' ? 'min'     : 'inherit'
  }
  return out
}

function buildPlaceholder(style: Record<string, string>): DesignDslPlaceholder | null {
  if (style.svgContent) return { is_placeholder: true, replacement_type: 'svg', note: style.svgContent }
  if (style.imageData)  return { is_placeholder: true, replacement_type: 'image', note: style.imageData }
  return null
}

type VisualProps = {
  fills?: DesignDslFill[]
  strokes?: DesignDslStroke[]
  effects?: DesignDslEffect[]
  corner_radius?: number
  corner_radii?: [number, number, number, number]
}

function buildVisualProps(style: Record<string, string>): VisualProps {
  const fills   = buildFills(style)
  const strokes = buildStrokes(style)
  const effects = buildEffects(style)
  const corners = buildCornerRadius(style)
  return {
    ...(fills.length                  ? { fills         : fills }         : {}),
    ...(strokes.length                ? { strokes       : strokes }      : {}),
    ...(effects.length                ? { effects       : effects }      : {}),
    ...(corners.corner_radius != null ? { corner_radius : corners.corner_radius } : {}),
    ...(corners.corner_radii          ? { corner_radii  : corners.corner_radii }  : {}),
  }
}

type BaseLayer = {
  id: string
  name: string
  visible: true
  opacity: number
  blend_mode: 'normal'
  box: DesignDslBox
  layout_grow?: number
  layout_align?: 'stretch' | 'center' | 'max' | 'min' | 'inherit'
}

function makeBase(node: NodeDslNode, parentRect: NodeDslRect): BaseLayer {
  const style = node.style || {}
  const r: NodeDslRect = node.rect || { x: 0, y: 0, w: 0, h: 0 }
  const opacityRaw = parseFloat(style.opacity)
  const opacity = !isNaN(opacityRaw) ? opacityRaw : 1
  return {
    id: nidToId(node.nid),
    name: node.layerName || node.label || `${node.tag || 'node'}-${node.nid}`,
    visible: true,
    opacity,
    blend_mode: 'normal',
    box: { x: r.x - parentRect.x, y: r.y - parentRect.y, width: r.w, height: r.h },
    ...buildChildLayout(style),
  }
}

function filterKids(node: NodeDslNode): NodeDslNode[] {
  return (node.children || []).filter(c => {
    const cr = c.rect
    return cr && (cr.w > 0 || cr.h > 0 || (c.children || []).length > 0)
  })
}

function convertNode(node: NodeDslNode, parentRect: NodeDslRect): DesignDslLayer {
  const style = node.style || {}
  const r: NodeDslRect = node.rect || { x: 0, y: 0, w: 0, h: 0 }
  const base = makeBase(node, parentRect)

  if (node.component && node.layerType === 'component') {
    const comp = node.component
    return {
      ...base,
      type: 'instance',
      instance: {
        symbol_id:              comp.variant?.guid       || '',
        variant_key:            comp.variant?.variantKey || '',
        component_set_key:      comp.componentKey        || '',
        component_set_resolved: false,
        path:                   comp.path                || '',
      } as DesignDslInstance,
    }
  }

  if (node.layerType === 'component') {
    return { ...base, type: 'rectangle', ...buildVisualProps(style) } as DesignDslLayer
  }

  if (node.layerType === 'icon') {
    const ph = buildPlaceholder(style)
    return {
      ...base, type: 'rectangle', ...buildVisualProps(style),
      ...(ph ? { placeholder: ph } : {}),
    } as DesignDslLayer
  }

  if (node.layerType === 'rectangle') {
    return { ...base, type: 'rectangle', ...buildVisualProps(style) } as DesignDslLayer
  }

  if (node.layerType === 'image') {
    const hasKids = (node.children || []).length > 0
    const ph = buildPlaceholder(style)
    if (!hasKids) {
      return { ...base, type: 'rectangle', ...(ph ? { placeholder: ph } : {}) } as DesignDslLayer
    }
    const kids = filterKids(node)
    return {
      ...base, type: 'frame', ...(ph ? { placeholder: ph } : {}),
      ...(kids.length ? { children: kids.map(c => convertNode(c, r)) } : {}),
    } as DesignDslLayer
  }

  const hasText = node.text && node.text.trim()
  const hasKids = (node.children || []).length > 0
  if (node.layerType === 'text' && hasText && !hasKids) {
    return {
      ...base,
      type: 'text',
      text_content: node.text!.trim(),
      text_style: buildTextStyle(style),
    }
  }

  const autoLayout = buildAutoLayout(style)
  const kids = filterKids(node)
  return {
    ...base, type: 'frame', ...buildVisualProps(style),
    ...(autoLayout ? { auto_layout: autoLayout } : {}),
    ...(kids.length ? { children: kids.map(c => convertNode(c, r)) } : {}),
  } as DesignDslLayer
}

export function convert(inputJson: unknown, pageName?: string): DesignDsl {
  const parsed = inputJson as { meta?: { file_name?: string } }
  const name  = pageName || parsed?.meta?.file_name || 'Page 1'
  const now   = new Date().toISOString()
  const slug  = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const roots: NodeDslNode[] = Array.isArray(inputJson) ? inputJson : [inputJson as NodeDslNode]

  return {
    meta: {
      version:    '1.0.0',
      source:     'node-dsl',
      file_id:    slug,
      file_name:  name,
      created_at: now,
      updated_at: now,
    },
    pages: [{
      id:     '0:1',
      name:   name,
      layers: roots.map(r => convertNode(r, { x: 0, y: 0, w: 0, h: 0 })),
    }],
  }
}

export function countLayers(layers: DesignDslLayer[] | undefined, acc: LayerStats = { total: 0, frames: 0, texts: 0, instances: 0, placeholders: 0 }): LayerStats {
  for (const l of (layers || [])) {
    acc.total++
    if      (l.type === 'instance') acc.instances++
    else if (l.type === 'text')     acc.texts++
    else if (l.type === 'frame')  { acc.frames++; if (l.placeholder) acc.placeholders++; }
    if (l.type !== 'text' && l.type !== 'instance') {
      countLayers((l as DesignDslLayer & { children?: DesignDslLayer[] }).children, acc)
    }
  }
  return acc
}
