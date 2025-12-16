// Google Places API 서비스
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

/**
 * Google Maps 라이브러리가 로드되었는지 확인하는 헬퍼 함수
 */
const checkGoogleMapsLoaded = () => {
  return window.google && window.google.maps && 
         window.google.maps.Geocoder && 
         window.google.maps.DirectionsService &&
         window.google.maps.DistanceMatrixService
}

/**
 * 장소 텍스트 검색 (좌표 찾기용) - Places API (New) 사용 유지 (CORS 문제 없음)
 * @param {string} query - 검색어
 * @returns {Promise<Object>} 장소의 위치 정보 { lat, lng }
 */
export const searchLocationCoordinates = async (query) => {
  if (!API_KEY) return null

  try {
    const url = new URL('https://places.googleapis.com/v1/places:searchText')
    
    const requestBody = {
      textQuery: query,
      maxResultCount: 1,
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.location'
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()
    if (data.places && data.places.length > 0) {
      return data.places[0].location
    }
    return null
  } catch (error) {
    console.error('위치 검색 오류:', error)
    return null
  }
}

/**
 * 장소 자동완성 (Autocomplete) - Places API (New) 사용 유지 (CORS 문제 없음)
 * @param {string} input - 사용자 입력 텍스트
 * @param {Object} location - 중심 위치 (선택사항) { lat, lng }
 * @param {string} language - 언어 코드
 * @returns {Promise<Array>} 자동완성 제안 배열
 */
export const autocompletePlaces = async (input, location = null, language = 'ko') => {
  if (!API_KEY || !input || input.trim().length < 2) {
    return []
  }

  try {
    const url = new URL('https://places.googleapis.com/v1/places:autocomplete')
    
    const requestBody = {
      input: input.trim(),
      languageCode: language,
      includedRegionCodes: ['KR'], // 한국 지역 포함 (필요시 수정)
    }

    // 위치가 제공되면 locationBias 추가
    if (location && location.lat && location.lng) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng
          },
          radius: 50000 // 50km 반경
        }
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Autocomplete API 오류:', error)
      return []
    }

    const data = await response.json()
    return data.suggestions || []
  } catch (error) {
    console.error('자동완성 오류:', error)
    return []
  }
}

/**
 * 특정 카테고리(타입)의 주변 장소 검색 - Places API (New) 사용 유지 (CORS 문제 없음)
 * @param {string} categoryQuery - 검색 쿼리 (예: "Place to stay near ...")
 * @param {Object} center - 중심 좌표 { lat, lng }
 * @param {number} radius - 반경 (미터)
 * @param {number} minRating - 최소 평점
 * @param {string} type - 장소 타입 (UI 표시용)
 * @param {string} language - 언어 코드
 * @returns {Promise<Array>} 검색 결과 배열
 */
export const searchCategoryPlaces = async (categoryQuery, center, radius, minRating, type, language = 'ko') => {
  if (!API_KEY) return []

  try {
    const url = new URL('https://places.googleapis.com/v1/places:searchText')
    
    const requestBody = {
      textQuery: categoryQuery,
      // minRating: minRating, // 검색 결과 확보를 위해 API 레벨 필터링 해제
      languageCode: language,
      locationBias: {
        circle: {
          center: {
            latitude: center.latitude || center.lat,
            longitude: center.longitude || center.lng
          },
          radius: radius
        }
      },
      maxResultCount: 20 // 카테고리별 20개
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.googleMapsUri,places.types'
      },
      body: JSON.stringify(requestBody)
    })

    const data = await response.json()
    const places = data.places || []
    
    // UI 표시를 위해 type 추가하고 필터링 (평점이 없거나 기준 이상인 경우 포함)
    return places
      .filter(place => place.rating === undefined || place.rating === null || place.rating >= minRating)
      .map(place => ({ ...place, type }))
  } catch (error) {
    console.error(`${type} 검색 오류:`, error)
    return []
  }
}

/**
 * 장소 텍스트 검색 - Places API (New) 사용 유지 (CORS 문제 없음)
 * @param {string} query - 검색어
 * @param {Object} location - 현재 위치 { lat, lng } (선택사항)
 * @param {string} language - 언어 코드
 * @param {number} radius - 검색 반경 (미터, Sidebar에서 설정한 값 사용)
 * @returns {Promise<Array>} 검색 결과 배열
 */
export const searchPlaces = async (query, location = null, language, radius) => {
  if (!API_KEY) {
    console.error('Google Maps API 키가 설정되지 않았습니다.')
    return []
  }

  try {
    // Places API (New) Text Search 사용
    const url = new URL('https://places.googleapis.com/v1/places:searchText')
    
    const requestBody = {
      textQuery: query,
      maxResultCount: 10,
      languageCode: language,
    }

    // 위치가 제공되면 locationBias 추가 (radius도 필수)
    if (location && radius) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng
          },
          radius: radius // Sidebar에서 설정한 검색 반경 적용
        }
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText } }
      }
      console.error('Places API 오류:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      throw new Error(errorData.error?.message || `장소 검색에 실패했습니다. (${response.status})`)
    }

    const data = await response.json()
    console.log('Places API 응답:', data)
    return data.places || []
  } catch (error) {
    console.error('장소 검색 오류:', error)
    throw error
  }
}

/**
 * 현재 위치 기반 근접 장소 검색 - Places API (New) 사용 유지 (CORS 문제 없음)
 * @param {string} query - 검색어
 * @param {Object} location - 현재 위치 { lat, lng }
 * @param {number} radius - 검색 반경 (미터)
 * @param {string} language - 언어 코드
 * @returns {Promise<Array>} 검색 결과 배열
 */
export const searchNearbyPlaces = async (query, location, radius, language) => {
  if (!API_KEY) {
    console.error('Google Maps API 키가 설정되지 않았습니다.')
    return []
  }

  try {
    const url = new URL('https://places.googleapis.com/v1/places:searchNearby')
    
    const requestBody = {
      includedTypes: ['restaurant', 'cafe', 'tourist_attraction', 'lodging'],
      maxResultCount: 10,
      locationRestriction: {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng
          },
          radius: radius
        }
      },
      languageCode: language
    }

    // 쿼리가 있으면 텍스트 필터 추가
    if (query) {
      requestBody.textQuery = query
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.types'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Places API 오류:', error)
      throw new Error(error.error?.message || '근접 장소 검색에 실패했습니다.')
    }

    const data = await response.json()
    return data.places || []
  } catch (error) {
    console.error('근접 장소 검색 오류:', error)
    return []
  }
}

/**
 * 장소 상세 정보 조회 - Places API (New) 사용 유지 (CORS 문제 없음)
 * @param {string} placeId - 장소 ID
 * @param {string} language - 언어 코드
 * @returns {Promise<Object>} 장소 상세 정보
 */
export const getPlaceDetails = async (placeId, language) => {
  if (!API_KEY) {
    console.error('Google Maps API 키가 설정되지 않았습니다.')
    return null
  }

  try {
    // languageCode를 쿼리 파라미터로 추가
    const url = new URL(`https://places.googleapis.com/v1/places/${placeId}`)
    if (language) {
      url.searchParams.append('languageCode', language)
    }
    
    const fieldMask = [
      'id',
      'displayName',
      'formattedAddress',
      'location',
      'rating',
      'userRatingCount',
      'reviews',
      'priceLevel',
      'types',
      'currentOpeningHours',
      'websiteUri',
      'internationalPhoneNumber'
    ].join(',')
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': fieldMask
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Places API 오류:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      throw new Error(errorData.error?.message || `장소 상세 정보 조회에 실패했습니다. (${response.status})`)
    }

    const data = await response.json()
    console.log('장소 상세 정보:', data)
    return data
  } catch (error) {
    console.error('장소 상세 정보 조회 오류:', error)
    return null
  }
}

/**
 * Geocoding: 주소를 좌표로 변환 (JS Library 사용)
 * @param {string} address - 주소 문자열
 * @param {string} language - 언어 코드
 * @returns {Promise<Object|null>} 좌표 정보 { lat, lng, formattedAddress }
 */
export const geocodeAddress = async (address, language = 'ko') => {
  if (!checkGoogleMapsLoaded()) {
    console.warn('Google Maps Library not loaded yet')
    return null
  }

  return new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ address: address, language: language }, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        const result = results[0]
        const location = result.geometry.location
        resolve({
          lat: location.lat(),
          lng: location.lng(),
          formattedAddress: result.formatted_address,
          placeId: result.place_id,
          addressComponents: result.address_components
        })
      } else {
        console.warn('Geocoding 실패:', status)
        resolve(null)
      }
    })
  })
}

/**
 * Reverse Geocoding: 좌표를 주소로 변환 (JS Library 사용)
 * @param {number} lat - 위도
 * @param {number} lng - 경도
 * @param {string} language - 언어 코드
 * @returns {Promise<Object|null>} 주소 정보 { formattedAddress, addressComponents, placeId }
 */
export const reverseGeocode = async (lat, lng, language = 'ko') => {
  if (!checkGoogleMapsLoaded()) {
    console.warn('Google Maps Library not loaded yet')
    return null
  }

  return new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder()
    const latlng = { lat: parseFloat(lat), lng: parseFloat(lng) }
    
    geocoder.geocode({ location: latlng, language: language }, (results, status) => {
      if (status === 'OK' && results && results.length > 0) {
        const result = results[0]
        resolve({
          formattedAddress: result.formatted_address,
          addressComponents: result.address_components,
          placeId: result.place_id,
          location: {
            lat: lat,
            lng: lng
          }
        })
      } else {
        console.warn('Reverse Geocoding 실패:', status)
        resolve(null)
      }
    })
  })
}

/**
 * Directions API: 출발지와 목적지 간 경로 계산 (JS Library 사용)
 * @param {Object} origin - 출발지 좌표 { lat, lng }
 * @param {Object} destination - 목적지 좌표 { lat, lng }
 * @param {string} travelMode - 이동 수단 ('DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT')
 * @param {string} language - 언어 코드
 * @returns {Promise<Object|null>} 경로 정보
 */
export const getDirections = async (origin, destination, travelMode = 'DRIVING', language = 'ko') => {
  if (!checkGoogleMapsLoaded()) {
    console.warn('Google Maps Library not loaded yet')
    return null
  }

  return new Promise((resolve, reject) => {
    const directionsService = new window.google.maps.DirectionsService()
    
    // 좌표값을 숫자로 확실하게 변환하여 LatLngLiteral 객체 사용
    const originLat = typeof origin.lat === 'function' ? origin.lat() : Number(origin.lat)
    const originLng = typeof origin.lng === 'function' ? origin.lng() : Number(origin.lng)
    const destLat = typeof destination.lat === 'function' ? destination.lat() : Number(destination.lat)
    const destLng = typeof destination.lng === 'function' ? destination.lng() : Number(destination.lng)

    const request = {
      origin: { lat: originLat, lng: originLng },
      destination: { lat: destLat, lng: destLng },
      travelMode: window.google.maps.TravelMode[travelMode] || window.google.maps.TravelMode.DRIVING,
      language: language
    }

    directionsService.route(request, (result, status) => {
      if (status === 'OK' && result.routes && result.routes.length > 0) {
        const route = result.routes[0]
        const leg = route.legs[0]
        
        resolve({
          distance: {
            text: leg.distance.text,
            value: leg.distance.value // 미터
          },
          duration: {
            text: leg.duration.text,
            value: leg.duration.value // 초
          },
          // JS API에서 overview_polyline이 직접 문자열로 제공되지 않을 수 있으므로
          // overview_path(배열)가 있으면 이를 인코딩하여 문자열로 변환
          polyline: typeof route.overview_polyline === 'string' 
            ? route.overview_polyline 
            : (window.google.maps.geometry && window.google.maps.geometry.encoding 
                ? window.google.maps.geometry.encoding.encodePath(route.overview_path) 
                : ''),
          steps: leg.steps,
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          bounds: route.bounds
        })
      } else {
        console.warn('Directions Service 실패:', status)
        resolve(null)
      }
    })
  })
}

/**
 * Distance Matrix API: 여러 장소 간 거리 및 소요 시간 계산 (JS Library 사용)
 * @param {Array} origins - 출발지 배열 [{ lat, lng }, ...]
 * @param {Array} destinations - 목적지 배열 [{ lat, lng }, ...]
 * @param {string} travelMode - 이동 수단 ('DRIVING', 'WALKING', 'BICYCLING', 'TRANSIT')
 * @param {string} language - 언어 코드
 * @returns {Promise<Array|null>} 거리 및 시간 정보 배열
 */
export const getDistanceMatrix = async (origins, destinations, travelMode = 'DRIVING', language = 'ko') => {
  if (!checkGoogleMapsLoaded()) {
    console.warn('Google Maps Library not loaded yet')
    return null
  }

  return new Promise((resolve, reject) => {
    const service = new window.google.maps.DistanceMatrixService()
    
    // 좌표값을 숫자로 확실하게 변환하여 LatLngLiteral 객체 사용
    const originLocs = origins.map(o => ({
      lat: typeof o.lat === 'function' ? o.lat() : Number(o.lat),
      lng: typeof o.lng === 'function' ? o.lng() : Number(o.lng)
    }))
    const destLocs = destinations.map(d => ({
      lat: typeof d.lat === 'function' ? d.lat() : Number(d.lat),
      lng: typeof d.lng === 'function' ? d.lng() : Number(d.lng)
    }))

    service.getDistanceMatrix({
      origins: originLocs,
      destinations: destLocs,
      travelMode: window.google.maps.TravelMode[travelMode] || window.google.maps.TravelMode.DRIVING,
      language: language
    }, (response, status) => {
      if (status === 'OK' && response.rows) {
        const results = []
        response.rows.forEach((row, originIndex) => {
          row.elements.forEach((element, destIndex) => {
            if (element.status === 'OK') {
              results.push({
                originIndex,
                destinationIndex: destIndex, // 오타 수정 (destinationIndex)
                origin: origins[originIndex],
                destination: destinations[destIndex],
                distance: {
                  text: element.distance.text,
                  value: element.distance.value // 미터
                },
                duration: {
                  text: element.duration.text,
                  value: element.duration.value // 초
                },
                status: element.status
              })
            }
          })
        })
        resolve(results)
      } else {
        console.warn('Distance Matrix Service 실패:', status)
        resolve(null)
      }
    })
  })
}
