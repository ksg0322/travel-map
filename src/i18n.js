import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  // i18next-http-backend
  // 번역 파일을 public/locales 경로에서 불러옵니다.
  .use(Backend)
  // i18next-browser-languagedetector
  // 브라우저 언어를 감지합니다.
  .use(LanguageDetector)
  // react-i18next
    // 리액트와 연결합니다.
  .use(initReactI18next)
  .init({
    fallbackLng: 'ko', // 기본 언어
    debug: true, // 개발 중에는 true로 설정하여 콘솔에서 디버깅 정보를 확인

    interpolation: {
      escapeValue: false, // React는 기본적으로 XSS를 방지하므로 escape 불필요
    },
    
    // 번역 파일 경로 설정 (기본값과 동일하지만 명시적으로 설정)
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // 지원하는 언어 목록
    supportedLngs: ['ko', 'en', 'ja', 'zh'],
    
    // 감지 옵션 설정
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'], // localStorage에 언어 설정 저장
    },
  });

export default i18n;