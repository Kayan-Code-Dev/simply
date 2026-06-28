import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../utils/useTranslation';
import { walletApi } from '../services/api';
import { ShieldCheck, UserCheck, ShieldAlert, Award, Menu } from 'lucide-react';

export default function Navbar({ onMenuToggle }) {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      walletApi.getInfo()
        .then(res => setIsActive(res.data.isActive))
        .catch(() => setIsActive(true));
    }
  }, [user]);

  // Rank Styling mapping
  const getRankBadgeClass = (rank) => {
    const defaultStyle = 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    const mappings = {
      DISTRIBUTOR: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
      STARTER_LEADER: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      MANAGER_LEADER: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      SILVER_LEADER: 'bg-zinc-300/15 text-zinc-200 border-zinc-300/30',
      GOLD: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      PLATINUM: 'bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-purple-500/10',
      RUBY: 'bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/10 animate-pulse',
      EMERALD: 'bg-teal-500/20 text-teal-300 border-teal-500/40 shadow-teal-500/10',
      DIAMOND: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/10 font-bold',
      BLUE_DIAMOND: 'bg-blue-600/20 text-blue-300 border-blue-600/40 shadow-blue-600/10 font-bold',
      BLACK_DIAMOND: 'bg-neutral-800/80 text-neutral-100 border-neutral-700 shadow-lg font-bold',
      LEGEND: 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 text-yellow-300 border-yellow-500/40 shadow-xl font-extrabold'
    };
    return mappings[rank?.toUpperCase()] || defaultStyle;
  };

  const getRoleLabel = (role) => {
    if (role === 'ADMIN') return t('adminRole');
    if (role === 'STUDENT') return t('studentRole');
    return t('marketerRole');
  };

  return (
    <header className="h-20 bg-dark-card border-b border-dark-border px-4 md:px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
      {/* Menu Hamburger + Welcome text */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => onMenuToggle && onMenuToggle()}
          className="p-1.5 md:hidden rounded-lg border border-dark-border hover:bg-white/5 text-gray-400 hover:text-white transition duration-200 cursor-pointer shrink-0"
          title="Toggle Sidebar"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        <div className="text-start">
          <h1 className="text-sm md:text-lg font-semibold text-white my-0 leading-none truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
            {t('welcome')} {user?.name}
          </h1>
          <p className="text-[10px] md:text-xs text-gray-500 mt-1 font-medium">
            {getRoleLabel(user?.role)}
          </p>
        </div>
      </div>

      {/* Status indicators & badges */}
      <div className="flex items-center gap-4">
        {/* Active Status Badge */}
        {user?.role !== 'ADMIN' && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            isActive 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}>
            {isActive ? (
              <>
                <UserCheck className="h-3.5 w-3.5" />
                <span>{t('accountActive')}</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>{t('accountInactive')}</span>
              </>
            )}
          </div>
        )}

        {/* Rank Badge */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-300 ${getRankBadgeClass(user?.rank)}`}>
          <Award className="h-3.5 w-3.5" />
          <span>{user?.rank || 'DISTRIBUTOR'}</span>
        </div>
      </div>
    </header>
  );
}
