import './SearchResults.css'

const SearchResults = ({ results, onSelectPlace }) => {
  if (!results || results.length === 0) {
    return null
  }

  return (
    <div className="search-results-container">
      <div className="search-results-header">
        <h3>검색 결과 ({results.length})</h3>
      </div>
      <div className="search-results-list">
        {results.map((place, index) => (
          <div
            key={place.id || index}
            className="search-result-item"
            onClick={() => onSelectPlace && onSelectPlace(place)}
          >
            <div className="result-name">
              {place.displayName?.text || '이름 없음'}
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
    </div>
  )
}

export default SearchResults

