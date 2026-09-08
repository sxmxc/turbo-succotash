<script setup lang="ts">
import { onMounted, ref } from "vue";
import RoomCanvas from "./components/RoomCanvas.vue";
import FloatingPanel from "./components/FloatingPanel.vue";
import {
  connectLobby,
  type ChatEvent,
  type RoomConnection,
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
const connectionStatus = ref<"offline" | "connecting" | "connected" | "failed">(
  "offline",
);
const messages = ref<ChatEvent[]>([]);
const bubbles = ref<Record<string, string>>({});
const chatText = ref("");
const version = __BUILD_VERSION__;
const commit = __BUILD_COMMIT__;

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
    BETA_KEY_REQUIRED: "A beta key is required while registration is gated.",
    BETA_KEY_INVALID: "That beta key is invalid, revoked, or already used.",
    EMAIL_IN_USE: "An account already uses that email.",
    RATE_LIMITED: "Too many attempts. Please wait a minute.",
    INVALID_SIGNUP: "Check your name, email, and password.",
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
  connectionStatus.value = "connecting";
  error.value = "";
  try {
    connection.value = await connectLobby(
      shirtTint.value,
      (next) => (players.value = next),
      receiveChat,
    );
    connectionStatus.value = "connected";
  } catch (caught) {
    connectionStatus.value = "failed";
    error.value =
      caught instanceof Error ? caught.message : "Could not join the room.";
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
function sendChat() {
  const text = chatText.value.trim();
  if (!text || !connection.value) return;
  connection.value.sendChat(text);
  chatText.value = "";
}
async function logout() {
  await connection.value?.leave();
  connection.value = undefined;
  players.value = [];
  messages.value = [];
  bubbles.value = {};
  connectionStatus.value = "offline";
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
        ><span class="brand-mark">▦</span> Social Room
        <span class="tag">WORKING TITLE</span></a
      ><span class="milestone">Milestone 1 <i /> {{ connectionStatus }}</span>
    </header>

    <section class="intro">
      <p class="eyebrow">THE LOBBY</p>
      <h1>A little room.<br />A shared beginning.</h1>
      <p v-if="user">
        Signed in as {{ user.name }}. Choose an avatar color, then join.
      </p>
      <p v-else>Sign in to enter the shared room.</p>
    </section>

    <template v-if="user && connection">
      <div class="room-frame">
        <div class="room-label">
          <span>01 / LOBBY · DEVELOPMENT CAPACITY 20</span
          ><span>{{
            failed
              ? "Assets failed to load"
              : ready
                ? `${players.length} online now`
                : "Loading…"
          }}</span>
        </div>
        <p v-if="failed" class="room-status" role="alert">
          Character assets failed to load. Reload to retry.
        </p>
        <p v-else-if="ready" class="room-status" role="status">Scene ready</p>
        <RoomCanvas
          :players="players"
          :local-session-id="connection.sessionId"
          :bubbles="bubbles"
          @ready="ready = true"
          @error="failed = true"
          @move="(dx, dy) => connection?.sendMove(dx, dy)"
          @move-to="(x, y) => connection?.moveTo(x, y)"
        />
        <div class="room-caption">ARROW KEYS / WASD · CLICK OR TAP TO MOVE</div>
      </div>
      <FloatingPanel>
        <span class="tag">LIVE ROOM CHAT</span>
        <h2>Lobby conversation</h2>
        <ol class="chat-log" aria-live="polite">
          <li v-if="!messages.length" class="small">
            Messages are live-only. Nothing from before you joined is shown.
          </li>
          <li v-for="message in messages" :key="message.serverMessageId">
            <strong>{{ message.senderName }}</strong>
            <span>{{ message.text }}</span>
          </li>
        </ol>
        <form class="chat-form" @submit.prevent="sendChat">
          <!-- <label for="chat">Message the room</label> -->
          <input
            id="chat"
            v-model="chatText"
            maxlength="280"
            autocomplete="off"
            placeholder="Say hello…"
          />
          <button type="submit">Send</button>
        </form>
        <button class="text-button" type="button" @click="logout">
          Sign out
        </button>
      </FloatingPanel>
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
