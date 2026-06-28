import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('simply_token') || null,
  isAuthenticated: !!localStorage.getItem('simply_token'),
  language: localStorage.getItem('simply_lang') || 'en', // default to English
  theme: localStorage.getItem('simply_theme') || 'dark', // default to dark
  branding: {
    siteName: 'Simply.com',
    primaryColor: '#8b5cf6',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80',
    pwaUrl: ''
  },

  setBranding: (branding) => set({ branding }),
  
  setLanguage: (language) => {
    localStorage.setItem('simply_lang', language);
    set({ language });
  },

  toggleTheme: () => {
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('simply_theme', nextTheme);
      return { theme: nextTheme };
    });
  },
  
  login: (token, user) => {
    localStorage.setItem('simply_token', token);
    set({ token, user, isAuthenticated: true });
  },
  
  logout: () => {
    localStorage.removeItem('simply_token');
    set({ token: null, user: null, isAuthenticated: false });
  },
  
  setUser: (user) => {
    set({ user });
  }
}));
