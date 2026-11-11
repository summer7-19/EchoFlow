import { computed, ref } from 'vue'

const DIVIDER_WIDTH = 14
const MIN_PANE_WIDTH = 370
const PRESS_DELAY_MS = 80
const DRAG_THRESHOLD_PX = 6

/** Pointer-driven split view: click toggles the ratio, long-press and drag resizes. */
export function useSplitPane() {
  const containerRef = ref<HTMLElement>()
  const dividerRef = ref<HTMLElement>()
  const mainRatio = ref(70)
  const isSwapped = ref(true)
  const isResizing = ref(false)

  let pressTimer: number | undefined
  let pressOrigin = { x: 0, y: 0 }
  let pointerMoved = false

  const paneStyle = computed(() => ({
    '--pane-main-fr': `${mainRatio.value}fr`,
    '--pane-side-fr': `${100 - mainRatio.value}fr`,
  }))

  function toggleSplit() {
    isSwapped.value = !isSwapped.value
    mainRatio.value = 100 - mainRatio.value
  }

  function resetSplit() {
    isResizing.value = false
    pointerMoved = false
    isSwapped.value = false
    mainRatio.value = 70
  }

  function startDividerPress(event: PointerEvent) {
    if (event.button !== 0) return

    pointerMoved = false
    pressOrigin = { x: event.clientX, y: event.clientY }
    dividerRef.value?.setPointerCapture(event.pointerId)

    window.clearTimeout(pressTimer)
    pressTimer = window.setTimeout(() => {
      isResizing.value = true
    }, PRESS_DELAY_MS)
  }

  function moveDivider(event: PointerEvent) {
    if (!isResizing.value) {
      const moved =
        Math.hypot(event.clientX - pressOrigin.x, event.clientY - pressOrigin.y) >
        DRAG_THRESHOLD_PX
      if (moved) {
        window.clearTimeout(pressTimer)
        pointerMoved = true
      }
      return
    }

    const rect = containerRef.value?.getBoundingClientRect()
    if (!rect) return

    const totalWidth = rect.width - DIVIDER_WIDTH
    if (totalWidth <= 0) return

    const pointerPixel = event.clientX - rect.left
    const panePixel = Math.max(
      MIN_PANE_WIDTH,
      Math.min(totalWidth - MIN_PANE_WIDTH, pointerPixel),
    )
    mainRatio.value = (panePixel / totalWidth) * 100
  }

  function endDividerPress(event: PointerEvent) {
    window.clearTimeout(pressTimer)
    if (dividerRef.value?.hasPointerCapture(event.pointerId)) {
      dividerRef.value.releasePointerCapture(event.pointerId)
    }

    if (isResizing.value) {
      isResizing.value = false
    } else if (!pointerMoved) {
      toggleSplit()
    }

    pointerMoved = false
  }

  function cancelDividerPress() {
    window.clearTimeout(pressTimer)
    isResizing.value = false
    pointerMoved = false
  }

  return {
    containerRef,
    dividerRef,
    mainRatio,
    isSwapped,
    isResizing,
    paneStyle,
    toggleSplit,
    resetSplit,
    startDividerPress,
    moveDivider,
    endDividerPress,
    cancelDividerPress,
  }
}
