import { useMemo, useState } from 'react';
import { Wallet, List, SendHorizontal, Sparkles, PlusCircle, Home } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AgentChatProvider } from './context/AgentChatContext';
import LoginView from './views/LoginView';
import HomeView from './views/HomeView';
import TransactionsView from './views/TransactionsView';
import SendView from './views/SendView';
import FundsView from './views/FundsView';
import AgentView from './views/AgentView';
import ProfileView from './views/ProfileView';

function Shell() {
  const { isAuthenticated, loading, user } = useAuth();
  const [tab, setTab] = useState('home');

  const tabs = useMemo(
    () => [
      { id: 'home', label: 'Home', icon: Home },
      { id: 'send', label: 'Send', icon: SendHorizontal },
      { id: 'funds', label: 'Add', icon: PlusCircle },
      { id: 'txns', label: 'History', icon: List },
      { id: 'agent', label: 'Agent', icon: Sparkles },
    ],
    []
  );

  

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const initial = user?.username?.charAt(0)?.toUpperCase() || 'U';
  const avatar = user?.avatar;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Sticky header */}
      <header className="flex-shrink-0 px-4 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-700 to-cyan-900 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Sterling E-Wallet</div>
            <div className="text-[11px] text-gray-500">@{user?.username || 'user'}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setTab('profile')}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-colors overflow-hidden ${
            tab === 'profile'
              ? 'bg-cyan-700 text-white ring-2 ring-cyan-700 ring-offset-1'
              : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
          }`}
          title="Profile"
        >
          {avatar ? (
            <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            initial
          )}
        </button>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {tab === 'home' && <HomeView onNavigate={setTab} />}
        {tab === 'send' && <SendView onDone={() => setTab('txns')} />}
        {tab === 'funds' && <FundsView />}
        {tab === 'txns' && <TransactionsView />}
        {tab === 'agent' && <AgentView />}
        {tab === 'profile' && <ProfileView />}
      </main>

      {/* Sticky bottom nav */}
      <nav className="flex-shrink-0 border-t border-gray-100 bg-white grid grid-cols-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`py-2.5 flex flex-col items-center gap-1 text-[10px] font-medium transition-colors ${
                active ? 'text-cyan-800' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <span
                className={`w-9 h-7 rounded-lg flex items-center justify-center transition-colors ${
                  active ? 'bg-cyan-50' : ''
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
              </span>
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AgentChatProvider>
        <Shell />
      </AgentChatProvider>
    </AuthProvider>
  );
}
