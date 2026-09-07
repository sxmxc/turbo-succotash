<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
const panel = ref<HTMLElement>();
const x = ref(24),
  y = ref(116);
let drag: { id: number; dx: number; dy: number } | undefined;
function clamp() {
  if (!panel.value) return;
  x.value = Math.max(
    8,
    Math.min(x.value, window.innerWidth - panel.value.offsetWidth - 8),
  );
  y.value = Math.max(
    8,
    Math.min(y.value, window.innerHeight - panel.value.offsetHeight - 8),
  );
}
function start(e: PointerEvent) {
  if (window.matchMedia("(max-width: 640px)").matches) return;
  drag = { id: e.pointerId, dx: e.clientX - x.value, dy: e.clientY - y.value };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function move(e: PointerEvent) {
  if (!drag || e.pointerId !== drag.id) return;
  x.value = e.clientX - drag.dx;
  y.value = e.clientY - drag.dy;
  clamp();
}
function stop() {
  drag = undefined;
}
function key(e: KeyboardEvent) {
  const delta: Record<string, [number, number]> = {
    ArrowLeft: [-16, 0],
    ArrowRight: [16, 0],
    ArrowUp: [0, -16],
    ArrowDown: [0, 16],
  };
  if (delta[e.key]) {
    e.preventDefault();
    x.value += delta[e.key][0];
    y.value += delta[e.key][1];
    clamp();
  }
}
onMounted(() => {
  clamp();
  window.addEventListener("resize", clamp);
});
onBeforeUnmount(() => window.removeEventListener("resize", clamp));
</script>
<template>
  <section
    ref="panel"
    class="floating-panel"
    :style="{ left: x + 'px', top: y + 'px' }"
    aria-label="Preview panel"
  >
    <button
      class="panel-handle"
      aria-label="Move preview panel with arrow keys or drag"
      @pointerdown="start"
      @pointermove="move"
      @pointerup="stop"
      @pointercancel="stop"
      @lostpointercapture="stop"
      @keydown="key"
    >
      ✥ <span>Room notes</span><span class="muted">Drag to move</span>
    </button>
    <div class="panel-content"><slot /></div>
  </section>
</template>
