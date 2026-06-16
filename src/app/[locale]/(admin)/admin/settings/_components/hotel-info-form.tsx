'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { upsertHotelInfoAction, type HotelInfoRow, type RestaurantHour } from '@/lib/actions/hotel-info'
import { Plus, Trash2, Save, Hotel } from 'lucide-react'

type FormState = {
  tagline: string
  phone: string
  email: string
  checkin_time: string
  checkout_time: string
  wifi_network: string
  wifi_password: string
  room_amenities: string
  hotel_services: string
  restaurant_hours: RestaurantHour[]
}

function toFormState(info: HotelInfoRow | null): FormState {
  return {
    tagline: info?.tagline ?? '',
    phone: info?.phone ?? '',
    email: info?.email ?? '',
    checkin_time: info?.checkin_time ?? '',
    checkout_time: info?.checkout_time ?? '',
    wifi_network: info?.wifi_network ?? '',
    wifi_password: info?.wifi_password ?? '',
    room_amenities: (info?.room_amenities ?? []).join(', '),
    hotel_services: (info?.hotel_services ?? []).join(', '),
    restaurant_hours: (info?.restaurant_hours as RestaurantHour[] | null) ?? [{ name: '', hours: '' }],
  }
}

export function HotelInfoForm({ initialData }: { initialData: HotelInfoRow | null }) {
  const t = useTranslations('adminSettings.info')
  const [form, setForm] = useState<FormState>(() => toFormState(initialData))
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  function set(field: keyof FormState, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function setRestaurant(index: number, field: 'name' | 'hours', value: string) {
    setForm(prev => {
      const next = [...prev.restaurant_hours]
      next[index] = { ...next[index], [field]: value }
      return { ...prev, restaurant_hours: next }
    })
  }

  function addRestaurant() {
    setForm(prev => ({
      ...prev,
      restaurant_hours: [...prev.restaurant_hours, { name: '', hours: '' }],
    }))
  }

  function removeRestaurant(index: number) {
    setForm(prev => ({
      ...prev,
      restaurant_hours: prev.restaurant_hours.filter((_, i) => i !== index),
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await upsertHotelInfoAction({
        tagline: form.tagline || null,
        phone: form.phone || null,
        email: form.email || null,
        checkin_time: form.checkin_time || null,
        checkout_time: form.checkout_time || null,
        wifi_network: form.wifi_network || null,
        wifi_password: form.wifi_password || null,
        room_amenities: form.room_amenities
          ? form.room_amenities.split(',').map(s => s.trim()).filter(Boolean)
          : null,
        hotel_services: form.hotel_services
          ? form.hotel_services.split(',').map(s => s.trim()).filter(Boolean)
          : null,
        restaurant_hours: form.restaurant_hours.filter(r => r.name || r.hours),
      })
      if (result.error) {
        setToast({ type: 'error', msg: result.error })
      } else {
        setToast({ type: 'success', msg: t('saved') })
      }
      setTimeout(() => setToast(null), 3500)
    })
  }

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all focus:ring-2`
  const inputStyle = {
    borderColor: 'rgba(27,45,91,0.15)',
    color: '#1B2D5B',
    background: '#FAFAFA',
  }

  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex size-10 items-center justify-center rounded-xl" style={{ background: 'rgba(27,45,91,0.06)' }}>
          <Hotel className="size-5" style={{ color: '#1B2D5B' }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#1B2D5B' }}>{t('title')}</p>
          <p className="text-xs" style={{ color: '#7A8BA8' }}>
            {t('subtitle')}
          </p>
        </div>
      </div>

      {toast && (
        <div
          className="mb-5 rounded-xl px-4 py-3 text-sm font-medium"
          style={{
            background: toast.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: toast.type === 'success' ? '#15803d' : '#dc2626',
            border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
          }}
        >
          {toast.msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* General */}
        <Section label={t('sectionGeneral')}>
          <Field label={t('tagline')}>
            <input
              className={inputCls}
              style={inputStyle}
              value={form.tagline}
              onChange={e => set('tagline', e.target.value)}
              placeholder={t('taglinePlaceholder')}
            />
          </Field>
        </Section>

        {/* Contact */}
        <Section label={t('sectionContact')}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('phone')}>
              <input
                className={inputCls}
                style={inputStyle}
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+213 34 000 000"
              />
            </Field>
            <Field label={t('email')}>
              <input
                className={inputCls}
                style={inputStyle}
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="contact@hotel.dz"
              />
            </Field>
          </div>
        </Section>

        {/* Horaires */}
        <Section label={t('sectionHours')}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('checkin')}>
              <input
                className={inputCls}
                style={inputStyle}
                value={form.checkin_time}
                onChange={e => set('checkin_time', e.target.value)}
                placeholder="14:00"
              />
            </Field>
            <Field label={t('checkout')}>
              <input
                className={inputCls}
                style={inputStyle}
                value={form.checkout_time}
                onChange={e => set('checkout_time', e.target.value)}
                placeholder="12:00"
              />
            </Field>
          </div>
        </Section>

        {/* Wi-Fi */}
        <Section label={t('sectionWifi')}>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('wifiNetwork')}>
              <input
                className={inputCls}
                style={inputStyle}
                value={form.wifi_network}
                onChange={e => set('wifi_network', e.target.value)}
                placeholder="HOTEL_GUEST"
              />
            </Field>
            <Field label={t('wifiPassword')}>
              <input
                className={inputCls}
                style={inputStyle}
                value={form.wifi_password}
                onChange={e => set('wifi_password', e.target.value)}
                placeholder={t('wifiPasswordPlaceholder')}
              />
            </Field>
          </div>
        </Section>

        {/* Restaurants */}
        <Section label={t('sectionRestaurants')}>
          <div className="space-y-2">
            {form.restaurant_hours.map((r, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  className={`${inputCls} flex-1`}
                  style={inputStyle}
                  value={r.name}
                  onChange={e => setRestaurant(i, 'name', e.target.value)}
                  placeholder={t('restaurantNamePlaceholder')}
                />
                <input
                  className={`${inputCls} flex-1`}
                  style={inputStyle}
                  value={r.hours}
                  onChange={e => setRestaurant(i, 'hours', e.target.value)}
                  placeholder={t('restaurantHoursPlaceholder')}
                />
                <button
                  type="button"
                  onClick={() => removeRestaurant(i)}
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-red-50"
                >
                  <Trash2 className="size-4" style={{ color: '#dc2626' }} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRestaurant}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors hover:opacity-80"
              style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C' }}
            >
              <Plus className="size-3.5" />
              {t('addRestaurant')}
            </button>
          </div>
        </Section>

        {/* Équipements chambre */}
        <Section label={t('sectionAmenities')}>
          <Field label="">
            <textarea
              className={`${inputCls} resize-none`}
              style={{ ...inputStyle, minHeight: '80px' }}
              value={form.room_amenities}
              onChange={e => set('room_amenities', e.target.value)}
              placeholder={t('amenitiesPlaceholder')}
              rows={3}
            />
          </Field>
        </Section>

        {/* Services */}
        <Section label={t('sectionServices')}>
          <Field label="">
            <textarea
              className={`${inputCls} resize-none`}
              style={{ ...inputStyle, minHeight: '80px' }}
              value={form.hotel_services}
              onChange={e => set('hotel_services', e.target.value)}
              placeholder={t('servicesPlaceholder')}
              rows={3}
            />
          </Field>
        </Section>

        <button
          type="submit"
          disabled={isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          style={{ background: '#1B2D5B', color: '#F8F0E8' }}
        >
          <Save className="size-4" style={{ color: '#C9A84C' }} />
          {isPending ? t('saving') : t('submit')}
        </button>
      </form>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: '#C9A84C' }}>
        {label}
      </p>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-xs font-medium" style={{ color: '#7A8BA8' }}>
          {label}
        </p>
      )}
      {children}
    </div>
  )
}
