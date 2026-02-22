import React, { useState, useEffect } from 'react';
import { Search, History, LogOut, PartyPopper, Loader2, Sparkles, Map as MapIcon } from 'lucide-react';
import { api } from '../services/api';
import { User, Venue, Plan } from '../types';
import { VenueCard } from './VenueCard';
import { motion, AnimatePresence } from 'motion/react';

export const Dashboard: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [history, setHistory] = useState<Plan[]>([]);
  const [view, setView] = useState<'search' | 'history'>('search');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getHistory();
      setHistory(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setVenues([]);
    try {
      // Get location if possible
      let location = undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      } catch (e) {
        console.log("Geolocation not available or timed out");
      }

      const result = await api.createPlan(prompt, location);
      setVenues(result.venues);
      loadHistory();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to find venues. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[var(--color-bg-dark)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 border-r border-[var(--color-border-subtle)] flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <PartyPopper className="text-black w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-display tracking-tight">PartyPlanner AI</h1>
        </div>

        <nav className="flex-1 space-y-2">
          <button
            onClick={() => setView('search')}
            className={`sidebar-item w-full ${view === 'search' ? 'active' : ''}`}
          >
            <Search className="w-5 h-5" />
            Plan a Party
          </button>
          <button
            onClick={() => setView('history')}
            className={`sidebar-item w-full ${view === 'history' ? 'active' : ''}`}
          >
            <History className="w-5 h-5" />
            My Plans
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-3 px-4 py-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/5"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 lg:p-12">
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            {view === 'search' ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <header className="mb-12">
                  <h2 className="text-4xl font-bold font-display mb-4">Where's the party?</h2>
                  <p className="text-zinc-400 text-lg max-w-2xl">
                    Describe your dream event in natural language. We'll find the perfect venues using AI and Google Maps.
                  </p>
                </header>

                <form onSubmit={handleSearch} className="relative mb-16">
                  <div className="relative group">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., A cozy 21st birthday dinner for 10 people in downtown Chicago with a budget of $50 per person"
                      className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-2xl py-6 pl-16 pr-32 text-lg focus:outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-all"
                    />
                    <Sparkles className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500 w-6 h-6" />
                    <button
                      type="submit"
                      disabled={loading}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-700 text-black font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Find Venues'}
                    </button>
                  </div>
                </form>

                {loading && (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
                    <p className="text-zinc-400 animate-pulse">Consulting the party experts...</p>
                  </div>
                )}

                {venues.length > 0 && !loading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {venues.map((venue, i) => (
                      <VenueCard key={i} venue={venue} index={i} />
                    ))}
                  </div>
                )}

                {!loading && venues.length === 0 && (
                  <div className="text-center py-20 border-2 border-dashed border-[var(--color-border-subtle)] rounded-3xl">
                    <MapIcon className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                    <p className="text-zinc-500">Your curated venues will appear here.</p>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="history"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <header className="mb-12">
                  <h2 className="text-4xl font-bold font-display mb-4">Your Party History</h2>
                  <p className="text-zinc-400 text-lg">Revisit your past planning sessions and saved venues.</p>
                </header>

                <div className="space-y-12">
                  {history.length > 0 ? (
                    history.map((plan) => (
                      <div key={plan.id} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
                          <h3 className="text-xl font-semibold text-emerald-400">"{plan.prompt}"</h3>
                          <span className="text-sm text-zinc-500">
                            {new Date(plan.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          {plan.venues.map((venue, i) => (
                            <VenueCard key={i} venue={venue} index={i} />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-20">
                      <History className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                      <p className="text-zinc-500">No party plans yet. Start searching above!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
