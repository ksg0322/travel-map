import { Map as GoogleMap, Marker } from '@vis.gl/react-google-maps'
import { useCallback, useRef, useEffect } from 'react'
import './Map.css'

const Map = ({ language, searchResults = [], currentLocation = null }) => {
  const mapRef = useRef(null)

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  // 현재 위치가 변경되면 지도 중심 이동 (실제 GPS 위치일 때만)
  useEffect(() => {
    if (currentLocation && mapRef.current) {
      // 서울 기본값이 아닌 실제 GPS 위치인지 확인
      const isRealGPSLocation = !(currentLocation.lat === 37.5665 && currentLocation.lng === 126.9780)
      
      if (isRealGPSLocation) {
        console.log('✅ 실제 GPS 위치로 지도 이동:', currentLocation)
        mapRef.current.setCenter({
          lat: currentLocation.lat,
          lng: currentLocation.lng
        })
        mapRef.current.setZoom(15)
      } else {
        console.log('📍 기본 위치(서울) 사용 중')
      }
    }
  }, [currentLocation])

  // 검색 결과가 있으면 첫 번째 결과로 지도 이동
  useEffect(() => {
    if (searchResults.length > 0 && mapRef.current) {
      const firstResult = searchResults[0]
      console.log('첫 번째 검색 결과:', firstResult)
      
      // location 형식 확인 및 처리
      let lat, lng
      if (firstResult.location) {
        if (typeof firstResult.location.latitude === 'number') {
          lat = firstResult.location.latitude
          lng = firstResult.location.longitude
        } else if (firstResult.location.lat) {
          lat = firstResult.location.lat
          lng = firstResult.location.lng
        }
      }
      
      if (lat && lng) {
        console.log('지도 중심 이동:', { lat, lng })
        mapRef.current.setCenter({ lat, lng })
        mapRef.current.setZoom(15)
      } else {
        console.warn('위치 정보를 찾을 수 없습니다:', firstResult)
      }
    }
  }, [searchResults])

  // 현재 위치가 실제 GPS 위치인지 확인 (서울 기본값이 아닌지)
  const isRealGPSLocation = currentLocation && 
    !(currentLocation.lat === 37.5665 && currentLocation.lng === 126.9780)

  return (
    <div className="map-wrapper">
      <GoogleMap
        defaultCenter={currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng } : { lat: 37.5665, lng: 126.9780 }}
        defaultZoom={currentLocation && isRealGPSLocation ? 15 : 13}
        mapTypeControl={false}
        fullscreenControl={false}
        streetViewControl={false}
        zoomControl={true}
        zoomControlOptions={{
          position: window.google?.maps?.ControlPosition?.RIGHT_BOTTOM
        }}
        onLoad={onMapLoad}
        language={language}
        className="map"
      >
        {/* 현재 위치 마커 표시 (실제 GPS 위치일 때만) */}
        {currentLocation && isRealGPSLocation && (
          <Marker
            key="current-location"
            position={{
              lat: currentLocation.lat,
              lng: currentLocation.lng
            }}
            title={`현재 위치 (정확도: ${currentLocation.accuracy ? Math.round(currentLocation.accuracy) : '?'}m)`}
            icon={(() => {
              if (window.google && window.google.maps) {
                return {
                  url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="16" cy="16" r="10" fill="#4285F4" fill-opacity="0.8"/>
                      <circle cx="16" cy="16" r="6" fill="#FFFFFF"/>
                      <circle cx="16" cy="16" r="3" fill="#4285F4"/>
                    </svg>
                  `),
                  scaledSize: new window.google.maps.Size(32, 32),
                  anchor: new window.google.maps.Point(16, 16)
                }
              }
              return undefined
            })()}
          />
        )}

        {/* 검색 결과 마커 표시 */}
        {searchResults.map((place, index) => {
          if (!place.location) {
            console.warn('위치 정보가 없는 장소:', place)
            return null
          }
          
          // location 형식 확인 및 처리
          let lat, lng
          if (typeof place.location.latitude === 'number') {
            lat = place.location.latitude
            lng = place.location.longitude
          } else if (place.location.lat) {
            lat = place.location.lat
            lng = place.location.lng
          }
          
          if (!lat || !lng) {
            console.warn('유효하지 않은 위치 정보:', place.location)
            return null
          }
          
          const position = { lat, lng }
          console.log('마커 추가:', { name: place.displayName?.text, position })
          
          return (
            <Marker
              key={place.id || `place-${index}`}
              position={position}
              title={place.displayName?.text || place.displayName || '장소'}
            />
          )
        })}
      </GoogleMap>
    </div>
  )
}

export default Map

