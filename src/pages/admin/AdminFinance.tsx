import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Plus } from 'lucide-react';
import { apiRequest, formatBDT } from '../../lib/api';
import { pushToast } from '../../store/uiSlice';
import { Modal } from '../../components/ui/Modal';
import { AdminDialog } from '../../components/admin/AdminDialog';

interface CommissionRuleItem {
  _id: string;
  name: string;
  ratePercent: number;
  isDefault?: boolean;
  active: boolean;
  categoryId?: { _id: string; name: string };
  storeId?: { _id: string; name: string };
}

interface PayoutItem {
  _id: string;
  payoutNumber: string;
  status: string;
  amount: number;
  method: string;
  accountNumber: string;
  settlementReference?: string;
  storeId?: { name: string };
}

interface LedgerItem {
  _id: string;
  description: string;
  entryType: string;
  bucket: string;
  amount: number;
  storeId?: { name: string };
}

interface OptionItem {
  _id: string;
  name: string;
}

export function AdminFinancePage() {
  const dispatch = useDispatch();
  const [rules, setRules] = useState<CommissionRuleItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [stores, setStores] = useState<OptionItem[]>([]);
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    scope: 'global',
    categoryId: '',
    storeId: '',
    ratePercent: 8,
  });
  const [payoutModal, setPayoutModal] = useState<{ payout: PayoutItem; status: string } | null>(null);
  const [settlementRef, setSettlementRef] = useState('');
  const [reviewNote, setReviewNote] = useState('');

  const load = () => {
    apiRequest<{
      commissionRules: CommissionRuleItem[];
      payouts: PayoutItem[];
      ledgerEntries: LedgerItem[];
      categories: OptionItem[];
      stores: OptionItem[];
    }>('/api/admin/finance')
      .then((res) => {
        setRules(res.commissionRules || []);
        setPayouts(res.payouts || []);
        setLedger(res.ledgerEntries || []);
        setCategories(res.categories || []);
        setStores(res.stores || []);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Load failed';
        dispatch(pushToast({ type: 'error', title: 'Failed to load finance data', message }));
      });
  };
  useEffect(load, []);

  const addCommissionRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRule(true);
    try {
      await apiRequest('/api/admin/finance/commission-rules', {
        method: 'POST',
        body: JSON.stringify({
          name: newRule.name,
          scope: newRule.scope,
          categoryId: newRule.scope === 'category' ? newRule.categoryId : undefined,
          storeId: newRule.scope === 'seller' ? newRule.storeId : undefined,
          ratePercent: Number(newRule.ratePercent),
        }),
      });
      dispatch(pushToast({ type: 'success', title: 'Commission rule created' }));
      setNewRule({ name: '', scope: 'global', categoryId: '', storeId: '', ratePercent: 8 });
      setRuleModalOpen(false);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      dispatch(pushToast({ type: 'error', title: 'Failed', message }));
    } finally {
      setSavingRule(false);
    }
  };

  const toggleRuleActive = async (rule: CommissionRuleItem) => {
    try {
      await apiRequest(`/api/admin/finance/commission-rules/${rule._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !rule.active }),
      });
      dispatch(pushToast({ type: 'success', title: `Rule ${!rule.active ? 'activated' : 'disabled'}` }));
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      dispatch(pushToast({ type: 'error', title: 'Failed', message }));
    }
  };

  const submitPayoutDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutModal) return;
    try {
      await apiRequest(`/api/admin/finance/payouts/${payoutModal.payout._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: payoutModal.status,
          settlementReference: settlementRef,
          reviewNote,
        }),
      });
      dispatch(pushToast({ type: 'success', title: `Payout ${payoutModal.status}` }));
      setPayoutModal(null);
      setSettlementRef('');
      setReviewNote('');
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payout action failed';
      dispatch(pushToast({ type: 'error', title: 'Payout action failed', message }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h1 className="text-lg font-extrabold text-slate-900">Seller Payout Requests</h1>
        <p className="text-xs text-slate-500">
          Completing a payout requires entering a verified Bangladesh bank/bKash/Nagad settlement reference ID.
        </p>
        {payouts.length === 0 ? (
          <p className="text-xs text-slate-500">No seller payout requests queued.</p>
        ) : (
          <div className="space-y-3">
            {payouts.map((p) => (
              <div key={p._id} className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num font-bold text-slate-900">{p.payoutNumber}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-bold uppercase text-[10px]">{p.status}</span>
                  </div>
                  <p className="text-slate-700 mt-1">
                    Store: <strong>{p.storeId?.name}</strong> · Amount: <strong className="text-[#0D63F3]">{formatBDT(p.amount)}</strong> ·{' '}
                    {p.method.toUpperCase()} ({p.accountNumber})
                  </p>
                  {p.settlementReference && (
                    <p className="text-emerald-700 font-mono-num mt-0.5">Settlement Ref: {p.settlementReference}</p>
                  )}
                </div>

                {p.status !== 'completed' && p.status !== 'rejected' && (
                  <div className="flex flex-wrap gap-2">
                    {p.status === 'requested' && (
                      <button
                        type="button"
                        onClick={() => setPayoutModal({ payout: p, status: 'approved' })}
                        className="px-3 py-1.5 rounded-lg border border-blue-200 text-[#0D63F3] font-bold"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setPayoutModal({ payout: p, status: 'completed' });
                        setSettlementRef('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                    >
                      Mark Settled
                    </button>
                    <button
                      type="button"
                      onClick={() => setPayoutModal({ payout: p, status: 'rejected' })}
                      className="px-3 py-1.5 rounded-lg border border-red-200 text-[#EF3E36] font-bold"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Commission Rules ({rules.length})</h2>
              <p className="text-[11px] text-slate-500">Global, category, and seller commission tiers</p>
            </div>
            <button
              type="button"
              onClick={() => setRuleModalOpen(true)}
              className="px-3.5 h-9 rounded-xl bg-[#0D63F3] hover:bg-[#0A52CC] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Commission Rule</span>
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {rules.map((r) => {
              const scopeLabel = r.storeId ? 'SELLER' : r.categoryId ? 'CATEGORY' : r.isDefault ? 'GLOBAL' : 'CUSTOM';
              return (
                <div key={r._id} className="flex justify-between items-center gap-2 p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{r.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {scopeLabel} {r.categoryId?.name || r.storeId?.name ? `· ${r.categoryId?.name || r.storeId?.name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-[#0D63F3] tabular-nums">{r.ratePercent}%</span>
                    <button
                      type="button"
                      onClick={() => toggleRuleActive(r)}
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        r.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {r.active ? 'Active' : 'Disabled'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900">Financial Ledger Audit</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
            {ledger.length === 0 ? (
              <p className="text-slate-500">No financial ledger entries recorded yet.</p>
            ) : (
              ledger.map((l) => (
                <div key={l._id} className="flex justify-between gap-2 py-2 border-b border-slate-100">
                  <div>
                    <p className="font-bold text-slate-800">{l.description}</p>
                    <p className="text-[11px] text-slate-500">
                      {l.storeId?.name} · {l.entryType} ({l.bucket})
                    </p>
                  </div>
                  <span className={`font-bold tabular-nums ${l.amount >= 0 ? 'text-emerald-700' : 'text-[#EF3E36]'}`}>
                    {l.amount >= 0 ? '+' : ''}
                    {formatBDT(l.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <AdminDialog
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title="Add Commission Rule"
        subtitle="Set marketplace platform fee rate globally, per category, or per seller store."
        badge="Finance"
        size="md"
        isSubmitting={savingRule}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRuleModalOpen(false)}
              className="px-4 h-9 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="commission-rule-form"
              disabled={savingRule}
              className="px-5 h-9 rounded-xl bg-[#0D63F3] text-white text-xs font-bold"
            >
              {savingRule ? 'Saving...' : 'Save Commission Rule'}
            </button>
          </>
        }
      >
        <form id="commission-rule-form" onSubmit={addCommissionRule} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Rule Name *</label>
            <input
              required
              placeholder="e.g. Electronics 6% Tier"
              value={newRule.name}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Scope</label>
              <select
                value={newRule.scope}
                onChange={(e) => setNewRule({ ...newRule, scope: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="global">Global Default</option>
                <option value="category">Category Override</option>
                <option value="seller">Seller Override</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Commission Rate (%) *</label>
              <input
                type="number"
                min={0}
                max={50}
                step="0.5"
                value={newRule.ratePercent}
                onChange={(e) => setNewRule({ ...newRule, ratePercent: Number(e.target.value) })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono-num"
              />
            </div>
          </div>
          {newRule.scope === 'category' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Category *</label>
              <select
                required
                value={newRule.categoryId}
                onChange={(e) => setNewRule({ ...newRule, categoryId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="">Select Category...</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {newRule.scope === 'seller' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Seller Store *</label>
              <select
                required
                value={newRule.storeId}
                onChange={(e) => setNewRule({ ...newRule, storeId: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
              >
                <option value="">Select Store...</option>
                {stores.map((st) => (
                  <option key={st._id} value={st._id}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </form>
      </AdminDialog>

      <Modal
        open={Boolean(payoutModal)}
        title={`Payout ${payoutModal?.payout.payoutNumber}: ${payoutModal?.status.toUpperCase()}`}
        onClose={() => setPayoutModal(null)}
      >
        <form onSubmit={submitPayoutDecision} className="space-y-3">
          {payoutModal?.status === 'completed' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Verified Bank / bKash / Nagad Settlement Reference ID
              </label>
              <input
                required
                placeholder="e.g. BKASH-TXN-894210"
                value={settlementRef}
                onChange={(e) => setSettlementRef(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Admin Review Note</label>
            <textarea
              rows={2}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0D63F3] text-white text-xs font-bold">
            Confirm Payout Action
          </button>
        </form>
      </Modal>
    </div>
  );
}
