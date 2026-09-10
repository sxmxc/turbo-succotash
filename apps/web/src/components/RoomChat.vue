<script setup lang="ts">
import { computed, ref, watch } from "vue";
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
  messageStatuses: Record<string, "sent" | "delivered" | "read">;
  typingByChat: Record<string, { id: string; name: string }[]>;
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
  typing: [active: boolean, recipientId?: string];
  markRead: [messageId: string, senderId: string];
}>();
const activeChatId = ref("room");
const showPeople = ref(false);
const unreadCounts = ref<Record<string, number>>({});
const seenMessageIds = new Set<string>();
const markedReadIds = new Set<string>();
let typingChatId: string | undefined;

function friendChatId(message: DirectMessageEvent) {
  const userId =
    message.senderId === props.currentUser.id
      ? message.recipientId
      : message.senderId;
  return `direct:${userId}`;
}
function markDirectRead(friendId: string) {
  for (const message of props.directMessages) {
    if (
      message.senderId === friendId &&
      message.recipientId === props.currentUser.id &&
      !message.readAt &&
      !markedReadIds.has(message.serverMessageId)
    ) {
      markedReadIds.add(message.serverMessageId);
      emit("markRead", message.serverMessageId, message.senderId);
    }
  }
}
function openChat(chat: ChatModel) {
  const nextId = String(chat.id);
  if (typingChatId) {
    emit(
      "typing",
      false,
      typingChatId === "room" ? undefined : typingChatId.slice(7),
    );
    typingChatId = undefined;
  }
  activeChatId.value = nextId;
  unreadCounts.value = { ...unreadCounts.value, [nextId]: 0 };
  if (nextId.startsWith("direct:")) markDirectRead(nextId.slice(7));
}
function typingMessage(value: string) {
  const active = Boolean(value.trim());
  if (active && typingChatId === activeChatId.value) return;
  if (!active && typingChatId !== activeChatId.value) return;
  typingChatId = active ? activeChatId.value : undefined;
  emit(
    "typing",
    active,
    activeChatId.value === "room" ? undefined : activeChatId.value.slice(7),
  );
}

watch(
  () => props.messages.at(-1),
  (message) => {
    if (!message || seenMessageIds.has(message.serverMessageId)) return;
    seenMessageIds.add(message.serverMessageId);
    if (
      message.senderId !== props.currentUser.id &&
      activeChatId.value !== "room"
    )
      unreadCounts.value = {
        ...unreadCounts.value,
        room: (unreadCounts.value.room ?? 0) + 1,
      };
  },
);
watch(
  () => props.directMessages,
  (messages) => {
    const next = { ...unreadCounts.value };
    for (const message of messages) {
      if (seenMessageIds.has(message.serverMessageId)) continue;
      seenMessageIds.add(message.serverMessageId);
      if (message.senderId === props.currentUser.id || message.readAt) continue;
      const chatId = friendChatId(message);
      if (activeChatId.value === chatId) markDirectRead(message.senderId);
      else next[chatId] = (next[chatId] ?? 0) + 1;
    }
    unreadCounts.value = next;
  },
  { immediate: true },
);

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
  for (const friend of props.friends) {
    current.set(friend.userId, {
      id: friend.userId,
      name: friend.name,
      status: { state: friend.online ? "online" : "offline" },
    });
  }
  return [...current.values()];
});

function messageUser(id: string, name: string): User {
  return (
    users.value.find((candidate) => candidate.id === id) ?? {
      id,
      name,
      status: { state: "offline" },
    }
  );
}
function roomMessage(message: ChatEvent): MessageModel {
  return {
    id: message.serverMessageId,
    sender: messageUser(message.senderId, message.senderName),
    content: message.text,
    createdAt: message.timestamp,
    disableActions: true,
    reactions: props.reactions[message.serverMessageId],
  };
}
function directMessage(message: DirectMessageEvent): MessageModel {
  return {
    id: message.serverMessageId,
    sender: messageUser(message.senderId, message.senderName),
    content: message.text,
    createdAt: message.timestamp,
    status:
      message.senderId === props.currentUser.id
        ? (props.messageStatuses[message.serverMessageId] ?? "sent")
        : undefined,
    disableActions: true,
    reactions: props.reactions[message.serverMessageId],
  };
}

const roomChat = computed<ChatModel>(() => ({
  id: "room",
  name: "Current Room Chat",
  users: users.value,
  unreadCount: unreadCounts.value.room,
  lastMessage: props.messages.length
    ? roomMessage(props.messages.at(-1)!)
    : undefined,
  typingUsers: props.typingByChat.room,
}));
const chats = computed<ChatModel[]>(() => [
  roomChat.value,
  ...props.friends
    .filter((friend) => friend.status === "accepted")
    .map((friend): ChatModel => {
      const chatId = `direct:${friend.userId}`;
      const latest = props.directMessages
        .filter((message) => friendChatId(message) === chatId)
        .at(-1);
      return {
        id: chatId,
        name: friend.name,
        users: [
          messageUser(friend.userId, friend.name),
          messageUser(props.currentUser.id, props.currentUser.name),
        ],
        unreadCount: unreadCounts.value[chatId],
        lastMessage: latest ? directMessage(latest) : undefined,
        typingUsers: props.typingByChat[chatId],
      };
    }),
]);
const activeChat = computed(
  () =>
    chats.value.find((chat) => chat.id === activeChatId.value) ??
    roomChat.value,
);

const chatMessages = computed<MessageModel[]>(() =>
  props.messages.map(roomMessage),
);
const activeMessages = computed<MessageModel[]>(() => {
  if (activeChatId.value === "room") return chatMessages.value;
  const friendId = activeChatId.value.slice("direct:".length);
  return props.directMessages
    .filter(
      (message) =>
        message.senderId === friendId || message.recipientId === friendId,
    )
    .map(directMessage);
});
const otherPlayers = computed(() =>
  props.players.filter((player) => player.userId !== props.currentUser.id),
);
const incomingRequests = computed(() =>
  props.friends.filter(
    (friend) =>
      friend.status === "pending" &&
      friend.requestedByUserId !== props.currentUser.id,
  ),
);
const acceptedFriends = computed(() =>
  props.friends.filter((friend) => friend.status === "accepted"),
);
function friendFor(userId: string) {
  return props.friends.find((friend) => friend.userId === userId);
}
function openDirect(userId: string) {
  const chat = chats.value.find(
    (candidate) => candidate.id === `direct:${userId}`,
  );
  if (chat) openChat(chat);
  showPeople.value = false;
}

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
  typingMessage("");
}
function openUser(user: User) {
  if (user.id === props.currentUser.id) return;
  const friend = props.friends.find(
    (candidate) => candidate.userId === user.id,
  );
  if (friend?.status === "accepted")
    openChat(chats.value.find((chat) => chat.id === `direct:${user.id}`)!);
  else showPeople.value = true;
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
      :show-new-messages-divider="true"
      :text-formatting="{ markdown: false, linkify: true }"
      height="min(68dvh, 640px)"
      theme="dark"
      @open-chat="openChat"
      @add-chat="showPeople = true"
      @click-user-tag="openUser"
      @send-message="sendMessage"
      @send-message-reaction="react"
      @typing-message="typingMessage"
    />
    <button
      class="people-list people-launch"
      type="button"
      aria-haspopup="dialog"
      @click="showPeople = true"
    >
      <strong>Friends & people</strong>
      <span v-if="incomingRequests.length" class="people-badge">
        {{ incomingRequests.length }} request<span
          v-if="incomingRequests.length !== 1"
          >s</span
        >
      </span>
      <span v-else>{{ otherPlayers.length }} nearby</span>
    </button>
    <section
      v-if="showPeople"
      class="people-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="people-dialog-title"
      @keydown.esc="showPeople = false"
    >
      <header class="people-dialog-header">
        <h2 id="people-dialog-title">Friends & people</h2>
        <button
          type="button"
          aria-label="Close friends and people"
          @click="showPeople = false"
        >
          ×
        </button>
      </header>
      <div class="people-dialog-actions">
        <p>
          Add players who are in this room, accept requests, or open a direct
          message.
        </p>
        <button type="button" @click="emit('refreshSocial')">Refresh</button>
      </div>
      <h3 v-if="incomingRequests.length">Friend requests</h3>
      <div
        v-for="friend in incomingRequests"
        :key="`request:${friend.userId}`"
        class="person-row"
      >
        <span
          ><strong>{{ friend.name }}</strong
          ><small> wants to be friends</small></span
        >
        <button type="button" @click="emit('acceptFriend', friend.userId)">
          Accept
        </button>
      </div>
      <h3>People in this room</h3>
      <p v-if="!otherPlayers.length" class="people-empty">
        No other players are here right now.
      </p>
      <div
        v-for="player in otherPlayers"
        :key="player.userId"
        class="person-row"
      >
        <span><i class="online-dot" />{{ player.name }}</span>
        <button
          v-if="!friendFor(player.userId)"
          type="button"
          @click="emit('requestFriend', player.userId)"
        >
          Add friend
        </button>
        <span
          v-else-if="
            friendFor(player.userId)?.status === 'pending' &&
            friendFor(player.userId)?.requestedByUserId === currentUser.id
          "
          class="friend-state"
          >Request sent</span
        >
        <button
          v-else-if="friendFor(player.userId)?.status === 'pending'"
          type="button"
          @click="emit('acceptFriend', player.userId)"
        >
          Accept
        </button>
        <button v-else type="button" @click="openDirect(player.userId)">
          Message
        </button>
      </div>
      <h3 v-if="acceptedFriends.length">Friends</h3>
      <div
        v-for="friend in acceptedFriends"
        :key="`friend:${friend.userId}`"
        class="person-row"
      >
        <span
          ><i :class="['online-dot', { offline: !friend.online }]" />{{
            friend.name
          }}</span
        >
        <button type="button" @click="openDirect(friend.userId)">
          Message
        </button>
      </div>
    </section>
  </div>
</template>
