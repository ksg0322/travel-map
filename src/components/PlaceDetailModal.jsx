import { useTranslation } from 'react-i18next'
import './PlaceDetailModal.css'

const PlaceDetailModal = ({ place, onClose, onSave, isSaved = false }) => {
  const { t } = useTranslation()
  
  if (!place) return null

  return (
    <div className="place-detail-modal-overlay" onClick={onClose}>
      <div className="place-detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="place-detail-modal-close" onClick={onClose}>
          ✕
        </button>

        <div className="place-detail-content">
          <div className="place-detail-header">
            <h2 className="place-detail-title">
              {place.displayName?.text || place.displayName || '이름 없음'}
            </h2>
            {onSave && (
              <button 
                className={`place-detail-save-button ${isSaved ? 'saved' : ''}`}
                onClick={() => onSave(place)}
                disabled={isSaved}
                title={isSaved ? t('app.alreadySaved') : t('place.save')}
              >
                {isSaved ? `✓ ${t('place.saved')}` : `💾 ${t('place.save')}`}
              </button>
            )}
          </div>

          {place.formattedAddress && (
            <p className="place-detail-address">📍 {place.formattedAddress}</p>
          )}

          <div className="place-detail-details">
            {place.rating && (
              <span className="place-detail-rating">
                ⭐ {place.rating} {place.userRatingCount ? `(${place.userRatingCount}${t('place.reviewCount')})` : ''}
              </span>
            )}

            {place.priceLevel && (
              <span className="place-detail-price">
                💰 {place.priceLevel === 'PRICE_LEVEL_FREE' ? '무료' :
                     place.priceLevel === 'PRICE_LEVEL_INEXPENSIVE' ? '저렴함' :
                     place.priceLevel === 'PRICE_LEVEL_MODERATE' ? '보통' :
                     place.priceLevel === 'PRICE_LEVEL_EXPENSIVE' ? '비쌈' :
                     place.priceLevel === 'PRICE_LEVEL_VERY_EXPENSIVE' ? '매우 비쌈' :
                     place.priceLevel}
              </span>
            )}

            {place.type && place.type !== 'Place' && (
              <span className="place-detail-type">
                {place.type === 'Hotel' ? '🏨 ' :
                 place.type === 'Restaurant' ? '🍴 ' :
                 place.type === 'Tourist attraction' ? '⭐ ' : ''}
                {
                  place.type === 'Hotel' ? t('search.categories.hotel') :
                  place.type === 'Restaurant' ? t('search.categories.restaurant') :
                  place.type === 'Tourist attraction' ? t('search.categories.tourist attraction') :
                  place.type
                }
              </span>
            )}
          </div>

          {(place.internationalPhoneNumber || place.phoneNumber) && (
            <p className="place-detail-phone">
              📞 <a href={`tel:${place.internationalPhoneNumber || place.phoneNumber}`}>
                {place.internationalPhoneNumber || place.phoneNumber}
              </a>
            </p>
          )}

          {(place.currentOpeningHours || place.openingHours) && (
            <div className="place-detail-hours">
              {(() => {
                const hours = place.currentOpeningHours || place.openingHours
                return (
                  <>
                    {hours.openNow !== undefined && (
                      <p className="place-detail-open-now">
                        {hours.openNow ? `🟢 ${t('place.openNow')}` : `🔴 ${t('place.closed')}`}
                      </p>
                    )}
                    {hours.weekdayDescriptions && hours.weekdayDescriptions.length > 0 && (
                      <div className="place-detail-weekday">
                        {hours.weekdayDescriptions.map((desc, idx) => (
                          <p key={idx} className="place-detail-weekday-item">{desc}</p>
                        ))}
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}

          {place.reviews && place.reviews.length > 0 && (
            <div className="place-detail-reviews">
              <h3 className="place-detail-reviews-title">{t('place.reviews')} ({place.reviews.length})</h3>
              {place.reviews.slice(0, 3).map((review, idx) => (
                <div key={idx} className="place-detail-review-item">
                  <div className="place-detail-review-header">
                    <span className="place-detail-review-author">
                      {review.authorAttribution?.displayName || '익명'}
                    </span>
                    {review.rating && (
                      <span className="place-detail-review-rating">⭐ {review.rating}</span>
                    )}
                  </div>
                  {review.text?.text && (
                    <p className="place-detail-review-text">{review.text.text}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {place.types && place.types.length > 0 && (
            <div className="place-detail-types">
              {place.types.filter(type => !type.includes('establishment') && !type.includes('point_of_interest')).slice(0, 8).map((type, idx) => (
                <span key={idx} className="place-detail-type-tag">{type.replace(/_/g, ' ')}</span>
              ))}
            </div>
          )}

          <div className="place-detail-actions">
            {place.websiteUri && (
              <a href={place.websiteUri} target="_blank" rel="noopener noreferrer" className="place-detail-link">
                🌐 {t('place.website')}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlaceDetailModal


