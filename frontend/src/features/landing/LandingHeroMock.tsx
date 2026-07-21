import { motion, useReducedMotion } from 'framer-motion'

const INDICATORS = ['brand_impersonation', 'homoglyph_domain', 'credential_harvest'] as const

/** Product console mock used as the hero visual anchor */
export default function LandingHeroMock() {
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative w-full max-w-xl lg:max-w-none ml-auto">
      <div className="absolute -inset-px rounded-sm bg-gradient-to-b from-theme-border to-transparent opacity-80 pointer-events-none" />
      <div className="lp-hero-panel relative border border-theme-border bg-theme-card overflow-hidden shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] dark:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-theme-border bg-theme-surface/80">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-theme-border transition-colors duration-200 hover:bg-red-400" />
            <span className="w-2 h-2 rounded-full bg-theme-border transition-colors duration-200 hover:bg-amber-400" />
            <span className="w-2 h-2 rounded-full bg-theme-border transition-colors duration-200 hover:bg-emerald-400" />
          </div>
          <span className="lp-mono text-[11px] text-theme-text-secondary">analyze · url · tier3</span>
          <span className="lp-mono text-[11px] lp-signal-text flex items-center">
            <span className="lp-live-dot" aria-hidden />
            LIVE
          </span>
        </div>

        <div className="relative p-5 md:p-6 space-y-5">
          {!reduceMotion && (
            <div className="lp-scanline absolute left-0 right-0 h-px bg-signal-bright/60 pointer-events-none" />
          )}

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="lp-label mb-1">Target</p>
              <p className="lp-mono text-sm text-theme-text break-all">
                https://paypa1-secure-login.net/verify
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="lp-label mb-1">Level</p>
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">High Risk</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <span className="lp-label">Risk score</span>
              <span className="lp-mono text-sm font-medium text-theme-text">87 / 100</span>
            </div>
            <div className="h-1.5 bg-theme-surface border border-theme-border overflow-hidden">
              <div className={`h-full w-[87%] bg-red-600 dark:bg-red-500 ${reduceMotion ? '' : 'lp-score-fill'}`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="border border-theme-border p-3 bg-theme-bg/40 transition-colors duration-200 hover:bg-theme-bg/70">
              <p className="lp-label mb-2">Indicators</p>
              <ul className="space-y-1.5 text-sm text-theme-text">
                {INDICATORS.map((ind, i) => (
                  <motion.li
                    key={ind}
                    className="lp-mono text-xs"
                    initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.08, duration: 0.3 }}
                  >
                    {ind}
                  </motion.li>
                ))}
              </ul>
            </div>
            <div className="border border-theme-border p-3 bg-theme-bg/40 transition-colors duration-200 hover:bg-theme-bg/70">
              <p className="lp-label mb-2">Pipeline</p>
              <ul className="space-y-1.5 text-sm text-theme-text-secondary">
                {[
                  { k: 'T1 lexical', v: 'flag', accent: true },
                  { k: 'T2 intel', v: 'enrich', accent: false },
                  { k: 'T3 gemini', v: 'explain', accent: false },
                ].map((row, i) => (
                  <motion.li
                    key={row.k}
                    className="flex justify-between gap-2"
                    initial={reduceMotion ? false : { opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.3 }}
                  >
                    <span className="lp-mono text-xs">{row.k}</span>
                    <span className={`lp-mono text-xs ${row.accent ? 'lp-signal-text' : ''}`}>{row.v}</span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-theme-border pt-4">
            <p className="lp-label mb-2">Explanation</p>
            <p className="text-sm leading-relaxed text-theme-text-secondary">
              Domain mimics PayPal with a substituted character and requests credentials on a newly observed host.
              Do not enter passwords. Close the tab and report the URL.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {['severity · critical', 'source · extension', 'actions · 3'].map((tag, i) => (
              <span
                key={tag}
                className={`lp-mono text-[10px] px-2 py-1 border transition-colors duration-200 ${
                  i === 2
                    ? 'lp-signal-border lp-signal-text hover:bg-signal/10'
                    : 'border-theme-border text-theme-text-secondary hover:border-theme-text-secondary/50'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduceMotion ? 0 : 0.55, duration: 0.45 }}
        className="group/qb mt-3 border border-theme-border bg-theme-surface px-4 py-3 flex items-center justify-between gap-3 transition-colors duration-200 hover:border-signal/40"
      >
        <div>
          <p className="lp-label">Extension Quickball</p>
          <p className="text-sm text-theme-text">Page context attached · assistant ready</p>
        </div>
        <div className="lp-quickball w-9 h-9 rounded-sm flex items-center justify-center shrink-0 overflow-hidden">
          <img src="/logo.png" alt="" className="w-full h-full object-contain" draggable={false} />
        </div>
      </motion.div>
    </div>
  )
}
