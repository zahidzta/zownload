import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      volver: "Back",
      cola: "Queue",
      cancelar: "Cancel",
      no_active_downloads: "No active downloads",
      item_progress: "Item {{index}}/{{total}}",
      eta: "ETA",
      history: "History",
      clear_history: "Clear History",
      no_history: "No history yet",
      redownload: "Redownload",
      various_artists: "Various Artists",
      elements_count: "ELEMENTS COUNT",
      tracks: "Tracks",
      format: "FORMAT",
      quality: "Quality",
      downloading: "Downloading...",
      download: "Download",
      tracks_in_list: "Tracks in list",
      enter_url: "Enter URL",
      mp3_audio: "MP3 (Audio)",
      mp4_video: "MP4 (Video)",
      error_analyze: "Could not analyze this URL.",
      error_generic: "Something went wrong.",
      analyzing: "Analyzing...",
      convert: "Convert",
    }
  },
  es: {
    translation: {
      volver: "Volver",
      cola: "Cola",
      cancelar: "Cancelar",
      no_active_downloads: "Sin descargas activas",
      item_progress: "Elemento {{index}}/{{total}}",
      eta: "Tiempo restante",
      history: "Historial",
      clear_history: "Borrar historial",
      no_history: "Sin historial",
      redownload: "Redescargar",
      various_artists: "Varios Artistas",
      elements_count: "CANT. ELEMENTOS",
      tracks: "Tracks",
      format: "FORMATO",
      quality: "Calidad",
      downloading: "Descargando...",
      download: "Descargar",
      tracks_in_list: "Tracks en la lista",
      enter_url: "Ingresa la URL",
      mp3_audio: "MP3 (Audio)",
      mp4_video: "MP4 (Video)",
      error_analyze: "No se pudo analizar esta URL.",
      error_generic: "Algo salió mal.",
      analyzing: "Analizando...",
      convert: "Convertir",
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    }
  });

export default i18n;
