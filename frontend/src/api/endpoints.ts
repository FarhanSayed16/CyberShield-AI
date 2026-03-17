import apiClient from './client'
import type { AnalyzeRequest, AnalyzeResponse, StatsResponse, ThreatListResponse, ChatRequest, ChatResponse } from './types'
import { mockPhishing, mockMaliciousUrl, mockPromptInjection, mockSafeUrl, mockThreatList, mockStats } from './mocks'

const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true' && !import.meta.env.PROD

// Helper to simulate network delay for mocks
const delay = (ms: number) => new Promise(res => setTimeout(res, ms))

export const analyzeThreat = async (req: AnalyzeRequest): Promise<AnalyzeResponse> => {
  if (USE_MOCKS) {
    await delay(1500) // Simulate processing time
    
    // Simple routing based on request content to return relevant mocks
    if (req.type === 'url' && req.content.includes('amaz0n')) return mockMaliciousUrl
    if (req.type === 'url') return mockSafeUrl
    if (req.type === 'prompt') return mockPromptInjection
    return mockPhishing // Default to phishing for text
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
