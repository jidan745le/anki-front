import { en } from './en';
import { zh } from './zh';

// 支持的语言
export const LANGUAGES = {
  zh: '中文',
  en: 'English',
};

// 翻译资源
export const translations = {
  zh,
  en,
};

// 默认语言
export const DEFAULT_LANGUAGE = 'zh';

// 从本地存储获取语言设置
export const getStoredLanguage = () => {
  try {
    const stored = localStorage.getItem('preferred-language');
    return stored && translations[stored] ? stored : DEFAULT_LANGUAGE;
  } catch (error) {
    return DEFAULT_LANGUAGE;
  }
};

// 保存语言设置到本地存储
export const setStoredLanguage = language => {
  try {
    localStorage.setItem('preferred-language', language);
  } catch (error) {
    console.warn('Failed to save language preference:', error);
  }
};

// 获取嵌套对象的值
export const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : null;
  }, obj);
};

// 翻译函数
export const translate = (key, language = DEFAULT_LANGUAGE, fallback = key) => {
  const translation = getNestedValue(translations[language], key);
  if (translation) {
    return translation;
  }

  // 如果当前语言没有翻译，尝试使用默认语言
  if (language !== DEFAULT_LANGUAGE) {
    const defaultTranslation = getNestedValue(translations[DEFAULT_LANGUAGE], key);
    if (defaultTranslation) {
      return defaultTranslation;
    }
  }

  // 如果都没有，返回fallback
  return fallback;
};
