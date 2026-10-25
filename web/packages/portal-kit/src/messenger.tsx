"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ChatMessage, Contact, Conversation, MessagingKey } from "@educloud/api-client";
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Select, Textarea, asKey, cn, toast, useActionToast, useFormat, useT } from "@educloud/ui";
import {
  fetchContacts,
  fetchConversations,
  fetchMessages,
  fetchMessagingKey,
  markConversationRead,
  saveMessagingKey,
  sendEncryptedMessage,
  setConversationNotifications,
  startDirectConversation,
  startGroupConversation,
} from "./actions/messages";
import { createKeys, decryptMessage, encryptMessage, forgetLocalKeys, loadLocalKeys, restoreKeys, saveLocalKeys, type KeyPair } from "./e2e";
import { getEcho } from "./echo";

type Me = { id: number; name: string };
const SYNC_INTERVAL_MS = 60_000;

/**
 * Entry point: makes sure this device holds the user's key pair, then shows chat.
 */
export function Messenger({ me, canCreateGroups }: { me: Me; canCreateGroups: boolean }) {
  const t = useT();
  const [backup, setBackup] = useState<MessagingKey | null | undefined>(undefined);
  const [keys, setKeys] = useState<KeyPair | null>(null);

  useEffect(() => {
    fetchMessagingKey().then(async (key) => {
      setBackup(key);
      if (key) setKeys(await loadLocalKeys(me.id, key.public_key));
    });
  }, [me.id]);

  if (backup === undefined) return <p className="text-sm text-ink-muted">{t("Loading secure messaging…")}</p>;
  if (!keys) {
    return (
      <PassphraseGate
        me={me}
        backup={backup}
        onReady={async (pair, newBackup) => {
          await saveLocalKeys(me.id, pair);
          if (newBackup) setBackup(newBackup);
          setKeys(pair);
        }}
      />
    );
  }
  return <Chat me={me} keys={keys} backup={backup!} canCreateGroups={canCreateGroups} />;
}

/**
 * First use: choose a passphrase that protects the key backup.
 * New device: enter it to restore the key and the full message history.
 */
function PassphraseGate({ me, backup, onReady }: { me: Me; backup: MessagingKey | null; onReady: (pair: KeyPair, backup?: MessagingKey) => void }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);
  const creating = !backup || confirmReset;

  function submit(form: FormData) {
    const passphrase = String(form.get("passphrase"));
    setError(null);
    start(async () => {
      if (creating) {
        if (passphrase.length < 10) return setError(t("Use at least 10 characters."));
        if (passphrase !== form.get("confirm")) return setError(t("The passphrases don't match."));
        const { pair, backup: newBackup } = await createKeys(passphrase);
        const saved = await saveMessagingKey({ ...newBackup, reset: confirmReset });
        if (!saved.ok) return setError(saved.error || t("Could not save your key."));
        toast.success(saved.message ?? t("Secure messaging is ready."));
        forgetLocalKeys(me.id);
        onReady(pair, newBackup);
        return;
      }
      try {
        onReady(await restoreKeys(backup!, passphrase));
      } catch {
        setError(t("That passphrase is not correct."));
      }
    });
  }

  return (
    <Card className="max-w-lg">
      <h2 className="text-lg font-semibold">{creating ? t("Set up secure messaging") : t("Unlock your messages")}</h2>
      <p className="mt-2 text-sm text-ink-muted">
        {creating
          ? t("Choose a messaging passphrase. It encrypts your private key before it is backed up, so you can read your history on any device. We can't recover it if you forget it.")
          : t("Enter your messaging passphrase to restore your encrypted history on this device.")}
      </p>
      {confirmReset && (
        <div className="mt-3">
          <Alert tone="warning">{t("Resetting creates a new key. Messages sent to your old key can no longer be read.")}</Alert>
        </div>
      )}
      <form action={submit} className="mt-4 space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label={t("Messaging passphrase")} htmlFor="passphrase">
          <Input id="passphrase" name="passphrase" type="password" autoComplete={creating ? "new-password" : "current-password"} required />
        </Field>
        {creating && (
          <Field label={t("Repeat passphrase")} htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
          </Field>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? t("Working…") : creating ? t("Create my key") : t("Unlock")}
          </Button>
          {backup && !confirmReset && (
            <Button type="button" variant="ghost" onClick={() => setConfirmReset(true)}>
              {t("I forgot my passphrase")}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

function Chat({ me, keys, backup, canCreateGroups }: { me: Me; keys: KeyPair; backup: MessagingKey; canCreateGroups: boolean }) {
  const fmt = useFormat();
  const t = useT();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});
  const [plain, setPlain] = useState<Record<string, string | null>>({});
  const [composing, setComposing] = useState(false);
  const [live, setLive] = useState(false);
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const refreshConversations = useCallback(async () => setConversations(await fetchConversations()), []);

  const addMessages = useCallback(
    async (incoming: ChatMessage[]) => {
      if (incoming.length === 0) return;
      const texts = await Promise.all(incoming.map(async (m) => [m.id, await decryptMessage(m, me.id, keys)] as const));
      setPlain((p) => ({ ...p, ...Object.fromEntries(texts) }));
      setMessages((all) => {
        const next = { ...all };
        for (const m of incoming) {
          const list = next[m.conversation_id] ?? [];
          if (!list.some((x) => x.id === m.id)) next[m.conversation_id] = [...list, m].sort((a, b) => a.created_at.localeCompare(b.created_at));
        }
        return next;
      });
    },
    [keys, me.id],
  );

  const syncConversation = useCallback(
    async (id: string) => {
      const known = messages[id];
      const since = known?.length ? known[known.length - 1]!.created_at : undefined;
      await addMessages(await fetchMessages(id, since ? { since } : {}));
    },
    [addMessages, messages],
  );

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Live delivery over Reverb, plus a periodic catch-up so nothing is missed
  // while the socket was down.
  useEffect(() => {
    const echo = getEcho();
    const channel = echo?.private(`users.${me.id}`);
    channel?.listen(".message.sent", (m: ChatMessage) => {
      addMessages([m]);
      refreshConversations();
      if (activeRef.current === m.conversation_id) markConversationRead(m.conversation_id);
    });
    const connection = echo?.connector.pusher.connection;
    const onState = () => setLive(connection?.state === "connected");
    connection?.bind("state_change", onState);
    onState();

    const timer = setInterval(() => {
      refreshConversations();
      if (activeRef.current) syncConversation(activeRef.current);
    }, SYNC_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      channel?.stopListening(".message.sent");
      connection?.unbind("state_change", onState);
    };
  }, [addMessages, me.id, refreshConversations, syncConversation]);

  async function open(id: string) {
    setActiveId(id);
    setComposing(false);
    await syncConversation(id);
    await markConversationRead(id);
    setConversations((list) => list.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
  }

  const active = conversations.find((c) => c.id === activeId) ?? null;

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
      <div className={cn("space-y-3", activeId && "hidden md:block")}>
        <div className="flex items-center justify-between gap-2">
          <Badge tone={live ? "success" : "neutral"}>{live ? t("Live") : t("Syncing every minute")}</Badge>
          <Button size="sm" onClick={() => { setComposing(true); setActiveId(null); }}>
            {t("New message")}
          </Button>
        </div>
        {conversations.length === 0 ? (
          <EmptyState title={t("No conversations yet")} />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => open(c.id)}
                  aria-current={c.id === activeId ? "true" : undefined}
                  className={cn("flex w-full items-center justify-between gap-2 px-4 py-3 text-start hover:bg-surface-2", c.id === activeId && "bg-surface-2")}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{conversationName(c, me.id)}</span>
                    <span className="block text-xs text-ink-muted">{c.last_message_at ? fmt.dateTime(c.last_message_at) : t("No messages yet")}</span>
                  </span>
                  {c.unread > 0 && <Badge tone="brand">{c.unread}</Badge>}
                </button>
              </li>
            ))}
          </ul>
        )}
        <BackupCard backup={backup} conversations={conversations} />
      </div>

      <div className={cn(!activeId && !composing && "hidden md:block")}>
        {composing ? (
          <NewConversation
            canCreateGroups={canCreateGroups}
            onCancel={() => setComposing(false)}
            onCreated={async (c) => {
              await refreshConversations();
              open(c.id);
            }}
          />
        ) : active ? (
          <Thread
            me={me}
            conversation={active}
            messages={messages[active.id] ?? []}
            plain={plain}
            onBack={() => setActiveId(null)}
            onSent={(m) => {
              addMessages([m]);
              refreshConversations();
            }}
          />
        ) : (
          <EmptyState title={t("Choose a conversation")} description={t("Or start a new one.")} />
        )}
      </div>
    </div>
  );
}

function conversationName(c: Conversation, myId: number) {
  return c.title ?? c.participants.filter((p) => p.id !== myId).map((p) => p.name).join(", ");
}

function Thread({
  me,
  conversation,
  messages,
  plain,
  onBack,
  onSent,
}: {
  me: Me;
  conversation: Conversation;
  messages: ChatMessage[];
  plain: Record<string, string | null>;
  onBack: () => void;
  onSent: (m: ChatMessage) => void;
}) {
  const fmt = useFormat();
  const t = useT();
  const [text, setText] = useState("");
  const [notify, setNotify] = useState(conversation.notify);
  const report = useActionToast();
  const [sending, start] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);
  const names = useMemo(() => Object.fromEntries(conversation.participants.map((p) => [p.id, p.name])), [conversation.participants]);
  const withoutKeys = conversation.participants.filter((p) => !p.public_key && p.id !== me.id);

  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollIntoView, which React would treat as a cleanup.
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  function send() {
    const body = text.trim();
    if (!body) return;
    start(async () => {
      const recipients = conversation.participants.filter((p): p is typeof p & { public_key: string } => !!p.public_key);
      const encrypted = await encryptMessage(body, recipients);
      const result = await sendEncryptedMessage(conversation.id, encrypted);
      if (!result.ok || !result.data) {
        toast.error(result.ok ? t("Could not send.") : result.error || t("Could not send."));
        return;
      }
      setText("");
      onSent(result.data);
    });
  }

  return (
    <Card className="flex h-[70dvh] flex-col p-0">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button size="sm" variant="ghost" className="md:hidden" onClick={onBack} aria-label={t("Back to conversations")}>
            ←
          </Button>
          <h2 className="truncate font-semibold">{conversationName(conversation, me.id)}</h2>
        </div>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          {t("Alerts")}
          <Select
            className="h-8 w-24"
            value={notify}
            onChange={(e) => {
              const value = e.target.value as "all" | "none";
              setNotify(value);
              setConversationNotifications(conversation.id, value).then((result) => {
                if (!report(result)) setNotify(value === "all" ? "none" : "all");
              });
            }}
          >
            <option value="all">{t("On")}</option>
            <option value="none">{t("Muted")}</option>
          </Select>
        </label>
      </div>

      <ol className="flex-1 space-y-2 overflow-y-auto p-4" aria-live="polite">
        {messages.length === 0 && <li className="text-center text-sm text-ink-muted">{t("Say hello. Messages are end-to-end encrypted.")}</li>}
        {messages.map((m) => {
          const mine = m.sender_id === me.id;
          const textValue = plain[m.id];
          return (
            <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", mine ? "bg-brand-600 text-white" : "bg-surface-2")}>
                {!mine && conversation.type === "group" && <p className="text-xs font-medium opacity-80">{names[m.sender_id ?? 0] ?? t("Former member")}</p>}
                <p className="whitespace-pre-wrap break-words">{textValue ?? <em className="opacity-70">{t("Can't be decrypted on this key")}</em>}</p>
                <p className="mt-1 text-[10px] opacity-70">{fmt.time(m.created_at)}</p>
              </div>
            </li>
          );
        })}
        <div ref={bottom} />
      </ol>

      <div className="space-y-2 border-t border-line p-3">
        {withoutKeys.length > 0 && (
          <p className="text-xs text-warning">{t("{names} hasn't set up secure messaging yet and won't be able to read new messages.", { names: withoutKeys.map((p) => p.name).join(", ") })}</p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <Textarea
            aria-label={t("Message")}
            rows={1}
            className="min-h-10 flex-1 resize-none"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={t("Write a message")}
          />
          <Button type="submit" disabled={sending || !text.trim()}>
            {t("Send")}
          </Button>
        </form>
      </div>
    </Card>
  );
}

function NewConversation({ canCreateGroups, onCancel, onCreated }: { canCreateGroups: boolean; onCancel: () => void; onCreated: (c: Conversation) => void }) {
  const t = useT();
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    fetchContacts().then(setContacts);
  }, []);

  function create(form: FormData) {
    setError(null);
    start(async () => {
      const result =
        selected.length === 1
          ? await startDirectConversation(selected[0]!)
          : await startGroupConversation(String(form.get("title") || "Group"), selected);
      if (!result.ok || !result.data) return setError(result.ok ? t("Could not start the conversation.") : result.error || t("Could not start the conversation."));
      toast.success(result.message ?? t("Conversation started."));
      onCreated(result.data);
    });
  }

  return (
    <Card>
      <h2 className="mb-3 font-semibold">{t("New message")}</h2>
      <form action={create} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {contacts === null ? (
          <p className="text-sm text-ink-muted">{t("Loading people…")}</p>
        ) : (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">{canCreateGroups ? t("Choose one or more people") : t("Choose a teacher or staff member")}</legend>
            <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {contacts.map((c) => (
                <li key={c.id}>
                  <label className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type={canCreateGroups ? "checkbox" : "radio"}
                        name="contact"
                        checked={selected.includes(c.id)}
                        onChange={(e) => setSelected((s) => (canCreateGroups ? (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)) : [c.id]))}
                      />
                      {c.name}
                    </span>
                    <span className="flex gap-1">
                      <Badge>{t(asKey(c.role))}</Badge>
                      {!c.has_key && <Badge tone="warning">{t("no key yet")}</Badge>}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </fieldset>
        )}
        {selected.length > 1 && (
          <Field label={t("Group name")} htmlFor="title">
            <Input id="title" name="title" required />
          </Field>
        )}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending || selected.length === 0}>
            {t("Start conversation")}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t("Cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

async function fullHistory(conversationId: string) {
  const all: ChatMessage[] = [];
  let before: string | undefined;
  for (;;) {
    const page = await fetchMessages(conversationId, { before, limit: 200 });
    all.push(...page);
    if (page.length < 200) return all.reverse();
    before = page[page.length - 1]!.created_at;
  }
}

/**
 * History already lives on the server as ciphertext and syncs to every device.
 * This adds an offline copy: still encrypted, readable only with the passphrase.
 */
function BackupCard({ backup, conversations }: { backup: MessagingKey; conversations: Conversation[] }) {
  const t = useT();
  const [pending, start] = useTransition();

  function download() {
    start(async () => {
      const history = await Promise.all(
        conversations.map(async (c) => ({ id: c.id, title: c.title, participants: c.participants.map((p) => p.name), messages: await fullHistory(c.id) })),
      );
      const blob = new Blob([JSON.stringify({ format: "educloud-chat-backup", version: 1, exported_at: new Date().toISOString(), key: backup, conversations: history }, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: `educloud-chat-backup-${new Date().toISOString().slice(0, 10)}.json` });
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <Card className="p-4 text-sm">
      <p className="font-medium">{t("Backup")}</p>
      <p className="mt-1 text-ink-muted">{t("Your encrypted history is stored in the cloud and syncs to all your devices. You can also keep an encrypted copy.")}</p>
      <Button size="sm" variant="secondary" className="mt-3" onClick={download} disabled={pending}>
        {pending ? t("Preparing…") : t("Download encrypted backup")}
      </Button>
    </Card>
  );
}
