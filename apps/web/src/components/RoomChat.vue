<script setup lang="ts">
import { computed, ref } from "vue";
import {
  AdvancedChat,
  type ChatModel,
  type MessageModel,
  type User,
} from "@advanced-chat/components";
import type { ChatEvent, DirectMessageEvent, RoomPlayer } from "../realtime";

const props = defineProps<{
  currentUser: { id: string; name: string };
  players: RoomPlayer[];
  messages: ChatEvent[];
  directMessages: DirectMessageEvent[];
  friends: {
    userId: string;
    name: string;
    status: "pending" | "accepted";
    requestedByUserId: string;
    online: boolean;
  }[];
  reactions: Record<string, Record<string, string[]>>;
}>();
const emit = defineEmits<{
  send: [text: string];
  sendDirect: [recipientId: string, text: string];
  requestFriend: [userId: string];
  acceptFriend: [userId: string];
  react: [
    messageId: string,
    emoji: string,
    active: boolean,
    recipientId?: string,
  ];
  refreshSocial: [];
}>();
const activeChatId = ref("room");

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

const roomChat = computed<ChatModel>(() => ({
  id: "room",
  name: "Room conversation",
  users: users.value,
}));
const chats = computed<ChatModel[]>(() => [
  roomChat.value,
  ...props.friends
    .filter((friend) => friend.status === "accepted")
    .map((friend): ChatModel => ({
      id: `direct:${friend.userId}`,
      name: friend.name,
      users: [
        {
          id: friend.userId,
          name: friend.name,
          status: { state: friend.online ? "online" : "offline" },
        },
        {
          id: props.currentUser.id,
          name: props.currentUser.name,
          status: { state: "online" },
        },
      ] as User[],
    })),
]);
const activeChat = computed(
  () =>
    chats.value.find((chat) => chat.id === activeChatId.value) ??
    roomChat.value,
);

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
    status: undefined,
    disableActions: true,
    reactions: props.reactions[message.serverMessageId],
  })),
);
const activeMessages = computed<MessageModel[]>(() => {
  if (activeChatId.value === "room") return chatMessages.value;
  const friendId = activeChatId.value.slice("direct:".length);
  return props.directMessages
    .filter(
      (message) =>
        message.senderId === friendId || message.recipientId === friendId,
    )
    .map((message) => ({
      id: message.serverMessageId,
      sender: users.value.find((user) => user.id === message.senderId) ?? {
        id: message.senderId,
        name: message.senderName,
        status: { state: "offline" },
      },
      content: message.text,
      createdAt: message.timestamp,
      status: message.senderId === props.currentUser.id ? "read" : undefined,
      disableActions: true,
      reactions: props.reactions[message.serverMessageId],
    }));
});

function sendMessage(payload: { content: string; mentionedUsers: User[] }) {
  const text = payload.content
    .replace(/<@([^>]+)>/g, (_token, userId: string) => {
      const mentioned = payload.mentionedUsers.find(
        (candidate) => candidate.id === userId,
      );
      return mentioned ? `@${mentioned.name}` : "@someone";
    })
    .trim();
  if (!text) return;
  if (activeChatId.value === "room") emit("send", text);
  else emit("sendDirect", activeChatId.value.slice("direct:".length), text);
}
function openUser(user: User) {
  if (user.id === props.currentUser.id) return;
  const friend = props.friends.find(
    (candidate) => candidate.userId === user.id,
  );
  if (friend?.status === "accepted") activeChatId.value = `direct:${user.id}`;
  else if (!friend) emit("requestFriend", user.id);
}
function react(payload: { emoji: string; message: MessageModel }) {
  const active = !(payload.message.reactions?.[payload.emoji] ?? []).includes(
    props.currentUser.id,
  );
  emit(
    "react",
    String(payload.message.id),
    payload.emoji,
    active,
    activeChatId.value === "room"
      ? undefined
      : activeChatId.value.slice("direct:".length),
  );
}
</script>

<template>
  <div class="room-chat">
    <AdvancedChat
      :current-user="{ id: currentUser.id }"
      :chats="chats"
      :chat="activeChat"
      :messages="activeMessages"
      :messages-loaded="true"
      :chats-loaded="true"
      :message-actions="[]"
      :selection-actions="[]"
      :show-files="false"
      :show-emojis="true"
      :show-reaction-emojis="true"
      :show-new-messages-divider="false"
      :text-formatting="{ markdown: false, linkify: true }"
      height="min(68dvh, 640px)"
      theme="dark"
      @open-chat="(chat) => (activeChatId = String(chat.id))"
      @click-user-tag="openUser"
      @send-message="sendMessage"
      @send-message-reaction="react"
    />
    <div class="people-list" aria-label="People in this room">
      <div class="people-heading">
        <strong>People here</strong>
        <button type="button" @click="emit('refreshSocial')">Refresh</button>
      </div>
      <div
        v-for="player in players.filter(
          (player) => player.userId !== currentUser.id,
        )"
        :key="player.userId"
      >
        {{ player.name }}
        <button
          v-if="!friends.some((friend) => friend.userId === player.userId)"
          type="button"
          @click="emit('requestFriend', player.userId)"
        >
          Add
        </button>
        <span
          v-else-if="
            friends.find((friend) => friend.userId === player.userId)
              ?.status === 'pending' &&
            friends.find((friend) => friend.userId === player.userId)
              ?.requestedByUserId === currentUser.id
          "
          class="friend-state"
        >
          Request sent
        </span>
        <button
          v-else-if="
            friends.find((friend) => friend.userId === player.userId)
              ?.status === 'pending' &&
            friends.find((friend) => friend.userId === player.userId)
              ?.requestedByUserId !== currentUser.id
          "
          type="button"
          @click="emit('acceptFriend', player.userId)"
        >
          Accept
        </button>
        <button
          v-else-if="
            friends.find((friend) => friend.userId === player.userId)
              ?.status === 'accepted'
          "
          type="button"
          @click="activeChatId = `direct:${player.userId}`"
        >
          Message
        </button>
      </div>
    </div>
  </div>
</template>
