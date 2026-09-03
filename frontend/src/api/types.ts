export interface AnalyzeRequest {
  source: 'extension' | 'dashboard' | 'history_audit'
  type: 'url' | 'text' | 'prompt' | 'image' | 'video' | 'anomaly' | 'email'
  tier?: 'tier1' | 'tier2' | 'tier3' | 'auto'
  content: string
}

// --- Response ---
export type ThreatLevel = 'Safe' | 'Suspicious' | 'High Risk'
export type ThreatType = 'phishing' | 'malicious_url' | 'prompt_injection' | 'deepfake' | 'behavior_anomaly' | 'benign'
export type SeverityLabel = 'Informational' | 'Warning' | 'Critical'

export interface ExternalFlags {
  safe_browsing?: string
  virustotal_positives?: number
  virustotal_total_engines?: number
  domain_age?: string
  phishstats_flagged?: boolean
  safeprompt_risk?: string
  hive_ai_result?: string
}

export interface AnalyzeResponse {
  id: string
  type: 'url' | 'text' | 'prompt' | 'image' | 'video' | 'anomaly' | 'email'
  source: 'extension' | 'dashboard' | 'history_audit'
  raw_input_snippet: string
  threat_type: ThreatType
  risk_score: number // 0-100
  threat_level: ThreatLevel
  confidence: number // 0.0-1.0
  indicators: string[]
  explanation: string
  key_points: string[]
  recommended_actions: string[]
  external_flags?: ExternalFlags
  severity_label: SeverityLabel
  advanced_analysis?: Record<string, any>
  created_at: string // ISO-8601
}

export interface ThreatListResponse {
  items: AnalyzeResponse[]
  total: number
}

export interface StatsResponse {
  total_threats: number
  by_type: Record<string, number>
  by_level: {
    Safe: number
    Suspicious: number
    'High Risk': number
  }
  last_24h: {
    timestamps: string[]
    counts: number[]
  }
}

export interface ChatRequest {
  prompt: string
  url_context?: string
}

export interface ChatResponse {
  response: string
}

export interface HealthResponse {
  status: string
  db: string
  agents: string
  version: string
  ml_remote?: boolean
  pipeline_mode?: 'gemini_only' | 'hybrid' | string
}

export interface CustomRuleCondition {
  field: string
  operator: string
  value: string
}

export interface CustomRuleAction {
  override_score: number | null
  override_level: string | null
  add_indicator: string | null
}

export interface CustomRule {
  id?: string
  name: string
  description?: string
  is_active: boolean
  condition: CustomRuleCondition
  action: CustomRuleAction
}

export interface BatchAnalyzeRequest {
  urls: string[]
  source?: 'extension' | 'dashboard' | 'history_audit'
}

export interface BatchAnalyzeItem {
  url: string
  threat_type: string
  risk_score: number
  threat_level: string
  indicators: string[]
  recommended_actions?: string[]
}

export interface EmailAnalyzeResponse {
  id: string
  type: 'email'
  source: string
  threat_type: string
  risk_score: number
  threat_level: string
  confidence: number
  indicators: string[]
  explanation: string
  key_points: string[]
  recommended_actions: string[]
  severity_label?: string
  email_analysis: {
    sender: string
    reply_to: string
    subject: string
    date: string
    auth: { spf: string; dkim: string; dmarc: string }
    urls: string[]
    total_urls: number
    attachments: { filename: string; content_type: string; size: number }[]
    flags: string[]
    body_preview: string
  }
  created_at: string
}

export interface GeoRegion {
  name: string
  lat: number
  lng: number
  count: number
  avg_risk: number
}

export interface TimelineAnalytics {
  timestamps: string[]
  counts: number[]
  by_level: { Safe: number; Suspicious: number; 'High Risk': number }[]
}
