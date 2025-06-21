import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_LANGUAGE,
  getStoredLanguage,
  LANGUAGES,
  setStoredLanguage,
  translate,
} from '../i18n';

export const useI18n = () => {
  const [currentLanguage, setCurrentLanguage] = useState(getStoredLanguage());

  // 翻译函数
  const t = useCallback(
    (key, fallback = key) => {
      return translate(key, currentLanguage, fallback);
    },
    [currentLanguage]
  );

  // 切换语言
  const changeLanguage = useCallback(language => {
    if (LANGUAGES[language]) {
      setCurrentLanguage(language);
      setStoredLanguage(language);

      // 触发自定义事件，通知其他组件语言已改变
      window.dispatchEvent(
        new CustomEvent('languageChange', {
          detail: { language },
        })
      );
    }
  }, []);

  // 获取当前语言的显示名称
  const getCurrentLanguageName = useCallback(() => {
    return LANGUAGES[currentLanguage] || LANGUAGES[DEFAULT_LANGUAGE];
  }, [currentLanguage]);

  // 获取所有可用语言
  const getAvailableLanguages = useCallback(() => {
    return Object.entries(LANGUAGES).map(([code, name]) => ({
      code,
      name,
      active: code === currentLanguage,
    }));
  }, [currentLanguage]);

  // 监听语言变化事件
  useEffect(() => {
    const handleLanguageChange = event => {
      setCurrentLanguage(event.detail.language);
    };

    window.addEventListener('languageChange', handleLanguageChange);
    return () => {
      window.removeEventListener('languageChange', handleLanguageChange);
    };
  }, []);

  return {
    t,
    currentLanguage,
    changeLanguage,
    getCurrentLanguageName,
    getAvailableLanguages,
    isLanguageSupported: language => !!LANGUAGES[language],
  };
};
