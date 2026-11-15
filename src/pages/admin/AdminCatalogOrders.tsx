import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Edit3, Eye, Plus, Search, Trash2 } from 'lucide-react';
import { apiRequest, formatBDT } from '../../lib/api';
import { pushToast } from '../../store/uiSlice';
import { ALLOWED_SUBORDER_TRANSITIONS, OrderStatus } from '../../../shared/pricing';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/admin/AdminDialog';
import { ProductEditorModal } from '../../components/admin/ProductEditorModal';

interface CatalogProductRow {
  _id: string;
  title: string;
  slug: string;
  images?: string[];
  moderationStatus: string;
  isTrending?: boolean;
  isFlashSaleCandidate?: boolean;
  categoryId?: { _id: string; name: string } | string;
  brandId?: { _id: string; name: string } | string;
  createdByStoreId?: { _id: string; name: string } | string;
}

interface CatalogOfferRow {
  _id: string;
  productId?: { _id: string } | string;
  price?: number;
  stock?: number;
}

interface CatalogCategoryOption {
  _id: string;
  name: string;
}

export function AdminCatalogPage() {
  const dispatch = useDispatch();
  const [products, setProducts] = useState<CatalogProductRow[]>([]);
  const [offers, setOffers] = useState<CatalogOfferRow[]>([]);
  const [categories, setCategories] = useState<CatalogCategoryOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteProd, setDeleteProd] = useState<CatalogProductRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editorModal, setEditorModal] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });

  const load = () => {
    apiRequest<{
      products: CatalogProductRow[];
      offers: CatalogOfferRow[];
      categories: CatalogCategoryOption[];
    }>('/api/admin/catalog/products')
      .then((res) => {
        setProducts(res.products || []);
        setOffers(res.offers || []);
        setCategories(res.categories || []);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unable to fetch catalog';
        dispatch(pushToast({ type: 'error', title: 'Failed to load catalog', message }));
      });
  };
  useEffect(load, []);

  const updateModeration = async (id: string, patch: Record<string, unknown>) => {
    try {
      await apiRequest(`/api/admin/catalog/products/${id}/moderation`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      dispatch(pushToast({ type: 'success', title: 'Product updated' }));
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      dispatch(pushToast({ type: 'error', title: 'Error', message }));
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProd) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/catalog/products/${deleteProd._id}`, { method: 'DELETE' });
      dispatch(pushToast({ type: 'info', title: 'Product deleted' }));
      setDeleteProd(null);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      dispatch(pushToast({ type: 'error', title: 'Delete blocked', message }));
    } finally {
      setDeleting(false);
    }
  };

  const offerByProdId = new Map<string, { price: number; stock: number; count: number }>();
  for (const off of offers) {
    const pid =
      off.productId && typeof off.productId === 'object'
        ? String(off.productId._id)
        : String(off.productId || '');
    if (!pid) continue;
    const existing = offerByProdId.get(pid);
    if (!existing) {
      offerByProdId.set(pid, { price: off.price || 0, stock: off.stock || 0, count: 1 });
    } else {
      offerByProdId.set(pid, {
        price: Math.min(existing.price, off.price || existing.price),
        stock: existing.stock + (off.stock || 0),
        count: existing.count + 1,
      });
    }
  }

  const filteredProducts = products.filter((p) => {
    const catId = p.categoryId && typeof p.categoryId === 'object' ? p.categoryId._id : p.categoryId;
    if (categoryFilter && String(catId) !== categoryFilter) return false;
    if (statusFilter && p.moderationStatus !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.trim().toLowerCase();
    const catName = p.categoryId && typeof p.categoryId === 'object' ? p.categoryId.name : '';
    const brandName = p.brandId && typeof p.brandId === 'object' ? p.brandId.name : '';
    return (
      p.title?.toLowerCase().includes(q) ||
      p.slug?.toLowerCase().includes(q) ||
      catName.toLowerCase().includes(q) ||
      brandName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Products &amp; Catalog Moderation ({filteredProducts.length})
            </h1>
            <p className="text-xs text-slate-500">
              Create, edit, approve, suspend, feature, or remove canonical marketplace products
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/categories"
              className="px-3.5 h-9 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 inline-flex items-center hover:bg-slate-50"
            >
              Categories
            </Link>
            <Link
              to="/admin/brands"
              className="px-3.5 h-9 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 inline-flex items-center hover:bg-slate-50"
            >
              Brands
            </Link>
            <button
              type="button"
              onClick={() => setEditorModal({ open: true, productId: null })}
              className="px-4 h-9 rounded-xl bg-[#0D63F3] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-[#0A52CC] shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search title, brand, SKU, category..."
              className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="pending_review">Pending Review</option>
            <option value="draft">Draft</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Product</th>
                <th className="py-2 pr-3">Category / Brand</th>
                <th className="py-2 pr-3">Price</th>
                <th className="py-2 pr-3">Stock</th>
                <th className="py-2 pr-3">Flags</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const offerStats = offerByProdId.get(String(p._id));
                const catName = p.categoryId && typeof p.categoryId === 'object' ? p.categoryId.name : 'Category';
                const brandName = p.brandId && typeof p.brandId === 'object' ? p.brandId.name : 'Brand';
                const storeName =
                  p.createdByStoreId && typeof p.createdByStoreId === 'object'
                    ? p.createdByStoreId.name
                    : 'Catalog';
                return (
                  <tr key={p._id} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3 min-w-[210px]">
                        <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden shrink-0">
                          <ImageWithFallback src={p.images?.[0] || ''} alt={p.title} className="object-contain" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-[240px]">{p.title}</p>
                          <p className="text-[11px] text-slate-500 truncate">Store: {storeName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-slate-600">
                      <p className="font-semibold text-slate-800">{catName}</p>
                      <p className="text-[11px] text-slate-500">{brandName}</p>
                    </td>
                    <td className="py-3 pr-3 font-bold text-slate-900 tabular-nums whitespace-nowrap">
                      {offerStats ? formatBDT(offerStats.price) : '—'}
                    </td>
                    <td className="py-3 pr-3 font-semibold tabular-nums">
                      {offerStats ? `${offerStats.stock} (${offerStats.count} offer${offerStats.count > 1 ? 's' : ''})` : '0'}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateModeration(p._id, { moderationStatus: p.moderationStatus, isTrending: !p.isTrending })}
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            p.isTrending ? 'bg-blue-50 text-[#0D63F3]' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.isTrending ? 'Trending' : 'Standard'}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateModeration(p._id, {
                              moderationStatus: p.moderationStatus,
                              isFlashSaleCandidate: !p.isFlashSaleCandidate,
                            })
                          }
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            p.isFlashSaleCandidate ? 'bg-red-50 text-[#EF3E36]' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {p.isFlashSaleCandidate ? 'Flash' : 'Normal'}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 pr-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                          p.moderationStatus === 'published'
                            ? 'bg-emerald-50 text-emerald-700'
                            : p.moderationStatus === 'pending_review'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {p.moderationStatus.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditorModal({ open: true, productId: p._id })}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-[#0D63F3] hover:text-[#0D63F3]"
                          aria-label={`Edit ${p.title}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {p.moderationStatus !== 'published' ? (
                          <button
                            type="button"
                            onClick={() => updateModeration(p._id, { moderationStatus: 'published' })}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px]"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => updateModeration(p._id, { moderationStatus: 'suspended' })}
                            className="px-2.5 py-1 rounded-lg border border-amber-300 text-amber-800 font-bold text-[11px]"
                          >
                            Suspend
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDeleteProd(p)}
                          className="p-1.5 rounded-lg border border-red-200 text-[#EF3E36] hover:bg-red-50"
                          aria-label={`Delete ${p.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ProductEditorModal
        open={editorModal.open}
        productId={editorModal.productId}
        onClose={() => setEditorModal({ open: false, productId: null })}
        onSaved={load}
      />

      <ConfirmDialog
        open={Boolean(deleteProd)}
        onClose={() => setDeleteProd(null)}
        onConfirm={handleDeleteProduct}
        title="Delete Product?"
        description={`Permanently remove "${deleteProd?.title || ''}" and its active seller offers? Products linked to historical orders cannot be deleted.`}
        confirmLabel="Confirm Delete"
        loading={deleting}
      />
    </div>
  );
}

export function AdminOrdersPage() {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const initialQ = searchParams.get('q') || '';

  const [q, setQ] = useState(initialQ);
  const [statusFilter, setStatusFilter] = useState('');
  const [parentOrders, setParentOrders] = useState<any[]>([]);
  const [subOrders, setSubOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [nextStatus, setNextStatus] = useState('');
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderDetail, setOrderDetail] = useState<any>(null);

  const load = (query = q, status = statusFilter) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (status) params.set('status', status);
    apiRequest(`/api/admin/orders?${params.toString()}`)
      .then((res) => {
        setParentOrders(res.parentOrders || []);
        setSubOrders(res.subOrders || []);
        setTransactions(res.transactions || []);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unable to fetch orders';
        dispatch(pushToast({ type: 'error', title: 'Failed to load orders', message }));
      });
  };

  useEffect(() => {
    setQ(initialQ);
    load(initialQ, statusFilter);
  }, [initialQ]);

  const submitTransition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub || !nextStatus) return;
    try {
      await apiRequest(`/api/admin/orders/suborders/${selectedSub._id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus, courierName, trackingNumber }),
      });
      dispatch(pushToast({ type: 'success', title: `Suborder updated to ${nextStatus}` }));
      setSelectedSub(null);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transition failed';
      dispatch(pushToast({ type: 'error', title: 'Transition blocked', message }));
    }
  };

  const openParentDetail = async (id: string) => {
    try {
      const res = await apiRequest(`/api/admin/orders/${id}`);
      setOrderDetail(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Load failed';
      dispatch(pushToast({ type: 'error', title: 'Unable to open order detail', message }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">Orders &amp; Multi-Vendor Suborders</h1>
            <p className="text-xs text-slate-500">
              {parentOrders.length} parent orders · {subOrders.length} seller suborders · {transactions.length} payment records
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load(q, statusFilter);
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search order #, store, customer..."
              className="h-9 px-3 rounded-xl border border-slate-300 text-xs w-52"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                load(q, e.target.value);
              }}
              className="h-9 px-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="packed">Packed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button type="submit" className="px-4 h-9 rounded-xl bg-[#0D63F3] text-white text-xs font-bold">
              Filter
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Suborder #</th>
                <th className="py-2 pr-3">Seller Store</th>
                <th className="py-2 pr-3">Subtotal</th>
                <th className="py-2 pr-3">Commission</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subOrders.map((sub) => {
                const allowed = ALLOWED_SUBORDER_TRANSITIONS[sub.status as OrderStatus] || [];
                return (
                  <tr key={sub._id}>
                    <td className="py-3 pr-3 font-mono-num font-bold text-slate-900">{sub.subOrderNumber}</td>
                    <td className="py-3 pr-3 font-semibold">{sub.storeName}</td>
                    <td className="py-3 pr-3 tabular-nums font-bold">{formatBDT(sub.subtotal)}</td>
                    <td className="py-3 pr-3 tabular-nums text-slate-600">{formatBDT(sub.commissionAmount)}</td>
                    <td className="py-3 pr-3 uppercase font-bold text-[#0D63F3] text-[11px]">
                      {sub.status.replace(/_/g, ' ')}
                    </td>
                    <td className="py-3 text-right">
                      {allowed.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSub(sub);
                            setNextStatus(allowed[0]);
                            setCourierName(sub.shipment?.courierName || 'Steadfast Courier');
                            setTrackingNumber(sub.shipment?.trackingNumber || '');
                          }}
                          className="px-3 py-1 rounded-lg bg-[#0D63F3] text-white font-bold text-[11px]"
                        >
                          Update Status
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">Finalized</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
        <h2 className="text-base font-bold text-slate-900">Parent Orders ({parentOrders.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Order #</th>
                <th className="py-2 pr-3">Customer</th>
                <th className="py-2 pr-3">Grand Total</th>
                <th className="py-2 pr-3">Method</th>
                <th className="py-2 pr-3">Payment Status</th>
                <th className="py-2 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {parentOrders.slice(0, 30).map((po) => (
                <tr key={po._id}>
                  <td className="py-2.5 pr-3 font-mono-num font-bold text-slate-900">#{po.orderNumber}</td>
                  <td className="py-2.5 pr-3">{po.customerId?.name || po.shippingAddress?.fullName}</td>
                  <td className="py-2.5 pr-3 font-bold tabular-nums">{formatBDT(po.grandTotal)}</td>
                  <td className="py-2.5 pr-3 uppercase font-semibold">{po.paymentMethod}</td>
                  <td className="py-2.5 pr-3 uppercase font-bold text-[11px]">{po.paymentStatus}</td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => openParentDetail(po._id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 font-bold text-[11px] hover:border-[#0D63F3] hover:text-[#0D63F3]"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={Boolean(selectedSub)} title={`Update Suborder ${selectedSub?.subOrderNumber}`} onClose={() => setSelectedSub(null)}>
        <form onSubmit={submitTransition} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Next Valid State</label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-bold"
            >
              {(ALLOWED_SUBORDER_TRANSITIONS[selectedSub?.status as OrderStatus] || []).map((st: string) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Courier (e.g. Pathao, Steadfast)"
              value={courierName}
              onChange={(e) => setCourierName(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-300 text-xs"
            />
            <input
              placeholder="Tracking #"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setSelectedSub(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#0D63F3] text-white text-xs font-bold">
              Apply Transition
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={Boolean(orderDetail)} title={`Order #${orderDetail?.parentOrder?.orderNumber || ''}`} onClose={() => setOrderDetail(null)}>
        {orderDetail && (
          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <p className="font-bold text-slate-900">
                Customer: {orderDetail.parentOrder.customerId?.name || orderDetail.parentOrder.shippingAddress?.fullName}
              </p>
              <p className="text-slate-600">
                {[
                  orderDetail.parentOrder.shippingAddress?.streetAddress,
                  orderDetail.parentOrder.shippingAddress?.unionOrArea,
                  orderDetail.parentOrder.shippingAddress?.upazila,
                  orderDetail.parentOrder.shippingAddress?.district,
                  orderDetail.parentOrder.shippingAddress?.division,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="font-bold text-[#0D63F3] tabular-nums">
                Total: {formatBDT(orderDetail.parentOrder.grandTotal)} · {orderDetail.parentOrder.paymentMethod.toUpperCase()} ({orderDetail.parentOrder.paymentStatus})
              </p>
            </div>
            {(orderDetail.subOrders || []).map((s: any) => (
              <div key={s._id} className="p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between font-bold">
                  <span className="font-mono-num">{s.subOrderNumber} ({s.storeName})</span>
                  <span className="uppercase text-[#0D63F3]">{s.status}</span>
                </div>
                {(s.items || []).map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-slate-600">
                    <span>{it.productTitle} × {it.quantity}</span>
                    <span className="font-semibold tabular-nums">{formatBDT(it.lineTotal)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

export function AdminReturnsPage() {
  const dispatch = useDispatch();
  const [returns, setReturns] = useState<any[]>([]);
  const [modalRet, setModalRet] = useState<any>(null);
  const [decision, setDecision] = useState({
    status: 'refund_approved',
    approvedAmount: 0,
    refundReferenceId: '',
    adminResolutionNote: '',
  });

  const load = () => {
    apiRequest('/api/admin/returns')
      .then((res) => setReturns(res.returns || []))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unable to fetch returns';
        dispatch(pushToast({ type: 'error', title: 'Failed to load returns', message }));
      });
  };
  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalRet) return;
    try {
      await apiRequest(`/api/admin/returns/${modalRet._id}`, {
        method: 'PATCH',
        body: JSON.stringify(decision),
      });
      dispatch(pushToast({ type: 'success', title: `Return updated to ${decision.status.replace(/_/g, ' ')}` }));
      setModalRet(null);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Action failed';
      dispatch(pushToast({ type: 'error', title: 'Error', message }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h1 className="text-lg font-extrabold text-slate-900">Returns, Disputes &amp; Refund Execution</h1>
      {returns.length === 0 ? (
        <p className="text-xs text-slate-500">No return requests open.</p>
      ) : (
        <div className="space-y-3">
          {returns.map((r) => {
            const finalized = r.status === 'refund_executed' || r.status === 'rejected';
            return (
              <div key={r._id} className="p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-num font-bold text-slate-900">{r.returnNumber}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-bold uppercase text-[10px]">
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Customer: {r.customerId?.name} · Store: {r.storeId?.name} · Requested: <strong>{formatBDT(r.requestedAmount)}</strong>
                    {r.approvedAmount !== undefined && ` · Approved: ${formatBDT(r.approvedAmount)}`}
                  </p>
                  <p className="text-slate-500">Reason: {r.reason}</p>
                  {r.refundReferenceId && (
                    <p className="text-emerald-700 font-mono-num">Refund Ref: {r.refundReferenceId}</p>
                  )}
                </div>
                {finalized ? (
                  <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-600 font-bold uppercase text-[11px]">
                    {r.status.replace(/_/g, ' ')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setModalRet(r);
                      setDecision({
                        status: r.status === 'refund_approved' ? 'refund_executed' : 'refund_approved',
                        approvedAmount: r.approvedAmount ?? r.requestedAmount,
                        refundReferenceId: r.refundReferenceId || `REF-${Date.now()}`,
                        adminResolutionNote: r.adminResolutionNote || '',
                      });
                    }}
                    className="px-4 py-2 rounded-xl bg-[#0D63F3] text-white font-bold"
                  >
                    Resolve / Execute Refund
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(modalRet)} title={`Process Return ${modalRet?.returnNumber}`} onClose={() => setModalRet(null)}>
        <form onSubmit={submit} className="space-y-3">
          <select
            value={decision.status}
            onChange={(e) => setDecision({ ...decision, status: e.target.value })}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-bold"
          >
            <option value="admin_review">Under Admin Review</option>
            <option value="item_received">Returned Item Received</option>
            <option value="refund_approved">Refund Approved</option>
            <option value="refund_executed">Refund Executed (Debit Seller &amp; Mark Refunded)</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            type="number"
            min={0}
            max={modalRet?.requestedAmount}
            placeholder="Approved Refund Amount (BDT)"
            value={decision.approvedAmount}
            onChange={(e) => setDecision({ ...decision, approvedAmount: Number(e.target.value) })}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
          />
          <input
            placeholder="Refund Reference ID"
            value={decision.refundReferenceId}
            onChange={(e) => setDecision({ ...decision, refundReferenceId: e.target.value })}
            className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs"
          />
          <textarea
            rows={2}
            placeholder="Admin resolution notes..."
            value={decision.adminResolutionNote}
            onChange={(e) => setDecision({ ...decision, adminResolutionNote: e.target.value })}
            className="w-full p-3 rounded-xl border border-slate-300 text-xs"
          />
          <button type="submit" className="w-full py-2.5 rounded-xl bg-[#0D63F3] text-white text-xs font-bold">
            Save Return Resolution
          </button>
        </form>
      </Modal>
    </div>
  );
}
