// 대화 기록 저장 및 관리 유틸리티 (ConversationBufferMemory 유사 기능)
const CONVERSATION_STORAGE_KEY = 'travel_map_conversation'
const MAX_MESSAGES = 20 // 최대 메시지 개수 (API 토큰 제한 고려)

export const conversationMemory = {
  /**
   * 대화 기록을 localStorage에 저장
   * @param {Array} messages - 저장할 메시지 배열
   */
  save(messages) {
    try {
      // 최근 N개만 저장 (슬라이딩 윈도우 방식으로 오래된 메시지 자동 제거)
      const trimmedMessages = messages.slice(-MAX_MESSAGES)
      localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(trimmedMessages))
    } catch (error) {
      console.error('대화 기록 저장 실패:', error)
      // localStorage 용량 초과 시 오래된 메시지부터 제거
      if (error.name === 'QuotaExceededError') {
        try {
          const trimmed = messages.slice(-Math.floor(MAX_MESSAGES / 2))
          localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(trimmed))
        } catch (retryError) {
          console.error('대화 기록 저장 재시도 실패:', retryError)
        }
      }
    }
  },

  /**
   * localStorage에서 대화 기록 로드
   * @returns {Array} 저장된 메시지 배열
   */
  load() {
    try {
      const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY)
      if (stored) {
        const messages = JSON.parse(stored)
        // 최대 개수 초과 시 자동 정리
        return messages.slice(-MAX_MESSAGES)
      }
      return []
    } catch (error) {
      console.error('대화 기록 로드 실패:', error)
      return []
    }
  },

  /**
   * 대화 기록 초기화 (전체 삭제)
   */
  clear() {
    try {
      localStorage.removeItem(CONVERSATION_STORAGE_KEY)
    } catch (error) {
      console.error('대화 기록 삭제 실패:', error)
    }
  },

  /**
   * 대화 기록 크기 확인 (디버깅용)
   * @returns {number} 저장된 메시지 개수
   */
  size() {
    try {
      const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY)
      return stored ? JSON.parse(stored).length : 0
    } catch (error) {
      return 0
    }
  }
}