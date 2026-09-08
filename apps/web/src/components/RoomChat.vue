<script setup lang="ts">
import { computed } from "vue";
import {
  Chat,
  Layout,
  type ChatModel,
  type MessageModel,
  type User,
} from "@advanced-chat/components";
import type { ChatEvent, RoomPlayer } from "../realtime";

const props = defineProps<{
  currentUser: { id: string; name: string };
  players: RoomPlayer[];
  messages: ChatEvent[];
}>();
const emit = defineEmits<{ send: [text: string] }>();

const users = computed<User[]>(() => {
  const current = new Map<string, User>();
  current.set(props.currentUser.id, {
    id: props.currentUser.id,
    name: props.currentUser.name,
    status: { state: "online" },
  });
  for (const player of props.players) {
    current.set(player.userId, {
      id: player.userId,
      name: player.name,
      status: { state: "online" },
    });
  }
  for (const message of props.messages) {
    if (!current.has(message.senderId)) {
      current.set(message.senderId, {
        id: message.senderId,
        name: message.senderName,
        status: { state: "offline" },
      });
    }
  }
  return [...current.values()];
});

const chat = computed<ChatModel>(() => ({
  id: "floor_0_lobby",
  name: "Lobby conversation",
  users: users.value,
}));

const chatMessages = computed<MessageModel[]>(() =>
  props.messages.map((message) => ({
    id: message.serverMessageId,
    sender:
      users.value.find((candidate) => candidate.id === message.senderId) ??
      ({
        id: message.senderId,
        name: message.senderName,
        status: { state: "offline" },
      } satisfies User),
    content: message.text,
    createdAt: message.timestamp,
    status: "delivered",
    disableActions: true,
    disableReactions: true,
  })),
);

function sendMessage(payload: { content: string }) {
  const text = payload.content.trim();
  if (text) emit("send", text);
}
</script>

<template>
  <div class="room-chat">
    <p class="room-chat-note">
      Messages are live-only. Nothing from before you joined is shown.
    </p>
    <Layout height="380px" theme="dark">
      <Chat
        :current-user="{ id: currentUser.id }"
        :chat="chat"
        :messages="chatMessages"
        :messages-loaded="true"
        :message-actions="[]"
        :selection-actions="[]"
        :show-files="false"
        :show-emojis="true"
        :show-reaction-emojis="true"
        :show-new-messages-divider="false"
        :text-formatting="{ markdown: false, linkify: true }"
        standalone
        @send-message="sendMessage"
      />
    </Layout>
  </div>
</template>
