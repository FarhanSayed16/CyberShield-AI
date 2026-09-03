import apiClient from './client'
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  StatsResponse,
  ThreatListResponse,
  ChatRequest,
  ChatResponse,
  HealthResponse,
  CustomRule,
  BatchAnalyzeRequest,
  BatchAnalyzeItem,
  EmailAnalyzeResponse,
  GeoRegion,
  TimelineAnalytics,
} from './types'
import { mockPhishing, mockMaliciousUrl, mockPromptInjection, mockSafeUrl, mockThreatList, mockStats } from './mocks'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true' && !import.meta.env.PROD

const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export const analyzeThreat = async (req: AnalyzeRequest): Promise<AnalyzeResponse> => {
  if (USE_MOCKS) {
    await delay(1500)
    if (req.type === 'url' && req.content.includes('amaz0n')) return mockMaliciousUrl
    if (req.type === 'url') return mockSafeUrl
    if (req.type === 'prompt') return mockPromptInjection
    return mockPhishing
  }

  const { data } = await apiClient.post<AnalyzeResponse>('/api/analyze', req)
  return data
}

export const getThreats = async (
  page = 1,
  pageSize = 20,
  level?: string,
  type?: string
): Promise<ThreatListResponse> => {
  if (USE_MOCKS) {
    await delay(600)
    let filtered = [...mockThreatList.items]
    if (level && level !== 'All') filtered = filtered.filter(t => t.threat_level === level)
    if (type && type !== 'All') filtered = filtered.filter(t => t.threat_type === type)

    return {
      items: filtered,
      total: filtered.length,
    }
  }

  const { data } = await apiClient.get<ThreatListResponse>('/api/threats', {
    params: {
      page,
      page_size: pageSize,
      threat_level: level && level !== 'All' ? level : undefined,
      threat_type: type && type !== 'All' ? type : undefined,
    } as Record<string, string | number | undefined>
  })
  return data
}

export const getThreatById = async (id: string): Promise<AnalyzeResponse> => {
  if (USE_MOCKS) {
    await delay(400)
    const item = mockThreatList.items.find(t => t.id === id)
    if (item) return item
    throw new Error('Threat not found')
  }

  const { data } = await apiClient.get<AnalyzeResponse>(`/api/threats/${id}`)
  return data
}

export const getStats = async (): Promise<StatsResponse> => {
  if (USE_MOCKS) {
    await delay(800)
    return mockStats
  }

  const { data } = await apiClient.get<StatsResponse>('/api/stats')
  return data
}

export const sendChatMessage = async (req: ChatRequest): Promise<ChatResponse> => {
  if (USE_MOCKS) {
    await delay(1000)
    return { response: "I'm a mock AI assistant response." }
  }
  const { data } = await apiClient.post<ChatResponse>('/api/chat', req)
  return data
}

export const getHealth = async (): Promise<HealthResponse> => {
  const { data } = await apiClient.get<HealthResponse>('/api/health')
  return data
}

export const analyzeEmail = async (payload: AnalyzeRequest): Promise<EmailAnalyzeResponse> => {
  const { data } = await apiClient.post<EmailAnalyzeResponse>('/api/analyze/email', payload)
  return data
}

export const analyzeBatch = async (payload: BatchAnalyzeRequest): Promise<{ results: BatchAnalyzeItem[] }> => {
  const { data } = await apiClient.post<{ results: BatchAnalyzeItem[] }>('/api/analyze/batch', payload)
  return data
}

export const getRules = async (): Promise<CustomRule[]> => {
  const { data } = await apiClient.get<CustomRule[]>('/api/rules/')
  return data
}

export const createRule = async (rule: Omit<CustomRule, 'id'>): Promise<CustomRule> => {
  const { data } = await apiClient.post<CustomRule>('/api/rules/', rule)
  return data
}

export const deleteRule = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/rules/${id}`)
}

export const toggleRule = async (id: string, isActive: boolean): Promise<CustomRule> => {
  const { data } = await apiClient.patch<CustomRule>(`/api/rules/${id}/toggle`, null, {
    params: { is_active: isActive },
  })
  return data
}

export const getGeoAnalytics = async (): Promise<{ regions: GeoRegion[] }> => {
  const { data } = await apiClient.get<{ regions: GeoRegion[] }>('/api/analytics/geo')
  return data
}

export const getTimelineAnalytics = async (hours = 48): Promise<TimelineAnalytics> => {
  const { data } = await apiClient.get<TimelineAnalytics>('/api/analytics/timeline', {
    params: { hours },
  })
  return data
}

export const compareThreats = async (id1: string, id2: string): Promise<unknown> => {
  const { data } = await apiClient.get(`/api/threats/${id1}/compare/${id2}`)
  return data
}

export const generateThreatNarrative = async (id: string): Promise<unknown> => {
  const { data } = await apiClient.post(`/api/threats/${id}/narrative`)
  return data
}

export const generateReport = async (payload: unknown): Promise<unknown> => {
  const { data } = await apiClient.post('/api/report', payload)
  return data
}
