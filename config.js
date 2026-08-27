/* ============================================================
   COMPANY Portal — Central Client Config
   ------------------------------------------------------------
   ⚠️  This file is loaded by the BROWSER. Anything in here is
       PUBLIC — anyone can read it via View-Source / DevTools.

   🔒 The Google / Gemini API key is NO LONGER stored here.
      It was being stolen from the browser. It now lives ONLY
      on the server, as an encrypted Cloudflare Worker secret
      (env.GEMINI_API_KEY), and every module calls Google
      through our own proxy at /api/gemini/* — the key never
      reaches the browser.

      To change the Gemini key, update the GitHub Actions secret
      named GEMINI_API_KEY (Repo → Settings → Secrets and
      variables → Actions) and push to main. Do NOT put it back
      in this file.
   ============================================================ */
window.APP_CONFIG = {
  // Kept empty on purpose — the real key is a server-side secret now.
  GEMINI_API_KEY: ""
};
