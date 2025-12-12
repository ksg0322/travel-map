// Google Gemini API 서비스
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

/**
 * Gemini API를 사용한 채팅 응답 생성
 * @param {string} message - 사용자 메시지
 * @param {Array} conversationHistory - 대화 기록
 * @param {string} language - 언어 코드
 * @returns {Promise<string>} AI 응답 텍스트
 */
export const getChatResponse = async (message, conversationHistory = [], language = 'ko') => {
  if (!API_KEY) {
    console.error('Gemini API 키가 설정되지 않았습니다.')
    return '죄송합니다. AI 채팅 기능을 사용할 수 없습니다. API 키를 설정해주세요.'
  }

  try {
    const modelName = 'gemini-2.5-flash-lite'
    const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${API_KEY}`
    
    // 대화 기록을 시스템 프롬프트와 함께 구성
    const systemPrompt = `당신은 여행 추천 전문 AI 어시스턴트입니다. 사용자의 여행 관련 질문에 친절하고 도움이 되는 답변을 제공하세요.
언어: ${language === 'ko' ? '한국어' : language === 'en' ? 'English' : language === 'ja' ? '日本語' : '中文'}
답변은 간결하고 실용적이어야 하며, 가능하면 구체적인 장소나 활동을 추천해주세요.`

    // 대화 기록 구성
    const contents = []
    
    // 시스템 프롬프트를 첫 메시지로 추가
    contents.push({
      role: 'user',
      parts: [{ text: systemPrompt }]
    })
    
    contents.push({
      role: 'model',
      parts: [{ text: '네, 알겠습니다. 여행 추천 전문가로서 도와드리겠습니다.' }]
    })

    // 이전 대화 기록 추가
    conversationHistory.forEach(msg => {
      contents.push({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      })
    })

    // 현재 사용자 메시지 추가
    contents.push({
      role: 'user',
      parts: [{ text: message }]
    })

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE'
          }
        ]
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Gemini API 오류:', error)
      throw new Error(error.error?.message || 'AI 응답 생성에 실패했습니다.')
    }

    const data = await response.json()
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '죄송합니다. 응답을 생성할 수 없습니다.'
    
    return aiResponse
  } catch (error) {
    console.error('Gemini API 호출 오류:', error)
    return '죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
  }
}

