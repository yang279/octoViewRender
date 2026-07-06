export interface DesignDslMeta {
  version: string
  source: string
  file_id: string
  file_name: string
  created_at: string
  updated_at: string
}

export interface DesignDslBox {
  x: number
  y: number
  width: number
  height: number
}

export interface DesignDslSolidFill {
  type: 'solid'
  visible: boolean
  opacity: number
  color: string
}

export interface DesignDslImageFill {
  type: 'image'
  visible: boolean
  opacity: number
  image_hash: string
}

export interface DesignDslGradientStop {
  position: number
  color: string
}

export interface DesignDslGradientFill {
  type: 'gradient_linear'
  visible: boolean
  opacity: number
  stops: DesignDslGradientStop[]
}

export type DesignDslFill = DesignDslSolidFill | DesignDslImageFill | DesignDslGradientFill

export interface DesignDslSolidStroke {
  type: 'solid'
  visible: boolean
  opacity: number
  color: string
}

export type DesignDslStroke = DesignDslSolidStroke

export interface DesignDslDropShadow {
  type: 'drop_shadow'
  visible: boolean
  offset_x: number
  offset_y: number
  blur: number
  spread: number
  color?: string
}

export type DesignDslEffect = DesignDslDropShadow

export interface PlaceholderMeta {
  is_placeholder: true
  replacement_type: 'svg' | 'image'
  note: string
}

export interface DesignDslTextStyle {
  font_family: string
  font_style: string
  font_size: number
  color?: string
  letter_spacing: number
  line_height: number | 'auto'
  align_h: 'left' | 'center' | 'right'
  align_v: 'center'
}

export interface DesignDslAutoLayout {
  direction: 'vertical' | 'horizontal'
  gap: number
  counter_gap: number
  padding: [number, number, number, number]
  align_items: 'min' | 'center' | 'max' | 'stretch'
  justify_content: 'min' | 'center' | 'max' | 'space_evenly'
  wrap: boolean
}

export interface DesignDslInstance {
  symbol_id: string
  variant_key: string
  component_set_key: string
  component_set_resolved: boolean
  path: string
}

export interface DesignDslTextLayer {
  id: string
  name: string
  visible: true
  opacity: number
  blend_mode: 'normal'
  box: DesignDslBox
  type: 'text'
  text_content: string
  text_style: DesignDslTextStyle
  layout_grow?: number
  layout_align?: 'stretch' | 'center' | 'max' | 'min' | 'inherit'
}

export interface DesignDslInstanceLayer {
  id: string
  name: string
  visible: true
  opacity: number
  blend_mode: 'normal'
  box: DesignDslBox
  type: 'instance'
  instance: DesignDslInstance
  layout_grow?: number
  layout_align?: 'stretch' | 'center' | 'max' | 'min' | 'inherit'
}

export interface DesignDslFrameOrRectLayer {
  id: string
  name: string
  visible: true
  opacity: number
  blend_mode: 'normal'
  box: DesignDslBox
  type: 'frame' | 'rectangle'
  fills?: DesignDslFill[]
  strokes?: DesignDslStroke[]
  effects?: DesignDslEffect[]
  corner_radius?: number
  corner_radii?: [number, number, number, number]
  auto_layout?: DesignDslAutoLayout
  placeholder?: PlaceholderMeta
  children?: DesignDslLayer[]
  layout_grow?: number
  layout_align?: 'stretch' | 'center' | 'max' | 'min' | 'inherit'
}

export type DesignDslLayer = DesignDslTextLayer | DesignDslInstanceLayer | DesignDslFrameOrRectLayer

export interface DesignDslPage {
  id: string
  name: string
  layers: DesignDslLayer[]
}

export interface DesignDsl {
  meta: DesignDslMeta
  pages: DesignDslPage[]
}

export interface LayerStats {
  total: number
  frames: number
  texts: number
  instances: number
  placeholders: number
}
