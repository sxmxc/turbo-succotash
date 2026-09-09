<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { mountRoom, type RoomView } from "../game/mount";
import type { RoomInteraction } from "../game/tiledRoom";
import type { RoomPlayer } from "../realtime";

const props = defineProps<{
  templateId: string;
  players: RoomPlayer[];
  localSessionId: string;
  bubbles: Record<string, string>;
}>();
const emit = defineEmits<{
  ready: [];
  error: [];
  move: [dx: number, dy: number];
  moveTo: [x: number, y: number];
  interact: [interaction: RoomInteraction];
}>();
const host = ref<HTMLDivElement>();
const localPlayer = computed(() =>
  props.players.find((player) => player.sessionId === props.localSessionId),
);
let view: RoomView | undefined;

onMounted(() => {
  if (host.value)
    view = mountRoom(
      host.value,
      props.templateId,
      () => {
        view?.setPlayers(props.players, props.localSessionId);
        emit("ready");
      },
      () => emit("error"),
      (x, y) => emit("moveTo", x, y),
      (dx, dy) => emit("move", dx, dy),
      (interaction) => emit("interact", interaction),
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

function toggleFullscreen() {
  view?.toggleFullscreen();
}

defineExpose({ toggleFullscreen });
</script>
<template>
  <div
    ref="host"
    :data-player-x="localPlayer?.x"
    :data-player-y="localPlayer?.y"
    class="room-canvas"
    role="application"
    tabindex="0"
    aria-label="Use arrow keys or WASD to move, or click a destination."
  />
</template>
