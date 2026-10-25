"use client";

import type { QueuedChange } from "@/app/actions";

/**
 * Offline write queue kept in localStorage. Each change has a client UUID so the
 * API can apply it idempotently; replays never create duplicates.
 */
const KEY = "educloud-sync-queue";
export const QUEUE_EVENT = "educloud-queue-changed";

export function readQueue(): QueuedChange[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as QueuedChange[];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedChange[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(queue));
  } catch {}
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function enqueue(changes: Omit<QueuedChange, "client_updated_at">[]) {
  const now = new Date().toISOString();
  const byId = new Map(readQueue().map((c) => [c.id, c]));
  for (const change of changes) byId.set(change.id, { ...change, client_updated_at: now });
  writeQueue([...byId.values()]);
}

export function removeFromQueue(ids: string[]) {
  const done = new Set(ids);
  writeQueue(readQueue().filter((c) => !done.has(c.id)));
}

/**
 * Stable id for "this student's attendance in this session", so re-marking the same
 * student offline replaces the queued change instead of adding another.
 */
export function attendanceChangeId(sessionId: string, studentId: number) {
  const hex = sessionId.replace(/-/g, "").slice(0, 20) + studentId.toString(16).padStart(12, "0").slice(-12);
  return hex.replace(
    /^(.{8})(.{4})(.{4})(.{4})(.{12})$/,
    "$1-$2-$3-$4-$5",
  );
}
