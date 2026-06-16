'use client'

import { useEffect } from 'react'

/**
 * Keeps `<html lang/dir>` in sync with the active locale across the WHOLE app.
 *
 * The un-localized root layout (src/app/layout.tsx) renders `<html>` with no
 * lang/dir because it has no access to the `[locale]` segment, so this client
 * component — rendered once in the locale layout — is the single place that
 * sets them on the real document element. Arabic ('ar') drives RTL. This makes
 * `document.documentElement.dir === 'rtl'` / `lang === 'ar'` true on every
 * authenticated (and public) page, not just where a wrapper div sets `dir`.
 */
export function HtmlLangDir({ locale }: { locale: string }) {
  useEffect(() => {
    const el = document.documentElement
    el.lang = locale
    el.dir = locale === 'ar' ? 'rtl' : 'ltr'
  }, [locale])

  return null
}
