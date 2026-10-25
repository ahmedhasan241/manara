"use server";

import type { ChatMessage, MessagingKey } from "@educloud/api-client";
import { serverClient } from "@educloud/api-client/server";
import { getT } from "@educloud/ui/locale";
import { attempt } from "../action-result";

/**
 * Thin server actions for the messenger. Everything passed here is already
 * encrypted in the browser; these only relay ciphertext with the session token.
 */

async function api() {
  return serverClient();
}

export async function fetchMessagingKey() {
  return (await api()).messagingKey();
}

export async function saveMessagingKey(key: MessagingKey & { reset?: boolean }) {
  const t = await getT();
  return attempt(async (client) => (await client.saveMessagingKey(key)).data, { message: key.reset ? t("New messaging key created.") : t("Secure messaging is ready.") });
}

export async function fetchConversations() {
  return (await api()).conversations();
}

export async function fetchContacts() {
  return (await api()).contacts();
}

export async function startDirectConversation(userId: number) {
  const t = await getT();
  return attempt((client) => client.startConversation({ type: "direct", user_id: userId }), { message: t("Conversation started.") });
}

export async function startGroupConversation(title: string, userIds: number[]) {
  const t = await getT();
  return attempt((client) => client.startConversation({ type: "group", title, user_ids: userIds }), { message: t("Group created.") });
}

export async function fetchMessages(conversationId: string, params: { before?: string; since?: string; limit?: number } = {}) {
  return (await api()).messages(conversationId, params);
}

/** Sending is shown by the message appearing in the thread, so there is no success text. */
export async function sendEncryptedMessage(conversationId: string, message: Pick<ChatMessage, "id" | "ciphertext" | "nonce" | "keys">) {
  return attempt((client) => client.sendMessage(conversationId, message));
}

export async function markConversationRead(conversationId: string) {
  try {
    await (await api()).markConversationRead(conversationId);
  } catch {
    // Read receipts are best effort.
  }
}

export async function setConversationNotifications(conversationId: string, notify: "all" | "none") {
  const t = await getT();
  return attempt((client) => client.conversationSettings(conversationId, { notify }), { message: notify === "none" ? t("Alerts muted for this conversation.") : t("Alerts turned on for this conversation.") });
}
