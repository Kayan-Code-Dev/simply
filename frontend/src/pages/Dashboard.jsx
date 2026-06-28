import React, { useState, useEffect } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../utils/useTranslation';
import { walletApi, teamApi, packageApi, authApi, newsApi, ticketApi, settingsApi } from '../services/api';
import WalletPage from './Wallet';
import Team from './Team';
import Challenges from './Challenges';
import Pooling from './Pooling';
import KycVerification from './KycVerification';
import { 
  TrendingUp, ArrowUpRight, ArrowDownLeft, Copy, AlertTriangle, 
  Wallet, Users, DollarSign, Award, ShieldCheck, GraduationCap, 
  Globe, History, Lock, Mail, MessageSquare, Settings, Save, 
  AlertCircle, Check, Info, PlusCircle, Target, BookOpen, UserCheck, Calendar, X,
  Download, Eye, Video, Image, FileText, Newspaper, Bookmark
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const { t, language, dir } = useTranslation();
  const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
  const [walletInfo, setWalletInfo] = useState(null);
  const [teamInfo, setTeamInfo] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [walletPin, setWalletPin] = useState('');
  const [confirmTransferOpen, setConfirmTransferOpen] = useState(false);
  const [pinStatus, setPinStatus] = useState({ hasPinSet: false });

  // Tab dynamic states
  const [commissions, setCommissions] = useState([]);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [legsData, setLegsData] = useState(null);
  const [tickets, setTickets] = useState([]);

  // News Center States
  const [newsItems, setNewsItems] = useState([]);
  const [activeNewsFilter, setActiveNewsFilter] = useState('LATEST');
  const [newsLoading, setNewsLoading] = useState(false);

  const fetchNews = async () => {
    setNewsLoading(true);
    try {
      const params = {};
      if (activeNewsFilter !== 'LATEST') {
        params.category = activeNewsFilter;
      }
      const res = await newsApi.getAll(params);
      setNewsItems(res.data);
    } catch (err) {
      console.error('Error fetching news:', err);
    } finally {
      setNewsLoading(false);
    }
  };
  
  // Forms for Support & Profile & Purchase
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Purchase Package Modal
  const [selectedPkgToBuy, setSelectedPkgToBuy] = useState(null);
  const [purchaseMethod, setPurchaseMethod] = useState('STRIPE');
  const [receiptRef, setReceiptRef] = useState('');

  const fetchDashboardData = async () => {
    try {
      const walletRes = await walletApi.getInfo();
      setWalletInfo(walletRes.data);
      const teamRes = await teamApi.getTree();
      setTeamInfo(teamRes.data);
      const pinRes = await walletApi.getPinStatus();
      setPinStatus(pinRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  const [gateways, setGateways] = useState({
    stripe: { enabled: true, publishableKey: '' },
    paypal: { enabled: true, clientId: '' },
    payoneer: { enabled: true, email: '' },
    manual: { enabled: true, iban: '', accountName: '' }
  });

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
    } catch (err) {
      console.error('Error fetching gateway settings:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchGateways();
  }, []);

  useEffect(() => {
    if (tab === 'earnings') {
      walletApi.getCommissions()
        .then(res => setCommissions(res.data))
        .catch(err => console.error(err));
    }
    if (tab === 'packages') {
      packageApi.getUniversities()
        .then(res => {
          const flattened = res.data.reduce((acc, uni) => {
            return [...acc, ...(uni.packages || []).map(p => ({ ...p, universityName: uni.name }))];
          }, []);
          setAvailablePackages(flattened);
        })
        .catch(err => console.error(err));
    }
    if (tab === 'ranks') {
      teamApi.getLegs()
        .then(res => setLegsData(res.data))
        .catch(err => console.error(err));
    }
    if (tab === 'support') {
      setLoading(true);
      ticketApi.getTickets()
        .then(res => {
          setTickets(res.data);
          setError(null);
        })
        .catch(err => {
          console.error('Error fetching tickets:', err);
          setError('Failed to load tickets.');
        })
        .finally(() => setLoading(false));
    }
    if (tab === 'news') {
      fetchNews();
    }
  }, [tab, user, activeNewsFilter]);

  const copyReferralLink = () => {
    const link = `${window.location.origin}/register?ref=${user?.username || user?.id}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(link)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy referral link: ', err);
          fallbackCopyReferralLink(link);
        });
    } else {
      fallbackCopyReferralLink(link);
    }
  };

  const fallbackCopyReferralLink = (link) => {
    const textarea = document.createElement('textarea');
    textarea.value = link;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Fallback copy for referral link failed: ', err);
    }
    document.body.removeChild(textarea);
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || Number(depositAmount) <= 0) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await walletApi.deposit({
        amount: depositAmount,
        paymentMethod: depositMethod
      });
      setSuccess(res.data.message);
      setDepositAmount('');
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing deposit.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e?.preventDefault();
    if (!transferEmail || !transferAmount || Number(transferAmount) <= 0) return;
    if (!walletPin) {
      setError(language === 'ar' ? 'الرمز السري للمحفظة مطلوب.' : 'Wallet PIN is required.');
      return;
    }
    setLoading(true);
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
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing transfer.');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    if (!withdrawAmount || !withdrawBank || Number(withdrawAmount) < 15) return;
    setLoading(true);
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
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing withdrawal.');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await walletApi.activateAccount('STRIPE');
      setSuccess(res.data.message);
      fetchDashboardData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error activating account.');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPkgToBuy) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await packageApi.purchase({
        packageId: selectedPkgToBuy.id,
        paidAmount: parseFloat(selectedPkgToBuy.price),
        totalPrice: parseFloat(selectedPkgToBuy.price),
        paymentMethod: purchaseMethod,
        receiptReference: purchaseMethod === 'BANK_TRANSFER' ? receiptRef : undefined
      });
      setSuccess(res.data.message);
      setSelectedPkgToBuy(null);
      setReceiptRef('');
      
      // Sync auth state
      const meRes = await authApi.me();
      setUser(meRes.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing purchase.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await authApi.changePassword({
        currentPassword,
        newPassword
      });
      setSuccess(res.data.message);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Error changing password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setLoading(true);
    setError(null);
    try {
      const res = await ticketApi.getMessages(ticket.id);
      setMessages(res.data.messages);
    } catch (err) {
      console.error(err);
      setError('Failed to load conversation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    setLoading(true);
    setError(null);
    try {
      const res = await ticketApi.sendMessage(selectedTicket.id, { message: replyText });
      setMessages(prev => [...prev, res.data]);
      setReplyText('');
      // Reopen in local state if it was resolved
      if (selectedTicket.status === 'RESOLVED') {
        setSelectedTicket({ ...selectedTicket, status: 'PENDING' });
        ticketApi.getTickets().then(r => setTickets(r.data)).catch(console.error);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to send message.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!ticketSubject || !ticketMessage) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await ticketApi.createTicket({
        subject: ticketSubject,
        message: ticketMessage
      });
      setSuccess('Support ticket submitted successfully!');
      setTicketSubject('');
      setTicketMessage('');
      
      const ticketsRes = await ticketApi.getTickets();
      setTickets(ticketsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error submitting ticket.');
    } finally {
      setLoading(false);
    }
  };

  // Form states from original deposit/withdraw (kept for home view compatibility)
  const [transferEmail, setTransferEmail] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('STRIPE');
  const [withdrawMethod, setWithdrawMethod] = useState('BANK_TRANSFER');

  // Ranks progression details
  const rankProgression = [
    { name: 'DISTRIBUTOR', volume: 0 },
    { name: 'STARTER_LEADER', volume: 1000 },
    { name: 'MANAGER_LEADER', volume: 5000 },
    { name: 'SILVER_LEADER', volume: 10000 },
    { name: 'GOLD', volume: 25000 },
    { name: 'PLATINUM', volume: 50000 },
    { name: 'RUBY', volume: 100000 },
    { name: 'DIAMOND', volume: 500000 },
    { name: 'BLACK_DIAMOND', volume: 1000000 }
  ];

  const currentRankIndex = rankProgression.findIndex(r => r.name === user?.rank);
  const nextRank = currentRankIndex !== -1 && currentRankIndex < rankProgression.length - 1
    ? rankProgression[currentRankIndex + 1]
    : null;

  // Chart data from original
  const chartData = walletInfo?.transactions
    ?.filter(t => t.status === 'COMPLETED' && ['DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'PACKAGE_PURCHASE'].includes(t.type))
    ?.slice(0, 10)
    ?.reverse()
    ?.map((t, idx) => ({
      name: new Date(t.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' }),
      Balance: Number(t.amount) * (t.type === 'WITHDRAWAL' ? -1 : 1)
    })) || [
      { name: '1 May', Balance: 0 },
      { name: '5 May', Balance: 200 },
      { name: '10 May', Balance: 500 },
      { name: '15 May', Balance: 1200 },
      { name: '20 May', Balance: 1800 }
    ];

  const chartKey = language === 'ar' ? 'الرصيد' : 'Balance';
  const chartDataWithLocalizedKeys = chartData.map(d => ({
    name: d.name,
    [chartKey]: d.Balance
  }));

  const activeTab = tab || 'home';
  const validTabs = [
    'home', 'wallet', 'earnings', 'packages', 'my-packages', 'team', 'ranks', 'tree', 'challenges', 'pooling', 'news', 'support', 'profile', 'kyc'
  ];

  if (tab && !validTabs.includes(tab)) {
    return <Navigate to="/dashboard/home" replace />;
  }

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6 max-w-6xl mx-auto font-sans text-start">
      {/* Notifications */}
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

      {/* KYC Alert Banner */}
      {user && (user.kycStatus === 'NOT_SUBMITTED' || user.kycStatus === 'REJECTED') && (
        <div className="flex flex-col md:flex-row items-center justify-between p-4 md:p-6 bg-red-500/10 border border-red-500/20 rounded-2xl md:rounded-3xl gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">
                {user.kycStatus === 'REJECTED' 
                  ? (t('kycAlertRejectedTitle') || 'Identity Verification Rejected') 
                  : (t('kycAlertTitle') || 'Verify Your Identity')}
              </h4>
              <p className="text-sm text-gray-400 mt-1">
                {user.kycStatus === 'REJECTED'
                  ? (t('kycAlertRejectedDesc') || 'Your verification was rejected. Please re-submit your documents to activate your account.')
                  : (t('kycAlertDesc') || 'Please complete identity verification (KYC) to activate your account and unlock withdrawals and transfers.')}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/dashboard/kyc')}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 transition-all duration-300 cursor-pointer text-sm shrink-0"
          >
            {t('kycVerifyNow') || 'Verify Now'}
          </button>
        </div>
      )}

      {/* Inactive Marketer Alert */}
      {walletInfo && !walletInfo.isActive && user && user.role === 'MARKETER' && (
        <div className="flex flex-col md:flex-row items-center justify-between p-4 md:p-6 bg-red-500/10 border border-red-500/20 rounded-2xl md:rounded-3xl gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Subscription Fee Due</h4>
              <p className="text-sm text-gray-400 mt-1">Your marketing account is currently INACTIVE. Please deposit at least $10 to your wallet. The monthly subscription fee will be deducted automatically to reactivate your account.</p>
            </div>
          </div>
          <button
            onClick={() => {
              navigate('/dashboard/wallet');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-500/20 transition-all duration-300 cursor-pointer text-sm shrink-0"
          >
            Deposit Funds
          </button>
        </div>
      )}

      {/* Dynamic Tab Renderer */}
      {activeTab === 'home' && (
        <>
          {/* Referral Link & Overview Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 md:p-6 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl gap-4">
            <div>
              <h2 className="text-2xl font-bold text-white">{t('dashboardStatsTitle')}</h2>
              <p className="text-xs text-gray-500 mt-1">{t('dashboardStatsSubtitle')}</p>
            </div>
            
            {/* Referral Copy Section */}
            <div className="flex items-center gap-2 bg-dark-bg border border-dark-border px-4 py-2.5 rounded-2xl w-full md:w-auto justify-between">
              <button
                onClick={copyReferralLink}
                className="p-2 hover:bg-white/5 rounded-xl transition-all duration-200 text-primary cursor-pointer"
                title="Copy Link"
              >
                <Copy className="h-4 w-4" />
              </button>
              <span className="text-xs text-emerald-400 font-semibold">{copied ? t('copied') : ''}</span>
              <span className="text-xs text-gray-400 ltr select-all truncate max-w-xs block mx-2 font-mono font-semibold">
                {`${window.location.origin}/register?ref=${user?.username || user?.id}`}
              </span>
              <span className="text-xs text-gray-500 font-medium">{t('referralLink')}</span>
            </div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              { title: t('walletBalance'), value: `$${Number(walletInfo?.wallet?.balance || 0).toLocaleString()}`, icon: Wallet, color: 'text-primary' },
              { title: t('totalEarned'), value: `$${Number(walletInfo?.wallet?.totalEarned || 0).toLocaleString()}`, icon: DollarSign, color: 'text-emerald-400' },
              { title: t('directReferrals'), value: teamInfo?.directCount || 0, icon: Users, color: 'text-blue-400' },
              { title: t('totalDownline'), value: teamInfo?.totalDownline || 0, icon: Users, color: 'text-purple-400' }
            ].map((kpi, idx) => {
              const Icon = kpi.icon;
              return (
                <div key={idx} className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 flex items-center justify-between shadow-xl">
                  <div>
                    <p className="text-sm font-semibold text-gray-500">{kpi.title}</p>
                    <h3 className="text-2xl font-bold text-white mt-2 font-mono">{kpi.value}</h3>
                  </div>
                  <div className={`h-12 w-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center ${kpi.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Middle Grid: Charts & Operations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            
            {/* Performance Chart */}
            <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl flex flex-col justify-between min-h-[350px]">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs text-gray-500 font-medium">{t('lastTransactions')}</span>
                <h4 className="text-lg font-bold text-white">{t('financialAnalysis')}</h4>
              </div>
              <div className="flex-1 h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartDataWithLocalizedKeys}>
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                    <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#12131a', border: '1px solid #1e202f', borderRadius: '12px' }} />
                    <Line type="monotone" dataKey={chartKey} stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Deposit Form */}
            <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="text-lg font-bold text-white mb-2">{t('depositFunds')}</h4>
                <p className="text-xs text-gray-500 mb-6 font-medium">{t('depositDesc')}</p>
              </div>

              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">{t('amountLabel')}</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">{t('paymentMethodLabel')}</label>
                  <select
                    value={depositMethod}
                    onChange={(e) => setDepositMethod(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary font-semibold"
                  >
                    {gateways.stripe?.enabled && <option value="STRIPE">Stripe / Credit Card</option>}
                    {gateways.paypal?.enabled && <option value="PAYPAL">PayPal</option>}
                    {gateways.payoneer?.enabled && <option value="PAYONEER">Payoneer</option>}
                    {gateways.manual?.enabled && <option value="BANK_TRANSFER">Bank Transfer (Manual)</option>}
                  </select>
                </div>

                {depositMethod === 'PAYONEER' && gateways.payoneer?.enabled && (
                  <div className="p-3 bg-dark-bg border border-dark-border rounded-xl space-y-1 text-xs">
                    <span className="text-gray-400 font-semibold block uppercase tracking-wider">Payoneer Account</span>
                    <p className="text-white font-mono select-all font-semibold">{gateways.payoneer.email || 'payoneer@simply.com'}</p>
                  </div>
                )}

                {depositMethod === 'BANK_TRANSFER' && gateways.manual?.enabled && (
                  <div className="p-3 bg-dark-bg border border-dark-border rounded-xl space-y-2 text-xs">
                    <span className="text-gray-400 font-semibold block uppercase tracking-wider">Bank Details</span>
                    <div className="space-y-1">
                      <p><span className="text-gray-500">Name:</span> <span className="text-white font-bold">{gateways.manual.accountName || 'Simply Central Bank'}</span></p>
                      <p><span className="text-gray-500">IBAN:</span> <span className="text-white font-mono font-bold select-all">{gateways.manual.iban || 'AE600000001234567890123'}</span></p>
                    </div>
                  </div>
                )}

                {depositMethod === 'BANK_TRANSFER' && gateways.manual?.enabled && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">{t('receiptReferenceLabel') || 'Receipt Reference'}</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter reference number"
                      value={receiptReference}
                      onChange={(e) => setReceiptReference(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 cursor-pointer text-sm"
                >
                  {loading ? 'Processing...' : t('depositSubmit')}
                </button>
              </form>
            </div>
          </div>

          {/* Payout & Transfer Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
            
            {/* Internal Transfer */}
            <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl">
              <h4 className="text-lg font-bold text-white mb-2">{t('internalTransfer')}</h4>
              <p className="text-xs text-gray-500 mb-6 font-medium">{t('transferDesc')}</p>

              {!pinStatus.hasPinSet ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium space-y-3">
                  <p>
                    {language === 'ar' 
                      ? 'يجب تعيين الرقم السري للمحفظة أولاً قبل إجراء أي تحويل مالي.' 
                      : 'You must set a Wallet Security PIN before making balance transfers.'}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {language === 'ar'
                      ? 'يرجى الانتقال إلى صفحة المحفظة الرقمية لتعيين رمزك السري.'
                      : 'Please go to the Wallet page to set your security PIN.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setConfirmTransferOpen(true); }} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">{t('transferAmount')}</label>
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        value={transferAmount}
                        disabled={confirmTransferOpen}
                        onChange={(e) => setTransferAmount(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">{t('recipientEmail')}</label>
                      <input
                        type="email"
                        required
                        placeholder="example@mail.com"
                        value={transferEmail}
                        disabled={confirmTransferOpen}
                        onChange={(e) => setTransferEmail(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary ltr"
                      />
                    </div>
                  </div>

                  {confirmTransferOpen ? (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl space-y-3">
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
                          disabled={loading || !walletPin}
                          className="flex-1 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                        >
                          {loading ? 'Sending...' : 'Confirm'}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setConfirmTransferOpen(false); setWalletPin(''); }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-lg border border-white/10 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading || !walletInfo?.isActive}
                      className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all duration-300 cursor-pointer text-sm disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : t('transferSubmit')}
                    </button>
                  )}
                </form>
              )}
            </div>

            {/* Withdrawal Form */}
            <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl">
              <h4 className="text-lg font-bold text-white mb-2">{t('withdrawTitle')}</h4>
              <p className="text-xs text-gray-500 mb-6 font-medium">{t('withdrawDesc')}</p>

              <form onSubmit={handleWithdrawal} className="space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">{t('withdrawAmount')}</label>
                      <input
                        type="number"
                        placeholder="Min $15"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">{t('withdrawMethodLabel') || 'Withdrawal Method'}</label>
                      <select
                        value={withdrawMethod}
                        onChange={(e) => setWithdrawMethod(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary font-semibold"
                      >
                        <option value="BANK_TRANSFER">{t('bankTransferOpt') || 'Bank Transfer (Manual)'}</option>
                        <option value="PAYONEER">{t('payoneerOpt') || 'Payoneer (Automatic)'}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">
                      {withdrawMethod === 'PAYONEER'
                        ? (t('payoneerEmailLabel') || 'Payoneer Email Address')
                        : (t('bankDetailsLabel') || 'Bank Details / IBAN')}
                    </label>
                    <input
                      type={withdrawMethod === 'PAYONEER' ? 'email' : 'text'}
                      placeholder={withdrawMethod === 'PAYONEER' ? 'your-payoneer@email.com' : 'IBAN & Bank Details'}
                      value={withdrawBank}
                      onChange={(e) => setWithdrawBank(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !walletInfo?.isActive}
                  className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all duration-300 cursor-pointer text-sm disabled:opacity-50"
                >
                  {loading ? 'Processing...' : t('withdrawSubmit')}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {activeTab === 'wallet' && <WalletPage />}

      {activeTab === 'earnings' && (
        <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 md:space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white">{t('earnings') || 'My Earnings'}</h3>
              <p className="text-xs text-gray-500 mt-1">Detailed history of all referral, generation network commission, and rank achievement payouts</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-2xl">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider block">Total Earned</span>
              <span className="text-lg font-black text-emerald-400 font-mono mt-0.5 block">
                ${Number(walletInfo?.wallet?.totalEarned || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-start border-collapse">
              <thead>
                <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                  <th className="pb-3 text-start">Date</th>
                  <th className="pb-3 text-start">Earning Type</th>
                  <th className="pb-3 text-start">Source / Member</th>
                  <th className="pb-3 text-end pr-4">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                {[
                  ...commissions.map(c => ({
                    id: `c-${c.id}`,
                    createdAt: c.createdAt,
                    type: 'COMMISSION',
                    commType: c.type,
                    level: c.level,
                    buyerName: c.buyer?.name || 'Network Member',
                    amount: c.amount
                  })),
                  ...(walletInfo?.transactions?.filter(t => t.type === 'RANK_BONUS' && t.status === 'COMPLETED') || []).map(b => {
                    const details = JSON.parse(b.details || '{}');
                    return {
                      id: `b-${b.id}`,
                      createdAt: b.createdAt,
                      type: 'RANK_BONUS',
                      commType: details.rank || 'RANK_BONUS',
                      buyerName: 'System Reward',
                      amount: b.amount
                    };
                  })
                ].sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt)).map((comm) => (
                  <tr key={comm.id} className="hover:bg-white/5 transition duration-150">
                    <td className="py-4 text-start text-xs text-gray-400 font-mono">
                      {new Date(comm.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 text-start">
                      {comm.type === 'COMMISSION' ? (
                        <span className={`px-2 py-0.5 text-xs rounded-lg ${
                          comm.commType === 'DIRECT' ? 'bg-primary/25 text-primary border border-primary/20' : 'bg-blue-600/20 text-blue-400 border border-blue-500/25'
                        }`}>
                          {comm.commType === 'DIRECT' ? 'Direct Commission' : `Generation Level ${comm.level || ''}`}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-bold">
                          {comm.commType.replace(/_/g, ' ')} Bonus
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-start font-semibold text-white">
                      {comm.buyerName}
                    </td>
                    <td className="py-4 text-end pr-4 font-mono font-bold text-emerald-400">
                      +${Number(comm.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {commissions.length === 0 && !(walletInfo?.transactions?.some(t => t.type === 'RANK_BONUS' && t.status === 'COMPLETED')) && (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-gray-500">
                      No earnings recorded yet. Grow your downline team to start earning!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'packages' && (
        <div className="space-y-4 md:space-y-6">
          <div className="p-4 md:p-6 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl">
            <h3 className="text-xl font-bold text-white">{t('packages') || 'Study Packages'}</h3>
            <p className="text-xs text-gray-500 mt-1">Enroll in our professional academic universities to unlock courses and earn maximum dynamic tree payouts</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {availablePackages.map((pkg) => {
              const isOwned = user.userPackages?.some(up => up.packageId === pkg.id);
              return (
                <div key={pkg.id} className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl flex flex-col justify-between hover:border-primary/45 transition-all duration-300 relative overflow-hidden group">
                  {isOwned && (
                    <div className="absolute top-0 right-0 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 z-10">
                      <Check className="h-3 w-3" />
                      <span>Enrolled</span>
                    </div>
                  )}
                  {/* Package Image */}
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-dark-bg mb-4">
                    {pkg.imageUrl ? (
                      <img
                        src={`${apiBaseUrl}${pkg.imageUrl}`}
                        alt={pkg.name}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="h-8 w-8 text-gray-700" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-4 text-start">
                    <div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">{pkg.universityName}</span>
                      <h4 className="text-lg font-bold text-white mt-1">{pkg.name}</h4>
                    </div>
                    <p className="text-2xl font-black text-emerald-400 font-mono">${Number(pkg.price).toFixed(2)}</p>
                    <div className="text-xs text-gray-400 space-y-2 border-t border-dark-border/40 pt-4">
                      <p className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <span>Full Dynamic Course Curriculum Access</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span>Exempts you from monthly Marketer fees</span>
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => !isOwned && setSelectedPkgToBuy(pkg)}
                    disabled={isOwned}
                    className={`w-full mt-6 py-2.5 rounded-xl font-bold transition text-xs cursor-pointer ${
                      isOwned 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default' 
                        : 'bg-primary hover:bg-primary-hover text-white shadow-md'
                    }`}
                  >
                    {isOwned ? 'Already Purchased' : 'Enroll Now'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'my-packages' && (
        <div className="space-y-4 md:space-y-6">
          <div className="p-4 md:p-6 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl">
            <h3 className="text-xl font-bold text-white">{t('myPackages') || 'My Packages'}</h3>
            <p className="text-xs text-gray-500 mt-1">Review your enrolled educational courses and package certification status</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {user.userPackages?.map((up) => (
              <div key={up.id} className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 text-start relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase block">Certified Enrollment</span>
                    <h4 className="text-lg font-bold text-white mt-0.5">{up.package?.name || 'Study Package'}</h4>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg uppercase">
                    {up.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-dark-border/40 pt-4 text-xs text-gray-400 font-medium">
                  <div>
                    <span>Purchase Date:</span>
                    <p className="text-white font-mono mt-0.5">{new Date(up.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span>Price Paid:</span>
                    <p className="text-white font-mono mt-0.5">${Number(up.paidAmount).toFixed(2)}</p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between text-xs font-semibold">
                  <span className="text-gray-400">Course Materials & Lectures:</span>
                  <a 
                    href="#courses" 
                    onClick={(e) => { e.preventDefault(); setSuccess('Course platform links loaded.'); }}
                    className="text-primary hover:underline"
                  >
                    Access Study Vault
                  </a>
                </div>
              </div>
            ))}
            {(!user.userPackages || user.userPackages.length === 0) && (
              <div className="col-span-full py-16 text-center bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl">
                <GraduationCap className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                <h3 className="text-lg font-bold text-white">No Packages Owned</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">Purchase a package from the Academic Programs tab to unlock your curriculum and marketing benefits.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'team' && <Team view="legs" />}

      {activeTab === 'ranks' && (
        <div className="space-y-6 md:space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
            <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 md:space-y-6 text-start flex flex-col justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{t('ranks') || 'Leader Ranks'}</h3>
                <p className="text-xs text-gray-500 mt-1">MLM tree rank qualification constraints and required performance volume</p>
              </div>

              <div className="bg-dark-bg/60 border border-dark-border rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-primary/20 border border-primary/30 rounded-2xl flex items-center justify-center text-primary">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Your Current Rank</span>
                    <h4 className="text-base font-extrabold text-white mt-0.5 uppercase">{user?.rank}</h4>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Total Network Volume</span>
                  <h4 className="text-lg font-black text-white font-mono mt-0.5">${Number(legsData?.totalTeamPaid || 0).toLocaleString()}</h4>
                </div>
              </div>

              {nextRank ? (
                <div className="space-y-3 pt-4 border-t border-dark-border/40">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="text-gray-400">Next Target: <span className="text-white uppercase font-bold">{nextRank.name}</span></span>
                    <span className="text-gray-500 font-mono">
                      ${(legsData?.totalTeamPaid || 0).toLocaleString()} / ${nextRank.volume.toLocaleString()}
                    </span>
                  </div>

                  <div className="w-full bg-dark-bg rounded-full h-3 overflow-hidden border border-dark-border">
                    <div 
                      className="bg-gradient-to-r from-primary to-blue-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min(100, Math.round(((legsData?.totalTeamPaid || 0) / nextRank.volume) * 100))}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                    <span>{Math.min(100, Math.round(((legsData?.totalTeamPaid || 0) / nextRank.volume) * 100))}% Completed</span>
                    <span>Need ${(nextRank.volume - (legsData?.totalTeamPaid || 0)).toLocaleString()} more volume</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl text-center">
                  🎉 Congratulations! You have achieved the highest leadership rank in the system!
                </div>
              )}
            </div>

            <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 text-start">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-dark-border/40 pb-2">Ranks Structure</h4>
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2">
                {rankProgression.map((rankItem) => {
                  const isAchieved = rankProgression.findIndex(r => r.name === rankItem.name) <= rankProgression.findIndex(r => r.name === user?.rank);
                  return (
                    <div key={rankItem.name} className="flex justify-between items-center p-3 bg-dark-bg/40 border border-dark-border rounded-xl">
                      <span className={`text-xs font-semibold ${isAchieved ? 'text-white' : 'text-gray-500'}`}>{rankItem.name}</span>
                      <span className={`text-xs font-mono font-bold ${isAchieved ? 'text-emerald-400' : 'text-gray-500'}`}>
                        {isAchieved ? 'Achieved' : `$${rankItem.volume.toLocaleString()}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Achieved Ranks & Cash Bonuses History */}
          <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 text-start">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider border-b border-dark-border/40 pb-2">
              {t('rankHistoryTitle') || 'Achieved Ranks & Bonuses History'}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse" dir={dir}>
                <thead>
                  <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                    <th className="pb-3 text-start">{t('tablePaymentDate') || 'Payment Date'}</th>
                    <th className="pb-3 text-start">{t('tableAchievedRank') || 'Achieved Rank'}</th>
                    <th className="pb-3 text-end pr-4">{t('tableCashBonus') || 'Cash Bonus'}</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                  {walletInfo?.transactions
                    ?.filter(trans => trans.type === 'RANK_BONUS' && trans.status === 'COMPLETED')
                    ?.map((trans) => {
                      const details = JSON.parse(trans.details || '{}');
                      const rankName = details.rank || 'N/A';
                      return (
                        <tr key={trans.id} className="hover:bg-white/5 transition-all duration-150">
                          <td className="py-3 text-start text-xs text-gray-400 font-mono">
                            {new Date(trans.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                          </td>
                          <td className="py-3 text-start text-white font-bold uppercase">
                            {rankName.replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 text-end pr-4 font-mono font-bold text-emerald-400">
                            +${Number(trans.amount).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  {(walletInfo?.transactions?.filter(trans => trans.type === 'RANK_BONUS' && trans.status === 'COMPLETED').length || 0) === 0 && (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-gray-500 text-xs">
                        {t('noRanksAchieved') || 'No rank bonuses have been paid to you yet.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tree' && <Team view="tree" />}

      {activeTab === 'challenges' && <Challenges />}

      {activeTab === 'pooling' && <Pooling />}

      {activeTab === 'news' && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center p-4 md:p-6 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl">
            <h3 className="text-xl font-bold text-white">{t('mediaCenter') || 'News Center'}</h3>
            <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
              <Globe className="h-5 w-5" />
            </div>
          </div>

          {/* Filter Navigation Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-2">
            {[
              { id: 'LATEST', label: 'Latest', icon: Globe },
              { id: 'NEWS', label: '@News', icon: Newspaper },
              { id: 'ARTICLES', label: 'Articles', icon: BookOpen },
              { id: 'VIDEOS', label: 'Videos', icon: Video },
              { id: 'IMAGES', label: 'Images', icon: Image },
              { id: 'PDF', label: 'PDF', icon: FileText },
              { id: 'FEATURED', label: 'Featured', icon: Bookmark }
            ].map((tabItem) => {
              const Icon = tabItem.icon;
              const isActive = activeNewsFilter === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  onClick={() => setActiveNewsFilter(tabItem.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/25'
                      : 'bg-dark-card border border-dark-border text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tabItem.label}</span>
                </button>
              );
            })}
          </div>

          {/* Grid of Cards */}
          {newsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newsItems.map((item) => (
                <div key={item.id} className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl overflow-hidden shadow-xl hover:border-primary/45 transition-all duration-300 flex flex-col justify-between group">
                  <div className="relative overflow-hidden aspect-video bg-dark-bg">
                    <img
                      src={item.imageUrl ? `${apiBaseUrl}${item.imageUrl}` : "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop"}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition duration-500"
                    />
                    <span className={`absolute top-4 right-4 text-[10px] font-extrabold px-3 py-1 rounded-xl uppercase tracking-wider ${
                      item.category === 'ARTICLES' ? 'bg-purple-600/90 text-white' :
                      item.category === 'VIDEOS' ? 'bg-blue-600/90 text-white' :
                      item.category === 'IMAGES' ? 'bg-emerald-600/90 text-white' :
                      item.category === 'PDF' ? 'bg-orange-600/90 text-white' :
                      'bg-indigo-600/90 text-white'
                    }`}>
                      {item.category}
                    </span>
                  </div>

                  <div className="p-4 md:p-6 flex-1 flex flex-col justify-between space-y-4 text-start">
                    <div className="space-y-2">
                      <h4 className="font-extrabold text-white text-base leading-snug group-hover:text-primary transition duration-300">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed whitespace-pre-line">
                        {item.content}
                      </p>
                    </div>

                    <div className="border-t border-dark-border/40 pt-4 flex flex-col space-y-3">
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono font-semibold">
                        <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          <span>{item.views}</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center gap-3">
                        <div>
                          {item.isFeatured && (
                            <span className="inline-block text-[9px] font-extrabold px-2.5 py-1 bg-pink-500/10 border border-pink-500/20 text-pink-400 rounded-lg uppercase tracking-wider">
                              Featured
                            </span>
                          )}
                        </div>

                        {item.fileUrl && (
                          <a
                            href={`${apiBaseUrl}${item.fileUrl}`}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => {
                              // Trigger view count increment quietly
                              newsApi.getById(item.id).catch(err => console.error(err));
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-xl text-[10px] font-bold hover:bg-primary hover:text-white transition duration-200"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download File</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {newsItems.length === 0 && (
                <div className="col-span-full py-16 text-center bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl">
                  <Globe className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                  <h4 className="text-sm font-bold text-white">No announcements found</h4>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">There are no updates in this category at the moment. Check back later.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'support' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {selectedTicket ? (
            <div className="lg:col-span-3 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl flex flex-col h-[600px]">
              <div className="flex justify-between items-center border-b border-dark-border/40 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="p-2 hover:bg-white/5 rounded-xl border border-dark-border text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    <ArrowDownLeft className="h-4 w-4 rotate-45" />
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-gray-500">#{selectedTicket.ticketId}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                        selectedTicket.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {selectedTicket.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">{selectedTicket.subject}</h3>
                  </div>
                </div>
                {selectedTicket.status === 'RESOLVED' && (
                  <span className="text-xs text-gray-500 italic">This ticket is resolved. Sending a reply will reopen it.</span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 text-start flex flex-col">
                {messages.map((msg) => {
                  const isAdmin = msg.sender?.role === 'ADMIN';
                  return (
                    <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] text-gray-500 font-bold">
                          {msg.sender?.name || (isAdmin ? 'Admin' : 'You')}
                        </span>
                        <span className="text-[9px] text-gray-600 font-mono">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-medium ${
                        isAdmin 
                          ? 'bg-dark-bg border border-dark-border text-gray-200 rounded-tl-none' 
                          : 'bg-primary text-white rounded-tr-none'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendReply} className="flex gap-2 border-t border-dark-border/40 pt-4">
                <input
                  type="text"
                  required
                  placeholder="Type your response here..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 text-sm cursor-pointer"
                >
                  Send
                </button>
              </form>
            </div>
          ) : (
            <>
              <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 md:space-y-6">
                <div>
                  <h3 className="text-xl font-bold text-white">{t('support') || 'Support Tickets'}</h3>
                  <p className="text-xs text-gray-500 mt-1">List of your created support tickets and their resolving status</p>
                </div>

                <div className="space-y-4">
                  {tickets.map((tkt) => (
                    <div 
                      key={tkt.id} 
                      onClick={() => handleSelectTicket(tkt)}
                      className="p-4 bg-dark-bg/60 border border-dark-border hover:border-primary/45 rounded-2xl text-start space-y-3 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-mono text-[10px] text-gray-500 block">Ticket ID: #{tkt.ticketId}</span>
                          <span className="font-bold text-white text-sm block mt-0.5">{tkt.subject}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${
                          tkt.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        }`}>
                          {tkt.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed border-t border-dark-border/40 pt-2 font-medium truncate">
                        {tkt.messages && tkt.messages[0] ? tkt.messages[0].message : tkt.subject}
                      </p>
                    </div>
                  ))}
                  {tickets.length === 0 && (
                    <div className="py-12 text-center text-gray-500">
                      No support tickets submitted. Click create ticket to request admin assistance.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">Create Ticket</h4>
                  <p className="text-xs text-gray-500 mb-6 font-medium">Explain your ledger withdrawal issues or university program enrollments</p>
                </div>
                <form onSubmit={handleCreateTicket} className="space-y-4 text-start">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Subject / Topic</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bank Transfer receipt verification"
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Message Details</label>
                    <textarea
                      required
                      placeholder="Specify your account issue..."
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      rows="4"
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 text-sm cursor-pointer"
                  >
                    Submit Ticket
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 md:space-y-6 text-start">
            <div>
              <h3 className="text-xl font-bold text-white">{t('profile') || 'My Profile'}</h3>
              <p className="text-xs text-gray-500 mt-1">Review your MLM network roles, certifications, and active sponsor links</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Full Name</span>
                <p className="text-sm font-bold text-white mt-0.5">{user?.name}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Email Address</span>
                <p className="text-sm font-bold text-white mt-0.5 ltr">{user?.email}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Network Role</span>
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-bold rounded-lg border border-primary/30 mt-1 inline-block">
                  {user?.role === 'STUDENT' ? 'STUDENT MEMBER' : 'BUSINESS PARTNER'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Certified Rank</span>
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 mt-1 inline-block animate-pulse">
                  {user?.rank}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Sponsor ID Link</span>
                <p className="text-sm font-bold text-white mt-0.5 font-mono">#{user?.sponsorId || 'None (Direct Root Registration)'}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Registration Date</span>
                <p className="text-sm font-bold text-white mt-0.5 font-mono">{new Date(user?.joinedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl flex flex-col justify-between">
            <div>
              <h4 className="text-lg font-bold text-white mb-2">Change Password</h4>
              <p className="text-xs text-gray-500 mb-6 font-medium">Tweak your security credentials and set a new password</p>
            </div>
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-start">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 text-sm cursor-pointer"
              >
                {loading ? 'Processing...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'kyc' && <KycVerification />}

      {/* Dynamic Package Purchase confirmation modal */}
      {selectedPkgToBuy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 max-w-md w-full space-y-4 md:space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setSelectedPkgToBuy(null)} 
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white rounded-xl cursor-pointer transition duration-200"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-start">
              <h4 className="text-lg font-bold text-white">Enroll in Academic Program</h4>
              <p className="text-xs text-gray-500 mt-1">Enroll in {selectedPkgToBuy.name} for ${Number(selectedPkgToBuy.price).toFixed(2)}</p>
            </div>

            <form onSubmit={handlePurchaseSubmit} className="space-y-4 text-start">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Choose Payment Option</label>
                <select
                  value={purchaseMethod}
                  onChange={(e) => setPurchaseMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm cursor-pointer"
                >
                  <option value="STRIPE">Stripe / Credit Card</option>
                  <option value="PAYPAL">PayPal</option>
                  <option value="BANK_TRANSFER">Bank Transfer (Manual Verification)</option>
                </select>
              </div>

              {purchaseMethod === 'BANK_TRANSFER' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">Bank Transfer Receipt / Reference Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TXN-123456"
                    value={receiptRef}
                    onChange={(e) => setReceiptRef(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Please transfer ${Number(selectedPkgToBuy.price).toFixed(2)} to Simply Central Bank IBAN: AE600000001234567890123 and enter receipt reference.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 text-sm cursor-pointer"
              >
                {loading ? 'Processing...' : 'Confirm and Pay'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
