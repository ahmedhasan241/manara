/**
 * Server-rendered on purpose (no "use client"): React only warns about <script>
 * elements it renders on the client; this one is part of the server HTML and runs
 * before the page paints.
 */
export const MODE_KEY = "educloud-theme";

/** Applies the saved light/dark mode before first paint so pages never flash. */
export function ThemeScript() {
  const code = `try{var t=localStorage.getItem("${MODE_KEY}")||"system";if(t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
  return (
    // eslint-disable-next-line react/no-danger
    <script id="educloud-theme" dangerouslySetInnerHTML={{ __html: code }} />
  );
}
