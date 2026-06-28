import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { adminApi, packageApi, newsApi, settingsApi } from '../services/api';
import { useTranslation } from '../utils/useTranslation';
import { useAuthStore } from '../store/authStore';
import { 
  ShieldAlert, ShieldCheck, UserCheck, DollarSign, FolderLock, Plus, RefreshCw, 
  Check, X, Sparkles, Users, Award, Trophy, Wallet, History, 
  TrendingUp, Sliders, Target, Megaphone, Gift, MessageSquare, 
  Palette, Image, Mail, FileText, Send, Folder, CreditCard, 
  FileSignature, Settings, HelpCircle, Save, Info, PlusCircle, AlertCircle,
  MoreVertical, Search, Lock, Download, Eye, Video, Newspaper, Bookmark, Trash2, Edit, LogIn, ArrowLeft, ArrowDownLeft
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import EditRankModal from '../components/admin/EditRankModal';
import Team from './Team';

export default function AdminPanel() {
  const { tab } = useParams();
  const { t, language, dir } = useTranslation();
  const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace('/api', '');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [activeActionMenu, setActiveActionMenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    if (isDetailsModalOpen && selectedUser && selectedUser.collectionPercentage === undefined) {
      adminApi.getUserStats(selectedUser.id).then(res => {
        setSelectedUser(prev => ({ ...prev, collectionPercentage: res.data.collectionPercentage }));
      }).catch(err => console.error('Failed to fetch user stats:', err));
    }
  }, [isDetailsModalOpen, selectedUser]);
  const [dbPackages, setDbPackages] = useState([]);
  const [disabledWithdrawalUsers, setDisabledWithdrawalUsers] = useState({});

  // Edit User Form States
  const [editEmail, setEditEmail] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPackageId, setEditPackageId] = useState('');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [pendingTrans, setPendingTrans] = useState([]);
  const [allTrans, setAllTrans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Challenge Form States
  const [challengesList, setChallengesList] = useState([]);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [isCreateChallengeModalOpen, setIsCreateChallengeModalOpen] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [challengeSales, setChallengeSales] = useState(10);
  const [challengeReward, setChallengeReward] = useState('TRAVEL');
  const [challengeLegLimit, setChallengeLegLimit] = useState(40);
  const [challengeStart, setChallengeStart] = useState('');
  const [challengeEnd, setChallengeEnd] = useState('');
  const [challengeIsActive, setChallengeIsActive] = useState(true);
  const [challengeImageFile, setChallengeImageFile] = useState(null);
  const [challengeRewardAmount, setChallengeRewardAmount] = useState('0');
  const [challengeRequiredDirects, setChallengeRequiredDirects] = useState('0');
  const [challengeDirectsType, setChallengeDirectsType] = useState('ANY');
  const [challengeRevenue, setChallengeRevenue] = useState('0');

  // Wallet manual adjustment
  const [adjustingUser, setAdjustingUser] = useState(null);
  const [adjAmount, setAdjAmount] = useState('');
  const [adjType, setAdjType] = useState('CREDIT');
  const [adjTarget, setAdjTarget] = useState('balance');
  const [adjDesc, setAdjDesc] = useState('');

  // Mock configs & custom controls states
  const [editingRank, setEditingRank] = useState(null);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [isCreateRankModalOpen, setIsCreateRankModalOpen] = useState(false);

  const [ranksList, setRanksList] = useState([
    { id: 1, name: 'DISTRIBUTOR', requiredStudents: 0, requiredPlatinumLegs: 0, commissionCap: '100%', status: 'ACTIVE', icon: '🏅' },
    { id: 2, name: 'STARTER_LEADER', requiredStudents: 2, requiredPlatinumLegs: 0, commissionCap: '100%', status: 'ACTIVE', icon: '🏅' },
    { id: 3, name: 'MANAGER_LEADER', requiredStudents: 4, requiredPlatinumLegs: 0, commissionCap: '100%', status: 'ACTIVE', icon: '🥇' },
    { id: 4, name: 'SILVER_LEADER', requiredStudents: 6, requiredPlatinumLegs: 0, commissionCap: '100%', status: 'ACTIVE', icon: '🥈' },
    { id: 5, name: 'GOLD', requiredStudents: 9, requiredPlatinumLegs: 0, commissionCap: '100%', status: 'ACTIVE', icon: '⭐' },
    { id: 6, name: 'PLATINUM', requiredStudents: 12, requiredPlatinumLegs: 0, commissionCap: '100%', status: 'ACTIVE', icon: '🔥' },
    { id: 7, name: 'RUBY', requiredStudents: 12, requiredPlatinumLegs: 2, commissionCap: '100%', status: 'ACTIVE', icon: '💎' },
    { id: 8, name: 'EMERALD', requiredStudents: 12, requiredPlatinumLegs: 4, commissionCap: '100%', status: 'ACTIVE', icon: '🌟' },
    { id: 9, name: 'DIAMOND', requiredStudents: 12, requiredPlatinumLegs: 6, commissionCap: '100%', status: 'ACTIVE', icon: '🏆' },
    { id: 10, name: 'BLUE_DIAMOND', requiredStudents: 12, requiredPlatinumLegs: 8, commissionCap: '100%', status: 'ACTIVE', icon: '💫' },
    { id: 11, name: 'BLACK_DIAMOND', requiredStudents: 12, requiredPlatinumLegs: 10, commissionCap: '100%', status: 'ACTIVE', icon: '👑' },
    { id: 12, name: 'LEGEND', requiredStudents: 12, requiredPlatinumLegs: 14, commissionCap: '100%', status: 'ACTIVE', icon: '👑' }
  ]);
  const [newRankName, setNewRankName] = useState('');
  const [newRankStudents, setNewRankStudents] = useState('');
  const [newRankPlatinumLegs, setNewRankPlatinumLegs] = useState('');
  const [newRankPayoutCap, setNewRankPayoutCap] = useState('100%');
  const [newRankStatus, setNewRankStatus] = useState('ACTIVE');

  // Financial Analytics Dashboard States
  const [financialStats, setFinancialStats] = useState(null);
  const [analyticsPreset, setAnalyticsPreset] = useState('last30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [emailSubTab, setEmailSubTab] = useState('smtp'); // 'smtp', 'templates', 'broadcast'

  // Email Templates Admin States
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateHtmlBody, setTemplateHtmlBody] = useState('');
  const [templateIsActive, setTemplateIsActive] = useState(true);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Email Broadcast Admin States
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastRecipientsType, setBroadcastRecipientsType] = useState('all'); // 'all', 'marketers', 'students', 'selected'
  const [broadcastSearchTerm, setBroadcastSearchTerm] = useState('');
  const [broadcastRoleFilter, setBroadcastRoleFilter] = useState('ALL'); // 'ALL', 'MARKETER', 'STUDENT'
  const [selectedBroadcastUserIds, setSelectedBroadcastUserIds] = useState([]);
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // News Center Admin States
  const [newsItems, setNewsItems] = useState([]);
  const [activeNewsFilter, setActiveNewsFilter] = useState('LATEST');
  const [newsLoading, setNewsLoading] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState(null);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState(false);
  const [newsFormTitle, setNewsFormTitle] = useState('');
  const [newsFormContent, setNewsFormContent] = useState('');
  const [newsFormCategory, setNewsFormCategory] = useState('NEWS');
  const [newsFormIsFeatured, setNewsFormIsFeatured] = useState(false);
  const [newsFormImageFile, setNewsFormImageFile] = useState(null);
  const [newsFormAttachedFile, setNewsFormAttachedFile] = useState(null);

  // Deposit Management States
  const [depositFilter, setDepositFilter] = useState('ALL');
  const [transactionStatusFilter, setTransactionStatusFilter] = useState('ALL');

  // KYC Approval States
  const [pendingKycUsers, setPendingKycUsers] = useState([]);
  const [kycLoading, setKycLoading] = useState(false);

  const fetchPendingKyc = async () => {
    setKycLoading(true);
    try {
      const res = await adminApi.getPendingKyc();
      setPendingKycUsers(res.data || []);
    } catch (err) {
      console.error('Error fetching pending KYC:', err);
      setError('Failed to fetch pending KYC requests.');
    } finally {
      setKycLoading(false);
    }
  };

  const handleApproveKyc = async (userId) => {
    setLoading(true);
    try {
      await adminApi.approveKyc(userId);
      setSuccess('KYC verified and account activated successfully.');
      fetchPendingKyc();
    } catch (err) {
      console.error('Error approving KYC:', err);
      setError(err.response?.data?.error || 'Failed to approve KYC.');
    } finally {
      setLoading(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    }
  };

  const handleRejectKyc = async (userId) => {
    setLoading(true);
    try {
      await adminApi.rejectKyc(userId);
      setSuccess('KYC verification rejected and documents reset.');
      fetchPendingKyc();
    } catch (err) {
      console.error('Error rejecting KYC:', err);
      setError(err.response?.data?.error || 'Failed to reject KYC.');
    } finally {
      setLoading(false);
      setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    }
  };

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

  // Admin Package Management States
  const [adminUniversities, setAdminUniversities] = useState([]);
  const [adminPackagesLoading, setAdminPackagesLoading] = useState(false);
  const [pkgFormName, setPkgFormName] = useState('');
  const [pkgFormPrice, setPkgFormPrice] = useState('');
  const [pkgFormDesc, setPkgFormDesc] = useState('');
  const [pkgFormUniId, setPkgFormUniId] = useState('');
  const [pkgFormImage, setPkgFormImage] = useState(null);
  const [editingPkg, setEditingPkg] = useState(null);
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);

  // Admin University Management States
  const [univFormName, setUnivFormName] = useState('');
  const [editingUniv, setEditingUniv] = useState(null);
  const [univLoading, setUnivLoading] = useState(false);

  const [generationCommissions, setGenerationCommissions] = useState(
    Array.from({ length: 20 }, (_, i) => ({ level: i + 1, rate: 20 }))
  );

  const [promisedPackages, setPromisedPackages] = useState([
    { id: 1, email: 'student1@mail.com', packageName: 'Starter Package', date: '2026-05-24', status: 'GRANTED' }
  ]);
  const [promiseEmail, setPromiseEmail] = useState('');
  const [promisePkgId, setPromisePkgId] = useState(1);

  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedAdminTicket, setSelectedAdminTicket] = useState(null);
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminReplyText, setAdminReplyText] = useState('');
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [newTicketUserId, setNewTicketUserId] = useState('');
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const [brandingSettings, setBrandingSettings] = useState({
    siteName: 'Simply.com',
    primaryColor: '#8b5cf6',
    backgroundColor: '#0a0b10',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=100&q=80'
  });

  const { setBranding } = useAuthStore();
  const [logoFile, setLogoFile] = useState(null);
  const [pwaFile, setPwaFile] = useState(null);

  const fetchBranding = async () => {
    try {
      const res = await settingsApi.getBranding();
      setBrandingSettings({
        siteName: res.data.siteName || 'Simply.com',
        primaryColor: res.data.primaryColor || '#8b5cf6',
        logoUrl: res.data.logoUrl || '',
        pwaUrl: res.data.pwaUrl || '',
        backgroundColor: '#0a0b10'
      });
    } catch (err) {
      console.error('Error fetching branding settings:', err);
    }
  };

  const handleSaveBranding = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      formData.append('siteName', brandingSettings.siteName);
      formData.append('primaryColor', brandingSettings.primaryColor);
      
      const res = await settingsApi.updateBranding(formData);
      setSuccess('Branding settings updated successfully.');
      setBrandingSettings(prev => ({
        ...prev,
        siteName: res.data.settings.siteName,
        primaryColor: res.data.settings.primaryColor,
        logoUrl: res.data.settings.logoUrl,
        pwaUrl: res.data.settings.pwaUrl
      }));
      setBranding(res.data.settings);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update branding settings.');
    }
  };

  const handleSaveAssets = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const formData = new FormData();
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      if (pwaFile) {
        formData.append('pwa', pwaFile);
      }
      
      const res = await settingsApi.updateBranding(formData);
      setSuccess('Creative assets updated successfully.');
      setBrandingSettings(prev => ({
        ...prev,
        logoUrl: res.data.settings.logoUrl,
        pwaUrl: res.data.settings.pwaUrl
      }));
      setBranding(res.data.settings);
      setLogoFile(null);
      setPwaFile(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to update creative assets.');
    }
  };

  const [emailSettings, setEmailSettings] = useState({
    smtpHost: 'smtp.simplymail.com',
    smtpPort: '465',
    smtpUser: 'noreply@simply.com',
    smtpPass: '••••••••••••••••'
  });

  const [paymentSettings, setPaymentSettings] = useState({
    stripe: { enabled: true, secretKey: '', publishableKey: '' },
    paypal: { enabled: true, clientId: '', clientSecret: '' },
    payoneer: { enabled: true, email: '' },
    manual: { enabled: true, iban: '', accountName: '' }
  });

  const handleSavePaymentSettings = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const res = await settingsApi.updatePaymentSettings(paymentSettings);
      setSuccess(res.data.message || 'Payment settings updated successfully.');
      setPaymentSettings(res.data.settings);
    } catch (err) {
      console.error('Error saving payment settings:', err);
      setError(err.response?.data?.error || 'Failed to update payment settings.');
    }
  };

  const [legalContent, setLegalContent] = useState({
    terms: 'Our terms and conditions regulate user investments, educational package licenses, and MLM leadership payouts.',
    privacy: 'Privacy policy description. We value user details and secure transactions.'
  });

  const fetchAdminData = async () => {
    try {
      const statsRes = await adminApi.getStats();
      setStats(statsRes.data);
      
      const usersRes = await adminApi.getUsers();
      setUsers(usersRes.data);

      const transRes = await adminApi.getPendingTransactions();
      setPendingTrans(transRes.data);

      const allTransRes = await adminApi.getAllTransactions();
      setAllTrans(allTransRes.data);

      try {
        const emailTemplatesRes = await adminApi.getEmailTemplates();
        setEmailTemplates(emailTemplatesRes.data);
      } catch (err) {
        console.error('Error fetching email templates:', err);
      }

      try {
        const pkgRes = await packageApi.getUniversities();
        const flattened = pkgRes.data.reduce((acc, uni) => {
          return [...acc, ...(uni.packages || [])];
        }, []);
        setDbPackages(flattened);
      } catch (pkgErr) {
        console.error('Error fetching packages:', pkgErr);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
      setError('Error loading administrative data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentSettings = async () => {
    try {
      const res = await settingsApi.getPaymentSettings();
      setPaymentSettings(res.data);
    } catch (err) {
      console.error('Error fetching payment settings:', err);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchBranding();
    fetchPaymentSettings();
  }, []);

  const fetchChallenges = async () => {
    try {
      const res = await adminApi.getChallenges();
      setChallengesList(res.data || []);
    } catch (err) {
      console.error('Error fetching challenges:', err);
    }
  };

  const fetchAdminPackages = async () => {
    setAdminPackagesLoading(true);
    try {
      const res = await adminApi.getPackages();
      setAdminUniversities(res.data || []);
    } catch (err) {
      console.error('Error fetching admin packages:', err);
    } finally {
      setAdminPackagesLoading(false);
    }
  };

  const fetchFinancialAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const params = { preset: analyticsPreset };
      if (analyticsPreset === 'custom') {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      }
      const res = await adminApi.getFinancialAnalytics(params);
      setFinancialStats(res.data);
    } catch (err) {
      console.error('Error fetching financial analytics:', err);
      setError('Error loading financial analytics.');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (tab === 'earnings') {
      fetchFinancialAnalytics();
    }
  }, [tab, analyticsPreset, customStartDate, customEndDate]);

  const fetchAdminTickets = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getTickets();
      setSupportTickets(res.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching admin tickets:', err);
      setError('Failed to fetch support tickets.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAdminTicket = async (ticket) => {
    setSelectedAdminTicket(ticket);
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getMessages(ticket.id);
      setAdminMessages(res.data.messages);
    } catch (err) {
      console.error(err);
      setError('Failed to load ticket messages.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!adminReplyText.trim() || !selectedAdminTicket) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.sendMessage(selectedAdminTicket.id, { message: adminReplyText });
      setAdminMessages(prev => [...prev, res.data]);
      setAdminReplyText('');
      fetchAdminTickets();
    } catch (err) {
      console.error(err);
      setError('Failed to send reply.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.updateTicketStatus(ticketId, { status: newStatus });
      setSuccess(`Ticket status updated to ${newStatus}.`);
      if (selectedAdminTicket && selectedAdminTicket.id === ticketId) {
        setSelectedAdminTicket(prev => ({ ...prev, status: newStatus.toUpperCase() }));
      }
      fetchAdminTickets();
    } catch (err) {
      console.error(err);
      setError('Failed to update status.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdminTicket = async (e) => {
    e.preventDefault();
    if (!newTicketUserId || !newTicketSubject || !newTicketMessage) {
      setError('All fields are required to open a ticket.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminApi.createTicket({
        userId: newTicketUserId,
        subject: newTicketSubject,
        message: newTicketMessage
      });
      setSuccess('Support ticket opened successfully.');
      setIsNewTicketModalOpen(false);
      setNewTicketUserId('');
      setNewTicketSubject('');
      setNewTicketMessage('');
      setUserSearchQuery('');
      fetchAdminTickets();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to open ticket.');
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    if (tab === 'news') {
      fetchNews();
    }
    if (tab === 'challenges') {
      fetchChallenges();
    }
    if (tab === 'packages' || tab === 'universities') {
      fetchAdminPackages();
    }
    if (tab === 'tickets') {
      fetchAdminTickets();
    }
    if (tab === 'kyc-approval') {
      fetchPendingKyc();
    }
  }, [tab, activeNewsFilter]);

  const getReferralCode = (id) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let seed = id * 997 + 104729;
    for (let i = 0; i < 6; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      code += chars[seed % chars.length];
    }
    return code;
  };

  const getPhoneNumber = (id) => {
    if (id % 10 === 0) {
      const first = (id * 2314 + 763) % 900 + 100;
      const second = (id * 7321 + 190) % 900000 + 100000;
      return `+212 ${first}-${second}`;
    }
    const chars = '0123456789';
    let num = '06';
    let seed = id * 56789 + 987654;
    for (let i = 0; i < 8; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      num += chars[seed % 10];
    }
    return num;
  };


  const formatRegDate = (dateString) => {
    const d = new Date(dateString);
    const day = d.getDate().toString().padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const getProfitWeeksVal = (user) => {
    if (!user || !user.joinedAt) return 0;
    const diffTime = Math.abs(new Date() - new Date(user.joinedAt));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeksPassed = Math.floor(diffDays / 7);
    return Math.min(52, Math.max(1, weeksPassed || (user.id % 12) + 2));
  };

  const getInvReturn = (user) => {
    if (!user) return 0;
    if (user.email && user.email.includes('assiadejital')) return 32.50;
    if (user.email && user.email.includes('zinebhamdl')) return 99.00;
    if (user.email && user.email.includes('mctanaturcl')) return 81.00;
    if (user.email && user.email.includes('motolabmaroc')) return 91.00;
    
    const activeInvestments = user.userPackages?.reduce((sum, pkg) => sum + Number(pkg.package?.price || 0), 0) || 0;
    if (activeInvestments === 0) return 0;
    return (activeInvestments * 0.05) + ((user.id * 7) % 30);
  };

  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminApi.updateUser(selectedUser.id, {
        email: editEmail,
        username: editUsername || undefined,
        password: editPassword || undefined,
        packageId: editPackageId ? parseInt(editPackageId) : undefined,
        status: editStatus
      });
      setSuccess(res.data.message);
      setIsEditModalOpen(false);
      setSelectedUser(null);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating user.');
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonate = async (userId) => {
    try {
      const res = await adminApi.impersonateUser(userId);
      localStorage.setItem('simply_token', res.data.token);
      window.location.href = '/dashboard';
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to login as user');
    }
  };

  // API Call wrappers
  const handleApproveTrans = async (id) => {
    setLoading(true);
    try {
      const res = await adminApi.approveTransaction(id);
      setSuccess(res.data.message);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error approving.');
      setLoading(false);
    }
  };

  const handleRejectTrans = async (id) => {
    setLoading(true);
    try {
      const res = await adminApi.rejectTransaction(id);
      setSuccess(res.data.message);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error rejecting.');
      setLoading(false);
    }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('title', challengeTitle);
    formData.append('description', challengeDesc || '');
    formData.append('targetSales', challengeSales);
    formData.append('rewardType', challengeReward);
    formData.append('performanceLevel', challengeLegLimit);
    formData.append('startDate', challengeStart);
    formData.append('endDate', challengeEnd);
    formData.append('rewardAmount', challengeRewardAmount);
    formData.append('requiredDirects', challengeRequiredDirects);
    formData.append('directsType', challengeDirectsType);
    formData.append('targetRevenue', challengeRevenue);
    if (challengeImageFile) {
      formData.append('image', challengeImageFile);
    }

    try {
      const res = await adminApi.createChallenge(formData);
      setSuccess(res.data.message);
      
      // Reset form
      setChallengeTitle('');
      setChallengeDesc('');
      setChallengeSales(10);
      setChallengeReward('TRAVEL');
      setChallengeLegLimit(40);
      setChallengeStart('');
      setChallengeEnd('');
      setChallengeRewardAmount('0');
      setChallengeRequiredDirects('0');
      setChallengeDirectsType('ANY');
      setChallengeRevenue('0');
      setChallengeImageFile(null);
      setIsCreateChallengeModalOpen(false);

      fetchAdminData();
      fetchChallenges();
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating challenge.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChallenge = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('title', challengeTitle);
    formData.append('description', challengeDesc || '');
    formData.append('targetSales', challengeSales);
    formData.append('rewardType', challengeReward);
    formData.append('performanceLevel', challengeLegLimit);
    formData.append('startDate', challengeStart);
    formData.append('endDate', challengeEnd);
    formData.append('isActive', challengeIsActive);
    formData.append('rewardAmount', challengeRewardAmount);
    formData.append('requiredDirects', challengeRequiredDirects);
    formData.append('directsType', challengeDirectsType);
    formData.append('targetRevenue', challengeRevenue);
    if (challengeImageFile) {
      formData.append('image', challengeImageFile);
    }

    try {
      const res = await adminApi.updateChallenge(editingChallenge.id, formData);
      setSuccess(res.data.message);
      setIsChallengeModalOpen(false);
      setEditingChallenge(null);

      // Reset
      setChallengeTitle('');
      setChallengeDesc('');
      setChallengeSales(10);
      setChallengeReward('TRAVEL');
      setChallengeLegLimit(40);
      setChallengeStart('');
      setChallengeEnd('');
      setChallengeRewardAmount('0');
      setChallengeRequiredDirects('0');
      setChallengeDirectsType('ANY');
      setChallengeRevenue('0');
      setChallengeImageFile(null);

      fetchChallenges();
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating challenge.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChallenge = async (id) => {
    if (!window.confirm('Are you sure you want to delete this challenge?')) return;
    setLoading(true);
    try {
      const res = await adminApi.deleteChallenge(id);
      setSuccess(res.data.message);
      fetchChallenges();
    } catch (err) {
      setError(err.response?.data?.error || 'Error deleting challenge.');
    } finally {
      setLoading(false);
    }
  };

  const openEditChallengeModal = (challenge) => {
    setEditingChallenge(challenge);
    setChallengeTitle(challenge.title);
    setChallengeDesc(challenge.description || '');
    setChallengeSales(challenge.targetSales);
    setChallengeReward(challenge.rewardType);
    setChallengeLegLimit(challenge.performanceLevel);
    setChallengeStart(challenge.startDate.split('T')[0]);
    setChallengeEnd(challenge.endDate.split('T')[0]);
    setChallengeIsActive(challenge.isActive);
    setChallengeRewardAmount(Number(challenge.rewardAmount || 0).toString());
    setChallengeRequiredDirects(Number(challenge.requiredDirects || 0).toString());
    setChallengeDirectsType(challenge.directsType || 'ANY');
    setChallengeRevenue(Number(challenge.targetRevenue || 0).toString());
    setChallengeImageFile(null);
    setIsChallengeModalOpen(true);
  };

  const handlePoolsDistribution = async () => {
    if (!window.confirm('Are you sure you want to distribute accumulated pool payouts?')) return;
    setLoading(true);
    try {
      const res = await adminApi.distributePools();
      setSuccess(res.data.message);
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error distributing pool payouts.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserRankUpdate = async (userId, newRank) => {
    try {
      await adminApi.updateUser(userId, { rank: newRank });
      setSuccess('User rank updated successfully.');
      fetchAdminData();
    } catch (err) {
      setError('Error updating user rank.');
    }
  };

  const handleWalletUpdate = async (userId, balance, lockedBalance) => {
    try {
      await adminApi.updateUser(userId, {
        ...(balance !== undefined && { walletBalance: parseFloat(balance) }),
        ...(lockedBalance !== undefined && { walletLockedBalance: parseFloat(lockedBalance) })
      });
      setSuccess('Wallet balance updated successfully.');
      fetchAdminData();
    } catch (err) {
      setError('Error adjusting wallet balance.');
    }
  };

  const handleApplyWalletAdjustment = async (e) => {
    e.preventDefault();
    if (!adjustingUser || !adjAmount) return;
    setLoading(true);
    try {
      const res = await adminApi.adjustWallet(adjustingUser.id, {
        amount: adjAmount,
        targetType: adjTarget,
        adjustmentType: adjType,
        description: adjDesc
      });
      setSuccess(res.data.message);
      setAdjustingUser(null);
      setAdjAmount('');
      setAdjDesc('');
      fetchAdminData();
    } catch (err) {
      setError(err.response?.data?.error || 'Error adjusting wallet balance.');
    } finally {
      setLoading(false);
    }
  };

  const startEditingRank = (rank) => {
    setEditingRank(rank);
    setIsRankModalOpen(true);
  };

  const handleAddRank = (e) => {
    e.preventDefault();
    if (!newRankName) return;
    const newRank = {
      id: ranksList.length > 0 ? Math.max(...ranksList.map(r => r.id)) + 1 : 1,
      name: newRankName.toUpperCase().trim(),
      requiredStudents: parseInt(newRankStudents) || 0,
      requiredPlatinumLegs: parseInt(newRankPlatinumLegs) || 0,
      commissionCap: newRankPayoutCap || '100%',
      status: newRankStatus || 'ACTIVE',
      icon: '🏅'
    };
    setRanksList([...ranksList, newRank]);
    setNewRankName('');
    setNewRankStudents('');
    setNewRankPlatinumLegs('');
    setNewRankPayoutCap('100%');
    setNewRankStatus('ACTIVE');
    setIsCreateRankModalOpen(false);
    setSuccess('New Leader Rank created successfully.');
  };

  const handleSaveRankModal = (updatedRank) => {
    setRanksList(ranksList.map(r => r.id === updatedRank.id ? updatedRank : r));
    setIsRankModalOpen(false);
    setEditingRank(null);
    setSuccess('Leader Rank configuration updated.');
  };

  const handleAddNews = async (e) => {
    e.preventDefault();
    if (!newsFormTitle || !newsFormContent) {
      setError('Title and content are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('title', newsFormTitle);
    formData.append('content', newsFormContent);
    formData.append('category', newsFormCategory);
    formData.append('isFeatured', newsFormIsFeatured);
    if (newsFormImageFile) {
      formData.append('image', newsFormImageFile);
    }
    if (newsFormAttachedFile) {
      formData.append('file', newsFormAttachedFile);
    }

    try {
      if (editingNewsItem) {
        await newsApi.update(editingNewsItem.id, formData);
        setSuccess('News announcement updated successfully.');
      } else {
        await newsApi.create(formData);
        setSuccess('News announcement published successfully.');
      }
      // Reset form
      setNewsFormTitle('');
      setNewsFormContent('');
      setNewsFormCategory('NEWS');
      setNewsFormIsFeatured(false);
      setNewsFormImageFile(null);
      setNewsFormAttachedFile(null);
      setEditingNewsItem(null);
      setIsNewsModalOpen(false);
      fetchNews();
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing news announcement.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditNews = (item) => {
    setEditingNewsItem(item);
    setNewsFormTitle(item.title);
    setNewsFormContent(item.content);
    setNewsFormCategory(item.category);
    setNewsFormIsFeatured(item.isFeatured);
    setNewsFormImageFile(null);
    setNewsFormAttachedFile(null);
    setIsNewsModalOpen(true);
  };

  const handleDeleteNews = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await newsApi.delete(id);
      setSuccess('News announcement deleted successfully.');
      fetchNews();
    } catch (err) {
      setError(err.response?.data?.error || 'Error deleting news.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddNewsModal = () => {
    setEditingNewsItem(null);
    setNewsFormTitle('');
    setNewsFormContent('');
    setNewsFormCategory('NEWS');
    setNewsFormIsFeatured(false);
    setNewsFormImageFile(null);
    setNewsFormAttachedFile(null);
    setIsNewsModalOpen(true);
  };

  const resetPkgForm = () => {
    setPkgFormName('');
    setPkgFormPrice('');
    setPkgFormDesc('');
    setPkgFormUniId('');
    setPkgFormImage(null);
    setEditingPkg(null);
    setIsPkgModalOpen(false);
  };

  const handleCreatePackage = async (e) => {
    e.preventDefault();
    if (!pkgFormName || !pkgFormPrice || !pkgFormUniId) {
      setError('Name, price, and university are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.append('name', pkgFormName);
    formData.append('price', pkgFormPrice);
    formData.append('description', pkgFormDesc);
    formData.append('universityId', pkgFormUniId);
    if (pkgFormImage) formData.append('image', pkgFormImage);
    try {
      const res = await adminApi.createPackage(formData);
      setSuccess(res.data.message);
      resetPkgForm();
      fetchAdminPackages();
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating package.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePackage = async (e) => {
    e.preventDefault();
    if (!editingPkg) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.append('name', pkgFormName);
    formData.append('price', pkgFormPrice);
    formData.append('description', pkgFormDesc);
    formData.append('universityId', pkgFormUniId);
    if (pkgFormImage) formData.append('image', pkgFormImage);
    try {
      const res = await adminApi.updatePackage(editingPkg.id, formData);
      setSuccess(res.data.message);
      resetPkgForm();
      fetchAdminPackages();
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating package.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePackage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this package?')) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminApi.deletePackage(id);
      setSuccess(res.data.message);
      fetchAdminPackages();
    } catch (err) {
      setError(err.response?.data?.error || 'Error deleting package.');
    } finally {
      setLoading(false);
    }
  };

  const openEditPkgModal = (pkg) => {
    setEditingPkg(pkg);
    setPkgFormName(pkg.name);
    setPkgFormPrice(Number(pkg.price).toString());
    setPkgFormDesc(pkg.description || '');
    setPkgFormUniId(pkg.universityId.toString());
    setPkgFormImage(null);
    setIsPkgModalOpen(true);
  };

  const handlePromisePackage = (e) => {
    e.preventDefault();
    if (!promiseEmail) return;
    const pkg = dbPackages.find(p => p.id === parseInt(promisePkgId));
    setPromisedPackages([...promisedPackages, { id: Date.now(), email: promiseEmail, packageName: pkg ? pkg.name : 'Unknown Package', date: new Date().toISOString().slice(0, 10), status: 'GRANTED' }]);
    setPromiseEmail('');
    setSuccess('Promised Package gifted successfully.');
  };

  const resetUnivForm = () => {
    setUnivFormName('');
    setEditingUniv(null);
  };

  const handleCreateUniversity = async (e) => {
    e.preventDefault();
    if (!univFormName.trim()) {
      setError('University name is required.');
      return;
    }
    setUnivLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminApi.createUniversity({ name: univFormName });
      setSuccess(res.data.message);
      resetUnivForm();
      fetchAdminPackages();
    } catch (err) {
      setError(err.response?.data?.error || 'Error creating university.');
    } finally {
      setUnivLoading(false);
    }
  };

  const handleUpdateUniversity = async (e) => {
    e.preventDefault();
    if (!editingUniv || !univFormName.trim()) return;
    setUnivLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminApi.updateUniversity(editingUniv.id, { name: univFormName });
      setSuccess(res.data.message);
      resetUnivForm();
      fetchAdminPackages();
    } catch (err) {
      setError(err.response?.data?.error || 'Error updating university.');
    } finally {
      setUnivLoading(false);
    }
  };

  const handleDeleteUniversity = async (id) => {
    if (!window.confirm('Are you sure you want to delete this university? This action cannot be undone.')) return;
    setUnivLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminApi.deleteUniversity(id);
      setSuccess(res.data.message);
      fetchAdminPackages();
    } catch (err) {
      setError(err.response?.data?.error || 'Error deleting university.');
    } finally {
      setUnivLoading(false);
    }
  };

  const handleOpenTemplateModal = (tpl) => {
    setEditingTemplate(tpl);
    setTemplateSubject(tpl.subject);
    setTemplateHtmlBody(tpl.htmlBody);
    setTemplateIsActive(tpl.isActive);
    setTestEmailAddress('');
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!editingTemplate) return;
    setSavingTemplate(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await adminApi.updateEmailTemplate(editingTemplate.id, {
        subject: templateSubject,
        htmlBody: templateHtmlBody,
        isActive: templateIsActive
      });
      setSuccess('Template saved successfully!');
      setEmailTemplates(prev => prev.map(t => t.id === editingTemplate.id ? res.data.template : t));
      setIsTemplateModalOpen(false);
    } catch (err) {
      console.error('Error saving template:', err);
      setError(err.response?.data?.error || 'Failed to save template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!editingTemplate || !testEmailAddress) return;
    setSendingTestEmail(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApi.testEmailTemplate(editingTemplate.id, { testEmail: testEmailAddress });
      setSuccess(`Test email sent to ${testEmailAddress} successfully.`);
    } catch (err) {
      console.error('Error sending test email:', err);
      setError(err.response?.data?.error || 'Failed to send test email.');
    } finally {
      setSendingTestEmail(false);
    }
  };

  const handleToggleTemplateStatus = async (tpl) => {
    try {
      const res = await adminApi.updateEmailTemplate(tpl.id, {
        subject: tpl.subject,
        htmlBody: tpl.htmlBody,
        isActive: !tpl.isActive
      });
      setEmailTemplates(prev => prev.map(t => t.id === tpl.id ? res.data.template : t));
      setSuccess(`${tpl.name} status updated.`);
    } catch (err) {
      console.error('Error toggling status:', err);
      setError('Failed to update template status.');
    }
  };

  const handleSendBroadcastCampaign = async (e) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastBody) {
      setError('Please provide both subject and body.');
      return;
    }
    if (broadcastRecipientsType === 'selected' && selectedBroadcastUserIds.length === 0) {
      setError('Please select at least one recipient.');
      return;
    }

    setSendingBroadcast(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await adminApi.sendEmailBroadcast({
        subject: broadcastSubject,
        htmlBody: broadcastBody,
        recipientsType: broadcastRecipientsType,
        selectedUserIds: broadcastRecipientsType === 'selected' ? selectedBroadcastUserIds : []
      });
      setSuccess(res.data.message || 'Email broadcast sent successfully!');
      setBroadcastSubject('');
      setBroadcastBody('');
      setSelectedBroadcastUserIds([]);
    } catch (err) {
      console.error('Error sending broadcast:', err);
      setError(err.response?.data?.error || 'Failed to send email broadcast.');
    } finally {
      setSendingBroadcast(false);
    }
  };




  const startEditUniversity = (uni) => {
    setEditingUniv(uni);
    setUnivFormName(uni.name);
  };

  // Recharts simulation data
  const chartData = [
    { name: 'Week 1', Sales: (stats?.totalSales || 0) * 0.15 },
    { name: 'Week 2', Sales: (stats?.totalSales || 0) * 0.40 },
    { name: 'Week 3', Sales: (stats?.totalSales || 0) * 0.75 },
    { name: 'Week 4', Sales: (stats?.totalSales || 0) }
  ];

  // Helper for tab names
  const validTabs = [
    'dashboard', 'users', 'team-tree', 'kyc-approval', 'ranks', 'achievers', 'wallet', 'withdrawals', 'deposit-management', 'packages', 'universities',
    'transactions', 'earnings', 'generations', 'challenges', 'news', 'promised-packages',
    'tickets', 'branding', 'logo', 'email-settings',
    'groups', 'payments', 'legal', 'settings'
  ];

  if (!validTabs.includes(tab)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6 max-w-6xl mx-auto font-sans text-start">
      
      {/* Alert Notices */}
      {success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-center text-sm font-medium flex items-center justify-center gap-2">
          <Check className="h-4.5 w-4.5" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-center text-sm font-medium flex items-center justify-center gap-2">
          <AlertCircle className="h-4.5 w-4.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Dynamic Tab Renderer */}
          {tab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { title: 'Total Package Sales', value: `$${stats?.totalSales?.toLocaleString() || 0}`, icon: DollarSign, color: 'text-emerald-400' },
                  { title: 'Pending Bank Deposits', value: stats?.pendingDepositsCount || 0, icon: ShieldAlert, color: 'text-amber-400' },
                  { title: 'Pending Withdrawals', value: stats?.pendingWithdrawalsCount || 0, icon: FolderLock, color: 'text-red-400' },
                  { title: 'Platform Members', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-400' }
                ].map((card, idx) => {
                  const Icon = card.icon;
                  return (
                    <div key={idx} className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 flex items-center justify-between shadow-xl">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.title}</p>
                        <h3 className="text-2xl font-bold text-white mt-2 font-mono">{card.value}</h3>
                      </div>
                      <div className={`h-12 w-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center ${card.color}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chart and distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl flex flex-col justify-between min-h-[350px]">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h4 className="text-lg font-bold text-white">Sales Performance</h4>
                      <p className="text-xs text-gray-500 mt-1">Growth chart of total package sales volume</p>
                    </div>
                    <RefreshCw className="h-5 w-5 text-gray-500 hover:text-white cursor-pointer transition" onClick={fetchAdminData} />
                  </div>
                  <div className="flex-1 h-64 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                        <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: '#12131a', border: '1px solid #1e202f', borderRadius: '12px' }} />
                        <Line type="monotone" dataKey="Sales" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-white mb-2">Pools Accumulation</h4>
                    <p className="text-xs text-gray-500 mb-6">Accumulation levels for monthly ranks pools distribution</p>
                  </div>
                  <div className="space-y-4">
                    {[
                      { name: 'Ruby Pool', amount: stats?.pools?.RUBY || 0, color: 'bg-red-500/10 border-red-500/25 text-red-300' },
                      { name: 'Diamond Pool', amount: stats?.pools?.DIAMOND || 0, color: 'bg-cyan-500/10 border-cyan-500/25 text-cyan-300' },
                      { name: 'Black Diamond Pool', amount: stats?.pools?.BLACK_DIAMOND || 0, color: 'bg-neutral-500/10 border-neutral-700 text-neutral-300' }
                    ].map((pool, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border ${pool.color} flex justify-between items-center`}>
                        <span className="text-xs font-semibold">{pool.name}</span>
                        <span className="text-lg font-bold font-mono">${Number(pool.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={handlePoolsDistribution}
                    className="w-full mt-6 py-3 bg-gradient-to-r from-primary to-blue-500 hover:scale-[1.02] text-white font-bold rounded-xl shadow-lg transition-all duration-300 cursor-pointer text-sm"
                  >
                    Distribute Pools
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 md:space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">User Management</h3>
                  <p className="text-xs text-gray-500 mt-1">Audit, search, and manage platform members, ranks, status, and ledger balances</p>
                </div>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                      <th className="pb-3 text-start">Email</th>
                      <th className="pb-3 text-start">Username</th>
                      <th className="pb-3 text-start">Name</th>
                      <th className="pb-3 text-start">Phone / WhatsApp</th>
                      <th className="pb-3 text-start">Referral Code</th>
                      <th className="pb-3 text-start">Package</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-start">Profit</th>
                      <th className="pb-3 text-start">Registration Date</th>
                      <th className="pb-3 text-end pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                    {users
                      .filter(u => 
                        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        u.username?.toLowerCase().includes(searchTerm.toLowerCase())
                      )
                      .map((u) => (
                        <tr key={u.id} className="hover:bg-white/5 transition duration-150">
                          <td className="py-4 text-start text-white font-medium ltr">{u.email}</td>
                          <td className="py-4 text-start font-semibold text-gray-300 ltr">{u.username || 'N/A'}</td>
                          <td className="py-4 text-start font-semibold text-white">{u.name}</td>
                          <td className="py-4 text-start text-gray-400 font-mono">{getPhoneNumber(u.id)}</td>
                          <td className="py-4 text-start">
                            <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-gray-300 select-all">
                              {getReferralCode(u.id)}
                            </span>
                          </td>
                          <td className="py-4 text-start text-gray-300 text-xs font-semibold">
                            {u.userPackages?.[0]?.package?.name || (u.role === 'STUDENT' ? 'GOLD' : 'No Package')}
                          </td>
                          <td className="py-4 text-center">
                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                              u.status === 'ACTIVE' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-slate-700 text-slate-300'
                            }`}>
                              {u.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4 text-start text-emerald-400 font-mono font-semibold">
                            ${Number(u.wallet?.totalEarned || 0).toFixed(2)}
                          </td>
                          <td className="py-4 text-start text-xs text-gray-400 font-mono">
                            {formatRegDate(u.joinedAt)}
                          </td>
                          <td className="py-4 text-end pr-4 relative">
                            <button
                              onClick={() => setActiveActionMenu(activeActionMenu === u.id ? null : u.id)}
                              className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition duration-200 cursor-pointer"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                            {activeActionMenu === u.id && (
                              <div className="absolute right-0 mt-2 w-44 bg-dark-card border border-dark-border rounded-xl shadow-2xl z-50 py-1 text-xs text-start">
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setIsDetailsModalOpen(true);
                                    setActiveActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-white/5 text-gray-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-semibold"
                                >
                                  <Info className="h-3.5 w-3.5" />
                                  <span>User Details</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setEditEmail(u.email || '');
                                    setEditUsername(u.username || '');
                                    setEditPassword('');
                                    setEditPackageId(u.userPackages?.[0]?.package?.id || (u.role === 'STUDENT' ? '2' : ''));
                                    setEditStatus(u.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE');
                                    setIsEditModalOpen(true);
                                    setActiveActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-white/5 text-gray-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-semibold"
                                >
                                  <Sliders className="h-3.5 w-3.5" />
                                  <span>Edit User</span>
                                </button>
                                <button
                                  onClick={() => {
                                    if(window.confirm('Are you sure you want to login as this user? You will need to log back in to admin later.')) {
                                      handleImpersonate(u.id);
                                    }
                                    setActiveActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2 hover:bg-white/5 text-gray-300 hover:text-white transition flex items-center gap-2 cursor-pointer font-semibold border-t border-white/5"
                                >
                                  <LogIn className="h-3.5 w-3.5" />
                                  <span>Login as User</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'team-tree' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white font-sans">Team Tree</h3>
                <p className="text-xs text-gray-500 mt-1">Monitor the entire MLM network team hierarchy and performance.</p>
              </div>
              <Team view="tree" />
            </div>
          )}

          {tab === 'kyc-approval' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white font-sans">KYC Verification Approvals</h3>
                <p className="text-xs text-gray-500 mt-1">Review user identity documents and activate verified accounts</p>
              </div>

              {kycLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : pendingKycUsers.length === 0 ? (
                <div className="py-12 text-center text-gray-500 border border-dashed border-dark-border rounded-2xl">
                  <ShieldCheck className="h-10 w-10 mx-auto text-gray-600 mb-3" />
                  <p className="text-xs font-semibold">No pending KYC verification requests found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingKycUsers.map((kycUser) => (
                    <div key={kycUser.id} className="bg-dark-bg/60 border border-dark-border rounded-2xl p-6 space-y-5 text-start relative overflow-hidden flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start border-b border-dark-border/40 pb-3">
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold uppercase block">User Profile</span>
                            <span className="font-bold text-white text-base block mt-0.5">{kycUser.name}</span>
                            <span className="text-xs text-gray-500 block">@{kycUser.username} | {kycUser.email}</span>
                          </div>
                          <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold rounded-lg uppercase">
                            Pending Approval
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                          <div>
                            <span className="text-gray-500 block">Submitted Full Name</span>
                            <span className="text-white block mt-0.5">{kycUser.kycFullName}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Document Type</span>
                            <span className="text-white block mt-0.5">{kycUser.kycDocumentType === 'NATIONAL_ID' ? 'National ID Card' : kycUser.kycDocumentType === 'PASSPORT' ? 'Passport' : 'Driver License'}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500 block">Document Number</span>
                            <span className="text-white block mt-0.5 font-mono">{kycUser.kycDocumentNumber}</span>
                          </div>
                          <div>
                            <span className="text-gray-500 block">Submission Date</span>
                            <span className="text-white block mt-0.5 font-mono">{new Date(kycUser.kycSubmittedAt).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Document Images Display */}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-500 block">Front side</span>
                            <a
                              href={kycUser.kycFrontImage ? `${apiBaseUrl}${kycUser.kycFrontImage}` : '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="block aspect-video rounded-xl bg-dark-bg overflow-hidden border border-dark-border hover:border-primary/45 transition"
                            >
                              <img
                                src={kycUser.kycFrontImage ? `${apiBaseUrl}${kycUser.kycFrontImage}` : 'https://placehold.co/300x200?text=No+Front'}
                                alt="ID Front"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          </div>
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-gray-500 block">Back side</span>
                            <a
                              href={kycUser.kycBackImage ? `${apiBaseUrl}${kycUser.kycBackImage}` : '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="block aspect-video rounded-xl bg-dark-bg overflow-hidden border border-dark-border hover:border-primary/45 transition"
                            >
                              <img
                                src={kycUser.kycBackImage ? `${apiBaseUrl}${kycUser.kycBackImage}` : 'https://placehold.co/300x200?text=No+Back'}
                                alt="ID Back"
                                className="w-full h-full object-cover"
                              />
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-4 border-t border-dark-border/40 mt-4">
                        <button
                          onClick={() => handleRejectKyc(kycUser.id)}
                          className="flex-1 py-2 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 font-bold rounded-xl transition cursor-pointer text-xs"
                        >
                          Reject Request
                        </button>
                        <button
                          onClick={() => handleApproveKyc(kycUser.id)}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition cursor-pointer text-xs"
                        >
                          Approve & Activate
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'ranks' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Leader Ranks Configuration</h3>
                  <p className="text-xs text-gray-500 mt-1">Configure leadership volume targets and structural parameters</p>
                </div>
                <button
                  onClick={() => setIsCreateRankModalOpen(true)}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl transition duration-300 cursor-pointer shadow-lg flex items-center justify-center gap-2 self-start sm:self-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Leader Rank</span>
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                      <th className="pb-3 text-start">Rank Name</th>
                      <th className="pb-3 text-start">Required Direct Students</th>
                      <th className="pb-3 text-start">Required Platinum Legs</th>
                      <th className="pb-3 text-start">Payout Cap</th>
                      <th className="pb-3 text-end pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                    {ranksList.map((rank) => (
                        <tr key={rank.id}>
                          <td className="py-3 font-semibold text-white text-start flex items-center gap-2">
                            {rank.icon ? <span>{rank.icon}</span> : <Award className="h-4 w-4 text-primary" />}
                            <span>{rank.name}</span>
                          </td>
                          <td className="py-3 text-start font-mono font-semibold">{rank.requiredStudents || 0} Students</td>
                          <td className="py-3 text-start font-mono font-semibold">{rank.requiredPlatinumLegs || 0} Legs</td>
                          <td className="py-3 text-start font-mono text-gray-400">{rank.commissionCap || '100%'}</td>
                          <td className="py-3 text-end pr-4 text-xs font-bold">
                            <div className="flex items-center justify-end gap-3">
                              <span className={rank.status === 'ACTIVE' ? 'text-emerald-400' : 'text-gray-400'}>
                                {rank.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                              </span>
                              <button onClick={() => startEditingRank(rank)} className="text-blue-400 hover:text-blue-300 text-xs font-bold cursor-pointer underline">Edit</button>
                            </div>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'achievers' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Leader Achievers</h3>
                <p className="text-xs text-gray-500 mt-1">List of members who achieved leadership ranks in the network</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                      <th className="pb-3 text-start">Achiever</th>
                      <th className="pb-3 text-start">Current Rank</th>
                      <th className="pb-3 text-start">Verification Date</th>
                      <th className="pb-3 text-start">{t('bonusValue')}</th>
                      <th className="pb-3 text-start">{t('collectionPercentage')}</th>
                      <th className="pb-3 text-end pr-4">Monthly Pools Eligibility</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                    {users
                      .filter(u => u.rank !== 'DISTRIBUTOR')
                      .map((u) => {
                        const getBonusDisplay = (rank) => {
                          switch (rank) {
                            case 'STARTER_LEADER': return '$100';
                            case 'MANAGER_LEADER': return '$200';
                            case 'SILVER_LEADER': return '$400';
                            case 'GOLD': return '$800';
                            case 'PLATINUM': return '$1,500';
                            case 'RUBY':
                            case 'EMERALD':
                            case 'DIAMOND':
                            case 'BLUE_DIAMOND':
                            case 'BLACK_DIAMOND':
                            case 'LEGEND':
                              return language === 'ar' ? 'مؤهل للأحواض' : 'Pool Eligible';
                            default:
                              return 'N/A';
                          }
                        };
                        return (
                          <tr key={u.id}>
                            <td className="py-3 text-start">
                              <span className="text-white block font-semibold">{u.name}</span>
                              <span className="text-xs text-gray-500">{u.email}</span>
                            </td>
                            <td className="py-3 text-start">
                              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg uppercase">
                                {u.rank}
                              </span>
                            </td>
                            <td className="py-3 text-start text-xs text-gray-400">
                              {new Date(u.joinedAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-start text-sm font-semibold text-white">
                              {getBonusDisplay(u.rank)}
                            </td>
                            <td className="py-3 text-start text-sm font-mono font-semibold text-emerald-400">
                              {u.collectionPercentage !== undefined ? `${u.collectionPercentage}%` : '0%'}
                            </td>
                            <td className="py-3 text-end pr-4 font-semibold text-emerald-400">
                              {['RUBY', 'DIAMOND', 'BLACK_DIAMOND', 'LEGEND'].includes(u.rank) ? 'YES (Qualified)' : 'NO (Rank below Ruby)'}
                            </td>
                          </tr>
                        );
                      })}
                    {users.filter(u => u.rank !== 'DISTRIBUTOR').length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                          No rank achievers recorded in the system yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'wallet' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Wallet Management</h3>
                  <p className="text-xs text-gray-500 mt-1">Add or deduct funds from user wallets</p>
                </div>
                <div className="relative w-full max-w-xs">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search by email, name or referral code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                      <th className="pb-3 text-start">User</th>
                      <th className="pb-3 text-start">Referral Code</th>
                      <th className="pb-3 text-start">Main</th>
                      <th className="pb-3 text-start">Commissions</th>
                      <th className="pb-3 text-start">Bonus</th>
                      <th className="pb-3 text-center">Enable Investment Withdrawal</th>
                      <th className="pb-3 text-end pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                    {users
                      .filter(u => {
                        const code = getReferralCode(u.id);
                        const term = searchTerm.toLowerCase();
                        return u.name?.toLowerCase().includes(term) ||
                               u.email?.toLowerCase().includes(term) ||
                               code.toLowerCase().includes(term);
                      })
                      .map((u) => {
                        const isEnabled = !disabledWithdrawalUsers[u.id];
                        return (
                          <tr key={u.id} className="hover:bg-white/5 transition duration-150">
                            <td className="py-4 text-start">
                              <span className="text-white font-semibold block">{u.name}</span>
                              <span className="text-xs text-gray-500 block ltr">{u.email}</span>
                            </td>
                            <td className="py-4 text-start">
                              <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-gray-300 select-all">
                                {getReferralCode(u.id)}
                              </span>
                            </td>
                            <td className="py-4 text-start font-semibold text-white font-mono">
                              ${Number(u.wallet?.balance || 0).toFixed(2)}
                            </td>
                            <td className="py-4 text-start text-gray-300 font-mono">
                              ${Number(u.wallet?.totalEarned || 0).toFixed(2)}
                            </td>
                            <td className="py-4 text-start text-gray-300 font-mono">
                              $0.00
                            </td>
                            <td className="py-4 text-center">
                              <button
                                onClick={() => {
                                  setDisabledWithdrawalUsers(prev => ({
                                    ...prev,
                                    [u.id]: !prev[u.id]
                                  }));
                                  setSuccess(`Investment withdrawal status toggled for ${u.name}`);
                                  setTimeout(() => setSuccess(null), 3000);
                                }}
                                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer focus:outline-none"
                                style={{ backgroundColor: isEnabled ? '#2563eb' : '#374151' }}
                              >
                                <span
                                  className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200"
                                  style={{ transform: isEnabled ? 'translateX(24px)' : 'translateX(4px)' }}
                                />
                              </button>
                            </td>
                            <td className="py-4 text-end pr-4">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    setAdjustingUser({ id: u.id, name: u.name });
                                    setAdjType('CREDIT');
                                    setAdjTarget('balance');
                                    setAdjAmount('');
                                    setAdjDesc('');
                                  }}
                                  className="h-7 w-7 rounded-full border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-500 font-bold flex items-center justify-center transition cursor-pointer text-base"
                                  title="Add Funds"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => {
                                    setAdjustingUser({ id: u.id, name: u.name });
                                    setAdjType('DEBIT');
                                    setAdjTarget('balance');
                                    setAdjAmount('');
                                    setAdjDesc('');
                                  }}
                                  className="h-7 w-7 rounded-full border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-bold flex items-center justify-center transition cursor-pointer text-base"
                                  title="Deduct Funds"
                                >
                                  -
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'withdrawals' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Withdrawal Monitoring Queue</h3>
                <p className="text-xs text-gray-500 mt-1">Review, audit and process pending payouts requested by platform members</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse" dir={dir}>
                  <thead>
                    <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                      <th className="pb-3 text-start">Beneficiary User</th>
                      <th className="pb-3 text-start">Payout Value</th>
                      <th className="pb-3 text-start">Type</th>
                      <th className="pb-3 text-start">Routing Method</th>
                      <th className="pb-3 text-start">Bank Details / IBAN</th>
                      <th className="pb-3 text-end pr-4">Operations</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                    {pendingTrans
                      .filter(t => t.type === 'WITHDRAWAL')
                      .map((trans) => {
                        const details = JSON.parse(trans.details || '{}');
                        return (
                          <tr key={trans.id} className="hover:bg-white/5 transition duration-150">
                            <td className="py-3 text-start">
                              <span className="text-white block font-semibold">{trans.user.name}</span>
                              <span className="text-xs text-gray-500">{trans.user.email}</span>
                            </td>
                            <td className="py-3 font-mono font-bold text-red-400 text-start">${Number(trans.amount).toLocaleString()}</td>
                            <td className="py-3 text-start">
                              <span className="px-2 py-0.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-bold uppercase">
                                Payout
                              </span>
                            </td>
                            <td className="py-3 text-xs text-start">{trans.paymentMethod}</td>
                            <td className="py-3 text-xs text-gray-400 text-start font-mono">
                              {details.bankDetails || 'N/A'}
                            </td>
                            <td className="py-3 text-end pr-4">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleApproveTrans(trans.id)}
                                  className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition cursor-pointer"
                                  title="Approve Bank Payout"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectTrans(trans.id)}
                                  className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition cursor-pointer"
                                  title="Reject Bank Payout"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {pendingTrans.filter(t => t.type === 'WITHDRAWAL').length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                          No pending withdrawal requests in the monitor queue.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'deposit-management' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Deposit Management</h3>
                  <p className="text-xs text-gray-500 mt-1">Review, approve, or reject user deposit requests.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select 
                    value={depositFilter} 
                    onChange={(e) => setDepositFilter(e.target.value)}
                    className="px-4 py-2 bg-dark-bg border border-dark-border rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Deposits</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Rejected / Failed</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse" dir={dir}>
                  <thead>
                    <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                      <th className="pb-3 text-start">Beneficiary User</th>
                      <th className="pb-3 text-start">Amount</th>
                      <th className="pb-3 text-start">Payment Method</th>
                      <th className="pb-3 text-start">Status</th>
                      <th className="pb-3 text-start">Date</th>
                      <th className="pb-3 text-end pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                    {allTrans
                      .filter(t => t.type === 'DEPOSIT')
                      .filter(t => depositFilter === 'ALL' || t.status === depositFilter)
                      .map((trans) => {
                        const details = JSON.parse(trans.details || '{}');
                        return (
                          <tr key={trans.id} className="hover:bg-white/5 transition duration-150">
                            <td className="py-3 text-start">
                              <span className="text-white block font-semibold">{trans.user?.name || 'Unknown'}</span>
                              <span className="text-xs text-gray-500">{trans.user?.email || 'N/A'}</span>
                            </td>
                            <td className="py-3 font-mono font-bold text-emerald-400 text-start">+${Number(trans.amount).toLocaleString()}</td>
                            <td className="py-3 text-xs text-start">{trans.paymentMethod.replace(/_/g, ' ')}</td>
                            <td className="py-3 text-start">
                              <span className={`px-2 py-0.5 text-[10px] rounded-lg font-bold uppercase ${
                                trans.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                trans.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {trans.status}
                              </span>
                            </td>
                            <td className="py-3 text-start text-xs text-gray-400 font-mono">
                              {new Date(trans.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-end pr-4">
                              <div className="flex flex-col items-end gap-2">
                                {trans.status === 'PENDING' && (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleApproveTrans(trans.id)}
                                      className="p-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition cursor-pointer"
                                      title="Approve Deposit"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleRejectTrans(trans.id)}
                                      className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl transition cursor-pointer"
                                      title="Reject Deposit"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                                <div className="text-[10px] text-gray-400 flex flex-col items-end">
                                  {details.receiptPath && (
                                    <a 
                                      href={`${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : ''}${details.receiptPath}`} 
                                      target="_blank" 
                                      rel="noreferrer" 
                                      className="text-blue-400 hover:underline flex items-center gap-1"
                                    >
                                      <FileText className="h-3 w-3" /> View Receipt
                                    </a>
                                  )}
                                  {details.description && <span className="mt-0.5">{details.description}</span>}
                                  {details.adminEmail && <span className="mt-0.5 font-mono">By: {details.adminEmail}</span>}
                                  {details.rawAmount && details.discountApplied > 0 && (
                                    <span className="mt-0.5">Raw: ${details.rawAmount} (-${details.discountApplied} discount)</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                    {allTrans.filter(t => t.type === 'DEPOSIT').filter(t => depositFilter === 'ALL' || t.status === depositFilter).length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-gray-500">
                          No deposit records found for the selected filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'packages' && (
            <div className="space-y-8">
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Academic Programs & Packages</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage university packages — edit names, prices, descriptions, and images</p>
                </div>
                <button
                  onClick={() => { resetPkgForm(); setIsPkgModalOpen(true); }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-blue-500 hover:scale-[1.02] text-white font-bold rounded-xl shadow-lg transition-all duration-300 cursor-pointer text-xs"
                >
                  <PlusCircle className="h-4 w-4" />
                  <span>Add New Package</span>
                </button>
              </div>

              {/* Packages Grid by University */}
              {adminPackagesLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : adminUniversities.length === 0 ? (
                <div className="py-16 text-center bg-dark-card border border-dark-border rounded-3xl">
                  <Folder className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                  <h4 className="text-sm font-bold text-white">No packages found</h4>
                  <p className="text-xs text-gray-500 mt-1">Create your first academic package to get started.</p>
                </div>
              ) : (
                adminUniversities.map((uni) => (
                  <div key={uni.id} className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gradient-to-br from-primary/30 to-blue-500/30 border border-primary/20 rounded-2xl flex items-center justify-center">
                        <Award className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-white">{uni.name}</h4>
                        <p className="text-[10px] text-gray-500 font-semibold">{uni.packages?.length || 0} package(s)</p>
                      </div>
                    </div>

                    {uni.packages && uni.packages.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {uni.packages.map((pkg) => (
                          <div key={pkg.id} className="group bg-dark-bg/60 border border-dark-border rounded-2xl overflow-hidden hover:border-primary/45 transition-all duration-300 flex flex-col">
                            {/* Package Image */}
                            <div className="relative aspect-video bg-gradient-to-br from-dark-bg to-dark-card overflow-hidden">
                              {pkg.imageUrl ? (
                                <img
                                  src={`${(import.meta.env.VITE_API_URL || '').replace('/api', '')}${pkg.imageUrl}`}
                                  alt={pkg.name}
                                  className="w-full h-full object-cover group-hover:scale-[1.03] transition duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Image className="h-10 w-10 text-gray-700" />
                                </div>
                              )}
                              <span className="absolute top-3 right-3 text-[9px] font-extrabold px-2.5 py-1 bg-black/60 backdrop-blur-sm text-white rounded-lg uppercase tracking-wider">
                                {uni.name.split(' ')[0]}
                              </span>
                            </div>

                            {/* Package Info */}
                            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                              <div className="space-y-2 text-start">
                                <h5 className="font-extrabold text-white text-sm leading-snug group-hover:text-primary transition duration-300">{pkg.name}</h5>
                                {pkg.description && (
                                  <p className="text-[11px] text-gray-400 line-clamp-2 leading-relaxed">{pkg.description}</p>
                                )}
                              </div>

                              <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                  <span className="text-emerald-400 font-mono font-extrabold text-lg">${Number(pkg.price).toLocaleString()}</span>
                                  <span className="text-[10px] text-gray-500 font-semibold">
                                    {pkg._count?.userPackages || 0} enrolled
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-dark-border/40">
                                  <button
                                    onClick={() => openEditPkgModal(pkg)}
                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition cursor-pointer text-[11px] font-semibold"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => handleDeletePackage(pkg.id)}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 rounded-xl transition cursor-pointer text-[11px] font-semibold"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 italic">No packages under this university yet.</p>
                    )}
                  </div>
                ))
              )}

              {/* Create / Edit Package Modal */}
              {isPkgModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => resetPkgForm()}>
                  <div className="bg-dark-card border border-dark-border rounded-3xl p-8 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                      <div>
                        <h4 className="text-lg font-bold text-white">
                          {editingPkg ? 'Edit Package' : 'Create New Package'}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {editingPkg ? 'Update package details, pricing, or image' : 'Add a new academic program package'}
                        </p>
                      </div>
                      <button onClick={() => resetPkgForm()} className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition cursor-pointer">
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <form onSubmit={editingPkg ? handleUpdatePackage : handleCreatePackage} className="space-y-5 text-start">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">Package Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Bachelor (بكالوريوس)"
                          value={pkgFormName}
                          onChange={(e) => setPkgFormName(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">University</label>
                        <select
                          required
                          value={pkgFormUniId}
                          onChange={(e) => setPkgFormUniId(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                        >
                          <option value="">Select University...</option>
                          {adminUniversities.map((uni) => (
                            <option key={uni.id} value={uni.id}>{uni.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">Price ($)</label>
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0"
                          placeholder="4000.00"
                          value={pkgFormPrice}
                          onChange={(e) => setPkgFormPrice(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">Description</label>
                        <textarea
                          placeholder="Package description and details..."
                          value={pkgFormDesc}
                          onChange={(e) => setPkgFormDesc(e.target.value)}
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">Package Image</label>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPkgFormImage(e.target.files[0] || null)}
                            className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-gray-400 text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer"
                          />
                        </div>
                        {editingPkg?.imageUrl && !pkgFormImage && (
                          <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1">
                            <Image className="h-3 w-3" />
                            Current image will be kept if no new one is uploaded
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => resetPkgForm()}
                          className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition duration-300 text-sm cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-3 bg-gradient-to-r from-primary to-blue-500 hover:scale-[1.02] text-white font-bold rounded-xl shadow-lg transition-all duration-300 text-sm cursor-pointer"
                        >
                          {editingPkg ? 'Save Changes' : 'Create Package'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'universities' && (
            <div className="space-y-8">
              {/* Header */}
              <div>
                <h3 className="text-xl font-bold text-white">Manage Universities</h3>
                <p className="text-xs text-gray-500 mt-1">Add, rename or delete university partners of the academic MLM system</p>
              </div>

              {/* Universities Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Left Column (2/3): List of Universities */}
                <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
                  <h4 className="text-base font-bold text-white">Registered Universities</h4>
                  
                  {adminPackagesLoading ? (
                    <div className="flex items-center justify-center h-48">
                      <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : adminUniversities.length === 0 ? (
                    <div className="py-12 text-center text-gray-500 border border-dashed border-dark-border rounded-2xl">
                      <Folder className="h-10 w-10 mx-auto text-gray-600 mb-3" />
                      <p className="text-xs">No universities registered in the system yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-start border-collapse" dir={dir}>
                        <thead>
                          <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                            <th className="pb-3 text-start">ID</th>
                            <th className="pb-3 text-start">University Name</th>
                            <th className="pb-3 text-center">Packages</th>
                            <th className="pb-3 text-end pr-4">Operations</th>
                          </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                          {adminUniversities.map((uni) => (
                            <tr key={uni.id} className="hover:bg-white/5 transition duration-150">
                              <td className="py-3.5 text-start font-mono text-xs text-gray-500">#{uni.id}</td>
                              <td className="py-3.5 text-start font-bold text-white">{uni.name}</td>
                              <td className="py-3.5 text-center font-bold text-primary">{uni.packages?.length || 0}</td>
                              <td className="py-3.5 text-end pr-4">
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={() => startEditUniversity(uni)}
                                    className="p-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 hover:text-white rounded-xl transition cursor-pointer"
                                    title="Edit Name"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUniversity(uni.id)}
                                    className="p-1.5 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 rounded-xl transition cursor-pointer"
                                    title="Delete University"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Right Column (1/3): Add / Edit Form */}
                <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6 text-start">
                  <h4 className="text-base font-bold text-white">
                    {editingUniv ? 'Edit University' : 'Add New University'}
                  </h4>
                  
                  <form onSubmit={editingUniv ? handleUpdateUniversity : handleCreateUniversity} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-2">University Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Stanford Global Institute"
                        value={univFormName}
                        onChange={(e) => setUnivFormName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-semibold"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      {editingUniv && (
                        <button
                          type="button"
                          onClick={() => resetUnivForm()}
                          className="flex-1 py-2.5 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-bold rounded-xl transition duration-300 text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={univLoading}
                        className="flex-1 py-2.5 bg-gradient-to-r from-primary to-blue-500 hover:scale-[1.02] text-white font-bold rounded-xl shadow-lg transition-all duration-300 text-xs cursor-pointer disabled:opacity-50"
                      >
                        {univLoading ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                        ) : editingUniv ? (
                          'Save Changes'
                        ) : (
                          'Add University'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {tab === 'transactions' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">System Transactions Ledger</h3>
                  <p className="text-xs text-gray-500 mt-1">Audit log of all transaction operations submitted across Simply.com platform</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <select 
                    value={transactionStatusFilter} 
                    onChange={(e) => setTransactionStatusFilter(e.target.value)}
                    className="px-4 py-2 bg-dark-bg border border-dark-border rounded-xl text-white text-xs font-semibold focus:outline-none focus:border-primary"
                  >
                    <option value="ALL">All Transactions</option>
                    <option value="PENDING">Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse" dir={dir}>
                  <thead>
                    <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                      <th className="pb-3 text-start">Date</th>
                      <th className="pb-3 text-start">Transaction ID</th>
                      <th className="pb-3 text-start">Member Name</th>
                      <th className="pb-3 text-start">Operation</th>
                      <th className="pb-3 text-start">Method</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3 text-end pr-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                    {allTrans
                      .filter((item) => transactionStatusFilter === 'ALL' || item.status === transactionStatusFilter)
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-white/5 transition duration-150">
                          <td className="py-3 text-start text-xs text-gray-400">
                            {new Date(item.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 text-start text-xs font-mono text-gray-500">#{item.id}</td>
                          <td className="py-3 text-start font-semibold text-white">
                            {item.user?.name || 'Unknown'}
                          </td>
                          <td className="py-3 text-start">
                            <span className={`px-2 py-0.5 text-xs rounded-lg ${
                              item.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {item.type}
                            </span>
                          </td>
                          <td className="py-3 text-start text-xs font-mono text-gray-400">
                            {item.paymentMethod}
                          </td>
                          <td className="py-3 text-center text-xs font-bold text-gray-300">
                            {item.status}
                          </td>
                          <td className="py-3 text-end pr-4 font-mono font-bold text-white">
                            ${Number(item.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    {allTrans.filter((item) => transactionStatusFilter === 'ALL' || item.status === transactionStatusFilter).length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-gray-500 text-xs">
                          No transactions found matching this status filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'earnings' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Financial Analytics Dashboard</h3>
                  <p className="text-xs text-gray-500 mt-1">Review financial performance, commissions split, and net margins</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { value: 'today', label: 'Today (اليوم)' },
                    { value: 'last7days', label: 'Last 7 Days (7 أيام)' },
                    { value: 'last30days', label: 'Last 30 Days (30 يوماً)' },
                    { value: 'thismonth', label: 'This Month (الشهر)' },
                    { value: 'thisyear', label: 'This Year (العام)' },
                    { value: 'custom', label: 'Custom Range (فترة مخصصة)' }
                  ].map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setAnalyticsPreset(preset.value)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition duration-200 ${
                        analyticsPreset === preset.value
                          ? 'bg-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {analyticsPreset === 'custom' && (
                <div className="flex flex-wrap items-end gap-4 p-5 bg-dark-bg/40 border border-dark-border rounded-2xl animate-fadeIn text-start">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-mono focus:outline-none focus:border-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchFinancialAnalytics()}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Apply Filter
                  </button>
                </div>
              )}

              {loadingAnalytics ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="h-8 w-8 text-primary animate-spin" />
                  <span className="text-sm text-gray-500 font-semibold">Loading financial statistics...</span>
                </div>
              ) : (
                <>
                  {/* KPI Summary Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                    {[
                      { title: 'Total Revenue (إجمالي الإيرادات)', value: `$${(financialStats?.summary?.totalRevenue || 0).toLocaleString()}`, desc: 'Aggregated payments from packages, installments, & fees', icon: DollarSign, color: 'text-primary' },
                      { title: 'Commissions Paid (إجمالي العمولات)', value: `$${(financialStats?.summary?.totalCommissions || 0).toLocaleString()}`, desc: 'Commissions paid to generations and direct leaders', icon: Award, color: 'text-yellow-500' },
                      { title: 'Platform Net Profit (صافي الأرباح)', value: `$${(financialStats?.summary?.netProfit || 0).toLocaleString()}`, desc: 'Net profit margins retained in central vault', icon: TrendingUp, color: 'text-emerald-500' },
                      { title: 'Commission Operations (العمليات المعتمدة)', value: (financialStats?.summary?.commissionCount || 0).toLocaleString(), desc: 'Number of transactions with calculated commissions', icon: Check, color: 'text-blue-500' }
                    ].map((card, idx) => {
                      const Icon = card.icon;
                      return (
                        <div key={idx} className="p-6 bg-dark-bg/60 border border-dark-border rounded-2xl text-start relative overflow-hidden flex flex-col justify-between">
                          <div>
                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">{card.title}</span>
                            <span className="text-2xl font-black text-white font-mono block mt-2">{card.value}</span>
                            <p className="text-[10px] text-gray-600 mt-2 font-medium leading-relaxed">{card.desc}</p>
                          </div>
                          <Icon className={`absolute right-4 bottom-4 h-12 w-12 opacity-5 ${card.color}`} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Timeframe Performance and Top Periods */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-dark-bg/30 border border-dark-border rounded-2xl p-6 space-y-4">
                      <div className="text-start">
                        <h4 className="text-sm font-bold text-white">Compare Timeframe Performance</h4>
                        <p className="text-[10px] text-gray-500 mt-1">Summary of gross revenue and platform profit splits across predefined periods</p>
                      </div>
                      <div className="overflow-x-auto pt-2">
                        <table className="w-full text-start border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-dark-border text-gray-500 font-semibold">
                              <th className="pb-3 text-start">Timeframe</th>
                              <th className="pb-3 text-start">Revenue</th>
                              <th className="pb-3 text-start">Commissions Paid</th>
                              <th className="pb-3 text-start">Net Profit</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-border/40 text-gray-300 font-medium">
                            {[
                              { name: 'Today (اليوم)', data: financialStats?.timeframes?.today },
                              { name: 'This Week (هذا الأسبوع)', data: financialStats?.timeframes?.week },
                              { name: 'This Month (هذا الشهر)', data: financialStats?.timeframes?.month },
                              { name: 'This Year (هذا العام)', data: financialStats?.timeframes?.year }
                            ].map((row, idx) => (
                              <tr key={idx} className="hover:bg-white/5 transition-colors">
                                <td className="py-3 text-start font-semibold text-white">{row.name}</td>
                                <td className="py-3 text-start font-mono text-gray-300">${(row.data?.revenue || 0).toLocaleString()}</td>
                                <td className="py-3 text-start font-mono text-yellow-500/85">${(row.data?.commissions || 0).toLocaleString()}</td>
                                <td className="py-3 text-start font-mono text-emerald-400 font-bold">${(row.data?.profit || 0).toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="bg-dark-bg/30 border border-dark-border rounded-2xl p-6 space-y-4 flex flex-col justify-between text-start">
                      <div>
                        <h4 className="text-sm font-bold text-white mb-1">Top Performing Periods</h4>
                        <p className="text-[10px] text-gray-500">Highest gross revenue dates or months in selection</p>
                      </div>
                      <div className="space-y-3 mt-4 flex-1">
                        {financialStats?.topPeriods && financialStats.topPeriods.length > 0 ? (
                          financialStats.topPeriods.map((period, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-white/5 border border-white/5 rounded-xl">
                              <div className="flex items-center gap-3">
                                <span className="w-5 h-5 flex items-center justify-center bg-primary/20 text-primary text-[10px] font-bold rounded-lg">{idx + 1}</span>
                                <span className="text-xs text-white font-semibold font-mono">{period.period}</span>
                              </div>
                              <span className="text-xs text-emerald-400 font-bold font-mono">${(period.revenue || 0).toLocaleString()}</span>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-xs text-gray-500 italic">No periods found.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Chart 1: Revenue Evolution LineChart */}
                    <div className="bg-dark-bg/40 border border-dark-border rounded-3xl p-6 space-y-4 text-start">
                      <div>
                        <h4 className="text-sm font-bold text-white">Daily & Monthly Revenue Evolution</h4>
                        <p className="text-[10px] text-gray-500">Daily or monthly revenue progression for the selected range</p>
                      </div>
                      <div className="h-[250px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={financialStats?.charts?.trend || []}>
                            <XAxis dataKey="period" stroke="#4b5563" fontSize={10} tickLine={false} />
                            <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                            <Line type="monotone" dataKey="revenue" name="Revenue ($)" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 2: Revenue vs platform Net Profit */}
                    <div className="bg-dark-bg/40 border border-dark-border rounded-3xl p-6 space-y-4 text-start">
                      <div>
                        <h4 className="text-sm font-bold text-white">Revenue vs Platform Net Profit</h4>
                        <p className="text-[10px] text-gray-500">Comparison of gross inflows vs platform net profit margins</p>
                      </div>
                      <div className="h-[250px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={financialStats?.charts?.trend || []}>
                            <XAxis dataKey="period" stroke="#4b5563" fontSize={10} tickLine={false} />
                            <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                            <Bar dataKey="revenue" name="Revenue ($)" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="netProfit" name="Net Profit ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Chart 3: Commission distribution by type */}
                    <div className="bg-dark-bg/40 border border-dark-border rounded-3xl p-6 space-y-4 lg:col-span-2 text-start">
                      <div>
                        <h4 className="text-sm font-bold text-white">Commission Distribution by Type</h4>
                        <p className="text-[10px] text-gray-500">Breakdown of generation level payouts, direct payouts, and pools</p>
                      </div>
                      <div className="h-[250px] w-full pt-4">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={financialStats?.charts?.distribution || []}>
                            <XAxis dataKey="type" stroke="#4b5563" fontSize={10} tickLine={false} />
                            <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '12px', color: '#fff' }} />
                            <Bar dataKey="amount" name="Payouts ($)" radius={[8, 8, 0, 0]}>
                              {(financialStats?.charts?.distribution || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={['#7c3aed', '#10b981', '#f59e0b', '#3b82f6'][index % 4]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'generations' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Generation / Level Commission Settings</h3>
                <p className="text-xs text-gray-500 mt-1">Configure level payout amounts for MLM dynamic tree deep rewards</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setSuccess('Generation configurations updated.'); }} className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {generationCommissions.map((gen, idx) => (
                    <div key={idx} className="p-4 bg-dark-bg/60 border border-dark-border rounded-2xl flex flex-col justify-between">
                      <span className="text-xs text-gray-500 font-bold">Level {gen.level}</span>
                      <div className="flex items-center gap-1.5 mt-3">
                        <span className="text-xs text-emerald-400 font-bold">$</span>
                        <input
                          type="number"
                          value={gen.rate}
                          onChange={(e) => {
                            const updated = [...generationCommissions];
                            updated[idx].rate = parseInt(e.target.value) || 0;
                            setGenerationCommissions(updated);
                          }}
                          className="w-full px-3 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-center text-white text-sm font-mono focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer text-sm shadow-md"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Generation Ratios</span>
                </button>
              </form>
            </div>
          )}

          {tab === 'challenges' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Campaign Challenges & Rewards</h3>
                  <p className="text-xs text-gray-500 mt-1">Create international travel incentive programs or monthly cash rewards</p>
                </div>
                <button
                  onClick={() => setIsCreateChallengeModalOpen(true)}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl transition duration-300 cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Campaign</span>
                </button>
              </div>
              
              <div className="flex flex-col gap-4">
                {challengesList.length === 0 ? (
                  <div className="p-5 bg-dark-bg/60 border border-dark-border rounded-2xl text-center">
                    <p className="text-sm text-gray-500">No challenges created yet.</p>
                  </div>
                ) : (
                  challengesList.map(challenge => (
                    <div key={challenge.id} className="p-5 bg-dark-bg/60 border border-dark-border rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-primary/45 transition">
                      <div className="flex items-center gap-4">
                        {challenge.imageUrl && (
                          <img 
                            src={`${(import.meta.env.VITE_API_URL || '').replace('/api', '')}${challenge.imageUrl}`} 
                            alt={challenge.title}
                            className="w-16 h-16 rounded-2xl object-cover bg-dark-bg border border-dark-border shrink-0"
                          />
                        )}
                        <div>
                          <span className="text-sm font-bold text-white block">{challenge.title}</span>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                            <span>Sales: <strong className="text-white">{challenge.targetSales}</strong></span>
                            {challenge.targetRevenue > 0 && (
                              <span>Revenue: <strong className="text-emerald-400">${challenge.targetRevenue}</strong></span>
                            )}
                            {challenge.requiredDirects > 0 && (
                              <span>
                                Directs: <strong className="text-primary">{challenge.requiredDirects}</strong> ({challenge.directsType === 'ANY' ? 'Any' : challenge.directsType === 'MARKETER' ? 'Marketer' : 'Student'})
                              </span>
                            )}
                            <span>Leg Limit: <strong className="text-white">{challenge.performanceLevel}%</strong></span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
                            <span>Reward: <strong className="text-amber-400">{challenge.rewardType}</strong></span>
                            {challenge.rewardAmount > 0 && (
                              <span>Cash: <strong className="text-amber-400">+${challenge.rewardAmount} USD</strong></span>
                            )}
                            <span>Period: {new Date(challenge.startDate).toLocaleDateString()} - {new Date(challenge.endDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <span className={`px-2.5 py-1 ${challenge.isActive ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-red-500/10 border-red-500/20 text-red-400'} border text-xs font-bold rounded-lg uppercase`}>
                          {challenge.isActive ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                        <button
                          onClick={() => openEditChallengeModal(challenge)}
                          className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition"
                          title="Edit Challenge"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteChallenge(challenge.id)}
                          className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition"
                          title="Delete Challenge"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'news' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Grid List of Announcements */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Header & Filter Pills */}
                <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-white">News Center Announcements</h3>
                      <p className="text-xs text-gray-500 mt-1">Review, filter, edit or remove announcements and files from member feeds</p>
                    </div>
                  </div>
                  
                  {/* Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
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
                          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                            isActive
                              ? 'bg-primary text-white shadow-lg shadow-primary/25'
                              : 'bg-dark-bg border border-dark-border text-gray-400 hover:text-white'
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          <span>{tabItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* News Grid (2 columns) */}
                {newsLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {newsItems.map((item) => (
                      <div key={item.id} className="bg-dark-card border border-dark-border rounded-3xl overflow-hidden shadow-xl hover:border-primary/45 transition-all duration-300 flex flex-col justify-between group">
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

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4 text-start">
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
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditNews(item)}
                                  className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl transition cursor-pointer"
                                  title="Edit Post"
                                >
                                  <Edit className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteNews(item.id)}
                                  className="p-2 bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 rounded-xl transition cursor-pointer"
                                  title="Delete Post"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              {item.fileUrl && (
                                <a
                                  href={`${apiBaseUrl}${item.fileUrl}`}
                                  download
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 text-primary border border-primary/30 rounded-xl text-[10px] font-bold hover:bg-primary hover:text-white transition duration-200"
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Download</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {newsItems.length === 0 && (
                      <div className="col-span-full py-16 text-center bg-dark-card border border-dark-border rounded-3xl">
                        <Globe className="h-12 w-12 mx-auto text-gray-600 mb-4" />
                        <h4 className="text-sm font-bold text-white">No announcements found</h4>
                        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">There are no updates in this category at the moment.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column: Add / Edit Form Panel */}
              <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl flex flex-col justify-between h-fit space-y-6">
                <div>
                  <h4 className="text-lg font-bold text-white mb-1">
                    {editingNewsItem ? 'Edit Announcement' : 'Publish Announcement'}
                  </h4>
                  <p className="text-xs text-gray-500">
                    {editingNewsItem ? 'Modify details, cover images or downloadable media files' : 'Broadcast updates, course files, images or newsletters'}
                  </p>
                </div>
                
                <form onSubmit={handleAddNews} className="space-y-4 text-start">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Title Banner</label>
                    <input
                      type="text"
                      required
                      placeholder="Announcement heading..."
                      value={newsFormTitle}
                      onChange={(e) => setNewsFormTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs font-semibold"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Category Type</label>
                    <select
                      value={newsFormCategory}
                      onChange={(e) => setNewsFormCategory(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs font-semibold"
                    >
                      <option value="NEWS">@News</option>
                      <option value="ARTICLES">Articles</option>
                      <option value="VIDEOS">Videos</option>
                      <option value="IMAGES">Images</option>
                      <option value="PDF">PDF</option>
                    </select>
                  </div>

                  {/* Featured Checkbox */}
                  <div className="flex items-center gap-2 bg-dark-bg/60 border border-dark-border p-3 rounded-xl">
                    <input
                      type="checkbox"
                      id="newsFeatured"
                      checked={newsFormIsFeatured}
                      onChange={(e) => setNewsFormIsFeatured(e.target.checked)}
                      className="h-4 w-4 rounded border-dark-border text-primary focus:ring-primary focus:ring-offset-dark-bg"
                    />
                    <label htmlFor="newsFeatured" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                      Mark as Featured Announcement
                    </label>
                  </div>

                  {/* File Upload: Cover Image */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">
                      Cover Image File {editingNewsItem && '(Optional if unchanged)'}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewsFormImageFile(e.target.files[0])}
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer bg-dark-bg/40 border border-dark-border p-2 rounded-xl"
                    />
                  </div>

                  {/* File Upload: Attached File */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">
                      Downloadable File Attachment (PDF, MP4, JPEG...) {editingNewsItem && '(Optional)'}
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setNewsFormAttachedFile(e.target.files[0])}
                      className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 cursor-pointer bg-dark-bg/40 border border-dark-border p-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Body Content</label>
                    <textarea
                      required
                      placeholder="Write announcement description..."
                      value={newsFormContent}
                      onChange={(e) => setNewsFormContent(e.target.value)}
                      rows="4"
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition duration-300 text-xs cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : (editingNewsItem ? 'Update Post' : 'Publish Announcement')}
                    </button>
                    {editingNewsItem && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNewsItem(null);
                          setNewsFormTitle('');
                          setNewsFormContent('');
                          setNewsFormCategory('NEWS');
                          setNewsFormIsFeatured(false);
                          setNewsFormImageFile(null);
                          setNewsFormAttachedFile(null);
                        }}
                        className="px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

            </div>
          )}

          {tab === 'promised-packages' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Promised / Gifted Packages</h3>
                  <p className="text-xs text-gray-500 mt-1">Audit of student packages gifted directly by admin overrides (comped licenses)</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-start border-collapse">
                    <thead>
                      <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                        <th className="pb-3 text-start">Student Email</th>
                        <th className="pb-3 text-start">Gifted Package Model</th>
                        <th className="pb-3 text-start">Gift Date</th>
                        <th className="pb-3 text-end pr-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                      {promisedPackages.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 text-start font-semibold text-white ltr">{item.email}</td>
                          <td className="py-3 text-start text-xs text-gray-400">{item.packageName}</td>
                          <td className="py-3 text-start text-xs font-mono text-gray-500">{item.date}</td>
                          <td className="py-3 text-end pr-4 text-emerald-400 text-xs font-bold">{item.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">Gift Package</h4>
                  <p className="text-xs text-gray-500 mb-6">Authorize a free program license for a member account</p>
                </div>
                <form onSubmit={handlePromisePackage} className="space-y-4 text-start">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Recipient Email</label>
                    <input
                      type="email"
                      required
                      placeholder="student@mail.com"
                      value={promiseEmail}
                      onChange={(e) => setPromiseEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Choose Program</label>
                    <select
                      value={promisePkgId}
                      onChange={(e) => setPromisePkgId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-start text-sm cursor-pointer"
                    >
                      {dbPackages.map(p => (
                        <option key={p.id} value={p.id}>{p.name} (${p.price})</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition duration-300 text-sm cursor-pointer shadow-lg"
                  >
                    Gift Package Model
                  </button>
                </form>
              </div>
            </div>
          )}

          {tab === 'tickets' && (
            <div className="space-y-6">
              {selectedAdminTicket ? (
                <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl flex flex-col h-[600px]">
                  <div className="flex justify-between items-center border-b border-dark-border/40 pb-4 mb-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedAdminTicket(null)}
                        className="p-2 hover:bg-white/5 rounded-xl border border-dark-border text-gray-400 hover:text-white transition cursor-pointer"
                      >
                        <ArrowDownLeft className="h-4 w-4 rotate-45" />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-gray-500">#{selectedAdminTicket.ticketId}</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg ${
                            selectedAdminTicket.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {selectedAdminTicket.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1">{selectedAdminTicket.subject}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Member: <span className="text-white font-semibold">{selectedAdminTicket.user?.name}</span> ({selectedAdminTicket.user?.email}) - Role: <span className="text-primary font-bold uppercase">{selectedAdminTicket.user?.role}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {selectedAdminTicket.status === 'PENDING' ? (
                        <button
                          onClick={() => handleUpdateTicketStatus(selectedAdminTicket.id, 'RESOLVED')}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateTicketStatus(selectedAdminTicket.id, 'PENDING')}
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold rounded-lg transition cursor-pointer"
                        >
                          Reopen Ticket
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 text-start flex flex-col">
                    {adminMessages.map((msg) => {
                      const isAdminMsg = msg.sender?.role === 'ADMIN';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-gray-500 font-bold">
                              {msg.sender?.name || (isAdminMsg ? 'Admin' : 'Member')}
                            </span>
                            <span className="text-[9px] text-gray-600 font-mono">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-medium ${
                            isAdminMsg 
                              ? 'bg-primary text-white rounded-tr-none' 
                              : 'bg-dark-bg border border-dark-border text-gray-200 rounded-tl-none'
                          }`}>
                            {msg.message}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSendAdminReply} className="flex gap-2 border-t border-dark-border/40 pt-4">
                    <input
                      type="text"
                      required
                      placeholder="Type your response here..."
                      value={adminReplyText}
                      onChange={(e) => setAdminReplyText(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 text-sm cursor-pointer"
                    >
                      Send Reply
                    </button>
                  </form>
                </div>
              ) : (
                <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-white">Support Tickets Dashboard</h3>
                      <p className="text-xs text-gray-500 mt-1">Resolve support queries and tickets reported by members</p>
                    </div>
                    <button
                      onClick={() => setIsNewTicketModalOpen(true)}
                      className="px-4 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition flex items-center gap-2 cursor-pointer text-xs"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Open Ticket</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-start border-collapse">
                      <thead>
                        <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                          <th className="pb-3 text-start">Ticket ID</th>
                          <th className="pb-3 text-start">Member</th>
                          <th className="pb-3 text-start">Subject / Issue</th>
                          <th className="pb-3 text-start">Created Date</th>
                          <th className="pb-3 text-center">Status</th>
                          <th className="pb-3 text-end pr-4">Operations</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                        {supportTickets.map((tkt) => (
                          <tr 
                            key={tkt.id} 
                            onClick={() => handleSelectAdminTicket(tkt)}
                            className="hover:bg-white/5 transition cursor-pointer"
                          >
                            <td className="py-3 text-start font-mono text-xs text-gray-400">{tkt.ticketId}</td>
                            <td className="py-3 text-start font-semibold text-white ltr">
                              {tkt.user?.name}
                              <span className="text-[10px] text-gray-500 block">@{tkt.user?.username}</span>
                            </td>
                            <td className="py-3 text-start text-xs">{tkt.subject}</td>
                            <td className="py-3 text-start text-xs font-mono text-gray-500">
                              {new Date(tkt.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${
                                tkt.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {tkt.status}
                              </span>
                            </td>
                            <td className="py-3 text-end pr-4" onClick={(e) => e.stopPropagation()}>
                              {tkt.status === 'PENDING' ? (
                                <button
                                  onClick={() => handleUpdateTicketStatus(tkt.id, 'RESOLVED')}
                                  className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold rounded-lg transition cursor-pointer"
                                >
                                  Resolve
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateTicketStatus(tkt.id, 'PENDING')}
                                  className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold rounded-lg transition cursor-pointer"
                                >
                                  Reopen
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {supportTickets.length === 0 && (
                          <tr>
                            <td colSpan="6" className="py-12 text-center text-gray-500">
                              No support tickets found in the system.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {isNewTicketModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-dark-card border border-dark-border rounded-3xl p-6 w-full max-w-lg shadow-2xl relative">
                    <button
                      onClick={() => {
                        setIsNewTicketModalOpen(false);
                        setNewTicketUserId('');
                        setNewTicketSubject('');
                        setNewTicketMessage('');
                        setUserSearchQuery('');
                      }}
                      className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white transition cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>

                    <h3 className="text-lg font-bold text-white mb-2">Open New Support Ticket</h3>
                    <p className="text-xs text-gray-500 mb-6 font-medium">Initiate a help ticket and send a direct message to a member</p>

                    <form onSubmit={handleCreateAdminTicket} className="space-y-4 text-start">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">Search & Select Member</label>
                        <input
                          type="text"
                          placeholder="Search member by username, name, or email..."
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold mb-2"
                        />

                        {userSearchQuery.trim() !== '' && (
                          <div className="max-h-40 overflow-y-auto border border-dark-border rounded-xl bg-dark-bg divide-y divide-dark-border/40 mb-2">
                            {users
                              .filter(u => 
                                u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                                u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
                                u.username?.toLowerCase().includes(userSearchQuery.toLowerCase())
                              )
                              .map(u => (
                                <div
                                  key={u.id}
                                  onClick={() => {
                                    setNewTicketUserId(u.id);
                                    setUserSearchQuery(`${u.name} (${u.email})`);
                                  }}
                                  className={`p-2.5 text-xs text-gray-300 hover:bg-white/5 cursor-pointer flex justify-between items-center ${
                                    newTicketUserId === u.id ? 'bg-primary/25 border-l-4 border-primary' : ''
                                  }`}
                                >
                                  <div>
                                    <span className="font-semibold block text-white">{u.name}</span>
                                    <span className="text-gray-500 font-mono text-[10px]">{u.email} | @{u.username}</span>
                                  </div>
                                  <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-gray-400 uppercase font-bold">
                                    {u.role}
                                  </span>
                                </div>
                              ))}
                          </div>
                        )}
                        
                        {newTicketUserId && (
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
                            Selected Member ID: #{newTicketUserId}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">Subject / Topic</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Account activation verification"
                          value={newTicketSubject}
                          onChange={(e) => setNewTicketSubject(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">Initial Message</label>
                        <textarea
                          required
                          placeholder="Write your message here..."
                          value={newTicketMessage}
                          onChange={(e) => setNewTicketMessage(e.target.value)}
                          rows="4"
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 text-sm cursor-pointer"
                      >
                        Open Ticket
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'branding' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">System Branding</h3>
                <p className="text-xs text-gray-500 mt-1">Configure company name, metadata, and core application layout palettes</p>
              </div>

              <form onSubmit={handleSaveBranding} className="space-y-4 text-start">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Company / Platform Name</label>
                    <input
                      type="text"
                      value={brandingSettings.siteName}
                      onChange={(e) => setBrandingSettings({...brandingSettings, siteName: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Primary Accent Color Theme</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={brandingSettings.primaryColor}
                        onChange={(e) => setBrandingSettings({...brandingSettings, primaryColor: e.target.value})}
                        className="h-10 w-12 rounded-lg bg-dark-bg border border-dark-border cursor-pointer focus:outline-none"
                      />
                      <input
                        type="text"
                        value={brandingSettings.primaryColor}
                        onChange={(e) => setBrandingSettings({...brandingSettings, primaryColor: e.target.value})}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
                
                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer text-sm shadow-md"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Branding Setup</span>
                </button>
              </form>
            </div>
          )}

          {tab === 'logo' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Logo & Creative Assets</h3>
                <p className="text-xs text-gray-500 mt-1">Configure layout branding graphics and main navigation sidebar header assets</p>
              </div>

              <form onSubmit={handleSaveAssets} className="space-y-6 text-start w-full">
                {/* Logo Section */}
                <div className="flex flex-col md:flex-row gap-8 items-center bg-dark-bg/60 p-6 border border-dark-border rounded-2xl">
                  <div className="h-20 w-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {brandingSettings.logoUrl ? (
                      <img 
                        src={brandingSettings.logoUrl.startsWith('http') ? brandingSettings.logoUrl : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : ''}${brandingSettings.logoUrl}`} 
                        alt="Logo Preview" 
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <Image className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2 w-full">
                    <label className="block text-xs font-semibold text-gray-400">Upload Site Logo</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setLogoFile(e.target.files[0])}
                      className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover file:cursor-pointer"
                    />
                    {logoFile && (
                      <p className="text-xs text-emerald-400 font-semibold">Selected Logo: {logoFile.name}</p>
                    )}
                  </div>
                </div>

                {/* PWA Icon Section */}
                <div className="flex flex-col md:flex-row gap-8 items-center bg-dark-bg/60 p-6 border border-dark-border rounded-2xl">
                  <div className="h-20 w-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {brandingSettings.pwaUrl ? (
                      <img 
                        src={brandingSettings.pwaUrl.startsWith('http') ? brandingSettings.pwaUrl : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : ''}${brandingSettings.pwaUrl}`} 
                        alt="PWA Icon Preview" 
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      <Sparkles className="h-8 w-8 text-primary" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2 w-full">
                    <label className="block text-xs font-semibold text-gray-400">Upload PWA Icon (Favicon)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPwaFile(e.target.files[0])}
                      className="w-full text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover file:cursor-pointer"
                    />
                    {pwaFile && (
                      <p className="text-xs text-emerald-400 font-semibold">Selected PWA Icon: {pwaFile.name}</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-start">
                  <button
                    type="submit"
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer text-xs shadow-md"
                  >
                    <Save className="h-4 w-4" />
                    <span>Save Creative Assets</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {tab === 'email-settings' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-2">
                <div>
                  <h3 className="text-lg font-bold text-white">Email Settings & Tools</h3>
                  <p className="text-xs text-gray-500 mt-1">Configure SMTP gateway, customize notification templates, and dispatch email broadcast campaigns</p>
                </div>

                {/* Sub-tabs */}
                <div className="flex items-center gap-2 bg-dark-bg/40 border border-dark-border p-1 rounded-2xl self-start sm:self-auto">
                  {[
                    { value: 'smtp', label: 'SMTP Settings', icon: Mail },
                    { value: 'templates', label: 'Email Templates', icon: FileText },
                    { value: 'broadcast', label: 'Email Broadcast', icon: Send }
                  ].map(subTab => {
                    const Icon = subTab.icon;
                    return (
                      <button
                        key={subTab.value}
                        type="button"
                        onClick={() => setEmailSubTab(subTab.value)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition duration-150 ${
                          emailSubTab === subTab.value
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{subTab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {emailSubTab === 'smtp' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h4 className="text-md font-bold text-white">SMTP Email Gateway</h4>
                    <p className="text-xs text-gray-500 mt-1">Configure automated system transactional newsletter sender settings</p>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); setSuccess('Email credentials configured.'); }} className="space-y-4 text-start">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">SMTP Host Provider</label>
                        <input
                          type="text"
                          value={emailSettings.smtpHost}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpHost: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">SMTP Secure Port</label>
                        <input
                          type="text"
                          value={emailSettings.smtpPort}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpPort: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-mono text-center"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">SMTP Sender Email Account</label>
                        <input
                          type="text"
                          value={emailSettings.smtpUser}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpUser: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">SMTP Secure Password</label>
                        <input
                          type="password"
                          value={emailSettings.smtpPass}
                          onChange={(e) => setEmailSettings({...emailSettings, smtpPass: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-mono"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer text-sm shadow-md"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Email Setup</span>
                    </button>
                  </form>
                </div>
              )}

              {emailSubTab === 'templates' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-md font-bold text-white">Email Layout Templates</h4>
                      <p className="text-xs text-gray-500 mt-1">Configure and customize transactional email notification templates sent automatically by the system</p>
                    </div>
                    <span className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-xl">
                      {emailTemplates.length} Templates Available
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {emailTemplates.map((tpl) => {
                      let vars = [];
                      try {
                        vars = JSON.parse(tpl.variables);
                      } catch (e) {}

                      return (
                        <div key={tpl.id} className="p-5 bg-dark-bg/60 border border-dark-border rounded-2xl flex flex-col justify-between text-start relative hover:border-primary/45 transition">
                          <div>
                            <div className="flex justify-between items-start gap-2 mb-2">
                              <span className="font-bold text-white text-sm block leading-tight">{tpl.name}</span>
                              <button
                                onClick={() => handleToggleTemplateStatus(tpl)}
                                className={`px-2 py-0.5 text-[9px] font-bold rounded-lg transition uppercase ${
                                  tpl.isActive 
                                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' 
                                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                                }`}
                              >
                                {tpl.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </div>
                            <span className="text-[10px] text-gray-500 font-semibold font-mono block mb-3">
                              Slug: {tpl.slug}
                            </span>
                            <div className="space-y-2">
                              <span className="text-xs text-gray-300 block line-clamp-2">
                                <strong className="text-gray-400">Subject:</strong> {tpl.subject}
                              </span>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {vars.map((v, i) => (
                                  <span key={i} className="px-1.5 py-0.5 bg-white/5 text-gray-400 text-[9px] font-medium rounded font-mono">
                                    {"{{"}{v}{"}}"}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenTemplateModal(tpl)}
                            className="mt-6 w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Customize HTML</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {emailSubTab === 'broadcast' && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h4 className="text-md font-bold text-white">Mass Email Broadcast & Segment Campaigns</h4>
                    <p className="text-xs text-gray-500 mt-1">Dispatch targeted email newsletters or system notices to specific member groups or individual users</p>
                  </div>

                  <form onSubmit={handleSendBroadcastCampaign} className="space-y-6 text-start">
                    <div className="grid grid-cols-1 gap-6">
                      {/* Subject */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">Subject Header</label>
                        <input
                          type="text"
                          required
                          placeholder="Enter email subject line..."
                          value={broadcastSubject}
                          onChange={(e) => setBroadcastSubject(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-semibold"
                        />
                      </div>

                      {/* Recipient Segment Types */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2">Recipient Segments</label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {[
                            { value: 'all', label: 'All Active Users', desc: 'All registered accounts' },
                            { value: 'marketers', label: 'Marketers Only', desc: 'Registered marketers' },
                            { value: 'students', label: 'Students Only', desc: 'Enrolled students' },
                            { value: 'selected', label: 'Select Specific', desc: 'Choose manually' }
                          ].map((t) => (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => {
                                setBroadcastRecipientsType(t.value);
                                if (t.value !== 'selected') setSelectedBroadcastUserIds([]);
                              }}
                              className={`p-3.5 border rounded-xl flex flex-col items-center justify-center text-center transition cursor-pointer ${
                                broadcastRecipientsType === t.value
                                  ? 'bg-primary/10 border-primary text-white'
                                  : 'bg-dark-bg/60 border-dark-border text-gray-400 hover:border-white/10 hover:text-white'
                              }`}
                            >
                              <span className="text-xs font-bold block">{t.label}</span>
                              <span className="text-[9px] text-gray-500 mt-0.5">{t.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Manual Members Selection Interface */}
                      {broadcastRecipientsType === 'selected' && (
                        <div className="p-5 bg-dark-bg/60 border border-dark-border rounded-2xl space-y-4 animate-fadeIn">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                            <div>
                              <h5 className="text-xs font-bold text-white">Manual Recipient Registry</h5>
                              <p className="text-[10px] text-gray-500 mt-0.5">Filter the list and select one, multiple, or all matching users</p>
                            </div>
                            <div className="text-right">
                              <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-lg uppercase">
                                Selected: {selectedBroadcastUserIds.length} users
                              </span>
                            </div>
                          </div>

                          {/* Filters panel */}
                          <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1 relative">
                              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
                              <input
                                type="text"
                                placeholder="Search by name, email, or username..."
                                value={broadcastSearchTerm}
                                onChange={(e) => setBroadcastSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-semibold focus:outline-none focus:border-primary"
                              />
                            </div>
                            <div className="flex bg-dark-bg border border-dark-border rounded-xl p-1 shrink-0">
                              {['ALL', 'MARKETER', 'STUDENT'].map((role) => (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => setBroadcastRoleFilter(role)}
                                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition uppercase ${
                                    broadcastRoleFilter === role
                                      ? 'bg-primary text-white shadow-md'
                                      : 'text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {role === 'ALL' ? 'All Roles' : role === 'MARKETER' ? 'Marketers' : 'Students'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* List of members */}
                          {(() => {
                            const filteredUsers = users.filter((u) => {
                              const matchesSearch = 
                                (u.name || '').toLowerCase().includes(broadcastSearchTerm.toLowerCase()) ||
                                (u.email || '').toLowerCase().includes(broadcastSearchTerm.toLowerCase()) ||
                                (u.username || '').toLowerCase().includes(broadcastSearchTerm.toLowerCase());
                              const matchesRole = broadcastRoleFilter === 'ALL' || u.role === broadcastRoleFilter;
                              return matchesSearch && matchesRole;
                            });

                            const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedBroadcastUserIds.includes(u.id));

                            const handleSelectAllToggle = () => {
                              if (allSelected) {
                                const filteredIds = filteredUsers.map(u => u.id);
                                setSelectedBroadcastUserIds(prev => prev.filter(id => !filteredIds.includes(id)));
                              } else {
                                const filteredIds = filteredUsers.map(u => u.id);
                                setSelectedBroadcastUserIds(prev => {
                                  const combined = new Set([...prev, ...filteredIds]);
                                  return Array.from(combined);
                                });
                              }
                            };

                            const handleUserCheckboxToggle = (userId) => {
                              if (selectedBroadcastUserIds.includes(userId)) {
                                setSelectedBroadcastUserIds(prev => prev.filter(id => id !== userId));
                              } else {
                                setSelectedBroadcastUserIds(prev => [...prev, userId]);
                              }
                            };

                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center px-3 py-2 bg-white/5 border border-white/10 rounded-xl">
                                  <label className="flex items-center gap-2.5 text-xs text-gray-300 font-bold cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={allSelected}
                                      onChange={handleSelectAllToggle}
                                      className="rounded border-dark-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer bg-dark-bg"
                                    />
                                    <span>Select All Matching ({filteredUsers.length})</span>
                                  </label>
                                </div>

                                <div className="max-h-60 overflow-y-auto border border-dark-border rounded-xl p-2 bg-dark-bg/40 space-y-1">
                                  {filteredUsers.length > 0 ? (
                                    filteredUsers.map((u) => (
                                      <div
                                        key={u.id}
                                        onClick={() => handleUserCheckboxToggle(u.id)}
                                        className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-lg transition cursor-pointer border border-transparent hover:border-white/5"
                                      >
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="checkbox"
                                            checked={selectedBroadcastUserIds.includes(u.id)}
                                            onChange={() => {}}
                                            className="rounded border-dark-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer bg-dark-bg"
                                          />
                                          <div>
                                            <span className="text-xs font-bold text-white block">{u.name}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">@{u.username || 'user'} &bull; {u.email}</span>
                                          </div>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md uppercase ${
                                          u.role === 'ADMIN'
                                            ? 'bg-purple-500/10 text-purple-400'
                                            : u.role === 'MARKETER'
                                            ? 'bg-blue-500/10 text-blue-400'
                                            : 'bg-emerald-500/10 text-emerald-400'
                                        }`}>
                                          {u.role}
                                        </span>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-center py-6 text-xs text-gray-500">No matching members found</div>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Broadcast HTML Body */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-semibold text-gray-400">HTML Newsletter Body</label>
                          <span className="text-[10px] text-gray-500">Supports standard HTML. You can use {"{{"}name{"}}"} to personalize</span>
                        </div>
                        <textarea
                          required
                          value={broadcastBody}
                          onChange={(e) => setBroadcastBody(e.target.value)}
                          placeholder="Provide email contents..."
                          rows="10"
                          className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-xs font-mono leading-relaxed"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={sendingBroadcast}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer text-sm shadow-md disabled:opacity-50"
                    >
                      {sendingBroadcast ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Sending Broadcast...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          <span>Send Broadcast Campaign</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {tab === 'groups' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Manage Groups</h3>
                <p className="text-xs text-gray-500 mt-1">Classify members into segmented leadership teams</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: 'Active Leaders Segment', count: users.filter(u => u.rank !== 'DISTRIBUTOR').length },
                  { name: 'General Business Partners Segment', count: users.filter(u => u.role === 'MARKETER').length },
                  { name: 'Enrolled Academic Students Segment', count: users.filter(u => u.role === 'STUDENT').length }
                ].map((grp, idx) => (
                  <div key={idx} className="p-4 bg-dark-bg/60 border border-dark-border rounded-2xl flex justify-between items-center hover:border-primary/45 transition">
                    <div>
                      <span className="font-bold text-white text-sm block">{grp.name}</span>
                      <span className="text-xs text-gray-500 mt-1 block">Members: {grp.count} users</span>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg uppercase">
                      Segment
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'payments' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Payment Gateway Settings</h3>
                <p className="text-xs text-gray-500 mt-1">Configure and activate payment gateways for user deposits and packages</p>
              </div>

              <form onSubmit={handleSavePaymentSettings} className="space-y-6 text-start">
                
                {/* Stripe Settings Section */}
                <div className="p-4 bg-dark-bg/40 border border-dark-border/60 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-white">Stripe Payment Gateway</h4>
                      <p className="text-[10px] text-gray-500">Enable card payments and input API credentials</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={paymentSettings.stripe?.enabled} 
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings, 
                          stripe: { ...paymentSettings.stripe, enabled: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ml-2 text-xs font-semibold text-gray-400">Active</span>
                    </label>
                  </div>

                  {paymentSettings.stripe?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dark-border/20">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">Stripe Publishable Key</label>
                        <input
                          type="text"
                          value={paymentSettings.stripe?.publishableKey || ''}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            stripe: { ...paymentSettings.stripe, publishableKey: e.target.value }
                          })}
                          placeholder="pk_live_..."
                          className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-white text-xs font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">Stripe Secret Key</label>
                        <input
                          type="password"
                          value={paymentSettings.stripe?.secretKey || ''}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            stripe: { ...paymentSettings.stripe, secretKey: e.target.value }
                          })}
                          placeholder="sk_live_..."
                          className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-white text-xs font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* PayPal Settings Section */}
                <div className="p-4 bg-dark-bg/40 border border-dark-border/60 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-white">PayPal Payment Gateway</h4>
                      <p className="text-[10px] text-gray-500">Integrate PayPal checkout services</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={paymentSettings.paypal?.enabled} 
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings, 
                          paypal: { ...paymentSettings.paypal, enabled: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ml-2 text-xs font-semibold text-gray-400">Active</span>
                    </label>
                  </div>

                  {paymentSettings.paypal?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dark-border/20">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">PayPal Client ID</label>
                        <input
                          type="text"
                          value={paymentSettings.paypal?.clientId || ''}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            paypal: { ...paymentSettings.paypal, clientId: e.target.value }
                          })}
                          placeholder="Client ID"
                          className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-white text-xs font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">PayPal Client Secret</label>
                        <input
                          type="password"
                          value={paymentSettings.paypal?.clientSecret || ''}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            paypal: { ...paymentSettings.paypal, clientSecret: e.target.value }
                          })}
                          placeholder="Client Secret"
                          className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-white text-xs font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Payoneer Settings Section */}
                <div className="p-4 bg-dark-bg/40 border border-dark-border/60 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-white">Payoneer Gateway</h4>
                      <p className="text-[10px] text-gray-500">Enable direct Payoneer transfer requests</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={paymentSettings.payoneer?.enabled} 
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings, 
                          payoneer: { ...paymentSettings.payoneer, enabled: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ml-2 text-xs font-semibold text-gray-400">Active</span>
                    </label>
                  </div>

                  {paymentSettings.payoneer?.enabled && (
                    <div className="pt-2 border-t border-dark-border/20">
                      <label className="block text-[11px] font-semibold text-gray-400 mb-1">Payoneer Email Address</label>
                      <input
                        type="email"
                        value={paymentSettings.payoneer?.email || ''}
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings,
                          payoneer: { ...paymentSettings.payoneer, email: e.target.value }
                        })}
                        placeholder="email@payoneer.com"
                        className="w-full max-w-md px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-white text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  )}
                </div>

                {/* Manual Payment Settings Section */}
                <div className="p-4 bg-dark-bg/40 border border-dark-border/60 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-white">Manual Payment (Bank Transfer)</h4>
                      <p className="text-[10px] text-gray-500">Provide bank account details for direct deposits</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={paymentSettings.manual?.enabled} 
                        onChange={(e) => setPaymentSettings({
                          ...paymentSettings, 
                          manual: { ...paymentSettings.manual, enabled: e.target.checked }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      <span className="ml-2 text-xs font-semibold text-gray-400">Active</span>
                    </label>
                  </div>

                  {paymentSettings.manual?.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-dark-border/20">
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">Central Bank Account Name</label>
                        <input
                          type="text"
                          value={paymentSettings.manual?.accountName || ''}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            manual: { ...paymentSettings.manual, accountName: e.target.value }
                          })}
                          placeholder="Simply Bank Name"
                          className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-white text-xs focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-400 mb-1">Central Bank IBAN</label>
                        <input
                          type="text"
                          value={paymentSettings.manual?.iban || ''}
                          onChange={(e) => setPaymentSettings({
                            ...paymentSettings,
                            manual: { ...paymentSettings.manual, iban: e.target.value }
                          })}
                          placeholder="IBAN Code"
                          className="w-full px-3 py-2 rounded-lg bg-dark-bg border border-dark-border text-white text-xs font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer text-sm shadow-md"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Gateways Setup</span>
                </button>
              </form>
            </div>
          )}

          {tab === 'legal' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Legal Documents & Policy Center</h3>
                <p className="text-xs text-gray-500 mt-1">Edit terms of service, platform agreements, and network compliance text</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setSuccess('Compliance content saved.'); }} className="space-y-4 text-start">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">Terms of Service Agreement</label>
                  <textarea
                    value={legalContent.terms}
                    onChange={(e) => setLegalContent({...legalContent, terms: e.target.value})}
                    rows="4"
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2">Compliance Privacy Policy</label>
                  <textarea
                    value={legalContent.privacy}
                    onChange={(e) => setLegalContent({...legalContent, privacy: e.target.value})}
                    rows="4"
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer text-sm shadow-md"
                >
                  <Save className="h-4 w-4" />
                  <span>Publish Agreements</span>
                </button>
              </form>
            </div>
          )}

          {tab === 'settings' && (
            <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">General System Configurations</h3>
                <p className="text-xs text-gray-500 mt-1">Tweak general MLM platform constraints and registration access rules</p>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); setSuccess('General system configurations saved.'); }} className="space-y-6 text-start">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Minimum Withdrawal Limit ($)</label>
                    <input
                      type="number"
                      defaultValue={15}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Monthly Business Partner Active Fee ($)</label>
                    <input
                      type="number"
                      defaultValue={10}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 border-t border-dark-border/40">
                  <label className="flex items-center gap-3 text-sm text-gray-400 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={true}
                      className="h-4.5 w-4.5 accent-primary cursor-pointer"
                    />
                    <span>Allow public registration signups</span>
                  </label>

                  <label className="flex items-center gap-3 text-sm text-gray-400 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked={false}
                      className="h-4.5 w-4.5 accent-primary cursor-pointer"
                    />
                    <span>Enable system maintenance override mode (Lock Frontend access)</span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition cursor-pointer text-sm shadow-md"
                >
                  <Save className="h-4 w-4" />
                  <span>Save System Preferences</span>
                </button>
              </form>
            </div>
          )}

          {/* Core manual Wallet Adjustment modal (Reused across views) */}
          {adjustingUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
                <button 
                  onClick={() => setAdjustingUser(null)} 
                  className="absolute top-4 right-4 p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
                
                <div>
                  <h4 className="text-lg font-bold text-white">Manual Wallet Adjustment</h4>
                  <p className="text-xs text-gray-500 mt-1">Manual adjustment for {adjustingUser.name} (ID: #{adjustingUser.id})</p>
                </div>

                <form onSubmit={handleApplyWalletAdjustment} className="space-y-4 text-start">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Target Balance Type</label>
                    <select
                      value={adjTarget}
                      onChange={(e) => setAdjTarget(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-start text-sm cursor-pointer"
                    >
                      <option value="balance">Available Balance</option>
                      <option value="lockedBalance">Locked Balance</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Adjustment Action</label>
                    <select
                      value={adjType}
                      onChange={(e) => setAdjType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-start text-sm cursor-pointer"
                    >
                      <option value="CREDIT">CREDIT (+) Add Funds</option>
                      <option value="DEBIT">DEBIT (-) Deduct Funds</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Value Amount ($)</label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={adjAmount}
                      onChange={(e) => setAdjAmount(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Adjustment Note / Reason</label>
                    <textarea
                      placeholder="Specify adjustment audit notes..."
                      required
                      value={adjDesc}
                      onChange={(e) => setAdjDesc(e.target.value)}
                      rows="2"
                      className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 cursor-pointer text-sm"
                  >
                    Apply Adjustment
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {isEditModalOpen && selectedUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl relative">
                <button 
                  onClick={() => { setIsEditModalOpen(false); setSelectedUser(null); }} 
                  className="absolute top-6 right-6 text-gray-400 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="text-start">
                  <h3 className="text-xl font-bold text-white">Edit User</h3>
                  <p className="text-sm text-gray-400 mt-1 font-semibold">{selectedUser.name}</p>
                </div>

                <form onSubmit={handleEditUserSubmit} className="space-y-4 text-start">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span>Email</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                      <UserCheck className="h-4 w-4 text-gray-400" />
                      <span>Username</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2 flex items-center gap-1.5">
                      <Lock className="h-4 w-4 text-gray-400" />
                      <span>New Password</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Leave empty to keep current password"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm placeholder:text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Package</label>
                    <select
                      value={editPackageId}
                      onChange={(e) => setEditPackageId(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold cursor-pointer"
                    >
                      <option value="">No Package</option>
                      {dbPackages.map((pkg) => (
                        <option key={pkg.id} value={pkg.id}>
                          {pkg.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-2">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold cursor-pointer"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>

                  <div className="flex gap-3 pt-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
                      className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 rounded-xl transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg transition cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* User Details Modal */}
          {isDetailsModalOpen && selectedUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl relative">
                <button 
                  onClick={() => { setIsDetailsModalOpen(false); setSelectedUser(null); }} 
                  className="absolute top-6 right-6 p-1 bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 rounded-full cursor-pointer transition border border-blue-500/20"
                >
                  <X className="h-4 w-4" />
                </button>
                
                <div className="text-start">
                  <h3 className="text-xl font-bold text-white">User Details</h3>
                </div>

                {/* Grid of basic metadata info */}
                <div className="grid grid-cols-2 gap-4 text-start pb-4 border-b border-dark-border/40">
                  <div>
                    <span className="block text-xs text-gray-500 font-medium">Name</span>
                    <span className="text-sm font-semibold text-white mt-1 block">{selectedUser.name}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium">Username</span>
                    <span className="text-sm font-semibold text-white mt-1 block ltr">{selectedUser.username || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium">Email</span>
                    <span className="text-sm font-semibold text-white mt-1 block ltr">{selectedUser.email}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-500 font-medium">Phone / WhatsApp</span>
                    <span className="text-sm font-semibold text-white mt-1 block font-mono">{getPhoneNumber(selectedUser.id)}</span>
                  </div>
                  <div className="mt-2">
                    <span className="block text-xs text-gray-500 font-medium">Referral Code</span>
                    <span className="inline-block mt-1 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-gray-300 font-semibold select-all">
                      {getReferralCode(selectedUser.id)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="block text-xs text-gray-500 font-medium">Account Role</span>
                    <span className={`inline-block mt-1 px-2.5 py-1 border rounded-lg text-xs font-bold uppercase ${
                      selectedUser.role === 'MARKETER' 
                        ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    }`}>
                      {selectedUser.role === 'MARKETER' ? 'Business Partner' : 'Student'}
                    </span>
                  </div>
                </div>

                {/* 3 cards/boxes */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 border border-white/5 p-3 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Main</span>
                    <span className="block text-base font-bold text-white mt-1 font-mono">${Number(selectedUser.wallet?.balance || 0).toFixed(2)}</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-3 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Bonus</span>
                    <span className="block text-base font-bold text-white mt-1 font-mono">$0.00</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-3 rounded-2xl text-center">
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Collection %</span>
                    <span className="block text-base font-bold text-emerald-400 mt-1 font-mono">
                      {selectedUser.collectionPercentage !== undefined ? `${selectedUser.collectionPercentage}%` : 'Loading...'}
                    </span>
                  </div>
                </div>

                {/* Monthly Subscription Remaining Time */}
                {selectedUser.role === 'MARKETER' && (
                  <div className="space-y-2 pt-4 border-t border-dark-border/40 text-start">
                    <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">Subscription Status</span>
                    
                    <div className="flex justify-between items-end">
                      {selectedUser.gracePeriodEndsAt && new Date(selectedUser.gracePeriodEndsAt) > new Date() ? (
                        <>
                          <span className="text-3xl font-extrabold text-blue-400 font-mono">
                            {Math.ceil((new Date(selectedUser.gracePeriodEndsAt) - new Date()) / (1000 * 60 * 60 * 24))}
                          </span>
                          <span className="text-xs text-gray-400 font-semibold mb-1 font-mono">
                            Days Remaining
                          </span>
                        </>
                      ) : (
                        <span className="text-xl font-extrabold text-red-500">
                          EXPIRED (PAYMENT DUE)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Challenge Modal */}
      {/* Create Challenge Modal */}
      {isCreateChallengeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsCreateChallengeModalOpen(false)}>
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setIsCreateChallengeModalOpen(false)} 
              className="absolute top-6 right-6 p-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full cursor-pointer transition"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-start mb-6">
              <h3 className="text-xl font-bold text-white">Create Campaign Challenge</h3>
              <p className="text-xs text-gray-500 mt-1">Configure and launch a new incentive challenge for the network</p>
            </div>
            
            <form onSubmit={handleCreateChallenge} className="space-y-4 text-start">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Challenge Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Turkey Travel Campaign"
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Target Sales Required</label>
                  <input
                    type="number"
                    required
                    value={challengeSales}
                    onChange={(e) => setChallengeSales(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Target Revenue ($)</label>
                  <input
                    type="number"
                    required
                    value={challengeRevenue}
                    onChange={(e) => setChallengeRevenue(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Required Directs</label>
                  <input
                    type="number"
                    required
                    value={challengeRequiredDirects}
                    onChange={(e) => setChallengeRequiredDirects(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Directs Type</label>
                  <select
                    value={challengeDirectsType}
                    onChange={(e) => setChallengeDirectsType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs text-start cursor-pointer font-semibold"
                  >
                    <option value="ANY">Any Referral</option>
                    <option value="MARKETER">Marketers Only</option>
                    <option value="STUDENT">Students Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Reward Type</label>
                  <select
                    value={challengeReward}
                    onChange={(e) => setChallengeReward(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs text-start cursor-pointer font-semibold"
                  >
                    <option value="TRAVEL">International Travel</option>
                    <option value="BONUS">Cash Bonus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Cash Reward ($)</label>
                  <input
                    type="number"
                    required
                    value={challengeRewardAmount}
                    onChange={(e) => setChallengeRewardAmount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Leg limit percentage (%)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  placeholder="e.g. 40"
                  value={challengeLegLimit}
                  onChange={(e) => setChallengeLegLimit(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs text-center font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Challenge Banner Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setChallengeImageFile(e.target.files[0])}
                  className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 file:cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={challengeStart}
                    onChange={(e) => setChallengeStart(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={challengeEnd}
                    onChange={(e) => setChallengeEnd(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Description</label>
                <textarea
                  placeholder="Add details..."
                  value={challengeDesc}
                  onChange={(e) => setChallengeDesc(e.target.value)}
                  rows="2"
                  className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-border/40">
                <button
                  type="button"
                  onClick={() => setIsCreateChallengeModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl transition duration-300 cursor-pointer shadow-lg"
                >
                  Launch Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isChallengeModalOpen && editingChallenge && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-dark-card border border-dark-border rounded-3xl p-6 max-w-lg w-full shadow-2xl relative">
                <button 
                  onClick={() => { setIsChallengeModalOpen(false); setEditingChallenge(null); }} 
                  className="absolute top-6 right-6 p-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full cursor-pointer transition"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="text-start mb-6">
                  <h3 className="text-xl font-bold text-white">Edit Challenge</h3>
                </div>
                <form onSubmit={handleUpdateChallenge} className="space-y-4 text-start">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Title</label>
                    <input type="text" required value={challengeTitle} onChange={(e) => setChallengeTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-semibold focus:outline-none focus:border-primary" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Sales Req</label>
                      <input type="number" required value={challengeSales} onChange={(e) => setChallengeSales(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-mono text-center focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Target Revenue ($)</label>
                      <input type="number" required value={challengeRevenue} onChange={(e) => setChallengeRevenue(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-mono text-center focus:outline-none focus:border-primary" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Required Directs</label>
                      <input type="number" required value={challengeRequiredDirects} onChange={(e) => setChallengeRequiredDirects(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-mono text-center focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Directs Type</label>
                      <select value={challengeDirectsType} onChange={(e) => setChallengeDirectsType(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-semibold focus:outline-none focus:border-primary">
                        <option value="ANY">Any Referral</option>
                        <option value="MARKETER">Marketers Only</option>
                        <option value="STUDENT">Students Only</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Reward Type</label>
                      <select value={challengeReward} onChange={(e) => setChallengeReward(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-semibold focus:outline-none focus:border-primary">
                        <option value="TRAVEL">International Travel</option>
                        <option value="BONUS">Cash Bonus</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Cash Reward ($)</label>
                      <input type="number" required value={challengeRewardAmount} onChange={(e) => setChallengeRewardAmount(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-mono text-center focus:outline-none focus:border-primary" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Leg Limit %</label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="100"
                        value={challengeLegLimit}
                        onChange={(e) => setChallengeLegLimit(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-mono text-center focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Status</label>
                      <select value={challengeIsActive} onChange={(e) => setChallengeIsActive(e.target.value === 'true')} className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-semibold focus:outline-none focus:border-primary">
                        <option value="true">ACTIVE</option>
                        <option value="false">INACTIVE</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 mb-1">Change Banner Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setChallengeImageFile(e.target.files[0])}
                      className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30 file:cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">Start Date</label>
                      <input type="date" required value={challengeStart} onChange={(e) => setChallengeStart(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-mono focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1">End Date</label>
                      <input type="date" required value={challengeEnd} onChange={(e) => setChallengeEnd(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-dark-bg border border-dark-border text-white text-xs font-mono focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition cursor-pointer text-sm mt-4">Save Changes</button>
                </form>
              </div>
            </div>
          )}
        </>
      )}
      {/* Edit Rank Modal */}
      {isRankModalOpen && (
        <EditRankModal 
          isOpen={isRankModalOpen} 
          onClose={() => setIsRankModalOpen(false)} 
          rank={editingRank}
          onSave={handleSaveRankModal}
        />
      )}
      {/* Create Rank Modal */}
      {isCreateRankModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={() => setIsCreateRankModalOpen(false)}>
          <div className="bg-dark-card border border-dark-border rounded-3xl p-8 w-full max-w-lg mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-lg font-bold text-white">Create Leader Rank</h4>
                <p className="text-xs text-gray-500 mt-1">Introduce a new rank model to the MLM tree structure</p>
              </div>
              <button onClick={() => setIsCreateRankModalOpen(false)} className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddRank} className="space-y-5 text-start">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Rank Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AMBASSADOR"
                  value={newRankName}
                  onChange={(e) => setNewRankName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Required Direct Students</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 12"
                  value={newRankStudents}
                  onChange={(e) => setNewRankStudents(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Required Platinum Legs</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 2"
                  value={newRankPlatinumLegs}
                  onChange={(e) => setNewRankPlatinumLegs(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Payout Cap %</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 100%"
                  value={newRankPayoutCap}
                  onChange={(e) => setNewRankPayoutCap(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white text-start focus:outline-none focus:border-primary text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Status</label>
                <select
                  value={newRankStatus}
                  onChange={(e) => setNewRankStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                >
                  <option value="ACTIVE">Active (نشطة)</option>
                  <option value="INACTIVE">Inactive (غير نشطة)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-dark-border/40">
                <button
                  type="button"
                  onClick={() => setIsCreateRankModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl transition duration-300 cursor-pointer shadow-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Email Template Modal */}
      {isTemplateModalOpen && editingTemplate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn" onClick={() => setIsTemplateModalOpen(false)}>
          <div className="bg-dark-card border border-dark-border rounded-3xl p-6 w-full max-w-4xl mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Email Template: {editingTemplate.name}</h3>
                <p className="text-xs text-gray-500 mt-1">Slug: <span className="font-mono text-gray-400">{editingTemplate.slug}</span></p>
              </div>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-6 text-start">
              {/* Active Toggle */}
              <div className="flex items-center justify-between p-4 bg-dark-bg/40 border border-dark-border rounded-2xl">
                <div>
                  <label className="text-sm font-bold text-white block">Template Status</label>
                  <span className="text-xs text-gray-500">Enable or disable sending notifications using this template</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplateIsActive(!templateIsActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${templateIsActive ? 'bg-primary' : 'bg-white/10'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${templateIsActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Email Subject Title</label>
                <input
                  type="text"
                  required
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
                />
              </div>

              {/* HTML Body */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-gray-400">HTML Code & Markup</label>
                  <span className="text-[10px] text-gray-500">Supports standard HTML tags</span>
                </div>
                <textarea
                  required
                  rows="12"
                  value={templateHtmlBody}
                  onChange={(e) => setTemplateHtmlBody(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs font-mono leading-relaxed"
                  placeholder="Enter HTML layout..."
                />
              </div>

              {/* Supported Placeholders */}
              <div>
                <span className="block text-xs font-semibold text-gray-400 mb-2">Supported Dynamic Placeholders:</span>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    let vars = [];
                    try {
                      vars = JSON.parse(editingTemplate.variables);
                    } catch (e) {}
                    return vars.length > 0 ? (
                      vars.map((v, i) => (
                        <span key={i} className="px-2.5 py-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold rounded-lg font-mono">
                          {"{{"}{v}{"}}"}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500">None</span>
                    );
                  })()}
                </div>
              </div>

              <hr className="border-dark-border/40" />

              {/* Send Test Email Section */}
              <div className="p-5 bg-dark-bg/60 border border-dark-border rounded-2xl space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                    <span>Send Test Email Notification</span>
                  </h4>
                  <p className="text-[10px] text-gray-500 mt-0.5">Send a mockup test of this template with fake test variables to any email</p>
                </div>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="Enter recipient email address..."
                    value={testEmailAddress}
                    onChange={(e) => setTestEmailAddress(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={handleSendTestEmail}
                    disabled={sendingTestEmail || !testEmailAddress}
                    className="px-5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {sendingTestEmail ? 'Sending...' : 'Dispatch Test'}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-dark-border/40">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl transition duration-300 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {savingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
