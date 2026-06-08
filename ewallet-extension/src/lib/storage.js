const KEY_PREFIX = 'ewallet.';
const CHAT_KEY = key('agentChat');

function key(k) {
  return `${KEY_PREFIX}${k}`;
}

// chrome.storage.session keeps data in memory for the life of the browser
// session: it survives the popup being closed/reopened but is wiped when the
// browser/extension reloads. Fall back to local if session is unavailable.
const sessionArea = chrome.storage.session ?? chrome.storage.local;

export const storage = {
  async get(k) {
    const res = await chrome.storage.local.get([key(k)]);
    return res[key(k)] ?? null;
  },
  async set(k, v) {
    await chrome.storage.local.set({ [key(k)]: v });
  },
  async remove(k) {
    await chrome.storage.local.remove([key(k)]);
  },
  async clearSession() {
    await chrome.storage.local.remove([
      key('accessToken'),
      key('refreshToken'),
      key('user'),
      key('wallet'),
      key('authUpdatedAt'),
    ]);
    await chatStore.clear();
  },
};

// Session-scoped Sterling Agent chat history. Persists while the popup is
// closed/reopened, clears on extension reload or logout. The history is tagged
// with the owning userId so one account never sees another account's chat.
export const chatStore = {
  async get() {
    const res = await sessionArea.get([CHAT_KEY]);
    return res[CHAT_KEY] ?? null;
  },
  async set(userId, messages) {
    await sessionArea.set({ [CHAT_KEY]: { userId, messages } });
  },
  async clear() {
    await sessionArea.remove([CHAT_KEY]);
  },
};

