import { createApp } from "vue";
import { AdvancedChatPlugin } from "@advanced-chat/components";
import "@advanced-chat/components/styles";
import App from "./App.vue";
import "./style.css";
createApp(App)
  .use(
    AdvancedChatPlugin({
      strings: {
        "chat.message.placeholder": "Say hello…",
        "chat.messages.empty": "No messages yet.",
      },
    }),
  )
  .mount("#app");
