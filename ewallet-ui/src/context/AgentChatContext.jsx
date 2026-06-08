import { createContext, useContext, useState, useCallback } from 'react';

const AgentChatContext = createContext(null);

export function AgentChatProvider({ children }) {
  const [messages, setMessages] = useState([]);

  const addMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <AgentChatContext.Provider value={{ messages, setMessages, addMessage, clearMessages }}>
      {children}
    </AgentChatContext.Provider>
  );
}

export const useAgentChat = () => {
  const ctx = useContext(AgentChatContext);
  if (!ctx) throw new Error('useAgentChat must be inside AgentChatProvider');
  return ctx;
};
