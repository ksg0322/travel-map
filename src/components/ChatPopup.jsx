import { useState, useRef, useEffect } from 'react'
import './ChatPopup.css'
import { getChatResponse } from '../services/geminiApi'

const ChatPopup = ({ onClose, language }) => {
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
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
        // AI 응답 가져오기
        const aiResponse = await getChatResponse(userMessage, messages, language)
        
        // AI 응답 추가
        setMessages([...newMessages, { text: aiResponse, sender: 'assistant' }])
      } catch (error) {
        console.error('채팅 오류:', error)
        setMessages([...newMessages, { 
          text: '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 
          sender: 'assistant' 
        }])
      } finally {
        setIsLoading(false)
      }
    }
  }

  const texts = {
    ko: {
      title: 'AI 채팅',
      placeholder: '메시지를 입력하세요...',
      close: '닫기'
    },
    en: {
      title: 'AI Chat',
      placeholder: 'Type a message...',
      close: 'Close'
    },
    ja: {
      title: 'AI チャット',
      placeholder: 'メッセージを入力...',
      close: '閉じる'
    },
    zh: {
      title: 'AI 聊天',
      placeholder: '输入消息...',
      close: '关闭'
    }
  }

  const t = texts[language] || texts.ko

  return (
    <div className="chat-popup-overlay" onClick={onClose}>
      <div className="chat-popup" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <h3 className="chat-title">{t.title}</h3>
          <button className="chat-close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="chat-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <p>여행 관련 질문을 해보세요!</p>
            </div>
          ) : (
            <>
              {messages.map((msg, index) => (
                <div key={index} className={`chat-message ${msg.sender}`}>
                  <div className="message-bubble">
                    {msg.text}
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
    </div>
  )
}

export default ChatPopup


