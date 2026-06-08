const WEB_SOURCE = 'sterling-ewallet-web';
const BRIDGE_SOURCE = 'sterling-ewallet-bridge';

export function notifyBridgeLogin({ accessToken, refreshToken, user }) {
  window.postMessage(
    {
      source: WEB_SOURCE,
      type: 'AUTH_LOGIN',
      payload: {
        accessToken,
        refreshToken,
        user,
        authUpdatedAt: Date.now(),
      },
    },
    window.location.origin
  );
}

export function notifyBridgeLogout() {
  window.postMessage({ source: WEB_SOURCE, type: 'AUTH_LOGOUT' }, window.location.origin);
}

export function waitForAuthBridge(timeoutMs = 400) {
  return new Promise((resolve) => {
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
      resolve();
    };

    const onMessage = (event) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.source === BRIDGE_SOURCE && data?.type === 'AUTH_READY') {
        finish();
      }
    };

    window.addEventListener('message', onMessage);
    const timer = setTimeout(finish, timeoutMs);
  });
}

export function subscribeBridgeAuth({ onSync, onLogout }) {
  const handler = (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data;
    if (data?.source !== BRIDGE_SOURCE) return;
    if (data.type === 'AUTH_SYNC') onSync?.(data.payload);
    if (data.type === 'AUTH_LOGOUT') onLogout?.();
  };

  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}
