/**
 * TRIPVERSE GLOBAL LANGUAGE & LOCALIZATION (i18n) ENGINE
 * 
 * Provides instantaneous, zero-latency, 100% offline multilingual support for users worldwide.
 * Eliminates external API key dependencies, network lag, and subscription quotas by using
 * high-fidelity native translation dictionaries and locale auto-detection.
 */

import { useState, useEffect } from 'react';
import { LanguageCode, CurrencyCode } from '../types/trip';

export interface LanguageConfig {
  code: LanguageCode;
  name: string;        // English name: "Spanish", "Japanese"
  nativeName: string;  // Native representation: "Español", "日本語"
  flag: string;        // Emoji flag icon: "🇪🇸", "🇯🇵"
  dir: 'ltr' | 'rtl';
  defaultCurrency: CurrencyCode;
}

export const LANGUAGES: Record<LanguageCode, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    dir: 'ltr',
    defaultCurrency: 'USD'
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    dir: 'ltr',
    defaultCurrency: 'EUR'
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    dir: 'ltr',
    defaultCurrency: 'EUR'
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    dir: 'ltr',
    defaultCurrency: 'EUR'
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    flag: '🇯🇵',
    dir: 'ltr',
    defaultCurrency: 'JPY'
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    dir: 'ltr',
    defaultCurrency: 'INR'
  },
  zh: {
    code: 'zh',
    name: 'Chinese (Simplified)',
    nativeName: '中文',
    flag: '🇨🇳',
    dir: 'ltr',
    defaultCurrency: 'USD'
  },
  ar: {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇦🇪',
    dir: 'rtl',
    defaultCurrency: 'AED'
  },
  it: {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    flag: '🇮🇹',
    dir: 'ltr',
    defaultCurrency: 'EUR'
  },
  pt: {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    flag: '🇧🇷',
    dir: 'ltr',
    defaultCurrency: 'USD'
  }
};

export const STORAGE_KEY_LANGUAGE = 'tripverse_language';

/**
 * Native dictionary covering core app navigation, actions, planner forms, and welcome tours.
 */
export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    'nav.home': 'Home',
    'nav.plan': 'Plan Trip',
    'nav.destinations': 'Destinations',
    'nav.saved': 'Saved',
    'nav.myTrips': 'My Trips',
    'nav.deals': 'Live Deals',
    'nav.passes': 'Passes',
    'nav.search': 'Search...',
    'nav.signIn': 'Sign In',
    'nav.signOut': 'Sign Out',
    'nav.profile': 'Profile',
    'nav.pro': 'TripVerse Pro',
    'hero.title': 'Explore Any Destination Worldwide',
    'hero.subtitle': 'Instant personalized road trips, cultural gems, and real-time routes crafted by intelligence.',
    'cta.startPlanning': 'Plan My Trip',
    'cta.exploreDestinations': 'Explore Destinations',
    'welcome.title': 'Welcome to TripVerse',
    'welcome.chooseLanguage': 'Select Your Language & Region',
    'welcome.chooseLanguageDesc': 'Choose your preferred language and native currency for tailored travel intelligence.',
    'welcome.continue': 'Continue',
    'welcome.getStarted': 'Get Started',
    'common.currency': 'Currency',
    'common.language': 'Language',
    'common.budget': 'Budget',
    'common.duration': 'Duration',
    'common.days': 'Days',
    'common.travelers': 'Travelers',
    'common.loading': 'Crafting your journey...',
    'common.bookStay': 'Book Stay',
    'common.viewDetails': 'View Details',
    'common.share': 'Share Trip',
    'common.downloadPdf': 'Download Guide',
    'planner.destination': 'Where do you want to go?',
    'planner.origin': 'Starting from (City / Airport)',
    'planner.budget': 'Total Trip Budget',
    'planner.durationDays': 'Trip Duration (Days)',
    'planner.generate': 'Generate Smart Itinerary'
  },
  es: {
    'nav.home': 'Inicio',
    'nav.plan': 'Planear Viaje',
    'nav.destinations': 'Destinos',
    'nav.saved': 'Guardados',
    'nav.myTrips': 'Mis Viajes',
    'nav.deals': 'Ofertas en Vivo',
    'nav.passes': 'Pases',
    'nav.search': 'Buscar...',
    'nav.signIn': 'Iniciar Sesión',
    'nav.signOut': 'Cerrar Sesión',
    'nav.profile': 'Perfil',
    'nav.pro': 'TripVerse Pro',
    'hero.title': 'Explora Cualquier Destino del Mundo',
    'hero.subtitle': 'Viajes personalizados al instante, joyas culturales y rutas en tiempo real diseñadas con inteligencia.',
    'cta.startPlanning': 'Planear Mi Viaje',
    'cta.exploreDestinations': 'Explorar Destinos',
    'welcome.title': 'Bienvenido a TripVerse',
    'welcome.chooseLanguage': 'Selecciona tu Idioma y Región',
    'welcome.chooseLanguageDesc': 'Elige tu idioma preferido y moneda nativa para una experiencia de viaje personalizada.',
    'welcome.continue': 'Continuar',
    'welcome.getStarted': 'Comenzar',
    'common.currency': 'Moneda',
    'common.language': 'Idioma',
    'common.budget': 'Presupuesto',
    'common.duration': 'Duración',
    'common.days': 'Días',
    'common.travelers': 'Viajeros',
    'common.loading': 'Diseñando tu viaje...',
    'common.bookStay': 'Reservar Alojamiento',
    'common.viewDetails': 'Ver Detalles',
    'common.share': 'Compartir Viaje',
    'common.downloadPdf': 'Descargar Guía',
    'planner.destination': '¿A dónde quieres ir?',
    'planner.origin': 'Punto de partida (Ciudad / Aeropuerto)',
    'planner.budget': 'Presupuesto Total',
    'planner.durationDays': 'Duración del Viaje (Días)',
    'planner.generate': 'Generar Itinerario Inteligente'
  },
  fr: {
    'nav.home': 'Accueil',
    'nav.plan': 'Planifier',
    'nav.destinations': 'Destinations',
    'nav.saved': 'Enregistrés',
    'nav.myTrips': 'Mes Voyages',
    'nav.deals': 'Bons Plans',
    'nav.passes': 'Pass',
    'nav.search': 'Rechercher...',
    'nav.signIn': 'Connexion',
    'nav.signOut': 'Déconnexion',
    'nav.profile': 'Profil',
    'nav.pro': 'TripVerse Pro',
    'hero.title': "Explorez N'importe Quelle Destination",
    'hero.subtitle': 'Circuits personnalisés instantanés, trésors locaux et itinéraires en temps réel conçus par IA.',
    'cta.startPlanning': 'Planifier Mon Voyage',
    'cta.exploreDestinations': 'Explorer les Destinations',
    'welcome.title': 'Bienvenue sur TripVerse',
    'welcome.chooseLanguage': 'Sélectionnez Votre Langue & Région',
    'welcome.chooseLanguageDesc': 'Choisissez votre langue et votre devise pour une intelligence de voyage sur mesure.',
    'welcome.continue': 'Continuer',
    'welcome.getStarted': 'Démarrer',
    'common.currency': 'Devise',
    'common.language': 'Langue',
    'common.budget': 'Budget',
    'common.duration': 'Durée',
    'common.days': 'Jours',
    'common.travelers': 'Voyageurs',
    'common.loading': 'Création de votre voyage...',
    'common.bookStay': 'Réserver Hébergement',
    'common.viewDetails': 'Voir Détails',
    'common.share': 'Partager Voyage',
    'common.downloadPdf': 'Télécharger le Guide',
    'planner.destination': 'Où souhaitez-vous aller ?',
    'planner.origin': 'Point de départ (Ville / Aéroport)',
    'planner.budget': 'Budget Total du Voyage',
    'planner.durationDays': 'Durée du Séjour (Jours)',
    'planner.generate': 'Générer Itinéraire Intelligent'
  },
  de: {
    'nav.home': 'Startseite',
    'nav.plan': 'Reise planen',
    'nav.destinations': 'Reiseziele',
    'nav.saved': 'Gespeichert',
    'nav.myTrips': 'Meine Reisen',
    'nav.deals': 'Top-Angebote',
    'nav.passes': 'Pässe',
    'nav.search': 'Suchen...',
    'nav.signIn': 'Anmelden',
    'nav.signOut': 'Abmelden',
    'nav.profile': 'Profil',
    'nav.pro': 'TripVerse Pro',
    'hero.title': 'Entdecke jedes Reiseziel weltweit',
    'hero.subtitle': 'Individuelle Roadtrips, authentische Geheimtipps und Routen in Echtzeit.',
    'cta.startPlanning': 'Reise planen',
    'cta.exploreDestinations': 'Reiseziele entdecken',
    'welcome.title': 'Willkommen bei TripVerse',
    'welcome.chooseLanguage': 'Wähle deine Sprache & Region',
    'welcome.chooseLanguageDesc': 'Wähle deine bevorzugte Sprache und Währung für ein personalisiertes Reiseerlebnis.',
    'welcome.continue': 'Weiter',
    'welcome.getStarted': 'Jetzt starten',
    'common.currency': 'Währung',
    'common.language': 'Sprache',
    'common.budget': 'Budget',
    'common.duration': 'Dauer',
    'common.days': 'Tage',
    'common.travelers': 'Reisende',
    'common.loading': 'Reise wird erstellt...',
    'common.bookStay': 'Unterkunft buchen',
    'common.viewDetails': 'Details anzeigen',
    'common.share': 'Reise teilen',
    'common.downloadPdf': 'Reiseführer herunterladen',
    'planner.destination': 'Wohin möchtest du reisen?',
    'planner.origin': 'Startpunkt (Stadt / Flughafen)',
    'planner.budget': 'Gesamtbudget',
    'planner.durationDays': 'Reisedauer (Tage)',
    'planner.generate': 'Smart-Reiseroute generieren'
  },
  ja: {
    'nav.home': 'ホーム',
    'nav.plan': '旅行計画',
    'nav.destinations': '目的地',
    'nav.saved': '保存済み',
    'nav.myTrips': 'マイトリップ',
    'nav.deals': 'ライブディール',
    'nav.passes': 'パス',
    'nav.search': '検索...',
    'nav.signIn': 'ログイン',
    'nav.signOut': 'ログアウト',
    'nav.profile': 'プロフィール',
    'nav.pro': 'TripVerse Pro',
    'hero.title': '世界中のあらゆる目的地を探検',
    'hero.subtitle': 'AIが創るパーソナライズ旅行日程、地元の名店、リアルタイムルート。',
    'cta.startPlanning': '旅行を計画する',
    'cta.exploreDestinations': '目的地を見る',
    'welcome.title': 'TripVerseへようこそ',
    'welcome.chooseLanguage': '言語と地域を選択',
    'welcome.chooseLanguageDesc': '旅行体験に合わせたご希望の言語と通貨を選択してください。',
    'welcome.continue': '次へ',
    'welcome.getStarted': 'はじめる',
    'common.currency': '通貨',
    'common.language': '言語',
    'common.budget': '予算',
    'common.duration': '期間',
    'common.days': '日間',
    'common.travelers': '旅行者数',
    'common.loading': '旅程を作成中...',
    'common.bookStay': '宿泊を予約',
    'common.viewDetails': '詳細を見る',
    'common.share': '旅程を共有',
    'common.downloadPdf': 'ガイドを保存',
    'planner.destination': 'どちらへ行きますか？',
    'planner.origin': '出発地（都市または空港）',
    'planner.budget': '総予算',
    'planner.durationDays': '旅行期間（日数）',
    'planner.generate': 'スマート旅程を生成'
  },
  hi: {
    'nav.home': 'होम',
    'nav.plan': 'ट्रिप प्लान करें',
    'nav.destinations': 'गंतव्य',
    'nav.saved': 'सहेजे गए',
    'nav.myTrips': 'मेरी ट्रिप्स',
    'nav.deals': 'लाइव डील्स',
    'nav.passes': 'पासेस',
    'nav.search': 'खोजें...',
    'nav.signIn': 'साइन इन',
    'nav.signOut': 'साइन आउट',
    'nav.profile': 'प्रोफ़ाइल',
    'nav.pro': 'TripVerse प्रो',
    'hero.title': 'दुनिया के किसी भी गंतव्य को एक्सप्लोर करें',
    'hero.subtitle': 'स्मार्ट इंटेलिजेंस द्वारा तैयार व्यक्तिगत यात्रा कार्यक्रम, स्थानीय रत्न और रीयल-टाइम मार्ग।',
    'cta.startPlanning': 'मेरी ट्रिप प्लान करें',
    'cta.exploreDestinations': 'गंतव्य देखें',
    'welcome.title': 'TripVerse में आपका स्वागत है',
    'welcome.chooseLanguage': 'अपनी भाषा और क्षेत्र चुनें',
    'welcome.chooseLanguageDesc': 'सर्वश्रेष्ठ यात्रा अनुभव के लिए अपनी पसंदीदा भाषा और मुद्रा चुनें।',
    'welcome.continue': 'आगे बढ़ें',
    'welcome.getStarted': 'शुरू करें',
    'common.currency': 'मुद्रा',
    'common.language': 'भाषा',
    'common.budget': 'बजट',
    'common.duration': 'अवधि',
    'common.days': 'दिन',
    'common.travelers': 'यात्री',
    'common.loading': 'आपकी यात्रा तैयार हो रही है...',
    'common.bookStay': 'होटल बुक करें',
    'common.viewDetails': 'विवरण देखें',
    'common.share': 'ट्रिप साझा करें',
    'common.downloadPdf': 'गाइड डाउनलोड करें',
    'planner.destination': 'आप कहाँ जाना चाहते हैं?',
    'planner.origin': 'प्रस्थान स्थान (शहर / हवाई अड्डा)',
    'planner.budget': 'कुल ट्रिप बजट',
    'planner.durationDays': 'यात्रा अवधि (दिन)',
    'planner.generate': 'स्मार्ट यात्रा कार्यक्रम बनाएं'
  },
  zh: {
    'nav.home': '首页',
    'nav.plan': '规划行程',
    'nav.destinations': '目的地',
    'nav.saved': '已收藏',
    'nav.myTrips': '我的行程',
    'nav.deals': '特惠精选',
    'nav.passes': '通行证',
    'nav.search': '搜索...',
    'nav.signIn': '登录',
    'nav.signOut': '退出登录',
    'nav.profile': '个人主页',
    'nav.pro': 'TripVerse Pro',
    'hero.title': '探索全球任何目的地',
    'hero.subtitle': '智能生成专属个性化自驾行程、地道风味与实时路线规划。',
    'cta.startPlanning': '规划我的旅行',
    'cta.exploreDestinations': '探索目的地',
    'welcome.title': '欢迎使用 TripVerse',
    'welcome.chooseLanguage': '选择您的语言与地区',
    'welcome.chooseLanguageDesc': '选择您喜好的语言与币种，享受定制化的智能旅行体验。',
    'welcome.continue': '继续',
    'welcome.getStarted': '立即开始',
    'common.currency': '货币',
    'common.language': '语言',
    'common.budget': '预算',
    'common.duration': '行程天数',
    'common.days': '天',
    'common.travelers': '出行人数',
    'common.loading': '正在为您定制专属旅程...',
    'common.bookStay': '预订住宿',
    'common.viewDetails': '查看详情',
    'common.share': '分享行程',
    'common.downloadPdf': '下载行程指南',
    'planner.destination': '您想去哪里？',
    'planner.origin': '出发地（城市 / 机场）',
    'planner.budget': '总预算',
    'planner.durationDays': '行程天数',
    'planner.generate': '生成智能行程'
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.plan': 'تخطيط رحلة',
    'nav.destinations': 'الوجهات',
    'nav.saved': 'المحفوظات',
    'nav.myTrips': 'رحلاتي',
    'nav.deals': 'العروض الحية',
    'nav.passes': 'التذاكر',
    'nav.search': 'بحث...',
    'nav.signIn': 'تسجيل الدخول',
    'nav.signOut': 'تسجيل الخروج',
    'nav.profile': 'الملف الشخصي',
    'nav.pro': 'TripVerse Pro',
    'hero.title': 'استكشف أي وجهة حول العالم',
    'hero.subtitle': 'رحلات مخصصة فورية، وجواهر ثقافية محلية ومسارات حية بالذكاء الاصطناعي.',
    'cta.startPlanning': 'خطط لرحلتي',
    'cta.exploreDestinations': 'استكشف الوجهات',
    'welcome.title': 'مرحبًا بك في TripVerse',
    'welcome.chooseLanguage': 'حدد لغتك ومنطقتك',
    'welcome.chooseLanguageDesc': 'اختر لغتك المفضلة وعملتك الأصلية لتجربة سفر مخصصة بالكامل.',
    'welcome.continue': 'متابعة',
    'welcome.getStarted': 'ابدأ الآن',
    'common.currency': 'العملة',
    'common.language': 'اللغة',
    'common.budget': 'الميزانية',
    'common.duration': 'المدة',
    'common.days': 'أيام',
    'common.travelers': 'المسافرون',
    'common.loading': 'جاري تصميم رحلتك...',
    'common.bookStay': 'حجز الإقامة',
    'common.viewDetails': 'عرض التفاصيل',
    'common.share': 'مشاركة الرحلة',
    'common.downloadPdf': 'تحميل الدليل',
    'planner.destination': 'إلى أين تريد الذهاب؟',
    'planner.origin': 'نقطة الانطلاق (المدينة / المطار)',
    'planner.budget': 'إجمالي الميزانية',
    'planner.durationDays': 'مدة الرحلة (بالأيام)',
    'planner.generate': 'إنشاء جدول الرحلة الذكي'
  },
  it: {
    'nav.home': 'Home',
    'nav.plan': 'Pianifica',
    'nav.destinations': 'Destinazioni',
    'nav.saved': 'Salvati',
    'nav.myTrips': 'I Miei Viaggi',
    'nav.deals': 'Offerte Live',
    'nav.passes': 'Pass',
    'nav.search': 'Cerca...',
    'nav.signIn': 'Accedi',
    'nav.signOut': 'Esci',
    'nav.profile': 'Profilo',
    'nav.pro': 'TripVerse Pro',
    'hero.title': 'Esplora Qualsiasi Destinazione nel Mondo',
    'hero.subtitle': 'Itinerari personalizzati immediati, gemme locali e percorsi in tempo reale guidati dall’AI.',
    'cta.startPlanning': 'Pianifica Viaggio',
    'cta.exploreDestinations': 'Esplora Destinazioni',
    'welcome.title': 'Benvenuto su TripVerse',
    'welcome.chooseLanguage': 'Seleziona Lingua e Regione',
    'welcome.chooseLanguageDesc': 'Scegli la tua lingua e valuta preferita per un’esperienza su misura.',
    'welcome.continue': 'Continua',
    'welcome.getStarted': 'Inizia',
    'common.currency': 'Valuta',
    'common.language': 'Lingua',
    'common.budget': 'Budget',
    'common.duration': 'Durata',
    'common.days': 'Giorni',
    'common.travelers': 'Viaggiatori',
    'common.loading': 'Creazione del tuo viaggio...',
    'common.bookStay': 'Prenota Soggiorno',
    'common.viewDetails': 'Visualizza Dettagli',
    'common.share': 'Condividi Viaggio',
    'common.downloadPdf': 'Scarica Guida',
    'planner.destination': 'Dove vuoi andare?',
    'planner.origin': 'Partenza da (Città / Aeroporto)',
    'planner.budget': 'Budget Totale',
    'planner.durationDays': 'Durata (Giorni)',
    'planner.generate': 'Genera Itinerario Smart'
  },
  pt: {
    'nav.home': 'Início',
    'nav.plan': 'Planejar Viagem',
    'nav.destinations': 'Destinos',
    'nav.saved': 'Salvos',
    'nav.myTrips': 'Minhas Viagens',
    'nav.deals': 'Ofertas ao Vivo',
    'nav.passes': 'Passes',
    'nav.search': 'Pesquisar...',
    'nav.signIn': 'Entrar',
    'nav.signOut': 'Sair',
    'nav.profile': 'Perfil',
    'nav.pro': 'TripVerse Pro',
    'hero.title': 'Explore Qualquer Destino do Mundo',
    'hero.subtitle': 'Roteiros personalizados na hora, joias culturais e rotas em tempo real com inteligência artificial.',
    'cta.startPlanning': 'Planejar Minha Viagem',
    'cta.exploreDestinations': 'Explorar Destinos',
    'welcome.title': 'Bem-vindo ao TripVerse',
    'welcome.chooseLanguage': 'Selecione Seu Idioma & Região',
    'welcome.chooseLanguageDesc': 'Escolha seu idioma e moeda preferidos para uma inteligência de viagem personalizada.',
    'welcome.continue': 'Continuar',
    'welcome.getStarted': 'Começar',
    'common.currency': 'Moeda',
    'common.language': 'Idioma',
    'common.budget': 'Orçamento',
    'common.duration': 'Duração',
    'common.days': 'Dias',
    'common.travelers': 'Viajantes',
    'common.loading': 'Montando sua viagem...',
    'common.bookStay': 'Reservar Hospedagem',
    'common.viewDetails': 'Ver Detalhes',
    'common.share': 'Compartilhar Viagem',
    'common.downloadPdf': 'Baixar Guia',
    'planner.destination': 'Para onde deseja ir?',
    'planner.origin': 'Ponto de partida (Cidade / Aeroporto)',
    'planner.budget': 'Orçamento Total',
    'planner.durationDays': 'Duração da Viagem (Dias)',
    'planner.generate': 'Gerar Roteiro Inteligente'
  }
};

/**
 * Automatically detects the ideal starting language based on the user's browser navigator locale.
 */
export function detectDefaultLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const browserLangs = navigator.languages || [navigator.language || ''];
    const lower = browserLangs.join(',').toLowerCase();

    if (lower.startsWith('es') || lower.includes(',es')) return 'es';
    if (lower.startsWith('fr') || lower.includes(',fr')) return 'fr';
    if (lower.startsWith('de') || lower.includes(',de')) return 'de';
    if (lower.startsWith('ja') || lower.includes(',ja')) return 'ja';
    if (lower.startsWith('hi') || lower.includes(',hi')) return 'hi';
    if (lower.startsWith('zh') || lower.includes(',zh')) return 'zh';
    if (lower.startsWith('ar') || lower.includes(',ar')) return 'ar';
    if (lower.startsWith('it') || lower.includes(',it')) return 'it';
    if (lower.startsWith('pt') || lower.includes(',pt')) return 'pt';
  } catch {
    // Default fallback
  }
  return 'en';
}

/**
 * Returns the currently active language code from storage or auto-detection.
 */
export function getActiveLanguage(): LanguageCode {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANGUAGE);
    if (saved && (saved in LANGUAGES)) {
      return saved as LanguageCode;
    }
  } catch {
    // Storage access issue fallback
  }
  return detectDefaultLanguage();
}

/**
 * Sets the active language, persists to storage, updates document tags, and dispatches global event.
 */
export function setActiveLanguage(lang: LanguageCode): void {
  if (typeof window === 'undefined') return;
  try {
    if (!(lang in LANGUAGES)) lang = 'en';
    localStorage.setItem(STORAGE_KEY_LANGUAGE, lang);

    const config = LANGUAGES[lang];
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = lang;
      document.documentElement.dir = config.dir;
    }

    window.dispatchEvent(new CustomEvent('tripverse_language_change', { detail: lang }));
  } catch (e) {
    console.warn('Could not persist language preference:', e);
  }
}

/**
 * Instant translation lookup with graceful fallback to English and raw key.
 */
export function t(key: string, lang?: LanguageCode): string {
  const currentLang = lang || getActiveLanguage();
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  if (dict && dict[key]) {
    return dict[key];
  }
  const enDict = TRANSLATIONS.en;
  if (enDict && enDict[key]) {
    return enDict[key];
  }
  return key;
}

/**
 * Reactive React Hook for components needing real-time updates when language changes.
 */
export function useLanguage() {
  const [language, setLanguageState] = useState<LanguageCode>(getActiveLanguage());

  useEffect(() => {
    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<LanguageCode>;
      if (customEvent.detail && customEvent.detail in LANGUAGES) {
        setLanguageState(customEvent.detail);
      } else {
        setLanguageState(getActiveLanguage());
      }
    };

    window.addEventListener('tripverse_language_change', handleLangChange);
    return () => window.removeEventListener('tripverse_language_change', handleLangChange);
  }, []);

  const changeLanguage = (newLang: LanguageCode) => {
    setActiveLanguage(newLang);
    setLanguageState(newLang);
  };

  return {
    language,
    setLanguage: changeLanguage,
    t: (key: string) => t(key, language),
    languages: LANGUAGES,
    currentConfig: LANGUAGES[language] || LANGUAGES.en
  };
}
