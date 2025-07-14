import { CompressOutlined, ExpandOutlined, SoundOutlined } from '@ant-design/icons';
import { Button, Card, message, Popconfirm } from 'antd';
import { marked } from 'marked';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useI18n } from '../../common/hooks/useI18n';
import apiClient from '../../common/http/apiClient';
import MyEditor from '../Editor';
import FooterBar from '../Footbar';
import './ankicard.less';

/**
 * HTML转义函数，防止XSS攻击
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, function (m) {
    return map[m];
  });
}

/**
 * Markdown转HTML函数
 */
function markdownToHtml(text) {
  if (!text) return '';
  return marked(text);
}

/**
 * 解析进度信息
 */
function parseProgress(progressText) {
  const match = progressText.match(/(\d+)\/(\d+)\s*\((\d+)%\)/);
  if (match) {
    return {
      current: parseInt(match[1]),
      total: parseInt(match[2]),
      percentage: parseInt(match[3]),
    };
  }
  return { current: 1, total: 1, percentage: 100 };
}

/**
 * 生成卡片正面HTML
 */
function generateCardFrontHTML(data) {
  return `
    <div class="card-front-container">
      <div class="chapter-title">
        ${markdownToHtml(data.chapterTitle || '')}
      </div>
      
      ${
        data.sectionTitle
          ? `
      <div class="section-title">
        ${markdownToHtml(data.sectionTitle)}
      </div>
      `
          : ''
      }
      
      ${
        data.breadcrumb && data.breadcrumb.length > 0
          ? `
      <div class="breadcrumb-container">
        <div class="breadcrumb">
          ${data.breadcrumb
            .map(
              (item, index) => `
            <span class="breadcrumb-item">${markdownToHtml(item)}</span>
            ${index < data.breadcrumb.length - 1 ? '<span class="breadcrumb-separator">></span>' : ''}
          `
            )
            .join('')}
        </div>
      </div>
      `
          : ''
      }
      
      <div class="progress-container">
        <div class="progress-info">
          <span>第 ${data.progress.current} 部分，共 ${data.progress.total} 部分</span>
          <span>${data.progress.percentage}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${data.progress.percentage}%"></div>
        </div>
      </div>
    </div>

    <style>
      .card-front-container {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        padding: 12px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        color: #333;
        font-size: 0.85em;
        line-height: 1.4;
        text-align: left;
      }
      
      .chapter-title {
        font-size: 1em;
        font-weight: 600;
        color: #2c3e50;
        margin-bottom: 8px;
      }
      
      .section-title {
        font-size: 0.9em;
        font-weight: 500;
        color: #5a6c7d;
        margin-bottom: 8px;
      }
      
      .breadcrumb-container {
        margin-bottom: 10px;
      }
      
      .breadcrumb {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
        font-size: 0.75em;
        color: #6c757d;
      }
      
      .breadcrumb-item {
        background: #e9ecef;
        padding: 2px 6px;
        border-radius: 3px;
        font-weight: 500;
      }
      
      .breadcrumb-separator {
        color: #adb5bd;
        margin: 0 2px;
      }
      
      .progress-container {
        border-top: 1px solid #e9ecef;
        padding-top: 8px;
      }
      
      .progress-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
        font-size: 0.75em;
        color: #6c757d;
      }
      
      .progress-bar {
        width: 100%;
        height: 3px;
        background: #e9ecef;
        border-radius: 2px;
        overflow: hidden;
      }
      
      .progress-fill {
        height: 100%;
        background: #007bff;
        border-radius: 2px;
        transition: width 0.2s ease;
      }
    </style>
  `;
}

/**
 * 解析卡片正面的结构化文本并生成HTML
 */
function parseAndRenderCardFront(frontText) {
  const parts = frontText.split('|');
  const data = {};

  parts.forEach(part => {
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) return;

    const key = part.substring(0, colonIndex);
    const value = part.substring(colonIndex + 1);

    switch (key) {
      case 'CHAPTER':
        data.chapterTitle = value;
        break;
      case 'SECTION':
        data.sectionTitle = value;
        break;
      case 'BREADCRUMB':
        data.breadcrumb = value ? value.split(' > ') : null;
        break;
      case 'PROGRESS':
        data.progress = parseProgress(value);
        break;
      case 'LEVEL':
        data.level = parseInt(value);
        break;
    }
  });

  return generateCardFrontHTML(data);
}

const AnkiCard = forwardRef(
  (
    {
      config,
      flipped,
      onFlip,
      onNext,
      front,
      frontType,
      back,
      isNew,
      onChange,
      cardUUID,
      cardState,
      onRefreshCard,
      showAIChatSidebar,
      getChatMessageAndShowSidebar,
      onInitChunkChatSession,
      characterId,
    },
    ref
  ) => {
    const { t } = useI18n();
    const audioRef = React.useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const editorRef = useRef(null);
    const frontRef = useRef(null);
    const [frontExpanded, setFrontExpanded] = useState(false);
    const [isSuspending, setIsSuspending] = useState(false);
    console.log(frontType, front, 'frontType');

    // Suspend/Resume card function
    const handleSuspendCard = async () => {
      if (!cardUUID || isSuspending) return;

      const isSuspended = cardState === 4; // Check if card is currently suspended
      const actionIsSuspend = !isSuspended; // If currently suspended, we want to resume; otherwise suspend

      setIsSuspending(true);
      try {
        const response = await apiClient.post(`/anki/cards/suspend/${cardUUID}`, {
          isSuspended: actionIsSuspend,
        });

        if (response.data.success) {
          if (actionIsSuspend) {
            message.success(t('anki.suspendSuccess'));
            // For suspend: refresh current card to get updated state
            onRefreshCard && onRefreshCard(cardUUID);
          } else {
            message.success(t('anki.resumeSuccess'));
            // For resume: refresh current card to get updated state
            onRefreshCard && onRefreshCard(cardUUID);
          }
        } else {
          message.error(response.data.message || t('anki.suspendFailed'));
        }
      } catch (error) {
        console.error('Failed to suspend/resume card:', error);
        message.error(t('anki.suspendFailed'));
      } finally {
        setIsSuspending(false);
      }
    };

    useImperativeHandle(ref, () => ({
      getEditor: () => editorRef.current,
    }));

    // 添加窗口大小变化监听
    useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth <= 768);
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, []);

    // TTS朗读功能
    const speakText = text => {
      if ('speechSynthesis' in window) {
        // 停止当前朗读
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // 设置语音属性
        utterance.lang = 'en'; // 语言
        utterance.rate = 0.8; // 语速
        utterance.pitch = 1.5; // 音调
        utterance.volume = 0.8; // 音量

        // 朗读状态监听
        utterance.onstart = () => {
          setIsSpeaking(true);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          console.error('TTS Error');
        };

        window.speechSynthesis.speak(utterance);
      } else {
        console.warn(t('anki.audioNotSupported'));
      }
    };

    // 停止TTS朗读
    const stopSpeaking = () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };

    // 处理TTS按钮点击
    const handleTTSClick = () => {
      if (isSpeaking) {
        stopSpeaking();
      } else {
        const textToSpeak =
          frontType !== 'audio' ? frontRef.current.textContent : t('anki.audioCard');
        console.log(textToSpeak.trim() + 'textToSpeak');
        speakText(textToSpeak);
      }
    };

    // 处理背面TTS按钮点击
    const handleBackTTSClick = () => {
      if (isSpeaking) {
        stopSpeaking();
      } else {
        // 从HTML中提取纯文本
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = back;
        const plainText = tempDiv.textContent || tempDiv.innerText || '';
        speakText(plainText);
      }
    };

    // 组件卸载时停止朗读
    useEffect(() => {
      return () => {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      };
    }, []);

    // 添加键盘事件监听
    useEffect(() => {
      const handleKeyPress = event => {
        console.log(event, 'event');

        const isCtrlPressed = event.ctrlKey || event.metaKey;
        const isShiftPressed = event.shiftKey;

        // Audio control shortcuts
        if (frontType === 'audio' && audioRef.current) {
          if (isCtrlPressed) {
            switch (event.code) {
              case 'ArrowDown':
                event.preventDefault();
                if (audioRef.current.paused) {
                  audioRef.current.play();
                } else {
                  audioRef.current.pause();
                }
                return;
              case 'ArrowLeft':
                event.preventDefault();
                audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 3);
                return;
              case 'ArrowRight':
                event.preventDefault();
                audioRef.current.currentTime = Math.min(
                  audioRef.current.duration,
                  audioRef.current.currentTime + 3
                );
                return;
            }
          }
        }

        // Ctrl + 数字键组合不受编辑器状态影响
        if (flipped) {
          if (isCtrlPressed) {
            switch (event.code) {
              case 'Digit1':
              case 'Numpad1':
                event.preventDefault();
                onNext && onNext(1); // Again
                return;
              case 'Digit2':
              case 'Numpad2':
                event.preventDefault();
                onNext && onNext(2); // Hard
                return;
              case 'Digit3':
              case 'Numpad3':
                event.preventDefault();
                onNext && onNext(3); // Good
                return;
              case 'Digit4':
              case 'Numpad4':
                event.preventDefault();
                onNext && onNext(4); // Easy
                return;
            }
          }
          if (event.code === 'Space' && isShiftPressed) {
            event.preventDefault();
            onNext && onNext(4);
          }
        }

        // 如果事件来自编辑器或其他可编辑元素，不处理普通快捷键
        if (
          event.target.contentEditable === 'true' ||
          event.target.tagName === 'INPUT' ||
          event.target.tagName === 'TEXTAREA'
        ) {
          // if(event.code === 'Space' && isShiftPressed){
          //   event.preventDefault();
          //   onNext && onNext(3);
          // }
          return;
        }

        if (!flipped) {
          // 未翻转状态：空格键显示答案（仅在没有按下 Ctrl 时）
          if (event.code === 'Space') {
            event.preventDefault();
            onFlip && onFlip(true);
          }
        }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }, [flipped, onFlip, onNext]);

    useEffect(() => {
      console.log(frontType, 'frontType', cardUUID, front);
      if (frontType === 'audio' && audioRef.current) {
        audioRef.current.load();
        audioRef.current.play().catch(e => {
          console.log('自动播放失败:', e);
        });
      }
    }, [front, frontType]);

    return (
      <>
        <Card
          className="anki-card"
          bordered={false}
          style={{
            height: '100%',
          }}
          title={
            <div
              style={{
                minHeight: '63px',
                height: flipped && !frontExpanded ? '63px' : 'auto',
                boxSizing: 'border-box',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '24px',
                fontWeight: 'bold',
                position: 'relative',
                flexDirection: 'column',
                overflow: 'auto',
                flex: 1,
              }}
            >
              {frontType === 'audio' ? (
                <audio ref={audioRef} controls src={`${front}`}>
                  {t('anki.audioNotSupported')}
                </audio>
              ) : (
                <>
                  <div
                    ref={frontRef}
                    dangerouslySetInnerHTML={{
                      __html: frontType === 'title' ? parseAndRenderCardFront(front) : front,
                    }}
                    style={{
                      minHeight: '63px',
                    }}
                  />
                  {/* TTS朗读按钮 */}
                  <Button
                    type="text"
                    icon={<SoundOutlined />}
                    onClick={handleTTSClick}
                    style={{
                      position: 'absolute',
                      right: flipped ? '52px' : '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: isSpeaking ? '#1890ff' : '#666',
                      fontSize: '18px',
                    }}
                    title={isSpeaking ? t('anki.stopReading') : t('anki.readText')}
                  />
                  {/* 展开/收缩按钮 - 只在翻转状态下显示 */}
                  {flipped && (
                    <Button
                      type="text"
                      icon={frontExpanded ? <CompressOutlined /> : <ExpandOutlined />}
                      onClick={() => setFrontExpanded(!frontExpanded)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#666',
                        fontSize: '16px',
                      }}
                      title={frontExpanded ? t('anki.collapseFront') : t('anki.expandFront')}
                    />
                  )}
                </>
              )}
            </div>
          }
        >
          {flipped ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                height: '100%',
                overflow: 'hidden',
              }}
            >
              {isMobile ? (
                // 移动端显示只读内容
                <div style={{ position: 'relative' }}>
                  <div
                    className="mobile-content"
                    dangerouslySetInnerHTML={{ __html: back }}
                    style={{
                      padding: '10px',
                      fontSize: '16px',
                      lineHeight: '1.5',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                      whiteSpace: 'pre-wrap',
                      maxWidth: '100%',
                    }}
                  />
                  {/* 移动端背面TTS按钮 */}
                  <Button
                    type="text"
                    icon={<SoundOutlined />}
                    onClick={handleBackTTSClick}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      color: isSpeaking ? '#1890ff' : '#666',
                      fontSize: '16px',
                    }}
                    title={isSpeaking ? t('anki.stopReading') : t('anki.readAnswer')}
                  />
                </div>
              ) : (
                // PC端显示编辑器
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    overflow: 'hidden',
                    height: '100%',
                    borderBottom: '1px solid rgb(204, 204, 204)',
                  }}
                >
                  <MyEditor
                    ref={editorRef}
                    characterId={characterId}
                    getChatMessageAndShowSidebar={getChatMessageAndShowSidebar}
                    onInitChunkChatSession={onInitChunkChatSession}
                    showAIChatSidebar={showAIChatSidebar}
                    cardUUID={cardUUID}
                    config={config}
                    title={frontType !== 'audio' ? frontRef.current.textContent.trim() : undefined}
                    onChange={onChange}
                    isNew={isNew}
                    value={`${back}`}
                  />
                  {/* PC端背面TTS按钮 */}
                  {/* {frontType !== 'audio' && (
                  <Button
                    type="text"
                    icon={<SoundOutlined />}
                    onClick={handleBackTTSClick}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      color: isSpeaking ? '#1890ff' : '#666',
                      fontSize: '16px',
                      zIndex: 1000,
                    }}
                    title={isSpeaking ? '停止朗读' : '朗读答案'}
                  />
                )} */}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {t('anki.clickToShowAnswer')}
            </div>
          )}
        </Card>
        <FooterBar>
          <div className="button-group-left">
            {flipped && cardState !== 4 && (
              <Popconfirm
                title={t('anki.confirmSuspendCard')}
                onConfirm={handleSuspendCard}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <Button color="danger" variant="solid" loading={isSuspending}>
                  {t('anki.suspendCard')}
                </Button>
              </Popconfirm>
            )}
          </div>
          <div className="button-group-center">
            {cardState === 4 ? (
              // Suspended cards: show message and buttons
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <span style={{ color: '#666', fontStyle: 'italic', fontSize: '14px' }}>
                  {t('anki.cardSuspended')}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Popconfirm
                    title={t('anki.confirmResumeCard')}
                    onConfirm={handleSuspendCard}
                    okText={t('common.confirm')}
                    cancelText={t('common.cancel')}
                  >
                    <Button color="primary" variant="solid" loading={isSuspending}>
                      {t('anki.resumeCard')}
                    </Button>
                  </Popconfirm>
                  <Button
                    color="default"
                    variant="solid"
                    onClick={() => {
                      onNext && onNext(0);
                    }}
                  >
                    {t('anki.nextCard')}
                  </Button>
                </div>
              </div>
            ) : flipped ? (
              // Non-suspended flipped cards: show difficulty buttons
              [
                <Button
                  key="1"
                  color="danger"
                  variant="solid"
                  onClick={() => {
                    onNext && onNext(1);
                  }}
                >
                  {t('anki.again')}
                </Button>,
                <Button
                  key="2"
                  color="primary"
                  variant="solid"
                  onClick={() => {
                    onNext && onNext(2);
                  }}
                >
                  {t('anki.hard')}
                </Button>,
                <Button
                  key="3"
                  color="danger"
                  variant="solid"
                  onClick={() => {
                    onNext && onNext(3);
                  }}
                >
                  {t('anki.good')}
                </Button>,
                <Button
                  key="4"
                  color="default"
                  variant="solid"
                  onClick={() => {
                    onNext && onNext(4);
                  }}
                >
                  {t('anki.easy')}
                </Button>,
              ]
            ) : (
              // Non-suspended non-flipped cards: show answer button
              <Button
                danger
                type="primary"
                onClick={() => {
                  onFlip && onFlip(true);
                }}
              >
                {t('anki.showAnswer')}
              </Button>
            )}
          </div>
        </FooterBar>
      </>
    );
  }
);

export default AnkiCard;

/**
 * 处理MD斜体格式
 */
function processMarkdownItalic(text) {
  if (!text) return '';
  // 处理 _text_ 格式为斜体
  return text
    .replace(/\*\*_([^_]+)_\*\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>')
    .replace(/\*\*/g, '');
}

/**
 * 解析单个卡片前面数据
 */
function parseCardFrontData(frontText) {
  const parts = frontText.split('|');
  const data = {};

  parts.forEach(part => {
    const colonIndex = part.indexOf(':');
    if (colonIndex === -1) return;

    const key = part.substring(0, colonIndex);
    const value = part.substring(colonIndex + 1);

    switch (key) {
      case 'CHAPTER':
        data.chapterTitle = value;
        break;
      case 'SECTION':
        data.sectionTitle = value;
        break;
      case 'BREADCRUMB':
        data.breadcrumb = value ? value.split(' > ') : null;
        break;
      case 'PROGRESS':
        data.progress = parseProgress(value);
        break;
      case 'LEVEL':
        data.level = parseInt(value);
        break;
    }
  });

  return data;
}

/**
 * 处理书籍索引数据并生成目录结构
 */
function processBookIndex(indexData) {
  const processedItems = indexData.map((item, index) => ({
    ...parseCardFrontData(item.front),
    uuid: item.uuid,
    originalFront: item.front,
    originalIndex: index, // 保持原始顺序
  }));

  // 按章节和原始顺序排序
  processedItems.sort((a, b) => {
    if (a.chapterTitle !== b.chapterTitle) {
      return a.chapterTitle.localeCompare(b.chapterTitle);
    }
    return a.originalIndex - b.originalIndex;
  });

  // 构建层级结构
  const tocStructure = [];
  const chapterMap = new Map();

  processedItems.forEach(item => {
    const chapterKey = item.chapterTitle;

    // 创建或获取章节
    if (!chapterMap.has(chapterKey)) {
      const chapterItem = {
        type: 'chapter',
        title: chapterKey,
        sections: new Map(), // 用Map来存储sections，方便查找
        directCards: [],
        uuid: item.uuid,
        progress: item.progress,
      };
      chapterMap.set(chapterKey, chapterItem);
      tocStructure.push(chapterItem);
    }

    const chapter = chapterMap.get(chapterKey);

    // 处理层级结构
    if (item.breadcrumb && item.breadcrumb.length > 0) {
      let currentContainer = chapter;

      // 遍历breadcrumb路径，为每一级创建section
      for (let i = 0; i < item.breadcrumb.length; i++) {
        const breadcrumbItem = item.breadcrumb[i].trim(); // 去除空格
        const sectionKey = breadcrumbItem;

        // 创建或获取section
        if (!currentContainer.sections.has(sectionKey)) {
          const newSection = {
            type: 'section',
            title: breadcrumbItem,
            level: item.level - (item.breadcrumb.length - 1 - i), // 根据深度调整level
            breadcrumb: item.breadcrumb.slice(0, i + 1),
            items: [],
            sections: new Map(),
            uuid: item.uuid,
            progress: item.progress,
          };
          currentContainer.sections.set(sectionKey, newSection);
        }

        currentContainer = currentContainer.sections.get(sectionKey);
      }

      // 将卡片添加到最深层的section中
      if (!currentContainer.items) {
        currentContainer.items = [];
      }
      currentContainer.items.push({
        type: 'card',
        uuid: item.uuid,
        progress: item.progress,
        level: item.level,
        breadcrumb: item.breadcrumb,
        originalIndex: item.originalIndex,
        sectionTitle: item.sectionTitle,
      });
    } else {
      // 没有breadcrumb的卡片直接放在章节下
      chapter.directCards.push({
        type: 'card',
        uuid: item.uuid,
        progress: item.progress,
        level: item.level,
        originalIndex: item.originalIndex,
        sectionTitle: item.sectionTitle,
      });
    }
  });

  return tocStructure;
}

// Export the index processing functions
export { processBookIndex };
