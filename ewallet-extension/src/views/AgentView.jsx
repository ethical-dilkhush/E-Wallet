import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Loader2, SendHorizontal, Sparkles, Trash2 } from 'lucide-react';
import { agentApi } from '../lib/api';
import { useAgentChat } from '../context/AgentChatContext';

const EXAMPLE_PROMPTS = [
  'Summarise my recent spending',
  'What was my largest transaction?',
  'Any financial advice based on my spending?',
];

export default function AgentView() {
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
      setMessages((prev) => [...prev, { role: 'assistant', content: `Sorry, I couldn't answer that: ${msg}` }]);
    }
    setLoading(false);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-900">Sterling Agent</div>
          <div className="text-[11px] text-gray-500">Wallet insights and personalised tips</div>
        </div>
        <button
          type="button"
          onClick={() => setMessages([])}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          title="Clear chat"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto popup-scroll px-4 pb-4 space-y-3">
        {messages.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-2xl p-4">
            <div className="text-sm font-semibold text-gray-900">Try asking:</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLE_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 bg-white text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div key={i} className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                m.role === 'user' ? 'bg-primary-100' : 'bg-gradient-to-br from-primary-500 to-primary-700'
              }`}
            >
              {m.role === 'user' ? (
                <span className="text-xs font-semibold text-primary-700">U</span>
              ) : (
                <Sparkles className="w-4 h-4 text-white" />
              )}
            </div>
            <div
              className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-sm whitespace-pre-wrap'
                  : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm prose prose-sm prose-gray max-w-none'
              }`}
            >
              {m.role === 'assistant' ? <Markdown>{m.content}</Markdown> : m.content}
            </div>
          </div>
        ))}

        {loading ? (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-gray-100 shadow-sm">
              <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />
            </div>
          </div>
        ) : null}
      </div>

      <form onSubmit={onSubmit} className="p-3 border-t border-gray-100 bg-white">
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
            className="flex-1 resize-none px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-all max-h-24"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl text-white bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-600/25 transition-all disabled:opacity-50 flex-shrink-0"
            title="Send"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <SendHorizontal className="w-5 h-5" />}
          </button>
        </div>
      </form>
    </div>
  );
}