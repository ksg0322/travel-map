import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import './Sidebar.css'

const Sidebar = ({ 
  onChatClick,
  onDatabaseClick,
  onWelcomeClick,
  language, 
  onLanguageChange,
  minRating,
  onMinRatingChange,
  radius,
  onRadiusChange,
  savedCount = 0 // 저장된 장소 개수 (기본값 0)
}) => {
  const { t, i18n } = useTranslation()
  
  const languages = [
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'zh', name: '中文', flag: '🇨🇳' }
  ]

  const [showLanguageMenu, setShowLanguageMenu] = useState(false)
  const currentLang = languages.find(lang => lang.code === language) || languages[0]

  // 컴포넌트 마운트 및 언어 변경 시 i18n 동기화
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language)
    }
  }, [language, i18n])

  // 초기 로드 시 언어 설정 (App.jsx의 상태와 i18n 초기화 간의 타이밍 이슈 해결)
  useEffect(() => {
    // localStorage에 저장된 언어가 있으면 사용, 없으면 브라우저 언어 감지 등은 
    // App.jsx 또는 i18n.js에서 처리되지만, 여기서도 상태를 맞춰줍니다.
    if (!language) {
       onLanguageChange(i18n.language || 'ko')
    }
  }, [])

  const handleLanguageChange = (langCode) => {
    onLanguageChange(langCode)
    i18n.changeLanguage(langCode)
    setShowLanguageMenu(false)
    localStorage.setItem('travelMap_language', langCode)
  }

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <div className="sidebar-header">
          <h3>{t('app.title')}</h3>
        </div>

        <div className="sidebar-divider"></div>

        <div className="sidebar-section">
          <h4>{t('sidebar.settings')}</h4>
          
          <div className="setting-item">
            <label>{t('sidebar.minRating')} : {minRating} {t('sidebar.unit')}</label>
            <input 
              type="range" 
              min="0.5" 
              max="5" 
              step="0.5" 
              value={minRating} 
              onChange={(e) => onMinRatingChange(parseFloat(e.target.value))}
            />
          </div>

          <div className="setting-item">
            <label>{t('sidebar.radius')} : {radius}m</label>
            <input 
              type="range" 
              min="500" 
              max="10000" 
              step="500" 
              value={radius} 
              onChange={(e) => onRadiusChange(parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="sidebar-divider"></div>

        <div className="sidebar-actions">
        {/* 채팅 버튼 */}
        <button 
          className="sidebar-button chat-button"
          onClick={onChatClick}
            title={t('chat.title')}
        >
            <div className="button-content">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
              <span className="button-text">{t('chat.title')}</span>
            </div>
          </button>

          {/* 데이터베이스 버튼 */}
          <button 
            className="sidebar-button db-button"
            onClick={onDatabaseClick}
            title={t('sidebar.savedPlaces')}
          >
            <div className="button-content">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 6C4 4.89543 7.58172 4 12 4C16.4183 4 20 4.89543 20 6M4 6V18C4 19.1046 7.58172 20 12 20C16.4183 20 20 19.1046 20 18V6M4 6C4 7.10457 7.58172 8 12 8C16.4183 8 20 7.10457 20 6M4 12C4 13.1046 7.58172 14 12 14C16.4183 14 20 13.1046 20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="button-text">{t('sidebar.savedPlaces')} ({savedCount})</span>
            </div>
        </button>
        
        {/* 언어 설정 버튼 */}
        <div className="language-menu-container">
          <button 
            className="sidebar-button language-button"
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
              title={t('sidebar.language')}
          >
              <div className="button-content">
            <span className="language-flag">{currentLang.flag}</span>
                <span className="button-text">{currentLang.name}</span>
                <span className="language-dropdown-icon">▼</span>
              </div>
          </button>

          {/* 언어 선택 메뉴 */}
          {showLanguageMenu && (
            <div className="language-menu">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  className={`language-option ${language === lang.code ? 'active' : ''}`}
                    onClick={() => handleLanguageChange(lang.code)}
                >
                  <span className="language-flag">{lang.flag}</span>
                  <span className="language-name">{lang.name}</span>
                </button>
              ))}
            </div>
          )}
          </div>

          {/* 환영 모달 버튼 */}
          <button 
            className="sidebar-button welcome-button"
            onClick={onWelcomeClick}
            title={t('sidebar.appInfo')}
          >
            <div className="button-content">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="button-text">{t('sidebar.appInfo')}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
