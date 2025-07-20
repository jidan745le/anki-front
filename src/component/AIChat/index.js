import {
  CloseOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  PauseOutlined,
  RedoOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { Button, Input, message, Select, Spin, Tooltip } from 'antd';
import { EventSource } from 'extended-eventsource';
import { marked } from 'marked';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useI18n } from '../../common/hooks/useI18n';
import useSocket from '../../common/hooks/useSocket';
import apiClient from '../../common/http/apiClient';
import { characterEmotionMap, defaultEmotion } from './util/emotions';

const AIChatSidebar = forwardRef(
  (
    {
      visible,
      onClose,
      cardIdRef,
      chunkId,
      chatMessages,
      setChatMessages,
      chatStatus,
      setChatStatus,
      aiChatLoading,
      setAiChatLoading,
      useStreamingApi = true,
      card,
      onCardClick,
      selectedCharacter,
    },
    ref
  ) => {
    const [aiChatPrompt, setAiChatPrompt] = useState('');
    const [chatContext, setChatContext] = useState('Card');
    const [quickActionsVisible, setQuickActionsVisible] = useState(false);
    const [showTranslateSelect, setShowTranslateSelect] = useState(false);
    const [popoverVisible, setPopoverVisible] = useState(false);
    const [popoverCard, setPopoverCard] = useState(null);
    const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
    const [isHandlingChunkSession, setIsHandlingChunkSession] = useState(false);

    // 语音相关状态
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [voiceConnected, setVoiceConnected] = useState(false);
    const [voiceBufferStatus, setVoiceBufferStatus] = useState('idle'); // idle, connecting, connected, buffering, buffer-ended
    // const [currentEmotion, setCurrentEmotion] = useState('😊');
    // const [emotionText, setEmotionText] = useState('待机中');
    const [voiceSessionId, setVoiceSessionId] = useState(null);
    const [audioPlaying, setAudioPlaying] = useState(false);
    const [voiceSynthesisCompleted, setVoiceSynthesisCompleted] = useState(false);
    const [sendDisabled, setSendDisabled] = useState(false);

    // 角色表情相关状态
    const [currentEmotionKey, setCurrentEmotionKey] = useState(defaultEmotion);
    const [characterImage, setCharacterImage] = useState(null);

    // 音频播放相关 - 使用MediaSource + Web Audio混合架构
    const audioSystemRef = useRef({
      element: null,
      context: null,
      source: null,
      analyser: null,
      gainNode: null,
      mediaSource: null,
      sourceBuffer: null,
    });
    const audioBufferQueue = useRef([]);
    const isPlayingRef = useRef(false);
    const receivedBytesCount = useRef(0);

    const aiChatMessagesRef = useRef(null);
    const aiChatInputRef = useRef(null);
    const eventSourceRef = useRef(null);
    const pendingEventSourcesRef = useRef(new Map());
    const lastEmotionKeyRef = useRef(null);

    const { t } = useI18n();
    const { socket, isConnected, on, emit, getSocketId } = useSocket();

    // 动态加载角色立绘图片
    const loadCharacterImage = useCallback(async emotionKey => {
      try {
        if (!emotionKey || !characterEmotionMap[emotionKey]) {
          return null;
        }
        const config = characterEmotionMap[emotionKey];
        const imagePath = config.imagePath;
        // 动态导入图片
        const imageModule = await import(`../../assets/${imagePath}`);
        return imageModule.default;
      } catch (error) {
        console.warn('Failed to load character image:', error);
        return null;
      }
    }, []);

    // 监听character prop变化，启用或禁用语音功能
    useEffect(() => {
      if (selectedCharacter) {
        setVoiceEnabled(true);
        if (isConnected) {
          setVoiceBufferStatus('connected');
        } else {
          setVoiceBufferStatus('connecting');
        }

        // setCurrentEmotion(selectedCharacter.avatar);
        // setEmotionText(`${selectedCharacter.name}已连接`);
        ensureAudioContextActivated();
        // 加载默认表情立绘
        loadCharacterImage(defaultEmotion).then(image => {
          if (image) {
            setCharacterImage(image);
          }
        });
      } else {
        setVoiceEnabled(false);
        setVoiceConnected(false);
        setVoiceBufferStatus('idle');
        // setCurrentEmotion('😊');
        // setEmotionText('待机中');
        setVoiceSynthesisCompleted(false);
        setCharacterImage(null);
        interruptAudioPlayback();
      }
    }, [selectedCharacter, loadCharacterImage]);

    // 初始化语音相关功能
    useEffect(() => {
      const initAudioContext = async () => {
        try {
          const AudioContextClass = window.AudioContext || window['webkitAudioContext'];
          if (AudioContextClass) {
            audioSystemRef.current.context = new AudioContextClass();
            console.log('音频上下文初始化成功');
          } else {
            console.warn('浏览器不支持Web Audio API');
          }
        } catch (error) {
          console.error('音频上下文初始化失败:', error);
        }
      };

      initAudioContext();

      return () => {
        handleAudioCleanupOnNavigation().catch(error => {
          console.error('组件卸载时音频清理失败:', error);
        });

        if (audioSystemRef.current.context) {
          audioSystemRef.current.context.close();
        }
        cleanupAudioResources();
      };
    }, []);

    // 使用useSocket集成语音功能
    useEffect(() => {
      if (!voiceEnabled || !selectedCharacter || !socket || !isConnected) {
        return;
      }

      console.log('集成语音功能到现有Socket连接');

      const cleanupFunctions = [
        on('auth_success', data => {
          console.log('收到auth_success事件:', data);
          setVoiceConnected(true);
          setVoiceBufferStatus('connected');
        }),
        on('emotion_change', message => handleVoiceMessage({ type: 'emotion_change', message })),
        on('voice_audio', handleAudioData),
        on('voice_task_started', message =>
          handleVoiceMessage({ type: 'voice_task_started', message })
        ),
        on('voice_task_finished', message =>
          handleVoiceMessage({ type: 'voice_task_finished', message })
        ),
        on('voice_task_failed', message =>
          handleVoiceMessage({ type: 'voice_task_failed', message })
        ),
        on('voice_interrupted', message =>
          handleVoiceMessage({ type: 'voice_interrupted', message })
        ),
      ];

      // if (isConnected) {
      //   setVoiceConnected(true);
      //   setVoiceBufferStatus('connected');
      // }
      // if(lastIsConnectedRef.current == false && isConnected){
      //   setVoiceBufferStatus('connected');
      // }

      return () => {
        cleanupFunctions.forEach(cleanup => cleanup && cleanup());
      };
    }, [voiceEnabled, selectedCharacter, socket, isConnected, on]);

    // 角色选择功能已移至AnkiBar，此处仅保留状态显示

    // 音频清理函数
    const handleAudioCleanupOnNavigation = async () => {
      // 修复：只要有语音会话ID或者音频正在播放，就需要进行清理
      if (!voiceEnabled || (!audioPlaying && !voiceSessionId)) {
        return false;
      }

      console.log('导航时处理音频清理，当前状态:', {
        audioPlaying,
        voiceSynthesisCompleted,
        voiceSessionId,
      });

      // 如果有语音会话ID但语音合成未完成，发送打断指令
      if (voiceSessionId && !voiceSynthesisCompleted) {
        console.log('语音合成未完成，发送打断指令');
        try {
          await apiClient.post(`/aichat/interrupt-session/${voiceSessionId}`);
          console.log('已发送打断指令');
        } catch (error) {
          console.error('发送打断指令失败:', error);
        }
        interruptAudioPlayback();
        setVoiceSynthesisCompleted(true);
        setVoiceSessionId(null); // 清除会话ID
        return true;
      } else if (audioPlaying && voiceSynthesisCompleted) {
        console.log('语音合成已完成但音频活跃，直接清除音频资源');
        cleanupAudioResources();
        setAudioPlaying(false);
        isPlayingRef.current = false;
        return true;
      } else if (audioPlaying) {
        // 音频正在播放但没有会话ID的情况（可能是其他原因导致的播放）
        console.log('音频正在播放，清理音频资源');
        interruptAudioPlayback();
        return true;
      }
    };

    // 处理音频数据
    const handleAudioData = async audioData => {
      if (voiceBufferStatus !== 'buffering') {
        return;
      }
      try {
        console.log('🎵 收到音频数据:', audioData, '类型:', typeof audioData);

        if (audioData instanceof ArrayBuffer) {
          receivedBytesCount.current += audioData.byteLength;
          audioBufferQueue.current.push(new Uint8Array(audioData));
          // console.log(
          //   '🎵 接收到音频数据:',
          //   audioData.byteLength,
          //   '字节，缓冲区大小:',
          //   audioBufferQueue.current.length,
          //   '总接收字节数:',
          //   receivedBytesCount.current
          // );

          if (!isPlayingRef.current && audioBufferQueue.current.length > 0) {
            console.log('🎵 首次音频数据，开始播放...');
            startAudioPlayback();
          } else if (
            isPlayingRef.current &&
            audioSystemRef.current.sourceBuffer &&
            !audioSystemRef.current.sourceBuffer.updating
          ) {
            console.log('🎵 音频播放中，添加新数据...');
            flushAudioBuffer();
          } else {
            console.log('🎵 音频数据已缓存，等待播放系统准备...');
          }
        } else {
          console.warn('🎵 接收到非ArrayBuffer格式的音频数据:', typeof audioData, audioData);
        }
      } catch (error) {
        console.error('🎵 处理音频数据时出错:', error);
      }
    };

    // 开始音频播放
    const startAudioPlayback = async () => {
      if (isPlayingRef.current) return;

      try {
        isPlayingRef.current = true;
        setAudioPlaying(true);
        setVoiceSynthesisCompleted(false);
        console.log('开始音频播放');

        await ensureAudioContextActivated();
        await initAudioSystem();

        if ('MediaSource' in window && MediaSource.isTypeSupported('audio/mpeg')) {
          await startMediaSourcePlayback();
        } else {
          console.warn('MediaSource不支持，降级到基础播放');
        }
      } catch (error) {
        console.error('音频播放错误:', error);
        isPlayingRef.current = false;
        setAudioPlaying(false);
      }
    };

    // 确保音频上下文被激活
    const ensureAudioContextActivated = async () => {
      try {
        if (audioSystemRef.current.context) {
          if (audioSystemRef.current.context.state === 'suspended') {
            console.log('激活音频上下文...');
            await audioSystemRef.current.context.resume();
            console.log('音频上下文已激活，状态:', audioSystemRef.current.context.state);
          }
        }
      } catch (error) {
        console.error('激活音频上下文失败:', error);
      }
    };

    // 清空音频缓冲区
    const flushAudioBuffer = () => {
      const sourceBuffer = audioSystemRef.current.sourceBuffer;
      if (!sourceBuffer || sourceBuffer.updating || audioBufferQueue.current.length === 0) {
        return;
      }

      try {
        const totalLength = audioBufferQueue.current.reduce((sum, chunk) => sum + chunk.length, 0);
        const combinedArray = new Uint8Array(totalLength);
        let offset = 0;

        for (const chunk of audioBufferQueue.current) {
          combinedArray.set(chunk, offset);
          offset += chunk.length;
        }

        sourceBuffer.appendBuffer(combinedArray);
        audioBufferQueue.current = [];
        console.log('添加音频数据到播放缓冲区:', totalLength, '字节');
      } catch (error) {
        console.error('添加音频数据到缓冲区失败:', error);
      }
    };

    // 初始化音频系统
    const initAudioSystem = async () => {
      try {
        console.log('🎧 初始化音频系统...');
        cleanupAudioResources();

        const audioElement = document.createElement('audio');
        audioElement.preload = 'auto';
        audioElement.controls = false;
        audioElement.style.display = 'none';
        audioElement.crossOrigin = 'anonymous';
        audioElement.volume = 0.8;

        document.body.appendChild(audioElement);
        audioSystemRef.current.element = audioElement;

        audioElement.onended = () => {
          console.log('音频播放自然结束');
          onAudioPlaybackComplete();
        };

        audioElement.onerror = e => {
          console.error('音频播放错误:', e);
          if (isPlayingRef.current) {
            resetAudioPlayback();
          }
        };

        audioElement.oncanplay = () => {
          console.log('音频可以播放');
        };

        audioElement.onloadstart = () => {
          console.log('音频开始加载');
        };

        if (audioSystemRef.current.context) {
          await setupWebAudioChain();
        }
      } catch (error) {
        console.error('❌ 音频系统初始化失败:', error);
      }
    };

    // 设置Web Audio分析链
    const setupWebAudioChain = async () => {
      try {
        console.log('🔧 设置Web Audio分析链...');
        const ctx = audioSystemRef.current.context;

        audioSystemRef.current.source = ctx.createMediaElementSource(
          audioSystemRef.current.element
        );
        audioSystemRef.current.gainNode = ctx.createGain();
        audioSystemRef.current.gainNode.gain.value = 0.8;
        audioSystemRef.current.analyser = ctx.createAnalyser();
        audioSystemRef.current.analyser.fftSize = 256;
        audioSystemRef.current.analyser.smoothingTimeConstant = 0.8;

        audioSystemRef.current.source.connect(audioSystemRef.current.gainNode);
        audioSystemRef.current.gainNode.connect(audioSystemRef.current.analyser);
        audioSystemRef.current.analyser.connect(ctx.destination);

        console.log('✅ Web Audio分析链设置完成');
      } catch (error) {
        console.error('💥 Web Audio链设置失败:', error);
      }
    };

    // 开始MediaSource播放
    const startMediaSourcePlayback = async () => {
      cleanupMediaSource();

      audioSystemRef.current.mediaSource = new MediaSource();
      audioSystemRef.current.element.src = URL.createObjectURL(audioSystemRef.current.mediaSource);
      console.log('创建新的MediaSource');

      audioSystemRef.current.mediaSource.addEventListener('sourceopen', () => {
        console.log('MediaSource已打开，开始流式播放');

        try {
          audioSystemRef.current.sourceBuffer =
            audioSystemRef.current.mediaSource.addSourceBuffer('audio/mpeg');
          audioSystemRef.current.sourceBuffer.mode = 'sequence';

          flushAudioBuffer();
          console.log('readyState', audioSystemRef.current.element.readyState);
          audioSystemRef.current.element.play();

          audioSystemRef.current.sourceBuffer.addEventListener('updateend', () => {
            if (audioBufferQueue.current.length > 0) {
              flushAudioBuffer();
            }
          });
        } catch (error) {
          console.error('创建SourceBuffer失败:', error);
          resetAudioPlayback();
        }
      });

      audioSystemRef.current.mediaSource.addEventListener('error', e => {
        console.error('MediaSource错误:', e);
        resetAudioPlayback();
      });
    };

    // 清理MediaSource
    const cleanupMediaSource = () => {
      if (audioSystemRef.current.mediaSource) {
        if (audioSystemRef.current.mediaSource.readyState === 'open') {
          try {
            audioSystemRef.current.mediaSource.endOfStream();
          } catch (e) {
            console.log('关闭旧MediaSource');
          }
        }

        if (audioSystemRef.current.element && audioSystemRef.current.element.src) {
          URL.revokeObjectURL(audioSystemRef.current.element.src);
        }
      }
    };

    // 重置音频播放状态
    const resetAudioPlayback = () => {
      if (!isPlayingRef.current) return;

      console.log('重置音频播放状态');
      isPlayingRef.current = false;
      setAudioPlaying(false);
      cleanupAudioResources();
    };

    // 清理音频资源
    const cleanupAudioResources = () => {
      try {
        console.log('🧹 开始清理音频系统...');

        if (audioSystemRef.current.element) {
          audioSystemRef.current.element.pause();
          audioSystemRef.current.element.currentTime = 0;
          audioSystemRef.current.element.onended = null;
          audioSystemRef.current.element.onerror = null;

          if (audioSystemRef.current.element.parentNode) {
            audioSystemRef.current.element.parentNode.removeChild(audioSystemRef.current.element);
          }
        }

        if (audioSystemRef.current.sourceBuffer) {
          audioSystemRef.current.sourceBuffer = null;
        }

        cleanupMediaSource();
        audioSystemRef.current.mediaSource = null;

        if (audioSystemRef.current.source) {
          try {
            audioSystemRef.current.source.disconnect();
          } catch (e) {
            console.log('源节点已断开');
          }
          audioSystemRef.current.source = null;
        }
        if (audioSystemRef.current.gainNode) {
          try {
            audioSystemRef.current.gainNode.disconnect();
          } catch (e) {
            console.log('增益节点已断开');
          }
          audioSystemRef.current.gainNode = null;
        }
        if (audioSystemRef.current.analyser) {
          try {
            audioSystemRef.current.analyser.disconnect();
          } catch (e) {
            console.log('分析器节点已断开');
          }
          audioSystemRef.current.analyser = null;
        }

        audioSystemRef.current.element = null;
        audioBufferQueue.current = [];
        receivedBytesCount.current = 0;

        console.log('✅ 音频系统资源清理完成');
      } catch (error) {
        console.error('清理音频系统时出错:', error);
      }
    };

    // 音频播放完成处理
    const onAudioPlaybackComplete = () => {
      console.log('🎉 语音播放自然结束');
      resetAudioPlayback();
    };

    // 暂停音频播放
    const pauseAudioPlayback = () => {
      console.log('暂停音频播放');

      if (audioSystemRef.current.element && !audioSystemRef.current.element.paused) {
        audioSystemRef.current.element.pause();
        console.log('音频已暂停');
      }
    };

    // 恢复音频播放
    const resumeAudioPlayback = () => {
      console.log('恢复音频播放');

      if (audioSystemRef.current.element && audioSystemRef.current.element.paused) {
        audioSystemRef.current.element
          .play()
          .then(() => {
            console.log('音频已恢复播放');
          })
          .catch(error => {
            console.error('恢复音频播放失败:', error);
          });
      }
    };

    // 中断音频播放
    const interruptAudioPlayback = () => {
      console.log('中断音频播放');

      stopAudioPlayback();
      isPlayingRef.current = false;
      setAudioPlaying(false);

      console.log('音频播放已中断');
    };

    // 停止音频播放
    const stopAudioPlayback = () => {
      console.log('停止音频播放');

      if (audioSystemRef.current.element) {
        audioSystemRef.current.element.pause();
        audioSystemRef.current.element.currentTime = 0;
      }

      cleanupAudioResources();
      isPlayingRef.current = false;
      setAudioPlaying(false);
    };

    // 处理语音消息
    const handleVoiceMessage = message => {
      console.log('收到语音消息:', message);

      switch (message.type) {
        case 'emotion_change':
          updateCharacterEmotionAccordingToDescription(message?.message?.emotion);
          break;
        //服务器的cosyvoice开始接受文字流，实时生成音频buffer开始往前端推流
        case 'voice_task_started':
          setVoiceBufferStatus('buffering');
          // setEmotionText('开始朗读');
          setVoiceSynthesisCompleted(false);
          break;

        //服务器的cosyvoice生成音频buffer推流结束
        case 'voice_task_finished':
          setVoiceBufferStatus('connected');
          // setEmotionText('朗读完成');
          setVoiceSynthesisCompleted(true);
          console.log('语音合成完成，现在只能暂停/恢复');
          break;

        case 'voice_task_failed':
          setVoiceBufferStatus('error');
          // setEmotionText('朗读失败');
          console.error('语音任务失败:', message?.message?.error);
          break;

        case 'voice_interrupted':
          console.log('voice_interrupted');
          setVoiceBufferStatus('connected');
          // setEmotionText('已中断');
          setVoiceSynthesisCompleted(true);
          interruptAudioPlayback();
          break;

        default:
          console.log('未知语音消息类型:', message.type);
      }
    };

    // 更新角色表情
    const updateCharacterEmotionAccordingToDescription = async emotionDescription => {
      console.log('更新角色表情:', emotionDescription);

      let matchedEmotion = null;
      let matchdEmotionKey = null;
      for (const [key, value] of Object.entries(characterEmotionMap)) {
        if (emotionDescription.includes(value?.name)) {
          matchedEmotion = value;
          matchdEmotionKey = key;
          break;
        }
      }

      console.log('dasd', matchedEmotion, matchedEmotion);

      if (matchedEmotion) {
        updateCharacterEmotion(matchdEmotionKey);
      }
    };

    const updateCharacterEmotion = async emotionKey => {
      if (selectedCharacter && emotionKey && emotionKey !== currentEmotionKey) {
        setCurrentEmotionKey(emotionKey);

        // 动态加载新的角色立绘图片
        try {
          const newImage = await loadCharacterImage(emotionKey);
          if (newImage) {
            setCharacterImage(newImage);
          }
        } catch (error) {
          console.warn('加载角色立绘失败:', error);
        }
      }
    };

    // 处理语音控制按钮点击
    const handleVoiceControlButton = async () => {
      if (!audioPlaying) return;

      if (voiceSynthesisCompleted) {
        if (audioSystemRef.current.element && !audioSystemRef.current.element.paused) {
          lastEmotionKeyRef.current = currentEmotionKey;
          updateCharacterEmotion('angry');
          pauseAudioPlayback();
        } else {
          updateCharacterEmotion(lastEmotionKeyRef.current);
          resumeAudioPlayback();
        }
      } else {
        if (voiceSessionId) {
          try {
            const res = await apiClient.post(`/aichat/interrupt-session/${voiceSessionId}`);
            console.log('已发送打断指令', res);
          } catch (error) {
            console.error('发送打断指令失败:', error);
            message.error('中断语音对话失败');
          }
        }
        interruptAudioPlayback();
        setVoiceBufferStatus('connected');
        // setEmotionText('已中断');
        setVoiceSynthesisCompleted(false);
      }
    };

    // 获取语音控制按钮内容
    const getVoiceControlButtonContent = () => {
      if (!audioPlaying) return null;

      if (voiceSynthesisCompleted) {
        const isPaused = audioSystemRef.current.element && audioSystemRef.current.element.paused;
        return isPaused ? '恢复' : ' 暂停';
      } else {
        return '打断';
      }
    };

    // 清理EventSource连接
    const cleanupEventSources = useCallback(() => {
      console.log('清理EventSource连接');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      pendingEventSourcesRef.current.forEach((eventSource, sessionId) => {
        eventSource.close();
      });
      pendingEventSourcesRef.current.clear();
      setIsHandlingChunkSession(false);
    }, []);

    // 处理chunk会话
    const handleChunkSession = useCallback(
      sessionId => {
        setIsHandlingChunkSession(true);

        // 如果启用了语音功能，设置语音会话ID
        if (voiceEnabled && selectedCharacter) {
          setVoiceSessionId(sessionId);
        }

        const token = localStorage.getItem('token');
        const eventSource = new EventSource(
          `${process.env.API_BASE_URL}/aichat/stream/${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-User-Id': localStorage.getItem('userId'),
            },
          }
        );
        eventSourceRef.current = eventSource;

        let streamedContent = '';
        eventSource.onmessage = event => {
          const eventData = event.data;
          const jsonData = JSON.parse(eventData);
          console.log('jsonData', jsonData);

          if (jsonData.event === 'message') {
            streamedContent += jsonData.data;
            setChatMessages(prevMessages => {
              const updatedMessages = [...prevMessages];
              const lastMessageIndex = updatedMessages.length - 1;

              if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'assistant') {
                updatedMessages[lastMessageIndex] = {
                  ...updatedMessages[lastMessageIndex],
                  content: streamedContent,
                  pending: true,
                  sessionId: sessionId, // 添加sessionId
                };
              }

              return updatedMessages;
            });
          } else if (jsonData.event === 'complete') {
            try {
              console.log('Chunk聊天EventSource连接已关闭 (可能是会话结束或导航)');
              console.log('streamedContent', jsonData);
              setChatMessages(prevMessages => {
                const updatedMessages = [...prevMessages];
                const lastMessageIndex = updatedMessages.length - 1;

                if (
                  lastMessageIndex >= 0 &&
                  updatedMessages[lastMessageIndex].role === 'assistant'
                ) {
                  updatedMessages[lastMessageIndex] = {
                    ...updatedMessages[lastMessageIndex],
                    content: streamedContent,
                    pending: false,
                  };
                }

                return updatedMessages;
              });

              eventSource.close();
              eventSourceRef.current = null;
              setIsHandlingChunkSession(false);
            } catch (error) {
              console.error('Error handling complete event:', error);
            }
          }
        };

        eventSource.onerror = error => {
          const eventSourceTarget = error?.target;
          const readyState =
            eventSourceTarget && 'readyState' in eventSourceTarget
              ? eventSourceTarget.readyState
              : undefined;

          if (readyState === 2) {
            console.log('Chunk聊天EventSource连接已关闭 (可能是会话结束或导航)');
          } else {
            console.error('Chunk聊天EventSource连接异常:', {
              readyState: readyState,
              error: error,
            });

            setChatMessages(prevMessages => {
              const updatedMessages = [...prevMessages];
              const lastMessageIndex = updatedMessages.length - 1;

              if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'assistant') {
                updatedMessages[lastMessageIndex] = {
                  ...updatedMessages[lastMessageIndex],
                  content: streamedContent || 'Error: Failed to receive response',
                  pending: false,
                  error: true,
                };
              }

              return updatedMessages;
            });
          }

          eventSource.close();
          eventSourceRef.current = null;
          setIsHandlingChunkSession(false);
        };
      },
      [setChatMessages, voiceEnabled, selectedCharacter?.code]
    );

    // 暴露方法给父组件
    useImperativeHandle(
      ref,
      () => ({
        cleanupEventSources,
        handleChunkSession,
        handleAudioCleanupOnNavigation,
        getAIChat, // 暴露getAIChat方法
      }),
      [cleanupEventSources, handleChunkSession, handleAudioCleanupOnNavigation]
    );

    // 翻译语言选项
    const translationLanguages = [
      { key: 'chinese', label: t('anki.translateToChinese'), code: 'Chinese' },
      { key: 'english', label: t('anki.translateToEnglish'), code: 'English' },
      { key: 'japanese', label: t('anki.translateToJapanese'), code: 'Japanese' },
      { key: 'korean', label: t('anki.translateToKorean'), code: 'Korean' },
      { key: 'french', label: t('anki.translateToFrench'), code: 'French' },
      { key: 'german', label: t('anki.translateToGerman'), code: 'German' },
      { key: 'spanish', label: t('anki.translateToSpanish'), code: 'Spanish' },
    ];

    // 获取AI聊天历史 - 修复缺失的函数
    const getAIChat = useCallback(
      (chatId, chunkId) => {
        if (setAiChatLoading) {
          setAiChatLoading(true);
        }
        let paramsStr = '';
        if (chunkId) {
          paramsStr = `?chunkId=${chunkId}`;
        }
        apiClient
          .get(`/aichat/${chatId}/messages${paramsStr}`)
          .then(res => {
            const data = res.data.data;
            setChatMessages(
              data.messages
                .map(item => ({
                  role: item.role,
                  content: item.content,
                  sessionId: item.sessionId,
                  pending: !!item.sessionId,
                }))
                .reverse()
            );
            setChatStatus(
              data.messages
                .map(item => ({
                  role: item.role,
                  content: item.content,
                  sessionId: item.sessionId,
                }))
                .reverse()
            );
            if (setAiChatLoading) {
              setAiChatLoading(false);
            }
          })
          .catch(err => {
            if (setAiChatLoading) {
              setAiChatLoading(false);
            }
            console.error('Error loading AI chat:', err);
          });
      },
      [setChatMessages, setChatStatus, setAiChatLoading]
    );

    // 当组件显示时加载聊天历史 - 但如果正在处理chunk会话则跳过
    useEffect(() => {
      // 跳过chunk会话：chunk会话有自己的消息管理逻辑
      if (visible && cardIdRef.current && !isHandlingChunkSession && !chunkId) {
        getAIChat(cardIdRef.current, chunkId);
      }
    }, [visible, cardIdRef.current, chunkId, getAIChat, isHandlingChunkSession]);

    // 组件卸载时清理EventSource
    useEffect(() => {
      return () => {
        cleanupEventSources();
      };
    }, [cleanupEventSources]);

    // 处理引用格式并转换为可点击链接
    const processCardReferences = useCallback(content => {
      if (!content) return content;

      const referenceRegex = /\[引用：([^[\]]*?)\s*\(ID:\s*([a-f0-9-]{36}|[a-f0-9-]{8,})\)\]/g;

      let processedContent = content.replace(referenceRegex, (match, cardName, cardId) => {
        const trimmedCardName = cardName.trim();
        const trimmedCardId = cardId.trim();

        if (!/^[a-f0-9-]{8,}$/i.test(trimmedCardId)) {
          return match;
        }

        return `<a href="#" class="card-reference-link" data-card-id="${trimmedCardId}" style="color: #1890ff; text-decoration: none; font-weight: 500; cursor: pointer; border-bottom: 1px dashed #1890ff;">[引用：${trimmedCardName}]</a>`;
      });

      const referenceListRegex = /(\*\*引用卡片：?\*\*|引用卡片：?)([\s\S]*?)(?=\n\n|\n\*\*|$)/g;

      processedContent = processedContent.replace(
        referenceListRegex,
        (match, title, listContent) => {
          const processedListContent = listContent.replace(
            /^(\s*[-*]\s*)([^(\n]+?)\s*\(ID:\s*([a-f0-9-]{8,})\)\s*$/gm,
            (itemMatch, listPrefix, cardName, cardId) => {
              const trimmedCardName = cardName.trim();
              const trimmedCardId = cardId.trim();

              if (!/^[a-f0-9-]{8,}$/i.test(trimmedCardId)) {
                return itemMatch;
              }

              return `${listPrefix}<a href="#" class="card-reference-link" data-card-id="${trimmedCardId}" style="color: #1890ff; text-decoration: none; font-weight: 500; cursor: pointer;">${trimmedCardName}</a>`;
            }
          );

          return title + processedListContent;
        }
      );

      return processedContent;
    }, []);

    const getHtmlContent = useCallback(markdownContent => {
      const rawHtml = marked(markdownContent);
      return rawHtml;
    }, []);

    const handleReferenceClick = useCallback(
      e => {
        e.preventDefault();
        if (e.target.classList.contains('card-reference-link')) {
          const cardId = e.target.getAttribute('data-card-id');
          if (cardId) {
            const rect = e.target.getBoundingClientRect();
            const popoverHeight = 300;
            const screenHeight = window.innerHeight;
            const topPosition =
              rect.top + popoverHeight > screenHeight
                ? Math.max(10, rect.top - popoverHeight)
                : rect.top;

            setPopoverPosition({ x: rect.left - 120, y: topPosition });
            setPopoverCard({ loading: true });
            setPopoverVisible(true);

            apiClient
              .get(`/anki/getCard?uuid=${cardId}`)
              .then(res => {
                const data = res.data;
                if (data.success && data.data?.card) {
                  setPopoverCard(data.data.card);
                } else {
                  setPopoverVisible(false);
                  message.warning(t('anki.cardNotFound'));
                }
              })
              .catch(err => {
                setPopoverVisible(false);
                message.error(t('anki.getCardFailed'));
              });
          }
        }
      },
      [t]
    );

    const renderContent = content => {
      if (!content) return null;

      const processedContent = processCardReferences(content);
      const htmlContent = getHtmlContent(processedContent);

      return (
        <>
          <div
            className="markdown-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
            onClick={handleReferenceClick}
            style={{ cursor: 'default' }}
          />

          {popoverVisible && popoverCard && (
            <div
              className="reference-card-popover"
              style={{
                position: 'fixed',
                left: Math.max(10, popoverPosition.x - 400),
                top: popoverPosition.y,
                zIndex: 1000,
                backgroundColor: 'white',
                border: '1px solid #d9d9d9',
                borderRadius: '6px',
                boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08)',
                padding: '16px',
                maxWidth: '380px',
                maxHeight: '400px',
                overflow: 'auto',
                animation: 'fadeIn 0.2s ease-in-out',
              }}
            >
              <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                {t('anki.referenceCard')}
              </div>

              {popoverCard.loading ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Spin size="small" />
                  <div style={{ marginTop: '8px', color: '#666', fontSize: '14px' }}>
                    {t('anki.loading')}
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <div
                      className="popover-content"
                      style={{
                        fontSize: '14px !important',
                        lineHeight: '1.4',
                        fontFamily: 'inherit',
                      }}
                      dangerouslySetInnerHTML={{
                        __html: getHtmlContent(popoverCard.customBack || popoverCard.back || ''),
                      }}
                    />
                  </div>
                  <div style={{ marginTop: '12px', textAlign: 'right' }}>
                    <Button
                      size="small"
                      type="link"
                      style={{ fontSize: '14px', padding: '0' }}
                      onClick={() => {
                        setPopoverVisible(false);
                        if (onCardClick) {
                          onCardClick(popoverCard.uuid, popoverCard);
                        }
                      }}
                    >
                      {t('anki.jumpToCard')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      );
    };

    const updateMessageContent = (sessionId, content, isPending, isError = false) => {
      setChatMessages(prevMessages => {
        const updatedMessages = [...prevMessages];
        const messageIndex = updatedMessages.findIndex(
          msg => msg.sessionId === sessionId && msg.role === 'assistant'
        );

        if (messageIndex >= 0) {
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            content: content,
            pending: isPending,
            error: isError,
          };
        }

        return updatedMessages;
      });
    };

    // 处理chatStatus状态变化 - 修复缺失的逻辑
    useEffect(() => {
      if (chatStatus.length > 0) {
        const pendingMessages = chatStatus.filter(
          item => !!item.sessionId && item.role === 'assistant'
        );

        pendingMessages.forEach((pendingMessage, index) => {
          const sessionId = pendingMessage.sessionId;

          if (pendingEventSourcesRef.current.has(sessionId)) {
            return;
          }

          const token = localStorage.getItem('token');
          const statusEventSource = new EventSource(
            `${process.env.API_BASE_URL}/aichat/status/${sessionId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-User-Id': localStorage.getItem('userId'),
              },
            }
          );

          pendingEventSourcesRef.current.set(sessionId, statusEventSource);

          let accumulatedContent = '';

          statusEventSource.onmessage = event => {
            const eventData = event.data;
            console.log('eventData', eventData);
            const jsonData = JSON.parse(eventData);
            if (jsonData.event === 'existing_content') {
              accumulatedContent = jsonData.data;
              updateMessageContent(sessionId, accumulatedContent, true);
            } else if (jsonData.event === 'message') {
              accumulatedContent += jsonData.data;
              updateMessageContent(sessionId, accumulatedContent, true);
            } else if (jsonData.event === 'complete') {
              try {
                console.log('accumulatedContent', accumulatedContent);
                accumulatedContent = jsonData?.data?.content || accumulatedContent;
                updateMessageContent(sessionId, accumulatedContent, false);
                statusEventSource.close();
                pendingEventSourcesRef.current.delete(sessionId);
              } catch (error) {
                console.error('Error handling complete event for session:', sessionId, error);
              }
            }
          };

          statusEventSource.onerror = error => {
            console.error('EventSource error for session:', sessionId, error);
            updateMessageContent(
              sessionId,
              accumulatedContent || 'Error: Failed to receive response',
              false,
              true
            );
            statusEventSource.close();
            pendingEventSourcesRef.current.delete(sessionId);
          };
        });
      }
    }, [chatStatus]);

    // 修改sendAiChatMessage函数以支持语音
    const sendAiChatMessage = async (msg, contextMode, useStreaming = useStreamingApi) => {
      // 如果启用了语音，确保音频上下文被激活
      if (voiceEnabled) {
        await ensureAudioContextActivated();

        // 根据语音合成状态决定处理方式 - 修复：也要考虑有会话ID但还没开始播放的情况
        if (audioPlaying || voiceSessionId) {
          if (audioPlaying && voiceSynthesisCompleted) {
            // 推流已完成，清理所有音频信息
            console.log('语音合成已完成，清理音频信息开始新对话');
            cleanupAudioResources();
            setAudioPlaying(false);
            isPlayingRef.current = false;
          } else if (voiceSessionId && !voiceSynthesisCompleted) {
            // 有会话ID且推流还没完成，执行打断操作
            console.log('语音合成未完成，执行打断操作');
            try {
              await apiClient.post(`/aichat/interrupt-session/${voiceSessionId}`);
              console.log('已发送打断指令');
            } catch (error) {
              console.error('发送打断指令失败:', error);
            }
            interruptAudioPlayback();
          } else if (audioPlaying) {
            // 音频正在播放但没有会话ID的情况
            console.log('音频正在播放，执行中断操作');
            interruptAudioPlayback();
          }
        }

        // 重置语音合成状态，准备新对话
        setVoiceSynthesisCompleted(false);
        setVoiceSessionId(null); // 清除旧的会话ID
      }

      // 清理现有的EventSource连接
      cleanupEventSources();

      setChatMessages(prevMessages => {
        const updatedMessages = [
          ...prevMessages,
          { role: 'user', content: msg },
          { role: 'assistant', pending: true, content: '' },
        ];
        return updatedMessages;
      });

      setTimeout(() => {
        if (aiChatMessagesRef.current) {
          aiChatMessagesRef.current.scrollTo({
            top: aiChatMessagesRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      });

      let contextContent = '';
      if (['Deck', 'Card'].includes(contextMode || chatContext) && card) {
        contextContent = `${card['customBack'] || card['back'] || ''}`;
      }

      const requestParams = {
        cardId: cardIdRef.current,
        chatcontext: contextMode || chatContext,
        chattype: 'Generic',
        chunkId,
        question: msg,
        contextContent: contextContent,
        model: 'deepseek-chat',
        // 添加语音相关参数
        character: voiceEnabled && selectedCharacter ? selectedCharacter.code : undefined,
        socketId: voiceEnabled ? getSocketId() : undefined,
      };

      if (useStreaming) {
        try {
          setSendDisabled(true);
          const initResponse = await apiClient.post('/aichat/initSession', requestParams);
          setSendDisabled(false);

          if (!initResponse.data?.data?.sessionId) {
            throw new Error('Failed to initialize chat session');
          }

          const sessionId = initResponse.data.data.sessionId;
          setVoiceSessionId(sessionId);

          // 立即更新最后一条assistant消息，添加sessionId
          setChatMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const lastMessageIndex = updatedMessages.length - 1;

            if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'assistant') {
              updatedMessages[lastMessageIndex] = {
                ...updatedMessages[lastMessageIndex],
                sessionId: sessionId,
              };
            }

            return updatedMessages;
          });

          const token = localStorage.getItem('token');
          const eventSource = new EventSource(
            `${process.env.API_BASE_URL}/aichat/stream/${sessionId}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'X-User-Id': localStorage.getItem('userId'),
              },
            }
          );
          eventSourceRef.current = eventSource;

          let streamedContent = '';

          eventSource.onmessage = event => {
            const eventData = event.data;
            const jsonData = JSON.parse(eventData);

            if (jsonData.event === 'message') {
              streamedContent += jsonData.data;
              setChatMessages(prevMessages => {
                const updatedMessages = [...prevMessages];
                const lastMessageIndex = updatedMessages.length - 1;

                if (
                  lastMessageIndex >= 0 &&
                  updatedMessages[lastMessageIndex].role === 'assistant'
                ) {
                  updatedMessages[lastMessageIndex] = {
                    ...updatedMessages[lastMessageIndex],
                    content: streamedContent,
                    pending: true,
                  };
                }

                return updatedMessages;
              });
            } else if (jsonData.event === 'complete') {
              try {
                const completeData = JSON.parse(jsonData.data);

                setChatMessages(prevMessages => {
                  const updatedMessages = [...prevMessages];
                  const lastMessageIndex = updatedMessages.length - 1;

                  if (
                    lastMessageIndex >= 0 &&
                    updatedMessages[lastMessageIndex].role === 'assistant'
                  ) {
                    updatedMessages[lastMessageIndex] = {
                      ...updatedMessages[lastMessageIndex],
                      content: completeData.content,
                      pending: false,
                    };
                  }

                  return updatedMessages;
                });

                eventSource.close();
                eventSourceRef.current = null;
              } catch (error) {
                console.error('Error handling complete event:', error);
              }
            }
          };

          eventSource.onerror = error => {
            const eventSourceTarget = error?.target;
            const readyState =
              eventSourceTarget && 'readyState' in eventSourceTarget
                ? eventSourceTarget.readyState
                : undefined;

            if (readyState === 2) {
              console.log('AI聊天EventSource连接已关闭 (可能是会话结束或导航)');
            } else {
              console.error('AI聊天EventSource连接异常:', {
                readyState: readyState,
                error: error,
              });

              setChatMessages(prevMessages => {
                const updatedMessages = [...prevMessages];
                const lastMessageIndex = updatedMessages.length - 1;

                if (
                  lastMessageIndex >= 0 &&
                  updatedMessages[lastMessageIndex].role === 'assistant'
                ) {
                  updatedMessages[lastMessageIndex] = {
                    ...updatedMessages[lastMessageIndex],
                    content: streamedContent || 'Error: Failed to receive response',
                    pending: false,
                    error: true,
                  };
                }

                return updatedMessages;
              });
            }

            eventSource.close();
            eventSourceRef.current = null;
          };
        } catch (error) {
          console.error('Error initiating chat session:', error);
          message.error(error?.response?.data?.message || 'Failed to send message');

          setChatMessages(prevMessages => {
            const updatedMessages = [...prevMessages];
            const lastMessageIndex = updatedMessages.length - 1;

            if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'assistant') {
              updatedMessages[lastMessageIndex] = {
                ...updatedMessages[lastMessageIndex],
                content: error?.response?.data?.message || 'Error: Failed to connect to AI service',
                pending: false,
                error: true,
              };
            }

            return updatedMessages;
          });
        }
      }
    };

    // 中断文本流输出
    const interruptTextStream = async () => {
      // 从最新的pending消息中获取sessionId
      const lastMessage = chatMessages[chatMessages.length - 1];
      const sessionId = lastMessage?.sessionId;

      if (sessionId) {
        try {
          await apiClient.post(`/aichat/interrupt-session/${sessionId}`);
          console.log('已发送文本流中断指令');

          // 后端会自动停止推送，不需要手动关闭EventSource
          // 直接更新消息状态

          message.success('已中断文本流输出');
        } catch (error) {
          console.error('中断文本流失败:', error);
          message.error('中断文本流失败');
        }
      }
    };

    // 检查是否有pending消息
    const hasPendingMessage =
      chatMessages.length > 0 &&
      chatMessages[chatMessages.length - 1].role === 'assistant' &&
      chatMessages[chatMessages.length - 1].pending;

    // Quick actions 配置
    const quickActions = [
      {
        key: 'translate',
        reference: 'card',
        label: t('anki.translateCard'),
        prompt: 'Please translate this card content',
        icon: '🌐',
        hasSubmenu: true,
      },
      {
        key: 'explain',
        reference: 'card',
        label: t('anki.explainCard'),
        prompt: 'Please provide a detailed explanation and analysis of this card content',
        icon: '📝',
      },
      {
        key: 'polish',
        reference: 'card',
        label: t('anki.polishText'),
        prompt: 'Please provide suggestions to improve and polish this card content',
        icon: '✨',
      },
      {
        key: 'summarize',
        reference: 'card',
        label: t('anki.summarizeCard'),
        prompt: 'Please summarize the key points of this card content',
        icon: '📋',
      },
      {
        key: 'questions',
        reference: 'card',
        label: t('anki.generateQuestions'),
        prompt: 'Please generate some study questions based on this card content',
        icon: '❓',
      },
      {
        key: 'similar',
        reference: 'deck',
        label: t('anki.findSimilar'),
        prompt: 'Please find and explain similar concepts related to this card content',
        icon: '🔍',
      },
    ];

    const handleQuickAction = async action => {
      if (action.key === 'translate' && action.hasSubmenu) {
        setShowTranslateSelect(!showTranslateSelect);
        return;
      }

      const prompt = action.prompt;
      let contextMode = 'Card';
      if (action.reference === 'card') {
        contextMode = 'Card';
      } else if (action.reference === 'deck') {
        contextMode = 'Deck';
      } else if (action.reference === 'none') {
        contextMode = 'None';
      }

      setChatContext(contextMode);
      setQuickActionsVisible(false);
      setShowTranslateSelect(false);

      if (chatMessages.length > 0 && chatMessages[chatMessages.length - 1].pending) {
        await interruptTextStream();
        setTimeout(() => {
          sendAiChatMessage(prompt, contextMode);
        }, 300);
        return;
      }

      if (prompt.trim()) {
        sendAiChatMessage(prompt, contextMode);
      }

      setAiChatPrompt('');
      if (aiChatInputRef.current) {
        aiChatInputRef.current.blur();
      }
    };

    const handleTranslateAction = async language => {
      const prompt = `Please translate this card content to ${language.code}`;
      setChatContext('Card');
      setQuickActionsVisible(false);
      setShowTranslateSelect(false);

      if (chatMessages.length > 0 && chatMessages[chatMessages.length - 1].pending) {
        await interruptTextStream();
        setTimeout(() => {
          sendAiChatMessage(prompt, 'Card');
        }, 300);
        return;
      }

      if (prompt.trim()) {
        sendAiChatMessage(prompt, 'Card');
      }

      setAiChatPrompt('');
      if (aiChatInputRef.current) {
        aiChatInputRef.current.blur();
      }
    };

    const handleInputFocus = () => {
      if (!aiChatPrompt.trim()) {
        setQuickActionsVisible(true);
      }
    };

    const handleInputBlur = e => {
      setTimeout(() => {
        if (!e.relatedTarget || !e.relatedTarget.closest('.quick-actions-container')) {
          setQuickActionsVisible(false);
          setShowTranslateSelect(false);
        }
      }, 150);
    };

    const handleInputChange = e => {
      const value = e.target.value;
      setAiChatPrompt(value);

      if (value.trim()) {
        setQuickActionsVisible(false);
        setShowTranslateSelect(false);
      } else if (document.activeElement === aiChatInputRef.current?.resizableTextArea?.textArea) {
        setQuickActionsVisible(true);
        setShowTranslateSelect(false);
      }
    };

    // 处理点击外部关闭翻译选择
    useEffect(() => {
      const handleClickOutside = event => {
        if (showTranslateSelect) {
          const clickedInsideQuickActions = event.target.closest('.quick-actions-container');

          if (!clickedInsideQuickActions) {
            setShowTranslateSelect(false);
            setQuickActionsVisible(false);
          } else {
            const clickedInsideTranslateSelect =
              event.target.closest('.translate-option') ||
              event.target.closest('.quick-action-button[data-translate="true"]');
            if (!clickedInsideTranslateSelect) {
              setShowTranslateSelect(false);
            }
          }
        }
      };

      if (showTranslateSelect) {
        setTimeout(() => {
          document.addEventListener('click', handleClickOutside);
        }, 0);
      }

      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }, [showTranslateSelect]);

    // 自动滚动到底部
    useEffect(() => {
      if (visible && !aiChatLoading) {
        setTimeout(() => {
          if (aiChatMessagesRef.current) {
            aiChatMessagesRef.current.scrollTo({
              top: aiChatMessagesRef.current.scrollHeight,
            });
          }
        }, 100);
      }
    }, [visible, aiChatLoading]);

    // 处理页面点击关闭卡片弹窗
    const handlePageClick = useCallback(
      e => {
        if (
          popoverVisible &&
          !e.target.closest('.card-reference-link') &&
          !e.target.closest('.reference-card-popover')
        ) {
          setPopoverVisible(false);
        }
      },
      [popoverVisible]
    );

    useEffect(() => {
      if (popoverVisible) {
        document.addEventListener('click', handlePageClick);
        return () => {
          document.removeEventListener('click', handlePageClick);
        };
      }
    }, [popoverVisible, handlePageClick]);

    // 暴露清理函数给父组件
    useEffect(() => {
      if (visible && !isHandlingChunkSession) {
        // 当组件变为可见时，清理可能存在的连接（但不在chunk会话期间）
        cleanupEventSources();
      }
    }, [visible, cleanupEventSources, isHandlingChunkSession]);

    // 添加动画样式
    useEffect(() => {
      if (!document.getElementById('character-loading-animations')) {
        const style = document.createElement('style');
        style.id = 'character-loading-animations';
        style.textContent = `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
              transform: translateX(-50%) translateY(0);
            }
            40% {
              transform: translateX(-50%) translateY(-5px);
            }
            60% {
              transform: translateX(-50%) translateY(-3px);
            }
          }
        `;
        document.head.appendChild(style);
      }
    }, []);

    console.log(
      voiceBufferStatus,
      'dasdasdasd',
      voiceBufferStatus === 'buffering',
      voiceEnabled,
      audioPlaying,
      voiceSessionId
    );

    if (!visible) return null;

    return (
      <>
        <div
          className="side-chat-container"
          style={{
            backgroundColor: 'white',
            backgroundImage: 'none', // selectedCharacter && characterImage ? `url(${characterImage})`
            backgroundSize: 'contain',
            backgroundPosition: 'bottom right',
            backgroundRepeat: 'no-repeat',
            width: '25%',
            borderLeft: '1px solid #f0f0f0',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <div
            className="ai-chat-header"
            style={{
              padding: '16px',
              boxSizing: 'border-box',
              height: '64px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="alpha-tag"
                style={{
                  fontSize: '12px',
                  padding: '2px 6px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                }}
              >
                {t('anki.aiChat')}
              </span>
              {/* 语音状态指示器 */}
              {voiceEnabled && selectedCharacter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {/* <span style={{ fontSize: '16px' }}>{currentEmotion}</span> */}
                  {/* <span style={{ fontSize: '10px', color: '#666' }}>{emotionText}</span> */}
                  {/* <div style={{ fontSize: '8px', color: '#999', marginLeft: '4px' }}>
                    {audioPlaying ? '🔊播放中' : '⏸️待机'}
                    {audioSystemRef.current.context && ` | ${audioSystemRef.current.context.state}`}
                  </div> */}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Button
                type="text"
                icon={<CloseOutlined />}
                onClick={() => {
                  cleanupEventSources();
                  onClose();
                }}
              />
            </div>
          </div>

          {/* 角色立绘显示区域 */}
          {selectedCharacter && characterImage && (
            <div
              className="character-portrait"
              style={{
                position: 'fixed',
                right: '25%',
                bottom: '0',
                width: '180px',
                height: '320px',
                zIndex: 1000,
                pointerEvents: 'none',
                opacity: 0.9,
              }}
            >
              <img
                src={characterImage}
                alt={`${selectedCharacter.name} - ${characterEmotionMap[currentEmotionKey]?.name || '默认'}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
                }}
              />

              {/* Buffering状态的可爱loading指示器 */}
              {voiceEnabled && audioPlaying && (
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '20px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    fontSize: '12px',
                    color: '#666',
                    animation: 'bounce 1s infinite',
                    pointerEvents: 'visible',
                  }}
                >
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid #f3f3f3',
                      borderTop: '2px solid #1890ff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />

                  {voiceEnabled && audioPlaying && (
                    <div>
                      <Tooltip
                        title={
                          voiceSynthesisCompleted
                            ? audioSystemRef.current.element &&
                              audioSystemRef.current.element.paused
                              ? '恢复播放'
                              : '暂停播放'
                            : '打断语音合成'
                        }
                      >
                        <Button
                          type="text"
                          size="small"
                          onClick={handleVoiceControlButton}
                          style={{
                            color: voiceSynthesisCompleted ? '#1890ff' : '#ff4d4f',
                            fontSize: '12px',
                            background: 'rgba(255, 255, 255, 0.9)',
                            borderRadius: '16px',
                            padding: '4px 8px',
                          }}
                        >
                          {getVoiceControlButtonContent()}
                        </Button>
                      </Tooltip>
                    </div>
                  )}
                </div>
              )}

              {/* 语音控制按钮 */}
            </div>
          )}

          <div
            className="ai-chat-container"
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              overflow: 'hidden',
            }}
          >
            {aiChatLoading ? (
              <div
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  overflowY: 'auto',
                  flex: 1,
                  position: 'relative',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    selectedCharacter && characterImage
                      ? 'rgba(255, 255, 255, 0.9)'
                      : 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: selectedCharacter && characterImage ? 'blur(2px)' : 'none',
                }}
              >
                <LoadingOutlined style={{ fontSize: '32px' }} />
              </div>
            ) : (
              <div
                className="ai-chat-messages"
                ref={aiChatMessagesRef}
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  overflowY: 'auto',
                  flex: 1,
                  position: 'relative',
                }}
              >
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
                    style={{
                      maxWidth: '80%',
                      width: message.pending && message.role !== 'user' ? '80%' : 'auto',
                      alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      className="message-content"
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        wordBreak: 'break-word',
                        backgroundColor: message.role === 'user' ? '#1890ff' : '#f5f5f5',
                        color: message.role === 'user' ? 'white' : 'rgba(0, 0, 0, 0.85)',
                        minHeight: message.pending && message.role !== 'user' ? '480px' : 'auto',
                        border: selectedCharacter ? '1px solid rgba(255, 255, 255, 0.2)' : 'none',
                        // backdropFilter: selectedCharacter ? 'blur(5px)' : 'none',
                      }}
                    >
                      {message.pending
                        ? message.content
                          ? renderContent(message.content)
                          : t('anki.thinking')
                        : message.role === 'user'
                          ? message.content
                          : renderContent(message.content)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div
              className="ai-chat-input"
              style={{
                padding: '16px',
                borderTop: '1px solid #f0f0f0',
                borderBottom: '1px solid #f0f0f0',
                background:
                  selectedCharacter && characterImage ? 'rgba(255, 255, 255, 0.95)' : 'white',
                backdropFilter: selectedCharacter && characterImage ? 'blur(2px)' : 'none',
                position: 'relative',
              }}
            >
              {/* Quick Actions */}
              {quickActionsVisible && !aiChatPrompt.trim() && (
                <div
                  className="quick-actions-container"
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '16px',
                    right: '16px',
                    backgroundColor: 'white',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    padding: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    transform: 'translateY(-100%)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '6px',
                      fontWeight: 500,
                    }}
                  >
                    {t('anki.quickActions')}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '4px',
                    }}
                  >
                    {quickActions.map(action => (
                      <div key={action.key} style={{ position: 'relative' }}>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleQuickAction(action);
                          }}
                          className="quick-action-button"
                          data-translate={action.key === 'translate' ? 'true' : undefined}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            background: 'white',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          <span>{action.icon}</span>
                          <span>{action.label}</span>
                          {action.hasSubmenu && <span style={{ marginLeft: '2px' }}>▼</span>}
                        </button>

                        {action.key === 'translate' && showTranslateSelect && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: '0',
                              right: '0',
                              marginTop: '4px',
                              zIndex: 1002,
                              minWidth: '120px',
                            }}
                          >
                            <div
                              style={{
                                backgroundColor: 'white',
                                border: '1px solid #d9d9d9',
                                borderRadius: '6px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                padding: '4px 0',
                                maxHeight: '120px',
                                overflowY: 'auto',
                              }}
                            >
                              {translationLanguages.map(language => (
                                <div
                                  key={language.key}
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleTranslateAction(language);
                                  }}
                                  className="translate-option"
                                  style={{
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s',
                                  }}
                                >
                                  {language.label}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0',
                  border: '1px solid #f0f0f0',
                }}
              >
                <Input.TextArea
                  placeholder={t('anki.askAiPlaceholder')}
                  style={{
                    fontSize: '12px',
                  }}
                  value={aiChatPrompt}
                  onChange={handleInputChange}
                  ref={aiChatInputRef}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  onPressEnter={async e => {
                    if (e.shiftKey) {
                      return;
                    }

                    e.preventDefault();

                    if (chatMessages.length > 0 && chatMessages[chatMessages.length - 1].pending) {
                      await interruptTextStream();
                      setTimeout(() => {
                        sendAiChatMessage(aiChatPrompt);
                        setAiChatPrompt('');
                      }, 500);
                      return;
                    }

                    if (aiChatPrompt.trim()) {
                      sendAiChatMessage(aiChatPrompt);
                      setAiChatPrompt('');
                    }
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    borderLeft: '1px solid #f0f0f0',
                    paddingLeft: '8px',
                    gap: '4px',
                  }}
                >
                  <Tooltip title={t('anki.contextTooltip')}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: '#666',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      <InfoCircleOutlined style={{ fontSize: '12px' }} />
                    </span>
                  </Tooltip>
                  <Select
                    bordered={false}
                    value={chatContext}
                    size="small"
                    dropdownMatchSelectWidth={false}
                    style={{ minWidth: '80px' }}
                    onChange={value => {
                      try {
                        setChatContext(value);
                      } catch (err) {
                        console.error('Context selection error:', err);
                      }
                    }}
                    options={[
                      {
                        value: 'Deck',
                        label: t('anki.contextDeck'),
                        title: t('anki.contextDeckTooltip'),
                      },
                      {
                        value: 'Card',
                        label: t('anki.contextCard'),
                        title: t('anki.contextCardTooltip'),
                      },
                      {
                        value: 'None',
                        label: t('anki.contextNone'),
                        title: t('anki.contextNoneTooltip'),
                      },
                    ]}
                  />
                </div>
                {hasPendingMessage && !sendDisabled ? (
                  <Tooltip
                    title={
                      aiChatPrompt.trim()
                        ? t('anki.interruptAndSend', '打断并发送新消息')
                        : t('anki.interruptStream', '打断输出')
                    }
                  >
                    {aiChatPrompt.trim() ? (
                      <RedoOutlined
                        style={{
                          padding: '0px 12px 0px 2px',
                          color: '#ff4d4f',
                        }}
                        onClick={async () => {
                          // 有内容：先打断，再发送新消息
                          await interruptTextStream();
                          setTimeout(() => {
                            sendAiChatMessage(aiChatPrompt);
                            setAiChatPrompt('');
                          }, 500); // 等待500ms确保打断完成
                        }}
                      />
                    ) : (
                      <PauseOutlined
                        style={{
                          padding: '0px 12px 0px 2px',
                          color: '#ff4d4f',
                        }}
                        onClick={() => {
                          // 无内容：直接打断
                          interruptTextStream();
                        }}
                      />
                    )}
                  </Tooltip>
                ) : (
                  <Tooltip title={t('anki.sendMessage', '发送消息')}>
                    <SendOutlined
                      style={{
                        padding: '0px 12px 0px 2px',
                        color: '#666',
                      }}
                      onClick={() => {
                        if (sendDisabled) {
                          return;
                        }
                        if (aiChatPrompt.trim()) {
                          sendAiChatMessage(aiChatPrompt);
                          setAiChatPrompt('');
                        }
                      }}
                    />
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
);

AIChatSidebar.displayName = 'AIChatSidebar';

export default AIChatSidebar;
