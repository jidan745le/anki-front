import { message } from 'antd';
import apiClient from '../../../common/http/apiClient';
import { getStoredLanguage, translate } from '../../../common/i18n';
import './wordDictionary.css';

// 判断是否为单词的函数
const isWord = text => {
  if (!text || text.trim().length === 0) {
    return false;
  }

  const trimmedText = text.trim();

  // 单词判断：只包含字母、连字符、撇号，无空格
  const wordPattern = /^[a-zA-Z][a-zA-Z\-']*[a-zA-Z]$|^[a-zA-Z]$/;
  return wordPattern.test(trimmedText) && trimmedText.length <= 30;
};

// 简单的Markdown解析函数
const parseMarkdown = text => {
  if (!text) return text;

  let html = text
    // 粗体 **text** 或 __text__
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    // 斜体 *text* 或 _text_
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    // 代码 `code`
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 标题 # ## ###
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // 处理列表项
  const lines = html.split('\n');
  const processedLines = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const listMatch = line.match(/^[-*] (.*)$/);

    if (listMatch) {
      if (!inList) {
        processedLines.push('<ul>');
        inList = true;
      }
      processedLines.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) {
        processedLines.push('</ul>');
        inList = false;
      }
      if (line.trim()) {
        processedLines.push(`<p>${line}</p>`);
      } else {
        processedLines.push('<br>');
      }
    }
  }

  // 关闭最后的列表
  if (inList) {
    processedLines.push('</ul>');
  }

  return processedLines.join('');
};

// 创建浮窗显示字典解释
const createDictionaryPopup = (content, position, title = '', selectedText = '', editor = null) => {
  // 移除已存在的弹窗
  const existingPopup = document.getElementById('dictionary-popup');
  if (existingPopup) {
    existingPopup.remove();
    // 清除之前的高亮
    if (editor && editor.applyTextHighlight) {
      editor.applyTextHighlight('', false);
    }
  }

  // 应用文本高亮
  if (selectedText && editor && editor.applyTextHighlight) {
    editor.applyTextHighlight(selectedText, true, 'rgb(255, 248, 136)', 0.6);
  }

  // 创建弹窗元素
  const popup = document.createElement('div');
  popup.id = 'dictionary-popup';
  popup.className = 'dictionary-popup';

  // 设置弹窗样式
  popup.style.cssText = `
    position: fixed;
    top: ${position.top}px;
    left: ${position.left}px;
    max-width: 450px;
    max-height: 350px;
    background: white;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 20px;
    z-index: 10000;
    font-size: 14px;
    line-height: 1.6;
    overflow-y: auto;
    word-wrap: break-word;
  `;

  // 创建标题（如果有）
  if (title) {
    const titleDiv = document.createElement('div');
    titleDiv.className = 'popup-title';
    titleDiv.style.cssText = `
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
      color: #333;
    `;
    titleDiv.textContent = title;
    popup.appendChild(titleDiv);
  }

  // 创建关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '×';
  closeBtn.className = 'close-button';
  closeBtn.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    border: none;
    background: none;
    font-size: 18px;
    cursor: pointer;
    color: #999;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.2s;
  `;

  closeBtn.onmouseover = () => {
    closeBtn.style.background = '#f5f5f5';
    closeBtn.style.color = '#666';
  };

  closeBtn.onmouseout = () => {
    closeBtn.style.background = 'none';
    closeBtn.style.color = '#999';
  };

  closeBtn.onclick = () => {
    popup.remove();
    // 清除文本高亮
    if (editor && editor.applyTextHighlight) {
      editor.applyTextHighlight('', false);
    }
  };

  // 创建内容区域
  const contentDiv = document.createElement('div');
  contentDiv.className = 'content';
  contentDiv.style.cssText = `
    margin-right: 30px;
    white-space: normal;
  `;

  // 解析Markdown并设置HTML内容
  const parsedContent = parseMarkdown(content);
  contentDiv.innerHTML = parsedContent;

  popup.appendChild(closeBtn);
  popup.appendChild(contentDiv);
  document.body.appendChild(popup);

  // 调整位置确保在视窗内
  const rect = popup.getBoundingClientRect();
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  if (rect.right > windowWidth) {
    popup.style.left = `${windowWidth - rect.width - 10}px`;
  }
  if (rect.bottom > windowHeight) {
    popup.style.top = `${windowHeight - rect.height - 10}px`;
  }
  if (rect.left < 0) {
    popup.style.left = '10px';
  }
  if (rect.top < 0) {
    popup.style.top = '10px';
  }

  // 点击弹窗外部关闭
  const handleClickOutside = event => {
    if (!popup.contains(event.target)) {
      popup.remove();
      // 清除文本高亮
      if (editor && editor.applyTextHighlight) {
        editor.applyTextHighlight('', false);
      }
      document.removeEventListener('click', handleClickOutside);
    }
  };

  // 延迟添加事件监听器，避免立即触发
  setTimeout(() => {
    document.addEventListener('click', handleClickOutside);
  }, 100);

  return popup;
};

// 调用字典查询API
const lookupWord = async selectedText => {
  try {
    const requestData = {
      chatcontext: 'None',
      selectionText: selectedText,
      chattype: 'WordLookup',
    };

    const response = await apiClient.post('/aichat/word-lookup', requestData);

    if (response.data.success) {
      return response.data.data.aiMessage.content;
    } else {
      throw new Error(response.data.message || 'Word lookup failed');
    }
  } catch (error) {
    console.error('Dictionary lookup error:', error);
    throw error;
  }
};

class WordDictionary {
  constructor() {
    const currentLanguage = getStoredLanguage();
    this.title = translate('editor.wordDictionary', currentLanguage, 'Dictionary Lookup');
    // 使用朴素的灰色图标
    this.iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-6" style="fill: #666 !important;">
  <path fill="#666" d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/>
</svg>`;

    this.tag = 'button';
    this.width = 30;
  }

  getValue(editor) {
    return '📖';
  }

  isActive(editor) {
    return false;
  }

  isDisabled(editor) {
    const selectedText = editor.getSelectionText().trim();
    // 只有选中的是单词时才启用，其他情况禁用
    return !selectedText || !isWord(selectedText);
  }

  async exec(editor, value) {
    const selectedText = editor.getSelectionText().trim();
    if (!selectedText) {
      message.warning(
        translate('editor.noTextSelected', getStoredLanguage(), 'Please select text first')
      );
      return;
    }

    // 检查是否为单词
    if (!isWord(selectedText)) {
      message.warning(
        translate(
          'editor.onlyWordsAllowed',
          getStoredLanguage(),
          'Dictionary lookup is only available for single words'
        )
      );
      return;
    }

    // 关闭悬浮菜单

    // 获取选中文本的位置
    const { selection } = editor;
    if (!selection) return;

    try {
      // 显示加载状态
      const loadingMessage = message.loading('Looking up word...', 0);

      // 计算弹窗位置
      const browserSelection = window.getSelection();
      let position = { top: 100, left: 100 }; // 默认位置

      if (browserSelection && browserSelection.rangeCount > 0) {
        const range = browserSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        position = {
          top: rect.bottom + window.scrollY + 10,
          left: rect.left + window.scrollX,
        };
      }

      editor.deselect();

      // 调用字典查询API
      const dictionaryResult = await lookupWord(selectedText);

      // 隐藏加载状态
      loadingMessage();

      // 获取弹窗标题
      const currentLanguage = getStoredLanguage();
      const popupTitle = translate(
        'editor.wordDefinition',
        currentLanguage,
        `Word: ${selectedText}`
      );

      // 显示字典解释弹窗
      createDictionaryPopup(dictionaryResult, position, popupTitle, selectedText, editor);
    } catch (error) {
      message.destroy();
      console.error('Dictionary lookup failed:', error);
      message.error(error.message || 'Dictionary lookup failed. Please try again.');
    }
  }
}

export const wordDictionaryModule = {
  key: 'wordDictionary',
  factory() {
    return new WordDictionary();
  },
};
