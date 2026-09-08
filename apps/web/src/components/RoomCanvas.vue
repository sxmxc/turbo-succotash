<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { mountRoom, type RoomView } from "../game/mount";
import type { RoomPlayer } from "../realtime";

const props = defineProps<{
  players: RoomPlayer[];
  localSessionId: string;
  bubbles: Record<string, string>;
}>();
const emit = defineEmits<{
  ready: [];
  error: [];
  move: [dx: number, dy: number];
  moveTo: [x: number, y: number];
}>();
const host = ref<HTMLDivElement>();
let view: RoomView | undefined;

onMounted(() => {
  if (host.value)
    view = mountRoom(
      host.value,
      () => {
        view?.setPlayers(props.players, props.localSessionId);
        emit("ready");
      },
      () => emit("error"),
      (x, y) => emit("moveTo", x, y),
      (dx, dy) => emit("move", dx, dy),
    );
});
watch(
  () => [props.players, props.localSessionId] as const,
  () => view?.setPlayers(props.players, props.localSessionId),
  { deep: true },
);
watch(
  () => props.bubbles,
  (bubbles) => view?.setBubbles(bubbles),
  { deep: true },
);
onBeforeUnmount(() => {
  view?.destroy();
});
</script>
<template>
  <div
    ref="host"
    class="room-canvas"
    role="application"
    tabindex="0"
    aria-label="Shared orthographic room. Use arrow keys or WASD to move, or click a destination."
  />
</template>
