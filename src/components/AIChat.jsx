import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './AIChat.css'
import { getChatResponseWithAgents } from '../services/geminiApi'
import { conversationMemory } from '../utils/conversationMemory'

const AIChat = ({ 
  onClose, 
  language, 
  searchResults, 
  currentLocation = null, 
  mapCenter = null, 
  savedPlaces = [], 
  radius, 
  minRating,
  onSearch = null, // 검색 실행을 위한 콜백 함수
  onRouteUpdate = null // 경로 업데이트 콜백 함수
}) => {
  const { t } = useTranslation()
  
  // 컴포넌트 마운트 시 저장된 대화 기록 로드
  const [messages, setMessages] = useState(() => conversationMemory.load())
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // 메시지가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    if (messages.length > 0) {
      conversationMemory.save(messages)
    }
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      const userMessage = inputValue.trim()
      setInputValue('')
      setIsLoading(true)

      // 사용자 메시지 추가
      const newMessages = [...messages, { text: userMessage, sender: 'user' }]
      setMessages(newMessages)

      try {
        // AI 응답 가져오기 (역할 기반 시스템 사용)
        // Planner는 실제 현재 위치만 사용 (mapCenter 사용 안 함)
        // 따라서 currentLocation만 전달 (mapCenter는 전달하지 않음)
        const result = await getChatResponseWithAgents(
          userMessage, 
          newMessages, 
          searchResults, 
          language,
          currentLocation, // 실제 현재 위치만 전달 (mapCenter 사용 안 함)
          savedPlaces,
          radius,
          minRating,
          onSearch, // 검색 콜백 전달 (Sidebar.jsx에서 설정된 값들이 전달됨)
          mapCenter // 지도 중심 위치 전달
        )
        
        // Search Agent가 검색 쿼리를 반환한 경우 검색 실행
        if (result.searchQuery && onSearch) {
          console.log('[AIChat] Search Agent 검색 쿼리 실행:', result.searchQuery)
          // 검색 실행 (비동기)
          onSearch(result.searchQuery).catch(err => {
            console.error('검색 실행 오류:', err)
          })
        }
        
        // 경로 데이터가 있으면 상위 컴포넌트로 전달
        if (result.routePaths && result.routePaths.length > 0 && onRouteUpdate) {
          console.log('[AIChat] 경로 데이터 전달:', result.routePaths)
          onRouteUpdate(result.routePaths)
        } else if (onRouteUpdate) {
          // 경로 데이터가 없으면 빈 배열로 초기화 (기존 경로 제거)
          onRouteUpdate([])
        }
        
        // AI 응답 추가 (역할 정보는 포함하지 않음)
        setMessages([...newMessages, { text: result.response, sender: 'assistant' }])
      } catch (error) {
        console.error('채팅 오류:', error)
        setMessages([...newMessages, { 
          text: t('chat.error'), 
          sender: 'assistant' 
        }])
      } finally {
        setIsLoading(false)
      }
    }
  }

  // 대화 기록 초기화
  const handleClearHistory = () => {
    if (window.confirm(t('chat.clearConfirm'))) {
      conversationMemory.clear()
      setMessages([])
    }
  }

  // 마크다운 텍스트를 포맷팅하여 표시하는 함수
  const formatMessage = (text) => {
    if (!text) return ''
    
    // 줄바꿈을 기준으로 분리
    const lines = text.split('\n')
    const elements = []
    let consecutiveEmptyLines = 0 // 연속된 빈 줄 추적
    let prevElementType = null // 이전 요소 타입 추적
    
    lines.forEach((line, index) => {
      // 빈 줄 처리 - 연속된 빈 줄을 최대 1개로 제한
      if (line.trim() === '') {
        // 헤더나 수평선 앞의 빈 줄은 무시 (마진으로 처리)
        if (index + 1 < lines.length) {
          const nextLine = lines[index + 1].trim()
          const isNextHeader = /^#{1,3}\s/.test(nextLine)
          const isNextHorizontalRule = /^[-*_]{3,}$/.test(nextLine)
          if (isNextHeader || isNextHorizontalRule) {
            consecutiveEmptyLines = 0
            return // 헤더/수평선 앞의 빈 줄 무시
          }
        }
        // 연속된 빈 줄은 최대 1개만 추가
        if (consecutiveEmptyLines === 0) {
          elements.push(<br key={`br-${index}`} />)
          consecutiveEmptyLines++
          prevElementType = 'br'
        }
        return
      }
      
      consecutiveEmptyLines = 0 // 빈 줄이 아니면 카운터 리셋
      
      // 마크다운 수평선 처리 (---, ***, ___)
      const horizontalRuleMatch = line.match(/^[-*_]{3,}$/)
      if (horizontalRuleMatch) {
        elements.push(<hr key={`hr-${index}`} className="chat-horizontal-rule" />)
        prevElementType = 'hr'
        return
      }
      
      // 마크다운 헤더 처리 (####, ###, ##, #)
      const headerMatch = line.match(/^(#{1,4})\s(.+)$/)
      if (headerMatch) {
        const headerLevel = headerMatch[1].length // 1, 2, 3, or 4
        const content = headerMatch[2]
        const headerClass = `chat-header-${headerLevel}`
        // 이전 요소가 br인 경우 제거 (빈 줄 처리 최적화)
        if (prevElementType === 'br' && elements.length > 0) {
          const lastElement = elements[elements.length - 1]
          if (lastElement && lastElement.type === 'br') {
            elements.pop()
          }
        }
        elements.push(
          <div 
            key={`header-${index}`} 
            className={`chat-header ${headerClass}`}
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }}
          />
        )
        prevElementType = 'header'
        return
      }
      
      // 숫자 리스트 (1. 2. 3. 등)
      const numberListMatch = line.match(/^(\d+)\.\s(.+)$/)
      if (numberListMatch) {
        const number = numberListMatch[1]
        const content = numberListMatch[2]
        elements.push(
          <div key={`num-${index}`} className="chat-list-item chat-list-numbered">
            <span className="chat-list-number">{number}.</span>
            <span className="chat-list-content" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
          </div>
        )
        return
      }
      
      // 하위 항목 (- 또는 * 로 시작)
      const bulletMatch = line.match(/^[\s]*[-*•]\s(.+)$/)
      if (bulletMatch) {
        const content = bulletMatch[1]
        elements.push(
          <div key={`bullet-${index}`} className="chat-list-item chat-list-bulleted">
            <span className="chat-list-bullet">•</span>
            <span className="chat-list-content" dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(content) }} />
          </div>
        )
        return
      }
      
      // 일반 텍스트
      elements.push(
        <div 
          key={`line-${index}`} 
          className="chat-line"
          dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
        />
      )
    })
    
    return elements
  }

  // 인라인 마크다운 포맷팅 (bold, italic 등)
  const formatInlineMarkdown = (text) => {
    if (!text) return ''
    
    let formatted = text
    
    // **bold** 처리 (먼저 처리해야 함)
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    
    // *italic* 처리 (bold가 아닌 단일 *만)
    formatted = formatted.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '<em>$1</em>')
    
    return formatted
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h3 className="chat-title">{t.title}</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {messages.length > 0 && (
            <button 
              className="chat-clear-button" 
              onClick={handleClearHistory} 
              title={t.clear}
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#5f6368',
                borderRadius: '50%',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f1f3f4'
                e.target.style.color = '#202124'
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent'
                e.target.style.color = '#5f6368'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          <button className="chat-close-button" onClick={onClose} title={t.close}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p style={{ whiteSpace: 'pre-line', textAlign: 'center' }}>{t('chat.welcome')}</p>
            {searchResults && searchResults.length > 0 && (
              <p className="chat-hint">{t('chat.hint', { count: searchResults.length })}</p>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div key={index} className={`chat-message ${msg.sender}`}>
                <div className="message-bubble">
                  {msg.sender === 'assistant' ? formatMessage(msg.text) : msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="chat-message assistant">
                <div className="message-bubble loading">
                  <span className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <input
          type="text"
          className="chat-input"
          placeholder={t.placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <button type="submit" className="chat-send-button" disabled={!inputValue.trim() || isLoading}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </form>
    </div>
  )
}

export default AIChat
