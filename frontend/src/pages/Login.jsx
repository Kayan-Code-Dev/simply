import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { GraduationCap, ArrowRight, Globe, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../utils/useTranslation';

// Validation Schema
const schema = zod.object({
  email: zod.string().min(1, 'Username is required'),
  password: zod.string().min(1, 'Password is required')
});

export default function Login() {
  const navigate = useNavigate();
  const loginStore = useAuthStore(state => state.login);
  const { branding } = useAuthStore();
  const { t, language, setLanguage, dir } = useTranslation();
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login(data);
      const { token, user } = res.data;

      // Save user state in Zustand store
      loginStore(token, user);
      
      setLoading(false);
      if (user?.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Invalid username or password.');
      setLoading(false);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg p-4 relative overflow-hidden font-sans" dir={dir}>
      {/* Floating Language Switcher */}
      <div className="absolute top-6 right-6 z-50">
        <button 
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dark-border bg-dark-card text-gray-400 hover:text-white transition duration-200 cursor-pointer"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs font-semibold">{language === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />

      <div className="w-full max-w-md bg-dark-card border border-dark-border rounded-3xl p-8 shadow-2xl relative z-10 text-start">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-primary/20 border border-primary/30 rounded-2xl flex items-center justify-center mb-4 overflow-hidden">
            {branding?.logoUrl ? (
              <img 
                src={branding.logoUrl.startsWith('http') ? branding.logoUrl : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : ''}${branding.logoUrl}`} 
                alt="Logo" 
                className="h-full w-full object-contain p-2"
              />
            ) : (
              <GraduationCap className="h-10 w-10 text-primary" />
            )}
          </div>
          <h2 className="text-3xl font-extrabold text-white text-center">{t('loginTitle')}</h2>
          <p className="text-sm text-gray-400 mt-2 text-center">
            {t('loginSubtitle').replace('Simply.com', branding?.siteName || 'Simply.com')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">{t('usernameLabel')}</label>
              <input
                type="text"
                {...register('email')}
                placeholder={language === 'en' ? 'Enter username' : 'أدخل اسم المستخدم'}
                className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary ltr text-left"
              />
              {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">{t('passwordLabel')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-11 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary ltr text-left"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition duration-200 cursor-pointer p-1"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{t('loginTitle')}</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500">
          {t('noAccount')}{' '}
          <Link to="/register" className="text-primary hover:underline font-semibold">
            {t('registerHere')}
          </Link>
        </div>
      </div>
    </div>
  );
}
