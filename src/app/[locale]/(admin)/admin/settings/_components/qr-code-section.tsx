'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { useTranslations } from 'next-intl'
import { Download, QrCode } from 'lucide-react'

export function QRCodeSection({ appUrl }: { appUrl: string }) {
  const t = useTranslations('adminSettings.qr')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [generated, setGenerated] = useState(false)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, appUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#1B2D5B', light: '#FFFFFF' },
    }).then(() => setGenerated(true))
  }, [appUrl])

  function handleDownload() {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = 'my-stay-qr.png'
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  return (
    <div className="rounded-2xl bg-white p-6" style={{ boxShadow: '0 2px 16px rgba(27,45,91,0.08)' }}>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex size-10 items-center justify-center rounded-xl" style={{ background: 'rgba(27,45,91,0.06)' }}>
          <QrCode className="size-5" style={{ color: '#1B2D5B' }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: '#1B2D5B' }}>{t('title')}</p>
          <p className="text-xs" style={{ color: '#7A8BA8' }}>
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        {/* QR canvas */}
        <div
          className="rounded-2xl p-4 flex items-center justify-center"
          style={{ background: '#F8F0E8', border: '1.5px solid rgba(201,168,76,0.2)' }}
        >
          <canvas ref={canvasRef} />
        </div>

        {/* Hotel label below QR */}
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em]" style={{ color: '#C9A84C' }}>
            My Stay
          </p>
          <p className="text-[11px] mt-1" style={{ color: '#7A8BA8' }}>
            {t('scanHint')}
          </p>
          <p className="text-[10px] mt-0.5 font-mono" style={{ color: '#7A8BA8', opacity: 0.7 }}>
            {appUrl}
          </p>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          disabled={!generated}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
          style={{ background: '#1B2D5B', color: '#F8F0E8' }}
        >
          <Download className="size-4" style={{ color: '#C9A84C' }} />
          {t('download')}
        </button>
      </div>
    </div>
  )
}
