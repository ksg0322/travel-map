import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './SearchResults.css'

const SearchResults = ({ results, onSelectPlace, onClear }) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const prevResultsRef = useRef(null)
  const { t } = useTranslation()

  // 새로운 검색 결과가 생기면 검색결과창을 열기
  useEffect(() => {
    if (!results || results.length === 0) {
      prevResultsRef.current = null
      return
    }

    const prevResults = prevResultsRef.current
    
    // 이전 결과가 없거나, 결과 ID 목록이 다른 경우 (새로운 검색)
    if (!prevResults) {
      setIsCollapsed(false)
    } else {
      // 결과의 ID를 비교하여 변경되었는지 확인
      const prevIds = prevResults.map(r => r.id).join(',')
      const currentIds = results.map(r => r.id).join(',')
      if (prevIds !== currentIds) {
        setIsCollapsed(false)
      }
    }
    
    // 현재 결과를 저장 (참조 저장)
    prevResultsRef.current = results
  }, [results])

  const handleClear = (e) => {
    e.stopPropagation() // 헤더 클릭 이벤트 전파 방지
    onClear?.()
  }

  if (!results || results.length === 0) {
    return null
  }

  return (
    <div className={`search-results-container ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="search-results-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h3>{t('search.results')} ({results.length})</h3>
        <div className="search-results-header-actions">
          {onClear && (
            <button 
              className="clear-results-button"
              onClick={handleClear}
              title={t('search.clearResults')}
            >
              ✕
            </button>
          )}
          <button className="collapse-button">
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>
      {!isCollapsed && (
      <div className="search-results-list">
        {results.map((place, index) => (
          <div
            key={place.id || index}
            className="search-result-item"
            onClick={() => onSelectPlace?.(place)}
          >
            <div className="result-name">
              {place.displayName?.text || place.displayName || '이름 없음'}
            </div>
            {place.formattedAddress && (
              <div className="result-address">
                {place.formattedAddress}
              </div>
            )}
            {place.rating && (
              <div className="result-rating">
                ⭐ {place.rating.toFixed(1)}
                {place.userRatingCount && (
                  <span className="rating-count"> ({place.userRatingCount})</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  )
}

export default SearchResults
