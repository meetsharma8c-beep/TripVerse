/**
 * TRIPVERSE GLOBAL LANGUAGE & LOCALIZATION (i18n) ENGINE
 *
 * Provides fast multilingual support with on-demand locale code-splitting:
 * - English UI keys (~13 KB) load immediately for 0ms initial paint.
 * - Full per-language translation & phrase bundles load asynchronously when
 *   a non-English language is selected or restored.
 */

import { useState, useEffect } from 'react';
import { LanguageCode, CurrencyCode } from '../types/trip';
import { EN_TRANSLATIONS } from './locales/en-keys';
import { DYNAMIC_PATTERNS, type LocaleBundle } from './locales/types';

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

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: EN_TRANSLATIONS,
  es: {},
  fr: {},
  de: {},
  ja: {},
  hi: {},
  zh: {},
  ar: {},
  it: {},
  pt: {}
};

const LOCALE_BUNDLES: Partial<Record<LanguageCode, LocaleBundle>> = {};
const IN_FLIGHT_LOADS: Partial<Record<LanguageCode, Promise<LocaleBundle>>> = {};
const COMPILED_DYNAMIC_PATTERNS: RegExp[] = DYNAMIC_PATTERNS.map(
  (spec) => new RegExp(spec.source, spec.flags)
);

async function importLocaleModule(lang: LanguageCode): Promise<{ default: LocaleBundle }> {
  switch (lang) {
    case 'en': return import('./locales/en');
    case 'es': return import('./locales/es');
    case 'fr': return import('./locales/fr');
    case 'de': return import('./locales/de');
    case 'ja': return import('./locales/ja');
    case 'hi': return import('./locales/hi');
    case 'zh': return import('./locales/zh');
    case 'ar': return import('./locales/ar');
    case 'it': return import('./locales/it');
    case 'pt': return import('./locales/pt');
  }
}

// In-memory universal reverse lookup map: Any loaded language text -> canonical dictionary key
let globalValueToKeyMap: Map<string, string> | null = null;

/**
 * Lazily loads the translation dictionary & phrase pack for a language into memory.
 */
export async function ensureLocaleLoaded(lang: LanguageCode): Promise<LocaleBundle> {
  if (LOCALE_BUNDLES[lang]) {
    return LOCALE_BUNDLES[lang]!;
  }
  const existingPromise = IN_FLIGHT_LOADS[lang];
  if (existingPromise) {
    return existingPromise;
  }

  const loadPromise = importLocaleModule(lang)
    .then((mod) => {
      const bundle = mod.default;
      LOCALE_BUNDLES[lang] = bundle;
      TRANSLATIONS[lang] = bundle.translations;
      globalValueToKeyMap = null;
      delete IN_FLIGHT_LOADS[lang];

      if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tripverse_language_loaded', { detail: lang }));
      }
      return bundle;
    })
    .catch((err) => {
      delete IN_FLIGHT_LOADS[lang];
      throw err;
    });

  IN_FLIGHT_LOADS[lang] = loadPromise;
  return loadPromise;
}

/**
 * Preloads all 10 language bundles (used by tests or offline warmups).
 */
export async function preloadAllLocales(): Promise<void> {
  const langs = Object.keys(LANGUAGES) as LanguageCode[];
  await Promise.all(langs.map((code) => ensureLocaleLoaded(code)));
}

export function getGlobalValueToKeyMap(): Map<string, string> {
  if (!globalValueToKeyMap) {
    globalValueToKeyMap = new Map<string, string>();
    for (const lang of Object.keys(TRANSLATIONS) as LanguageCode[]) {
      const dict = TRANSLATIONS[lang];
      if (dict) {
        for (const [k, v] of Object.entries(dict)) {
          if (typeof v === 'string' && v.trim()) {
            globalValueToKeyMap.set(v.toLowerCase().trim(), k.toLowerCase().trim());
          }
        }
      }
    }
    for (const lang of Object.keys(LOCALE_BUNDLES) as LanguageCode[]) {
      const phrases = LOCALE_BUNDLES[lang]?.phrases;
      if (phrases) {
        for (const [k, val] of Object.entries(phrases)) {
          const normKey = k.toLowerCase().trim();
          globalValueToKeyMap.set(normKey, normKey);
          if (typeof val === 'string' && val.trim()) {
            globalValueToKeyMap.set(val.toLowerCase().trim(), normKey);
          }
        }
      }
    }
  }
  return globalValueToKeyMap;
}

/**
 * Universal Brand Invariance Enforcer:
 * Guarantees that "TripVerse" (including common case variations, typos like "Tipverse",
 * or non-Latin transliterations) is ALWAYS preserved identically as "TripVerse".
 */
export function enforceBrandInvariance(text: string): string {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\b(?:tripverse|tipverse|trip\s+verse)\b/gi, 'TripVerse')
    .replace(/ट्रिपवर्स/g, 'TripVerse');
}

/**
 * Universal phrase & arbitrary text translation engine.
 * Converts raw English UI strings, category names, badges, or sentences into the target language.
 */
export function translateText(rawText: string, targetLang?: LanguageCode): string {
  if (!rawText || typeof rawText !== 'string') return rawText;
  const lang = targetLang || getActiveLanguage();

  const leadingWhitespace = rawText.match(/^\s*/)?.[0] || '';
  const trailingWhitespace = rawText.match(/\s*$/)?.[0] || '';
  const normalized = rawText.trim();
  if (!normalized) return rawText;
  const lower = normalized.toLowerCase();

  // 0. Brand invariance
  if (/^(?:tripverse|tipverse|trip\s+verse)$/i.test(lower)) {
    return leadingWhitespace + 'TripVerse' + trailingWhitespace;
  }

  const localeBundle = LOCALE_BUNDLES[lang];

  // If requesting English, restore canonical English if previously translated
  if (lang === 'en') {
    const revKey = getGlobalValueToKeyMap().get(lower);
    if (revKey) {
      const enPhrase = LOCALE_BUNDLES.en?.phrases?.[revKey];
      if (enPhrase) {
        return leadingWhitespace + enforceBrandInvariance(enPhrase) + trailingWhitespace;
      }
      if (TRANSLATIONS.en?.[revKey]) {
        return leadingWhitespace + enforceBrandInvariance(TRANSLATIONS.en[revKey]) + trailingWhitespace;
      }
    }
    return enforceBrandInvariance(rawText);
  }

  // Trigger background fetch if this non-English locale hasn't loaded yet
  if (!localeBundle && typeof window !== 'undefined') {
    void ensureLocaleLoaded(lang).then(() => localizeDom(lang)).catch(() => {});
  }

  // 1. Check exact dictionary match by key or loaded phrase pack
  const dict = TRANSLATIONS[lang];
  if (dict && dict[normalized]) {
    return leadingWhitespace + enforceBrandInvariance(dict[normalized]) + trailingWhitespace;
  }
  const directPhrase = localeBundle?.phrases?.[lower];
  if (directPhrase) {
    return leadingWhitespace + enforceBrandInvariance(directPhrase) + trailingWhitespace;
  }

  // 1a. Quotes wrapper
  const quoteMatch = normalized.match(/^["'“”](.+)["'“”]$/);
  if (quoteMatch) {
    const inner = translateText(quoteMatch[1], lang);
    return leadingWhitespace + `"${inner}"` + trailingWhitespace;
  }

  // 1a0. Leading / Trailing Emoji extraction
  const emojiLeadingMatch = normalized.match(/^([\p{Extended_Pictographic}\u2600-\u27BF\uE000-\uF8FF]+[\s\uFE0E\uFE0F]*)\s*(.+)$/u);
  if (emojiLeadingMatch) {
    const inner = translateText(emojiLeadingMatch[2], lang);
    if (inner && inner !== emojiLeadingMatch[2]) {
      return leadingWhitespace + `${emojiLeadingMatch[1]} ${inner}` + trailingWhitespace;
    }
  }
  const emojiTrailingMatch = normalized.match(/^(.+?)\s*([\p{Extended_Pictographic}\u2600-\u27BF\uE000-\uF8FF]+[\s\uFE0E\uFE0F]*)$/u);
  if (emojiTrailingMatch) {
    const inner = translateText(emojiTrailingMatch[1], lang);
    if (inner && inner !== emojiTrailingMatch[1]) {
      return leadingWhitespace + `${inner} ${emojiTrailingMatch[2]}` + trailingWhitespace;
    }
  }

  // 1b. Leading/trailing arrows & bullets
  const arrowBackMatch = normalized.match(/^([←<‹])\s+(.+)$/);
  if (arrowBackMatch) {
    const inner = translateText(arrowBackMatch[2], lang);
    return leadingWhitespace + `${arrowBackMatch[1]} ${inner}` + trailingWhitespace;
  }
  const arrowForwardMatch = normalized.match(/^(.+?)\s*([→↗>›])$/);
  if (arrowForwardMatch) {
    const inner = translateText(arrowForwardMatch[1], lang);
    return leadingWhitespace + `${inner} ${arrowForwardMatch[2]}` + trailingWhitespace;
  }
  const bulletMatch = normalized.match(/^([•*\-·]+)\s+(.+)$/);
  if (bulletMatch) {
    const inner = translateText(bulletMatch[2], lang);
    return leadingWhitespace + `${bulletMatch[1]} ${inner}` + trailingWhitespace;
  }

  // 1c. Suffix with parentheses count
  const parenSuffixMatch = normalized.match(/^([^(]+?)\s*(\([0-9\sA-Za-z]+\))$/);
  if (parenSuffixMatch) {
    const baseTr = translateText(parenSuffixMatch[1], lang);
    if (baseTr !== parenSuffixMatch[1]) {
      return leadingWhitespace + `${baseTr} ${parenSuffixMatch[2]}` + trailingWhitespace;
    }
  }

  // 1d. Trailing colon, ellipsis, exclamation marks
  if (normalized.endsWith(':')) {
    const base = normalized.slice(0, -1).trim();
    const baseTr = translateText(base, lang);
    if (baseTr && baseTr !== base) {
      return leadingWhitespace + baseTr + ':' + trailingWhitespace;
    }
  }
  if (normalized.endsWith('...')) {
    const base = normalized.slice(0, -3).trim();
    const baseTr = translateText(base, lang);
    if (baseTr && baseTr !== base) {
      return leadingWhitespace + baseTr + '...' + trailingWhitespace;
    }
  }
  if (normalized.endsWith('!')) {
    const base = normalized.slice(0, -1).trim();
    const baseTr = translateText(base, lang);
    if (baseTr && baseTr !== base) {
      return leadingWhitespace + baseTr + '!' + trailingWhitespace;
    }
  }

  // 1e. Colon prefixes
  const colonPrefixMatch = normalized.match(/^([A-Za-z\s]+):\s*(.+)$/);
  if (colonPrefixMatch) {
    const pfxKey = colonPrefixMatch[1].trim().toLowerCase();
    const pfxTr = localeBundle?.phrases?.[pfxKey] || (dict && dict[pfxKey]);
    if (pfxTr) {
      const restTr = translateText(colonPrefixMatch[2], lang);
      return leadingWhitespace + `${pfxTr}: ${restTr}` + trailingWhitespace;
    }
  }

  // 2. Direct phrase fallback
  if (directPhrase) {
    return leadingWhitespace + directPhrase + trailingWhitespace;
  }

  // 3. Reverse lookup across loaded bundles
  const revKey = getGlobalValueToKeyMap().get(lower);
  if (revKey) {
    const revPhrase = localeBundle?.phrases?.[revKey];
    if (revPhrase) {
      return leadingWhitespace + enforceBrandInvariance(revPhrase) + trailingWhitespace;
    }
    if (dict && dict[revKey]) {
      return leadingWhitespace + enforceBrandInvariance(dict[revKey]) + trailingWhitespace;
    }
  }

  // 4. Token-based dynamic replacement
  let translated = normalized;
  const dynamicReplacements = localeBundle?.dynamicReplacements;
  if (dynamicReplacements) {
    for (let i = 0; i < COMPILED_DYNAMIC_PATTERNS.length; i++) {
      const replacement = dynamicReplacements[i];
      if (replacement) {
        translated = translated.replace(COMPILED_DYNAMIC_PATTERNS[i], replacement);
      }
    }
  }

  return leadingWhitespace + enforceBrandInvariance(translated) + trailingWhitespace;
}

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
 * Sets the active language, persists to storage, lazy-loads the locale chunk, and dispatches global event.
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

    if (lang !== 'en') {
      void ensureLocaleLoaded('en').catch(() => {});
    }
    if (!LOCALE_BUNDLES[lang] && lang !== 'en') {
      void ensureLocaleLoaded(lang)
        .then(() => {
          localizeDom(lang);
        })
        .catch(() => {});
    } else {
      setTimeout(() => {
        localizeDom(lang);
      }, 10);
    }
  } catch (e) {
    console.warn('Could not persist language preference:', e);
  }
}

/**
 * Instant translation lookup with graceful fallback to Universal Phrase Engine and English,
 * with optional dynamic parameter interpolation (e.g. {current}, {total}, {count}).
 */
export function t(
  key: string,
  langOrParams?: LanguageCode | Record<string, string | number>,
  maybeParams?: Record<string, string | number>
): string {
  let currentLang: LanguageCode;
  let params: Record<string, string | number> | undefined;

  if (typeof langOrParams === 'string' && (langOrParams in LANGUAGES)) {
    currentLang = langOrParams as LanguageCode;
    params = maybeParams;
  } else if (langOrParams && typeof langOrParams === 'object') {
    currentLang = getActiveLanguage();
    params = langOrParams;
  } else {
    currentLang = getActiveLanguage();
    params = maybeParams;
  }

  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  let text = dict && dict[key] ? dict[key] : (TRANSLATIONS.en && TRANSLATIONS.en[key] ? TRANSLATIONS.en[key] : '');

  if (!text) {
    text = translateText(key, currentLang);
  } else if (currentLang !== 'en' && !LOCALE_BUNDLES[currentLang] && typeof window !== 'undefined') {
    void ensureLocaleLoaded(currentLang).catch(() => {});
  }

  if (params) {
    for (const [pKey, pVal] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
    }
  }

  return text || key;
}

/**
 * Reactive React Hook for components needing real-time updates when language changes or finishes loading.
 */
export function useLanguage() {
  const [language, setLanguageState] = useState<LanguageCode>(getActiveLanguage());
  const [, setLocaleRevision] = useState(0);

  useEffect(() => {
    const active = getActiveLanguage();
    if (active !== 'en' && !LOCALE_BUNDLES[active]) {
      void ensureLocaleLoaded(active)
        .then(() => setLocaleRevision((r) => r + 1))
        .catch(() => {});
    }

    const handleLangChange = (e: Event) => {
      const customEvent = e as CustomEvent<LanguageCode>;
      if (customEvent.detail && customEvent.detail in LANGUAGES) {
        setLanguageState(customEvent.detail);
      } else {
        setLanguageState(getActiveLanguage());
      }
    };

    const handleLocaleLoaded = () => {
      setLocaleRevision((r) => r + 1);
    };

    window.addEventListener('tripverse_language_change', handleLangChange);
    window.addEventListener('tripverse_language_loaded', handleLocaleLoaded);
    return () => {
      window.removeEventListener('tripverse_language_change', handleLangChange);
      window.removeEventListener('tripverse_language_loaded', handleLocaleLoaded);
    };
  }, []);

  const changeLanguage = (newLang: LanguageCode) => {
    setActiveLanguage(newLang);
    setLanguageState(newLang);
  };

  return {
    language,
    setLanguage: changeLanguage,
    t: (key: string, params?: Record<string, string | number>) => t(key, language, params),
    translate: (rawText: string) => translateText(rawText, language),
    languages: LANGUAGES,
    currentConfig: LANGUAGES[language] || LANGUAGES.en
  };
}

/**
 * Global DOM Auto-Localization Observer.
 */
const originalNodeTextMap = new WeakMap<Node, string>();
const appliedNodeTextMap = new WeakMap<Node, string>();
let domLocalizationObserver: MutationObserver | null = null;
let domLocalizationTimer: any = null;
let isLocalizingDom = false;

export function localizeDom(targetLang?: LanguageCode) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (isLocalizingDom) return;
  isLocalizingDom = true;
  try {
    const lang = targetLang || getActiveLanguage();

    const root = document.body;
    if (!root) return;

    // 1. Localize or restore Input & Textarea Placeholders
    try {
      const inputs = root.querySelectorAll('input[placeholder], textarea[placeholder]');
      inputs.forEach(el => {
        const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
        if (inputEl.closest('[data-no-translate], [translate="no"], .notranslate')) return;
        const currentPlaceholder = inputEl.placeholder;
        if (
          !(inputEl as any).__origPlaceholder ||
          ((inputEl as any).__appliedPlaceholder !== undefined && currentPlaceholder !== (inputEl as any).__appliedPlaceholder)
        ) {
          (inputEl as any).__origPlaceholder = translateText(currentPlaceholder, 'en') || currentPlaceholder;
        }
        const orig = (inputEl as any).__origPlaceholder;
        if (lang === 'en') {
          if (orig && inputEl.placeholder !== orig) {
            inputEl.placeholder = orig;
          }
          (inputEl as any).__appliedPlaceholder = inputEl.placeholder;
        } else {
          const tr = translateText(orig, lang);
          if (tr && tr !== orig && inputEl.placeholder !== tr) {
            inputEl.placeholder = tr;
          }
          (inputEl as any).__appliedPlaceholder = inputEl.placeholder;
        }
      });
    } catch {}

    // 2. Localize or restore Tooltip Titles
    try {
      const titledEls = root.querySelectorAll('[title]');
      titledEls.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.closest('[data-no-translate], [translate="no"], .notranslate')) return;
        const currentTitle = htmlEl.title;
        if (
          !(htmlEl as any).__origTitle ||
          ((htmlEl as any).__appliedTitle !== undefined && currentTitle !== (htmlEl as any).__appliedTitle)
        ) {
          (htmlEl as any).__origTitle = translateText(currentTitle, 'en') || currentTitle;
        }
        const orig = (htmlEl as any).__origTitle;
        if (lang === 'en') {
          if (orig && htmlEl.title !== orig) {
            htmlEl.title = orig;
          }
          (htmlEl as any).__appliedTitle = htmlEl.title;
        } else {
          const tr = translateText(orig, lang);
          if (tr && tr !== orig && htmlEl.title !== tr) {
            htmlEl.title = tr;
          }
          (htmlEl as any).__appliedTitle = htmlEl.title;
        }
      });
    } catch {}

    // 3. Localize or restore Accessible Aria Labels
    try {
      const ariaEls = root.querySelectorAll('[aria-label]');
      ariaEls.forEach(el => {
        const htmlEl = el as HTMLElement;
        if (htmlEl.closest('[data-no-translate], [translate="no"], .notranslate')) return;
        const currentAria = htmlEl.getAttribute('aria-label') || '';
        if (
          !(htmlEl as any).__origAriaLabel ||
          ((htmlEl as any).__appliedAriaLabel !== undefined && currentAria !== (htmlEl as any).__appliedAriaLabel)
        ) {
          (htmlEl as any).__origAriaLabel = translateText(currentAria, 'en') || currentAria;
        }
        const orig = (htmlEl as any).__origAriaLabel;
        if (lang === 'en') {
          if (orig && htmlEl.getAttribute('aria-label') !== orig) {
            htmlEl.setAttribute('aria-label', orig);
          }
          (htmlEl as any).__appliedAriaLabel = htmlEl.getAttribute('aria-label') || '';
        } else {
          const tr = translateText(orig, lang);
          if (tr && tr !== orig && htmlEl.getAttribute('aria-label') !== tr) {
            htmlEl.setAttribute('aria-label', tr);
          }
          (htmlEl as any).__appliedAriaLabel = htmlEl.getAttribute('aria-label') || '';
        }
      });
    } catch {}

    // 4. Localize or restore visible DOM Text Nodes (preserving fresh React state updates)
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (['script', 'style', 'textarea', 'input', 'code', 'pre'].includes(tag)) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.closest('[data-no-translate], [translate="no"], .notranslate') || parent.isContentEditable) {
          return NodeFilter.FILTER_REJECT;
        }
        if (parent.textContent?.replace(/\s+/g, '').toLowerCase() === 'tripverse') {
          return NodeFilter.FILTER_REJECT;
        }
        const val = node.nodeValue?.trim();
        if (!val || val.length < 2 || /^(?:tripverse|tipverse|trip\s+verse)$/i.test(val)) return NodeFilter.FILTER_REJECT;
        if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(val) || /^[\d\s:.,\p{Sc}\-+/%]+$/u.test(val)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let currentNode = walker.nextNode();
    while (currentNode) {
      const currentVal = currentNode.nodeValue || '';
      const lastApplied = appliedNodeTextMap.get(currentNode);
      let orig = originalNodeTextMap.get(currentNode);

      // If this node is new OR React mutated its text since our last localization pass,
      // refresh the canonical source text instead of clobbering React's update!
      if (!orig || (lastApplied !== undefined && currentVal !== lastApplied)) {
        orig = translateText(currentVal, 'en') || currentVal;
        originalNodeTextMap.set(currentNode, orig);
      }

      if (lang === 'en') {
        const enforced = enforceBrandInvariance(orig);
        if (currentNode.nodeValue !== enforced) {
          currentNode.nodeValue = enforced;
        }
        appliedNodeTextMap.set(currentNode, currentNode.nodeValue || '');
      } else {
        const translated = enforceBrandInvariance(translateText(orig, lang));
        if (translated && translated !== orig && currentNode.nodeValue !== translated) {
          currentNode.nodeValue = translated;
        }
        appliedNodeTextMap.set(currentNode, currentNode.nodeValue || '');
      }
      currentNode = walker.nextNode();
    }
  } finally {
    isLocalizingDom = false;
  }
}

export function initDomLocalizationObserver() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const scheduleLocalize = () => {
    if (domLocalizationTimer) clearTimeout(domLocalizationTimer);
    domLocalizationTimer = setTimeout(() => {
      const current = getActiveLanguage();
      localizeDom(current);
    }, 60);
  };

  if (!domLocalizationObserver) {
    domLocalizationObserver = new MutationObserver((mutations) => {
      if (isLocalizingDom) return;
      let shouldTranslate = false;
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          shouldTranslate = true;
          break;
        }
        if (m.type === 'characterData') {
          const val = m.target?.nodeValue?.trim();
          if (val && (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(val) || /^[\d\s:.,\p{Sc}\-+/%]+$/u.test(val))) {
            continue;
          }
          if ((m.target as any)?.parentElement?.closest('[data-no-translate], [translate="no"], .notranslate')) {
            continue;
          }
          shouldTranslate = true;
          break;
        }
      }
      if (shouldTranslate) scheduleLocalize();
    });

    try {
      domLocalizationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    } catch {}
  }

  window.addEventListener('tripverse_language_change', () => {
    scheduleLocalize();
  });
  window.addEventListener('tripverse_language_loaded', () => {
    scheduleLocalize();
  });

  const active = getActiveLanguage();
  if (active !== 'en') {
    void ensureLocaleLoaded('en').catch(() => {});
    void ensureLocaleLoaded(active)
      .then(() => scheduleLocalize())
      .catch(() => {});
  } else {
    scheduleLocalize();
  }
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initDomLocalizationObserver());
  } else {
    initDomLocalizationObserver();
  }
}
