(() => {
 if (window.affinitySessionGuard) return;
 const script = document.querySelector('script[data-session-portal]');
 const portal = script?.dataset.sessionPortal;
 const logins = {agent:'/agentes/login',admin:'/admin/login',affiliate:'/afiliados/login',assistant:'/assistentes/login'};
 const login = logins[portal];
 if (!login) return;
 window.affinitySessionGuard = true;
 let checking = false, redirecting = false, expiresAt = null, lastCheck = 0, expirationTimer;

 function returnToLogin() {
  if (redirecting) return;
  redirecting = true;
  if (portal === 'assistant' && window.top && window.top !== window) {
   try { window.top.location.replace(login); return; } catch {}
  }
  location.replace(login);
 }
 async function check() {
  if (checking || redirecting || document.visibilityState === 'hidden') return;
  if (Date.now() - lastCheck < 10000 && (!expiresAt || Date.now() < expiresAt)) return;
  checking = true;
  lastCheck = Date.now();
  try {
   const response = await fetch('/api/portal/session-status?portal=' + portal, {
    credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)
   });
   if (response.status !== 200 && response.status !== 401) return;
   const state = await response.json();
   if (state.active === false) { returnToLogin(); return; }
   if (state.active !== true || !Number.isFinite(state.expiresAt)) return;
   expiresAt = state.expiresAt;
   clearTimeout(expirationTimer);
   const remaining = expiresAt - Date.now();
   if (remaining <= 0) returnToLogin();
   else expirationTimer = setTimeout(() => void check(), Math.min(remaining, 2147483647));
  } catch {
   // A temporary network failure does not establish that the session expired.
  } finally { checking = false; }
 }
 document.addEventListener('visibilitychange', () => void check());
 window.addEventListener('focus', () => void check());
 window.addEventListener('pageshow', () => void check());
 setInterval(() => void check(), 60000);
 void check();
})();
