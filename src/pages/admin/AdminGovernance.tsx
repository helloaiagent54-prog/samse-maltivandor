import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Plus } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { pushToast } from '../../store/uiSlice';
import { AdminDialog } from '../../components/admin/AdminDialog';

interface SearchMappingRow {
  _id: string;
  term: string;
  synonyms: string[];
  languageHint?: string;
}

interface SearchAggRow {
  _id: string;
  count: number;
  avgResults?: number;
}

export function AdminSearchPage() {
  const dispatch = useDispatch();
  const [mappings, setMappings] = useState<SearchMappingRow[]>([]);
  const [zeroResults, setZeroResults] = useState<SearchAggRow[]>([]);
  const [topQueries, setTopQueries] = useState<SearchAggRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ term: '', synonyms: '', languageHint: 'mixed' });

  const load = () => {
    apiRequest<{
      mappings: SearchMappingRow[];
      zeroResults: SearchAggRow[];
      topQueries: SearchAggRow[];
    }>('/api/admin/search-management')
      .then((res) => {
        setMappings(res.mappings || []);
        setZeroResults(res.zeroResults || []);
        setTopQueries(res.topQueries || []);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unable to fetch search data';
        dispatch(pushToast({ type: 'error', title: 'Failed to load search management', message }));
      });
  };
  useEffect(load, []);

  const addMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/admin/search-management/mappings', {
        method: 'POST',
        body: JSON.stringify({
          term: form.term.trim(),
          synonyms: form.synonyms.split(',').map((s) => s.trim()).filter(Boolean),
          languageHint: form.languageHint,
          active: true,
        }),
      });
      dispatch(pushToast({ type: 'success', title: 'Search synonym mapping saved' }));
      setForm({ term: '', synonyms: '', languageHint: 'mixed' });
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Save failed';
      dispatch(pushToast({ type: 'error', title: 'Failed', message }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Bengali &amp; English Search Synonyms</h1>
          <p className="text-xs text-slate-500">
            Improve zero-result queries by mapping bilingual keywords and local spelling variants
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-4 h-9 rounded-xl bg-[#0D63F3] hover:bg-[#0A52CC] text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Synonym Mapping</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <h2 className="text-sm font-bold text-slate-900">Configured Mappings ({mappings.length})</h2>
          {mappings.map((m) => (
            <div key={m._id} className="py-2 border-b border-slate-100 text-xs">
              <p className="font-bold text-slate-900">{m.term}</p>
              <p className="text-slate-500">{(m.synonyms || []).join(', ')}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <h2 className="text-sm font-bold text-slate-900">Zero-Result Queries</h2>
          {zeroResults.length === 0 ? (
            <p className="text-xs text-slate-500">No zero-result queries logged yet.</p>
          ) : (
            zeroResults.map((z) => (
              <div key={z._id} className="flex justify-between py-2 border-b border-slate-100 text-xs">
                <span className="font-semibold text-[#EF3E36]">{z._id}</span>
                <span className="font-bold">{z.count}x</span>
              </div>
            ))
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-2">
          <h2 className="text-sm font-bold text-slate-900">Top Marketplace Searches</h2>
          {topQueries.length === 0 ? (
            <p className="text-xs text-slate-500">No search logs yet.</p>
          ) : (
            topQueries.map((t) => (
              <div key={t._id} className="flex justify-between py-2 border-b border-slate-100 text-xs">
                <span className="font-semibold text-slate-800">{t._id}</span>
                <span className="text-slate-500">{t.count}x ({Math.round(t.avgResults || 0)} hits)</span>
              </div>
            ))
          )}
        </div>
      </div>

      <AdminDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Search Synonym Mapping"
        subtitle="Connect English, Bengali, and Banglish search terms so shoppers always find products."
        badge="Search"
        size="md"
        isSubmitting={saving}
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 h-9 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="search-mapping-form"
              disabled={saving}
              className="px-5 h-9 rounded-xl bg-[#0D63F3] text-white text-xs font-bold"
            >
              {saving ? 'Saving...' : 'Save Synonym Mapping'}
            </button>
          </>
        }
      >
        <form id="search-mapping-form" onSubmit={addMapping} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Primary Term *</label>
            <input
              required
              placeholder="e.g. মোবাইল or airpods"
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Comma-Separated Synonyms *</label>
            <input
              required
              placeholder="e.g. smartphone, ফোন, mobile phone"
              value={form.synonyms}
              onChange={(e) => setForm({ ...form, synonyms: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Language Scope</label>
            <select
              value={form.languageHint}
              onChange={(e) => setForm({ ...form, languageHint: e.target.value })}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
            >
              <option value="mixed">Mixed (Bangla + English)</option>
              <option value="bn">Bengali</option>
              <option value="en">English</option>
            </select>
          </div>
        </form>
      </AdminDialog>
    </div>
  );
}

export function AdminReviewsPage() {
  const dispatch = useDispatch();
  const [reviews, setReviews] = useState<any[]>([]);

  const load = () => {
    apiRequest('/api/admin/reviews')
      .then((res) => setReviews(res.reviews || []))
      .catch((err: any) => dispatch(pushToast({ type: 'error', title: 'Failed to load reviews', message: err.message })));
  };
  useEffect(load, []);

  const moderate = async (id: string, moderationStatus: string) => {
    try {
      await apiRequest(`/api/admin/reviews/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ moderationStatus }),
      });
      dispatch(pushToast({ type: 'success', title: `Review ${moderationStatus}` }));
      load();
    } catch (err: any) {
      dispatch(pushToast({ type: 'error', title: 'Moderation failed', message: err.message }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h1 className="text-lg font-extrabold text-slate-900">Customer Reviews Moderation</h1>
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r._id} className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <p className="font-bold text-slate-900">
                {r.productId?.title || 'Product'} · {r.rating}/5 ★
              </p>
              <p className="text-slate-600 mt-1">{r.comment}</p>
              <span className="inline-block mt-1 px-2 py-0.5 rounded bg-slate-100 font-bold uppercase text-[10px]">
                {r.moderationStatus}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => moderate(r._id, 'published')}
                className="px-3 py-1 rounded-lg bg-emerald-600 text-white font-bold"
              >
                Publish
              </button>
              <button
                type="button"
                onClick={() => moderate(r._id, 'flagged')}
                className="px-3 py-1 rounded-lg border border-amber-300 text-amber-800 font-bold"
              >
                Flag
              </button>
              <button
                type="button"
                onClick={() => moderate(r._id, 'hidden')}
                className="px-3 py-1 rounded-lg border border-red-200 text-[#EF3E36] font-bold"
              >
                Hide
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSupportPage() {
  const dispatch = useDispatch();
  const [tickets, setTickets] = useState<any[]>([]);
  const [reply, setReply] = useState<Record<string, string>>({});

  const load = () => {
    apiRequest('/api/admin/support')
      .then((res) => setTickets(res.tickets || []))
      .catch((err: any) => dispatch(pushToast({ type: 'error', title: 'Failed to load support tickets', message: err.message })));
  };
  useEffect(load, []);

  const sendReply = async (id: string, status: string) => {
    try {
      await apiRequest(`/api/admin/support/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ body: reply[id] || '', status }),
      });
      dispatch(pushToast({ type: 'success', title: 'Ticket updated' }));
      setReply((prev) => ({ ...prev, [id]: '' }));
      load();
    } catch (err: any) {
      dispatch(pushToast({ type: 'error', title: 'Error', message: err.message }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h1 className="text-lg font-extrabold text-slate-900">Support Tickets &amp; Escalations</h1>
      {tickets.length === 0 ? (
        <p className="text-xs text-slate-500">No support tickets submitted yet.</p>
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <div key={t._id} className="p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono-num font-bold text-[#0D63F3] mr-2">{t.ticketNumber}</span>
                  <span className="font-bold text-slate-900">{t.subject}</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-100 font-bold uppercase text-[10px]">
                  {t.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-slate-500">
                From: {t.creatorUserId?.name} ({t.creatorUserId?.email}) · Category: {t.category}
              </p>
              <div className="space-y-1.5 bg-slate-50 p-3 rounded-lg">
                {(t.messages || []).map((m: any, idx: number) => (
                  <p key={idx} className="text-slate-700">
                    <strong>{m.senderName} ({m.senderRole}):</strong> {m.body}
                  </p>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  placeholder="Write official support reply..."
                  value={reply[t._id] || ''}
                  onChange={(e) => setReply({ ...reply, [t._id]: e.target.value })}
                  className="flex-1 min-w-[200px] h-9 px-3 rounded-lg border border-slate-300 text-xs"
                />
                <button type="button" onClick={() => sendReply(t._id, 'in_progress')} className="px-3 h-9 rounded-lg bg-[#0D63F3] text-white font-bold">
                  Reply
                </button>
                <button type="button" onClick={() => sendReply(t._id, 'resolved')} className="px-3 h-9 rounded-lg bg-emerald-600 text-white font-bold">
                  Mark Resolved
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminAuditPage() {
  const dispatch = useDispatch();
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => {
    apiRequest('/api/admin/audit-logs')
      .then((res) => setLogs(res.logs || []))
      .catch((err: any) => dispatch(pushToast({ type: 'error', title: 'Failed to load audit logs', message: err.message })));
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h1 className="text-lg font-extrabold text-slate-900">Immutable Administrative Audit Trail</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-3">Timestamp</th>
              <th className="py-2 pr-3">Actor</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Action</th>
              <th className="py-2">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l._id}>
                <td className="py-2.5 pr-3 text-slate-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                <td className="py-2.5 pr-3 font-semibold text-slate-800">{l.actorEmail}</td>
                <td className="py-2.5 pr-3 uppercase text-[10px] font-bold">{l.actorRole}</td>
                <td className="py-2.5 pr-3 font-bold text-[#0D63F3]">{l.action}</td>
                <td className="py-2.5 text-slate-600">{l.targetType} {l.targetId ? `(${l.targetId.slice(-6)})` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminSettingsPage() {
  const dispatch = useDispatch();
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    apiRequest('/api/admin/settings')
      .then((res) => setSettings(res.settings))
      .catch((err: any) => dispatch(pushToast({ type: 'error', title: 'Failed to load settings', message: err.message })));
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
      dispatch(pushToast({ type: 'success', title: 'Platform settings updated' }));
    } catch (err: any) {
      dispatch(pushToast({ type: 'error', title: 'Save failed', message: err.message }));
    }
  };

  if (!settings) return <div className="p-8 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">Loading settings...</div>;

  return (
    <form onSubmit={save} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h1 className="text-lg font-extrabold text-slate-900">Global Platform Configuration</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Free Delivery Threshold (৳)</label>
          <input
            type="number"
            value={settings.freeDeliveryThreshold}
            onChange={(e) => setSettings({ ...settings, freeDeliveryThreshold: Number(e.target.value) })}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Default Commission (%)</label>
          <input
            type="number"
            value={settings.defaultCommissionPercent}
            onChange={(e) => setSettings({ ...settings, defaultCommissionPercent: Number(e.target.value) })}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Minimum Seller Payout (৳)</label>
          <input
            type="number"
            value={settings.minPayoutAmount}
            onChange={(e) => setSettings({ ...settings, minPayoutAmount: Number(e.target.value) })}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Return Window (Days)</label>
          <input
            type="number"
            value={settings.returnWindowDays}
            onChange={(e) => setSettings({ ...settings, returnWindowDays: Number(e.target.value) })}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
          <input
            value={settings.supportEmail}
            onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Support Phone</label>
          <input
            value={settings.supportPhone}
            onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Bar Copy</label>
          <input
            value={settings.announcementText}
            onChange={(e) => setSettings({ ...settings, announcementText: e.target.value })}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 text-sm"
          />
        </div>
      </div>
      <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#0D63F3] text-white text-xs font-bold">
        Save Platform Settings
      </button>
    </form>
  );
}
