import { CompressOutlined, ExpandOutlined, SoundOutlined } from '@ant-design/icons';
import { Button, Card } from 'antd';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import MyEditor from '../Editor';
import FooterBar from '../Footbar';
import './ankicard.less';

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
      showAIChatSidebar,
      getChatMessageAndShowSidebar,
      onInitChunkChatSession,
    },
    ref
  ) => {
    const audioRef = React.useRef(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const editorRef = useRef(null);
    const frontRef = useRef(null);
    const [frontExpanded, setFrontExpanded] = useState(false);

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
          console.error('TTS朗读出错');
        };

        window.speechSynthesis.speak(utterance);
      } else {
        console.warn('当前浏览器不支持TTS功能');
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
          frontType !== 'audio' ? frontRef.current.textContent : '这是一个音频卡片';
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
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <>
                  <div
                    ref={frontRef}
                    dangerouslySetInnerHTML={{ __html: front }}
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
                    title={isSpeaking ? '停止朗读' : '朗读文本'}
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
                      title={frontExpanded ? '收缩正面内容' : '展开正面内容'}
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
                    title={isSpeaking ? '停止朗读' : '朗读答案'}
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
                    getChatMessageAndShowSidebar={getChatMessageAndShowSidebar}
                    onInitChunkChatSession={onInitChunkChatSession}
                    showAIChatSidebar={showAIChatSidebar}
                    cardUUID={cardUUID}
                    config={config}
                    title={frontType !== 'audio' ? frontRef.current.textContent : undefined}
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
              点击下方按钮或按空格键查看答案
            </div>
          )}
        </Card>
        <FooterBar>
          {flipped ? (
            [
              <Button
                key="1"
                color="danger"
                variant="solid"
                onClick={() => {
                  onNext && onNext(1);
                }}
              >
                Again (1)
              </Button>,
              <Button
                key="2"
                color="primary"
                variant="solid"
                onClick={() => {
                  onNext && onNext(2);
                }}
              >
                Hard (2)
              </Button>,
              <Button
                key="3"
                color="danger"
                variant="solid"
                onClick={() => {
                  onNext && onNext(3);
                }}
              >
                Good (3)
              </Button>,
              <Button
                key="4"
                color="default"
                variant="solid"
                onClick={() => {
                  onNext && onNext(4);
                }}
              >
                Easy (4)
              </Button>,
            ]
          ) : (
            <Button
              danger
              type="primary"
              onClick={() => {
                onFlip && onFlip(true);
              }}
            >
              展示答案 (Space)
            </Button>
          )}
        </FooterBar>
      </>
    );
  }
);

export default AnkiCard;
