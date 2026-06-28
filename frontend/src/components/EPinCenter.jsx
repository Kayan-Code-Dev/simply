import React, { useState, useEffect } from 'react';
import { useTranslation } from '../utils/useTranslation';
import { epinApi } from '../services/api';
import { Ticket, PlusCircle, ArrowRightLeft, Download, CheckCircle, Clock, Copy, Check } from 'lucide-react';

export default function EPinCenter({ walletBalance, onUpdateBalance, hasPinSet }) {
  const { t, dir } = useTranslation();
  const [epins, setEpins] = useState({ owned: [], transferred: [] });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  
  const [activeTab, setActiveTab] = useState('GENERATE'); // GENERATE, REDEEM, TRANSFER, HISTORY

  const [genAmount, setGenAmount] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [transferId, setTransferId] = useState('');
  const [transferTarget, setTransferTarget] = useState('');
  const [walletPin, setWalletPin] = useState('');

  const fetchEPins = async () => {
    try {
      const res = await epinApi.list();
      setEpins({
        owned: res.data.ownedEPins || [],
        transferred: res.data.transferredEPins || []
      });
    } catch (err) {
      console.error('Error fetching E-Pins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEPins();
  }, []);

  const handleClearMsgs = () => {
    setError(null);
    setSuccess(null);
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    handleClearMsgs();
    if (!genAmount || Number(genAmount) <= 0) return;
    
    if (Number(genAmount) > Number(walletBalance)) {
      return setError('Insufficient wallet balance');
    }

    if (!walletPin) {
      return setError('Wallet Security PIN is required');
    }

    setActionLoading(true);
    try {
      const res = await epinApi.generate({ amount: genAmount, walletPin });
      setSuccess(`E-PIN Generated successfully! Code: ${res.data.epin.code}`);
      setGenAmount('');
      setWalletPin('');
      fetchEPins();
      if (onUpdateBalance) onUpdateBalance();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate E-PIN');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRedeem = async (e) => {
    e.preventDefault();
    handleClearMsgs();
    if (!redeemCode) return;

    setActionLoading(true);
    try {
      const res = await epinApi.redeem({ code: redeemCode });
      setSuccess(`Successfully redeemed $${res.data.amount} to your wallet`);
      setRedeemCode('');
      fetchEPins();
      if (onUpdateBalance) onUpdateBalance();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to redeem E-PIN');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    handleClearMsgs();
    if (!transferId || !transferTarget) return;

    if (!walletPin) {
      return setError('Wallet Security PIN is required');
    }

    setActionLoading(true);
    try {
      await epinApi.transfer({ epinId: transferId, targetUsername: transferTarget, walletPin });
      setSuccess('E-PIN transferred successfully');
      setTransferId('');
      setTransferTarget('');
      setWalletPin('');
      fetchEPins();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to transfer E-PIN');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopy = (code, id) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code)
        .then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
        })
        .catch(err => {
          console.error('Failed to copy via navigator.clipboard: ', err);
          fallbackCopy(code, id);
        });
    } else {
      fallbackCopy(code, id);
    }
  };

  const fallbackCopy = (code, id) => {
    const textarea = document.createElement('textarea');
    textarea.value = code;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Fallback copy failed: ', err);
    }
    document.body.removeChild(textarea);
  };

  return (
    <div className="bg-dark-card border border-dark-border rounded-3xl p-6 shadow-xl text-start mt-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="h-12 w-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
          <Ticket className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">E-PIN Center</h3>
          <p className="text-xs text-gray-500 mt-1">Generate, transfer and redeem E-PINs</p>
        </div>
      </div>

      {success && (
        <div className="p-4 mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm font-medium">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 bg-dark-bg p-1 rounded-xl w-fit border border-dark-border">
        {['GENERATE', 'REDEEM', 'TRANSFER', 'HISTORY'].map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); handleClearMsgs(); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
              activeTab === tab 
                ? 'bg-primary text-white shadow-lg' 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Generate E-PIN */}
      {activeTab === 'GENERATE' && (
        <div className="max-w-md">
          {!hasPinSet ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-medium space-y-2">
              <p>You must set a Wallet Security PIN before you can generate E-PINs.</p>
              <p className="text-xs text-gray-500">Please set your security PIN under the "Wallet Security PIN" section above.</p>
            </div>
          ) : (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                <p className="text-sm text-primary font-mono mb-1">Available Balance: ${Number(walletBalance || 0).toLocaleString()}</p>
                <p className="text-xs text-primary/70">The amount will be deducted from your wallet balance.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">E-PIN Amount ($)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={genAmount}
                  onChange={(e) => setGenAmount(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Wallet Security PIN</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={walletPin}
                  onChange={(e) => setWalletPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono tracking-widest text-lg"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading || !walletPin}
                className="w-full py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition duration-300 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <PlusCircle className="h-4 w-4" />
                {actionLoading ? 'Generating...' : 'Generate E-PIN'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Redeem E-PIN */}
      {activeTab === 'REDEEM' && (
        <form onSubmit={handleRedeem} className="max-w-md space-y-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-2xl mb-4">
            <p className="text-xs text-gray-400">Redeem an E-PIN to add funds directly to your wallet.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">E-PIN Code</label>
            <input
              type="text"
              required
              value={redeemCode}
              onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
              placeholder="EPIN-XXXX-XXXX-XXXX"
              className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary font-mono uppercase tracking-wider"
            />
          </div>
          <button
            type="submit"
            disabled={actionLoading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl shadow-lg transition duration-300 flex items-center justify-center gap-2 text-sm"
          >
            <Download className="h-4 w-4" />
            {actionLoading ? 'Redeeming...' : 'Redeem E-PIN'}
          </button>
        </form>
      )}

      {/* Transfer E-PIN */}
      {activeTab === 'TRANSFER' && (
        <div className="max-w-md">
          {!hasPinSet ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm font-medium space-y-2">
              <p>You must set a Wallet Security PIN before you can transfer E-PINs.</p>
              <p className="text-xs text-gray-500">Please set your security PIN under the "Wallet Security PIN" section above.</p>
            </div>
          ) : (
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Select E-PIN to transfer</label>
                <select
                  required
                  value={transferId}
                  onChange={(e) => setTransferId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary"
                >
                  <option value="">-- Choose Active E-PIN --</option>
                  {epins.owned.filter(p => p.status === 'ACTIVE').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.code} - ${p.amount}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Recipient Username or Email</label>
                <input
                  type="text"
                  required
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  placeholder="Username or email"
                  className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Wallet Security PIN</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={walletPin}
                  onChange={(e) => setWalletPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-full px-4 py-3 rounded-xl bg-dark-bg border border-dark-border text-white text-center focus:outline-none focus:border-primary font-mono tracking-widest text-lg"
                />
              </div>
              <button
                type="submit"
                disabled={actionLoading || !walletPin}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg transition duration-300 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
              >
                <ArrowRightLeft className="h-4 w-4" />
                {actionLoading ? 'Transferring...' : 'Transfer E-PIN'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-6">
          
          <div>
            <h4 className="text-sm font-bold text-white mb-4">My E-PINs</h4>
            {loading ? (
              <div className="text-gray-500 text-sm">Loading...</div>
            ) : epins.owned.length === 0 ? (
              <div className="text-gray-500 text-sm">You have no E-PINs.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {epins.owned.map(epin => (
                  <div key={epin.id} className="p-4 bg-dark-bg border border-dark-border rounded-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2">
                      {epin.status === 'ACTIVE' ? (
                        <span className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold px-2 py-0.5 bg-emerald-500/10 rounded-md">
                          <CheckCircle className="h-3 w-3" /> ACTIVE
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-[10px] font-bold px-2 py-0.5 bg-white/5 rounded-md">
                          <Clock className="h-3 w-3" /> USED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mb-1">Amount</p>
                    <h4 className="text-xl font-bold text-white font-mono mb-3">${epin.amount}</h4>
                    <p className="text-xs text-gray-500 mb-1">Code</p>
                    <div className="flex items-center gap-2 bg-primary/10 p-2 rounded-lg relative">
                      <p className="text-sm text-primary font-mono select-all text-center tracking-widest flex-1">{epin.code}</p>
                      <button
                        onClick={() => handleCopy(epin.code, epin.id)}
                        className="p-1 hover:bg-primary/20 rounded-md text-primary transition-colors"
                        title="Copy Code"
                      >
                        {copiedId === epin.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
      )}
    </div>
  );
}
