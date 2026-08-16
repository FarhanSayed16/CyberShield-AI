import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { IconButton } from '@mui/material'
import LightModeIcon from '@mui/icons-material/LightMode'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import CloseIcon from '@mui/icons-material/Close'
import DownloadIcon from '@mui/icons-material/Download'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import LinkIcon from '@mui/icons-material/Link'
import PsychologyAltIcon from '@mui/icons-material/PsychologyAlt'
import ImageSearchIcon from '@mui/icons-material/ImageSearch'
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead'
import SpeedIcon from '@mui/icons-material/Speed'
import HubIcon from '@mui/icons-material/Hub'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import ExtensionIcon from '@mui/icons-material/Extension'
import MouseIcon from '@mui/icons-material/Mouse'
import LayersIcon from '@mui/icons-material/Layers'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import TravelExploreIcon from '@mui/icons-material/TravelExplore'
import HistoryIcon from '@mui/icons-material/History'
import RuleIcon from '@mui/icons-material/Rule'
import FolderZipIcon from '@mui/icons-material/FolderZip'
import TuneIcon from '@mui/icons-material/Tune'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import CodeIcon from '@mui/icons-material/Code'
import ScienceIcon from '@mui/icons-material/Science'
import AccountTreeIcon from '@mui/icons-material/AccountTree'
import GroupsIcon from '@mui/icons-material/Groups'
import { useUIStore } from '../stores/useUIStore'
import LandingHeroMock from '../features/landing/LandingHeroMock'
import CyberSentinelLogo from '../components/brand/CyberSentinelLogo'

const CAPABILITIES: {
  id: string
  title: string
  body: string
  detail: string
  icon: ReactNode
}[] = [
  {
    id: '01',
    title: 'Phishing and malicious URLs',
    body: 'CyberSentinel inspects links and page text for lookalike domains, urgency language, and credential-harvest patterns. You get a clear risk level plus the specific indicators that drove the decision—so you can act with confidence, not guesswork.',
    detail: 'Inputs: URL or text · Tiers 1–3',
    icon: <LinkIcon fontSize="small" />,
  },
  {
    id: '02',
    title: 'Prompt injection detection',
    body: 'Before a prompt reaches your LLM, the engine checks for jailbreaks, system-prompt leaks, and embedded payloads. Results name the injection type, highlight risky substrings, and suggest concrete mitigation steps.',
    detail: 'Input: prompt · Structured Gemini output',
    icon: <PsychologyAltIcon fontSize="small" />,
  },
  {
    id: '03',
    title: 'Synthetic media analysis',
    body: 'Upload an image to evaluate authenticity signals and visual artifacts. Findings feed the same risk model used elsewhere in the product, so deepfake checks stay consistent with URL and text scans.',
    detail: 'Input: image · Vision + explanation',
    icon: <ImageSearchIcon fontSize="small" />,
  },
  {
    id: '04',
    title: 'Email and message review',
    body: 'Paste a message body or use the email scan flow in the console. The analysis surfaces domain mismatch, suspicious phrases, and embedded links as readable indicators of compromise.',
    detail: 'Input: text · Explainable IOCs',
    icon: <MarkEmailReadIcon fontSize="small" />,
  },
]

const PIPELINE: {
  tier: string
  name: string
  desc: string
  icon: ReactNode
}[] = [
  {
    tier: 'Tier 1',
    name: 'Local triage',
    desc: 'Lightweight classifiers and heuristics score URLs and text in milliseconds. If remote models are offline, the system fails open instead of blocking the whole pipeline.',
    icon: <SpeedIcon fontSize="small" />,
  },
  {
    tier: 'Tier 2',
    name: 'Threat enrichment',
    desc: 'Optional intel sources—such as Safe Browsing and VirusTotal—are fused into a weighted score so external evidence reinforces (or softens) the local signal.',
    icon: <HubIcon fontSize="small" />,
  },
  {
    tier: 'Tier 3',
    name: 'Explainable decision',
    desc: 'Gemini returns structured JSON: a plain-language explanation, ranked indicators, and recommended actions an operator can follow immediately.',
    icon: <AutoAwesomeIcon fontSize="small" />,
  },
]

const EXTENSION_POINTS: { text: string; icon: ReactNode }[] = [
  { text: 'Right-click any selection or link to scan without leaving the page', icon: <MouseIcon fontSize="small" /> },
  { text: 'Quickball controls for manual scans with Tier 1, 2, or 3', icon: <LayersIcon fontSize="small" /> },
  { text: 'On-page overlay showing risk, explanation, and indicators', icon: <TravelExploreIcon fontSize="small" /> },
  { text: 'Security assistant chat with the current page URL as context', icon: <ChatBubbleOutlineIcon fontSize="small" /> },
]

const DEVELOPERS: {
  initials: string
  name: string
  role: string
  focus: string
  body: string
  icon: ReactNode
}[] = [
  {
    initials: 'FS',
    name: 'Farhan Sayed',
    role: 'Full-stack & extension',
    focus: 'Frontend · Backend · Chrome MV3',
    body: 'Leads product development across the operator console and FastAPI backend, and built the Manifest V3 extension—Quickball, Action Center, and the live scan flow that ties browsing to the same analyze API.',
    icon: <CodeIcon fontSize="small" />,
  },
  {
    initials: 'MS',
    name: 'Manas Sawant',
    role: 'AI/ML engine lead',
    focus: 'Detection pipeline · Gemini · Models',
    body: 'Owns the core AI and ML engine: multi-tier routing, risk fusion, and explainable Gemini outputs that turn raw scores into indicators, narratives, and remediation operators can act on.',
    icon: <ScienceIcon fontSize="small" />,
  },
  {
    initials: 'SS',
    name: 'Simran Singh',
    role: 'ML & backend architecture',
    focus: 'Research · Planning · Architecture',
    body: 'Shapes ML and backend architecture, research, and planning—from how services, schemas, and persistence fit together to the detection design that keeps the pipeline coherent and maintainable.',
    icon: <AccountTreeIcon fontSize="small" />,
  },
  {
    initials: 'VD',
    name: 'Viraj Dalvi',
    role: 'Co-developer',
    focus: 'Advancements · Integration',
    body: 'Drives overall advancements as co-developer—strengthening the platform across features, integration, and iteration so CyberSentinel stays sharp as the product grows.',
    icon: <GroupsIcon fontSize="small" />,
  },
]

const CONSOLE_POINTS: { title: string; desc: string; icon: ReactNode }[] = [
  {
    title: 'Live analysis',
    desc: 'Submit a URL, message, prompt, or image and review a structured result—score, level, indicators, and remediation—in one place.',
    icon: <TravelExploreIcon fontSize="small" />,
  },
  {
    title: 'Threat history',
    desc: 'Browse past events, filter by type or severity, and open a detail drawer when you need the full explanation trail.',
    icon: <HistoryIcon fontSize="small" />,
  },
  {
    title: 'Analytics and rules',
    desc: 'Track trends across scans and apply deterministic policies on top of model scores for consistent operator workflows.',
    icon: <RuleIcon fontSize="small" />,
  },
]

const ease = [0.22, 1, 0.36, 1] as const

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
}

export default function LandingPage() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { themeMode, toggleTheme } = useUIStore()
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = '/cybersentinel-extension.zip'
    link.download = 'cybersentinel-extension.zip'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setShowInstallModal(true)
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!showInstallModal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowInstallModal(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showInstallModal])

  return (
    <div className="landing-page min-h-screen bg-theme-bg text-theme-text flex flex-col overflow-x-hidden">
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300 ${
          scrolled ? 'bg-theme-bg/92 backdrop-blur-md border-b border-theme-border' : 'bg-transparent border-b border-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 md:h-[4.25rem] flex items-center justify-between gap-4">
          <a
            href="#"
            className="transition-opacity hover:opacity-85"
            onClick={(e) => {
              e.preventDefault()
              window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
            }}
          >
            <CyberSentinelLogo withWordmark size="md" variant="signal" />
          </a>

          <nav className="hidden md:flex items-center gap-8" aria-label="Primary">
            <a href="#capabilities" className="lp-nav-link text-sm font-medium text-theme-text-secondary">Capabilities</a>
            <a href="#pipeline" className="lp-nav-link text-sm font-medium text-theme-text-secondary">Pipeline</a>
            <a href="#extension" className="lp-nav-link text-sm font-medium text-theme-text-secondary">Extension</a>
            <a href="#console" className="lp-nav-link text-sm font-medium text-theme-text-secondary">Console</a>
            <a href="#team" className="lp-nav-link text-sm font-medium text-theme-text-secondary">Team</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <IconButton onClick={toggleTheme} aria-label="Toggle theme" size="small" sx={{ color: 'inherit', opacity: 0.75 }}>
              {themeMode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="lp-btn lp-btn-ghost hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold"
            >
              Open console
              <span className="lp-btn-arrow inline-flex">
                <ArrowForwardIcon sx={{ fontSize: 16 }} />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-24 md:pt-28 pb-16 md:pb-24 border-b border-theme-border overflow-hidden">
        <div className="lp-hero-grid absolute inset-0 pointer-events-none" aria-hidden />
        <div className="relative max-w-6xl mx-auto px-5 grid lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          <motion.div
            className="lg:col-span-5 space-y-7"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: reduceMotion ? 0 : 0.08 } },
            }}
          >
            <motion.div
              variants={fadeUp}
              transition={{ duration: 0.5, ease }}
              className="flex flex-col gap-5"
            >
              <CyberSentinelLogo size="xl" variant="signal" />
              <p className="font-display text-4xl sm:text-5xl md:text-[3.4rem] font-extrabold tracking-tight leading-[1.05] text-theme-text">
                CyberSentinel
              </p>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              transition={{ duration: 0.5, ease }}
              className="text-xl sm:text-2xl md:text-[1.75rem] font-semibold leading-snug text-theme-text max-w-md tracking-tight"
            >
              Explainable threat analysis for every page you open.
            </motion.h1>
            <motion.p
              variants={fadeUp}
              transition={{ duration: 0.5, ease }}
              className="lp-prose"
            >
              Detect phishing, malicious URLs, prompt injection, and synthetic media with a multi-tier engine.
              Every result includes the reasons behind the score and clear next steps—not a black-box alert.
            </motion.p>
            <motion.div variants={fadeUp} transition={{ duration: 0.5, ease }} className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={handleDownload}
                className="lp-btn lp-btn-primary inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold"
              >
                <DownloadIcon sx={{ fontSize: 18 }} />
                Install extension
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="lp-btn lp-btn-secondary inline-flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-semibold"
              >
                Open console
                <span className="lp-btn-arrow inline-flex">
                  <ArrowForwardIcon sx={{ fontSize: 16 }} />
                </span>
              </button>
            </motion.div>
          </motion.div>

          <motion.div
            className="lg:col-span-7"
            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: reduceMotion ? 0 : 0.12, ease }}
          >
            <LandingHeroMock />
          </motion.div>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="py-20 md:py-28 border-b border-theme-border scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div
            className="max-w-2xl mb-16"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease }}
          >
            <p className="lp-label mb-3">Capabilities</p>
            <h2 className="lp-section-title">
              Built for people who need to know why
            </h2>
            <p className="lp-prose mt-5">
              Whether you scan from the browser extension or the operator console, every channel returns the same contract:
              risk score, threat level, indicators, explanation, and recommended actions.
            </p>
          </motion.div>

          <div className="divide-y divide-theme-border border-y border-theme-border">
            {CAPABILITIES.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: reduceMotion ? 0 : idx * 0.05, duration: 0.4, ease }}
                className="lp-cap-row grid md:grid-cols-12 gap-5 md:gap-8 py-9 md:py-11 md:pl-4"
              >
                <div className="md:col-span-5 flex gap-4 items-start">
                  <div className="lp-icon-box" aria-hidden>
                    {item.icon}
                  </div>
                  <div>
                    <div className="flex items-baseline gap-3 mb-1.5">
                      <span className="lp-mono text-xs text-theme-text-secondary">{item.id}</span>
                    </div>
                    <h3 className="text-xl font-semibold text-theme-text tracking-tight leading-snug">
                      {item.title}
                    </h3>
                    <p className="lp-mono text-[11px] text-theme-text-secondary mt-2.5 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>
                <div className="md:col-span-7 md:pt-1">
                  <p className="lp-prose-wide">{item.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section id="pipeline" className="py-20 md:py-28 border-b border-theme-border bg-theme-surface/40 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div
            className="max-w-2xl mb-14"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease }}
          >
            <p className="lp-label mb-3">Detection pipeline</p>
            <h2 className="lp-section-title">Three tiers. One clear decision.</h2>
            <p className="lp-prose mt-5">
              Auto mode combines whatever signals are available. From the dashboard or Quickball, you can also run a single tier
              when you need a faster check or a deeper explanation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-0 border border-theme-border">
            {PIPELINE.map((step, idx) => (
              <motion.div
                key={step.tier}
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: reduceMotion ? 0 : idx * 0.08, duration: 0.4, ease }}
                className={`lp-pipe-cell p-7 md:p-8 bg-theme-card ${
                  idx < PIPELINE.length - 1 ? 'border-b md:border-b-0 md:border-r border-theme-border' : ''
                }`}
              >
                <div className="lp-icon-box mb-5" aria-hidden>
                  {step.icon}
                </div>
                <p className="lp-mono text-xs font-semibold lp-signal-text mb-2">{step.tier}</p>
                <h3 className="text-lg font-semibold text-theme-text mb-3 tracking-tight">{step.name}</h3>
                <p className="text-[0.975rem] leading-relaxed text-theme-text-secondary">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Extension */}
      <section id="extension" className="py-20 md:py-28 border-b border-theme-border scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-14 lg:gap-16 items-start">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease }}
          >
            <div className="lp-icon-box mb-5" aria-hidden>
              <ExtensionIcon fontSize="small" />
            </div>
            <p className="lp-label mb-3">Browser extension</p>
            <h2 className="lp-section-title mb-5">
              Protection where browsing happens
            </h2>
            <p className="lp-prose mb-9">
              The Chrome Manifest V3 extension connects to your CyberSentinel API with a configurable base URL and key.
              Alerts appear in an on-page overlay; the Quickball keeps scan and assistant controls one click away.
            </p>
            <ul className="space-y-4 mb-10">
              {EXTENSION_POINTS.map((item, i) => (
                <motion.li
                  key={item.text}
                  initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: reduceMotion ? 0 : i * 0.05, duration: 0.35, ease }}
                  className="flex gap-3.5 items-start group"
                >
                  <span className="lp-icon-box !w-9 !h-9 mt-0.5" aria-hidden>
                    {item.icon}
                  </span>
                  <span className="text-[0.975rem] leading-relaxed text-theme-text pt-1.5">{item.text}</span>
                </motion.li>
              ))}
            </ul>
            <button
              type="button"
              onClick={handleDownload}
              className="lp-btn lp-btn-primary inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold"
            >
              <DownloadIcon sx={{ fontSize: 18 }} />
              Download extension
            </button>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease }}
            className="border border-theme-border bg-theme-card p-7 md:p-9"
          >
            <p className="lp-label mb-6">Install in developer mode</p>
            <div className="space-y-1">
              {[
                {
                  n: '1',
                  t: 'Unzip the package',
                  d: 'Extract cybersentinel-extension.zip to a folder on your computer.',
                  icon: <FolderZipIcon fontSize="small" />,
                },
                {
                  n: '2',
                  t: 'Enable Developer mode',
                  d: 'Open chrome://extensions and turn on the Developer mode toggle.',
                  icon: <TuneIcon fontSize="small" />,
                },
                {
                  n: '3',
                  t: 'Load unpacked',
                  d: 'Click Load unpacked, select the folder, then set your API URL and key in the popup.',
                  icon: <Inventory2Icon fontSize="small" />,
                },
              ].map((s) => (
                <div key={s.n} className="lp-install-step flex gap-4 items-start">
                  <span className="lp-icon-box !w-9 !h-9" aria-hidden>
                    {s.icon}
                  </span>
                  <div className="pt-0.5">
                    <h3 className="font-semibold text-theme-text mb-1 flex items-center gap-2">
                      <span className="lp-mono text-xs lp-signal-text">{s.n}</span>
                      {s.t}
                    </h3>
                    <p className="text-[0.9375rem] leading-relaxed text-theme-text-secondary">{s.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Console */}
      <section id="console" className="py-20 md:py-28 border-b border-theme-border bg-theme-surface/40 scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <motion.div
              className="max-w-xl"
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease }}
            >
              <p className="lp-label mb-3">Operator console</p>
              <h2 className="lp-section-title">Same engine. Full history.</h2>
              <p className="lp-prose mt-5">
                The web console is your control plane for scans, audits, and policy.
                It uses the same analyze API as the extension, so results stay consistent across surfaces.
              </p>
            </motion.div>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="lp-btn lp-btn-ghost inline-flex items-center gap-2 self-start px-5 py-3.5 text-sm font-semibold"
            >
              Enter dashboard
              <span className="lp-btn-arrow inline-flex">
                <ArrowForwardIcon sx={{ fontSize: 16 }} />
              </span>
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-5 md:gap-6">
            {CONSOLE_POINTS.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: reduceMotion ? 0 : idx * 0.07, duration: 0.4, ease }}
                className="lp-console-card border border-theme-border bg-theme-card p-7"
              >
                <div className="lp-icon-box mb-5" aria-hidden>
                  {item.icon}
                </div>
                <h3 className="text-lg font-semibold text-theme-text mb-2.5 tracking-tight">{item.title}</h3>
                <p className="text-[0.975rem] leading-relaxed text-theme-text-secondary">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="py-20 md:py-28 border-b border-theme-border scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5">
          <motion.div
            className="max-w-2xl mb-14"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease }}
          >
            <p className="lp-label mb-3">Developers</p>
            <h2 className="lp-section-title">Built by the CyberSentinel team</h2>
            <p className="lp-prose mt-5">
              Four people designed, engineered, and advanced this platform—from the browser extension and operator console
              to the AI engine, backend architecture, and ongoing product direction.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
            {DEVELOPERS.map((person, idx) => (
              <motion.article
                key={person.initials}
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: reduceMotion ? 0 : idx * 0.07, duration: 0.4, ease }}
                className="lp-console-card border border-theme-border bg-theme-card p-7 flex flex-col"
              >
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="lp-icon-box !w-12 !h-12 lp-mono text-sm font-semibold"
                      aria-hidden
                    >
                      {person.initials}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-theme-text tracking-tight leading-snug">
                        {person.name}
                      </h3>
                      <p className="text-sm font-medium lp-signal-text mt-0.5">{person.role}</p>
                    </div>
                  </div>
                  <span className="lp-icon-box !w-9 !h-9 shrink-0" aria-hidden>
                    {person.icon}
                  </span>
                </div>
                <p className="lp-mono text-[11px] text-theme-text-secondary mb-3 leading-relaxed">
                  {person.focus}
                </p>
                <p className="text-[0.975rem] leading-relaxed text-theme-text-secondary flex-1">
                  {person.body}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="py-20 md:py-24 border-b border-theme-border">
        <motion.div
          className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row md:items-center md:justify-between gap-8"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, ease }}
        >
          <div className="max-w-xl">
            <h2 className="lp-section-title">
              Deploy locally or in the cloud
            </h2>
            <p className="lp-prose mt-4">
              Point the extension and dashboard at your FastAPI backend. Leave remote ML empty to run Gemini-only,
              or attach your own inference URL when you are ready.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="lp-btn lp-btn-primary inline-flex items-center justify-center px-5 py-3.5 text-sm font-semibold"
            >
              Install extension
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="lp-btn lp-btn-secondary inline-flex items-center justify-center px-5 py-3.5 text-sm font-semibold"
            >
              Open console
            </button>
          </div>
        </motion.div>
      </section>

      <footer className="py-12 bg-theme-bg">
        <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <CyberSentinelLogo withWordmark size="md" variant="signal" tagline="Explainable personal cyber defense" />
          </div>
          <div className="flex flex-wrap gap-6 text-sm font-medium text-theme-text-secondary">
            <a href="#capabilities" className="lp-nav-link">Capabilities</a>
            <a href="#pipeline" className="lp-nav-link">Pipeline</a>
            <a href="#extension" className="lp-nav-link">Extension</a>
            <a href="#console" className="lp-nav-link">Console</a>
            <a href="#team" className="lp-nav-link">Team</a>
          </div>
          <p className="text-sm text-theme-text-secondary">© 2026 CyberShield AI</p>
        </div>
      </footer>

      <AnimatePresence>
        {showInstallModal && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-theme-bg/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={() => setShowInstallModal(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="install-title"
              className="bg-theme-card border border-theme-border max-w-lg w-full shadow-2xl relative"
              initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.25, ease }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-3 right-3">
                <IconButton onClick={() => setShowInstallModal(false)} aria-label="Close" sx={{ color: 'inherit', opacity: 0.7 }}>
                  <CloseIcon />
                </IconButton>
              </div>

              <div className="p-8 md:p-9">
                <div className="lp-icon-box mb-6" aria-hidden>
                  <DownloadIcon fontSize="small" />
                </div>
                <h3 id="install-title" className="text-2xl font-display font-bold text-theme-text mb-2 tracking-tight">
                  Download started
                </h3>
                <p className="lp-prose-wide mb-8 text-[0.975rem]">
                  CyberSentinel ships as an unpacked Chrome extension. Follow these steps after the zip finishes downloading.
                </p>

                <div className="space-y-1">
                  {[
                    {
                      n: '1',
                      t: 'Unzip the file',
                      d: (
                        <>
                          Extract <code className="lp-mono text-xs bg-theme-surface border border-theme-border px-1.5 py-0.5">cybersentinel-extension.zip</code> to a folder on disk.
                        </>
                      ),
                      icon: <FolderZipIcon fontSize="small" />,
                    },
                    {
                      n: '2',
                      t: 'Enable Developer mode',
                      d: (
                        <>
                          Open <code className="lp-mono text-xs bg-theme-surface border border-theme-border px-1.5 py-0.5">chrome://extensions/</code> and enable Developer mode.
                        </>
                      ),
                      icon: <TuneIcon fontSize="small" />,
                    },
                    {
                      n: '3',
                      t: 'Load unpacked',
                      d: 'Click Load unpacked, select the extracted folder, then configure API URL and key in the popup.',
                      icon: <Inventory2Icon fontSize="small" />,
                    },
                  ].map((s) => (
                    <div key={s.n} className="lp-install-step flex gap-3.5 items-start">
                      <span className="lp-icon-box !w-9 !h-9" aria-hidden>
                        {s.icon}
                      </span>
                      <div className="pt-0.5">
                        <h4 className="font-semibold text-theme-text mb-1">
                          <span className="lp-mono text-xs lp-signal-text mr-2">{s.n}</span>
                          {s.t}
                        </h4>
                        <p className="text-[0.9375rem] leading-relaxed text-theme-text-secondary">{s.d}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-theme-border flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowInstallModal(false)}
                    className="lp-btn lp-btn-primary px-5 py-2.5 text-sm font-semibold"
                  >
                    Got it
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
