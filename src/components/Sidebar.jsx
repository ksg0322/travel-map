import { useState } from 'react'
import './Sidebar.css'

const Sidebar = ({ onChatClick, language, onLanguageChange }) => {
  const languages = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ]

  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const currentLang = languages.find(lang => lang.code === language) || languages[0]

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        {/* 채팅 버튼 */}
        <button 
          className="sidebar-button chat-button"
          onClick={onChatClick}
          title="채팅"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* 언어 설정 버튼 */}
        <div className="language-menu-container">
          <button 
            className="sidebar-button language-button"
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            title="언어 설정"
          >
            <span className="language-flag">{currentLang.flag}</span>
          </button>

          {/* 언어 선택 메뉴 */}
          {showLanguageMenu && (
            <div className="language-menu">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`language-option ${language === lang.code ? 'active' : ''}`}
                  onClick={() => {
                    onLanguageChange(lang.code)
                    setShowLanguageMenu(false)
                  }}
                >
                  <span className="language-flag">{lang.flag}</span>
                  <span className="language-name">{lang.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Sidebar

