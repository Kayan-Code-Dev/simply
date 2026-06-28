import React, { useState, useEffect } from 'react';
import { useTranslation } from '../utils/useTranslation';
import { walletApi } from '../services/api';
import { 
  History, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle, 
  XCircle,
  Download,
  Calendar,
  DollarSign
} from 'lucide-react';

export default function TransactionsPage() {
  const { t, language, dir } = useTranslation();
  const [walletInfo, setWalletInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest, lowest

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await walletApi.getInfo();
        setWalletInfo(res.data);
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTransactions();
  }, []);

  const getTransactionTypeLabel = (type, details) => {
    const parsedDetails = JSON.parse(details || '{}');
    if (type === 'DEPOSIT') return t('depositFunds') || 'Deposit';
    if (type === 'WITHDRAWAL') return t('withdrawTitle') || 'Withdrawal';
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
        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Completed</span>
        </span>
      );
    }
    if (status === 'PENDING') {
      return (
        <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-semibold px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <Clock className="h-3.5 w-3.5 animate-spin" />
          <span>Pending</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-red-400 text-xs font-semibold px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
        <XCircle className="h-3.5 w-3.5" />
        <span>Failed</span>
      </span>
    );
  };

  // Helper to determine if transaction is an outflow (negative value)
  const isOutflow = (type, details) => {
    if (type === 'WITHDRAWAL') return true;
    if (type === 'ACTIVATION_FEE') return true;
    if (type === 'TRANSFER') {
      const parsedDetails = JSON.parse(details || '{}');
      return parsedDetails.action === 'SENT';
    }
    return false;
  };

  // Filter and sort logic
  const getProcessedTransactions = () => {
    if (!walletInfo?.transactions) return [];

    let filtered = [...walletInfo.transactions];

    // 1. Search Query filter (matches type label, amount, details, payment method)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((t) => {
        const typeLabel = getTransactionTypeLabel(t.type, t.details).toLowerCase();
        const method = t.paymentMethod?.toLowerCase() || '';
        const id = t.id?.toString() || '';
        const amount = t.amount?.toString() || '';
        const detailsStr = t.details?.toLowerCase() || '';
        return typeLabel.includes(query) || method.includes(query) || id.includes(query) || amount.includes(query) || detailsStr.includes(query);
      });
    }

    // 2. Status Filter
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((t) => t.status === statusFilter);
    }

    // 3. Type Filter
    if (typeFilter !== 'ALL') {
      filtered = filtered.filter((t) => {
        if (typeFilter === 'DEPOSIT') return t.type === 'DEPOSIT';
        if (typeFilter === 'WITHDRAWAL') return t.type === 'WITHDRAWAL';
        if (typeFilter === 'ACTIVATION_FEE') return t.type === 'ACTIVATION_FEE';
        if (typeFilter === 'PACKAGE_PURCHASE') return t.type === 'PACKAGE_PURCHASE';
        if (typeFilter === 'TRANSFER_SENT') return t.type === 'TRANSFER' && JSON.parse(t.details || '{}').action === 'SENT';
        if (typeFilter === 'TRANSFER_RECEIVED') return t.type === 'TRANSFER' && JSON.parse(t.details || '{}').action !== 'SENT';
        return true;
      });
    }

    // 4. Sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'highest') return Number(b.amount) - Number(a.amount);
      if (sortBy === 'lowest') return Number(a.amount) - Number(b.amount);
      return 0;
    });

    return filtered;
  };

  const processedTransactions = getProcessedTransactions();

  // Calculate statistics from current filtered transactions
  const totalInflow = walletInfo?.transactions
    ?.filter(t => t.status === 'COMPLETED' && !isOutflow(t.type, t.details))
    ?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const totalOutflow = walletInfo?.transactions
    ?.filter(t => t.status === 'COMPLETED' && isOutflow(t.type, t.details))
    ?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  const totalPending = walletInfo?.transactions
    ?.filter(t => t.status === 'PENDING')
    ?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  // Export to CSV helper
  const exportToCSV = () => {
    if (!processedTransactions.length) return;
    const headers = ['Date', 'Transaction ID', 'Type', 'Method', 'Status', 'Amount'];
    const rows = processedTransactions.map(t => [
      new Date(t.createdAt).toLocaleString(),
      t.id,
      getTransactionTypeLabel(t.type, t.details),
      t.paymentMethod,
      t.status,
      `${isOutflow(t.type, t.details) ? '-' : '+'}$${t.amount}`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Simply_Transactions_Ledger_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6 max-w-6xl mx-auto font-sans text-start">
      
      {/* Header Banner */}
      <div className="p-4 md:p-6 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary shadow-inner">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{t('transactions') || 'Transactions Ledger'}</h2>
            <p className="text-xs text-gray-500 mt-1">Review, filter, and audit your complete account ledger statement</p>
          </div>
        </div>
        <button
          onClick={exportToCSV}
          disabled={processedTransactions.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed border border-white/10 hover:border-white/20 text-white text-xs font-bold rounded-xl transition duration-300 cursor-pointer shadow-lg"
        >
          <Download className="h-4 w-4" />
          <span>Export Statement</span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            {[
              { title: 'Total Inflow (Deposits & Earnings)', value: `$${totalInflow.toLocaleString(undefined, {minimumFractionDigits: 2})}`, icon: ArrowDownLeft, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/10' },
              { title: 'Total Outflow (Withdrawals & Fees)', value: `$${totalOutflow.toLocaleString(undefined, {minimumFractionDigits: 2})}`, icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/5 border-red-500/10' },
              { title: 'Uncleared (Pending Verification)', value: `$${totalPending.toLocaleString(undefined, {minimumFractionDigits: 2})}`, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/10' }
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className={`bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 flex items-center justify-between shadow-xl transition-all duration-300 hover:translate-y-[-2px]`}>
                  <div>
                    <p className="text-xs font-bold text-gray-500 tracking-wider uppercase">{card.title}</p>
                    <h3 className="text-2xl font-bold text-white mt-2.5 font-mono">{card.value}</h3>
                  </div>
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center bg-white/5 border border-white/10 ${card.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filtering and Search Controls */}
          <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by ID, method, amount, status..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-dark-bg border border-dark-border rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-primary transition duration-200"
                />
              </div>

              {/* Sorting */}
              <div className="flex items-center gap-2 bg-dark-bg border border-dark-border rounded-xl px-3 py-2.5">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent border-none text-white text-xs font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="highest">Highest Amount</option>
                  <option value="lowest">Lowest Amount</option>
                </select>
              </div>
            </div>

            {/* Filter tags / buttons row */}
            <div className="flex flex-wrap gap-4 pt-2 border-t border-dark-border/40 items-center">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Filters:</span>
              
              {/* Status Filter */}
              <div className="flex gap-1.5 bg-dark-bg p-1 rounded-xl border border-dark-border">
                {['ALL', 'COMPLETED', 'PENDING', 'FAILED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition duration-200 cursor-pointer ${
                      statusFilter === st 
                        ? 'bg-primary text-white shadow-md' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Type Filter dropdown */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-dark-bg border border-dark-border rounded-xl text-xs font-semibold text-white focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="DEPOSIT">Deposits</option>
                <option value="WITHDRAWAL">Withdrawals</option>
                <option value="ACTIVATION_FEE">Activation Fees</option>
                <option value="PACKAGE_PURCHASE">Enrollments</option>
                <option value="TRANSFER_SENT">Transfers Sent</option>
                <option value="TRANSFER_RECEIVED">Transfers Received</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-bold text-white">Statement Logs ({processedTransactions.length})</h4>
              <span className="text-xs text-gray-500 font-semibold">Real-time ledger updates</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse" dir={dir}>
                <thead>
                  <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                    <th className="pb-3 text-start pl-2">Date & Time</th>
                    <th className="pb-3 text-start">Transaction ID</th>
                    <th className="pb-3 text-start">Operation</th>
                    <th className="pb-3 text-start">Method</th>
                    <th className="pb-3 text-center">Status</th>
                    <th className="pb-3 text-end pr-4">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300 font-medium">
                  {processedTransactions.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-all duration-150 group">
                      <td className="py-3.5 text-start text-xs text-gray-400 pl-2">
                        {new Date(item.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                      </td>
                      <td className="py-3.5 text-start text-xs font-mono text-gray-500 group-hover:text-gray-400">
                        #{item.id}
                      </td>
                      <td className="py-3.5 text-start text-white">
                        {getTransactionTypeLabel(item.type, item.details)}
                      </td>
                      <td className="py-3.5 text-start text-xs font-mono text-gray-400">
                        {item.paymentMethod}
                      </td>
                      <td className="py-3.5 text-center">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className={`py-3.5 text-end pr-4 font-mono font-bold ${
                        isOutflow(item.type, item.details)
                          ? 'text-red-400' 
                          : 'text-emerald-400'
                      }`}>
                        {isOutflow(item.type, item.details) ? '-' : '+'}
                        ${Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                    </tr>
                  ))}

                  {processedTransactions.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-500 text-sm">
                        No transactions match the selected filters or search terms.
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
