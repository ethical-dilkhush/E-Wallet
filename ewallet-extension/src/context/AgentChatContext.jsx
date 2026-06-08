import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { chatStore } from '../lib/storage';
import { useAuth } from './AuthContext';

const AgentChatContext = createContext(null);

export function AgentChatProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [messages, setMessages] = useState([]);
  const ready = useRef(false);

  // Load chat for the current user. Runs on popup open and whenever the account
  // changes (logout -> null, then login as a different user). We only restore
  // history that belongs to this exact userId, so accounts never share a chat.
  useEffect(() => {
    ready.current = false;
    let active = true;

    if (!userId) {
      setMessages([]);
      ready.current = true;
      return;
    }

    chatStore
      .get()
      .then((saved) => {
        if (!active) return;
        if (saved && saved.userId === userId && Array.isArray(saved.messages)) {
          setMessages(saved.messages);
        } else {
          setMessages([]);
        }
      })
      .catch(() => {
        if (active) setMessages([]);
      })
      .finally(() => {
        ready.current = true;
      });

    return () => {
      active = false;
    };
  }, [userId]);

  // Persist changes for the current user only (after the initial hydrate).
  useEffect(() => {
    if (!ready.current || !userId) return;
    chatStore.set(userId, messages).catch(() => {});
  }, [messages, userId]);

  const value = useMemo(() => ({ messages, setMessages }), [messages]);
  return <AgentChatContext.Provider value={value}>{children}</AgentChatContext.Provider>;
}

export function useAgentChat() {
  const ctx = useContext(AgentChatContext);
  if (!ctx) throw new Error('useAgentChat must be inside AgentChatProvider');
  return ctx;
}
