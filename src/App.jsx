import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Plus, 
  Minus, 
  Trash2, 
  TrendingDown, 
  LayoutGrid, 
  List, 
  Check, 
  Shirt, 
  Gamepad2, 
  Coffee, 
  Smartphone, 
  Headphones, 
  Monitor, 
  Car, 
  Home, 
  Watch,
  Zap,
  ArrowRight,
  Trophy,
  Star,
  Activity,
  Flame,
  Award,
  Crown,
  QrCode,
  X,
  AlertCircle
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  query, 
  orderBy 
} from 'firebase/firestore';

// --- Firebase Configuration & Setup ---
const firebaseConfig = {
  apiKey: "AIzaSyAuWVXQbyac67ClSVVqXQ1nbk8pO7IlT6A",
  authDomain: "breakeven-1cdf8.firebaseapp.com",
  projectId: "breakeven-1cdf8",
  storageBucket: "breakeven-1cdf8.firebasestorage.app",
  messagingSenderId: "865180546360",
  appId: "1:865180546360:web:71ba94250091deecc43dcd",
  measurementId: "G-WQ9DJQZN03"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "break-even-v1"; 

// --- Audio & Haptics System ---

const playSound = (type, pitch = 1) => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        const now = ctx.currentTime;

        if (type === 'pop') {
            osc.frequency.setValueAtTime(600 * pitch, now);
            osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.15);
        } else if (type === 'achievement') {
            [0, 0.15, 0.3].forEach((delay, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = 'triangle';
                o.frequency.setValueAtTime(440 + (i * 110), now + delay);
                g.gain.setValueAtTime(0, now + delay);
                g.gain.linearRampToValueAtTime(0.3, now + delay + 0.05);
                g.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);
                o.connect(g);
                g.connect(ctx.destination);
                o.start(now + delay);
                o.stop(now + delay + 0.5);
            });
        }
        
        osc.connect(gain);
        gain.connect(ctx.destination);
    } catch (e) {
        console.error("Audio play failed", e);
    }
};

const triggerHaptic = (pattern = [10]) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(pattern);
    }
};

const ICON_MAP = {
  shirt: Shirt,
  gamepad: Gamepad2,
  coffee: Coffee,
  phone: Smartphone,
  headphones: Headphones,
  monitor: Monitor,
  car: Car,
  home: Home,
  watch: Watch,
  zap: Zap,
};

const ACHIEVEMENTS_LIST = [
    { id: 'first_use', name: 'First Steps', desc: 'Log your first use', icon: Star, color: 'text-blue-400', condition: (items) => items.some(i => i.uses > 0) },
    { id: 'break_even', name: 'Break Even!', desc: 'Get an item under $1.00/use', icon: Trophy, color: 'text-amber-400', condition: (items) => items.some(i => (i.price / Math.max(1, i.uses)) <= 1) },
    { id: 'obsessed', name: 'Obsessed', desc: 'Use one item 50 times', icon: Flame, color: 'text-red-500', condition: (items) => items.some(i => i.uses >= 50) },
    { id: 'collector', name: 'The Collector', desc: 'Track 5 different items', icon: LayoutGrid, color: 'text-purple-400', condition: (items) => items.length >= 5 },
    { id: 'value_hunter', name: 'Value Hunter', desc: 'Get an item under $0.10/use', icon: Crown, color: 'text-emerald-400', condition: (items) => items.some(i => (i.price / Math.max(1, i.uses)) <= 0.10) },
];

const COLORS = {
  bg: 'bg-slate-950',
  card: 'bg-slate-900',
  cardBorder: 'border-slate-800',
  textMain: 'text-slate-100',
  textMuted: 'text-slate-400',
  primary: 'bg-emerald-500',
  primaryText: 'text-emerald-500',
  danger: 'text-red-500',
  dangerBg: 'bg-red-500',
  gold: 'text-amber-400',
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const calculateCPU = (price, uses) => {
  const count = Math.max(1, uses); 
  return price / count;
};

const Confetti = () => {
    const pieces = useMemo(() => Array.from({ length: 50 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.2,
        color: ['#34d399', '#fbbf24', '#f472b6', '#60a5fa'][Math.floor(Math.random() * 4)]
    })), []);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {pieces.map(p => (
                <div 
                    key={p.id}
                    className="absolute w-3 h-3 rounded-sm animate-confetti-fall"
                    style={{
                        left: `${p.x}%`,
                        top: '-5%',
                        backgroundColor: p.color,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${2 + Math.random() * 3}s`
                    }}
                />
            ))}
        </div>
    );
};

const AchievementPopup = ({ achievement, onClose }) => {
    useEffect(() => {
        playSound('achievement');
        triggerHaptic([50, 50, 50]);
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, []);

    const Icon = achievement.icon;

    return (
        <div className="fixed top-20 left-4 right-4 z-50 animate-slide-down">
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-2xl shadow-2xl flex items-center space-x-4 relative overflow-hidden">
                <div className={`absolute inset-0 opacity-20 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer`} />
                
                <div className={`w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center ${achievement.color} border border-slate-700`}>
                    <Icon size={24} />
                </div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Achievement Unlocked</p>
                    <h3 className="text-white font-bold text-lg">{achievement.name}</h3>
                    <p className="text-slate-400 text-sm">{achievement.desc}</p>
                </div>
            </div>
        </div>
    );
};

const ComboCounter = ({ count }) => {
    if (count < 2) return null;
    return (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-40 animate-combo-pop">
            <div className="text-6xl font-black italic text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-orange-500 drop-shadow-lg transform -rotate-12">
                {count}x
            </div>
            <div className="text-white font-bold uppercase tracking-widest text-center text-xl drop-shadow-md">
                Combo!
            </div>
        </div>
    );
};

const AuthErrorView = ({ error, onRetry }) => (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Setup Required</h2>
        <p className="text-slate-400 mb-6 max-w-sm">
            {error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed' ? (
                <span>
                    Anonymous authentication is disabled in your Firebase Console. 
                    <br/><br/>
                    Go to <strong>Firebase Console &gt; Authentication &gt; Sign-in method</strong> and enable <strong>Anonymous</strong>.
                </span>
            ) : (
                `Error: ${error.message}`
            )}
        </p>
        <button 
            onClick={onRetry}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl transition-colors"
        >
            Try Again
        </button>
    </div>
);

const ShareModal = ({ onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl flex flex-col items-center max-w-xs mx-4 relative" onClick={e => e.stopPropagation()}>
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                <X size={20} />
            </button>
            <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-emerald-500">
                <Smartphone size={24} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Try on Mobile</h3>
            <p className="text-slate-400 text-center text-sm mb-6 leading-relaxed">
                Scan this code to open your app on your phone.
            </p>
            
            <div className="bg-white p-3 rounded-xl mb-6">
                <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`}
                    alt="QR Code"
                    className="w-48 h-48 rounded-lg"
                />
            </div>

            <p className="text-xs text-slate-600 text-center">
                Requires the app to be deployed/hosted.
            </p>
        </div>
    </div>
);

const EmptyState = ({ onAdd }) => (
  <div className="flex flex-col items-center justify-center h-64 text-center p-6 opacity-0 animate-fade-in" style={{animationFillMode: 'forwards'}}>
    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-slate-800 shadow-xl shadow-black/50">
      <TrendingDown className="w-10 h-10 text-emerald-500" />
    </div>
    <h3 className={`text-2xl font-bold mb-2 ${COLORS.textMain}`}>Zero Data</h3>
    <p className={`${COLORS.textMuted} mb-8 max-w-xs mx-auto leading-relaxed`}>
      Add an item. Use it. Smash the button. Watch the cost drop.
    </p>
    <button 
      onClick={onAdd}
      className={`${COLORS.primary} text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg shadow-emerald-900/40 active:scale-95 transition-transform flex items-center space-x-2`}
    >
        <Plus size={24} />
        <span>Track First Item</span>
    </button>
  </div>
);

const ItemCard = ({ item, onIncrement, onClick }) => {
  const [bumping, setBumping] = useState(false);
  const Icon = ICON_MAP[item.icon] || Zap;
  const cpu = calculateCPU(item.price, item.uses);
  const isBreakEven = cpu <= 1;

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    setBumping(true);
    setTimeout(() => setBumping(false), 150);
    onIncrement(item);
  };

  return (
    <div 
      onClick={() => onClick(item)}
      className={`
        relative overflow-hidden mb-4 rounded-3xl border ${COLORS.cardBorder} ${COLORS.card} 
        active:scale-[0.98] transition-all duration-150 cursor-pointer group shadow-xl shadow-black/20
        touch-manipulation
      `}
    >
      <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transition-colors duration-500 ${isBreakEven ? 'bg-amber-500/10' : 'bg-emerald-500/5'}`} />

      <div className="p-5 flex items-center justify-between relative z-10">
        <div className="flex items-center space-x-4">
          <div className={`
            w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors duration-500
            ${isBreakEven ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'}
          `}>
            {isBreakEven ? <Trophy size={28} className="animate-bounce-subtle" /> : <Icon size={28} />}
          </div>
          
          <div>
            <h3 className={`font-bold text-lg leading-tight ${COLORS.textMain}`}>{item.name}</h3>
            <div className="flex items-center space-x-2 text-sm mt-1">
              <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-medium">{item.uses} uses</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className={`text-2xl font-black tracking-tighter ${cpu > 10 ? COLORS.danger : (isBreakEven ? COLORS.gold : COLORS.primaryText)}`}>
            {formatCurrency(cpu)}
          </span>
          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Per Use</span>
        </div>
      </div>

      <div className="px-5 pb-5 flex justify-between items-center mt-1 relative z-10">
         <div className="flex-1 mr-5 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isBreakEven ? 'bg-amber-400' : (cpu > 10 ? 'bg-red-500' : 'bg-emerald-500')}`}
              style={{ width: `${Math.min(100, (item.uses / (item.price || 1)) * 100)}%` }}
            />
         </div>

        <button
          onClick={handleQuickAdd}
          className={`
            w-12 h-12 rounded-2xl flex items-center justify-center relative
            bg-slate-800 hover:bg-emerald-600 border-2 border-slate-700 hover:border-emerald-500
            transition-all duration-100 shadow-lg active:shadow-none
            ${bumping ? 'scale-90 bg-emerald-500 border-emerald-500' : ''}
          `}
        >
          <Plus size={24} className={`text-emerald-500 ${bumping ? 'text-white' : ''} transition-colors`} />
        </button>
      </div>
    </div>
  );
};

const AddItemView = ({ onBack, onSave }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('shirt');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !price) return;
    setLoading(true);
    await onSave({
      name,
      price: parseFloat(price),
      icon: selectedIcon,
      uses: 0,
    });
  };

  return (
    <div className="h-full flex flex-col animate-slide-up bg-slate-950">
      <div className="flex items-center p-4">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white font-medium">Cancel</button>
        <div className="w-12" />
      </div>

      <form onSubmit={handleSubmit} className="flex-1 px-6 pb-6 overflow-y-auto flex flex-col">
        <div className="flex-1 space-y-10 mt-4">
            <div className="space-y-4 text-center">
            <label className="text-sm font-bold text-emerald-500 uppercase tracking-widest">How much did it cost?</label>
            <div className="relative inline-block">
                <span className="absolute -left-6 top-1/2 -translate-y-1/2 text-4xl font-bold text-slate-600">$</span>
                <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent text-7xl font-black text-white text-center focus:outline-none placeholder-slate-800 caret-emerald-500"
                autoFocus
                />
            </div>
            </div>

            <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">What is it?</label>
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vintage Jeans"
                className="w-full bg-slate-900 border-2 border-slate-800 rounded-2xl p-5 text-white text-xl font-semibold focus:border-emerald-500 focus:outline-none transition-colors"
            />
            </div>

            <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Icon</label>
            <div className="flex flex-wrap gap-3">
                {Object.keys(ICON_MAP).map((key) => {
                const Icon = ICON_MAP[key];
                const isSelected = selectedIcon === key;
                return (
                    <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedIcon(key)}
                    className={`
                        w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200
                        ${isSelected ? 'bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30' : 'bg-slate-900 text-slate-500 border border-slate-800'}
                    `}
                    >
                    <Icon size={24} />
                    </button>
                );
                })}
            </div>
            </div>
        </div>

        <button
          type="submit"
          disabled={!name || !price || loading}
          className={`
            w-full py-5 rounded-2xl font-bold text-xl shadow-xl
            flex items-center justify-center space-x-3 mt-8
            ${(!name || !price) 
              ? 'bg-slate-900 text-slate-600 cursor-not-allowed' 
              : 'bg-emerald-500 text-white active:scale-95 shadow-emerald-500/20'}
            transition-all duration-200
          `}
        >
          <span>Start Tracking</span>
          {!loading && <ArrowRight size={24} />}
          {loading && <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />}
        </button>
      </form>
    </div>
  );
};

const ItemDetailView = ({ item, onBack, onDelete, onUpdate, onLogUse }) => {
  const Icon = ICON_MAP[item.icon] || Zap;
  const cpu = calculateCPU(item.price, item.uses);
  const targetUses = Math.ceil(item.price);
  const remainingUses = Math.max(0, targetUses - item.uses);
  const progress = Math.min(100, (item.uses / targetUses) * 100);
  const hasBrokenEven = cpu <= 1;

  const handleDelete = () => {
    if (confirm('Delete this item?')) {
      onDelete(item.id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 animate-slide-in-right overflow-y-auto">
      <div className="flex items-center justify-between p-6">
        <button onClick={onBack} className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 active:scale-90 transition-transform">
          <ArrowRight className="rotate-180" size={24} />
        </button>
        <button onClick={handleDelete} className="text-red-500 p-2 opacity-50 hover:opacity-100 transition-opacity">
          <Trash2 size={24} />
        </button>
      </div>

      <div className="flex-1 flex flex-col px-8">
        <div className="flex flex-col items-center mb-8">
            <div className={`w-32 h-32 rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl ${hasBrokenEven ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500' : 'bg-slate-900 text-emerald-500 border border-slate-800'}`}>
                {hasBrokenEven ? <Trophy size={64} className="animate-bounce-subtle" /> : <Icon size={64} />}
            </div>
            <h1 className="text-3xl font-bold text-white text-center mb-2">{item.name}</h1>
            <p className="text-slate-500 font-medium bg-slate-900 px-4 py-1 rounded-full text-sm">Orig: {formatCurrency(item.price)}</p>
        </div>

        <div className="w-full bg-slate-900/50 rounded-3xl p-8 border border-slate-800 text-center relative overflow-hidden backdrop-blur-sm">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Real Cost</p>
            <div className={`text-6xl font-black tracking-tighter mb-2 ${cpu > 10 ? 'text-red-500' : (hasBrokenEven ? 'text-amber-400' : 'text-emerald-500')}`}>
                {formatCurrency(cpu)}
            </div>
        </div>

        <div className="mt-8 space-y-4">
            <div className="flex justify-between text-sm font-bold text-slate-400">
                <span>PROGRESS TO $1.00</span>
                <span className={hasBrokenEven ? 'text-amber-400' : 'text-emerald-500'}>{Math.round(progress)}%</span>
            </div>
            <div className="h-6 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-1">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${hasBrokenEven ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${progress}%` }}
                />
            </div>
            {!hasBrokenEven ? (
                <p className="text-center text-slate-400 mt-4">
                    Use <span className="text-white font-bold">{remainingUses}</span> more times to break even.
                </p>
            ) : (
                <p className="text-center text-amber-400 font-bold mt-4 animate-pulse">
                    Congratulations! You've broken even!
                </p>
            )}
        </div>
      </div>

      <div className="p-6">
        <button 
            onClick={() => onLogUse(item)}
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold text-xl flex items-center justify-center space-x-3 active:scale-95 transition-all shadow-xl shadow-emerald-900/40"
        >
            <Plus size={28} />
            <span>Log Use</span>
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedItem, setSelectedItem] = useState(null);
  const [sortBy, setSortBy] = useState('cost');
  const [authError, setAuthError] = useState(null); 
  
  const [activeAchievement, setActiveAchievement] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [combo, setCombo] = useState(0);
  const comboTimeoutRef = useRef(null);
  const unlockedAchievementsRef = useRef(new Set());

  const initAuth = useCallback(async () => {
    try {
        setAuthError(null);
        await signInAnonymously(auth);
    } catch (err) {
        console.error("Auth Error:", err);
        setAuthError(err);
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (u) {
            setUser(u);
            setAuthError(null);
        }
    });
    return () => unsubscribe();
  }, [initAuth]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'artifacts', appId, 'users', user.uid, 'items'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (err) => {
        console.error("Snapshot error:", err);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
      if (items.length === 0) return;

      ACHIEVEMENTS_LIST.forEach(achievement => {
          if (unlockedAchievementsRef.current.has(achievement.id)) return;
          
          if (achievement.condition(items)) {
              unlockedAchievementsRef.current.add(achievement.id);
              setActiveAchievement(achievement); 
          }
      });
  }, [items]);

  const handleAddItem = async (data) => {
    if (!user) return;
    await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'items'), { ...data, createdAt: serverTimestamp() });
    setCurrentView('dashboard');
  };

  const incrementUse = async (item) => {
    if (!user) return;

    const newCombo = combo + 1;
    setCombo(newCombo);
    if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    comboTimeoutRef.current = setTimeout(() => setCombo(0), 2000); 

    const pitch = 1 + Math.min(newCombo * 0.1, 1); 
    playSound('pop', pitch);
    triggerHaptic([10]);

    const currentCost = calculateCPU(item.price, item.uses);
    const nextCost = calculateCPU(item.price, item.uses + 1);
    if (currentCost > 1 && nextCost <= 1) {
        setShowConfetti(true);
        playSound('achievement');
        setTimeout(() => setShowConfetti(false), 5000);
    }

    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'items', item.id), { uses: (item.uses || 0) + 1 });
  };

  const updateItem = async (id, data) => {
    if (!user) return;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'items', id), data);
  };

  const deleteItem = async (id) => {
    if (!user) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'items', id));
    setSelectedItem(null);
    setCurrentView('dashboard');
  };

  const totalUses = items.reduce((acc, item) => acc + (item.uses || 0), 0);
  const currentLevel = useMemo(() => {
    const LEVELS = [
        { name: "Novice", minXP: 0 },
        { name: "Saver", minXP: 10 },
        { name: "Pro", minXP: 50 },
        { name: "Master", minXP: 150 },
        { name: "Legend", minXP: 300 },
        { name: "Godlike", minXP: 1000 },
    ];
    return LEVELS.slice().reverse().find(l => totalUses >= l.minXP) || LEVELS[0];
  }, [totalUses]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (sortBy === 'cost') return calculateCPU(b.price, b.uses) - calculateCPU(a.price, a.uses);
      return b.uses - a.uses;
    });
  }, [items, sortBy]);

  if (authError) {
      return <AuthErrorView error={authError} onRetry={initAuth} />;
  }

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div></div>;

  return (
    <div className={`min-h-screen ${COLORS.bg} text-slate-100 font-sans selection:bg-emerald-500/30 overflow-hidden`}>
      <div className="max-w-md mx-auto h-[100dvh] flex flex-col bg-slate-950 relative shadow-2xl border-x border-slate-900">
        
        {showConfetti && <Confetti />}
        {showShare && <ShareModal onClose={() => setShowShare(false)} />}
        {activeAchievement && (
            <AchievementPopup 
                achievement={activeAchievement} 
                onClose={() => setActiveAchievement(null)} 
            />
        )}
        <ComboCounter count={combo} />

        <main className="flex-1 overflow-hidden relative flex flex-col">
            
            {currentView === 'dashboard' && (
                <div className="h-full flex flex-col animate-fade-in">
                    
                    <div className="pt-6 pb-4 px-6 bg-slate-900 border-b border-slate-800 z-10 shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                                    <Activity className="text-emerald-500" />
                                    BreakEven
                                </h1>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                                <button 
                                    onClick={() => setShowShare(true)}
                                    className="p-2 bg-slate-800 rounded-lg text-emerald-500 border border-slate-700 hover:bg-slate-700 transition-colors"
                                >
                                    <QrCode size={20} />
                                </button>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rank</p>
                                    <p className="text-emerald-400 font-bold text-sm">{currentLevel.name}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                            <span>Level Progress</span>
                            <span>{totalUses} XP</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                                style={{ width: `${Math.min(100, (totalUses % 50) * 2)}%` }} 
                            />
                        </div>
                    </div>

                    <div className="flex p-4 gap-2">
                        <button 
                            onClick={() => setSortBy('cost')}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${sortBy === 'cost' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}
                        >
                            High Cost
                        </button>
                        <button 
                            onClick={() => setSortBy('uses')}
                            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${sortBy === 'uses' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-900 text-slate-500 hover:bg-slate-800'}`}
                        >
                            Most Used
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-hide">
                        {sortedItems.length === 0 ? (
                            <EmptyState onAdd={() => setCurrentView('add')} />
                        ) : (
                            sortedItems.map(item => (
                                <ItemCard 
                                    key={item.id} 
                                    item={item} 
                                    onIncrement={incrementUse}
                                    onClick={(i) => {
                                        setSelectedItem(i);
                                        setCurrentView('detail');
                                    }}
                                />
                            ))
                        )}
                    </div>

                    <div className="absolute bottom-8 right-6 z-20">
                        <button
                            onClick={() => setCurrentView('add')}
                            className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-emerald-600 shadow-2xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            <Plus size={32} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            )}

            {currentView === 'add' && (
                <AddItemView 
                    onBack={() => setCurrentView('dashboard')}
                    onSave={handleAddItem}
                />
            )}

            {currentView === 'detail' && selectedItem && (
                <ItemDetailView 
                    item={items.find(i => i.id === selectedItem.id) || selectedItem}
                    onBack={() => {
                        setSelectedItem(null);
                        setCurrentView('dashboard');
                    }}
                    onDelete={deleteItem}
                    onUpdate={updateItem}
                    onLogUse={incrementUse}
                />
            )}

        </main>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes comboPop { 
            0% { transform: translate(-50%, -50%) scale(0.5) rotate(-12deg); opacity: 0; } 
            50% { transform: translate(-50%, -50%) scale(1.2) rotate(-12deg); opacity: 1; } 
            100% { transform: translate(-50%, -50%) scale(1) rotate(-12deg); opacity: 0; } 
        }
        @keyframes confettiFall { 
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } 
        }
        @keyframes shimmer { 
            0% { transform: translateX(-100%); } 
            100% { transform: translateX(100%); } 
        }
        @keyframes bounce-subtle {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
        }
        
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        .animate-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slide-in-right { animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-slide-down { animation: slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
        .animate-combo-pop { animation: comboPop 0.4s ease-out forwards; }
        .animate-confetti-fall { animation: confettiFall linear forwards; }
        .animate-shimmer { animation: shimmer 2s infinite linear; }
        .animate-bounce-subtle { animation: bounce-subtle 2s infinite ease-in-out; }
        
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}