export interface AnalyzeRequest {
  source: 'extension' | 'dashboard'
  type: 'url' | 'text' | 'prompt' | 'image' | 'video' | 'anomaly'
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
  type: 'url' | 'text' | 'prompt' | 'image' | 'video'
  source: 'extension' | 'dashboard'
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
