import { GlobalOutlined } from '@ant-design/icons';
import { Button, Select } from 'antd';
import React from 'react';
import { useI18n } from '../../common/hooks/useI18n';
import './style.less';

const { Option } = Select;

const LanguageSwitcher = ({
  mode = 'select', // 'select' | 'button'
  size,
  showIcon = true,
  className = '',
  style = {},
}) => {
  const { currentLanguage, changeLanguage, getAvailableLanguages, t } = useI18n();
  const languages = getAvailableLanguages();

  const handleLanguageChange = language => {
    changeLanguage(language);
  };

  if (mode === 'button') {
    return (
      <div className={`language-switcher-buttons ${className}`} style={style}>
        {languages.map(({ code, name, active }) => (
          <Button
            key={code}
            type={active ? 'primary' : 'default'}
            size={size}
            onClick={() => handleLanguageChange(code)}
            className={`language-button ${active ? 'active' : ''}`}
          >
            {showIcon && <GlobalOutlined />}
            {name}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <Select
      value={currentLanguage}
      onChange={handleLanguageChange}
      size={size}
      className={`language-switcher ${className}`}
      style={style}
      suffixIcon={showIcon ? <GlobalOutlined /> : undefined}
      aria-label={t('nav.selectLanguage', 'Select Language')}
    >
      {languages.map(({ code, name }) => (
        <Option key={code} value={code}>
          {name}
        </Option>
      ))}
    </Select>
  );
};

export default LanguageSwitcher;
