<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import RoomCanvas from "./components/RoomCanvas.vue";
import FloatingPanel from "./components/FloatingPanel.vue";
import RoomChat from "./components/RoomChat.vue";
import type { RoomInteraction } from "./game/tiledRoom";
import {
  connectRoom,
  type ChatEvent,
  type RoomConnection,
  type RoomDescriptor,
  type RoomPlayer,
} from "./realtime";

type SessionUser = { id: string; name: string; email: string };
const ready = ref(false);
const failed = ref(false);
const loading = ref(true);
const error = ref("");
const mode = ref<"login" | "register">("login");
const betaGateEnabled = ref(true);
const user = ref<SessionUser>();
const email = ref("");
const name = ref("");
const password = ref("");
const betaKey = ref("");
const shirtTint = ref(0xefd6a2);
const players = ref<RoomPlayer[]>([]);
const connection = ref<RoomConnection>();
const connectionStatus = ref<"Offline" | "Connecting" | "Connected" | "Failed">(
  "Offline",
);
const messages = ref<ChatEvent[]>([]);
const bubbles = ref<Record<string, string>>({});
const interaction = ref<RoomInteraction>();
const currentRoom = ref<RoomDescriptor>();
const directoryRooms = ref<RoomDescriptor[]>([]);
const destinationAddress = ref("");
const destinationPassword = ref("");
const newRoomName = ref("");
const newRoomPrivate = ref(false);
const newRoomPassword = ref("");
const interactionPanel = ref<HTMLElement>();
const roomCanvas = ref<InstanceType<typeof RoomCanvas>>();
const version = __BUILD_VERSION__;
const commit = __BUILD_COMMIT__;
watch(interaction, async (value) => {
  if (!value) return;
  await nextTick();
  interactionPanel.value?.querySelector<HTMLElement>("input, button")?.focus();
});

async function jsonRequest(path: string, init?: Parameters<typeof fetch>[1]) {
  const response = await fetch(path, {
    credentials: "include",
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      body.code ??
        body.message ??
        (response.status === 401
          ? "Email or password was not accepted."
          : "Request failed."),
    );
  return body;
}
function readable(message: string) {
  const labels: Record<string, string> = {
    BETA_KEY_REQUIRED: "A beta key is required during closed beta.",
    BETA_KEY_INVALID: "That beta key is invalid, revoked, or already used.",
    EMAIL_IN_USE: "An account already uses that email.",
    RATE_LIMITED: "Too many attempts. Please wait a minute.",
    INVALID_SIGNUP: "Check your name, email, and password.",
    INVALID_ROOM: "Enter a room name and a password of at least 8 characters.",
    ROOM_NOT_FOUND: "That room address was not found.",
    ROOM_PASSWORD_INVALID: "That room password was not accepted.",
  };
  return labels[message] ?? message;
}
async function loadSession() {
  const response = await fetch("/identity/auth/get-session", {
    credentials: "include",
  });
  const data = response.ok ? await response.json() : null;
  user.value = data?.user;
}
async function submitAuth() {
  error.value = "";
  try {
    if (mode.value === "register")
      await jsonRequest("/identity/auth/sign-up/email", {
        method: "POST",
        body: JSON.stringify({
          email: email.value,
          name: name.value,
          password: password.value,
          ...(betaGateEnabled.value ? { betaKey: betaKey.value } : {}),
        }),
      });
    else
      await jsonRequest("/identity/auth/sign-in/email", {
        method: "POST",
        body: JSON.stringify({
          email: email.value,
          password: password.value,
          rememberMe: true,
        }),
      });
    password.value = "";
    betaKey.value = "";
    await loadSession();
  } catch (caught) {
    error.value = readable(
      caught instanceof Error ? caught.message : "Authentication failed.",
    );
  }
}
async function joinRoom() {
  if (!user.value || connection.value) return;
  try {
    const entry = (await jsonRequest("/api/v1/rooms/entry")) as RoomDescriptor;
    await joinDestination(entry, "default_elevator_spawn");
  } catch (caught) {
    connectionStatus.value = "Failed";
    error.value = readable(
      caught instanceof Error ? caught.message : "Could not enter the lobby.",
    );
  }
}
async function joinDestination(
  room: RoomDescriptor,
  spawn?: string,
  password?: string,
) {
  connectionStatus.value = "Connecting";
  error.value = "";
  try {
    const previous = connection.value;
    connection.value = undefined;
    await previous?.leave();
    players.value = [];
    messages.value = [];
    bubbles.value = {};
    ready.value = false;
    const nextConnection = await connectRoom(
      { address: room.address, password, spawn },
      shirtTint.value,
      (next) => (players.value = next),
      receiveChat,
    );
    currentRoom.value = room;
    connection.value = nextConnection;
    connectionStatus.value = "Connected";
  } catch (caught) {
    connectionStatus.value = "Failed";
    error.value =
      caught instanceof Error ? caught.message : "Could not join the room.";
  }
}
async function openInteraction(next: RoomInteraction) {
  try {
    interaction.value = next;
    if (next.kind === "elevator") {
      const result = await jsonRequest("/api/v1/rooms");
      directoryRooms.value = result.rooms;
    } else if (next.kind === "door" && next.destination) {
      const room = (await jsonRequest(
        `/api/v1/rooms/resolve/${encodeURIComponent(next.destination)}`,
      )) as RoomDescriptor;
      await joinDestination(room, next.destinationSpawn);
      interaction.value = undefined;
    }
  } catch (caught) {
    error.value = readable(
      caught instanceof Error ? caught.message : "Could not use interaction.",
    );
  }
}
async function enterAddress(room?: RoomDescriptor) {
  try {
    const address = room?.address ?? destinationAddress.value.toUpperCase();
    if (!address) return;
    const admitted = (await jsonRequest(
      `/api/v1/rooms/${encodeURIComponent(address)}/admission`,
      {
        method: "POST",
        body: JSON.stringify({ password: destinationPassword.value }),
      },
    )) as RoomDescriptor;
    await joinDestination(
      admitted,
      admitted.templateId === "floor_0_lobby" ||
        admitted.templateId.includes("/lobby_template/")
        ? "default_elevator_spawn"
        : "default_room_spawn",
      destinationPassword.value,
    );
    interaction.value = undefined;
  } catch (caught) {
    error.value = readable(
      caught instanceof Error ? caught.message : "Could not enter room.",
    );
  }
}
async function createRoom() {
  try {
    const room = (await jsonRequest("/api/v1/rooms", {
      method: "POST",
      body: JSON.stringify({
        name: newRoomName.value,
        private: newRoomPrivate.value,
        password: newRoomPassword.value,
      }),
    })) as RoomDescriptor;
    await joinDestination(room, "default_room_spawn", newRoomPassword.value);
    interaction.value = undefined;
  } catch (caught) {
    error.value = readable(
      caught instanceof Error ? caught.message : "Could not create room.",
    );
  }
}
function receiveChat(message: ChatEvent) {
  messages.value = [...messages.value.slice(-99), message];
  bubbles.value = { ...bubbles.value, [message.senderId]: message.text };
  window.setTimeout(() => {
    if (bubbles.value[message.senderId] === message.text) {
      const next = { ...bubbles.value };
      delete next[message.senderId];
      bubbles.value = next;
    }
  }, 4500);
}
function sendChat(text: string) {
  connection.value?.sendChat(text);
}
async function logout() {
  await connection.value?.leave();
  connection.value = undefined;
  players.value = [];
  messages.value = [];
  bubbles.value = {};
  interaction.value = undefined;
  connectionStatus.value = "Offline";
  currentRoom.value = undefined;
  await jsonRequest("/identity/auth/sign-out", { method: "POST" });
  user.value = undefined;
}
onMounted(async () => {
  try {
    const registration = await jsonRequest("/identity/registration");
    betaGateEnabled.value = registration.betaGateEnabled;
    await loadSession();
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : "Services are unavailable.";
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main>
    <header>
      <a href="/" class="brand"
        ><span class="brand-mark">▦</span> Panverse Plaza</a
      ><span class="header-actions"
        ><span class="server-connection"
          >Server <i /> {{ connectionStatus }}</span
        ><button
          v-if="user && connection"
          class="header-sign-out text-button"
          type="button"
          @click="logout"
        >
          Sign out
        </button></span
      >
    </header>

    <section v-if="!connection" class="intro">
      <p class="eyebrow">{{ currentRoom?.name ?? "Plaza Lobby" }}</p>
      <p v-if="user">
        Signed in as {{ user.name }}. Choose an avatar color, then join.
      </p>
      <p v-else>Sign in to enter the shared room.</p>
    </section>

    <template v-if="user && connection">
      <section class="game-shell" aria-label="Panverse Plaza room">
        <div class="game-toolbar">
          <div class="room-identity">
            <span class="eyebrow">{{ currentRoom?.address }}</span>
            <strong>{{ currentRoom?.name }}</strong>
          </div>
          <span class="room-presence">{{
            failed
              ? "Assets failed to load"
              : ready
                ? `${players.length} online now`
                : "Loading room…"
          }}</span>
          <button
            class="fullscreen-button"
            type="button"
            aria-label="Toggle room fullscreen"
            @click="roomCanvas?.toggleFullscreen()"
          >
            Fullscreen
          </button>
        </div>
        <div class="room-frame">
          <p v-if="failed" class="room-status" role="alert">
            Character assets failed to load. Reload to retry.
          </p>
          <p v-else-if="ready" class="room-status" role="status">Scene ready</p>
          <RoomCanvas
            ref="roomCanvas"
            :key="currentRoom?.templateId"
            :template-id="currentRoom?.templateId ?? 'floor_0_lobby'"
            :players="players"
            :local-session-id="connection.sessionId"
            :bubbles="bubbles"
            @ready="ready = true"
            @error="failed = true"
            @move="(dx, dy) => connection?.sendMove(dx, dy)"
            @move-to="(x, y) => connection?.moveTo(x, y)"
            @interact="openInteraction"
          />
          <div class="room-caption">
            <span>ARROW KEYS / WASD · CLICK OR TAP TO MOVE</span>
            <span>EXPLORE THE ROOM</span>
          </div>
        </div>
      </section>
      <FloatingPanel class="room-chat-panel" title="Room chat" collapsible bare>
        <RoomChat
          :current-user="user"
          :players="players"
          :messages="messages"
          @send="sendChat"
        />
      </FloatingPanel>
      <section
        v-if="interaction"
        ref="interactionPanel"
        class="interaction-popup"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="`interaction-${interaction.id}`"
        @keydown.esc="interaction = undefined"
      >
        <span class="tag">INTERACTION</span>
        <h2 :id="`interaction-${interaction.id}`">
          {{ interaction.displayLabel ?? interaction.name }}
        </h2>
        <template v-if="interaction.kind === 'elevator'">
          <label for="destination-address">Room address</label>
          <input
            id="destination-address"
            v-model="destinationAddress"
            placeholder="F001-R001"
          />
          <label for="destination-password">Password (private rooms)</label>
          <input
            id="destination-password"
            v-model="destinationPassword"
            type="password"
          />
          <button type="button" @click="enterAddress()">Go to address</button>
          <ul class="room-directory">
            <li v-for="room in directoryRooms" :key="room.id">
              <button
                type="button"
                class="text-button"
                @click="enterAddress(room)"
              >
                {{ room.address }} · {{ room.name }}
              </button>
            </li>
          </ul>
          <h3>Create a room</h3>
          <label for="new-room-name">Room name</label>
          <input id="new-room-name" v-model="newRoomName" maxlength="80" />
          <label
            ><input v-model="newRoomPrivate" type="checkbox" /> Private
            room</label
          >
          <input
            v-if="newRoomPrivate"
            v-model="newRoomPassword"
            type="password"
            minlength="8"
            placeholder="Room password"
          />
          <button type="button" @click="createRoom">Create and enter</button>
        </template>
        <p v-else>
          Direct door navigation is ready when a destination is authored.
        </p>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button type="button" @click="interaction = undefined">Close</button>
      </section>
    </template>

    <FloatingPanel v-else-if="!loading">
      <template v-if="!user">
        <span class="tag">ACCOUNT REQUIRED</span>
        <h2>
          {{ mode === "login" ? "Welcome back." : "Make yourself at home." }}
        </h2>
        <form class="auth-form" @submit.prevent="submitAuth">
          <label v-if="mode === 'register'" for="name">Display name</label>
          <input
            v-if="mode === 'register'"
            id="name"
            v-model="name"
            required
            maxlength="40"
            autocomplete="nickname"
          />
          <label for="email">Email</label>
          <input
            id="email"
            v-model="email"
            required
            type="email"
            autocomplete="email"
          />
          <label for="password">Password</label>
          <input
            id="password"
            v-model="password"
            required
            type="password"
            minlength="8"
            maxlength="128"
            :autocomplete="
              mode === 'login' ? 'current-password' : 'new-password'
            "
          />
          <template v-if="mode === 'register' && betaGateEnabled">
            <label for="beta-key">Beta key</label>
            <input
              id="beta-key"
              v-model="betaKey"
              required
              autocomplete="off"
            />
          </template>
          <button type="submit">
            {{ mode === "login" ? "Sign in" : "Create account" }}
          </button>
        </form>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button
          class="text-button"
          type="button"
          @click="
            mode = mode === 'login' ? 'register' : 'login';
            error = '';
          "
        >
          {{
            mode === "login"
              ? "Need an account? Register"
              : "Already registered? Sign in"
          }}
        </button>
      </template>
      <template v-else>
        <span class="tag">AVATAR CHOICE</span>
        <h2>Hello, {{ user.name }}.</h2>
        <p>Choose your shirt color for this visit.</p>
        <label for="accent">Shirt color</label>
        <select id="accent" v-model="shirtTint">
          <option :value="0xefd6a2">Warm sand</option>
          <option :value="0xaadbc4">Garden mint</option>
          <option :value="0xc3b3e5">Soft lilac</option>
        </select>
        <button type="button" @click="joinRoom">Enter the Lobby</button>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <button class="text-button" type="button" @click="logout">
          Sign out
        </button>
      </template>
    </FloatingPanel>

    <footer>
      <span
        >Vue UI + Phaser room ·
        <a href="/credits.html">Character art credits</a></span
      ><code>v{{ version }} · {{ commit.slice(0, 12) }}</code>
    </footer>
  </main>
</template>
