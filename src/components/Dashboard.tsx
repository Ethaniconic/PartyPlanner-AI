import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  History, 
  Settings, 
  LogOut, 
  Plus, 
  Flame, 
  Dna, 
  Wheat, 
  Loader2,
  X,
  Upload,
  Search
} from 'lucide-react';
import { api } from '../services/api';
import { User, FoodLog, Stats } from '../types';

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onLogout }) => {
  const [view, setView] = useState<'today' | 'history' | 'settings'>('today');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsData, logsData] = await Promise.all([
        api.getStats(),
        api.getLogs()
      ]);
      setStats(statsData);
      setLogs(logsData);
    } catch (error) {
      console.error(error);
    }
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCapturing(false);
  };

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg');
      stopCamera();
      analyzeImage(imageData);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (image: string) => {
    setLoading(true);
    try {
      await api.analyzeFood(image);
      await loadData();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = stats ? (stats.current.totalCalories / stats.goals.calorie_goal) * 100 : 0;

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <aside className="w-24 lg:w-72 border-r border-white/5 flex flex-col p-6">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
            <Flame className="text-black w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-display hidden lg:block tracking-tight">MacroLens <span className="text-emerald-500">AI</span></h1>
        </div>

        <nav className="flex-1 space-y-2">
          <button 
            onClick={() => setView('today')}
            className={`sidebar-item w-full ${view === 'today' ? 'active' : ''}`}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden lg:block font-medium">Today's Log</span>
          </button>
          <button 
            onClick={() => setView('history')}
            className={`sidebar-item w-full ${view === 'history' ? 'active' : ''}`}
          >
            <History className="w-5 h-5" />
            <span className="hidden lg:block font-medium">History</span>
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`sidebar-item w-full ${view === 'settings' ? 'active' : ''}`}
          >
            <Settings className="w-5 h-5" />
            <span className="hidden lg:block font-medium">Goals</span>
          </button>
        </nav>

        <div className="pt-6 border-t border-white/5">
          <div className="flex items-center gap-3 px-4 py-3 mb-4 hidden lg:flex">
            <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-xs font-bold">
              {user.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="sidebar-item w-full text-red-400 hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden lg:block font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.03),_transparent_40%)]">
        <div className="max-w-5xl mx-auto p-8 lg:p-16">
          <AnimatePresence mode="wait">
            {view === 'today' ? (
              <motion.div
                key="today"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                  <div>
                    <h2 className="text-5xl font-bold font-display tracking-tight mb-4">Daily <span className="gradient-text">Progress</span></h2>
                    <p className="text-zinc-500 text-lg font-light">Track your nutrition with AI precision.</p>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={startCamera}
                      className="bg-white text-black font-bold px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-emerald-400 transition-all"
                    >
                      <Camera className="w-5 h-5" />
                      Snap Food
                    </button>
                    <label className="bg-zinc-900 border border-white/10 text-white font-bold px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-white/5 transition-all cursor-pointer">
                      <Upload className="w-5 h-5" />
                      Upload
                      <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                  </div>
                </header>

                {/* Stats Grid */}
                {stats && (
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-2 glass rounded-[2.5rem] p-8 flex flex-col justify-between">
                      <div>
                        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest mb-2">Calories</p>
                        <h3 className="text-4xl font-bold font-display">{stats.current.totalCalories || 0} <span className="text-zinc-600 text-xl font-light">/ {stats.goals.calorie_goal} kcal</span></h3>
                      </div>
                      <div className="mt-8">
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(progress, 100)}%` }}
                            className="h-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="glass rounded-[2.5rem] p-8">
                      <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Dna className="text-blue-400 w-5 h-5" />
                      </div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Protein</p>
                      <h4 className="text-2xl font-bold font-display">{stats.current.totalProtein || 0}g</h4>
                      <p className="text-zinc-600 text-xs mt-1">Goal: {stats.goals.protein_goal}g</p>
                    </div>

                    <div className="glass rounded-[2.5rem] p-8">
                      <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4">
                        <Wheat className="text-amber-400 w-5 h-5" />
                      </div>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Carbs</p>
                      <h4 className="text-2xl font-bold font-display">{stats.current.totalCarbs || 0}g</h4>
                      <p className="text-zinc-600 text-xs mt-1">Goal: {stats.goals.carbs_goal}g</p>
                    </div>
                  </div>
                )}

                {/* Recent Logs */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h3 className="text-xl font-bold font-display">Today's Meals</h3>
                    <button onClick={() => setView('history')} className="text-emerald-400 text-sm hover:underline">View All</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {logs.filter(log => new Date(log.created_at).toDateString() === new Date().toDateString()).map((log) => (
                      <div key={log.id} className="glass rounded-3xl p-4 flex gap-4 items-center">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-zinc-900">
                          <img src={log.image_url} alt={log.food_name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold">{log.food_name}</h4>
                          <p className="text-zinc-500 text-sm">{log.calories} kcal</p>
                          <div className="flex gap-3 mt-1 text-[10px] font-bold uppercase tracking-tighter text-zinc-600">
                            <span>P: {log.protein}g</span>
                            <span>C: {log.carbs}g</span>
                            <span>F: {log.fat}g</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {logs.filter(log => new Date(log.created_at).toDateString() === new Date().toDateString()).length === 0 && (
                      <div className="col-span-full py-12 text-center text-zinc-600 border border-dashed border-white/5 rounded-3xl">
                        No meals logged today yet.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : view === 'history' ? (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <header>
                  <h2 className="text-4xl font-bold font-display tracking-tight mb-2">Meal <span className="gradient-text">History</span></h2>
                  <p className="text-zinc-500">Your past nutrition logs.</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {logs.map((log) => (
                    <div key={log.id} className="glass rounded-3xl overflow-hidden group">
                      <div className="aspect-square relative">
                        <img src={log.image_url} alt={log.food_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                        <div className="absolute bottom-4 left-4">
                          <p className="text-xs text-zinc-400 mb-1">{new Date(log.created_at).toLocaleDateString()}</p>
                          <h4 className="text-lg font-bold">{log.food_name}</h4>
                        </div>
                      </div>
                      <div className="p-6 grid grid-cols-2 gap-4">
                        <div className="bg-white/5 rounded-2xl p-3">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Calories</p>
                          <p className="text-lg font-bold">{log.calories}</p>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-3">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Protein</p>
                          <p className="text-lg font-bold">{log.protein}g</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-xl"
              >
                <header className="mb-12">
                  <h2 className="text-4xl font-bold font-display tracking-tight mb-2">Nutrition <span className="gradient-text">Goals</span></h2>
                  <p className="text-zinc-500">Personalize your daily targets.</p>
                </header>

                <div className="glass rounded-[2.5rem] p-10 space-y-8">
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Daily Calorie Goal</label>
                    <input 
                      type="number" 
                      defaultValue={stats?.goals.calorie_goal}
                      onBlur={(e) => api.updateGoals({ ...stats?.goals, calorie_goal: parseInt(e.target.value) }).then(loadData)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500/50 transition-all text-white"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Protein (g)</label>
                      <input 
                        type="number" 
                        defaultValue={stats?.goals.protein_goal}
                        onBlur={(e) => api.updateGoals({ ...stats?.goals, protein_goal: parseInt(e.target.value) }).then(loadData)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-4 focus:outline-none focus:border-emerald-500/50 transition-all text-white"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Carbs (g)</label>
                      <input 
                        type="number" 
                        defaultValue={stats?.goals.carbs_goal}
                        onBlur={(e) => api.updateGoals({ ...stats?.goals, carbs_goal: parseInt(e.target.value) }).then(loadData)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-4 focus:outline-none focus:border-emerald-500/50 transition-all text-white"
                      />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Fat (g)</label>
                      <input 
                        type="number" 
                        defaultValue={stats?.goals.fat_goal}
                        onBlur={(e) => api.updateGoals({ ...stats?.goals, fat_goal: parseInt(e.target.value) }).then(loadData)}
                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-4 focus:outline-none focus:border-emerald-500/50 transition-all text-white"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Camera Overlay */}
      <AnimatePresence>
        {isCapturing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="p-6 flex justify-between items-center">
              <h3 className="text-xl font-bold font-display">Snap your meal</h3>
              <button onClick={stopCamera} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 relative overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
                <div className="w-full h-full border-2 border-white/20 rounded-3xl" />
              </div>
            </div>
            <div className="p-12 flex justify-center">
              <button 
                onClick={captureImage}
                className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform active:scale-95"
              >
                <div className="w-16 h-16 border-4 border-black rounded-full" />
              </button>
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center"
          >
            <div className="relative mb-8">
              <div className="w-24 h-24 border-4 border-emerald-500/20 rounded-full"></div>
              <div className="absolute inset-0 w-24 h-24 border-t-4 border-emerald-500 rounded-full animate-spin"></div>
            </div>
            <h3 className="text-2xl font-bold font-display mb-2">Analyzing Nutrition</h3>
            <p className="text-zinc-500 animate-pulse">Gemini AI is identifying ingredients...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
