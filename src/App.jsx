import { useState, useEffect } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import { useTranslation } from 'react-i18next'
import './App.css'
import SearchBar from './components/SearchBar'
import Sidebar from './components/Sidebar'
import ChatPopup from './components/AIChat'
import GoogleMap from './components/Map'
import SearchResults from './components/SearchResults'
import PlaceDetailModal from './components/PlaceDetailModal'
import WelcomeModal from './components/WelcomeModal'
import { searchLocationCoordinates, searchCategoryPlaces, searchPlaces, getPlaceDetails, reverseGeocode } from './services/placesApi'

// 데이터베이스 뷰 컴포넌트 (표 형태)
const DatabaseView = ({ results, onClose, onRemove }) => {
  const { t } = useTranslation()
  return (
    <div className="database-overlay">
      <div className="database-panel">
        <div className="database-header">
          <h3>{t('sidebar.savedPlaces')} ({results.length})</h3>
          <button onClick={onClose} className="close-button">✕</button>
        </div>
        <div className="database-content">
          {results.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#5f6368' }}>
              {t('sidebar.noSavedPlaces')}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t('database.type')}</th>
                  <th>{t('database.name')}</th>
                  <th>{t('database.rating')}</th>
                  <th>{t('database.reviews')}</th>
                  <th>{t('database.address')}</th>
                  <th>{t('database.website')}</th>
                  {onRemove && <th>{t('database.delete')}</th>}
                </tr>
              </thead>
              <tbody>
                {results.map((place, index) => {
                  // Type 번역 처리 (기존 저장된 데이터도 고려)
                  let typeDisplay = place.type || ''
                  let typeIcon = '📍'
                  let typeClass = 'place'
                  
                  // place.type 또는 place.types 배열에서 타입 추론
                  const placeType = place.type || ''
                  const typesArray = place.types || []
                  
                  // 타입 매칭 (대소문자 무시)
                  const normalizedType = placeType.toLowerCase().trim()
                  
                  if (normalizedType === 'hotel' || typesArray.some(t => t.toLowerCase().includes('lodging'))) {
                    typeDisplay = t('search.categories.hotel')
                    typeIcon = '🏨'
                    typeClass = 'hotel'
                  } else if (normalizedType === 'restaurant' || typesArray.some(t => t.toLowerCase().includes('restaurant') || t.toLowerCase().includes('food'))) {
                    typeDisplay = t('search.categories.restaurant')
                    typeIcon = '🍴'
                    typeClass = 'restaurant'
                  } else if (normalizedType === 'tourist attraction' || normalizedType === 'tourist' || typesArray.some(t => t.toLowerCase().includes('tourist'))) {
                    typeDisplay = t('search.categories.tourist attraction')
                    typeIcon = '⭐'
                    typeClass = 'tourist_attraction'
                  } else if (placeType) {
                    // 타입이 있지만 매칭되지 않은 경우 원본 표시
                    typeDisplay = placeType
                    typeClass = placeType.toLowerCase().replace(/\s+/g, '_')
                  } else {
                    // 타입 정보가 전혀 없는 경우 기본값
                    typeDisplay = t('search.categories.all')
                  }
                  
                  return (
                    <tr key={place.id || index}>
                      <td>
                        <span className={`type-badge ${typeClass}`}>
                          {typeIcon} {typeDisplay}
                        </span>
                      </td>
                      <td>{place.displayName?.text || place.displayName}</td>
                      <td>{place.rating ? `⭐ ${place.rating}` : '-'}</td>
                      <td>{place.userRatingCount || 0}</td>
                      <td>{place.formattedAddress}</td>
                      <td>
                        {place.websiteUri ? (
                          <a href={place.websiteUri} target="_blank" rel="noopener noreferrer">{t('database.link')}</a>
                        ) : '-'}
                      </td>
                      {onRemove && (
                        <td>
                          <button 
                            onClick={() => {
                              if (window.confirm(t('place.deleteConfirm'))) {
                                onRemove(place.id)
                              }
                            }}
                            className="remove-button"
                            title={t('place.delete')}
                          >
                            🗑️
                          </button>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function App() {
  const { t, i18n } = useTranslation()
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [isDatabaseOpen, setIsDatabaseOpen] = useState(false)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [language, setLanguage] = useState(i18n.language || 'ko')
  const [searchResults, setSearchResults] = useState([])
  const [currentLocation, setCurrentLocation] = useState(null)
  const [mapCenter, setMapCenter] = useState(null) // 지도 중심 좌표 상태 추가
  const [selectedPlace, setSelectedPlace] = useState(null) // 선택된 장소 상태 추가
  const [lastViewedPlace, setLastViewedPlace] = useState(null) // 마지막으로 상세보기를 한 장소
  const [routePaths, setRoutePaths] = useState([]) // 여행 경로 데이터 (polyline 배열)
  // 사용자가 저장한 장소 목록 (localStorage 연동)
  const [savedPlaces, setSavedPlaces] = useState(() => {
    try {
      const saved = localStorage.getItem('savedPlaces')
      return saved ? JSON.parse(saved) : []
    } catch (e) {
      console.error('저장된 장소 로드 실패:', e)
      return []
    }
  }) 
  const [locationError, setLocationError] = useState(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const [minRating, setMinRating] = useState(4.0)
  const [radius, setRadius] = useState(3000)
  const [selectedCategory, setSelectedCategory] = useState('All')   
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  // 저장된 장소가 변경될 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem('savedPlaces', JSON.stringify(savedPlaces))
    } catch (e) {
      console.error('장소 저장 실패:', e)
    }
  }, [savedPlaces])

  useEffect(() => {
    // 초기 언어 설정
    document.documentElement.lang = language
    
    // i18next 언어 변경 이벤트 리스너
    const handleLanguageChanged = (lng) => {
      document.documentElement.lang = lng
    }
    
    i18n.on('languageChanged', handleLanguageChanged)
    
    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [language, i18n])

  // 언어 변경 핸들러
  const handleLanguageChange = (lang) => {
    if (lang === language) return;
    
    // 언어 설정 저장 및 i18n 변경
    i18n.changeLanguage(lang)
    setLanguage(lang)
    
    // Google Maps API 언어 설정을 완벽하게 적용하기 위해 페이지 새로고침
    window.location.reload()
  }

  // 장소 선택 핸들러 (상세 정보 포함)
  const handleSelectPlace = async (place) => {
    if (!place) {
      setSelectedPlace(null)
      setLastViewedPlace(null)
      return
    }

    console.log('📍 장소 선택됨:', place)
    
    // 위치 정보 추출 및 지도 중심 이동
    const coordinates = getPlaceCoordinates(place)
    if (coordinates) {
      console.log('지도 중심 변경 요청:', coordinates)
      setMapCenter(coordinates)
    } else {
      console.warn('위치 정보가 유효하지 않아 지도를 이동할 수 없습니다.')
    }

    // 장소 ID가 있으면 상세 정보 가져오기
    let finalPlace = place
    if (place.id) {
      try {
        console.log('상세 정보 가져오는 중...', place.id)
        const placeDetails = await getPlaceDetails(place.id, language)
        if (placeDetails) {
          console.log('✅ 상세 정보 로드 성공:', placeDetails)
          // 기존 place 정보와 상세 정보를 병합
          finalPlace = { ...place, ...placeDetails }
        }
      } catch (error) {
        console.error('상세 정보 가져오기 실패:', error)
      }
    }
    
    // 최종 장소 정보 설정 (중복 제거)
    setSelectedPlace(finalPlace)
    setLastViewedPlace(finalPlace)
  }

  // 경로 업데이트 핸들러 (AIChat에서 호출)
  const handleRouteUpdate = (paths) => {
    setRoutePaths(paths || [])
  }

  // 장소 저장 핸들러
  const handleSavePlace = (place) => {
    if (!place || !place.id) {
      console.warn('저장할 장소 정보가 없습니다.')
      return
    }

    // 이미 저장된 장소인지 확인
    const isAlreadySaved = savedPlaces.some(saved => saved.id === place.id)
    
    if (isAlreadySaved) {
      // 이미 저장된 경우 팝업 없이 반환
      return
    }

    // 저장된 장소 목록에 추가
    setSavedPlaces(prev => [...prev, place])
    console.log('✅ 장소 저장됨:', place.displayName?.text || place.displayName)
  }

  // 저장된 장소 삭제 핸들러
  const handleRemoveSavedPlace = (placeId) => {
    setSavedPlaces(prev => prev.filter(place => place.id !== placeId))
  }

  // 현재 위치 가져오기 함수
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation이 지원되지 않습니다.')
      setLocationError(t('location.notSupported'))
      return
    }

    setIsGettingLocation(true)
    setLocationError(null)
    setSelectedPlace(null) // 현재 위치로 이동할 때 선택된 장소 리셋

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        console.log('✅ 현재 위치 가져오기 성공:', location)
        
        // Reverse Geocoding으로 주소 가져오기
        try {
          const addressInfo = await reverseGeocode(location.lat, location.lng, language)
          if (addressInfo) {
            location.address = addressInfo.formattedAddress
            console.log('✅ 주소 변환 성공:', addressInfo.formattedAddress)
          }
        } catch (error) {
          console.warn('주소 변환 실패:', error)
        }
        
        setCurrentLocation(location)
        setMapCenter(location) // 현재 위치를 지도 중심으로 설정
        setIsGettingLocation(false)
      },
      (error) => {
        setIsGettingLocation(false)
        let errorMessage = t('location.error.unknown')
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = t('location.error.denied')
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = t('location.error.unavailable')
            break
          case error.TIMEOUT:
            errorMessage = t('location.error.timeout')
            break
          default:
            errorMessage = t('location.error.unknown')
            break
        }
        setLocationError(errorMessage)
      },
      options
    )
  }

  // 컴포넌트 마운트 시 위치 가져오기 및 환영 모달 체크
  useEffect(() => {
    // 환영 모달 표시 여부 확인 (localStorage)
    const hasVisited = localStorage.getItem('travelMap_hasVisited')
    if (!hasVisited) {
      setShowWelcomeModal(true)
    }
    // 초기 기본 위치 (서울)
    if (!currentLocation) {
      const defaultLoc = { lat: 37.5665, lng: 126.9780 }
      setMapCenter(defaultLoc) // 지도 중심용
    }
  }, [])

  // 좌표 추출 헬퍼 함수
  const getPlaceCoordinates = (place) => {
    if (!place?.location) return null
    const lat = place.location.latitude || place.location.lat
    const lng = place.location.longitude || place.location.lng
    return (lat && lng) ? { lat: Number(lat), lng: Number(lng) } : null
  }

  // 두 좌표 사이의 거리 계산 (미터 단위, 하버사인 공식)
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371000 // 지구 반경 (미터)
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // 검색 핸들러 (일반 검색 추가)
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    console.log('검색 시작:', { query, minRating, radius, language })

    try {
      // 카테고리 키워드 확인 
      const categoryKeywords = {
        '식당': true,
        '음식점': true,
        '맛집': true,
        '호텔': true,
        '숙박': true,
        '관광지': true,
        '관광': true,
        '명소': true,
      }
      
      const lowerQuery = query.trim().toLowerCase()
      const isCategoryKeyword = categoryKeywords[lowerQuery] || false
      
      // 1. 목적지 좌표 찾기
      // 모든 검색은 사용자가 보고있는 지도의 중심(mapCenter)을 기준으로 검색
      const searchCenter = mapCenter || currentLocation // 지도 중심 우선, 없으면 현재 위치

      if (!searchCenter) {
        alert(t('search.error.locationNotFound'))
        return
      }

      console.log('검색 중심 위치:', searchCenter)

      // 2. 카테고리 키워드에 따라 검색 수행
      let allPlaces = []
      
      if (isCategoryKeyword) {
        // 카테고리 키워드인 경우 해당 카테고리만 검색
        const normalizedQuery = lowerQuery
        if (normalizedQuery === '호텔' || normalizedQuery === '숙박') {
          const hotels = await searchCategoryPlaces('호텔', searchCenter, radius, minRating, 'Hotel', language)
          allPlaces = hotels
        } else if (normalizedQuery === '식당' || normalizedQuery === '음식점' || normalizedQuery === '맛집') {
          const restaurants = await searchCategoryPlaces('맛집', searchCenter, radius, minRating, 'Restaurant', language)
          allPlaces = restaurants
        } else if (normalizedQuery === '관광지' || normalizedQuery === '관광' || normalizedQuery === '명소') {
          const tourist_attractions = await searchCategoryPlaces('관광지', searchCenter, radius, minRating, 'Tourist attraction', language)
          allPlaces = tourist_attractions
        }
      } else {
        // 일반 키워드인 경우 searchPlaces만 호출
        const generalPlaces = await searchPlaces(query, searchCenter, language, radius)

        // 일반 검색 결과 처리: 타입이 지정되지 않았으므로 API 데이터를 기반으로 추론하거나 'Place'로 설정
        const formattedGeneralPlaces = generalPlaces
          .filter(place => {
            
            // 1. 평점 정보가 없는 경우(지명, 시설 등)는 무조건 포함
            if (place.rating === undefined || place.rating === null) return true;
            
            // 2. 주요 서비스 카테고리인지 확인
            const types = place.types || [];
            const isServicePlace = types.some(type => 
              ['restaurant', 'food', 'cafe', 'bar', 'lodging', 'hotel'].includes(type)
            );
            
            // 3. 서비스 업종이면 평점 기준 적용, 아니면(역, 관공서 등) 통과
            if (isServicePlace) {
              return place.rating >= minRating;
            }
            return true;
          })
          .map(place => {
          let type = 'Place';
          const types = place.types || [];
          if (types.includes('lodging')) type = 'Hotel';
          else if (types.includes('restaurant') || types.includes('food')) type = 'Restaurant';
          else if (types.includes('tourist_attraction')) type = 'Tourist attraction';
          
          return { ...place, type };
        });

        allPlaces = formattedGeneralPlaces
      }

      // 3. 결과 합치기 및 중복 제거
      
      // 장소 ID 기준으로 중복 제거
      const uniquePlacesMap = new Map();
      allPlaces.forEach(place => {
        // 이미 있는 장소라면, 구체적인 타입(Hotel/Restaurant/Tourist attraction)을 우선함 ('Place'보다)
        if (uniquePlacesMap.has(place.id)) {
          const existing = uniquePlacesMap.get(place.id);
          // 기존 항목이 'Place'이고 새 항목이 더 구체적인 타입이면 교체 (Map은 키가 있으면 순서가 바뀌지 않음)
          if (existing.type === 'Place' && place.type !== 'Place') {
            uniquePlacesMap.set(place.id, place);
          }
        } else {
          uniquePlacesMap.set(place.id, place);
        }
      });
      
      const uniquePlaces = Array.from(uniquePlacesMap.values());

      // 검색 반경 내의 장소만 필터링
      const placesWithinRadius = uniquePlaces.filter(place => {
        if (!searchCenter) return false
        
        const coordinates = getPlaceCoordinates(place)
        if (!coordinates) return false

        const distance = calculateDistance(
          searchCenter.lat,
          searchCenter.lng,
          coordinates.lat,
          coordinates.lng
        )
        
        // 거리 정보를 place 객체에 추가 (표시용)
        place.distance = Math.round(distance)
        
        return distance <= radius
      })

      console.log(`검색 결과: 전체 ${uniquePlaces.length}개, 반경 내 ${placesWithinRadius.length}개`)

      let finalResults = placesWithinRadius
      if (isCategoryKeyword) {
        // 카테고리 키워드 검색일 때만 거리순 정렬 적용
        const currentCenter = mapCenter || currentLocation
        if (currentCenter?.lat && currentCenter?.lng) {
          // 각 장소에 현재 지도 위치 기준 거리 계산 및 저장
          placesWithinRadius.forEach(place => {
            const coordinates = getPlaceCoordinates(place)
            if (!coordinates) return
            
            const distanceFromCenter = calculateDistance(
              currentCenter.lat,
              currentCenter.lng,
              coordinates.lat,
              coordinates.lng
            )
            
            // 현재 지도 위치 기준 거리 저장
            place.distanceFromCenter = Math.round(distanceFromCenter)
          })
          
          // 거리순으로 정렬 (가까운 순)
          finalResults = [...placesWithinRadius].sort((a, b) => {
            const distanceA = a.distanceFromCenter || Infinity
            const distanceB = b.distanceFromCenter || Infinity
            return distanceA - distanceB
          })
        }
      }

      console.log('통합 검색 결과 (반경 필터링 후):', finalResults)
      
      if (finalResults.length === 0) {
        alert(t('search.error.noResults', { radius: radius / 1000 }))
      }
      
      setSearchResults(finalResults.slice(0, 30))
      
    } catch (error) {
      console.error('검색 오류:', error)
      alert(`${t('search.error.generic')}: ${error.message}`)
      setSearchResults([])
    }
  }

  // 검색 결과 삭제 핸들러
  const handleClearSearchResults = () => {
    setSearchResults([])
    setSelectedPlace(null) // 선택된 장소도 초기화
  }

  // 경로 삭제 핸들러
  const handleClearRoutePaths = () => {
    setRoutePaths([])
  }

  // 카테고리 필터링
  const filteredResults = selectedCategory === 'All' 
    ? searchResults.slice(0, 30) // All 선택 시 최대 30개만 표시
    : searchResults.filter(place => place.type === selectedCategory) // 특정 카테고리 선택 시 해당 카테고리의 모든 결과 표시

  if (!apiKey) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <h2>⚠️ Google Maps API 키가 설정되지 않았습니다</h2>
      </div>
    )
  }

  return (
    <APIProvider 
      apiKey={apiKey} 
      language={language} 
      key={language} 
      libraries={['geometry']}
      onLoad={() => getCurrentLocation()} // 지도가 로드된 후 위치 가져오기 실행
    >
      {/* 환영 모달 */}
      {showWelcomeModal && (
        <WelcomeModal 
          onClose={() => setShowWelcomeModal(false)}
          language={language}
          onLanguageChange={handleLanguageChange}
          minRating={minRating}
          onMinRatingChange={setMinRating}
          radius={radius}
          onRadiusChange={setRadius}
        />
      )}

      <div className="app-container">
        {/* 사이드바 (설정 패널) */}
        <Sidebar 
          onChatClick={() => setIsChatOpen(!isChatOpen)}
          onDatabaseClick={() => setIsDatabaseOpen(true)}
          onWelcomeClick={() => setShowWelcomeModal(true)}
          language={language}
          onLanguageChange={handleLanguageChange}
          minRating={minRating}
          onMinRatingChange={setMinRating}
          radius={radius}
          onRadiusChange={setRadius}
          savedCount={savedPlaces.length}
        />

        {/* 메인 콘텐츠 영역 */}
        <div 
          className="main-content" 
          style={{ 
            marginLeft: '300px', 
            width: 'calc(100% - 300px)',
            transition: 'all 0.3s ease'
          }}
        >
        <div className="map-container">
            {/* 상단 컨트롤 컨테이너 (검색바 + 필터) */}
            <div className="top-controls-container">
              <SearchBar onSearch={handleSearch} />
          
              {/* 경로 삭제 버튼 (경로가 있을 때만 표시) */}
              {routePaths && routePaths.length > 0 && (
                <button
                  onClick={handleClearRoutePaths}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ea4335',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginRight: '8px',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = '#c5221f'}
                  onMouseOut={(e) => e.target.style.backgroundColor = '#ea4335'}
                  title={t('route.clearRoute')}
                >
                  🗑️ {t('route.clearRoute')}
                </button>
              )}

              {/* 카테고리 필터 (검색바 우측) */}
              <div className="category-filter">
                <button 
                  className={`filter-btn ${selectedCategory === 'All' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('All')}
                >
                  {t('search.categories.all')} ({searchResults.length > 0 ? Math.min(searchResults.length, 30) : 0})
                </button>
                <button 
                  className={`filter-btn ${selectedCategory === 'Hotel' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('Hotel')}
                >
                  {t('search.categories.hotel')} 🏨 ({searchResults.filter(r => r.type === 'Hotel').length})
                </button>
                <button 
                  className={`filter-btn ${selectedCategory === 'Restaurant' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('Restaurant')}
                >
                  {t('search.categories.restaurant')} 🍴 ({searchResults.filter(r => r.type === 'Restaurant').length})
                </button>
                <button 
                  className={`filter-btn ${selectedCategory === 'Tourist attraction' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('Tourist attraction')}
                >
                  {t('search.categories.tourist attraction')} ⭐ ({searchResults.filter(r => r.type === 'Tourist attraction').length})
                </button>
              </div>
            </div>
            
            {filteredResults.length > 0 && (
            <SearchResults 
                results={filteredResults}
                onSelectPlace={handleSelectPlace}
                onClear={handleClearSearchResults}
            />
          )}
          
            <GoogleMap 
            language={language} 
              searchResults={filteredResults}
            currentLocation={currentLocation}
              center={mapCenter} // 지도 중심 좌표 전달
              selectedPlace={selectedPlace} // 선택된 장소 전달
              lastViewedPlace={lastViewedPlace} // 마지막으로 상세보기를 한 장소 전달
              onSelectPlace={handleSelectPlace} // 선택 핸들러 전달 (상세 정보 포함)
              onCenterChange={setMapCenter} // 지도 중심이 변경될 때 상태 업데이트
              isChatOpen={isChatOpen} // 채팅창 열림 상태 전달
              routePaths={routePaths} // 여행 경로 데이터 전달
            />

          <button
              className={`current-location-button ${isChatOpen ? 'chat-open' : ''}`}
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
              title={t('location.moveToCurrent')}
            >
              {isGettingLocation ? '...' : '📍'}
          </button>

          {/* 마지막으로 본 장소 해제 버튼 */}
          {lastViewedPlace && (
            <button
              className={`clear-last-viewed-button ${isChatOpen ? 'chat-open' : ''}`}
              onClick={() => setLastViewedPlace(null)}
              title={t('map.clearLastViewed')}
            >
              ✕
            </button>
          )}

          {locationError && (
            <div className="location-error-message">
              <span>{locationError}</span>
              <button onClick={() => setLocationError(null)}>✕</button>
            </div>
          )}
          </div>
        </div>

        {/* 채팅 패널 (우측 고정) */}
        {isChatOpen && (
          <ChatPopup 
            onClose={() => setIsChatOpen(false)}
            language={language}
            searchResults={searchResults}
            currentLocation={currentLocation}
            mapCenter={mapCenter}
            savedPlaces={savedPlaces}
            radius={radius}
            minRating={minRating}
            onSearch={handleSearch} // 검색 실행 함수 전달
            onRouteUpdate={handleRouteUpdate} // 경로 업데이트 핸들러 전달
          />
        )}

        {/* 데이터베이스 모달 */}
        {isDatabaseOpen && (
          <DatabaseView 
            results={savedPlaces} 
            onClose={() => setIsDatabaseOpen(false)}
            onRemove={handleRemoveSavedPlace}
          />
        )}

        {/* 장소 상세 정보 모달 */}
        {selectedPlace && (
          <PlaceDetailModal 
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            onSave={handleSavePlace}
            isSaved={savedPlaces.some(saved => saved.id === selectedPlace.id)}
          />
        )}
      </div>
    </APIProvider>
  )
}

export default App