import { useState, useRef, useEffect } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { useLocation } from 'react-router-dom'
import { IconButton } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import SendIcon from '@mui/icons-material/Send'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import PersonIcon from '@mui/icons-material/Person'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen'
import MicIcon from '@mui/icons-material/Mic'
import MicOffIcon from '@mui/icons-material/MicOff'
import { useUIStore } from '../../stores/useUIStore'
import { sendChatMessage } from '../../api/endpoints'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const getContextChips = (pathname: string) => {
  if (pathname.includes('/threats')) {
    return ['Summarize recent threats', 'Explain SQL Injection', 'How to filter by High Risk?']
  }
  if (pathname.includes('/analytics')) {
    return ['What does the Risk Distribution mean?', 'Generate a weekly report', 'Why is phishing increasing?']
  }
  return ['What is prompt injection?', 'Analyze a suspicious URL', 'Are my systems safe?']
}

export default function AssistantWidget() {
  const { isAssistantExpanded, toggleAssistant } = useUIStore()
  const location = useLocation()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isPanelMode, setIsPanelMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Speech Recognition setup
  const recognitionRef = useRef<any>(null)
  useEffect(() => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInput(prev => prev + (prev ? ' ' : '') + transcript)
        setIsListening(false)
      }
      
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
      }
      
      recognition.onend = () => {
        setIsListening(false)
      }
      
      recognitionRef.current = recognition
    }
  }, [])
  
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
    } else {
      recognitionRef.current?.start()
      setIsListening(true)
    }
  }

  // Initialize context-aware greeting
  useEffect(() => {
    let greeting = 'Hi! I am the CyberSentinel AI Assistant. How can I help you secure your digital environment today?'
    if (location.pathname.includes('/threats')) {
      const params = new URLSearchParams(location.search)
      const id = params.get('id')
      if (id) greeting = `I see you are looking at Threat ID #${id}. Would you like a detailed breakdown of the attack vector?`
      else greeting = "You're viewing the Threat History. I can help you filter or understand specific threat types."
    } else if (location.pathname.includes('/analytics')) {
      greeting = "Welcome to Security Analytics. Want me to summarize these charts or highlight any concerning trends?"
    }
    setMessages([{ role: 'assistant', content: greeting }])
  }, [location.pathname, location.search])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isAssistantExpanded) scrollToBottom()
  }, [messages, isAssistantExpanded, isTyping])

  useHotkeys('meta+/, ctrl+/', (e) => {
    e.preventDefault()
    toggleAssistant()
  }, { enableOnFormTags: true })

  const handleSend = async (text: string = input) => {
    if (!text.trim()) return

    const userMsg = text.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsTyping(true)

    try {
      const res = await sendChatMessage({
        prompt: userMsg,
        url_context: window.location.href
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }])
    } catch (e: any) {
      console.error('Chat error:', e)
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't reach the AI engine to answer your question." }])
    } finally {
      setIsTyping(false)
    }
  }

  const chips = getContextChips(location.pathname)

  return (
    <div className={`tour-assistant-widget fixed z-50 transition-all duration-300 ${
      isPanelMode && isAssistantExpanded 
        ? 'top-0 right-0 h-screen w-full sm:w-[450px] border-l border-theme-border bg-theme-bg/95 backdrop-blur shadow-2xl p-0' 
        : 'bottom-6 right-6 flex flex-col items-end'
    }`}>
      
      {/* Chat Window */}
      {isAssistantExpanded && (
        <div className={`bg-theme-card border border-theme-border flex flex-col overflow-hidden animate-slide-in-up transition-all ${
          isPanelMode ? 'h-full w-full rounded-none' : 'w-[350px] sm:w-[400px] h-[550px] rounded-2xl shadow-2xl mb-4'
        }`}>
          {/* Header */}
          <div className="h-16 bg-gradient-to-r from-primary/20 to-transparent border-b border-theme-border flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                <SmartToyIcon fontSize="small" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-theme-primary">CyberSentinel AI</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" />
                  <span className="text-[10px] text-safe">Online & Context-Aware</span>
                </div>
              </div>
            </div>
            <div>
              <IconButton size="small" onClick={() => setIsPanelMode(!isPanelMode)} sx={{ color: '#94A3B8', mr: 0.5 }}>
                {isPanelMode ? <CloseFullscreenIcon fontSize="small" /> : <OpenInFullIcon fontSize="small" />}
              </IconButton>
              <IconButton size="small" onClick={toggleAssistant} sx={{ color: '#94A3B8' }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-theme-border text-theme-secondary' : 'bg-primary/20 text-primary'
                }`}>
                  {msg.role === 'user' ? <PersonIcon fontSize="small" /> : <SmartToyIcon fontSize="small" />}
                </div>
                <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${
                  msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-theme-bg border border-theme-border text-theme-secondary rounded-tl-none leading-relaxed'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <SmartToyIcon fontSize="small" />
                </div>
                <div className="bg-theme-bg border border-theme-border rounded-2xl rounded-tl-none p-3 px-4 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce bg-gray-500" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce bg-gray-500" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce bg-gray-500" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Chips */}
          {!isTyping && messages[messages.length - 1]?.role === 'assistant' && (
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar shrink-0">
              {chips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(chip)}
                  className="whitespace-nowrap text-[11px] font-medium px-3 py-1.5 rounded-full border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-theme-bg border-t border-theme-border shrink-0">
            <div className="flex items-center gap-2 bg-theme-card border border-theme-border rounded-full p-1 pl-4">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend(input)}
                placeholder={isListening ? "Listening..." : "Ask Sentinel AI (Ctrl + /)..."}
                className={`flex-1 bg-transparent text-sm focus:outline-none ${isListening ? 'text-safe placeholder:text-safe animate-pulse' : 'text-theme-primary placeholder:text-theme-secondary'}`}
              />
              
              {recognitionRef.current && (
                <IconButton 
                  size="small" 
                  onClick={toggleListening}
                  sx={{ color: isListening ? '#10B981' : '#94A3B8' }}
                >
                  {isListening ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />}
                </IconButton>
              )}
              <IconButton 
                size="small" 
                color="primary" 
                onClick={() => handleSend(input)}
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                sx={{ 
                  bgcolor: input.trim() ? 'primary.main' : 'transparent',
                  color: input.trim() ? '#fff' : 'inherit',
                  '&:hover': { bgcolor: 'primary.dark' }
                }}
              >
                <SendIcon fontSize="small" sx={{ ml: 0.5 }} />
              </IconButton>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button */}
      {!isAssistantExpanded && (
        <button
          onClick={toggleAssistant}
          aria-label="Open AI Assistant"
          className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-110 transition-transform animate-pulse-glow"
        >
          <SmartToyIcon sx={{ color: '#fff' }} />
        </button>
      )}
    </div>
  )
}
