import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Edit3, Image as ImageIcon, Loader2, Palette, Plus, Search, Sliders, Trash2 } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { pushToast } from '../../store/uiSlice';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { AdminDialog, ConfirmDialog } from '../../components/admin/AdminDialog';
import { SingleMediaUploader } from '../../components/admin/MediaUploader';
import { HeroSlideModal } from '../../components/admin/HeroSlideModal';
import { BannerStudioModal } from '../../components/admin/BannerStudioModal';
import {
  BannerRecord,
  DEFAULT_HERO_SLIDER_CONFIG,
  HeroSliderConfig,
  buildGradientCss,
  mergeBannerStyleConfig,
} from '../../../shared/bannerStyle';

interface CmsSectionItem {
  _id: string;
  key: string;
  title: string;
  subtitle?: string;
  sectionType: string;
  visible: boolean;
  displayOrder: number;
  config?: Record<string, unknown>;
}

export function AdminCmsPage() {
  const dispatch = useDispatch();
  const [sections, setSections] = useState<CmsSectionItem[]>([]);

  const load = () => {
    apiRequest<{ sections: CmsSectionItem[] }>('/api/admin/cms')
      .then((res) => setSections(res.sections || []))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Load failed';
        dispatch(pushToast({ type: 'error', title: 'Failed to load CMS sections', message }));
      });
  };
  useEffect(load, []);

  const updateSection = async (sec: CmsSectionItem) => {
    try {
      await apiRequest(`/api/admin/cms/${sec._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: sec.title,
          subtitle: sec.subtitle,
          visible: sec.visible,
          displayOrder: Number(sec.displayOrder),
          config: sec.config || {},
        }),
      });
      dispatch(pushToast({ type: 'success', title: `Saved "${sec.title}"` }));
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      dispatch(pushToast({ type: 'error', title: 'Update failed', message }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
      <div>
        <h1 className="text-lg font-extrabold text-slate-900">Homepage CMS Sections</h1>
        <p className="text-xs text-slate-500">
          Reorder, rename, toggle visibility, and live-edit public homepage sections without touching code.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((sec, idx) => (
          <div key={sec._id} className="p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold uppercase text-slate-600">
                  {sec.sectionType}
                </span>
                <span className="text-xs font-mono-num text-slate-400">key: {sec.key}</span>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sec.visible}
                  onChange={(e) => {
                    const next = [...sections];
                    next[idx] = { ...sec, visible: e.target.checked };
                    setSections(next);
                  }}
                />
                Visible on Homepage
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                value={sec.title}
                onChange={(e) => {
                  const next = [...sections];
                  next[idx] = { ...sec, title: e.target.value };
                  setSections(next);
                }}
                placeholder="Section Title"
                className="h-9 px-3 rounded-lg border border-slate-300 text-xs font-semibold"
              />
              <input
                value={sec.subtitle || ''}
                onChange={(e) => {
                  const next = [...sections];
                  next[idx] = { ...sec, subtitle: e.target.value };
                  setSections(next);
                }}
                placeholder="Subtitle"
                className="sm:col-span-2 h-9 px-3 rounded-lg border border-slate-300 text-xs"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={sec.displayOrder}
                  onChange={(e) => {
                    const next = [...sections];
                    next[idx] = { ...sec, displayOrder: Number(e.target.value) };
                    setSections(next);
                  }}
                  aria-label="Display order"
                  className="w-20 h-9 px-2.5 rounded-lg border border-slate-300 text-xs"
                />
                <button
                  type="button"
                  onClick={() => updateSection(sections[idx])}
                  className="flex-1 h-9 rounded-lg bg-[#0D63F3] text-white text-xs font-bold"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminBannersPage() {
  const dispatch = useDispatch();
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [sliderConfig, setSliderConfig] = useState<HeroSliderConfig>(DEFAULT_HERO_SLIDER_CONFIG);
  const [positionFilter, setPositionFilter] = useState<string>('all');

  const [heroModal, setHeroModal] = useState<{ open: boolean; slide: BannerRecord | null }>({
    open: false,
    slide: null,
  });
  const [studioModal, setStudioModal] = useState<{ open: boolean; banner: BannerRecord | null }>({
    open: false,
    banner: null,
  });
  const [sliderModalOpen, setSliderModalOpen] = useState(false);
  const [savingSlider, setSavingSlider] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<BannerRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    apiRequest<{ banners: BannerRecord[]; sliderSettings?: HeroSliderConfig }>('/api/admin/banners')
      .then((res) => {
        setBanners(res.banners || []);
        if (res.sliderSettings) setSliderConfig(res.sliderSettings);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Unable to fetch banners';
        dispatch(pushToast({ type: 'error', title: 'Failed to load banners', message }));
      });
  };
  useEffect(load, []);

  const toggleBanner = async (b: BannerRecord) => {
    try {
      await apiRequest(`/api/admin/banners/${b._id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !b.active }),
      });
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      dispatch(pushToast({ type: 'error', title: 'Update failed', message }));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/banners/${deleteTarget._id}`, { method: 'DELETE' });
      dispatch(pushToast({ type: 'info', title: 'Banner removed' }));
      setDeleteTarget(null);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      dispatch(pushToast({ type: 'error', title: 'Delete failed', message }));
    } finally {
      setDeleting(false);
    }
  };

  const saveSliderSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSlider(true);
    try {
      const res = await apiRequest<{ sliderSettings: HeroSliderConfig }>('/api/admin/banners/slider-settings', {
        method: 'PUT',
        body: JSON.stringify(sliderConfig),
      });
      if (res.sliderSettings) setSliderConfig(res.sliderSettings);
      dispatch(pushToast({ type: 'success', title: 'Hero slider settings saved' }));
      setSliderModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unable to save slider settings';
      dispatch(pushToast({ type: 'error', title: 'Save failed', message }));
    } finally {
      setSavingSlider(false);
    }
  };

  const filteredBanners =
    positionFilter === 'all' ? banners : banners.filter((b) => b.position === positionFilter);
  const heroCount = banners.filter((b) => b.position === 'hero_slide').length;

  return (
    <div className="space-y-6">
      {/* Header & Action Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Hero Sliders &amp; Dynamic Banners ({banners.length})
            </h1>
            <p className="text-xs text-slate-500">
              Manage full-bleed hero slides, slider behavior, and dynamic campaign banners with live preview
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSliderModalOpen(true)}
              className="px-3.5 h-9 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-[#0D63F3]" />
              <span>Slider Settings</span>
            </button>
            <button
              type="button"
              onClick={() => setHeroModal({ open: true, slide: null })}
              className="px-3.5 h-9 rounded-xl border border-[#0D63F3] bg-blue-50/70 text-[#0D63F3] hover:bg-blue-100 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Add Hero Slide</span>
            </button>
            <button
              type="button"
              onClick={() => setStudioModal({ open: true, banner: null })}
              className="px-4 h-9 rounded-xl bg-[#0D63F3] hover:bg-[#0A52CC] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Create Dynamic Banner</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100">
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { id: 'all', label: `All (${banners.length})` },
              { id: 'hero_slide', label: `Hero Slides (${heroCount})` },
              { id: 'promo_trio', label: 'Promo Trio' },
              { id: 'category_top', label: 'Category Strip' },
              { id: 'seasonal_strip', label: 'Seasonal Strip' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPositionFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                  positionFilter === tab.id
                    ? 'bg-[#0D63F3] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-500">
            Carousel: <strong>{sliderConfig.autoplay ? `${sliderConfig.slideDurationMs / 1000}s Autoplay` : 'Manual'}</strong> ·{' '}
            {sliderConfig.transitionType === 'fade' ? 'Fade' : 'Slide'} transition
          </span>
        </div>

        {filteredBanners.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-slate-200 rounded-xl">
            No banners in this placement yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBanners.map((b) => {
              const style = mergeBannerStyleConfig(b.gradientTheme, b.styleConfig);
              const isHero = b.position === 'hero_slide';
              const displayTitle = b.title?.trim() || (isHero ? `Hero Slide #${b.displayOrder}` : 'Untitled Banner');
              const swatchStyle: React.CSSProperties =
                style.backgroundMode === 'solid'
                  ? { backgroundColor: style.solidColor }
                  : style.backgroundMode === 'gradient'
                    ? { backgroundImage: buildGradientCss(style) }
                    : {};
              return (
                <div
                  key={b._id}
                  className="p-3.5 rounded-xl border border-slate-200 flex items-center gap-3.5 text-xs hover:border-blue-200 transition-colors"
                >
                  <div
                    className="w-24 h-16 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200/60 flex items-center justify-center"
                    style={swatchStyle}
                  >
                    {b.imageUrl ? (
                      <ImageWithFallback src={b.imageUrl} alt={displayTitle} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] font-extrabold px-2 text-center" style={{ color: style.textColor }}>
                        {b.gradientTheme || 'Dynamic'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-slate-900 truncate">{displayTitle}</p>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] font-bold uppercase text-slate-600 shrink-0">
                        {b.position.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      Order {b.displayOrder} · {b.linkUrl?.trim() ? b.linkUrl : 'No link (visual only)'}
                    </p>
                    {(b.startDate || b.endDate) && (
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {b.startDate ? `From ${new Date(b.startDate).toLocaleDateString()}` : ''}{' '}
                        {b.endDate ? `Until ${new Date(b.endDate).toLocaleDateString()}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (isHero) {
                          setHeroModal({ open: true, slide: b });
                        } else {
                          setStudioModal({ open: true, banner: b });
                        }
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-[#0D63F3] hover:text-[#0D63F3]"
                      aria-label={`Edit banner ${displayTitle}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleBanner(b)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        b.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {b.active ? 'Active' : 'Paused'}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete banner ${displayTitle}`}
                      onClick={() => setDeleteTarget(b)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#EF3E36]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Simplified Hero Slide Modal */}
      <HeroSlideModal
        open={heroModal.open}
        slide={heroModal.slide}
        nextOrder={heroCount + 1}
        onClose={() => setHeroModal({ open: false, slide: null })}
        onSaved={load}
      />

      {/* Full Dynamic Banner Studio Modal */}
      <BannerStudioModal
        open={studioModal.open}
        banner={studioModal.banner}
        nextOrder={banners.length + 1}
        onClose={() => setStudioModal({ open: false, banner: null })}
        onSaved={load}
      />

      {/* Hero Slider Carousel Behavior Modal */}
      <AdminDialog
        open={sliderModalOpen}
        onClose={() => setSliderModalOpen(false)}
        title="Hero Slider Behavior Settings"
        subtitle="Configure autoplay interval, transition style, loop, arrows, and indicator dots on the homepage hero."
        badge="Carousel"
        size="md"
        isSubmitting={savingSlider}
        footer={
          <>
            <button
              type="button"
              onClick={() => setSliderModalOpen(false)}
              className="px-4 h-9 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="slider-settings-form"
              disabled={savingSlider}
              className="px-5 h-9 rounded-xl bg-[#0D63F3] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              {savingSlider && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Slider Settings</span>
            </button>
          </>
        }
      >
        <form id="slider-settings-form" onSubmit={saveSliderSettings} className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Transition Style</label>
                <select
                  value={sliderConfig.transitionType}
                  onChange={(e) =>
                    setSliderConfig((prev) => ({
                      ...prev,
                      transitionType: e.target.value === 'fade' ? 'fade' : 'slide',
                    }))
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="slide">Smooth Slide</option>
                  <option value="fade">Cross Fade</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Slide Interval (ms)</label>
                <input
                  type="number"
                  min={2000}
                  max={15000}
                  step={500}
                  value={sliderConfig.slideDurationMs}
                  onChange={(e) =>
                    setSliderConfig((prev) => ({ ...prev, slideDurationMs: Number(e.target.value) }))
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono-num"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Transition Speed (ms)</label>
                <input
                  type="number"
                  min={200}
                  max={1500}
                  step={50}
                  value={sliderConfig.transitionDurationMs}
                  onChange={(e) =>
                    setSliderConfig((prev) => ({ ...prev, transitionDurationMs: Number(e.target.value) }))
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono-num"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {(
                [
                  { key: 'autoplay', label: 'Enable Autoplay' },
                  { key: 'pauseOnHover', label: 'Pause on Hover' },
                  { key: 'loop', label: 'Loop Infinitely' },
                  { key: 'showDots', label: 'Show Indicator Dots' },
                  { key: 'showArrows', label: 'Show Prev/Next Arrows' },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer"
                >
                  <span className="font-semibold text-slate-700">{opt.label}</span>
                  <input
                    type="checkbox"
                    checked={sliderConfig[opt.key]}
                    onChange={(e) =>
                      setSliderConfig((prev) => ({ ...prev, [opt.key]: e.target.checked }))
                    }
                    className="w-4 h-4 accent-[#0D63F3]"
                  />
                </label>
              ))}
            </div>
          </div>
        </form>
      </AdminDialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Banner?"
        description="This banner will be permanently removed from all storefront placements."
        confirmLabel="Delete Banner"
        loading={deleting}
      />
    </div>
  );
}

interface AdDoc {
  _id: string;
  name: string;
  campaign: string;
  adType: 'internal_banner' | 'sponsored_product' | 'sponsored_store';
  placement: string;
  mediaUrl?: string;
  destinationLink: string;
  targetProductId?: string;
  targetStoreId?: string;
  priority: number;
  startAt?: string;
  endAt?: string;
  active: boolean;
  impressions?: number;
  clicks?: number;
}

interface ProductOption {
  _id: string;
  title: string;
  slug: string;
}

interface StoreOption {
  _id: string;
  name: string;
  slug: string;
}

export function AdminAdsPage() {
  const dispatch = useDispatch();
  const [ads, setAds] = useState<AdDoc[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    campaign: 'Q4 Bangladesh Marketplace',
    adType: 'internal_banner' as AdDoc['adType'],
    placement: 'homepage_section',
    mediaUrl: '',
    destinationLink: '/category/electronics',
    targetProductId: '',
    targetStoreId: '',
    priority: 10,
    startAt: '',
    endAt: '',
    active: true,
  });

  const [deleteAd, setDeleteAd] = useState<AdDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    apiRequest<{ ads: AdDoc[] }>('/api/admin/ads')
      .then((res) => setAds(res.ads || []))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Load failed';
        dispatch(pushToast({ type: 'error', title: 'Failed to load ads', message }));
      });
  };

  useEffect(() => {
    load();
    Promise.all([
      apiRequest<{ products: ProductOption[] }>('/api/admin/catalog/products').catch(() => ({ products: [] })),
      apiRequest<{ stores: StoreOption[] }>('/api/catalog/stores').catch(() => ({ stores: [] })),
    ]).then(([pRes, sRes]) => {
      setProducts(pRes.products || []);
      setStores(sRes.stores || []);
    });
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormError(null);
    setDirty(false);
    setForm({
      name: '',
      campaign: 'Q4 Bangladesh Marketplace',
      adType: 'internal_banner',
      placement: 'homepage_section',
      mediaUrl: '',
      destinationLink: '/category/electronics',
      targetProductId: '',
      targetStoreId: '',
      priority: 10,
      startAt: '',
      endAt: '',
      active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (ad: AdDoc) => {
    setEditingId(ad._id);
    setFormError(null);
    setDirty(false);
    setForm({
      name: ad.name || '',
      campaign: ad.campaign || '',
      adType: ad.adType || 'internal_banner',
      placement: ad.placement || 'homepage_section',
      mediaUrl: ad.mediaUrl || '',
      destinationLink: ad.destinationLink || '',
      targetProductId: ad.targetProductId || '',
      targetStoreId: ad.targetStoreId || '',
      priority: ad.priority ?? 1,
      startAt: ad.startAt ? String(ad.startAt).slice(0, 10) : '',
      endAt: ad.endAt ? String(ad.endAt).slice(0, 10) : '',
      active: Boolean(ad.active),
    });
    setModalOpen(true);
  };

  const saveAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: form.name.trim(),
        campaign: form.campaign.trim(),
        adType: form.adType,
        placement: form.placement,
        mediaUrl: form.mediaUrl.trim() || undefined,
        destinationLink: form.destinationLink.trim(),
        targetProductId: form.targetProductId || undefined,
        targetStoreId: form.targetStoreId || undefined,
        priority: Number(form.priority || 1),
        startAt: form.startAt || undefined,
        endAt: form.endAt || undefined,
        active: form.active,
      };
      if (editingId) {
        await apiRequest(`/api/admin/ads/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        dispatch(pushToast({ type: 'success', title: 'Ad campaign updated' }));
      } else {
        await apiRequest('/api/admin/ads', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        dispatch(pushToast({ type: 'success', title: 'Advertisement campaign launched' }));
      }
      setDirty(false);
      setModalOpen(false);
      load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleAd = async (ad: AdDoc) => {
    try {
      await apiRequest(`/api/admin/ads/${ad._id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: !ad.active }),
      });
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      dispatch(pushToast({ type: 'error', title: 'Update failed', message }));
    }
  };

  const confirmDeleteAd = async () => {
    if (!deleteAd) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/ads/${deleteAd._id}`, { method: 'DELETE' });
      dispatch(pushToast({ type: 'info', title: 'Advertisement deleted' }));
      setDeleteAd(null);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      dispatch(pushToast({ type: 'error', title: 'Delete failed', message }));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900">
              Advertisement &amp; Sponsored Placements ({ads.length})
            </h1>
            <p className="text-xs text-slate-500">
              Launch sponsored product slots, store spotlights, and internal banner placements with CTR tracking
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 h-9 rounded-xl bg-[#0D63F3] hover:bg-[#0A52CC] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Ad Campaign</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Creative &amp; Campaign</th>
                <th className="py-2 pr-3">Placement</th>
                <th className="py-2 pr-3">Impressions</th>
                <th className="py-2 pr-3">Clicks</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ads.map((ad) => (
                <tr key={ad._id} className="hover:bg-slate-50/70">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                        <ImageWithFallback src={ad.mediaUrl || ''} alt={ad.name} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{ad.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {ad.campaign} · {ad.adType.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-3">{ad.placement.replace(/_/g, ' ')}</td>
                  <td className="py-3 pr-3 tabular-nums font-semibold">{ad.impressions ?? 0}</td>
                  <td className="py-3 pr-3 tabular-nums font-semibold">{ad.clicks ?? 0}</td>
                  <td className="py-3 pr-3">
                    <button
                      type="button"
                      onClick={() => toggleAd(ad)}
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        ad.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {ad.active ? 'Active' : 'Paused'}
                    </button>
                  </td>
                  <td className="py-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(ad)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-[#0D63F3] hover:text-[#0D63F3]"
                        aria-label={`Edit ad ${ad.name}`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteAd(ad)}
                        className="p-1.5 rounded-lg border border-red-200 text-[#EF3E36] hover:bg-red-50"
                        aria-label={`Delete ad ${ad.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AdminDialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? `Edit Ad Campaign: ${form.name}` : 'Create Advertisement Campaign'}
        subtitle="Upload creative media and target a storefront placement, product, or store."
        badge="Growth & Ads"
        size="lg"
        isDirty={dirty}
        isSubmitting={saving}
        error={formError}
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
              form="ad-campaign-form"
              disabled={saving}
              className="px-5 h-9 rounded-xl bg-[#0D63F3] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingId ? 'Save Ad Campaign' : 'Launch Ad Campaign'}</span>
            </button>
          </>
        }
      >
        <form id="ad-campaign-form" onSubmit={saveAd} className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3">
            <SingleMediaUploader
              folder="ads"
              label="Ad Creative Image"
              aspectClass="h-40"
              value={form.mediaUrl}
              onChange={(url) => {
                setForm((prev) => ({ ...prev, mediaUrl: url }));
                setDirty(true);
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Placement Title *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, name: e.target.value }));
                    setDirty(true);
                  }}
                  placeholder="e.g. Anker Audio Spotlight"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Name *</label>
                <input
                  required
                  value={form.campaign}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, campaign: e.target.value }));
                    setDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Ad Type</label>
                <select
                  value={form.adType}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, adType: e.target.value as AdDoc['adType'] }));
                    setDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="internal_banner">Internal Banner</option>
                  <option value="sponsored_product">Sponsored Product</option>
                  <option value="sponsored_store">Sponsored Store</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Placement Slot</label>
                <select
                  value={form.placement}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, placement: e.target.value }));
                    setDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="homepage_banner">Homepage Banner</option>
                  <option value="homepage_section">Homepage Section</option>
                  <option value="category_page">Category Page</option>
                  <option value="search_results">Search Results</option>
                  <option value="product_listing">Product Listing</option>
                  <option value="seller_storefront">Seller Storefront</option>
                </select>
              </div>
            </div>

            {form.adType === 'sponsored_product' && products.length > 0 && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Product (Auto-fills Link)</label>
                <select
                  value={form.targetProductId}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const chosen = products.find((p) => p._id === pid);
                    setForm((prev) => ({
                      ...prev,
                      targetProductId: pid,
                      destinationLink: chosen ? `/product/${chosen.slug}` : prev.destinationLink,
                    }));
                    setDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="">Select Product...</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {form.adType === 'sponsored_store' && stores.length > 0 && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Store (Auto-fills Link)</label>
                <select
                  value={form.targetStoreId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    const chosen = stores.find((s) => s._id === sid);
                    setForm((prev) => ({
                      ...prev,
                      targetStoreId: sid,
                      destinationLink: chosen ? `/shop/${chosen.slug}` : prev.destinationLink,
                    }));
                    setDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="">Select Store...</option>
                  {stores.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">Destination Link *</label>
                <input
                  required
                  value={form.destinationLink}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, destinationLink: e.target.value }));
                    setDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Priority</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={form.priority}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, priority: Number(e.target.value) }));
                    setDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white tabular-nums"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={form.startAt}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, startAt: e.target.value }));
                    setDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={form.endAt}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, endAt: e.target.value }));
                    setDirty(true);
                  }}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div className="flex items-end">
                <label className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <span className="font-semibold text-slate-700">Active</span>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, active: e.target.checked }));
                      setDirty(true);
                    }}
                    className="w-4 h-4 accent-[#0D63F3]"
                  />
                </label>
              </div>
            </div>
          </div>
        </form>
      </AdminDialog>

      <ConfirmDialog
        open={Boolean(deleteAd)}
        onClose={() => setDeleteAd(null)}
        onConfirm={confirmDeleteAd}
        title="Delete Advertisement?"
        description={`Permanently remove "${deleteAd?.name || ''}" from the marketplace?`}
        confirmLabel="Delete Ad"
        loading={deleting}
      />
    </div>
  );
}

interface CouponDoc {
  _id: string;
  code: string;
  title: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  maxDiscountAmount?: number;
  usageLimit: number;
  usedCount: number;
  startAt: string;
  endAt: string;
  active: boolean;
}

interface PromotionDoc {
  _id: string;
  name: string;
  type: 'flash_sale' | 'seasonal_campaign' | 'category_campaign';
  discountBadgeText: string;
  startAt: string;
  endAt: string;
  productIds: Array<{ _id: string; title: string } | string>;
  active: boolean;
}

export function AdminPromotionsPage() {
  const dispatch = useDispatch();
  const [promotions, setPromotions] = useState<PromotionDoc[]>([]);
  const [coupons, setCoupons] = useState<CouponDoc[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductOption[]>([]);

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponForm, setCouponForm] = useState({
    code: '',
    title: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: 10,
    minOrderAmount: 500,
    maxDiscountAmount: 500,
    usageLimit: 100,
    startAt: '',
    endAt: '',
    active: true,
  });

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromoId, setEditingPromoId] = useState<string | null>(null);
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [prodQuery, setProdQuery] = useState('');
  const [promoForm, setPromoForm] = useState({
    name: '',
    type: 'flash_sale' as PromotionDoc['type'],
    discountBadgeText: 'Up to 40% OFF',
    startAt: '',
    endAt: '',
    productIds: [] as string[],
    active: true,
  });

  const [deleteCoupon, setDeleteCoupon] = useState<CouponDoc | null>(null);
  const [deletePromo, setDeletePromo] = useState<PromotionDoc | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    apiRequest<{ promotions: PromotionDoc[]; coupons: CouponDoc[] }>('/api/admin/promotions')
      .then((res) => {
        setPromotions(res.promotions || []);
        setCoupons(res.coupons || []);
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Load failed';
        dispatch(pushToast({ type: 'error', title: 'Failed to load promotions', message }));
      });
  };

  useEffect(() => {
    load();
    apiRequest<{ products: ProductOption[] }>('/api/admin/catalog/products')
      .then((res) => setCatalogProducts(res.products || []))
      .catch(() => {});
  }, []);

  const openCreateCoupon = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    setEditingCouponId(null);
    setCouponError(null);
    setCouponForm({
      code: '',
      title: '',
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 500,
      maxDiscountAmount: 500,
      usageLimit: 100,
      startAt: now.toISOString().slice(0, 10),
      endAt: end.toISOString().slice(0, 10),
      active: true,
    });
    setCouponModalOpen(true);
  };

  const openEditCoupon = (c: CouponDoc) => {
    setEditingCouponId(c._id);
    setCouponError(null);
    setCouponForm({
      code: c.code,
      title: c.title,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderAmount: c.minOrderAmount,
      maxDiscountAmount: c.maxDiscountAmount ?? 0,
      usageLimit: c.usageLimit,
      startAt: c.startAt ? String(c.startAt).slice(0, 10) : '',
      endAt: c.endAt ? String(c.endAt).slice(0, 10) : '',
      active: Boolean(c.active),
    });
    setCouponModalOpen(true);
  };

  const saveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCoupon(true);
    setCouponError(null);
    try {
      if (editingCouponId) {
        await apiRequest(`/api/admin/coupons/${editingCouponId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: couponForm.title.trim(),
            discountType: couponForm.discountType,
            discountValue: Number(couponForm.discountValue),
            minOrderAmount: Number(couponForm.minOrderAmount),
            maxDiscountAmount: Number(couponForm.maxDiscountAmount),
            usageLimit: Number(couponForm.usageLimit),
            startAt: couponForm.startAt ? new Date(couponForm.startAt) : undefined,
            endAt: couponForm.endAt ? new Date(couponForm.endAt) : undefined,
            active: couponForm.active,
          }),
        });
        dispatch(pushToast({ type: 'success', title: 'Coupon updated' }));
      } else {
        await apiRequest('/api/admin/coupons', {
          method: 'POST',
          body: JSON.stringify({
            code: couponForm.code.trim().toUpperCase(),
            title: couponForm.title.trim(),
            discountType: couponForm.discountType,
            discountValue: Number(couponForm.discountValue),
            minOrderAmount: Number(couponForm.minOrderAmount),
            maxDiscountAmount: Number(couponForm.maxDiscountAmount),
            usageLimit: Number(couponForm.usageLimit),
            startAt: couponForm.startAt ? new Date(couponForm.startAt) : new Date(),
            endAt: couponForm.endAt ? new Date(couponForm.endAt) : new Date(Date.now() + 30 * 86400000),
            active: couponForm.active,
          }),
        });
        dispatch(pushToast({ type: 'success', title: `Coupon ${couponForm.code.toUpperCase()} created` }));
      }
      setCouponModalOpen(false);
      load();
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingCoupon(false);
    }
  };

  const toggleCoupon = async (c: CouponDoc) => {
    try {
      await apiRequest(`/api/admin/coupons/${c._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !c.active }),
      });
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      dispatch(pushToast({ type: 'error', title: 'Update failed', message }));
    }
  };

  const confirmDeleteCoupon = async () => {
    if (!deleteCoupon) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/coupons/${deleteCoupon._id}`, { method: 'DELETE' });
      dispatch(pushToast({ type: 'info', title: 'Coupon deleted' }));
      setDeleteCoupon(null);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete blocked';
      dispatch(pushToast({ type: 'error', title: 'Delete blocked', message }));
    } finally {
      setDeleting(false);
    }
  };

  const openCreatePromo = () => {
    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    setEditingPromoId(null);
    setPromoError(null);
    setProdQuery('');
    setPromoForm({
      name: '',
      type: 'flash_sale',
      discountBadgeText: 'Up to 40% OFF',
      startAt: now.toISOString().slice(0, 10),
      endAt: end.toISOString().slice(0, 10),
      productIds: [],
      active: true,
    });
    setPromoModalOpen(true);
  };

  const openEditPromo = (pr: PromotionDoc) => {
    setEditingPromoId(pr._id);
    setPromoError(null);
    setProdQuery('');
    setPromoForm({
      name: pr.name,
      type: pr.type,
      discountBadgeText: pr.discountBadgeText || '',
      startAt: pr.startAt ? String(pr.startAt).slice(0, 10) : '',
      endAt: pr.endAt ? String(pr.endAt).slice(0, 10) : '',
      productIds: (pr.productIds || []).map((p) => (typeof p === 'string' ? p : p._id)),
      active: Boolean(pr.active),
    });
    setPromoModalOpen(true);
  };

  const savePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPromo(true);
    setPromoError(null);
    try {
      const payload = {
        name: promoForm.name.trim(),
        type: promoForm.type,
        discountBadgeText: promoForm.discountBadgeText.trim(),
        startAt: promoForm.startAt ? new Date(promoForm.startAt) : new Date(),
        endAt: promoForm.endAt ? new Date(promoForm.endAt) : new Date(Date.now() + 14 * 86400000),
        productIds: promoForm.productIds,
        active: promoForm.active,
      };
      if (editingPromoId) {
        await apiRequest(`/api/admin/promotions/${editingPromoId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        dispatch(pushToast({ type: 'success', title: 'Promotion updated' }));
      } else {
        await apiRequest('/api/admin/promotions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        dispatch(pushToast({ type: 'success', title: 'Promotion campaign created' }));
      }
      setPromoModalOpen(false);
      load();
    } catch (err: unknown) {
      setPromoError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSavingPromo(false);
    }
  };

  const togglePromotion = async (pr: PromotionDoc) => {
    try {
      await apiRequest(`/api/admin/promotions/${pr._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !pr.active }),
      });
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      dispatch(pushToast({ type: 'error', title: 'Update failed', message }));
    }
  };

  const confirmDeletePromo = async () => {
    if (!deletePromo) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/admin/promotions/${deletePromo._id}`, { method: 'DELETE' });
      dispatch(pushToast({ type: 'info', title: 'Promotion deleted' }));
      setDeletePromo(null);
      load();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Delete failed';
      dispatch(pushToast({ type: 'error', title: 'Delete failed', message }));
    } finally {
      setDeleting(false);
    }
  };

  const filteredProducts = catalogProducts.filter((p) => {
    if (!prodQuery.trim()) return true;
    return p.title.toLowerCase().includes(prodQuery.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900">Marketplace Coupons &amp; Flash Sales</h1>
          <p className="text-xs text-slate-500">
            Configure promo codes, flash deal countdown events, and participating marketplace products
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openCreateCoupon}
            className="px-3.5 h-9 rounded-xl border border-[#0D63F3] bg-blue-50/70 text-[#0D63F3] hover:bg-blue-100 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Coupon</span>
          </button>
          <button
            type="button"
            onClick={openCreatePromo}
            className="px-4 h-9 rounded-xl bg-[#0D63F3] hover:bg-[#0A52CC] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch Promotion</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900">Active Coupons ({coupons.length})</h2>
          {coupons.map((c) => (
            <div key={c._id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <span className="font-mono-num font-black text-[#0D63F3]">{c.code}</span>
                <span className="ml-2 font-semibold text-slate-800">{c.title}</span>
                <p className="text-[11px] text-slate-500">
                  {c.discountType === 'percentage' ? `${c.discountValue}%` : `৳${c.discountValue}`} off · Min ৳{c.minOrderAmount} · Used {c.usedCount}/{c.usageLimit}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openEditCoupon(c)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-[#0D63F3] hover:text-[#0D63F3]"
                  aria-label={`Edit coupon ${c.code}`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleCoupon(c)}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                    c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {c.active ? 'Active' : 'Disabled'}
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteCoupon(c)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#EF3E36]"
                  aria-label={`Delete coupon ${c.code}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <h2 className="text-base font-bold text-slate-900">Promotions &amp; Flash Events ({promotions.length})</h2>
          <div className="space-y-2.5">
            {promotions.map((pr) => (
              <div key={pr._id} className="p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-900">{pr.name}</span>
                    <span className="ml-2 px-2 py-0.5 rounded bg-red-50 text-[#EF3E36] font-bold text-[10px]">
                      {pr.discountBadgeText}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditPromo(pr)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-[#0D63F3] hover:text-[#0D63F3]"
                      aria-label={`Edit promotion ${pr.name}`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => togglePromotion(pr)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                        pr.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {pr.active ? 'Active' : 'Paused'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletePromo(pr)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#EF3E36]"
                      aria-label={`Delete promotion ${pr.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Ends: {new Date(pr.endAt).toLocaleDateString()} · {pr.productIds?.length || 0} linked products
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create / Edit Coupon Modal */}
      <AdminDialog
        open={couponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        title={editingCouponId ? `Edit Coupon: ${couponForm.code}` : 'Create Marketplace Coupon'}
        subtitle="Define promo code rules, discount limits, minimum spend, and validity window."
        badge="Coupon"
        size="md"
        isSubmitting={savingCoupon}
        error={couponError}
        footer={
          <>
            <button
              type="button"
              onClick={() => setCouponModalOpen(false)}
              className="px-4 h-9 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="coupon-editor-form"
              disabled={savingCoupon}
              className="px-5 h-9 rounded-xl bg-[#0D63F3] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              {savingCoupon && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingCouponId ? 'Save Coupon' : 'Create Coupon'}</span>
            </button>
          </>
        }
      >
        <form id="coupon-editor-form" onSubmit={saveCoupon} className="space-y-3 text-xs">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  required
                  disabled={Boolean(editingCouponId)}
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="EID500"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white uppercase font-mono-num font-bold disabled:bg-slate-100"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Title *</label>
                <input
                  required
                  value={couponForm.title}
                  onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                  placeholder="Eid Shopping Voucher"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Discount Type</label>
                <select
                  value={couponForm.discountType}
                  onChange={(e) =>
                    setCouponForm({ ...couponForm, discountType: e.target.value as 'percentage' | 'fixed' })
                  }
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (৳)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Discount Value *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={couponForm.discountValue}
                  onChange={(e) => setCouponForm({ ...couponForm, discountValue: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono-num"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Min Order Amount (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={couponForm.minOrderAmount}
                  onChange={(e) => setCouponForm({ ...couponForm, minOrderAmount: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono-num"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Max Discount Cap (৳)</label>
                <input
                  type="number"
                  min={0}
                  value={couponForm.maxDiscountAmount}
                  onChange={(e) => setCouponForm({ ...couponForm, maxDiscountAmount: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono-num"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Usage Limit *</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={couponForm.usageLimit}
                  onChange={(e) => setCouponForm({ ...couponForm, usageLimit: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono-num"
                />
              </div>
              <div className="flex items-end">
                <label className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <span className="font-semibold text-slate-700">Active</span>
                  <input
                    type="checkbox"
                    checked={couponForm.active}
                    onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked })}
                    className="w-4 h-4 accent-[#0D63F3]"
                  />
                </label>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={couponForm.startAt}
                  onChange={(e) => setCouponForm({ ...couponForm, startAt: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={couponForm.endAt}
                  onChange={(e) => setCouponForm({ ...couponForm, endAt: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>
          </div>
        </form>
      </AdminDialog>

      {/* Create / Edit Promotion Modal */}
      <AdminDialog
        open={promoModalOpen}
        onClose={() => setPromoModalOpen(false)}
        title={editingPromoId ? `Edit Promotion: ${promoForm.name}` : 'Launch Promotion / Flash Sale'}
        subtitle="Schedule flash deals or seasonal campaigns and attach participating marketplace products."
        badge="Promotions"
        size="lg"
        isSubmitting={savingPromo}
        error={promoError}
        footer={
          <>
            <button
              type="button"
              onClick={() => setPromoModalOpen(false)}
              className="px-4 h-9 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="promo-editor-form"
              disabled={savingPromo}
              className="px-5 h-9 rounded-xl bg-[#0D63F3] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              {savingPromo && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingPromoId ? 'Save Promotion' : 'Launch Promotion'}</span>
            </button>
          </>
        }
      >
        <form id="promo-editor-form" onSubmit={savePromo} className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Name *</label>
                <input
                  required
                  value={promoForm.name}
                  onChange={(e) => setPromoForm({ ...promoForm, name: e.target.value })}
                  placeholder="e.g. Boishakh Flash"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Campaign Type</label>
                <select
                  value={promoForm.type}
                  onChange={(e) => setPromoForm({ ...promoForm, type: e.target.value as PromotionDoc['type'] })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold"
                >
                  <option value="flash_sale">Flash Sale</option>
                  <option value="seasonal_campaign">Seasonal Campaign</option>
                  <option value="category_campaign">Category Campaign</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Badge Text</label>
                <input
                  value={promoForm.discountBadgeText}
                  onChange={(e) => setPromoForm({ ...promoForm, discountBadgeText: e.target.value })}
                  placeholder="Up to 40% OFF"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={promoForm.startAt}
                  onChange={(e) => setPromoForm({ ...promoForm, startAt: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={promoForm.endAt}
                  onChange={(e) => setPromoForm({ ...promoForm, endAt: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div className="flex items-end">
                <label className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                  <span className="font-semibold text-slate-700">Campaign Active</span>
                  <input
                    type="checkbox"
                    checked={promoForm.active}
                    onChange={(e) => setPromoForm({ ...promoForm, active: e.target.checked })}
                    className="w-4 h-4 accent-[#0D63F3]"
                  />
                </label>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="font-bold text-slate-700">
                  Linked Products ({promoForm.productIds.length} selected)
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    value={prodQuery}
                    onChange={(e) => setProdQuery(e.target.value)}
                    placeholder="Filter products..."
                    className="h-8 pl-7 pr-2.5 rounded-lg border border-slate-300 text-xs w-48"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 bg-slate-50/40">
                {filteredProducts.map((p) => {
                  const checked = promoForm.productIds.includes(p._id);
                  return (
                    <label
                      key={p._id}
                      className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-blue-50/50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          setPromoForm((prev) => ({
                            ...prev,
                            productIds: e.target.checked
                              ? [...prev.productIds, p._id]
                              : prev.productIds.filter((id) => id !== p._id),
                          }));
                        }}
                        className="w-3.5 h-3.5 accent-[#0D63F3]"
                      />
                      <span className="font-medium text-slate-800 truncate">{p.title}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </form>
      </AdminDialog>

      <ConfirmDialog
        open={Boolean(deleteCoupon)}
        onClose={() => setDeleteCoupon(null)}
        onConfirm={confirmDeleteCoupon}
        title="Delete Coupon?"
        description={`Delete coupon ${deleteCoupon?.code || ''}? Redeemed coupons cannot be deleted and should be disabled instead.`}
        confirmLabel="Delete Coupon"
        loading={deleting}
      />

      <ConfirmDialog
        open={Boolean(deletePromo)}
        onClose={() => setDeletePromo(null)}
        onConfirm={confirmDeletePromo}
        title="Delete Promotion?"
        description={`Remove promotional event "${deletePromo?.name || ''}"?`}
        confirmLabel="Delete Promotion"
        loading={deleting}
      />
    </div>
  );
}
