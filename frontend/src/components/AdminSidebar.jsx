import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../utils/useTranslation';
import { 
  LayoutDashboard, 
  Users, 
  GitFork,
  Award, 
  Trophy, 
  Wallet, 
  ArrowUpRight, 
  Package, 
  History, 
  TrendingUp, 
  Sliders, 
  Target, 
  Megaphone, 
  Gift, 
  MessageSquare, 
  Palette, 
  Image, 
  Mail, 
  FileText, 
  Send, 
  Folder, 
  CreditCard, 
  FileSignature, 
  Settings,
  LogOut,
  GraduationCap,
  Globe,
  Sun,
  Moon,
  ShieldCheck,
  X,
  ArrowDownLeft
} from 'lucide-react';

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { user, logout, theme, toggleTheme, branding } = useAuthStore();
  const { t, language, setLanguage, dir } = useTranslation();

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const menuItems = [
    { name: 'Admin Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Users', path: '/admin/users', icon: Users },
    { name: 'Team Tree', path: '/admin/team-tree', icon: GitFork },
    { name: 'KYC Approval', path: '/admin/kyc-approval', icon: ShieldCheck },
    { name: 'Leader Ranks', path: '/admin/ranks', icon: Award },
    { name: 'Leader Achievers', path: '/admin/achievers', icon: Trophy },
    { name: 'Wallet Management', path: '/admin/wallet', icon: Wallet },
    { name: 'Deposit Management', path: '/admin/deposit-management', icon: ArrowDownLeft },
    { name: 'Withdrawal Monitoring', path: '/admin/withdrawals', icon: ArrowUpRight },
    { name: 'Transactions', path: '/admin/transactions', icon: History },
    { name: 'Earnings', path: '/admin/earnings', icon: TrendingUp },
    { name: 'Packages', path: '/admin/packages', icon: Package },
    { name: 'Universities', path: '/admin/universities', icon: GraduationCap },
    { name: 'Promised Packages', path: '/admin/promised-packages', icon: Gift },
    { name: 'Generation Settings', path: '/admin/generations', icon: Sliders },
    { name: 'Challenges', path: '/admin/challenges', icon: Target },
    { name: 'News Center', path: '/admin/news', icon: Megaphone },
    { name: 'Support Tickets', path: '/admin/tickets', icon: MessageSquare },
    { name: 'Manage Groups', path: '/admin/groups', icon: Folder },
    { name: 'Email Settings', path: '/admin/email-settings', icon: Mail },
    { name: 'Branding', path: '/admin/branding', icon: Palette },
    { name: 'Logo', path: '/admin/logo', icon: Image },
    { name: 'Payment Settings', path: '/admin/payments', icon: CreditCard },
    { name: 'Legal Content', path: '/admin/legal', icon: FileSignature },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  return (
    <aside className={`w-64 bg-dark-card flex flex-col justify-between h-screen top-0 overflow-hidden shrink-0 z-50 ${
      dir === 'rtl' ? 'border-l border-dark-border' : 'border-r border-dark-border'
    } fixed md:sticky md:translate-x-0 transition-transform duration-300 ${
      isOpen ? 'translate-x-0' : dir === 'rtl' ? 'translate-x-full' : '-translate-x-full'
    } ${dir === 'rtl' ? 'right-0' : 'left-0'}`}>
      <div className="flex flex-col min-h-0 flex-1">
        {/* Brand Header */}
        <div className="p-6 border-b border-dark-border flex items-center justify-between bg-dark-card z-10 shrink-0">
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
                <GraduationCap className="h-8 w-8 text-primary animate-pulse" />
                <span className="text-xl font-bold tracking-wider text-white">
                  {branding?.siteName ? branding.siteName.split('.')[0] : 'Admin'}
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

        {/* Navigation Categories */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-1 scrollbar-thin">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 font-medium text-xs ${
                  isActive 
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.01]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-start flex-1 truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Admin User Control Section */}
      <div className="p-4 border-t border-dark-border flex flex-col gap-3 bg-dark-card shrink-0">

        <button
          onClick={logout}
          className="flex items-center justify-center gap-2.5 px-3 py-2.5 w-full rounded-xl border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/10 transition-all duration-200 text-xs font-bold cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('logout') || 'Log Out'}</span>
        </button>
      </div>
    </aside>
  );
}
