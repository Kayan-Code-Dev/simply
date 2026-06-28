import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../utils/useTranslation';
import { 
  LayoutDashboard, 
  Wallet, 
  Network, 
  Trophy, 
  ShieldCheck, 
  LogOut,
  GraduationCap,
  Globe,
  History,
  Users,
  Award,
  MessageSquare,
  Settings,
  Coins,
  Sun,
  Moon,
  X
} from 'lucide-react';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { user, logout, theme, toggleTheme, branding } = useAuthStore();
  const { t, language, setLanguage, dir } = useTranslation();
  const isAdmin = user?.role === 'ADMIN';

  const menuItems = [
    { name: t('dashboard'), path: '/dashboard/home', icon: LayoutDashboard },
    { name: t('wallet'), path: '/dashboard/wallet', icon: Wallet },
    { name: t('earnings'), path: '/dashboard/earnings', icon: History },
    { name: t('packages'), path: '/dashboard/packages', icon: GraduationCap },
    { name: t('myPackages'), path: '/dashboard/my-packages', icon: ShieldCheck },
    { name: t('team'), path: '/dashboard/team', icon: Users },
    { name: t('ranks'), path: '/dashboard/ranks', icon: Award },
    { name: t('teamTree'), path: '/dashboard/tree', icon: Network },
    { name: t('challengesTravel'), path: '/dashboard/challenges', icon: Trophy },
    { name: t('pooling') || 'Pooling', path: '/dashboard/pooling', icon: Coins },
    { name: t('mediaCenter'), path: '/dashboard/news', icon: Globe },
    { name: t('support'), path: '/dashboard/support', icon: MessageSquare },
    { name: t('profile'), path: '/dashboard/profile', icon: Settings },
    { name: t('kycVerification') || 'KYC Verification', path: '/dashboard/kyc', icon: ShieldCheck }
  ];

  if (isAdmin) {
    menuItems.push({ name: t('adminPanel'), path: '/admin', icon: ShieldCheck });
  }

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <aside className={`w-64 bg-dark-card flex flex-col justify-between h-screen top-0 overflow-hidden shrink-0 z-50 ${
      dir === 'rtl' ? 'border-l border-dark-border' : 'border-r border-dark-border'
    } fixed md:sticky md:translate-x-0 transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
    } ${dir === 'rtl' ? 'right-0' : 'left-0'}`}>
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Logo */}
        <div className="p-6 border-b border-dark-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Close button (Mobile only) */}
            <button 
              onClick={onClose}
              className="p-1 md:hidden rounded-lg border border-dark-border hover:bg-white/5 text-gray-400 hover:text-white transition duration-200 cursor-pointer"
              title="Close Menu"
            >
              <X className="h-4 w-4" />
            </button>
            {branding?.logoUrl ? (
              <img 
                src={branding.logoUrl.startsWith('http') ? branding.logoUrl : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : ''}${branding.logoUrl}`} 
                alt="Logo" 
                className="h-8 max-w-[120px] object-contain"
              />
            ) : (
              <>
                <GraduationCap className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold tracking-wider text-white">
                  {branding?.siteName ? branding.siteName.split('.')[0] : 'Simply'}
                  <span className="text-primary">
                    {branding?.siteName && branding.siteName.includes('.') ? `.${branding.siteName.split('.').slice(1).join('.')}` : '.com'}
                  </span>
                </span>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-dark-border hover:bg-white/5 text-gray-400 hover:text-white transition duration-200 cursor-pointer"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Language Toggle */}
            <button 
              onClick={toggleLanguage}
              className="p-1.5 rounded-lg border border-dark-border hover:bg-white/5 text-gray-400 hover:text-white transition duration-200 cursor-pointer"
              title={language === 'en' ? 'العربية' : 'English'}
            >
              <Globe className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="mt-6 px-4 space-y-1.5 overflow-y-auto flex-1 pb-4 scrollbar-thin">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 font-medium ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-start flex-1">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User details and Log Out */}
      <div className="p-4 border-t border-dark-border flex flex-col gap-4 shrink-0 bg-dark-card">

        <button
          onClick={logout}
          className="flex items-center justify-center gap-3 px-4 py-3 w-full rounded-xl border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/10 transition-all duration-300 font-medium cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </aside>
  );
}
