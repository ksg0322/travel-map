// Google Places API 서비스
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

/**
 * 장소 텍스트 검색
 * @param {string} query - 검색어
 * @param {Object} location - 현재 위치 { lat, lng } (선택사항)
 * @param {string} language - 언어 코드
 * @returns {Promise<Array>} 검색 결과 배열
 */
export const searchPlaces = async (query, location = null, language = 'ko') => {
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

    // 위치가 제공되면 locationBias 추가
    if (location) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng
          },
          radius: 5000 // 5km 반경
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
    // 에러를 다시 throw하여 상위에서 처리할 수 있도록 함
    throw error
  }
}

/**
 * 현재 위치 기반 근접 장소 검색
 * @param {string} query - 검색어
 * @param {Object} location - 현재 위치 { lat, lng }
 * @param {number} radius - 검색 반경 (미터)
 * @param {string} language - 언어 코드
 * @returns {Promise<Array>} 검색 결과 배열
 */
export const searchNearbyPlaces = async (query, location, radius = 5000, language = 'ko') => {
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
 * 장소 상세 정보 조회
 * @param {string} placeId - 장소 ID
 * @param {string} language - 언어 코드
 * @returns {Promise<Object>} 장소 상세 정보
 */
export const getPlaceDetails = async (placeId, language = 'ko') => {
  if (!API_KEY) {
    console.error('Google Maps API 키가 설정되지 않았습니다.')
    return null
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}`
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,rating,userRatingCount,reviews,priceLevel,types,openingHours,websiteUri,phoneNumber',
        'Accept-Language': language
      }
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('Places API 오류:', error)
      throw new Error(error.error?.message || '장소 상세 정보 조회에 실패했습니다.')
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('장소 상세 정보 조회 오류:', error)
    return null
  }
}

