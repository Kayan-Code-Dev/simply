import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';
import { authApi, settingsApi } from './services/api';

function darkenColor(hex, percent) {
  if (!hex || !hex.startsWith('#')) return hex;
  let num = parseInt(hex.replace("#", ""), 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) - amt,
      G = (num >> 8 & 0x00FF) - amt,
      B = (num & 0x0000FF) - amt;
  return "#" + (0x1000000 + (R < 255 ? R < 0 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 0 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 0 ? 0 : B : 255)).toString(16).slice(1);
}

// Components
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminLayout from './components/AdminLayout';
import Team from './pages/Team';
import Challenges from './pages/Challenges';
import AdminPanel from './pages/AdminPanel';
import Wallet from './pages/Wallet';
import Transactions from './pages/Transactions';

const queryClient = new QueryClient();

// Route Guards
function PrivateRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin/dashboard" replace />;
  return <DashboardLayout />;
}

function AdminRoute() {
  const { isAuthenticated, user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

function PublicRoute() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  return !isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
}

import { useTranslation } from './utils/useTranslation';

// Authenticated Layout Wrapper
function DashboardLayout() {
  const { dir } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="flex min-h-screen bg-dark-bg font-sans" dir={dir}>
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Backdrop overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Main dashboard view */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuToggle={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-dark-bg/40">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { token, setUser, logout, theme, branding, setBranding } = useAuthStore();

  // Load branding settings on mount
  useEffect(() => {
    settingsApi.getBranding()
      .then(res => {
        setBranding(res.data);
      })
      .catch((err) => {
        console.error('Failed to fetch branding settings:', err);
      });
  }, [setBranding]);

  // Apply branding dynamically (colors, title, PWA icon)
  useEffect(() => {
    if (branding) {
      if (branding.siteName) {
        document.title = branding.siteName;
      }
      if (branding.primaryColor) {
        document.documentElement.style.setProperty('--primary-color', branding.primaryColor);
        const hoverColor = darkenColor(branding.primaryColor, 10);
        document.documentElement.style.setProperty('--primary-color-hover', hoverColor);
      }
      if (branding.pwaUrl) {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        const baseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : '';
        const fullPwaUrl = branding.pwaUrl.startsWith('http') ? branding.pwaUrl : `${baseUrl}${branding.pwaUrl}`;
        link.href = fullPwaUrl;

        let appleLink = document.querySelector("link[rel='apple-touch-icon']");
        if (appleLink) {
          appleLink.href = fullPwaUrl;
        }
      }
    }
  }, [branding]);

  // Apply theme dynamically
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  // On boot, fetch current user info to sync state
  useEffect(() => {
    if (token) {
      authApi.me()
        .then(res => {
          setUser(res.data.user);
        })
        .catch((err) => {
          console.error('Session expired or invalid:', err);
          logout();
        });
    }
  }, [token, setUser, logout]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Route>

          {/* Protected Dashboard Routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard/:tab" element={<Dashboard />} />
            <Route path="/dashboard" element={<Navigate to="/dashboard/home" replace />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/team" element={<Team />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/transactions" element={<Transactions />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/:tab" element={<AdminPanel />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>

          {/* Default Fallbacks */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
