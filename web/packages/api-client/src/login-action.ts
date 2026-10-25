import { ApiError, type User } from "./index";
import { serverClient, setSession } from "./server";

export interface LoginStepState {
  step: "password" | "mfa";
  challenge?: string;
  error?: string;
  email?: string;
}

/**
 * Shared body of the login server action used by the admin and portal apps.
 * Returns the next form state, or the signed-in user once a token is stored.
 */
export async function performLogin(
  state: LoginStepState,
  form: FormData,
): Promise<{ state: LoginStepState; user?: User }> {
  const api = await serverClient();

  try {
    if (state.step === "mfa") {
      const result = await api.verifyMfa(String(form.get("challenge") ?? ""), String(form.get("code") ?? ""));
      await setSession(result.token, result.user.memberships?.[0]?.tenant.slug);
      return { state, user: result.user };
    }

    const email = String(form.get("email") ?? "");
    const result = await api.login(email, String(form.get("password") ?? ""), "web");
    if (result.mfa_required) {
      return { state: { step: "mfa", challenge: result.challenge, email } };
    }
    await setSession(result.token, result.user.memberships?.[0]?.tenant.slug);
    return { state, user: result.user };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? (Object.values(error.errors)[0]?.[0] ?? error.message)
        : await offlineMessage();
    return { state: { ...state, error: message } };
  }
}

const OFFLINE: Record<string, string> = {
  ar: "تعذّر الوصول إلى الخادم. حاول مرة أخرى.",
  en: "We couldn't reach the server. Please try again.",
  fr: "Impossible de joindre le serveur. Réessayez.",
  es: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
  pt: "Não foi possível conectar ao servidor. Tente novamente.",
  zh: "无法连接服务器，请重试。",
};

async function offlineMessage() {
  const { cookies } = await import("next/headers");
  return OFFLINE[(await cookies()).get("locale")?.value ?? "ar"] ?? OFFLINE.ar!;
}
