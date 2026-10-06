// The library invokes LocalAuth.logout during navigation as well as explicit
// logout. Keep local credentials available for diagnosis and recovery.
export const retainingAuth = Base => class extends Base {
  async logout() { console.error('whatsapp_local_credentials_retained'); }
};

// whatsapp-web.js has an asynchronous navigation callback outside initialize().
// Its known auth timeout must not take the attachment/history HTTP service down.
export function installAuthTimeoutGuard(emitter, sessions, log = console.error) {
  emitter.on('unhandledRejection', reason => {
    if ((typeof reason === 'string' ? reason : reason?.message) !== 'auth timeout') {
      throw reason instanceof Error ? reason : new Error(String(reason));
    }
    for (const session of sessions.values()) {
      session.state = 'error';
      session.qr = null;
    }
    log('whatsapp_navigation_auth_timeout');
  });
}
