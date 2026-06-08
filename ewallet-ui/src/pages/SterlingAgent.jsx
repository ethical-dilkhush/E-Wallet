import { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { Sparkles, SendHorizontal, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useAgentChat } from '../context/AgentChatContext';
import { agentApi } from '../services/api';

const EXAMPLE_PROMPTS = [
  'How much have I spent in total?',
  'What was my largest transaction?',
  'Summarise my recent spending',
  'How many transfers have I made?',
];

export default function SterlingAgent() {
  const { user } = useAuth();
  const notify = useNotifications();
  const { messages, setMessages } = useAgentChat();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const nextMessages = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await agentApi.chat({ messages: nextMessages });
      const reply = res.data?.data?.reply;
      if (res.data?.success && reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      } else {
        throw new Error(res.data?.message || 'No response');
      }
    } catch (ex) {
      const msg = ex.response?.data?.message || ex.message || 'The assistant is unavailable right now.';
      notify.error(msg);
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sorry, I couldn't answer that: ${msg}` }]);
    }
    setLoading(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <div className="max-w-3xl mx-auto h-full">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-6 text-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur">
              <Sparkles className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold">Sterling Agent</h2>
          </div>
          <p className="text-white/80 text-sm">Your personal AI wallet assistant. Ask about your balance, spending, and transaction history.</p>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/50">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1">How can I help with your wallet?</h3>
              <p className="text-sm text-gray-500 mb-6">I can analyse your spending and transactions. Try one of these:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => send(p)}
                    className="px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  m.role === 'user' ? 'bg-primary-100' : 'bg-gradient-to-br from-primary-500 to-primary-700'
                }`}
              >
                {m.role === 'user' ? (
                  <span className="text-xs font-semibold text-primary-700">
                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
              </div>
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-primary-600 text-white rounded-tr-sm whitespace-pre-wrap'
                    : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm prose prose-sm prose-gray max-w-none'
                }`}
              >
                {m.role === 'assistant' ? (
                  <Markdown>{m.content}</Markdown>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-100 shadow-sm">
                <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={onSubmit} className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about your wallet..."
              className="flex-1 resize-none px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all max-h-32"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-3 rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50 flex-shrink-0"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizontal className="w-5 h-5" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
