import { defineComponent, ref } from 'vue'
import type { PropType } from 'vue'
import type { DslNode, Rect } from '@/types/dsl'
import { SEMANTIC_COLOR, SEMANTIC_BG, DEFAULT_COLOR, DEFAULT_BG } from './colors'

const LAYOUT_STYLE_KEYS = [
  'display', 'flexDirection', 'alignItems', 'justifyContent',
  'gap', 'flexWrap', 'flexGrow', 'flexShrink', 'flexBasis',
  'overflow',
] as const

function isFlexContainer(node: DslNode): boolean {
  const d = node.style?.display
  return d === 'flex' || d === 'inline-flex'
}

function extractLayoutStyles(style: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of LAYOUT_STYLE_KEYS) {
    if (style[k] != null) out[k] = style[k]
  }
  return out
}

const NodeBlock = defineComponent({
  name: 'NodeBlock',
  props: {
    node:           { type: Object as PropType<DslNode>, required: true },
    selected:       { type: Boolean, default: false },
    isRoot:         { type: Boolean, default: false },
    insideFlexParent: { type: Boolean, default: false },
    parentRect:     { type: Object as PropType<Rect | null>, default: null },
  },
  emits: ['click'],
  setup(props, { emit }) {
    const hovered = ref(false)

    return () => {
      const { rect, layerType, children, style } = props.node
      const color = SEMANTIC_COLOR[layerType] ?? DEFAULT_COLOR
      const bg    = SEMANTIC_BG[layerType] ?? DEFAULT_BG
      const hasChildren = !!children && children.length > 0
      const isFlex = isFlexContainer(props.node)

      const commonStyle: Record<string, string | number> = {
        width:           `${rect.w}px`,
        height:          `${rect.h}px`,
        backgroundColor: bg,
        border:          `1px solid ${color}`,
        boxSizing:       'border-box',
        cursor:          'pointer',
        outline:         props.selected ? '2px solid #2563EB' : hovered.value ? `2px solid ${color}` : 'none',
        outlineOffset:   '0',
        zIndex:          props.selected ? 10 : 'auto' as string | number,
      }

      const childClick = (node: DslNode, e: MouseEvent) => {
        e.stopPropagation()
        emit('click', node, e)
      }

      // Root node: relative, children insideFlexParent based on root's layout
      if (props.isRoot) {
        const layout = extractLayoutStyles(style ?? {})
        return (
          <div
            style={{
              ...commonStyle,
              ...layout,
              position: 'relative',
            }}
            title={props.node.layerName}
            onMouseenter={() => { hovered.value = true }}
            onMouseleave={() => { hovered.value = false }}
            onClick={(e: MouseEvent) => { e.stopPropagation(); emit('click', props.node, e) }}
          >
            {hasChildren && children!.map(child => (
              <NodeBlock
                key={child.nid}
                node={child}
                selected={false}
                isRoot={false}
                insideFlexParent={isFlex}
                parentRect={rect}
                onClick={childClick}
              />
            ))}
          </div>
        )
      }

      // Inside flex parent: relative (participates in flex flow)
      if (props.insideFlexParent) {
        const layout = hasChildren && isFlex ? extractLayoutStyles(style ?? {}) : {}
        return (
          <div
            style={{
              ...commonStyle,
              ...layout,
              position: 'relative',
            }}
            title={props.node.layerName}
            onMouseenter={() => { hovered.value = true }}
            onMouseleave={() => { hovered.value = false }}
            onClick={(e: MouseEvent) => { e.stopPropagation(); emit('click', props.node, e) }}
          >
            {hasChildren && children!.map(child => (
              <NodeBlock
                key={child.nid}
                node={child}
                selected={false}
                isRoot={false}
                insideFlexParent={isFlex}
                parentRect={rect}
                onClick={childClick}
              />
            ))}
          </div>
        )
      }

      // Not inside flex parent + has children: relative container, children absolute
      if (hasChildren) {
        return (
          <div
            style={{
              ...commonStyle,
              position: 'relative',
            }}
            title={props.node.layerName}
            onMouseenter={() => { hovered.value = true }}
            onMouseleave={() => { hovered.value = false }}
            onClick={(e: MouseEvent) => { e.stopPropagation(); emit('click', props.node, e) }}
          >
            {children!.map(child => (
              <NodeBlock
                key={child.nid}
                node={child}
                selected={false}
                isRoot={false}
                insideFlexParent={false}
                parentRect={rect}
                onClick={childClick}
              />
            ))}
          </div>
        )
      }

      // Not inside flex parent + leaf: absolute positioned
      const pRect = props.parentRect
      const offsetX = pRect ? rect.x - pRect.x : rect.x
      const offsetY = pRect ? rect.y - pRect.y : rect.y

      return (
        <div
          style={{
            ...commonStyle,
            position: 'absolute',
            left: `${offsetX}px`,
            top: `${offsetY}px`,
          }}
          title={props.node.layerName}
          onMouseenter={() => { hovered.value = true }}
          onMouseleave={() => { hovered.value = false }}
          onClick={(e: MouseEvent) => { e.stopPropagation(); emit('click', props.node, e) }}
        />
      )
    }
  },
})

export default NodeBlock
