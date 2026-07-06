export interface ZipResource {
  filename: string
  blobUrl: string
  mimeType: string
  content?: ArrayBuffer | Uint8Array | string
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
  fixed?: boolean
}

export type LayerType =
  | 'image'
  | 'frame'
  | 'text'
  | 'icon'
  | 'component'
  | 'rectangle'

export type ResourceType = 'component' | 'icon' | 'illus' | 'image'

export interface ComponentResourceDetail {
  cv_component_name: string
  cv_canvas_name: string
  cv_variant_name: string
  cv_component_key: string
  cv_variant_key: string
  cv_variant_guid: string
  cv_domain: string
  file_path: string
  name: string
  description: string
  tags: string[]
}

export interface IconResourceDetail {
  icon_id: string
  name: string
  chineseName: string
  englishName: string
  description: string
  category: string
  group: string
  icon_file_type: 'svg' | 'png'
  icon_content: string
}

export interface IllusResourceDetail {
  illus_id: string
  alias: string
  description: string
  category: string
  tags: string[]
  theme: string
  version: string
  illus_file_type: 'svg' | 'png'
  illus_content: string
}

export interface ImageResourceDetail {
  file_path: string
  name: string
  description: string
}

export type ResourceDetail =
  | ComponentResourceDetail
  | IconResourceDetail
  | IllusResourceDetail
  | ImageResourceDetail

export interface DslNode {
  nid: number
  tag: string
  rect: Rect
  layerType: LayerType | string
  layerName: string
  layerDescription: string
  layerConfidence?: 'low'
  style: Record<string, string>
  id?: string
  class?: string
  attrs?: Record<string, unknown>
  text?: string
  src?: string
  alt?: string
  href?: string
  type?: string
  naturalWidth?: number
  naturalHeight?: number
  loaded?: boolean
  resourceType?: ResourceType
  resourceId?: string
  resourceVectorText?: string
  resourceScore?: number
  resourceDetail?: ResourceDetail
  children?: DslNode[]
}
