"use client";

import Echo from "laravel-echo";
import Pusher from "pusher-js";

/**
 * One shared Reverb (WebSocket) connection per tab. Private channel auth goes
 * through /api/broadcasting/auth, which adds the httpOnly session token.
 */
let echo: Echo<"reverb"> | null = null;

export function getEcho(): Echo<"reverb"> | null {
  if (typeof window === "undefined" || !process.env.NEXT_PUBLIC_REVERB_KEY) return null;
  if (echo) return echo;

  (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;
  const secure = process.env.NEXT_PUBLIC_REVERB_SCHEME === "https";
  echo = new Echo({
    broadcaster: "reverb",
    key: process.env.NEXT_PUBLIC_REVERB_KEY,
    wsHost: process.env.NEXT_PUBLIC_REVERB_HOST ?? window.location.hostname,
    wsPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 8080),
    wssPort: Number(process.env.NEXT_PUBLIC_REVERB_PORT ?? 443),
    forceTLS: secure,
    enabledTransports: ["ws", "wss"],
    authEndpoint: "/api/broadcasting/auth",
  });
  return echo;
}
