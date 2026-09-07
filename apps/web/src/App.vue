<script setup lang="ts">
import { ref } from "vue";
import RoomCanvas from "./components/RoomCanvas.vue";
import FloatingPanel from "./components/FloatingPanel.vue";
const ready = ref(false),
  accent = ref(0xefd6a2);
const version = __BUILD_VERSION__,
  commit = __BUILD_COMMIT__;
</script>
<template>
  <main>
    <header>
      <a href="/" class="brand"
        ><span class="brand-mark">▦</span> Social Room
        <span class="tag">WORKING TITLE</span></a
      ><span class="milestone">Milestone 0 <i /> Local preview</span>
    </header>
    <section class="intro">
      <p class="eyebrow">A PLACE TO START</p>
      <h1>A little room.<br />A shared beginning.</h1>
      <p>The foundation for a pixel-sized social world.</p>
    </section>
    <div class="room-frame">
      <div class="room-label">
        <span>01 / ROOM STUDY</span
        ><span>{{ ready ? "Scene ready" : "Loading scene…" }}</span>
      </div>
      <RoomCanvas :accent="accent" @ready="ready = true" />
      <div class="room-caption">
        ORTHOGRAPHIC · PLACEHOLDER ART · 16 × 16 PERSON
      </div>
    </div>
    <FloatingPanel
      ><span class="tag">BOOTSTRAP PREVIEW</span>
      <h2>Make yourself at home.</h2>
      <p>
        This is a rendering and interface study. Accounts, movement, chat, and
        multiplayer are coming in the next milestone.
      </p>
      <label for="accent">Preview tint</label
      ><select id="accent" v-model="accent">
        <option :value="0xefd6a2">Warm sand</option>
        <option :value="0xaadbc4">Garden mint</option>
        <option :value="0xc3b3e5">Soft lilac</option>
      </select>
      <p class="small">
        Local visual control only; nothing is saved.
      </p></FloatingPanel
    >
    <footer>
      <span>Vue UI + Phaser canvas</span
      ><code>v{{ version }} · {{ commit.slice(0, 12) }}</code>
    </footer>
  </main>
</template>
