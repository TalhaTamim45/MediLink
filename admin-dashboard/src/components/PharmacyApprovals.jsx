import React, { useState, useEffect } from 'react';
import odooApi from '../config/odooApi';
import {
  Building2,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  RotateCcw,
  FileText,
  MapPin,
  Phone,
  Mail,
  User,
  AlertCircle,
  Check,
  Loader2,
  Store,
} from 'lucide-react';

export default function PharmacyApprovals() {
  const [pharmacies, setPharmacies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('Pending'); // 'All' | 'Pending' | 'Approved' | 'Rejected'
  
  // Confirmation Modal state
  const [confirmTarget, setConfirmTarget] = useState(null); // { pharmacy, targetStatus, title, actionText, actionColor }
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Notification Toast
  const [successToast, setSuccessToast] = useState('');

  const fetchPharmacies = async () => {
    try {
      const result = await odooApi.searchRead(
        'res.partner',
        [['is_pharmacy', '=', true], '|', ['active', '=', true], ['active', '=', false]],
        ['name', 'phone', 'street', 'pharmacy_license', 'active', 'user_ids', 'email']
      );

      if (result.records) {
        const list = result.records.map((partner) => ({
          id: partner.id,
          pharmacyName: partner.name,
          ownerName: 'Pharmacy Owner',
          phone: partner.phone || 'N/A',
          email: partner.email || 'N/A',
          tradeLicense: partner.pharmacy_license || 'N/A',
          address: partner.street || 'N/A',
          approvalStatus: partner.active ? 'approved' : 'pending',
          user_ids: partner.user_ids,
        }));
        setPharmacies(list);
      }
    } catch (err) {
      console.log('Error fetching pharmacies:', err);
      setErrorMsg('Failed to load pharmacy approvals from Odoo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setErrorMsg('');
    fetchPharmacies();

    const interval = setInterval(fetchPharmacies, 4000);
    return () => clearInterval(interval);
  }, []);

  const openConfirmation = (pharmacy, targetStatus, title, actionText, actionColor) => {
    setConfirmTarget({
      pharmacy,
      targetStatus,
      title,
      actionText,
      actionColor,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget || isSubmitting) return;

    setIsSubmitting(true);
    const { pharmacy, targetStatus, actionText } = confirmTarget;

    try {
      const isActive = targetStatus === 'approved';

      // 1. Update partner status
      await odooApi.write('res.partner', pharmacy.id, { active: isActive });

      // 2. Query and update all associated users (including archived ones)
      const userResult = await odooApi.searchRead(
        'res.users',
        [['partner_id', '=', pharmacy.id], '|', ['active', '=', true], ['active', '=', false]],
        ['id']
      );

      if (userResult.records && userResult.records.length > 0) {
        for (const userRec of userResult.records) {
          await odooApi.write('res.users', userRec.id, { active: isActive });
        }
      }

      setSuccessToast(`Successfully performed: ${actionText} for "${pharmacy.pharmacyName}"`);
      setTimeout(() => setSuccessToast(''), 4000);
      setConfirmTarget(null);
      fetchPharmacies();
    } catch (err) {
      console.log('Error updating pharmacy status:', err);
      alert('Failed to update pharmacy approval status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter pharmacies based on active tab
  const filteredPharmacies = pharmacies.filter((p) => {
    const status = p.approvalStatus || 'pending';
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return status === 'pending';
    if (activeTab === 'Approved') return status === 'approved';
    if (activeTab === 'Rejected') return status === 'rejected';
    return true;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5" />
            Rejected / Suspended
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" />
            Pending Approval
          </span>
        );
    }
  };

  const formatDate = (createdAt) => {
    if (!createdAt) return 'Recently';
    if (createdAt.seconds) {
      const date = new Date(createdAt.seconds * 1000);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return 'Recently';
  };

  return (
    <div className="space-y-6">
      {/* Toast Success Notification */}
      {successToast && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl shadow-sm text-sm font-semibold animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="flex-1">{successToast}</span>
        </div>
      )}

      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-[#0b1c30]">Pharmacy Registrations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review partner pharmacy applications, verify trade licenses, and update approval statuses.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl self-start sm:self-auto overflow-x-auto">
          {[
            { id: 'All', label: 'All', count: pharmacies.length },
            { id: 'Pending', label: 'Pending', count: pharmacies.filter((p) => (p.approvalStatus || 'pending') === 'pending').length },
            { id: 'Approved', label: 'Approved', count: pharmacies.filter((p) => p.approvalStatus === 'approved').length },
            { id: 'Rejected', label: 'Rejected', count: pharmacies.filter((p) => p.approvalStatus === 'rejected').length },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#006b32] shadow-sm'
                    : 'text-slate-600 hover:text-[#0b1c30]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? 'bg-emerald-100 text-[#006b32]' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#006b32] mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading pharmacies from Firestore...</p>
        </div>
      ) : filteredPharmacies.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#0b1c30]">No Pharmacies Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no pharmacy records in the "{activeTab}" filter list.
          </p>
        </div>
      ) : (
        /* Pharmacies Grid / Cards List */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredPharmacies.map((pharmacy) => {
            const status = pharmacy.approvalStatus || 'pending';

            return (
              <div
                key={pharmacy.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Top Row: Name & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Store className="w-5 h-5 text-[#006b32] shrink-0" />
                        <h3 className="font-extrabold text-base text-[#0b1c30] leading-tight">
                          {pharmacy.pharmacyName || 'Unnamed Pharmacy'}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Registered on {formatDate(pharmacy.createdAt)}
                      </p>
                    </div>

                    <div className="shrink-0">{getStatusBadge(status)}</div>
                  </div>

                  {/* Details Grid */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-700">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-500">Owner:</span>
                      <span className="font-bold text-[#0b1c30]">
                        {pharmacy.ownerName || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-500">Email:</span>
                      <span className="font-medium text-slate-800">{pharmacy.email || 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-slate-500">Phone:</span>
                      <span className="font-medium text-slate-800">{pharmacy.phone || 'N/A'}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-700">
                      <FileText className="w-4 h-4 text-[#006b32] shrink-0" />
                      <span className="font-semibold text-slate-500">Trade License:</span>
                      <span className="font-bold text-[#006b32] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {pharmacy.tradeLicense || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-start gap-2 text-slate-700 pt-1 border-t border-slate-200/60">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <span className="font-semibold text-slate-500">Address:</span>
                      <span className="font-medium text-slate-800 flex-1">
                        {pharmacy.address || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-medium text-slate-400">Store Operational State:</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                          pharmacy.isOpen !== false
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {pharmacy.isOpen !== false ? 'Store Open' : 'Store Closed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
                  {/* PENDING -> Approve or Reject */}
                  {status === 'pending' && (
                    <>
                      <button
                        onClick={() =>
                          openConfirmation(
                            pharmacy,
                            'approved',
                            `Approve ${pharmacy.pharmacyName}?`,
                            'Approve Pharmacy',
                            'bg-[#006b32] hover:bg-[#005225] text-white'
                          )
                        }
                        className="flex-1 py-2 px-3 bg-[#006b32] hover:bg-[#005225] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <Check className="w-4 h-4" />
                        <span>Approve</span>
                      </button>

                      <button
                        onClick={() =>
                          openConfirmation(
                            pharmacy,
                            'rejected',
                            `Reject ${pharmacy.pharmacyName}?`,
                            'Reject Registration',
                            'bg-red-600 hover:bg-red-700 text-white'
                          )
                        }
                        className="flex-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {/* APPROVED -> Suspend */}
                  {status === 'approved' && (
                    <button
                      onClick={() =>
                        openConfirmation(
                          pharmacy,
                          'rejected',
                          `Suspend ${pharmacy.pharmacyName}?`,
                          'Suspend Pharmacy Account',
                          'bg-red-600 hover:bg-red-700 text-white'
                        )
                      }
                      className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Ban className="w-4 h-4 text-amber-700" />
                      <span>Suspend Pharmacy Partner</span>
                    </button>
                  )}

                  {/* REJECTED -> Approve Again */}
                  {status === 'rejected' && (
                    <button
                      onClick={() =>
                        openConfirmation(
                          pharmacy,
                          'approved',
                          `Re-Approve ${pharmacy.pharmacyName}?`,
                          'Approve Pharmacy Again',
                          'bg-[#006b32] hover:bg-[#005225] text-white'
                        )
                      }
                      className="w-full py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-[#006b32] border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-4 h-4 text-[#006b32]" />
                      <span>Approve Again</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#0b1c30]">Confirm Approval Change</h3>
                <p className="text-xs text-slate-500">{confirmTarget.title}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Are you sure you want to update the approval status for{' '}
              <strong className="text-[#0b1c30]">{confirmTarget.pharmacy.pharmacyName}</strong> to{' '}
              <strong className="uppercase font-bold text-[#006b32]">"{confirmTarget.targetStatus}"</strong>?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setConfirmTarget(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmAction}
                className={`flex-1 py-2.5 px-4 font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 ${confirmTarget.actionColor}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <span>{confirmTarget.actionText}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
