import React, { useState, useEffect } from 'react';
import { X, Users, ShieldAlert, Crown, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EditRankModal({ isOpen, onClose, rank, onSave }) {
  const [formData, setFormData] = useState({
    nameEn: '',
    nameAr: '',
    order: 1,
    icon: '🏅',
    directReferrals: 0,
    teamSize: 0,
    requiredStudents: 0,
    requiredPlatinumLegs: 0,
    requiredPackagePrice: 0,
    directBonusPct: 0,
    monthlyBonus: 0,
    durationMonths: 0,
  });

  const iconsList = ['🏅', '🥇', '🥈', '🥉', '💎', '👑', '🏆', '⭐', '🌟', '💫', '🔥'];

  useEffect(() => {
    if (rank) {
      setFormData({
        nameEn: rank.nameEn || rank.name || '',
        nameAr: rank.nameAr || '',
        order: rank.order || 1,
        icon: rank.icon || '🏅',
        directReferrals: rank.directReferrals || 0,
        teamSize: rank.teamSize || 0,
        requiredStudents: rank.requiredStudents || 0,
        requiredPlatinumLegs: rank.requiredPlatinumLegs || 0,
        requiredPackagePrice: rank.requiredPackagePrice || 0,
        directBonusPct: rank.directBonusPct || 0,
        monthlyBonus: rank.monthlyBonus || 0,
        durationMonths: rank.durationMonths || 0,
      });
    }
  }, [rank]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave({
      ...rank,
      ...formData,
      name: formData.nameEn
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Edit Rank: {rank?.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-8">
          
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Rank Name (English)</label>
              <input type="text" name="nameEn" value={formData.nameEn} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-800" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Rank Name (Arabic)</label>
              <input type="text" name="nameAr" value={formData.nameAr} onChange={handleChange} dir="rtl" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-800" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Rank Order</label>
              <input type="number" name="order" value={formData.order} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-800" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">Icon</label>
              <div className="flex flex-wrap gap-2">
                {iconsList.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData({...formData, icon})}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${formData.icon === icon ? 'bg-blue-50 border-2 border-blue-500 shadow-sm scale-110' : 'bg-gray-50 border border-transparent hover:bg-gray-100'}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Basic Requirements */}
          <div className="bg-[#f9f5f6] rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold">
              <Users className="w-5 h-5" />
              <h3>Basic Requirements</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Direct Referrals</label>
                <input type="number" name="directReferrals" value={formData.directReferrals} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 text-gray-800 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Team Size</label>
                <input type="number" name="teamSize" value={formData.teamSize} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 text-gray-800 bg-white" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Required Direct Students</label>
                <input type="number" name="requiredStudents" value={formData.requiredStudents} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 text-gray-800 bg-white font-mono" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Required Platinum Legs</label>
                <input type="number" name="requiredPlatinumLegs" value={formData.requiredPlatinumLegs} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 text-gray-800 bg-white font-mono" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-yellow-600 mb-2 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full border-2 border-yellow-500" />
                  Required Package Price
                </label>
                <input type="number" name="requiredPackagePrice" value={formData.requiredPackagePrice} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-blue-500 text-gray-800 bg-white font-mono" />
                <p className="text-xs text-gray-400 mt-1">0 for no requirement</p>
              </div>
            </div>
          </div>

          {/* Required Downline Ranks */}
          <div className="bg-[#fffdf0] rounded-2xl p-6 border border-yellow-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-yellow-700 font-bold">
                <ShieldAlert className="w-5 h-5" />
                <h3>Required Downline Ranks</h3>
              </div>
              <button type="button" className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-yellow-200 text-gray-700 text-sm font-semibold hover:bg-yellow-50 transition-colors">
                <Plus className="w-4 h-4" /> Add Condition
              </button>
            </div>
            <p className="text-sm text-gray-400">No downline rank requirements</p>
          </div>

          {/* Rewards */}
          <div className="bg-[#f2fdf4] rounded-2xl p-6 border border-green-100">
            <div className="flex items-center gap-2 mb-4 text-green-700 font-bold">
              <Crown className="w-5 h-5" />
              <h3>Rewards</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Direct Bonus %</label>
                <input type="number" step="0.01" name="directBonusPct" value={formData.directBonusPct} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500 text-gray-800 bg-white font-mono" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2">Monthly Bonus ($)</label>
                <input type="number" name="monthlyBonus" value={formData.monthlyBonus} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500 text-gray-800 bg-white font-mono" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-2 flex items-center gap-1">
                  Duration (Months)
                </label>
                <input type="number" name="durationMonths" value={formData.durationMonths} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-green-500 text-gray-800 bg-white font-mono" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">Example: 5% extra on directs + $500/month for 12 months</p>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors">Cancel</button>
            <button type="submit" className="px-6 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all">Save Changes</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
