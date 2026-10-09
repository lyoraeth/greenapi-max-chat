import { useEffect, useRef, useState, type HTMLAttributes, type KeyboardEvent, type PointerEvent } from 'react'

const STORAGE_KEY = 'sidebarWidth'
const MIN_WIDTH = 260
const MAX_WIDTH = 592
const DEFAULT_WIDTH = 393
const KEYBOARD_STEP = 16

const clamp = (width: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, width))

/**
 * Ширина панели чатов, изменяемая перетаскиванием разделителя.
 *
 * @returns текущую ширину и атрибуты для элемента-разделителя
 */
export function useSidebarWidth() {
  const [width, setWidth] = useState(() =>
    clamp(Number(localStorage.getItem(STORAGE_KEY)) || DEFAULT_WIDTH),
  )
  const dragStart = useRef({ pointerX: 0, width: 0 })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(width))
  }, [width])

  const separatorProps: HTMLAttributes<HTMLDivElement> = {
    role: 'separator',
    tabIndex: 0,
    'aria-orientation': 'vertical',
    'aria-label': 'Ширина списка чатов',
    'aria-valuemin': MIN_WIDTH,
    'aria-valuemax': MAX_WIDTH,
    'aria-valuenow': width,
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      event.currentTarget.setPointerCapture(event.pointerId)
      dragStart.current = { pointerX: event.clientX, width }
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
      setWidth(clamp(dragStart.current.width + event.clientX - dragStart.current.pointerX))
    },
    onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      if (event.key === 'ArrowLeft') setWidth((prev) => clamp(prev - KEYBOARD_STEP))
      if (event.key === 'ArrowRight') setWidth((prev) => clamp(prev + KEYBOARD_STEP))
    },
  }

  return { width, separatorProps }
}
