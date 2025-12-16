import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import './SearchBar.css'
import { autocompletePlaces } from '../services/placesApi'

const SearchBar = ({ language, onSearch, currentLocation }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [isFocused, setIsFocused] = useState(false) // 검색창 포커스 상태
  const containerRef = useRef(null)
  const timeoutRef = useRef(null)
  const { t } = useTranslation()

  // 자동완성 제안 가져오기 (검색창에 포커스가 있을 때만)
  useEffect(() => {
    // 포커스가 없으면 API 호출하지 않음
    if (!isFocused) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    if (!searchQuery || searchQuery.trim().length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    // 디바운싱: 사용자가 입력을 멈춘 후 300ms 후에 요청
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const results = await autocompletePlaces(searchQuery, currentLocation, language)
        setSuggestions(results)
        setIsOpen(results.length > 0)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('자동완성 오류:', error)
        setSuggestions([])
        setIsOpen(false)
      }
    }, 300)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [searchQuery, currentLocation, language, isFocused])

  // 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (onSearch && searchQuery.trim()) {
      setIsOpen(false)
      onSearch(searchQuery.trim())
    }
  }

  const handleSuggestionClick = (suggestion) => {
    const placeText = suggestion.placePrediction?.text?.text || suggestion.text?.text || searchQuery
    setSearchQuery(placeText)
    setIsOpen(false)
    if (onSearch) {
      onSearch(placeText)
    }
  }

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex])
        } else if (searchQuery.trim()) {
          handleSubmit(e)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const getSuggestionText = (suggestion) => {
    return suggestion.placePrediction?.text?.text || 
           suggestion.text?.text || 
           suggestion.text ||
           ''
  }

  return (
    <div className="search-bar-container" ref={containerRef}>
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <input
          type="text"
          className="search-input"
          placeholder={t('search.placeholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsFocused(true)
            if (suggestions.length > 0) {
              setIsOpen(true)
            }
          }}
          onBlur={() => {
            // 약간의 지연을 두어 클릭 이벤트가 먼저 처리되도록 함
            setTimeout(() => {
              setIsFocused(false)
            }, 200)
          }}
        />
        {searchQuery && (
          <button 
            type="button" 
            className="clear-button"
            onClick={() => {
              setSearchQuery('')
              setSuggestions([])
              setIsOpen(false)
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </form>
      {isOpen && suggestions.length > 0 && (
        <div className="autocomplete-dropdown">
          {suggestions.map((suggestion, index) => {
            const text = getSuggestionText(suggestion)
            return (
              <div
                key={index}
                className={`autocomplete-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="autocomplete-text">{text}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SearchBar


