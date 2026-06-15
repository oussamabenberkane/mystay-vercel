'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Images, Tag, Building2 } from 'lucide-react'
import type { AdBanner, FlashSale, ShowcaseHotel } from '@/lib/actions/admin-promos'
import { BannersSection } from './banners-section'
import { FlashSalesSection } from './flash-sales-section'
import { ShowcaseHotelsSection } from './showcase-hotels-section'

type Tab = 'banners' | 'sales' | 'hotels'

interface MarketingClientProps {
  initialBanners: AdBanner[]
  initialSales: FlashSale[]
  initialHotels: ShowcaseHotel[]
}

export function MarketingClient({
  initialBanners,
  initialSales,
  initialHotels,
}: MarketingClientProps) {
  const t = useTranslations('adminPromos')
  const [tab, setTab] = useState<Tab>('banners')

  const tabs: Array<{ value: Tab; label: string; icon: typeof Images }> = [
    { value: 'banners', label: t('tabs.banners'), icon: Images },
    { value: 'sales', label: t('tabs.flashSales'), icon: Tag },
    { value: 'hotels', label: t('tabs.showcaseHotels'), icon: Building2 },
  ]

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(({ value, label, icon: Icon }) => {
          const isActive = tab === value
          return (
            <button
              key={value}
              onClick={() => setTab(value)}
              className="flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all active:scale-[0.97]"
              style={
                isActive
                  ? { background: '#1B2D5B', color: '#F8F0E8' }
                  : { background: 'rgba(27,45,91,0.06)', color: '#7A8BA8' }
              }
            >
              <Icon className="size-4" style={{ color: isActive ? '#C9A84C' : '#7A8BA8' }} />
              {label}
            </button>
          )
        })}
      </div>

      {tab === 'banners' && <BannersSection initial={initialBanners} />}
      {tab === 'sales' && <FlashSalesSection initial={initialSales} />}
      {tab === 'hotels' && <ShowcaseHotelsSection initial={initialHotels} />}
    </div>
  )
}
