import React, { useState, useEffect } from 'react';
import { teamApi } from '../services/api';
import { useTranslation } from '../utils/useTranslation';
import { Trophy, Calendar, PlaneTakeoff, ShieldAlert, Award, Compass } from 'lucide-react';

export default function Challenges() {
  const { t, language } = useTranslation();
  const [challenges, setChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(false);

  useEffect(() => {
    // Fetch all active challenges
    teamApi.getChallenges()
      .then(res => {
        setChallenges(res.data);
        if (res.data.length > 0) {
          setSelectedChallenge(res.data[0]);
        } else {
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error fetching challenges:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (selectedChallenge) {
      setProgressLoading(true);
      teamApi.getChallengeProgress(selectedChallenge.id)
        .then(res => {
          setProgressData(res.data.progress);
        })
        .catch(err => {
          console.error('Error fetching challenge progress:', err);
        })
        .finally(() => {
          setProgressLoading(false);
          setLoading(false);
        });
    }
  }, [selectedChallenge]);

  const getLocalizedRewardType = (type) => {
    return type === 'TRAVEL' ? t('travelReward') : t('bonusReward');
  };

  return (
    <div className="space-y-4 md:space-y-8 p-4 md:p-6 max-w-6xl mx-auto font-sans text-start">
      
      {/* Header */}
      <div className="p-4 md:p-6 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl flex justify-between items-center">
        <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
          <PlaneTakeoff className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">{t('challengesTitle')}</h2>
          <p className="text-xs text-gray-500 mt-1">{t('challengesSubtitle')}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-16 bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl">
          <Compass className="h-16 w-16 mx-auto text-gray-600 mb-4 animate-bounce" />
          <h3 className="text-xl font-bold text-white">{t('noChallenges')}</h3>
          <p className="text-sm text-gray-500 mt-2">{t('noChallengesDesc')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
          
          {/* List of Challenges (Left/Right Panel based on LTR/RTL) */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 px-2">{t('activeChallenges')}</h3>
            {challenges.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedChallenge(c)}
                className={`w-full p-4 md:p-5 rounded-2xl md:rounded-3xl border text-start transition-all duration-300 flex flex-col gap-3 cursor-pointer ${
                  selectedChallenge?.id === c.id
                    ? 'border-primary bg-primary/10 text-white'
                    : 'border-dark-border bg-dark-card text-gray-400 hover:bg-white/5'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    c.rewardType === 'TRAVEL' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {getLocalizedRewardType(c.rewardType)}
                  </span>
                  <h4 className="font-bold text-white text-base truncate max-w-[150px]">{c.title}</h4>
                </div>

                <p className="text-xs text-gray-500 line-clamp-2">{c.description}</p>
                
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(c.endDate).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Challenge Progress Detail */}
          <div className="lg:col-span-2 space-y-6">
            {progressLoading ? (
              <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl h-96 flex items-center justify-center">
                <div className="h-8 w-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : progressData ? (
              <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-xl space-y-4 md:space-y-8">
                
                {/* Challenge Banner Image */}
                {selectedChallenge?.imageUrl && (
                  <div className="w-full h-44 md:h-56 rounded-2xl overflow-hidden border border-dark-border shadow-inner">
                    <img 
                      src={`${(import.meta.env.VITE_API_URL || '').replace('/api', '')}${selectedChallenge.imageUrl}`} 
                      alt={selectedChallenge.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Reward info banner */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-dark-bg/60 border border-dark-border rounded-2xl p-5 gap-4">
                  <div className="flex items-center gap-3 text-start">
                    <div className="h-12 w-12 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center text-emerald-400 font-bold text-lg">
                      {progressData.qualifiedPercent}%
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{t('qualifiedPercent')}</h4>
                      <p className="text-xs text-gray-500 mt-1">{t('qualifiedLegsRule')} {selectedChallenge?.performanceLevel}%</p>
                      {selectedChallenge?.rewardAmount > 0 && (
                        <div className="mt-2 text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 w-fit">
                          <Award className="h-4 w-4 shrink-0 animate-bounce" />
                          <span>+${selectedChallenge.rewardAmount} USD Reward</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-start md:text-end">
                    <span className="text-xs text-gray-500 block">Overall Target Status</span>
                    <span className="mt-1 block">
                      {progressData.isQualified ? (
                        <span className="text-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-xl font-bold uppercase inline-flex items-center gap-1">
                          <Award className="h-4.5 w-4.5" /> Qualified
                        </span>
                      ) : (
                        <span className="text-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-xl font-bold uppercase">
                          Pending Targets
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Requirements Progress bars */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {selectedChallenge?.targetSales > 0 && (
                    <div className="space-y-2 bg-dark-bg/30 border border-dark-border/40 rounded-2xl p-4 text-start">
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span className="font-bold text-white">Team Sales Target</span>
                        <span className="font-semibold text-white font-mono">{progressData.qualifiedSales} / {selectedChallenge.targetSales}</span>
                      </div>
                      <div className="w-full bg-dark-bg rounded-full h-2.5 overflow-hidden border border-dark-border">
                        <div 
                          className="bg-gradient-to-r from-primary to-blue-500 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${progressData.salesPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>{progressData.isSalesQualified ? 'Qualified' : `Needed: ${selectedChallenge.targetSales - progressData.qualifiedSales} sales`}</span>
                        <span>{progressData.salesPercent}% Completed</span>
                      </div>
                    </div>
                  )}

                  {selectedChallenge?.targetRevenue > 0 && (
                    <div className="space-y-2 bg-dark-bg/30 border border-dark-border/40 rounded-2xl p-4 text-start">
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span className="font-bold text-white">Team Revenue Target</span>
                        <span className="font-semibold text-emerald-400 font-mono">${progressData.qualifiedRevenue} / ${selectedChallenge.targetRevenue}</span>
                      </div>
                      <div className="w-full bg-dark-bg rounded-full h-2.5 overflow-hidden border border-dark-border">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${progressData.revenuePercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>{progressData.isRevenueQualified ? 'Qualified' : `Needed: $${(selectedChallenge.targetRevenue - progressData.qualifiedRevenue).toFixed(2)}`}</span>
                        <span>{progressData.revenuePercent}% Completed</span>
                      </div>
                    </div>
                  )}

                  {selectedChallenge?.requiredDirects > 0 && (
                    <div className="space-y-2 bg-dark-bg/30 border border-dark-border/40 rounded-2xl p-4 text-start col-span-full">
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span className="font-bold text-white">
                          Direct Referrals ({selectedChallenge.directsType === 'ANY' ? 'Any' : selectedChallenge.directsType === 'MARKETER' ? 'Marketers Only' : 'Students Only'})
                        </span>
                        <span className="font-semibold text-primary font-mono">{progressData.directsCount} / {selectedChallenge.requiredDirects}</span>
                      </div>
                      <div className="w-full bg-dark-bg rounded-full h-2.5 overflow-hidden border border-dark-border">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500" 
                          style={{ width: `${progressData.directsPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-gray-500">
                        <span>{progressData.directsQualified ? 'Qualified' : `Needed: ${selectedChallenge.requiredDirects - progressData.directsCount} direct referrals`}</span>
                        <span>{progressData.directsPercent}% Completed</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Leg Contributions Breakdown */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-dark-border/40 pb-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    <span>{t('legsContributionTitle')} {selectedChallenge?.performanceLevel}%</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    {progressData.legs.map((leg) => (
                      <div key={leg.refId} className="bg-dark-bg/40 border border-dark-border/60 rounded-2xl p-4 flex flex-col gap-3 justify-between">
                        <div className="flex justify-between items-start">
                          <h5 className="font-bold text-white text-sm">{leg.refName}</h5>
                          {(leg.salesLimitExceeded || leg.revenueLimitExceeded) && (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full flex items-center gap-1">
                              <ShieldAlert className="h-3 w-3" /> Leg Limit Exceeded
                            </span>
                          )}
                        </div>

                        <div className="space-y-1.5 text-xs text-start">
                          {selectedChallenge.targetSales > 0 && (
                            <div className="flex justify-between text-gray-400 border-t border-dark-border/30 pt-2">
                              <span>Sales count</span>
                              <span className="font-mono text-white font-semibold">
                                {leg.qualifiedSales} / {leg.totalSales}
                              </span>
                            </div>
                          )}
                          {selectedChallenge.targetRevenue > 0 && (
                            <div className="flex justify-between text-gray-400 border-t border-dark-border/30 pt-2">
                              <span>Revenue volume</span>
                              <span className="font-mono text-emerald-400 font-semibold">
                                ${leg.qualifiedRevenue.toFixed(2)} / ${leg.totalRevenue.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Own sales */}
                    <div className="bg-dark-bg/40 border border-dark-border/60 rounded-2xl p-4 flex flex-col gap-3 justify-between">
                      <div className="flex justify-between items-center">
                        <h5 className="font-bold text-white text-sm">{t('ownDirectSales')}</h5>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                          100% Direct
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-start">
                        {selectedChallenge.targetSales > 0 && (
                          <div className="flex justify-between text-gray-400 border-t border-dark-border/30 pt-2">
                            <span>Sales count</span>
                            <span className="font-mono text-white font-semibold">
                              {progressData.ownSales}
                            </span>
                          </div>
                        )}
                        {selectedChallenge.targetRevenue > 0 && (
                          <div className="flex justify-between text-gray-400 border-t border-dark-border/30 pt-2">
                            <span>Revenue volume</span>
                            <span className="font-mono text-emerald-400 font-semibold">
                              ${progressData.ownRevenue.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {progressData.legs.length === 0 && (
                      <div className="col-span-full py-6 text-center text-gray-500 border border-dashed border-dark-border rounded-xl">
                        {t('noSubtreeLegs')}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : null}
          </div>

        </div>
      )}
    </div>
  );
}
