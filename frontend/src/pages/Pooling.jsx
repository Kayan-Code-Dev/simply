import React, { useState, useEffect } from 'react';
import { teamApi } from '../services/api';
import { useTranslation } from '../utils/useTranslation';
import { useAuthStore } from '../store/authStore';
import { 
  Coins, Lock, Unlock, Users, Award, History, Sparkles, RefreshCw, Calendar
} from 'lucide-react';

export default function Pooling() {
  const { t, dir } = useTranslation();
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPoolsData = async () => {
    try {
      const res = await teamApi.getPools();
      setData(res.data);
    } catch (err) {
      console.error('Error fetching pools data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPoolsData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPoolsData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Next target helper
  const getNextRankTarget = (currentRank) => {
    const ranksOrder = [
      'DISTRIBUTOR', 'STARTER_LEADER', 'MANAGER_LEADER', 'SILVER_LEADER', 
      'GOLD', 'PLATINUM', 'RUBY', 'EMERALD', 'DIAMOND', 
      'BLUE_DIAMOND', 'BLACK_DIAMOND', 'LEGEND'
    ];
    const currentIndex = ranksOrder.indexOf(currentRank);
    if (currentIndex === -1 || currentIndex >= ranksOrder.indexOf('RUBY')) {
      return null;
    }
    return 'RUBY';
  };

  const nextTarget = getNextRankTarget(data?.userRank);

  const poolTiers = [
    {
      id: 'RUBY',
      name: dir === 'rtl' ? 'حوض الياقوت (Ruby)' : 'Ruby Pool',
      desc: dir === 'rtl' ? 'يوزع على المؤهلين من رتبة Ruby فما فوق' : 'Distributed to Ruby rank and above',
      allocation: '$33.00',
      pending: data?.pools?.RUBY || 0,
      qualifiers: data?.qualifiers?.RUBY || 0,
      isQualified: data?.eligibility?.RUBY,
      color: 'from-rose-600/20 to-red-600/20 border-rose-500/30 text-rose-400',
      badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      glow: 'shadow-rose-500/5'
    },
    {
      id: 'DIAMOND',
      name: dir === 'rtl' ? 'حوض الألماس (Diamond)' : 'Diamond Pool',
      desc: dir === 'rtl' ? 'يوزع على المؤهلين من رتبة Diamond فما فوق' : 'Distributed to Diamond rank and above',
      allocation: '$33.00',
      pending: data?.pools?.DIAMOND || 0,
      qualifiers: data?.qualifiers?.DIAMOND || 0,
      isQualified: data?.eligibility?.DIAMOND,
      color: 'from-cyan-600/20 to-blue-600/20 border-cyan-500/30 text-cyan-400',
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      glow: 'shadow-cyan-500/5'
    },
    {
      id: 'BLACK_DIAMOND',
      name: dir === 'rtl' ? 'حوض الألماس الأسود' : 'Black Diamond Pool',
      desc: dir === 'rtl' ? 'يوزع على المؤهلين من رتبة Black Diamond فما فوق' : 'Distributed to Black Diamond and above',
      allocation: '$33.00',
      pending: data?.pools?.BLACK_DIAMOND || 0,
      qualifiers: data?.qualifiers?.BLACK_DIAMOND || 0,
      isQualified: data?.eligibility?.BLACK_DIAMOND,
      color: 'from-purple-600/20 to-indigo-600/20 border-purple-500/30 text-purple-400',
      badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      glow: 'shadow-purple-500/5'
    }
  ];

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6 max-w-6xl mx-auto font-sans text-start">
      
      {/* Header */}
      <div className="p-4 md:p-6 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl flex justify-between items-center shadow-xl">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            <span>{dir === 'rtl' ? 'نظام الأحواض المالية المشتركة' : 'Financial Pools System'}</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {dir === 'rtl' 
              ? 'تراكم أرباح مقتطعة من مبيعات الباقات وتوزيعها شهرياً على القادة المؤهلين' 
              : 'Accumulate fractions of package sales and distribute monthly to qualified leaders'}
          </p>
        </div>
        <button 
          onClick={handleRefresh}
          className={`p-2 bg-dark-bg hover:bg-white/5 border border-dark-border rounded-xl text-gray-400 hover:text-white transition duration-200 cursor-pointer ${
            refreshing ? 'animate-spin' : ''
          }`}
          title="Refresh Data"
        >
          <RefreshCw className="h-4.5 w-4.5" />
        </button>
      </div>

      {/* User Eligibility Summary Card */}
      <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-lg">
            <Award className="h-7 w-7" />
          </div>
          <div>
            <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">
              {dir === 'rtl' ? 'رتبتك الحالية في النظام' : 'Your Current Leadership Rank'}
            </span>
            <h3 className="text-xl font-black text-white uppercase mt-0.5 flex items-center gap-2">
              <span>{data?.userRank}</span>
              {data?.eligibility?.RUBY && (
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                  <Sparkles className="h-3 w-3" />
                  {dir === 'rtl' ? 'مؤهل للأحواض' : 'Pool Qualified'}
                </span>
              )}
            </h3>
          </div>
        </div>

        <div className="flex flex-col md:items-end justify-between">
          <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-wider block">
            {dir === 'rtl' ? 'إجمالي أرباح الأحواض المحققة' : 'Total Pool Earnings Paid'}
          </span>
          <h2 className="text-3xl font-black text-white font-mono mt-0.5">
            ${(data?.myPoolEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </div>

        {/* Not qualified tip */}
        {!data?.eligibility?.RUBY && nextTarget && (
          <div className="w-full md:col-span-full border-t border-dark-border/40 pt-4 mt-2 text-xs text-gray-500 flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-500" />
            <span>
              {dir === 'rtl' 
                ? `أنت غير مؤهل حالياً للأحواض المالية. تحتاج إلى الوصول لرتبة ${nextTarget} فما فوق لبدء تقاسم الأرباح.`
                : `You are not qualified for pools yet. Reach ${nextTarget} rank or above to start sharing pool profits.`}
            </span>
          </div>
        )}
      </div>

      {/* Pools Grid */}
      {poolTiers.some(p => p.isQualified) ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {poolTiers.filter(p => p.isQualified).map((pool) => (
            <div 
              key={pool.id} 
              className={`bg-gradient-to-br ${pool.color} border rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col justify-between h-72 shadow-xl ${pool.glow} relative`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${pool.badgeColor} uppercase tracking-wider`}>
                    {pool.id} Pool
                  </span>
                  
                  {pool.isQualified ? (
                    <span className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl" title="Qualified">
                      <Unlock className="h-4 w-4" />
                    </span>
                  ) : (
                    <span className="p-1.5 bg-gray-500/10 border border-gray-500/20 text-gray-500 rounded-xl" title="Locked">
                      <Lock className="h-4 w-4" />
                    </span>
                  )}
                </div>

                <h4 className="text-lg font-bold text-white mt-4">{pool.name}</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px] leading-relaxed">{pool.desc}</p>
                <span className="text-[10px] text-gray-500 block mt-2">
                  {dir === 'rtl' ? `المساهمة: ${pool.allocation} لكل باقة مباعة` : `Fraction: ${pool.allocation} per package sale`}
                </span>
              </div>

              <div className="border-t border-dark-border/40 pt-4 flex justify-between items-end">
                <div>
                  <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider block">
                    {dir === 'rtl' ? 'الرصيد التراكمي للحوض' : 'Accumulated Pool Value'}
                  </span>
                  <span className="text-2xl font-black text-white font-mono block mt-0.5">
                    ${pool.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="text-end">
                  <span className="text-[9px] text-gray-500 font-extrabold uppercase tracking-wider block flex items-center gap-1 justify-end">
                    <Users className="h-3 w-3" />
                    {dir === 'rtl' ? 'المؤهلين' : 'Qualifiers'}
                  </span>
                  <span className="text-base font-bold text-white font-mono block mt-0.5">
                    {pool.qualifiers} {dir === 'rtl' ? 'عضو' : 'members'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-dark-card border border-dark-border border-dashed rounded-2xl md:rounded-3xl p-4 md:p-8 text-center text-gray-500 shadow-xl">
          <Lock className="h-8 w-8 mx-auto mb-3 text-amber-500/80 animate-pulse" />
          <h4 className="text-white font-bold text-base mb-1">
            {dir === 'rtl' ? 'لا توجد أحواض مالية مؤهلة بعد' : 'No Qualified Pools Yet'}
          </h4>
          <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
            {dir === 'rtl'
              ? 'بمجرد وصولك إلى رتبة RUBY أو أعلى، ستظهر الأحواض المؤهل لها هنا لتقاسم أرباح مبيعات الباقات.'
              : 'Once you reach RUBY rank or above, your qualified pools will appear here to share package sale profits.'}
          </p>
        </div>
      )}

      {/* Received Pool Commissions Payouts Ledger */}
      <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 md:space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <span>{dir === 'rtl' ? 'سجل توزيعات الأحواض المستلمة' : 'My Pool Payouts History'}</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-start border-collapse" dir={dir}>
            <thead>
              <tr className="border-b border-dark-border text-gray-500 text-xs font-semibold">
                <th className="pb-3 text-start">{dir === 'rtl' ? 'تاريخ التوزيع' : 'Payout Date'}</th>
                <th className="pb-3 text-start">{dir === 'rtl' ? 'الوصف' : 'Description'}</th>
                <th className="pb-3 text-center">{dir === 'rtl' ? 'الحالة' : 'Status'}</th>
                <th className="pb-3 text-end">{dir === 'rtl' ? 'المبلغ المستلم' : 'Amount Received'}</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-dark-border/40 text-gray-300">
              {data?.poolCommissions?.map((c) => (
                <tr key={c.id} className="hover:bg-white/5 transition-all duration-150">
                  <td className="py-4 text-start font-mono text-xs flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-gray-500" />
                    {new Date(c.createdAt).toLocaleDateString(undefined, {
                      day: '2-digit', month: 'short', year: 'numeric'
                    })}
                  </td>
                  <td className="py-4 text-start font-semibold text-white">
                    {dir === 'rtl' ? 'تقاسم أرباح الأحواض الشهرية للمؤهلين' : 'Monthly leaders pool share distribution'}
                  </td>
                  <td className="py-4 text-center">
                    <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                      {dir === 'rtl' ? 'مكتمل' : 'Paid'}
                    </span>
                  </td>
                  <td className="py-4 text-end font-black text-emerald-400 font-mono">
                    +${Number(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {(!data?.poolCommissions || data.poolCommissions.length === 0) && (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-gray-500">
                    {dir === 'rtl' ? 'لم تستلم أي عمولات أحواض مالية بعد' : 'No pool payout commissions received yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
