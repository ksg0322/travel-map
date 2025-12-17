import { Map as GoogleMap, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { useCallback, useRef, useEffect, useState } from 'react'
import './Map.css'

// 지도 제어용 내부 컴포넌트
const MapController = ({ center, onCenterChange }) => {
  const map = useMap()
  const isUpdatingCenter = useRef(false) // 프로그래밍 방식으로 중심을 변경 중인지 추적

  // 지도 중심 이동 (center prop이 변경될 때만)
  useEffect(() => {
    if (center && map) {
      const mapCenter = map.getCenter()
      // 현재 지도 중심과 새로운 center가 다를 때만 이동
      if (!mapCenter || 
          Math.abs(mapCenter.lat() - center.lat) > 0.0001 || 
          Math.abs(mapCenter.lng() - center.lng) > 0.0001) {
        console.log('🗺️ 지도 중심 이동 실행:', center)
        isUpdatingCenter.current = true
        map.setCenter({
          lat: center.lat,
          lng: center.lng
        })
        map.setZoom(15)
        // 약간의 지연 후 플래그 해제 (이벤트가 발생하기 전에)
        setTimeout(() => {
          isUpdatingCenter.current = false
        }, 100)
      }
    } else if (!map) {
      console.log('⚠️ 지도 인스턴스가 아직 준비되지 않음')
    }
  }, [center, map])

  // 지도 이동 이벤트 리스너 (사용자가 지도를 드래그하거나 줌을 변경할 때)
  useEffect(() => {
    if (!map || !onCenterChange) return

    const handleCenterChanged = () => {
      // 프로그래밍 방식으로 변경 중이 아닐 때만 상태 업데이트
      if (!isUpdatingCenter.current) {
        const newCenter = map.getCenter()
        if (newCenter) {
          onCenterChange({
            lat: newCenter.lat(),
            lng: newCenter.lng()
          })
        }
      }
    }

    // 지도 이동이 완료된 후 중심 위치 업데이트 (idle 이벤트 사용)
    map.addListener('idle', handleCenterChanged)

    return () => {
      if (map) {
        window.google?.maps?.event?.clearListeners(map, 'idle')
      }
    }
  }, [map, onCenterChange])

  return null
}

// 경로 렌더링 컴포넌트
const RouteRenderer = ({ routePaths }) => {
  const map = useMap()
  const polylinesRef = useRef([]) // 생성된 Polyline 객체들을 저장

  useEffect(() => {
    if (!map || !window.google?.maps) return

    // 기존 경로 제거
    polylinesRef.current.forEach(polyline => {
      polyline.setMap(null)
    })
    polylinesRef.current = []

    // 경로가 없으면 종료
    if (!routePaths || routePaths.length === 0) {
      return
    }

    // Google Maps Geometry 라이브러리가 로드되었는지 확인
    if (!window.google.maps.geometry || !window.google.maps.geometry.encoding) {
      console.warn('Google Maps Geometry encoding library is not loaded. Routes cannot be displayed.')
      return
    }

    const bounds = new window.google.maps.LatLngBounds()
    const allPolylines = []

    // 각 경로 구간에 대해 Polyline 생성
    routePaths.forEach((routePath, index) => {
      if (!routePath.polyline) return

      try {
        // 인코딩된 polyline을 디코딩하여 좌표 배열로 변환
        const path = window.google.maps.geometry.encoding.decodePath(routePath.polyline)
        
        // 경로를 bounds에 포함
        path.forEach(point => bounds.extend(point))

        // Polyline 생성
        const polyline = new window.google.maps.Polyline({
          path: path,
          geodesic: true,
          strokeColor: '#4285F4', // 파란색
          strokeOpacity: 0.8,
          strokeWeight: 5,
          zIndex: 1 // 마커보다 아래
        })

        polyline.setMap(map)
        polylinesRef.current.push(polyline)
        allPolylines.push(polyline)

        // 출발지와 도착지도 bounds에 포함
        if (routePath.origin) {
          bounds.extend(new window.google.maps.LatLng(routePath.origin.lat, routePath.origin.lng))
        }
        if (routePath.destination) {
          bounds.extend(new window.google.maps.LatLng(routePath.destination.lat, routePath.destination.lng))
        }
      } catch (error) {
        console.error(`경로 렌더링 오류 (구간 ${index + 1}):`, error)
      }
    })

    // 모든 경로가 포함되도록 지도 범위 조정
    if (allPolylines.length > 0 && !bounds.isEmpty()) {
      map.fitBounds(bounds)
    }

    // cleanup 함수: 컴포넌트 언마운트 시 또는 경로가 변경될 때 기존 Polyline 제거
    return () => {
      polylinesRef.current.forEach(polyline => {
        polyline.setMap(null)
      })
      polylinesRef.current = []
    }
  }, [map, routePaths])

  return null
}

const Map = ({ language, searchResults = [], currentLocation = null, center = null, selectedPlace = null, onSelectPlace = null, onCenterChange = null, isChatOpen = false, routePaths = [] }) => {
  // 현재 위치가 실제 GPS 위치인지 확인 (서울 기본값이 아닌지)
  const isRealGPSLocation = currentLocation && 
    !(currentLocation.lat === 37.5665 && currentLocation.lng === 126.9780)

  // 선택된 장소의 좌표 추출 헬퍼 함수
  const getPlacePosition = (place) => {
    if (!place?.location) return null;
    let lat, lng
    if (typeof place.location.latitude === 'number') {
      lat = place.location.latitude
      lng = place.location.longitude
    } else if (place.location.lat) {
      lat = place.location.lat
      lng = place.location.lng
    }
    return lat && lng ? { lat, lng } : null;
  }

  const selectedPosition = getPlacePosition(selectedPlace);

  return (
    <div className={`map-wrapper ${isChatOpen ? 'chat-open' : ''}`}>
      <GoogleMap
        defaultCenter={currentLocation || { lat: 37.5665, lng: 126.9780 }}
        defaultZoom={13}
        mapTypeControl={false}
        fullscreenControl={false}
        streetViewControl={false}
        zoomControl={true}
        zoomControlOptions={{
          position: window.google?.maps?.ControlPosition?.RIGHT_BOTTOM
        }}
        mapId={import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID"}
        language={language}
        className="map"
        id="google-map"
        onClick={(e) => {
          // POI(관심 지점) 클릭 시 처리
          if (e.detail.placeId) {
            e.stop() // Google 지도 기본 정보창 방지
            console.log('POI 클릭:', e.detail.placeId)
            
            const poiPlace = {
              id: e.detail.placeId,
              location: {
                lat: e.detail.latLng?.lat,
                lng: e.detail.latLng?.lng
              },
              displayName: { text: '장소 정보 불러오는 중...' } // 임시 이름
            }
            
            if (onSelectPlace) onSelectPlace(poiPlace)
          } else {
            // 지도 빈 공간 클릭 시 선택 해제
            if (onSelectPlace) onSelectPlace(null)
          }
        }}
      >
        <MapController center={center} onCenterChange={onCenterChange} />
        
        {/* 경로 렌더링 */}
        <RouteRenderer routePaths={routePaths} />

        {/* 경로 방문 장소 마커 표시 (숫자 및 이름 포함) */}
        {routePaths && routePaths.length > 0 && (() => {
          const stops = []
          routePaths.forEach((path, idx) => {
            // 첫 구간의 origin 추가
            if (idx === 0) stops.push({ position: path.origin, name: path.originName })
            // 각 구간의 destination 추가
            stops.push({ position: path.destination, name: path.destinationName })
          })

          return stops.map((stop, index) => (
            <AdvancedMarker
              key={`route-stop-${index}`}
              position={stop.position}
              title={`${index + 1}번 방문지: ${stop.name}`}
              zIndex={200} // 일반 마커보다 위에 표시
            >
              <div style={{ position: 'relative', width: '32px', height: '32px' }}>
                {/* 장소 이름 라벨 */}
                <div style={{
                  position: 'absolute',
                  top: '-30px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  backgroundColor: 'white',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  color: '#333',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none'
                }}>
                  {stop.name}
                  <div style={{
                    position: 'absolute',
                    bottom: '-6px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '0',
                    height: '0',
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '6px solid white'
                  }}></div>
                </div>

                {/* 숫자 핀 아이콘 */}
                <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 0C7.163 0 0 7.163 0 16C0 26 16 32 16 32C16 32 32 26 32 16C32 7.163 24.837 0 16 0Z" fill="#EA4335" stroke="white" strokeWidth="2"/>
                  <circle cx="16" cy="16" r="10" fill="white"/>
                </svg>
                <span style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -55%)',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  color: '#EA4335'
                }}>{index + 1}</span>
              </div>
            </AdvancedMarker>
          ))
        })()}

        {/* 현재 위치 마커 표시 (빨간색, 실제 GPS 위치일 때만) */}
        {currentLocation && isRealGPSLocation && (
          <AdvancedMarker
            key="current-location"
            position={{
              lat: currentLocation.lat,
              lng: currentLocation.lng
            }}
            title={`현재 위치 (정확도: ${currentLocation.accuracy ? Math.round(currentLocation.accuracy) : '?'}m)`}
            zIndex={100} // 현재 위치를 가장 위에 표시
          >
            <img 
              src={'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="10" fill="red" fill-opacity="0.9" stroke="white" stroke-width="2"/>
                  <circle cx="16" cy="16" r="4" fill="white"/>
                    </svg>
              `)}
              width={32}
              height={32}
              style={{ transform: 'translateY(50%)' }} // 하단 중앙 기준이므로 반만큼 내려서 중심 맞춤
            />
          </AdvancedMarker>
        )}

        {/* 검색 결과 마커 표시 */}
        {searchResults.map((place, index) => {
          const position = getPlacePosition(place);
          if (!position) return null;
          
          return (
            <AdvancedMarker
              key={place.id || `place-${index}`}
              position={position}
              title={place.displayName?.text || place.displayName || '장소'}
              onClick={(e) => {
                // 이벤트 전파 중단은 AdvancedMarker에서 자동으로 처리되지 않을 수 있음
                if (onSelectPlace) onSelectPlace(place);
              }}
            >
              <img 
                src={'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 0C11.163 0 4 7.163 4 16C4 26 20 40 20 40C20 40 36 26 36 16C36 7.163 28.837 0 20 0Z" fill="#4285F4" stroke="#C5221F" stroke-width="1"/>
                    <circle cx="20" cy="16" r="6" fill="white"/>
                  </svg>
                `)}
                width={40}
                height={40}
              />
            </AdvancedMarker>
          )
        })}

      </GoogleMap>
    </div>
  )
}

export default Map