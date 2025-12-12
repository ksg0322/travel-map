import { useState, useEffect } from 'react'
import { APIProvider } from '@vis.gl/react-google-maps'
import './App.css'
import SearchBar from './components/SearchBar'
import Sidebar from './components/Sidebar'
import ChatPopup from './components/ChatPopup'
import Map from './components/Map'
import SearchResults from './components/SearchResults'
import { searchPlaces } from './services/placesApi'

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [language, setLanguage] = useState('ko')
  const [searchResults, setSearchResults] = useState([])
  const [currentLocation, setCurrentLocation] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [isGettingLocation, setIsGettingLocation] = useState(false)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  // 현재 위치 가져오기 함수
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.error('Geolocation이 지원되지 않습니다.')
      setLocationError('이 브라우저는 위치 서비스를 지원하지 않습니다.')
      // 기본값 설정하지 않음 - 사용자가 수동으로 설정하도록
      return
    }

    setIsGettingLocation(true)
    setLocationError(null)

    const options = {
      enableHighAccuracy: true, // 높은 정확도 사용
      timeout: 15000, // 15초 타임아웃 (더 길게)
      maximumAge: 0 // 캐시 사용 안 함
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy // 정확도 정보 추가
        }
        console.log('✅ 현재 위치 가져오기 성공:', location)
        console.log('위치 정확도:', position.coords.accuracy, '미터')
        setCurrentLocation(location)
        setLocationError(null)
        setIsGettingLocation(false)
      },
      (error) => {
        setIsGettingLocation(false)
        let errorMessage = '위치 정보를 가져올 수 없습니다.'
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.'
            console.error('❌ 위치 권한 거부')
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = '위치 정보를 사용할 수 없습니다. GPS가 켜져 있는지 확인해주세요.'
            console.error('❌ 위치 정보 사용 불가')
            break
          case error.TIMEOUT:
            errorMessage = '위치 정보 요청 시간이 초과되었습니다. 다시 시도해주세요.'
            console.error('❌ 위치 정보 요청 타임아웃')
            break
          default:
            errorMessage = '알 수 없는 오류가 발생했습니다.'
            console.error('❌ 위치 정보 오류:', error)
            break
        }
        
        setLocationError(errorMessage)
        // 실패 시 기본값 설정하지 않음 - 사용자가 수동으로 요청하도록
        console.warn('⚠️ 위치 정보를 가져오지 못했습니다. 기본 위치(서울)를 사용합니다.')
      },
      options
    )
  }

  // 컴포넌트 마운트 시 위치 가져오기
  useEffect(() => {
    // 초기 로드 시 위치 가져오기
    getCurrentLocation()
    
    // 위치가 없으면 기본값 설정 (지도 표시용)
    if (!currentLocation) {
      setCurrentLocation({ lat: 37.5665, lng: 126.9780 })
    }
  }, [])

  // 검색 핸들러
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    console.log('검색 시작:', { query, currentLocation, language })

    try {
      // 실제 GPS 위치가 있으면 사용, 없으면 기본 위치 사용
      const isRealGPSLocation = currentLocation && 
        !(currentLocation.lat === 37.5665 && currentLocation.lng === 126.9780)
      const location = isRealGPSLocation ? currentLocation : { lat: 37.5665, lng: 126.9780 }
      
      console.log('검색에 사용할 위치:', isRealGPSLocation ? '실제 GPS 위치' : '기본 위치(서울)', location)
      const results = await searchPlaces(query, location, language)
      console.log('검색 결과:', results)
      console.log('검색 결과 상세:', JSON.stringify(results, null, 2))
      
      // 결과 데이터 구조 확인
      if (results.length > 0) {
        console.log('첫 번째 결과 구조:', {
          id: results[0].id,
          displayName: results[0].displayName,
          location: results[0].location,
          locationType: typeof results[0].location,
          locationKeys: results[0].location ? Object.keys(results[0].location) : null
        })
      }
      
      if (results.length === 0) {
        alert('검색 결과가 없습니다. 다른 키워드로 검색해보세요.')
      }
      
      setSearchResults(results)
    } catch (error) {
      console.error('검색 오류:', error)
      alert(`검색 중 오류가 발생했습니다: ${error.message}`)
      setSearchResults([])
    }
  }

  // 개발 환경에서만 환경 변수 확인 (프로덕션에서는 제거)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('🔑 Environment Variables:', {
        hasMapsAPIKey: !!apiKey,
        hasGeminiAPIKey: !!import.meta.env.VITE_GEMINI_API_KEY,
        mode: import.meta.env.MODE
      })
    }
  }, [apiKey])

  if (!apiKey) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h2>⚠️ Google Maps API 키가 설정되지 않았습니다</h2>
        <p>.env 파일에 VITE_GOOGLE_MAPS_API_KEY를 설정해주세요.</p>
      </div>
    )
  }

  return (
    <APIProvider apiKey={apiKey}>
      <div className="app-container">
        {/* 좌측 사이드바 */}
        <Sidebar 
          onChatClick={() => setIsChatOpen(true)}
          language={language}
          onLanguageChange={setLanguage}
        />

        {/* 메인 지도 영역 */}
        <div className="map-container">
          {/* 좌측 상단 검색 창 */}
          <SearchBar language={language} onSearch={handleSearch} />
          
          {/* 검색 결과 목록 */}
          {searchResults.length > 0 && (
            <SearchResults 
              results={searchResults}
              onSelectPlace={(place) => {
                // 장소 선택 시 지도 중심 이동 (Map 컴포넌트에서 처리)
                console.log('선택된 장소:', place)
              }}
            />
          )}
          
          {/* Google Maps 지도 */}
          <Map 
            language={language} 
            searchResults={searchResults}
            currentLocation={currentLocation}
          />

          {/* 현재 위치 버튼 */}
          <button
            className="current-location-button"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            title="현재 위치로 이동"
          >
            {isGettingLocation ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="31.416">
                  <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416;0 31.416" repeatCount="indefinite"/>
                  <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416;-31.416" repeatCount="indefinite"/>
                </circle>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" fill="currentColor"/>
              </svg>
            )}
          </button>

          {/* 위치 오류 메시지 */}
          {locationError && (
            <div className="location-error-message">
              <span>{locationError}</span>
              <button onClick={() => setLocationError(null)}>✕</button>
            </div>
          )}
        </div>

        {/* 채팅 팝업 */}
        {isChatOpen && (
          <ChatPopup 
            onClose={() => setIsChatOpen(false)}
            language={language}
          />
        )}
      </div>
    </APIProvider>
  )
}

export default App
