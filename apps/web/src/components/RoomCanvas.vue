<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { mountRoom, type RoomView } from "../game/mount";
const props = defineProps<{ accent: number }>();
const emit = defineEmits<{ ready: [] }>();
const host = ref<HTMLDivElement>();
let view: RoomView | undefined;
onMounted(() => {
  if (host.value) view = mountRoom(host.value, () => emit("ready"));
});
watch(
  () => props.accent,
  (color) => view?.setAccent(color),
);
onBeforeUnmount(() => view?.destroy());
</script>
<template>
  <div
    ref="host"
    class="room-canvas"
    role="img"
    aria-label="Orthographic room preview with a placeholder 16 by 16 pixel person"
  />
</template>
