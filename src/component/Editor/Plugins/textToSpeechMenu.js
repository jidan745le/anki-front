import { getStoredLanguage, translate } from '../../../common/i18n';

// 朗读管理器
class SpeechManager {
  constructor() {
    this.isSpeaking = false;
    this.speechUtterance = null;
    this.onSpeakingStateChange = null;
  }

  // 开始朗读
  speak(text, options = {}) {
    if (!('speechSynthesis' in window)) {
      console.warn('Browser does not support speech synthesis');
      return false;
    }

    // 停止当前朗读
    this.stop();

    if (!text || text.trim() === '') {
      console.warn('No text to speak');
      return false;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // 设置语音属性
    const defaultOptions = {
      lang: 'en-US',
      rate: 0.8,
      pitch: 1.0,
      volume: 0.8,
    };

    const finalOptions = { ...defaultOptions, ...options };

    utterance.lang = finalOptions.lang;
    utterance.rate = finalOptions.rate;
    utterance.pitch = finalOptions.pitch;
    utterance.volume = finalOptions.volume;

    // 设置事件监听
    utterance.onstart = () => {
      this.isSpeaking = true;
      this.speechUtterance = utterance;
      if (this.onSpeakingStateChange) {
        this.onSpeakingStateChange(true);
      }
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.speechUtterance = null;
      if (this.onSpeakingStateChange) {
        this.onSpeakingStateChange(false);
      }
    };

    utterance.onerror = event => {
      console.error('Speech synthesis error:', event.error);
      this.isSpeaking = false;
      this.speechUtterance = null;
      if (this.onSpeakingStateChange) {
        this.onSpeakingStateChange(false);
      }
    };

    utterance.onpause = () => {
      if (this.onSpeakingStateChange) {
        this.onSpeakingStateChange(false);
      }
    };

    utterance.onresume = () => {
      if (this.onSpeakingStateChange) {
        this.onSpeakingStateChange(true);
      }
    };

    // 开始朗读
    window.speechSynthesis.speak(utterance);
    return true;
  }

  // 停止朗读
  stop() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.isSpeaking = false;
      this.speechUtterance = null;
      if (this.onSpeakingStateChange) {
        this.onSpeakingStateChange(false);
      }
    }
  }

  // 暂停朗读
  pause() {
    if ('speechSynthesis' in window && this.isSpeaking) {
      window.speechSynthesis.pause();
    }
  }

  // 恢复朗读
  resume() {
    if ('speechSynthesis' in window && this.speechUtterance) {
      window.speechSynthesis.resume();
    }
  }

  // 获取朗读状态
  getIsSpeaking() {
    return this.isSpeaking;
  }
}

// 朗读菜单类
class TextToSpeechMenu {
  constructor() {
    const currentLanguage = getStoredLanguage();
    this.title = translate('editor.textToSpeech', currentLanguage, '朗读');

    // 播放图标 (默认状态) - 使用style属性避免全局样式污染
    this.playIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" style="fill: none !important; stroke: #666 !important; stroke-width: 2 !important;">
  <circle cx="12" cy="12" r="10" style="fill: transparent !important; stroke: #666 !important; stroke-width: 2 !important;"></circle>
  <polygon points="10 8 16 12 10 16 10 8" style="fill: #666 !important; stroke: #666 !important; stroke-width: 1 !important;"></polygon>
</svg>`;

    // 暂停图标 (播放状态) - 使用style属性避免全局样式污染
    this.pauseIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" style="fill: none !important; stroke: #3b82f6 !important; stroke-width: 2 !important;">
  <circle cx="12" cy="12" r="10" style="fill: transparent !important; stroke: #3b82f6 !important; stroke-width: 2 !important;"></circle>
  <line x1="10" y1="15" x2="10" y2="9" style="stroke: #3b82f6 !important; stroke-width: 3 !important; stroke-linecap: round !important;"></line>
  <line x1="14" y1="15" x2="14" y2="9" style="stroke: #3b82f6 !important; stroke-width: 3 !important; stroke-linecap: round !important;"></line>
</svg>`;

    // 默认显示播放图标
    this.iconSvg = this.playIconSvg;
    this.tag = 'button';

    // 为每个菜单实例创建独立的朗读管理器
    this.speechManager = new SpeechManager();

    // 绑定状态变化监听
    this.speechManager.onSpeakingStateChange = isSpeaking => {
      this.updateIcon(isSpeaking);
    };
  }

  // 更新图标状态
  updateIcon(isSpeaking) {
    const buttons = document.querySelectorAll('[data-menu-key="textToSpeech"]');
    buttons.forEach(button => {
      // 类型断言为HTMLElement
      const buttonElement = button;

      if (isSpeaking) {
        // 正在播放 - 显示暂停图标
        buttonElement.innerHTML = this.pauseIconSvg;
        buttonElement.setAttribute(
          'title',
          translate('editor.stopSpeech', getStoredLanguage(), '停止朗读')
        );
      } else {
        // 未播放 - 显示播放图标
        buttonElement.innerHTML = this.playIconSvg;
        buttonElement.setAttribute(
          'title',
          translate('editor.textToSpeech', getStoredLanguage(), '朗读')
        );
      }
    });
  }

  getValue(editor) {
    return '';
  }

  isActive(editor) {
    return this.speechManager.getIsSpeaking();
  }

  isDisabled(editor) {
    // 检查浏览器是否支持语音合成
    if (!('speechSynthesis' in window)) {
      return true;
    }

    // 检查是否有可朗读的内容
    const selectedText = editor.getSelectionText().trim();
    const hasSelection = selectedText.length > 0;

    // 获取编辑器全部内容
    const allText = this.getPlainTextFromEditor(editor).trim();
    const hasContent = allText.length > 0;

    // 如果既没有选中内容也没有编辑器内容，则禁用
    return !hasSelection && !hasContent;
  }

  // 从编辑器获取纯文本
  getPlainTextFromEditor(editor) {
    try {
      const html = editor.getHtml();
      if (!html) return '';

      // 创建临时DOM元素来提取纯文本
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // 移除脚本和样式标签
      const scripts = tempDiv.querySelectorAll('script, style');
      scripts.forEach(el => el.remove());

      return tempDiv.textContent || tempDiv.innerText || '';
    } catch (error) {
      console.error('Error getting plain text from editor:', error);
      return '';
    }
  }

  // 获取朗读语言设置
  getSpeechLanguage() {
    const currentLanguage = getStoredLanguage();
    const languageMap = {
      zh: 'zh-CN',
      'zh-CN': 'zh-CN',
      'zh-TW': 'zh-TW',
      en: 'en-US',
      'en-US': 'en-US',
      'en-GB': 'en-GB',
    };

    return languageMap[currentLanguage] || 'en-US';
  }

  exec(editor, value) {
    // 如果正在朗读，则停止
    if (this.speechManager.getIsSpeaking()) {
      this.speechManager.stop();
      return;
    }

    // 获取要朗读的文本
    const selectedText = editor.getSelectionText().trim();
    let textToSpeak = '';

    if (selectedText) {
      // 如果有选中文本，朗读选中的文本
      textToSpeak = selectedText;
    } else {
      // 否则朗读整个编辑器内容
      textToSpeak = this.getPlainTextFromEditor(editor);
    }

    if (!textToSpeak) {
      console.warn('No text to speak');
      return;
    }

    // 开始朗读
    const speechOptions = {
      lang: this.getSpeechLanguage(),
      rate: 0.8,
      pitch: 1.0,
      volume: 0.8,
    };

    const success = this.speechManager.speak(textToSpeak, speechOptions);

    if (!success) {
      console.error('Failed to start speech synthesis');
    }
  }
}

// 朗读菜单实例
const textToSpeechMenuConf = {
  key: 'textToSpeech',
  factory() {
    return new TextToSpeechMenu();
  },
};

// 朗读插件模块
const textToSpeechModule = {
  menus: [textToSpeechMenuConf],
  editorPlugin: editor => editor, // 不需要特殊的编辑器插件
  renderElems: [],
  elemToHtmlConf: {},
  parseElemHtmlConf: {},
};

export { TextToSpeechMenu, textToSpeechModule };
export default textToSpeechMenuConf;
