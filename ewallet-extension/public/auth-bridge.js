// Syncs auth between chrome.storage.local (extension) and localStorage (web app).
// Runs at document_start so the web app hydrates with the correct session.
(function () {
  const KEY_PREFIX = 'ewallet.';
  const STORAGE_KEYS = ['accessToken', 'refreshToken', 'user', 'authUpdatedAt'];

  function extKey(k) {
    return KEY_PREFIX + k;
  }

  function sessionFromExtension(raw) {
    return {
      accessToken: raw[extKey('accessToken')] ?? null,
      refreshToken: raw[extKey('refreshToken')] ?? null,
      user: raw[extKey('user')] ?? null,
      authUpdatedAt: raw[extKey('authUpdatedAt')] ?? 0,
    };
  }

  function sessionFromWeb() {
    const userRaw = localStorage.getItem('user');
    let user = null;
    if (userRaw) {
      try {
        user = JSON.parse(userRaw);
      } catch {
        user = null;
      }
    }
    return {
      accessToken: localStorage.getItem('accessToken'),
      refreshToken: localStorage.getItem('refreshToken'),
      user,
      authUpdatedAt: Number(localStorage.getItem('authUpdatedAt') || 0),
    };
  }

  function writeWeb(session) {
    if (!session?.accessToken) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('authUpdatedAt');
      return;
    }
    localStorage.setItem('accessToken', session.accessToken);
    localStorage.setItem('refreshToken', session.refreshToken);
    localStorage.setItem('user', JSON.stringify(session.user));
    localStorage.setItem('authUpdatedAt', String(session.authUpdatedAt || Date.now()));
  }

  async function readExtension() {
    const keys = STORAGE_KEYS.map(extKey);
    const raw = await chrome.storage.local.get(keys);
    return sessionFromExtension(raw);
  }

  async function writeExtension(session) {
    if (!session?.accessToken) {
      await chrome.storage.local.remove(STORAGE_KEYS.map(extKey));
      return;
    }
    await chrome.storage.local.set({
      [extKey('accessToken')]: session.accessToken,
      [extKey('refreshToken')]: session.refreshToken,
      [extKey('user')]: session.user,
      [extKey('authUpdatedAt')]: session.authUpdatedAt || Date.now(),
    });
  }

  function notifyPage(type, payload) {
    window.postMessage({ source: 'sterling-ewallet-bridge', type, payload }, window.location.origin);
  }

  function pickWinner(ext, web) {
    const extLoggedIn = !!ext.accessToken;
    const webLoggedIn = !!web.accessToken;

    if (extLoggedIn && !webLoggedIn) return { winner: ext, target: 'web' };
    if (!extLoggedIn && webLoggedIn) return { winner: web, target: 'extension' };
    if (!extLoggedIn && !webLoggedIn) return { winner: null, target: null };

    if (ext.user?.id && web.user?.id && ext.user.id === web.user.id) {
      return { winner: ext, target: null };
    }

    if ((ext.authUpdatedAt || 0) >= (web.authUpdatedAt || 0)) {
      return { winner: ext, target: 'web' };
    }
    return { winner: web, target: 'extension' };
  }

  let syncing = false;

  async function applySession(session) {
    if (!session?.accessToken) {
      writeWeb(null);
      await writeExtension(null);
      notifyPage('AUTH_LOGOUT');
      notifyPage('AUTH_READY', { user: null });
      return;
    }

    writeWeb(session);
    await writeExtension(session);
    notifyPage('AUTH_SYNC', { user: session.user });
    notifyPage('AUTH_READY', { user: session.user });
  }

  async function reconcile(forcedSource) {
    if (syncing) return;
    syncing = true;
    try {
      const ext = await readExtension();
      const web = sessionFromWeb();

      if (forcedSource === 'extension') {
        if (ext.accessToken) {
          await applySession(ext);
        } else {
          notifyPage('AUTH_READY', { user: web.user });
        }
        return;
      }

      if (forcedSource === 'web') {
        if (web.accessToken) {
          await applySession(web);
        } else {
          notifyPage('AUTH_READY', { user: null });
        }
        return;
      }

      const { winner, target } = pickWinner(ext, web);

      if (!winner?.accessToken) {
        await applySession(null);
        return;
      }

      if (target === 'web') {
        writeWeb(winner);
        notifyPage('AUTH_SYNC', { user: winner.user });
      } else if (target === 'extension') {
        await writeExtension(winner);
      }

      notifyPage('AUTH_READY', { user: winner.user });
    } finally {
      syncing = false;
    }
  }

  const params = new URLSearchParams(window.location.search);
  const forcedSource = params.get('ewalletSync');
  reconcile(forcedSource === 'extension' ? 'extension' : null);

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local') return;
    const touched = STORAGE_KEYS.some((k) => extKey(k) in changes);
    if (!touched) return;

    const ext = await readExtension();
    if (!ext.accessToken) {
      await applySession(null);
      return;
    }

    writeWeb(ext);
    notifyPage('AUTH_SYNC', { user: ext.user });
    notifyPage('AUTH_READY', { user: ext.user });
  });

  window.addEventListener('message', async (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.source !== 'sterling-ewallet-web') return;

    if (data.type === 'AUTH_LOGIN' && data.payload) {
      const session = {
        ...data.payload,
        authUpdatedAt: data.payload.authUpdatedAt || Date.now(),
      };
      await applySession(session);
    } else if (data.type === 'AUTH_LOGOUT') {
      await applySession(null);
    }
  });
})();
