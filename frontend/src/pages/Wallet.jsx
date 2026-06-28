import React, { useState, useEffect } from 'react';
import { useTranslation } from '../utils/useTranslation';
import { walletApi, settingsApi } from '../services/api';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Ticket
} from 'lucide-react';
import EPinCenter from '../components/EPinCenter';

export default function WalletPage() {
  const { t, language, dir } = useTranslation();
  const [walletInfo, setWalletInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Redesign state
  const [activeSection, setActiveSection] = useState('deposit');
  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem('show_wallet_balance');
    return saved !== 'false';
  });

  const toggleBalance = () => {
    setShowBalance(prev => {
      localStorage.setItem('show_wallet_balance', !prev);
      return !prev;
    });
  };

  // Form inputs
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('STRIPE');
  const [receiptReference, setReceiptReference] = useState('');
  
  const [gateways, setGateways] = useState({
    stripe: { enabled: true, publishableKey: '' },
    paypal: { enabled: true, clientId: '' },
    payoneer: { enabled: true, email: '' },
    manual: { enabled: true, iban: '', accountName: '' }
  });

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('BANK_TRANSFER');

  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [confirmTransferOpen, setConfirmTransferOpen] = useState(false);

  // Wallet PIN Security settings
  const [walletPin, setWalletPin] = useState('');
  const [pinStatus, setPinStatus] = useState({ hasPinSet: false });
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinChange, setShowPinChange] = useState(false);

  const fetchWalletDetails = async () => {
    try {
      const res = await walletApi.getInfo();
      setWalletInfo(res.data);
      const pinRes = await walletApi.getPinStatus();
      setPinStatus(pinRes.data);
    } catch (err) {
      console.error('Error fetching wallet details:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGateways = async () => {
    try {
      const res = await settingsApi.getPaymentSettings();
      setGateways(res.data);
      const enabledList = [];
      if (res.data.stripe?.enabled) enabledList.push('STRIPE');
      if (res.data.paypal?.enabled) enabledList.push('PAYPAL');
      if (res.data.payoneer?.enabled) enabledList.push('PAYONEER');
      if (res.data.manual?.enabled) enabledList.push('BANK_TRANSFER');
      
      if (enabledList.length > 0) {
        setDepositMethod(enabledList[0]);
      }

      const withdrawEnabledList = [];
      if (res.data.manual?.enabled) withdrawEnabledList.push('BANK_TRANSFER');
      if (res.data.payoneer?.enabled) withdrawEnabledList.push('PAYONEER');
      if (withdrawEnabledList.length > 0) {
        setWithdrawMethod(withdrawEnabledList[0]);
      }
    } catch (err) {
      console.error('Error fetching gateway settings:', err);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
    fetchGateways();
  }, []);

  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await walletApi.deposit({
        amount: depositAmount,
        paymentMethod: depositMethod,
        receiptReference: depositMethod === 'BANK_TRANSFER' ? receiptReference : undefined
      });
      setSuccess(res.data.message);
      setDepositAmount('');
      setReceiptReference('');
      fetchWalletDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing deposit.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWithdrawalSubmit = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || !withdrawBank) return;
    if (Number(withdrawAmount) < 15) {
      setError(language === 'ar' ? 'الحد الأدنى للسحب هو 15$.' : 'Minimum withdrawal amount is $15.');
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await walletApi.withdraw({
        amount: withdrawAmount,
        paymentMethod: withdrawMethod,
        bankDetails: withdrawBank
      });
      setSuccess(res.data.message);
      setWithdrawAmount('');
      setWithdrawBank('');
      fetchWalletDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Error submitting withdrawal.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e?.preventDefault();
    if (!transferEmail || !transferAmount || Number(transferAmount) <= 0) return;
    if (!walletPin) {
      setError(language === 'ar' ? 'الرمز السري للمحفظة مطلوب.' : 'Wallet PIN is required.');
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await walletApi.transfer({
        recipientEmail: transferEmail,
        amount: transferAmount,
        walletPin
      });
      setSuccess(res.data.message);
      setTransferEmail('');
      setTransferAmount('');
      setWalletPin('');
      setConfirmTransferOpen(false);
      fetchWalletDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing transfer.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await walletApi.requestOtp();
      setSuccess(res.data.message);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Error sending verification code.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetPin = async (e) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      setError(language === 'ar' ? 'يجب أن يكون الرقم السري من 4 إلى 6 أرقام.' : 'PIN must be 4 to 6 digits.');
      return;
    }
    if (!otp) {
      setError(language === 'ar' ? 'رمز التحقق OTP مطلوب.' : 'OTP verification code is required.');
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await walletApi.setPin({ pin: newPin, otp });
      setSuccess(res.data.message);
      setNewPin('');
      setOtp('');
      setOtpSent(false);
      setShowPinSetup(false);
      fetchWalletDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Error setting PIN.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChangePin = async (e) => {
    e.preventDefault();
    if (!currentPin || !newPin) return;
    if (newPin.length < 4 || newPin.length > 6) {
      setError(language === 'ar' ? 'يجب أن يكون الرقم السري الجديد من 4 إلى 6 أرقام.' : 'New PIN must be 4 to 6 digits.');
      return;
    }
    if (!otp) {
      setError(language === 'ar' ? 'رمز التحقق OTP مطلوب.' : 'OTP verification code is required.');
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await walletApi.changePin({ currentPin, newPin, otp });
      setSuccess(res.data.message);
      setCurrentPin('');
      setNewPin('');
      setOtp('');
      setOtpSent(false);
      setShowPinChange(false);
      fetchWalletDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Error changing PIN.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (method) => {
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await walletApi.activateAccount(method);
      setSuccess(res.data.message);
      fetchWalletDetails();
    } catch (err) {
      setError(err.response?.data?.error || 'Error activating account.');
    } finally {
      setActionLoading(false);
    }
  };

  const getTransactionTypeLabel = (type, details) => {
    const parsedDetails = JSON.parse(details || '{}');
    if (type === 'DEPOSIT') return t('depositFunds');
    if (type === 'WITHDRAWAL') return t('withdrawTitle');
    if (type === 'ACTIVATION_FEE') return 'Account Activation';
    if (type === 'PACKAGE_PURCHASE') return 'Study Enrollment';
    if (type === 'TRANSFER') {
      return parsedDetails.action === 'SENT' ? 'Sent Transfer' : 'Received Transfer';
    }
    return type;
  };

  const getStatusBadge = (status) => {
    if (status === 'COMPLETED') {
      return (
        <span className="flex items-center gap-1 text-emerald-400 text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Completed</span>
        </span>
      );
    }
    if (status === 'PENDING') {
      return (
        <span className="flex items-center gap-1 text-amber-400 text-xs font-semibold px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <Clock className="h-3.5 w-3.5 animate-spin" />
          <span>Pending</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-red-400 text-xs font-semibold px-2 py-0.5 bg-red-500/10 border border-red-500/20 rounded-lg">
        <XCircle className="h-3.5 w-3.5" />
        <span>Failed</span>
      </span>
    );
  };

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6 max-w-6xl mx-auto font-sans text-start">
      

      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-center text-sm font-medium">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-center text-sm font-medium">
          {error}
        </div>
      )}

      {walletInfo && !walletInfo.isActive && (
        <div className="p-4 md:p-6 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl md:rounded-3xl space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 animate-pulse" />
            <div>
              <h4 className="font-bold text-lg text-white">{t('inactiveAlertTitle')}</h4>
              <p className="text-sm text-gray-400 mt-0.5">{t('inactiveAlertDesc')}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 pt-2 border-t border-amber-500/10">
            <button
              onClick={() => handleActivate('WALLET')}
              disabled={actionLoading || Number(walletInfo?.wallet?.balance) < 10}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/20 disabled:text-amber-500/40 text-black font-bold rounded-xl transition duration-300 cursor-pointer text-xs"
            >
              {t('payWithWallet')} ($10)
            </button>
            <button
              onClick={() => handleActivate('STRIPE')}
              disabled={actionLoading}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-xl transition duration-300 cursor-pointer text-xs"
            >
              {t('payWithStripePaypal')} ($10)
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Premium Balance Card */}
          <div className="bg-gradient-to-br from-primary via-purple-600 to-indigo-700 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-start">
            {/* Background glowing circles for premium styling */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-52 h-52 bg-white/5 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-white/70 text-sm font-medium">
                  <span>{t('walletBalance') || 'Available Balance'}</span>
                  <button 
                    onClick={toggleBalance} 
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer text-white/80"
                    title={showBalance ? "Hide Balance" : "Show Balance"}
                  >
                    {showBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                <h3 className="text-4xl font-extrabold text-white tracking-tight font-mono select-none">
                  {showBalance ? `$${Number(walletInfo?.wallet?.balance || 0).toFixed(2)}` : '••••••'}
                </h3>
              </div>

              {/* Sub-balances Grid */}
              <div className="grid grid-cols-2 gap-4 bg-black/20 border border-white/5 backdrop-blur-md rounded-2xl p-4 w-full md:w-auto shrink-0">
                <div className="space-y-1">
                  <span className="text-[10px] text-white/60 font-semibold uppercase tracking-wider block">Locked (Pending)</span>
                  <span className="text-sm font-bold text-amber-300 font-mono block">
                    {showBalance ? `$${Number(walletInfo?.wallet?.lockedBalance || 0).toFixed(2)}` : '••••'}
                  </span>
                </div>
                <div className="space-y-1 border-l border-white/10 pl-4">
                  <span className="text-[10px] text-white/60 font-semibold uppercase tracking-wider block">{t('totalEarned') || 'Total Earned'}</span>
                  <span className="text-sm font-bold text-emerald-300 font-mono block">
                    {showBalance ? `$${Number(walletInfo?.wallet?.totalEarned || 0).toFixed(2)}` : '••••'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions Row */}
            <div className="grid grid-cols-4 gap-2 mt-8 pt-6 border-t border-white/10 relative z-10">
              {[
                { id: 'deposit', label: language === 'ar' ? 'إيداع' : 'Deposit', icon: ArrowDownLeft },
                { id: 'withdraw', label: language === 'ar' ? 'سحب' : 'Withdraw', icon: ArrowUpRight },
                { id: 'transfer', label: language === 'ar' ? 'تحويل' : 'Transfer', icon: ArrowLeftRight },
                { id: 'epin', label: 'E-PIN', icon: Ticket }
              ].map((btn) => {
                const Icon = btn.icon;
                const isActive = activeSection === btn.id;
                return (
                  <button
                    key={btn.id}
                    onClick={() => setActiveSection(btn.id)}
                    className={`flex flex-col items-center gap-2 p-2 rounded-2xl transition duration-300 cursor-pointer ${
                      isActive 
                        ? 'bg-white text-primary shadow-lg scale-105 font-bold' 
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center border transition ${
                      isActive 
                        ? 'bg-primary/10 border-primary text-primary' 
                        : 'bg-white/5 border-white/10 text-white'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-semibold">{btn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Action Tab Section */}
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl text-start space-y-6">
            
            {activeSection === 'deposit' && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <h4 className="text-lg font-bold text-white mb-1">{t('depositFunds')}</h4>
                  <p className="text-xs text-gray-500">{t('depositDesc')}</p>
                </div>

                <form onSubmit={handleDepositSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">{t('amountLabel')}</label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">{t('paymentMethodLabel')}</label>
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-start text-sm cursor-pointer font-semibold"
                    >
                      {gateways.stripe?.enabled && <option value="STRIPE">Stripe / Credit Card</option>}
                      {gateways.paypal?.enabled && <option value="PAYPAL">PayPal</option>}
                      {gateways.payoneer?.enabled && <option value="PAYONEER">Payoneer</option>}
                      {gateways.manual?.enabled && <option value="BANK_TRANSFER">Bank Transfer (Manual)</option>}
                    </select>
                  </div>

                  {depositMethod === 'PAYONEER' && gateways.payoneer?.enabled && (
                    <div className="p-4 bg-dark-bg border border-dark-border/60 rounded-2xl space-y-2 text-xs">
                      <span className="text-gray-400 font-semibold block uppercase tracking-wider">Payoneer Account</span>
                      <div>
                        <span className="text-gray-500">Send Payment To Payoneer Email:</span>
                        <span className="block font-bold text-white font-mono mt-1 select-all">{gateways.payoneer.email || 'payoneer@simply.com'}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-2">After transferring funds, proceed with submitting the form below.</p>
                    </div>
                  )}

                  {depositMethod === 'BANK_TRANSFER' && gateways.manual?.enabled && (
                    <div className="p-4 bg-dark-bg border border-dark-border/60 rounded-2xl space-y-3 text-xs">
                      <span className="text-gray-400 font-semibold block uppercase tracking-wider">Bank Details</span>
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
                    </div>
                  )}

                  {depositMethod === 'BANK_TRANSFER' && gateways.manual?.enabled && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">{t('receiptReferenceLabel')}</label>
                      <input
                        type="text"
                        required
                        placeholder={t('receiptReferencePlaceholder') || 'Enter reference number'}
                        value={receiptReference}
                        onChange={(e) => setReceiptReference(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-start text-sm"
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 cursor-pointer text-sm"
                  >
                    {actionLoading ? 'Processing...' : t('depositSubmit')}
                  </button>
                </form>
              </div>
            )}

            {activeSection === 'withdraw' && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <h4 className="text-lg font-bold text-white mb-1">{t('withdrawTitle')}</h4>
                  <p className="text-xs text-gray-500">{t('withdrawDesc')}</p>
                </div>

                <form onSubmit={handleWithdrawalSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">{t('withdrawAmount')}</label>
                    <input
                      type="number"
                      required
                      placeholder="Min $15"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">{t('withdrawMethodLabel') || 'Withdrawal Method'}</label>
                    <select
                      value={withdrawMethod}
                      onChange={(e) => setWithdrawMethod(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-start text-sm cursor-pointer font-semibold"
                    >
                      {gateways.manual?.enabled && <option value="BANK_TRANSFER">{t('bankTransferOpt') || 'Bank Transfer (Manual)'}</option>}
                      {gateways.payoneer?.enabled && <option value="PAYONEER">{t('payoneerOpt') || 'Payoneer'}</option>}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">
                      {withdrawMethod === 'PAYONEER'
                        ? (t('payoneerEmailLabel') || 'Payoneer Email Address')
                        : (t('bankDetailsLabel') || 'Bank Details / IBAN')}
                    </label>
                    <input
                      type={withdrawMethod === 'PAYONEER' ? 'email' : 'text'}
                      required
                      placeholder={withdrawMethod === 'PAYONEER' ? 'your-payoneer@email.com' : 'IBAN & Bank details'}
                      value={withdrawBank}
                      onChange={(e) => setWithdrawBank(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading || !walletInfo?.isActive}
                    className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 cursor-pointer text-sm disabled:opacity-50"
                  >
                    {actionLoading ? 'Processing...' : t('withdrawSubmit')}
                  </button>
                </form>
              </div>
            )}

            {activeSection === 'transfer' && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <h4 className="text-lg font-bold text-white mb-1">{t('internalTransfer')}</h4>
                  <p className="text-xs text-gray-500">{t('transferDesc')}</p>
                </div>

                {!pinStatus.hasPinSet ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium space-y-3">
                    <p>
                      {language === 'ar' 
                        ? 'يجب تعيين الرقم السري للمحفظة أولاً قبل إجراء أي تحويل مالي.' 
                        : 'You must set a Wallet Security PIN before making balance transfers.'}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {language === 'ar'
                        ? 'استخدم لوحة "حماية المحفظة الرقمية" بالأسفل لتعيين رمزك السري.'
                        : 'Use the "Wallet Security Settings" card below to set your secret code.'}
                    </p>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); setConfirmTransferOpen(true); }} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">{t('transferAmount')}</label>
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        value={transferAmount}
                        disabled={confirmTransferOpen}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">{t('recipientEmail')}</label>
                      <input
                        type="email"
                        required
                        placeholder="recipient@mail.com"
                        value={transferEmail}
                        disabled={confirmTransferOpen}
                        onChange={(e) => setTransferEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary ltr text-sm"
                      />
                    </div>

                    {confirmTransferOpen ? (
                      <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl space-y-3">
                        <p className="text-xs text-primary font-semibold">
                          {t('transferConfirm').replace('{amount}', transferAmount).replace('{email}', transferEmail)}
                        </p>
                        <div>
                          <label className="block text-xs font-semibold text-gray-400 mb-1">
                            {language === 'ar' ? 'الرقم السري للمحفظة' : 'Wallet Security PIN'}
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={6}
                            placeholder="••••••"
                            value={walletPin}
                            onChange={(e) => setWalletPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm tracking-widest"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={handleTransferSubmit}
                            disabled={actionLoading || !walletPin}
                            className="flex-1 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer"
                          >
                            {actionLoading ? 'Sending...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setConfirmTransferOpen(false); setWalletPin(''); }}
                            className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl border border-white/10 transition cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={actionLoading || !walletInfo?.isActive}
                        className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 cursor-pointer text-sm disabled:opacity-50"
                      >
                        {actionLoading ? 'Processing...' : t('transferSubmit')}
                      </button>
                    )}
                  </form>
                )}
              </div>
            )}

            {activeSection === 'epin' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-white mb-1">E-PIN Center</h4>
                  <p className="text-xs text-gray-500">Generate, redeem, or transfer secure activation tokens</p>
                </div>
                
                <EPinCenter 
                  walletBalance={walletInfo?.wallet?.balance} 
                  onUpdateBalance={fetchWalletDetails} 
                  hasPinSet={pinStatus.hasPinSet}
                />
              </div>
            )}

          </div>

          {/* Wallet Security settings */}
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl text-start">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-white/5 rounded-xl flex items-center justify-center text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white">
                  {language === 'ar' ? 'حماية المحفظة الرقمية' : 'Wallet Security Settings'}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {language === 'ar' 
                    ? 'قم بتعيين أو تغيير الرقم السري لحماية عملياتك المالية مثل تحويل الرصيد وإنشاء التوكنات.' 
                    : 'Set or change your security PIN to protect operations like balance transfers and token generation.'}
                </p>
              </div>
            </div>

            <div className="max-w-lg">
              {!pinStatus.hasPinSet ? (
                !showPinSetup ? (
                  <button
                    onClick={() => { setShowPinSetup(true); setOtpSent(false); setError(null); setSuccess(null); }}
                    className="w-full py-3 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-bold rounded-xl transition duration-300 flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    <Lock className="h-4 w-4" />
                    <span>{language === 'ar' ? 'إعداد الرقم السري للمحفظة' : 'Setup Wallet PIN'}</span>
                  </button>
                ) : (
                  <div className="space-y-4">
                    {!otpSent ? (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-400">
                          {language === 'ar'
                            ? 'سيتم إرسال رمز تحقق مؤقت (OTP) إلى بريدك الإلكتروني لتأكيد ملكية الحساب.'
                            : 'A temporary verification code (OTP) will be sent to your email to verify account ownership.'}
                        </p>
                        <button
                          onClick={handleRequestOtp}
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer text-sm"
                        >
                          {actionLoading ? 'Sending...' : (language === 'ar' ? 'إرسال رمز التحقق (OTP)' : 'Send OTP Code')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPinSetup(false)}
                          className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition cursor-pointer text-xs"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSetPin} className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                            {language === 'ar' ? 'الرقم السري الجديد (4-6 أرقام)' : 'New PIN (4-6 digits)'}
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={6}
                            placeholder="••••"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm tracking-widest"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 mb-1">
                            {language === 'ar' ? 'رمز التحقق (OTP)' : 'OTP Code'}
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm tracking-widest font-bold"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={actionLoading || newPin.length < 4 || otp.length < 6}
                          className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition disabled:opacity-50 text-sm cursor-pointer"
                        >
                          {actionLoading ? 'Processing...' : (language === 'ar' ? 'تأكيد وحفظ الرقم السري' : 'Verify & Set PIN')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowPinSetup(false); setOtpSent(false); setOtp(''); }}
                          className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition cursor-pointer text-xs"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </form>
                    )}
                  </div>
                )
              ) : (
                !showPinChange ? (
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" />
                      <span>{language === 'ar' ? 'الرمز السري نشط ومحمي' : 'Security PIN Active'}</span>
                    </div>
                    <button
                      onClick={() => { setShowPinChange(true); setOtpSent(false); setError(null); setSuccess(null); }}
                      className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <Lock className="h-4 w-4" />
                      <span>{language === 'ar' ? 'تغيير الرقم السري للمحفظة' : 'Change Wallet PIN'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!otpSent ? (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-400">
                          {language === 'ar'
                            ? 'سيتم إرسال رمز تحقق مؤقت (OTP) إلى بريدك الإلكتروني لتأكيد طلب تغيير الرقم السري.'
                            : 'A temporary verification code (OTP) will be sent to your email to verify this PIN change request.'}
                        </p>
                        <button
                          onClick={handleRequestOtp}
                          disabled={actionLoading}
                          className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer text-sm"
                        >
                          {actionLoading ? 'Sending...' : (language === 'ar' ? 'إرسال رمز التحقق (OTP)' : 'Send OTP Code')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowPinChange(false)}
                          className="w-full py-2 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition cursor-pointer text-xs"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleChangePin} className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">
                            {language === 'ar' ? 'الرقم السري الحالي' : 'Current PIN'}
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={6}
                            placeholder="••••"
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm tracking-widest"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">
                            {language === 'ar' ? 'الرقم السري الجديد (4-6 أرقام)' : 'New PIN (4-6 digits)'}
                          </label>
                          <input
                            type="password"
                            required
                            maxLength={6}
                            placeholder="••••"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm tracking-widest"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-400 mb-0.5">
                            {language === 'ar' ? 'رمز التحقق (OTP)' : 'OTP Code'}
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={6}
                            placeholder="123456"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm tracking-widest font-bold"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={actionLoading || !currentPin || newPin.length < 4 || otp.length < 6}
                          className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition disabled:opacity-50 text-sm cursor-pointer"
                        >
                          {actionLoading ? 'Processing...' : (language === 'ar' ? 'تحديث وتأكيد الرقم السري' : 'Verify & Change PIN')}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowPinChange(false); setOtpSent(false); setOtp(''); setCurrentPin(''); setNewPin(''); }}
                          className="w-full py-1.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg border border-white/10 transition cursor-pointer text-xs"
                        >
                          {language === 'ar' ? 'إلغاء' : 'Cancel'}
                        </button>
                      </form>
                    )}
                  </div>
                )
              )}
            </div>
          </div>


          {/* Transaction Ledger */}
          <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl">
            <h4 className="text-lg font-bold text-white mb-6">Financial Statement Ledger</h4>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse" dir={dir}>
                <thead>
                  <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                    <th className="pb-3 text-start">Transaction Date</th>
                    <th className="pb-3 text-start">Operation</th>
                    <th className="pb-3 text-start">Method</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-end pr-4">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                  {walletInfo?.transactions?.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 transition-all duration-150">
                      <td className="py-3 text-start text-xs text-gray-400">
                        {new Date(t.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                      </td>
                      <td className="py-3 text-start text-white">{getTransactionTypeLabel(t.type, t.details)}</td>
                      <td className="py-3 text-start text-xs font-mono">{t.paymentMethod}</td>
                      <td className="py-3 flex justify-center items-center">{getStatusBadge(t.status)}</td>
                      <td className={`py-3 text-end pr-4 font-mono font-bold ${
                        t.type === 'WITHDRAWAL' || (t.type === 'TRANSFER' && JSON.parse(t.details || '{}').action === 'SENT')
                          ? 'text-red-400' 
                          : 'text-emerald-400'
                      }`}>
                        {t.type === 'WITHDRAWAL' || (t.type === 'TRANSFER' && JSON.parse(t.details || '{}').action === 'SENT') ? '-' : '+'}
                        ${Number(t.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  {walletInfo?.transactions?.length === 0 && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">
                        No transactions recorded in your ledger statement.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
