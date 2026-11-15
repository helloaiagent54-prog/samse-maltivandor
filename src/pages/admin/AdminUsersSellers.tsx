import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Eye, Search, ShieldCheck } from 'lucide-react';
import { apiRequest, formatBDT } from '../../lib/api';
import { pushToast } from '../../store/uiSlice';
import { RootState } from '../../store';
import { Modal } from '../../components/ui/Modal';

const ROLES = [
  'customer',
  'seller',
  'admin',
  'super_admin',
  'catalog_manager',
  'order_manager',
  'finance_manager',
  'support_agent',
  'content_manager',
];

export function AdminUsersPage() {
  const currentUser = useSelector((s: RootState) => s.auth.user);
  const dispatch = useDispatch();
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = (query = q) => {
    setLoading(true);
    apiRequest(`/api/admin/users?q=${encodeURIComponent(query)}`)
      .then((res) => setUsers(res.users || []))
      .catch((err: any) => dispatch(pushToast({ type: 'error', title: 'Error', message: err.message })))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load('');
  }, []);

  const updateStatus = async (userId: string, status: string) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      dispatch(pushToast({ type: 'success', title: 'User status updated' }));
      load();
    } catch (err: any) {
      dispatch(pushToast({ type: 'error', title: 'Update failed', message: err.message }));
    }
  };

  const updateRole = async (userId: string, role: string) => {
    try {
      await apiRequest(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      dispatch(pushToast({ type: 'success', title: 'User role updated' }));
      load();
    } catch (err: any) {
      dispatch(pushToast({ type: 'error', title: 'Role update failed', message: err.message }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">User Management &amp; Scoped RBAC</h1>
          <p className="text-xs text-slate-500">Manage account status and assign staff permissions (Super Admin required for role changes)</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(q);
          }}
          className="flex gap-2"
        >
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, email, phone..."
              className="h-9 pl-8 pr-3 rounded-xl border border-slate-300 text-xs w-56"
            />
          </div>
          <button type="submit" className="px-4 h-9 rounded-xl bg-[#0D63F3] text-white text-xs font-bold">
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">Loading users...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Name &amp; Contact</th>
                <th className="py-2 pr-3">Role</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="py-3 pr-3">
                    <p className="font-bold text-slate-900">{u.name}</p>
                    <p className="text-[11px] text-slate-500">{u.email} {u.phone ? `· ${u.phone}` : ''}</p>
                  </td>
                  <td className="py-3 pr-3">
                    {currentUser?.role === 'super_admin' && u._id !== currentUser?._id ? (
                      <select
                        aria-label={`Role for ${u.email}`}
                        value={u.role}
                        onChange={(e) => updateRole(u._id, e.target.value)}
                        className="h-8 px-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="px-2 py-1 rounded bg-slate-100 font-bold text-slate-700">{u.role}</span>
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-[#EF3E36]'
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1.5">
                      {u.status !== 'active' && (
                        <button
                          type="button"
                          onClick={() => updateStatus(u._id, 'active')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px]"
                        >
                          Activate
                        </button>
                      )}
                      {u.status === 'active' && u._id !== currentUser?._id && (
                        <button
                          type="button"
                          onClick={() => updateStatus(u._id, 'suspended')}
                          className="px-2.5 py-1 rounded-lg border border-amber-300 text-amber-700 font-bold text-[11px]"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminSellersPage() {
  const dispatch = useDispatch();
  const [applications, setApplications] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [decisionModal, setDecisionModal] = useState<{ app: any; status: string } | null>(null);
  const [note, setNote] = useState('');
  const [sellerDetail, setSellerDetail] = useState<any>(null);

  const load = () => {
    apiRequest('/api/admin/sellers')
      .then((res) => {
        setApplications(res.applications || []);
        setStores(res.stores || []);
      })
      .catch((err: any) => dispatch(pushToast({ type: 'error', title: 'Failed to load sellers', message: err.message })));
  };
  useEffect(load, []);

  const openSellerDetail = async (storeId: string) => {
    try {
      const res = await apiRequest(`/api/admin/sellers/${storeId}`);
      setSellerDetail(res);
    } catch (err: any) {
      dispatch(pushToast({ type: 'error', title: 'Unable to load store details', message: err.message }));
    }
  };

  const submitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionModal) return;
    try {
      await apiRequest(`/api/admin/sellers/applications/${decisionModal.app._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: decisionModal.status, note }),
      });
      dispatch(pushToast({ type: 'success', title: `Application marked ${decisionModal.status}` }));
      setDecisionModal(null);
      setNote('');
      load();
    } catch (err: any) {
      dispatch(pushToast({ type: 'error', title: 'Action failed', message: err.message }));
    }
  };

  const toggleStore = async (store: any) => {
    const nextStatus = store.status === 'active' ? 'suspended' : 'active';
    try {
      await apiRequest(`/api/admin/sellers/stores/${store._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, isFeatured: store.isFeatured }),
      });
      dispatch(pushToast({ type: 'success', title: `Store ${nextStatus}` }));
      load();
    } catch (err: any) {
      dispatch(pushToast({ type: 'error', title: 'Failed', message: err.message }));
    }
  };

  const toggleFeatured = async (store: any) => {
    try {
      await apiRequest(`/api/admin/sellers/stores/${store._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: store.status, isFeatured: !store.isFeatured }),
      });
      dispatch(pushToast({ type: 'success', title: 'Store featured flag updated' }));
      load();
    } catch (err: any) {
      dispatch(pushToast({ type: 'error', title: 'Failed', message: err.message }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h1 className="text-lg font-extrabold text-slate-900">Seller Onboarding &amp; KYC Applications</h1>
        {applications.length === 0 ? (
          <p className="text-xs text-slate-500">No seller applications submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {applications.map((a) => (
              <div key={a._id} className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{a.storeName}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-bold uppercase text-[10px]">
                      {a.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Applicant: {a.userId?.name || 'User'} ({a.userId?.email}) · Phone: {a.phone}
                  </p>
                  <p className="text-slate-500">
                    Location: {a.district}, {a.division} · Payout: {a.bankOrMfsType?.toUpperCase()} ({a.accountNumber})
                  </p>
                  {a.reviewNotes && <p className="text-amber-700 font-medium">Review Note: {a.reviewNotes}</p>}
                </div>

                <div className="flex flex-wrap gap-2">
                  {a.status !== 'approved' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDecisionModal({ app: a, status: 'approved' });
                          setNote('Verified store KYC details. Welcome to NOVARA Seller Center.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold"
                      >
                        Approve &amp; Create Store
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDecisionModal({ app: a, status: 'additional_info_required' });
                          setNote('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 font-bold"
                      >
                        Request Info
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDecisionModal({ app: a, status: 'rejected' });
                          setNote('');
                        }}
                        className="px-3 py-1.5 rounded-lg border border-red-200 text-[#EF3E36] font-bold"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <h2 className="text-base font-extrabold text-slate-900">Active &amp; Verified Marketplace Stores ({stores.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Store</th>
                <th className="py-2 pr-3">Owner</th>
                <th className="py-2 pr-3">Location</th>
                <th className="py-2 pr-3">Products</th>
                <th className="py-2 pr-3">Orders</th>
                <th className="py-2 pr-3">Revenue</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Featured</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stores.map((st) => (
                <tr key={st._id}>
                  <td className="py-3 pr-3 font-bold text-slate-900 flex items-center gap-1.5">
                    {st.verified && <ShieldCheck className="w-3.5 h-3.5 text-[#0D63F3]" />}
                    {st.name}
                  </td>
                  <td className="py-3 pr-3 text-slate-600">{st.ownerUserId?.email}</td>
                  <td className="py-3 pr-3 text-slate-600">{st.district}, {st.division}</td>
                  <td className="py-3 pr-3 font-bold tabular-nums">{st.realProductCount ?? st.productCount ?? 0}</td>
                  <td className="py-3 pr-3 font-bold tabular-nums">{st.ordersCount ?? 0}</td>
                  <td className="py-3 pr-3 font-bold text-[#0D63F3] tabular-nums">{formatBDT(st.totalRevenue ?? 0)}</td>
                  <td className="py-3 pr-3 uppercase font-bold text-[11px]">{st.status}</td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleFeatured(st)}
                      className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        st.isFeatured ? 'bg-blue-50 text-[#0D63F3]' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {st.isFeatured ? 'Featured' : 'Standard'}
                    </button>
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openSellerDetail(st._id)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        Details
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleStore(st)}
                        className={`px-3 py-1 rounded-lg font-bold text-[11px] ${
                          st.status === 'active'
                            ? 'border border-red-200 text-[#EF3E36]'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {st.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(decisionModal)}
        title={`Confirm Decision: ${decisionModal?.status.replace(/_/g, ' ').toUpperCase()}`}
        onClose={() => setDecisionModal(null)}
      >
        <form onSubmit={submitDecision} className="space-y-4">
          <p className="text-xs text-slate-600">
            Store: <strong>{decisionModal?.app.storeName}</strong>
          </p>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Review Notes (sent to applicant)</label>
            <textarea
              required
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDecisionModal(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#0D63F3] text-white text-xs font-bold">
              Confirm Decision
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(sellerDetail)} title={`Seller Store: ${sellerDetail?.store?.name || ''}`} onClose={() => setSellerDetail(null)}>
        {sellerDetail && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">
                Owner: {sellerDetail.store.ownerUserId?.name} ({sellerDetail.store.ownerUserId?.email})
              </p>
              <p className="text-slate-600">
                Location: {sellerDetail.store.pickupAddress || `${sellerDetail.store.district}, ${sellerDetail.store.division}`}
              </p>
              <p className="text-slate-600">
                Payout: {sellerDetail.store.payoutAccount?.method?.toUpperCase() || 'Not set'} · {sellerDetail.store.payoutAccount?.accountNumber || '—'}
              </p>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 mb-1.5">Recent Products ({sellerDetail.products?.length || 0})</p>
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {(sellerDetail.products || []).map((p: any) => (
                  <div key={p._id} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-semibold text-slate-800 truncate">{p.title}</span>
                    <span className="text-[10px] font-bold uppercase text-slate-500">{p.moderationStatus}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="font-extrabold text-slate-900 mb-1.5">Recent Suborders ({sellerDetail.subOrders?.length || 0})</p>
              <div className="max-h-36 overflow-y-auto space-y-1.5">
                {(sellerDetail.subOrders || []).map((so: any) => (
                  <div key={so._id} className="flex justify-between py-1 border-b border-slate-100">
                    <span className="font-mono-num font-bold">{so.subOrderNumber}</span>
                    <span className="font-bold text-[#0D63F3] tabular-nums">{formatBDT(so.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
