import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ArrowLeft, ArrowRight, Check, CreditCard, Landmark, Globe, Ticket, Eye, EyeOff } from 'lucide-react';
import { authApi, packageApi, settingsApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../utils/useTranslation';

// Zod Validation Schema
const schema = zod.object({
  username: zod.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must not exceed 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  name: zod.string().min(3, 'Name must be at least 3 characters'),
  email: zod.string().email('Invalid email address'),
  password: zod.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: zod.string().min(6, 'Confirm password must be at least 6 characters'),
  sponsorUsername: zod.string().optional()
}).refine(data => data.confirmPassword === data.password, {
  message: "Passwords do not match",
  path: ['confirmPassword']
});

export default function Register() {
  const navigate = useNavigate();
  const loginStore = useAuthStore(state => state.login);
  const { branding } = useAuthStore();
  const { t, language, setLanguage, dir } = useTranslation();
  const [step, setStep] = useState(1); // 1: Personal Info, 2: Choose Role/Package
  const [userRole, setUserRole] = useState('MARKETER'); // MARKETER or STUDENT
  
  const [universities, setUniversities] = useState([]);
  const [selectedUni, setSelectedUni] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [paymentPercent, setPaymentPercent] = useState(25);
  const [paymentMethod, setPaymentMethod] = useState('STRIPE');
  const [gateways, setGateways] = useState({
    stripe: { enabled: true },
    paypal: { enabled: true },
    payoneer: { enabled: true },
    manual: { enabled: true }
  });
  const [epinCode, setEpinCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Sponsor state checks
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorError, setSponsorError] = useState('');
  const [checkingSponsor, setCheckingSponsor] = useState(false);

  const { register, handleSubmit, formState: { errors }, getValues, watch } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      sponsorUsername: new URLSearchParams(window.location.search).get('ref') || ''
    }
  });

  const watchedSponsorUsername = watch('sponsorUsername');

  useEffect(() => {
    if (!watchedSponsorUsername || watchedSponsorUsername.trim().length < 3) {
      setSponsorName('');
      setSponsorError('');
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setCheckingSponsor(true);
      setSponsorName('');
      setSponsorError('');
      try {
        const res = await authApi.checkSponsor(watchedSponsorUsername.trim());
        setSponsorName(res.data.name);
      } catch (err) {
        console.error(err);
        setSponsorError(language === 'ar' ? 'اسم المستخدم غير موجود' : 'Sponsor username not found');
      } finally {
        setCheckingSponsor(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [watchedSponsorUsername, language]);

  useEffect(() => {
    // Fetch Universities & Packages
    packageApi.getUniversities()
      .then(res => {
        setUniversities(res.data);
        if (res.data.length > 0) {
          setSelectedUni(res.data[0]);
          if (res.data[0].packages.length > 0) {
            setSelectedPkg(res.data[0].packages[0]);
          }
        }
      })
      .catch(err => console.error('Error fetching university data:', err));

    // Fetch Payment Settings
    settingsApi.getPaymentSettings()
      .then(res => {
        setGateways(res.data);
        const enabledList = [];
        if (res.data.stripe?.enabled) enabledList.push('STRIPE');
        if (res.data.paypal?.enabled) enabledList.push('PAYPAL');
        if (res.data.manual?.enabled) enabledList.push('BANK_TRANSFER');
        enabledList.push('EPIN');
        if (enabledList.length > 0) {
          setPaymentMethod(enabledList[0]);
        }
      })
      .catch(err => console.error('Error fetching gateway settings:', err));
  }, []);

  const handleUniChange = (uniId) => {
    const uni = universities.find(u => u.id === parseInt(uniId, 10));
    setSelectedUni(uni);
    if (uni && uni.packages.length > 0) {
      setSelectedPkg(uni.packages[0]);
    }
  };

  const handlePkgChange = (pkgId) => {
    const p = selectedUni?.packages.find(pkg => pkg.id === parseInt(pkgId, 10));
    setSelectedPkg(p);
  };

  // Calculations
  const getPackagePrice = () => {
    return selectedPkg ? Number(selectedPkg.price) : 0;
  };

  const getInstallmentAmount = () => {
    return getPackagePrice() * (paymentPercent / 100);
  };

  const getDiscount = () => {
    const amount = getInstallmentAmount();
    return amount > 2000 ? amount * 0.10 : 0;
  };

  const getFinalAmount = () => {
    return getInstallmentAmount() - getDiscount();
  };

  const onNextStep = (data) => {
    if (sponsorError) {
      setError(sponsorError);
      return;
    }
    setStep(2);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ar' : 'en');
  };

  const handleFinalSubmit = async () => {
    if (sponsorError) {
      setError(sponsorError);
      return;
    }
    setLoading(true);
    setError(null);
    const formValues = getValues();

    try {
      // 1. Sign up the user (creates user, wallet, and MLM nodes)
      const regRes = await authApi.register({
        username: formValues.username,
        name: formValues.name,
        email: formValues.email,
        password: formValues.password,
        sponsorUsername: formValues.sponsorUsername || null
      });

      const { token, user } = regRes.data;

      // Login immediately in the store to attach JWT
      loginStore(token, user);

      // 2. If student, initiate package purchase
      if (userRole === 'STUDENT' && selectedPkg) {
        await packageApi.purchase({
          packageId: selectedPkg.id,
          paymentPercentage: paymentPercent,
          paymentMethod,
          epinCode: paymentMethod === 'EPIN' ? epinCode : undefined
        });
      }

      // Re-fetch user details to get updated role & status
      const userRes = await authApi.me();
      loginStore(token, userRes.data.user);

      setLoading(false);
      navigate('/dashboard/kyc');

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'An unexpected error occurred during signup.');
      setLoading(false);
    }
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

      <div className="w-full max-w-2xl bg-dark-card border border-dark-border rounded-3xl p-8 shadow-2xl relative z-10 text-start">
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
              <GraduationCap className="h-10 w-10 text-primary animate-pulse" />
            )}
          </div>
          <h2 className="text-3xl font-extrabold text-white text-center">{t('registerTitle')}</h2>
          <p className="text-sm text-gray-400 mt-2 text-center">
            {t('registerSubtitle').replace('Simply.com', branding?.siteName || 'Simply.com')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSubmit(onNextStep)}
              className="space-y-6"
            >
              <div className="space-y-4 text-start">
                {/* Username */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">{t('usernameLabel')}</label>
                  <input
                    type="text"
                    {...register('username')}
                    placeholder={t('usernamePlaceholder')}
                    className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-start ltr"
                  />
                  {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username.message}</p>}
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">{t('nameLabel')}</label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder={t('namePlaceholder')}
                    className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-start"
                  />
                  {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">{t('emailLabel')}</label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="example@email.com"
                    className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary ltr text-left"
                  />
                  {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">{t('passwordLabel')}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register('password')}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary ltr text-left pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">{t('confirmPasswordLabel')}</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      {...register('confirmPassword')}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary ltr text-left pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-400 mt-1">{errors.confirmPassword.message}</p>}
                </div>

                {/* Sponsor Username */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">{t('sponsorUsernameLabel')}</label>
                  <div className="relative">
                    <input
                      type="text"
                      {...register('sponsorUsername')}
                      placeholder={t('sponsorUsernamePlaceholder')}
                      className={`w-full px-4 py-3 rounded-xl bg-dark-bg text-white focus:outline-none text-center font-semibold border ${
                        sponsorError 
                          ? 'border-red-500/50 focus:border-red-500' 
                          : sponsorName 
                            ? 'border-emerald-500/50 focus:border-emerald-500' 
                            : 'border-dark-border focus:border-primary'
                      }`}
                    />
                    {checkingSponsor && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {errors.sponsorUsername && <p className="text-xs text-red-400 mt-1">{errors.sponsorUsername.message}</p>}
                  {sponsorName && (
                    <p className="text-xs text-emerald-400 mt-1.5 font-bold text-center flex items-center justify-center gap-1.5 bg-emerald-500/5 border border-emerald-500/10 py-1.5 rounded-lg">
                      <Check className="h-3.5 w-3.5" />
                      <span>{language === 'ar' ? `المستدعي: ${sponsorName}` : `Sponsor: ${sponsorName}`}</span>
                    </p>
                  )}
                  {sponsorError && (
                    <p className="text-xs text-red-400 mt-1.5 font-bold text-center py-1.5 bg-red-500/5 border border-red-500/10 rounded-lg">
                      {sponsorError}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t('nextButton')}</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 text-start"
            >
              {/* Select Role */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-3">{t('accountType')}</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setUserRole('MARKETER')}
                    className={`p-4 rounded-2xl border text-start transition-all duration-300 flex flex-col justify-between h-28 cursor-pointer ${
                      userRole === 'MARKETER'
                        ? 'border-primary bg-primary/10 text-white'
                        : 'border-dark-border bg-dark-bg text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-lg">{t('marketerRole')}</span>
                    <span className="text-xs text-gray-500 mt-1">{t('marketerDesc')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setUserRole('STUDENT')}
                    className={`p-4 rounded-2xl border text-start transition-all duration-300 flex flex-col justify-between h-28 cursor-pointer ${
                      userRole === 'STUDENT'
                        ? 'border-primary bg-primary/10 text-white'
                        : 'border-dark-border bg-dark-bg text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-lg">{t('studentRole')}</span>
                    <span className="text-xs text-gray-500 mt-1">{t('studentDesc')}</span>
                  </button>
                </div>
              </div>

              {/* Student educational details */}
              {userRole === 'STUDENT' && universities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 pt-4 border-t border-dark-border"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Select University */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">{t('universityLabel')}</label>
                      <select
                        onChange={(e) => handleUniChange(e.target.value)}
                        value={selectedUni?.id || ''}
                        className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-start"
                      >
                        {universities.map(uni => (
                          <option key={uni.id} value={uni.id}>{uni.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Select Program */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">{t('degreeLabel')}</label>
                      <select
                        onChange={(e) => handlePkgChange(e.target.value)}
                        value={selectedPkg?.id || ''}
                        className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-start"
                      >
                        {selectedUni?.packages.map(pkg => (
                          <option key={pkg.id} value={pkg.id}>
                            {pkg.name.split(' - ')[0]} (${pkg.price})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Installment percentage slider */}
                  <div className="bg-dark-bg/50 border border-dark-border/50 rounded-2xl p-5 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-bold text-white">${getFinalAmount().toLocaleString()}</span>
                      <span className="text-sm font-semibold text-gray-300">{t('installmentTitle')} ({paymentPercent}%)</span>
                    </div>

                    <input
                      type="range"
                      min="25"
                      max="100"
                      step="5"
                      value={paymentPercent}
                      onChange={(e) => setPaymentPercent(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>{t('installmentFull')}</span>
                      <span>{t('installmentMin')}</span>
                    </div>

                    {/* Discounts summary */}
                    {getDiscount() > 0 && (
                      <div className="mt-4 flex justify-between items-center text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                        <span>{t('discountAppliedAlert')}</span>
                        <span>{t('savingLabel')} ${getDiscount().toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">{t('paymentMethodLabel')}</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { id: 'STRIPE', name: 'Credit Card / Stripe', icon: CreditCard, enabled: gateways.stripe?.enabled },
                        { id: 'PAYPAL', name: 'PayPal', icon: CreditCard, enabled: gateways.paypal?.enabled },
                        { id: 'BANK_TRANSFER', name: 'Bank Transfer', icon: Landmark, enabled: gateways.manual?.enabled },
                        { id: 'EPIN', name: 'E-PIN', icon: Ticket, enabled: true }
                      ].filter(m => m.enabled).map((method) => {
                        const Icon = method.icon;
                        return (
                          <button
                            type="button"
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`p-3 rounded-xl border text-sm font-semibold transition-all duration-300 flex flex-col items-center gap-2 cursor-pointer ${
                              paymentMethod === method.id
                                ? 'border-primary bg-primary/10 text-white shadow-md'
                                : 'border-dark-border bg-dark-bg text-gray-400 hover:text-white'
                            }`}
                          >
                            <Icon className="h-5 w-5" />
                            <span>{method.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bank Details for Register Page */}
                  {paymentMethod === 'BANK_TRANSFER' && gateways.manual?.enabled && (
                    <div className="p-4 bg-dark-bg/60 border border-dark-border rounded-2xl space-y-3 text-xs mt-3">
                      <span className="text-gray-400 font-semibold block uppercase tracking-wider">Manual Bank Transfer Details</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-gray-500">Account Name:</span>
                          <span className="block font-bold text-white mt-1">{gateways.manual.accountName || 'Simply Central Bank'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">IBAN:</span>
                          <span className="block font-bold text-white font-mono mt-1 select-all">{gateways.manual.iban || 'AE600000001234567890123'}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">After transferring the registration fee, please complete your registration. Administrators will verify the payment.</p>
                    </div>
                  )}

                  {/* E-PIN Input Field */}
                  {paymentMethod === 'EPIN' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2"
                    >
                      <label className="block text-sm font-semibold text-gray-300 mb-2">E-PIN Code</label>
                      <input
                        type="text"
                        value={epinCode}
                        onChange={(e) => setEpinCode(e.target.value.toUpperCase())}
                        placeholder="EPIN-XXXX-XXXX-XXXX"
                        className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-primary/50 text-white focus:outline-none focus:border-primary font-mono uppercase tracking-wider text-center"
                      />
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        Any remaining balance from your E-PIN will be added to your Wallet.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-4 rounded-2xl border border-dark-border text-gray-300 hover:text-white hover:bg-white/5 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>{t('backButton')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="w-2/3 py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t('confirmRegister')}</span>
                      <Check className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 text-center text-sm text-gray-500">
          {t('haveAccount')}{' '}
          <Link to="/login" className="text-primary hover:underline font-semibold">
            {t('loginHere')}
          </Link>
        </div>
      </div>
    </div>
  );
}
