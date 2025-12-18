import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './WelcomeModal.css'

const WelcomeModal = ({
  onClose,
  language,
  onLanguageChange,
  minRating,
  onMinRatingChange,
  radius,
  onRadiusChange
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

  const handleLanguageChange = (langCode) => {
    onLanguageChange(langCode)
    i18n.changeLanguage(langCode)
    setShowLanguageMenu(false)
  }

  const handleStart = () => {
    // localStorage에 방문 기록 저장
    localStorage.setItem('travelMap_hasVisited', 'true')
    onClose()
  }

  return (
    <div className="welcome-modal-overlay" onClick={handleStart}>
      <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
        <div className="welcome-modal-content">
          {/* 헤더 */}
          <div className="welcome-header">
            <h1 className="welcome-title">{t('welcome.title')}</h1>
            <p className="welcome-subtitle">{t('welcome.subtitle')}</p>
          </div>

          {/* 앱 설명 */}
          <div className="welcome-description">
            <p>{t('welcome.description')}</p>
            <ul className="welcome-features">
              <li>🗺️ {t('welcome.feature1')}</li>
              <li>💾 {t('welcome.feature2')}</li>
              <li>🤖 {t('welcome.feature3')}</li>
            </ul>
          </div>

          {/* 설정 섹션 */}
          <div className="welcome-settings">
            <h3 className="welcome-settings-title">{t('welcome.settingsTitle')}</h3>
            <p className="welcome-settings-description">
              ⚙️ {t('welcome.feature4')}
            </p>
            
            {/* 언어 설정 */}
            <div className="welcome-setting-item">
              <label className="welcome-setting-label">{t('sidebar.language')}</label>
              <div className="welcome-language-container">
                <button 
                  className="welcome-language-button"
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                >
                  <span className="welcome-language-flag">{currentLang.flag}</span>
                  <span className="welcome-language-name">{currentLang.name}</span>
                  <span className="welcome-language-dropdown-icon">▼</span>
                </button>
                {showLanguageMenu && (
                  <div className="welcome-language-menu">
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        className={`welcome-language-option ${language === lang.code ? 'active' : ''}`}
                        onClick={() => handleLanguageChange(lang.code)}
                      >
                        <span className="welcome-language-flag">{lang.flag}</span>
                        <span className="welcome-language-name">{lang.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* 최소 평점 설정 */}
            <div className="welcome-setting-item">
              <label className="welcome-setting-label">
                {t('sidebar.minRating')} : {minRating} {t('sidebar.unit')}
              </label>
              <input 
                type="range" 
                min="0.5" 
                max="5" 
                step="0.5" 
                value={minRating} 
                onChange={(e) => onMinRatingChange(parseFloat(e.target.value))}
                className="welcome-slider"
              />
            </div>
          </div>

            {/* 검색 반경 설정 */}
            <div className="welcome-setting-item">
              <label className="welcome-setting-label">
                {t('sidebar.radius')} : {radius}m
              </label>
              <input 
                type="range" 
                min="500" 
                max="10000" 
                step="500" 
                value={radius} 
                onChange={(e) => onRadiusChange(parseInt(e.target.value))}
                className="welcome-slider"
              />
            </div>

          {/* 시작하기 버튼 */}
          <div className="welcome-actions">
            <button className="welcome-start-button" onClick={handleStart}>
              {t('welcome.startButton')}
            </button>
            <p className="welcome-help-text"> ◀ {t('welcome.helpText')}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WelcomeModal
