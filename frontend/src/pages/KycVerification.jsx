import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../utils/useTranslation';
import { kycApi } from '../services/api';
import { ShieldCheck, Upload, AlertCircle, Clock, CheckCircle2, X } from 'lucide-react';

export default function KycVerification() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { t, language, dir } = useTranslation();
  
  const [kycStatus, setKycStatus] = useState(user?.kycStatus || 'NOT_SUBMITTED');
  const [kycDetails, setKycDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [docType, setDocType] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);

  useEffect(() => {
    fetchKycStatus();
  }, []);

  const fetchKycStatus = async () => {
    setLoading(true);
    try {
      const res = await kycApi.getStatus();
      setKycStatus(res.data.kycStatus);
      setKycDetails(res.data);
      if (res.data.kycFullName) setFullName(res.data.kycFullName);
      if (res.data.kycDocumentType) setDocType(res.data.kycDocumentType);
      if (res.data.kycDocumentNumber) setDocNumber(res.data.kycDocumentNumber);
    } catch (err) {
      console.error('Error fetching KYC status:', err);
      setError(err.response?.data?.error || 'Failed to load KYC status.');
    } finally {
      setLoading(false);
    }
  };

  const handleFrontChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFrontImage(file);
      setFrontPreview(URL.createObjectURL(file));
    }
  };

  const handleBackChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackImage(file);
      setBackPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!frontImage || !backImage) {
      setError(language === 'ar' ? 'يرجى رفع الوجه الأمامي والخلفي للهوية' : 'Please upload both front and back document images.');
      return;
    }

    setSubmitLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('fullName', fullName);
    formData.append('documentType', docType);
    formData.append('documentNumber', docNumber);
    formData.append('frontImage', frontImage);
    formData.append('backImage', backImage);

    try {
      const res = await kycApi.submit(formData);
      setKycStatus('PENDING');
      setKycDetails(res.data);
      setSuccess(language === 'ar' ? 'تم تقديم الوثائق بنجاح وهو الآن قيد المراجعة' : 'Documents submitted successfully and are now pending review.');
      
      // Update local store user status
      if (user) {
        setUser({ ...user, kycStatus: 'PENDING' });
      }
    } catch (err) {
      console.error('Error submitting KYC:', err);
      setError(err.response?.data?.error || 'Failed to submit KYC documents.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render pending state
  if (kycStatus === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl text-center space-y-4 md:space-y-6">
          <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto animate-pulse">
            <Clock className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t('kycPendingTitle') || 'Verification Pending'}</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
              {t('kycPendingDesc') || 'Your documents have been received and are currently under review by our compliance team. Once approved, your account will be activated.'}
            </p>
          </div>
          
          <div className="border-t border-dark-border/40 pt-6 text-start space-y-4 max-w-md mx-auto">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('submittedDetails') || 'Submitted Details'}</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-500 block">{t('kycFullName') || 'Full Name'}</span>
                <span className="font-bold text-white mt-0.5 block">{kycDetails?.kycFullName}</span>
              </div>
              <div>
                <span className="text-gray-500 block">{t('kycDocType') || 'Document Type'}</span>
                <span className="font-bold text-white mt-0.5 block">{kycDetails?.kycDocumentType}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500 block">{t('kycDocNumber') || 'Document Number'}</span>
                <span className="font-bold text-white mt-0.5 block font-mono">{kycDetails?.kycDocumentNumber}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/dashboard/home')}
            className="w-full max-w-xs py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all duration-300 cursor-pointer text-sm"
          >
            {language === 'ar' ? 'الذهاب للوحة التحكم' : 'Go to Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  // Render approved state
  if (kycStatus === 'APPROVED') {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl text-center space-y-4 md:space-y-6">
          <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 animate-bounce" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-emerald-400">{t('kycApprovedTitle') || 'Identity Verified'}</h3>
            <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto leading-relaxed">
              {t('kycApprovedDesc') || 'Congratulations! Your identity has been successfully verified. Your account is fully active and all features are unlocked.'}
            </p>
          </div>
          
          <button
            onClick={() => navigate('/dashboard/home')}
            className="w-full max-w-xs py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition-all duration-300 cursor-pointer text-sm"
          >
            {language === 'ar' ? 'الذهاب للوحة التحكم' : 'Go to Dashboard'}
          </button>
        </div>
      </div>
    );
  }

  // Render Form (NOT_SUBMITTED or REJECTED)
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6">
      <div className="bg-dark-card border border-dark-border rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-xl space-y-4 md:space-y-6 text-start">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-primary/20 border border-primary/30 rounded-2xl flex items-center justify-center text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{t('kycTitle') || 'Identity Verification (KYC)'}</h3>
            <p className="text-xs text-gray-500 mt-1">
              {t('kycSubtitle') || 'Please upload a photo of your national ID card, passport or driver license to verify your identity and activate your account.'}
            </p>
          </div>
        </div>

        {kycStatus === 'REJECTED' && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">{t('kycRejectedTitle') || 'Verification Rejected'}</span>
              <p className="mt-1 leading-relaxed">
                {t('kycRejectedDesc') || 'Your documents were rejected because they were blurry or invalid. Please upload clear, readable copies of your documents.'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs text-center">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-2">{t('kycFullName') || 'Full Name (as in document)'}</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">{t('kycDocType') || 'Document Type'}</label>
              <select
                required
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold cursor-pointer"
              >
                <option value="">{t('kycSelectDocType') || 'Select document type...'}</option>
                <option value="NATIONAL_ID">{t('nationalId') || 'National ID Card'}</option>
                <option value="PASSPORT">{t('passport') || 'Passport'}</option>
                <option value="DRIVING_LICENSE">{t('drivingLicense') || 'Driver License'}</option>
              </select>
            </div>

            {/* Document Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">{t('kycDocNumber') || 'Document Number'}</label>
              <input
                type="text"
                required
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                placeholder="e.g. 1234567890"
                className="w-full px-4 py-2.5 rounded-xl bg-dark-bg border border-dark-border text-white focus:outline-none focus:border-primary text-sm font-semibold font-mono"
              />
            </div>
          </div>

          {/* Document Images (Front and Back) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Front Photo */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400">{t('kycFrontPhoto') || 'Front Photo'}</label>
              <div className="relative border-2 border-dashed border-dark-border/60 hover:border-primary/40 rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition group">
                {frontPreview ? (
                  <>
                    <img src={frontPreview} alt="Front Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); setFrontImage(null); setFrontPreview(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-600 group-hover:text-primary transition mb-2" />
                    <span className="text-[11px] font-bold text-gray-500">{t('clickToUpload') || 'Click to upload front side'}</span>
                    <span className="text-[9px] text-gray-600 mt-1">PNG, JPG or JPEG up to 10MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFrontChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Back Photo */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400">{t('kycBackPhoto') || 'Back Photo'}</label>
              <div className="relative border-2 border-dashed border-dark-border/60 hover:border-primary/40 rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer overflow-hidden transition group">
                {backPreview ? (
                  <>
                    <img src={backPreview} alt="Back Preview" className="w-full h-full object-cover" />
                    <button 
                      type="button" 
                      onClick={(e) => { e.preventDefault(); setBackImage(null); setBackPreview(null); }}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-600 group-hover:text-primary transition mb-2" />
                    <span className="text-[11px] font-bold text-gray-500">{t('clickToUploadBack') || 'Click to upload back side'}</span>
                    <span className="text-[9px] text-gray-600 mt-1">PNG, JPG or JPEG up to 10MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            {/* Skip Option */}
            <button
              type="button"
              onClick={() => navigate('/dashboard/home')}
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold rounded-xl border border-white/10 transition-all duration-300 text-xs cursor-pointer text-center"
            >
              {t('kycSkipBtn') || 'Do it later'}
            </button>

            {/* Submit Option */}
            <button
              type="submit"
              disabled={submitLoading}
              className="flex-1 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition-all duration-300 text-xs cursor-pointer disabled:opacity-50"
            >
              {submitLoading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                t('kycSubmitBtn') || 'Submit Verification'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
