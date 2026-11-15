import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Calendar, ChevronDown, ChevronUp, Link2, Loader2, Sparkles } from 'lucide-react';
import { AdminDialog, FormSection } from './AdminDialog';
import { SingleMediaUploader } from './MediaUploader';
import { BannerRecord } from '../../../shared/bannerStyle';
import { apiRequest } from '../../lib/api';
import { pushToast } from '../../store/uiSlice';

interface HeroSlideModalProps {
  open: boolean;
  onClose: () => void;
  slide: BannerRecord | null;
  nextOrder?: number;
  onSaved: () => void;
}

export function HeroSlideModal({ open, onClose, slide, nextOrder = 1, onSaved }: HeroSlideModalProps) {
  const dispatch = useDispatch();
  const isEdit = Boolean(slide?._id);

  const [imageUrl, setImageUrl] = useState('');
  const [mobileImageUrl, setMobileImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [active, setActive] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [highlightText, setHighlightText] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setDirty(false);
    if (slide) {
      setImageUrl(slide.imageUrl || '');
      setMobileImageUrl(slide.mobileImageUrl || '');
      setLinkUrl(slide.linkUrl || '');
      setDisplayOrder(slide.displayOrder ?? 1);
      setActive(slide.active ?? true);
      setStartDate(slide.startDate ? String(slide.startDate).slice(0, 10) : '');
      setEndDate(slide.endDate ? String(slide.endDate).slice(0, 10) : '');
      setTitle(slide.title || '');
      setSubtitle(slide.subtitle || '');
      setHighlightText(slide.highlightText || '');
      setCtaText(slide.ctaText || '');
      setShowAdvanced(Boolean(slide.title || slide.subtitle || slide.ctaText));
    } else {
      setImageUrl('');
      setMobileImageUrl('');
      setLinkUrl('');
      setDisplayOrder(nextOrder);
      setActive(true);
      setStartDate('');
      setEndDate('');
      setTitle('');
      setSubtitle('');
      setHighlightText('');
      setCtaText('');
      setShowAdvanced(false);
    }
  }, [open, slide, nextOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setError('Please upload a hero slide image.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        position: 'hero_slide' as const,
        imageUrl: imageUrl.trim(),
        mobileImageUrl: mobileImageUrl.trim(),
        linkUrl: linkUrl.trim(),
        displayOrder: Number(displayOrder) || 0,
        active,
        gradientTheme: slide?.gradientTheme || 'sky',
        title: title.trim(),
        subtitle: subtitle.trim(),
        highlightText: highlightText.trim(),
        ctaText: ctaText.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      if (isEdit && slide?._id) {
        await apiRequest(`/api/admin/banners/${slide._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        dispatch(pushToast({ type: 'success', title: 'Hero slide updated' }));
      } else {
        await apiRequest('/api/admin/banners', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        dispatch(pushToast({ type: 'success', title: 'Hero slide published' }));
      }
      setDirty(false);
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save hero slide');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Hero Slide' : 'Add Hero Slide'}
      subtitle="Upload a crisp full-bleed hero artwork. Destination link is optional."
      badge="Hero Carousel"
      size="lg"
      isDirty={dirty}
      isSubmitting={saving}
      error={error}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 h-9 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="hero-slide-form"
            disabled={saving}
            className="px-5 h-9 rounded-xl bg-[#0D63F3] hover:bg-[#0A52CC] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-sm disabled:opacity-60"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isEdit ? 'Save Hero Slide' : 'Publish Hero Slide'}</span>
          </button>
        </>
      }
    >
      <form id="hero-slide-form" onSubmit={handleSubmit} className="space-y-4">
        <FormSection
          title="Slide Creative"
          description="Displayed edge-to-edge on the homepage hero carousel without unwanted text overlays."
        >
          <SingleMediaUploader
            folder="banners"
            label="Hero Slide Image"
            required
            allowRemove={false}
            aspectClass="h-52 sm:h-60"
            helperText="Recommended 1200×420px (~3:1 landscape) · JPG, PNG, WebP, or AVIF up to 5MB"
            value={imageUrl}
            onChange={(url) => {
              setImageUrl(url);
              setDirty(true);
            }}
          />
        </FormSection>

        <FormSection title="Link, Ordering & Schedule">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            <div className="sm:col-span-7">
              <label className="block font-bold text-slate-700 mb-1">
                Destination Link <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="/category/electronics or leave blank for non-clickable"
                  className="w-full h-10 pl-8 pr-3 rounded-xl border border-slate-300 bg-white text-xs focus:border-[#0D63F3] outline-none"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Sort Order</label>
              <input
                type="number"
                min={0}
                max={1000}
                value={displayOrder}
                onChange={(e) => {
                  setDisplayOrder(Number(e.target.value));
                  setDirty(true);
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs tabular-nums focus:border-[#0D63F3] outline-none"
              />
            </div>

            <div className="sm:col-span-3 flex items-end pb-1">
              <label className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between cursor-pointer">
                <span className="font-bold text-slate-700">Active</span>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => {
                    setActive(e.target.checked);
                    setDirty(true);
                  }}
                  className="w-4 h-4 accent-[#0D63F3]"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Start Date (Optional)
                </span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDirty(true);
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> End Date (Optional)
                </span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDirty(true);
                }}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs"
              />
            </div>
          </div>
        </FormSection>

        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full px-5 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0D63F3]" />
              Optional Mobile Crop &amp; Text Overlay
            </span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdvanced && (
            <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 text-xs">
              <SingleMediaUploader
                folder="banners"
                label="Mobile Override Image (Optional)"
                aspectClass="h-32"
                helperText="Shown on small screens if uploaded; otherwise desktop slide scales responsively."
                value={mobileImageUrl}
                onChange={(url) => {
                  setMobileImageUrl(url);
                  setDirty(true);
                }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Optional Overlay Headline</label>
                  <input
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="Leave blank for pure artwork slide"
                    className="w-full h-9 px-3 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Highlight / Promo Line</label>
                  <input
                    value={highlightText}
                    onChange={(e) => {
                      setHighlightText(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="e.g. Up to 45% OFF"
                    className="w-full h-9 px-3 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtitle</label>
                  <input
                    value={subtitle}
                    onChange={(e) => {
                      setSubtitle(e.target.value);
                      setDirty(true);
                    }}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CTA Button Label</label>
                  <input
                    value={ctaText}
                    onChange={(e) => {
                      setCtaText(e.target.value);
                      setDirty(true);
                    }}
                    placeholder="e.g. Shop Now"
                    className="w-full h-9 px-3 rounded-xl border border-slate-300"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </form>
    </AdminDialog>
  );
}
