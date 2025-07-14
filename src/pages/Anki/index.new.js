// Anki学习页面
// 2024-12-19: 适配新的后端getNextCard接口，现在返回visibleCards和pagination字段
// 后端已经计算好可见卡片范围，前端不再重复计算
//带语音功能，使用MediaSource + Web Audio混合架构
import {
  CloseOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  SendOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { Button, Input, message, Modal, Select, Spin, Tooltip } from 'antd';
import { EventSource } from 'extended-eventsource';
import { debounce } from 'lodash';
import { marked } from 'marked';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../common/hooks/useI18n';
import useSocket from '../../common/hooks/useSocket';
import apiClient from '../../common/http/apiClient';
import { generateSimplifiedPromptDisplay } from '../../common/util/ai-util';
import AnkiBar from '../../component/AnkiBar';
import AnkiCard, { processBookIndex } from '../../component/AnkiCard';
import BookTocTree from '../../component/BookTocTree';
import './style.less';

function Anki() {
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const [card, setCard] = useState({});
  const [allCards, setAllCards] = useState([]);
  const [visibleCards, setVisibleCards] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deckStats, setDeckStats] = useState({});
  const [config, setConfig] = useState({});
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const cardIdRef = useRef(null);
  const [aiChatPrompt, setAiChatPrompt] = useState('');
  const [chatContext, setChatContext] = useState('Card');
  const aiChatMessagesRef = useRef(null);
  const aiChatInputRef = useRef(null);
  const [chunkId, setChunkId] = useState(null);
  const processingChunkIdRef = useRef(null);
  const [visualizerVisible, setVisualizerVisible] = useState(false);
  const eventSourceRef = useRef(null);
  const pendingEventSourcesRef = useRef(new Map());
  const [useStreamingApi, setUseStreamingApi] = useState(true);
  const [chatStatus, setChatStatus] = useState([]);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const editorRef = useRef(null);
  const [popoverVisible, setPopoverVisible] = useState(false);
  const [popoverCard, setPopoverCard] = useState(null);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [tocDrawerVisible, setTocDrawerVisible] = useState(false);
  const [tocStructure, setTocStructure] = useState([]);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [showTranslateSelect, setShowTranslateSelect] = useState(false);

  // 语音相关状态
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [characterSelectVisible, setCharacterSelectVisible] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('idle'); // idle, connecting, connected, playing, error
  const [currentEmotion, setCurrentEmotion] = useState('😊');
  const [emotionText, setEmotionText] = useState('待机中');
  const [voiceSessionId, setVoiceSessionId] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [voiceSynthesisCompleted, setVoiceSynthesisCompleted] = useState(false); // 语音合成是否完成

  // 音频播放相关 - 使用MediaSource + Web Audio混合架构
  // 🎵 MediaSource Extensions: 处理流式MP3音频播放
  // 🔊 Web Audio API: 提供音频分析、音量控制、静silence检测
  const audioSystemRef = useRef({
    element: null, // HTML Audio元素（MediaSource播放）
    context: null, // Web Audio上下文
    source: null, // 音频源节点
    analyser: null, // 分析器节点
    gainNode: null, // 音量控制节点
    mediaSource: null, // MediaSource对象
    sourceBuffer: null, // SourceBuffer对象
  });
  const audioBufferQueue = useRef([]);
  const isPlayingRef = useRef(false);
  const receivedBytesCount = useRef(0);

  // 使用useSocket hook
  const { socket, isConnected, on, emit, getSocketId } = useSocket();

  // 角色定义
  const characters = [
    {
      id: 'chihana',
      name: '千花',
      avatar: '🌸',
      description: '温柔体贴的学习伙伴',
      color: '#FFB6C1',
      personality: '温柔、耐心、善解人意',
    },
    {
      id: 'yuki',
      name: '雪音',
      avatar: '❄️',
      description: '冷静理智的知识导师',
      color: '#87CEEB',
      personality: '冷静、理智、博学',
    },
    {
      id: 'sakura',
      name: '樱花',
      avatar: '🌺',
      description: '活泼开朗的学习助手',
      color: '#FFB7DD',
      personality: '活泼、开朗、充满活力',
    },
  ];

  // Use i18n translations instead of hardcoded values

  // Translation language options
  const translationLanguages = [
    { key: 'chinese', label: t('anki.translateToChinese'), code: 'Chinese' },
    { key: 'english', label: t('anki.translateToEnglish'), code: 'English' },
    { key: 'japanese', label: t('anki.translateToJapanese'), code: 'Japanese' },
    { key: 'korean', label: t('anki.translateToKorean'), code: 'Korean' },
    { key: 'french', label: t('anki.translateToFrench'), code: 'French' },
    { key: 'german', label: t('anki.translateToGerman'), code: 'German' },
    { key: 'spanish', label: t('anki.translateToSpanish'), code: 'Spanish' },
  ];

  const updateCardRef = useRef(
    debounce((value, cardUuid) => {
      console.log({ id: cardUuid, back: value });
      apiClient
        .post(`/anki/updateCard`, { id: cardUuid, custom_back: value })
        .then(res => {
          // 处理响应
        })
        .catch(err => {
          console.log(err);
        });
    }, 800) // 800ms 防抖延迟
  );

  useEffect(() => {
    return () => {
      // 组件卸载时取消待处理的防抖调用
      updateCardRef.current.cancel();
    };
  }, []);

  const updateCard = value => {
    updateCardRef.current(value, card['uuid']);
  };

  useEffect(() => {
    const cardUuid = searchParams.get('uuid');
    if (cardUuid) {
      // 如果 URL 中有 uuid 参数，则获取指定的卡片
      console.log('初始化时获取指定卡片:', cardUuid);
      getCardByUuid(cardUuid, false, true); // false 表示不翻转卡片
    } else {
      // 如果没有 uuid 参数，则获取下一张卡片
      getNextCard(params.deckId, true);
    }
  }, [params.deckId, searchParams]);

  useEffect(() => {
    // if (aiChatVisible) {
    //   getAIChat(chatIdRef.current);
    // }
  }, [aiChatVisible]);

  // Cleanup EventSource when component unmounts
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      // Cleanup all pending EventSource connections
      pendingEventSourcesRef.current.forEach((eventSource, sessionId) => {
        eventSource.close();
      });
      pendingEventSourcesRef.current.clear();
    };
  }, []);

  // 初始化语音相关功能
  useEffect(() => {
    // 初始化音频上下文
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

    // 组件卸载时清理资源
    return () => {
      // 处理音频清理（同步执行，不等待）
      handleAudioCleanupOnNavigation().catch(error => {
        console.error('组件卸载时音频清理失败:', error);
      });

      if (audioSystemRef.current.context) {
        audioSystemRef.current.context.close();
      }
      cleanupAudioResources();
    };
  }, []);

  /**
   * 统一的音频清理函数 - 根据音频状态进行相应处理
   *
   * 使用场景：
   * 1. 组件卸载时
   * 2. 切换到下一个卡片时
   * 3. 通过UUID切换卡片时
   *
   * 处理逻辑：
   * - 如果语音合成未完成（推流状态）：发送打断指令并中断音频播放
   * - 如果语音合成已完成但音频仍在播放：直接清除音频资源
   */
  const handleAudioCleanupOnNavigation = async () => {
    if (!voiceEnabled || !audioPlaying) {
      return;
    }

    console.log('导航时处理音频清理，当前状态:', {
      audioPlaying,
      voiceSynthesisCompleted,
      voiceSessionId,
    });

    if (!voiceSynthesisCompleted) {
      // 推流未完成，执行打断操作
      console.log('语音合成未完成，发送打断指令');
      if (voiceSessionId) {
        try {
          await apiClient.post(`/aichat/interrupt/${voiceSessionId}`);
          console.log('已发送打断指令');
        } catch (error) {
          console.error('发送打断指令失败:', error);
        }
      }
      // 打断音频播放
      interruptAudioPlayback();
      setVoiceSynthesisCompleted(false);
    } else {
      // 推流完成但音频活跃，直接清除
      console.log('语音合成已完成但音频活跃，直接清除音频资源');
      cleanupAudioResources();
      setAudioPlaying(false);
      isPlayingRef.current = false;
    }
  };

  // 使用useSocket集成语音功能
  useEffect(() => {
    if (!voiceEnabled || !selectedCharacter || !socket || !isConnected) {
      return;
    }

    console.log('集成语音功能到现有Socket连接');

    // 监听语音相关事件
    const cleanupFunctions = [
      on('auth_success', data => {
        console.log('收到auth_success事件:', data);
        setVoiceConnected(true);
        setVoiceStatus('connected');
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

    // 如果已经连接，直接设置状态
    if (isConnected) {
      setVoiceConnected(true);
      setVoiceStatus('connected');
    }

    // 返回清理函数
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup && cleanup());
    };
  }, [voiceEnabled, selectedCharacter, socket, isConnected, on]);

  const getAIChat = (chatId, chunkId) => {
    setAiChatLoading(true);
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
            .map(item => ({ role: item.role, content: item.content, sessionId: item.sessionId }))
            .reverse()
        );
        setAiChatLoading(false);

        // console.log(res)
      })
      .catch(err => {
        setAiChatLoading(false);

        console.error('Error loading AI chat:', err);
      });
  };

  useEffect(() => {
    if (chatStatus.length > 0) {
      const pendingMessages = chatStatus.filter(
        item => !!item.sessionId && item.role === 'assistant'
      );

      // Process each pending message with sessionId
      pendingMessages.forEach((pendingMessage, index) => {
        const sessionId = pendingMessage.sessionId;

        // Skip if we're already processing this session
        if (pendingEventSourcesRef.current.has(sessionId)) {
          return;
        }

        // Create EventSource for this session's status
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

        // Store the EventSource reference
        pendingEventSourcesRef.current.set(sessionId, statusEventSource);

        let accumulatedContent = '';

        statusEventSource.onmessage = event => {
          const eventData = event.data;
          const jsonData = JSON.parse(eventData);
          if (jsonData.event === 'existing_content') {
            // Handle existing content
            accumulatedContent = jsonData.data;

            updateMessageContent(sessionId, accumulatedContent, true);
          } else if (jsonData.event === 'message') {
            // Handle new streaming content
            accumulatedContent += jsonData.data;
            updateMessageContent(sessionId, accumulatedContent, true);

            // Scroll to bottom as content is streamed
            // if (aiChatMessagesRef.current) {
            //   aiChatMessagesRef.current.scrollTo({
            //     top: aiChatMessagesRef.current.scrollHeight,
            //     behavior: 'smooth',
            //   });
            // }
          }
        };

        statusEventSource.addEventListener('complete', event => {
          try {
            const completeData = JSON.parse(event.data);

            // Update message with complete content and remove pending state
            updateMessageContent(sessionId, completeData.content, false);

            // Close and cleanup this EventSource
            statusEventSource.close();
            pendingEventSourcesRef.current.delete(sessionId);
          } catch (error) {
            console.error('Error handling complete event for session:', sessionId, error);
          }
        });

        statusEventSource.onerror = error => {
          console.error('EventSource error for session:', sessionId, error);

          // Update the message to show error and remove pending state
          updateMessageContent(
            sessionId,
            accumulatedContent || 'Error: Failed to receive response',
            false,
            true
          );

          // Close and cleanup this EventSource
          statusEventSource.close();
          pendingEventSourcesRef.current.delete(sessionId);
        };
      });
    }
  }, [chatStatus]);

  // Helper function to update message content by sessionId
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

  // 处理音频数据 - 使用MediaSource流式播放
  const handleAudioData = async audioData => {
    try {
      console.log('🎵 收到音频数据:', audioData, '类型:', typeof audioData);

      if (audioData instanceof ArrayBuffer) {
        // 将 Blob 转换为 ArrayBuffer 用于 MediaSource
        // const arrayBuffer = await audioData.arrayBuffer();
        receivedBytesCount.current += audioData.byteLength;

        // 添加到缓冲队列
        audioBufferQueue.current.push(new Uint8Array(audioData));
        console.log(
          '🎵 接收到音频数据:',
          audioData.byteLength,
          '字节，缓冲区大小:',
          audioBufferQueue.current.length,
          '总接收字节数:',
          receivedBytesCount.current
        );

        // 开始播放（如果还没开始）
        if (!isPlayingRef.current && audioBufferQueue.current.length > 0) {
          console.log('🎵 首次音频数据，开始播放...');
          startAudioPlayback();
        } else if (
          isPlayingRef.current &&
          audioSystemRef.current.sourceBuffer &&
          !audioSystemRef.current.sourceBuffer.updating
        ) {
          // 如果正在播放，立即添加新数据
          console.log('🎵 音频播放中，添加新数据...');
          flushAudioBuffer();
        } else {
          console.log('🎵 音频数据已缓存，等待播放系统准备...');
        }
      } else {
        console.warn('🎵 接收到非Blob格式的音频数据:', typeof audioData, audioData);
      }
    } catch (error) {
      console.error('🎵 处理音频数据时出错:', error);
    }
  };

  // 开始音频播放 - 使用MediaSource
  const startAudioPlayback = async () => {
    if (isPlayingRef.current) return;

    try {
      isPlayingRef.current = true;
      setAudioPlaying(true);
      setVoiceSynthesisCompleted(false); // 重置语音合成状态
      console.log('开始音频播放');

      // 激活音频上下文（需要用户交互）
      await ensureAudioContextActivated();

      // 初始化音频系统
      await initAudioSystem();

      // 使用MediaSource Extensions进行流式播放
      if ('MediaSource' in window && MediaSource.isTypeSupported('audio/mpeg')) {
        await startMediaSourcePlayback();
      } else {
        console.warn('MediaSource不支持，降级到基础播放');
        // 可以在这里添加降级逻辑
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

  // 清空音频缓冲区到MediaSource
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

      // 添加数据后尝试播放
    } catch (error) {
      console.error('添加音频数据到缓冲区失败:', error);
    }
  };

  // 初始化音频系统
  const initAudioSystem = async () => {
    try {
      console.log('🎧 初始化音频系统...');

      // 强制清理旧的Web Audio连接
      cleanupAudioResources();

      // 创建新的音频元素
      const audioElement = document.createElement('audio');
      audioElement.preload = 'auto';
      audioElement.controls = false;
      audioElement.style.display = 'none';
      audioElement.crossOrigin = 'anonymous'; // 允许跨域音频处理
      audioElement.volume = 0.8; // 设置默认音量

      // 添加到DOM
      document.body.appendChild(audioElement);
      audioSystemRef.current.element = audioElement;

      // 设置事件监听器
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

      // 设置Web Audio分析链
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

      // 为音频元素创建MediaElementSource
      audioSystemRef.current.source = ctx.createMediaElementSource(audioSystemRef.current.element);

      // 创建音量控制节点
      audioSystemRef.current.gainNode = ctx.createGain();
      audioSystemRef.current.gainNode.gain.value = 0.8; // 默认音量

      // 创建分析器节点
      audioSystemRef.current.analyser = ctx.createAnalyser();
      audioSystemRef.current.analyser.fftSize = 256;
      audioSystemRef.current.analyser.smoothingTimeConstant = 0.8;

      // 连接音频节点链：source -> gain -> analyser -> destination
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
    // 清理旧的MediaSource
    cleanupMediaSource();

    // 创建新的MediaSource
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

      // 释放旧的URL
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

    // 清理资源
    cleanupAudioResources();
  };

  // 清理音频资源
  const cleanupAudioResources = () => {
    try {
      console.log('🧹 开始清理音频系统...');

      // 停止音频播放
      if (audioSystemRef.current.element) {
        audioSystemRef.current.element.pause();
        audioSystemRef.current.element.currentTime = 0;
        audioSystemRef.current.element.onended = null;
        audioSystemRef.current.element.onerror = null;

        // 移除元素
        if (audioSystemRef.current.element.parentNode) {
          audioSystemRef.current.element.parentNode.removeChild(audioSystemRef.current.element);
        }
      }

      // 清理SourceBuffer
      if (audioSystemRef.current.sourceBuffer) {
        audioSystemRef.current.sourceBuffer = null;
      }

      // 清理MediaSource
      cleanupMediaSource();
      audioSystemRef.current.mediaSource = null;

      // 断开并重置Web Audio节点链
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

      // 重置引用
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
      // 注意：不改变 setAudioPlaying(false)，因为音频仍在"播放会话"中，只是暂停了
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

    // 完全停止并清理资源
    stopAudioPlayback();

    // 重置所有状态
    isPlayingRef.current = false;
    setAudioPlaying(false);

    console.log('音频播放已中断');
  };

  // 处理语音消息
  const handleVoiceMessage = message => {
    console.log('收到语音消息:', message);

    switch (message.type) {
      case 'emotion_change':
        updateCharacterEmotion(message?.message?.emotion);
        break;

      case 'voice_task_started':
        setVoiceStatus('playing');
        setEmotionText('开始朗读');
        setVoiceSynthesisCompleted(false); // 重置语音合成状态
        break;

      case 'voice_task_finished':
        setVoiceStatus('connected');
        setEmotionText('朗读完成');
        setVoiceSynthesisCompleted(true); // 标记语音合成完成
        console.log('语音合成完成，现在只能暂停/恢复');
        break;

      case 'voice_task_failed':
        setVoiceStatus('error');
        setEmotionText('朗读失败');
        console.error('语音任务失败:', message?.message?.error);
        break;

      case 'voice_interrupted':
        setVoiceStatus('connected');
        setEmotionText('已中断');
        setVoiceSynthesisCompleted(false); // 重置语音合成状态
        interruptAudioPlayback(); // 使用新的中断函数
        break;

      default:
        console.log('未知语音消息类型:', message.type);
    }
  };

  // 更新角色表情
  const updateCharacterEmotion = emotionDescription => {
    console.log('更新角色表情:', emotionDescription);
    const emotionMap = {
      傲娇: { icon: '😤', text: '傲娇' },
      害羞: { icon: '😳', text: '害羞' },
      生气: { icon: '😠', text: '生气' },
      开心: { icon: '😊', text: '开心' },
      担心: { icon: '😟', text: '担心' },
      惊讶: { icon: '😲', text: '惊讶' },
      冷淡: { icon: '😐', text: '冷淡' },
      得意: { icon: '😏', text: '得意' },
      思考: { icon: '🤔', text: '思考' },
      疑惑: { icon: '🤨', text: '疑惑' },
    };

    // 查找匹配的表情
    let matchedEmotion = null;
    for (const [key, value] of Object.entries(emotionMap)) {
      if (emotionDescription.includes(key)) {
        matchedEmotion = value;
        break;
      }
    }
    console.log('matchedEmotion', matchedEmotion);

    if (matchedEmotion) {
      setCurrentEmotion(matchedEmotion.icon);
      setEmotionText(matchedEmotion.text);
    }
  };

  // 停止音频播放
  const stopAudioPlayback = () => {
    console.log('停止音频播放');

    // 停止MediaSource播放
    if (audioSystemRef.current.element) {
      audioSystemRef.current.element.pause();
      audioSystemRef.current.element.currentTime = 0;
    }

    // 清理资源
    cleanupAudioResources();

    // 重置状态
    isPlayingRef.current = false;
    setAudioPlaying(false);
  };

  // 打开角色选择弹窗
  const handleVoiceButtonClick = () => {
    setCharacterSelectVisible(true);
  };

  // 选择角色并启用语音
  const handleCharacterSelect = async character => {
    setSelectedCharacter(character);
    setVoiceEnabled(true);
    setCharacterSelectVisible(false);
    setVoiceStatus('connecting');
    setCurrentEmotion(character.avatar);
    setEmotionText(`${character.name}已连接`);

    // 激活音频上下文（用户交互）
    await ensureAudioContextActivated();

    console.log('选择角色:', character);
  };

  // 禁用语音
  const handleDisableVoice = () => {
    setVoiceEnabled(false);
    setSelectedCharacter(null);
    setVoiceConnected(false);
    setVoiceStatus('idle');
    setCurrentEmotion('😊');
    setEmotionText('待机中');
    setVoiceSynthesisCompleted(false); // 重置语音合成状态
    interruptAudioPlayback(); // 使用新的中断函数
  };

  // 修改sendAiChatMessage函数以支持语音
  const sendAiChatMessage = async (msg, contextMode, useStreaming = useStreamingApi) => {
    // 如果启用了语音，确保音频上下文被激活
    if (voiceEnabled) {
      await ensureAudioContextActivated();

      // 根据语音合成状态决定处理方式
      if (audioPlaying) {
        if (voiceSynthesisCompleted) {
          // 推流已完成，清理所有音频信息
          console.log('语音合成已完成，清理音频信息开始新对话');
          cleanupAudioResources();
          setAudioPlaying(false);
          isPlayingRef.current = false;
        } else {
          // 推流还没完成，执行打断操作
          console.log('语音合成未完成，执行打断操作');
          if (voiceSessionId) {
            try {
              await apiClient.post(`/aichat/interrupt/${voiceSessionId}`);
              console.log('已发送打断指令');
            } catch (error) {
              console.error('发送打断指令失败:', error);
            }
          }
          interruptAudioPlayback();
        }
      }

      // 重置语音合成状态，准备新对话
      setVoiceSynthesisCompleted(false);
    }

    // Close any existing EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const pendingMessages = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages([...pendingMessages, { role: 'assistant', pending: true, content: '' }]);
    setTimeout(() => {
      if (aiChatMessagesRef.current) {
        aiChatMessagesRef.current.scrollTo({
          top: aiChatMessagesRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    });

    // Determine context content based on context type
    let contextContent = '';
    if (['Deck', 'Card'].includes(contextMode || chatContext) && card) {
      contextContent = `${card['customBack'] || card['back'] || ''}`;
    }

    // Common request parameters
    const requestParams = {
      cardId: cardIdRef.current,
      chatcontext: contextMode || chatContext,
      chattype: 'Generic',
      chunkId,
      question: msg,
      contextContent: contextContent,
      model: 'deepseek-chat',
      // 添加语音相关参数
      character: voiceEnabled && selectedCharacter ? selectedCharacter.id : undefined,
      socketId: voiceEnabled ? getSocketId() : undefined,
    };

    if (useStreaming) {
      // Use new streaming API
      try {
        // Step 1: Initialize chat session
        const initResponse = await apiClient.post('/aichat/initSession', requestParams);

        if (!initResponse.data?.data?.sessionId) {
          throw new Error('Failed to initialize chat session');
        }

        const sessionId = initResponse.data.data.sessionId;
        setVoiceSessionId(sessionId);

        // Step 2: Set up SSE connection
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
            // Update the assistant message with the streamed content
            setChatMessages(prevMessages => {
              const updatedMessages = [...prevMessages];
              const lastMessageIndex = updatedMessages.length - 1;

              // Update the last message (which should be the assistant's)
              if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'assistant') {
                updatedMessages[lastMessageIndex] = {
                  ...updatedMessages[lastMessageIndex],
                  content: streamedContent,
                  pending: true,
                };
              }

              return updatedMessages;
            });
          }
        };

        eventSource.addEventListener('complete', event => {
          try {
            const completeData = JSON.parse(event.data);

            // Update message with complete content and remove pending state
            setChatMessages(prevMessages => {
              const updatedMessages = [...prevMessages];
              const lastMessageIndex = updatedMessages.length - 1;

              if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'assistant') {
                updatedMessages[lastMessageIndex] = {
                  ...updatedMessages[lastMessageIndex],
                  content: completeData.content,
                  pending: false,
                };
              }

              return updatedMessages;
            });

            // Close the event source
            eventSource.close();
            eventSourceRef.current = null;
          } catch (error) {
            console.error('Error handling complete event:', error);
          }
        });

        eventSource.onerror = error => {
          console.error('EventSource error:', error);

          // Update the assistant message to show error
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

          // Close the event source
          eventSource.close();
          eventSourceRef.current = null;
        };
      } catch (error) {
        console.error('Error initiating chat session:', error);
        message.error(error?.response?.data?.message || 'Failed to send message');

        // Update the assistant message to show error
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
    } else {
      // Use original non-streaming implementation
      try {
        const response = await apiClient.post('/aichat/message', requestParams);

        if (response.data.success) {
          const aiData = response.data.data;
          setChatMessages([...pendingMessages, aiData.aiMessage]);
        } else {
          message.error(response.data.message || 'Request failed');

          // Remove the pending message
          setChatMessages(pendingMessages);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        message.error(error.message || 'Failed to send message');

        // Remove the pending message
        setChatMessages(pendingMessages);
      }
    }
  };

  // 处理语音控制按钮点击（打断/暂停/恢复）
  const handleVoiceControlButton = async () => {
    if (!audioPlaying) return;

    if (voiceSynthesisCompleted) {
      // 语音合成已完成，执行暂停/恢复操作
      if (audioSystemRef.current.element && !audioSystemRef.current.element.paused) {
        pauseAudioPlayback();
        setEmotionText('已暂停');
      } else {
        resumeAudioPlayback();
        setEmotionText('继续播放');
      }
    } else {
      // 语音合成未完成，执行打断操作
      if (voiceSessionId) {
        try {
          await apiClient.post(`/aichat/interrupt/${voiceSessionId}`);
          console.log('已发送打断指令');
        } catch (error) {
          console.error('发送打断指令失败:', error);
          message.error('中断语音对话失败');
        }
      }
      interruptAudioPlayback();
      setVoiceStatus('connected');
      setEmotionText('已中断');
      setVoiceSynthesisCompleted(false);
    }
  };

  // 获取语音控制按钮的文本和图标
  const getVoiceControlButtonContent = () => {
    if (!audioPlaying) return null;

    if (voiceSynthesisCompleted) {
      // 语音合成已完成，显示暂停/恢复按钮
      const isPaused = audioSystemRef.current.element && audioSystemRef.current.element.paused;
      return isPaused ? '▶️ 恢复' : '⏸️ 暂停';
    } else {
      // 语音合成未完成，显示打断按钮
      return '🛑 打断';
    }
  };

  // Enable automatic scrolling to bottom when messages change
  // useEffect(() => {
  //   if (aiChatMessagesRef.current) {
  //     aiChatMessagesRef.current.scrollTo({
  //       top: aiChatMessagesRef.current.scrollHeight,
  //       behavior: 'smooth',
  //     });
  //   }
  // }, [chatMessages]);

  const setQualityForThisCardAndGetNext = async (deckId, quality) => {
    try {
      // 处理音频清理
      await handleAudioCleanupOnNavigation();

      // Close any existing EventSource connection when navigating away
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Close all pending EventSource connections
      pendingEventSourcesRef.current.forEach((eventSource, sessionId) => {
        eventSource.close();
      });
      pendingEventSourcesRef.current.clear();

      setAiChatVisible(false);
      setChunkId(undefined);
      setAiChatLoading(false);
      editorRef?.current?.getEditor()?.clearAiLoadingChunk();
      if (quality !== 0) {
        await updateQualityForThisCard(deckId, quality);
      }
      await getNextCard(deckId, false);
      setChatContext('Card');
    } catch (e) {
      console.log(e);
    }
  };

  const updateQualityForThisCard = async (deckId, quality) => {
    setLoading(true);
    return await apiClient
      .post(`/anki/updateCardWithFSRS`, { userCardId: card['uuid'], reviewQuality: quality })
      .then(res => {
        setLoading(false);
        const data = res.data;
        if (data.success) {
          return;
        }
        message.error(data.message);
        console.log(res);
      })
      .catch(err => {
        setLoading(false);
        throw err;
      });
  };

  const getNextCard = async (deckId, isInit = false) => {
    // 处理音频清理
    if (!isInit) {
      await handleAudioCleanupOnNavigation();
    }

    setFlipped(false);
    setLoading(true);

    // 如果不是初始化，清除 URL 中的 uuid 参数
    if (!isInit) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('uuid');
      const newUrl = `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }

    apiClient
      .get(`/anki/getNextCard?deckId=${deckId}&mount=${isInit}`)
      .then(res => {
        setLoading(false);
        const data = res.data;
        if (data.success) {
          if (Object.keys(data.data || {}).length > 0) {
            if (data.data?.card?.uuid) {
              cardIdRef.current = data.data?.card?.uuid;
              setCard(data.data?.card);

              setDeckStats(data.data?.stats);

              // 处理新的响应结构
              if (data.data?.visibleCards) {
                setVisibleCards(data.data.visibleCards);
                setAllCards(data.data.visibleCards); // 为了向后兼容，继续设置allCards
              }

              if (data.data?.pagination) {
                setPagination(data.data.pagination);
              }
            } else {
              if (data.data?.card === null) {
                //deck为空 需要插入新卡
                navigate(`/anki/create/${deckId}`);
                setCard({ front: 'front', back: 'back' });
              } else if (data.data?.card?.message) {
                navigate(`/anki/empty`);
                //deck为{} 代表今天或目前没有卡片了
              }
            }
            return;
          }
          message.error(data.message);
          console.log(res);
        }
      })
      .catch(err => {
        setLoading(false);
        console.log(err);
      });
  };

  // 新增：通过UUID获取特定卡片
  const getCardByUuid = async (cardUuid, flip = true, isInit = false) => {
    // 处理音频清理
    if (!isInit) {
      await handleAudioCleanupOnNavigation();
    }

    setFlipped(false);
    setLoading(true);
    setAiChatVisible(false);
    setAiChatLoading(false);
    editorRef?.current?.getEditor()?.clearAiLoadingChunk();

    // 如果不是初始化，清除 URL 中的 uuid 参数
    if (!isInit) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('uuid');
      const newUrl = `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`;
      window.history.replaceState({}, '', newUrl);
    }

    apiClient
      .get(`/anki/getCard?uuid=${cardUuid}`)
      .then(res => {
        setLoading(false);
        const data = res.data;
        if (data.success && data.data?.card) {
          cardIdRef.current = data.data.card.uuid;
          setCard(data.data.card);

          // 如果返回了统计信息和可见卡片数据，也更新它们
          if (data.data.stats) {
            setDeckStats(data.data.stats);
          }
          if (data.data.visibleCards) {
            setVisibleCards(data.data.visibleCards);
            setAllCards(data.data.visibleCards); // 为了向后兼容，继续设置allCards
          }
          if (data.data.pagination) {
            setPagination(data.data.pagination);
          }
          // 向后兼容：如果还有旧的allCards字段，也处理它
          if (data.data.allCards && !data.data.visibleCards) {
            setAllCards(data.data.allCards);
          }
          if (flip) {
            setFlipped(true);
          }

          console.log('切换到卡片:', data.data.card);
        } else {
          message.error(data.message || t('anki.getCardError'));
        }
      })
      .catch(err => {
        setLoading(false);
        console.error(t('anki.getCardError'), err);
        message.error(t('anki.getCardError'));
      });
  };

  // 新增：处理卡片点击事件
  const handleCardClick = async (cardUuid, cardData) => {
    console.log('点击卡片:', cardUuid, cardData);

    // 如果点击的是当前卡片，不需要重新加载
    if (cardUuid === card?.['uuid']) {
      console.log(t('anki.switchingToCurrentCard'));
      return;
    }

    // 通过UUID获取卡片详情
    await getCardByUuid(cardUuid, true, false); // true 表示翻转，false 表示不是初始化
  };

  const getChatMessageAndShowSidebar = chunkId => {
    console.log(chunkId, 'chunkId111');
    // 优化：避免重复处理相同的chunkId
    if (processingChunkIdRef.current === chunkId) {
      console.log('Already processing the same chunkId, skipping getChatMessageAndShowSidebar...');
      return;
    }

    processingChunkIdRef.current = chunkId;

    if (!aiChatVisible) {
      setAiChatVisible(true);
    }
    // Close any existing stream when changing chat context
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Close all pending EventSource connections
    pendingEventSourcesRef.current.forEach((eventSource, sessionId) => {
      eventSource.close();
    });
    pendingEventSourcesRef.current.clear();

    setChunkId(chunkId);
    getAIChat(cardIdRef.current, chunkId);
  };

  const onInitChunkChatSession = async (promptConfig, sessionId) => {
    const pendingMessages = [
      { role: 'user', content: generateSimplifiedPromptDisplay(promptConfig) },
    ];
    if (!aiChatVisible) {
      setAiChatVisible(true);
    }
    setChunkId(promptConfig.chunkId);
    processingChunkIdRef.current = promptConfig.chunkId;

    // Close any existing stream when changing chat context
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Close all pending EventSource connections
    pendingEventSourcesRef.current.forEach((eventSource, sessionId) => {
      eventSource.close();
    });
    pendingEventSourcesRef.current.clear();

    setChatMessages([...pendingMessages, { role: 'assistant', pending: true, content: '' }]);

    const token = localStorage.getItem('token');
    const eventSource = new EventSource(`${process.env.API_BASE_URL}/aichat/stream/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-User-Id': localStorage.getItem('userId'),
      },
    });
    eventSourceRef.current = eventSource;

    let streamedContent = '';
    eventSource.onmessage = event => {
      const eventData = event.data;
      const jsonData = JSON.parse(eventData);
      if (jsonData.event === 'message') {
        streamedContent += jsonData.data;
        // Update the assistant message with the streamed content
        // console.log(streamedContent, 'streamedContent');
        setChatMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const lastMessageIndex = updatedMessages.length - 1;

          // Update the last message (which should be the assistant's)
          if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'assistant') {
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              content: streamedContent,
              pending: true,
            };
          }

          return updatedMessages;
        });

        // Scroll to bottom as content is streamed
        // if (aiChatMessagesRef.current) {
        //   aiChatMessagesRef.current.scrollTo({
        //     top: aiChatMessagesRef.current.scrollHeight,
        //     behavior: 'smooth',
        //   });
        // }
      }
    };

    eventSource.addEventListener('complete', event => {
      try {
        const completeData = JSON.parse(event.data);

        // Update message with complete content and remove pending state
        setChatMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const lastMessageIndex = updatedMessages.length - 1;

          if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'assistant') {
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              content: completeData.content,
              pending: false,
            };
          }

          return updatedMessages;
        });

        // Close the event source
        eventSource.close();
        eventSourceRef.current = null;
      } catch (error) {
        console.error('Error handling complete event:', error);
      }
    });

    eventSource.onerror = error => {
      console.error('EventSource error:', error);

      // Update the assistant message to show error
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

      // Close the event source
      eventSource.close();
      eventSourceRef.current = null;
    };
  };

  // 将 Markdown 转换为安全的 HTML
  const getHtmlContent = useCallback(markdownContent => {
    const rawHtml = marked(markdownContent);
    return rawHtml;
  }, []);

  // 处理引用格式并转换为可点击链接
  const processCardReferences = useCallback(content => {
    if (!content) return content;

    // 处理引用格式：支持简单和复杂格式
    // 简单格式：[引用：卡片名称 (ID: 卡片UUID)]
    // 复杂格式：[引用：CHAPTER:xxx|PROGRESS:xxx|LEVEL:xxx (ID: UUID)]
    const referenceRegex = /\[引用：([^[\]]*?)\s*\(ID:\s*([a-f0-9-]{36}|[a-f0-9-]{8,})\)\]/g;

    let processedContent = content.replace(referenceRegex, (match, cardName, cardId) => {
      const trimmedCardName = cardName.trim();
      const trimmedCardId = cardId.trim();

      // 验证cardId格式（UUID或类似格式）
      if (!/^[a-f0-9-]{8,}$/i.test(trimmedCardId)) {
        return match; // 如果不是有效的ID格式，返回原文
      }

      // 创建可点击的链接，使用data属性存储卡片ID
      return `<a href="#" class="card-reference-link" data-card-id="${trimmedCardId}" style="color: #1890ff; text-decoration: none; font-weight: 500; cursor: pointer; border-bottom: 1px dashed #1890ff;">[引用：${trimmedCardName}]</a>`;
    });

    // 更精确的底部引用列表格式：只在"引用卡片："或"**引用卡片：**"后面的列表项中匹配
    // 匹配模式：在"引用卡片"标题后的列表项中查找 "- 卡片名 (ID: uuid)"
    const referenceListRegex = /(\*\*引用卡片：?\*\*|引用卡片：?)([\s\S]*?)(?=\n\n|\n\*\*|$)/g;

    processedContent = processedContent.replace(referenceListRegex, (match, title, listContent) => {
      // 在引用列表内容中处理每个列表项
      const processedListContent = listContent.replace(
        /^(\s*[-*]\s*)([^(\n]+?)\s*\(ID:\s*([a-f0-9-]{8,})\)\s*$/gm,
        (itemMatch, listPrefix, cardName, cardId) => {
          const trimmedCardName = cardName.trim();
          const trimmedCardId = cardId.trim();

          // 验证cardId格式
          if (!/^[a-f0-9-]{8,}$/i.test(trimmedCardId)) {
            return itemMatch; // 如果不是有效的ID格式，返回原文
          }

          // 创建可点击的链接用于列表项
          return `${listPrefix}<a href="#" class="card-reference-link" data-card-id="${trimmedCardId}" style="color: #1890ff; text-decoration: none; font-weight: 500; cursor: pointer;">${trimmedCardName}</a>`;
        }
      );

      return title + processedListContent;
    });

    return processedContent;
  }, []);

  // 处理引用链接点击事件
  const handleReferenceClick = useCallback(
    e => {
      e.preventDefault();
      if (e.target.classList.contains('card-reference-link')) {
        const cardId = e.target.getAttribute('data-card-id');
        if (cardId) {
          // 获取点击位置，防止向下溢出屏幕
          const rect = e.target.getBoundingClientRect();
          const popoverHeight = 300; // 预估popover高度
          const screenHeight = window.innerHeight;
          const topPosition =
            rect.top + popoverHeight > screenHeight
              ? Math.max(10, rect.top - popoverHeight) // 如果会溢出，则显示在上方
              : rect.top;

          setPopoverPosition({ x: rect.left - 120, y: topPosition }); // 往左偏移50px

          // 显示加载状态的 popover
          setPopoverCard({ loading: true });
          setPopoverVisible(true);

          // 直接通过 API 查询完整的卡片数据
          console.log('通过 API 查询卡片:', cardId);
          apiClient
            .get(`/anki/getCard?uuid=${cardId}`)
            .then(res => {
              const data = res.data;
              if (data.success && data.data?.card) {
                setPopoverCard(data.data.card);
                console.log('获取到卡片数据:', data.data.card);
              } else {
                setPopoverVisible(false);
                message.warning(t('anki.cardNotFound'));
                console.error('API 返回错误:', data.message);
              }
            })
            .catch(err => {
              setPopoverVisible(false);
              console.error(t('anki.getCardFailed'), err);
              message.error(t('anki.getCardFailed'));
            });
        }
      }
    },
    [t]
  );

  // 修改内容渲染部分
  const renderContent = content => {
    if (!content) return null;

    // 先处理引用格式
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

        {/* 引用卡片 Popover */}
        {popoverVisible && popoverCard && (
          <div
            className="reference-card-popover"
            style={{
              position: 'fixed',
              left: Math.max(10, popoverPosition.x - 400), // 确保不超出左边界，卡片宽度约380px
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
                    onClick={async () => {
                      setPopoverVisible(false);
                      await handleCardClick(popoverCard.uuid, popoverCard);
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

  const isNew = card['state'] === 0;

  // 点击页面其他地方关闭 Popover
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

  // 切换书本目录
  const handleGenerateIndex = async () => {
    try {
      // 如果目录已经可见，则关闭它
      if (tocDrawerVisible) {
        setTocDrawerVisible(false);
        return;
      }

      // 如果目录不可见，则生成并显示目录
      const response = await apiClient.get(`/anki/user-cards/front-and-uuid/${params.deckId}`);
      console.log('Book index data:', response.data);

      if (response.data && response.data.data) {
        // 处理索引数据
        const processedTocStructure = processBookIndex(response.data.data);
        console.log('Processed TOC structure:', processedTocStructure);

        // 设置目录结构数据并显示侧边栏
        setTocStructure(processedTocStructure);
        setTocDrawerVisible(true);

        // message.success(t('anki.indexGenerated'));
      } else {
        message.warning(t('anki.toc.noData'));
      }
    } catch (error) {
      console.error('Failed to generate index:', error);
      message.error(error?.response?.data?.message || t('anki.indexGenerateFailed'));
    }
  };

  // 处理目录中卡片的选择
  const handleTocCardSelect = async (uuid, nodeData) => {
    try {
      console.log('目录中选择的卡片:', uuid, nodeData);

      // 调用后端API获取指定卡片
      await getCardByUuid(uuid, true, false); // true 表示翻转，false 表示不是初始化
    } catch (error) {
      console.error('跳转到卡片失败:', error);
      message.error(t('anki.getCardError'));
    }
  };

  console.log(card, 'card');

  // Quick actions for AI chat
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

  const handleQuickAction = action => {
    // Handle translate action with inline select
    if (action.key === 'translate' && action.hasSubmenu) {
      // Toggle the translate select
      setShowTranslateSelect(!showTranslateSelect);
      return;
    }

    const prompt = action.prompt;

    // Set context mode based on action reference
    let contextMode = 'Card'; // default
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

    console.log('contextMode', chatContext);
    // Set the context mode

    // Hide quick actions immediately

    // Send the message directly

    if (chatMessages.length > 0 && chatMessages[chatMessages.length - 1].pending) {
      message.warning(t('anki.pleaseWait'));
      return;
    }

    if (prompt.trim()) {
      sendAiChatMessage(prompt, contextMode);
    }

    // Clear the input and blur to avoid refocusing issues
    setAiChatPrompt('');
    if (aiChatInputRef.current) {
      aiChatInputRef.current.blur();
    }
  };

  const handleTranslateAction = language => {
    const prompt = `Please translate this card content to ${language.code}`;

    // Set context mode to Card for translation
    setChatContext('Card');

    // Hide quick actions and select
    setQuickActionsVisible(false);
    setShowTranslateSelect(false);

    if (chatMessages.length > 0 && chatMessages[chatMessages.length - 1].pending) {
      message.warning(t('anki.pleaseWait'));
      return;
    }

    // Send the message directly
    if (prompt.trim()) {
      sendAiChatMessage(prompt, 'Card');
    }

    // Clear the input and blur to avoid refocusing issues
    setAiChatPrompt('');
    if (aiChatInputRef.current) {
      aiChatInputRef.current.blur();
    }
  };

  const handleInputFocus = () => {
    // Only show quick actions if textarea is empty
    if (!aiChatPrompt.trim()) {
      setQuickActionsVisible(true);
    }
  };

  const handleInputBlur = e => {
    // Always hide quick actions on blur
    setTimeout(() => {
      // Check if the related target is within the quick actions container
      if (!e.relatedTarget || !e.relatedTarget.closest('.quick-actions-container')) {
        setQuickActionsVisible(false);
        setShowTranslateSelect(false);
      }
    }, 150);
  };

  // Handle clicks outside to close translate select
  React.useEffect(() => {
    const handleClickOutside = event => {
      if (showTranslateSelect) {
        const quickActionsContainer = document.querySelector('.quick-actions-container');
        const clickedInsideQuickActions = event.target.closest('.quick-actions-container');

        if (!clickedInsideQuickActions) {
          // Click outside quick actions panel - close both translate select and quick actions
          setShowTranslateSelect(false);
          setQuickActionsVisible(false);
        } else {
          // Click inside quick actions panel but outside translate select - only close translate select
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
      // Use timeout to ensure this runs after the current click event
      setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showTranslateSelect]);

  React.useEffect(() => {
    if (aiChatVisible && !aiChatLoading) {
      setTimeout(() => {
        if (aiChatMessagesRef.current) {
          aiChatMessagesRef.current.scrollTo({
            top: aiChatMessagesRef.current.scrollHeight,
          });
        }
      }, 100);
    }
  }, [aiChatVisible, aiChatLoading]);

  // Hide quick actions when user starts typing
  const handleInputChange = e => {
    const value = e.target.value;
    setAiChatPrompt(value);

    // Hide quick actions if there's content, show if empty and focused
    if (value.trim()) {
      setQuickActionsVisible(false);
      setShowTranslateSelect(false);
    } else if (document.activeElement === aiChatInputRef.current?.resizableTextArea?.textArea) {
      setQuickActionsVisible(true);
      setShowTranslateSelect(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: '0px' }}>
        <AnkiBar
          autoMarkTitleEnabled={config['autoMarkTitle']}
          onToggleAutoMarkTitle={() =>
            setConfig({ ...config, autoMarkTitle: !config['autoMarkTitle'] })
          }
          visualizerVisible={visualizerVisible}
          onToggleVisualizer={() => setVisualizerVisible(!visualizerVisible)}
          aiChatEnabled={!!cardIdRef.current}
          aiChatVisible={aiChatVisible}
          deckId={params.deckId}
          onGenerateIndex={handleGenerateIndex}
          tocVisible={tocDrawerVisible}
          onToggleAIChat={() => {
            setChunkId(undefined);
            processingChunkIdRef.current = null;
            setAiChatVisible(!aiChatVisible);

            // Close any existing stream when toggling chat visibility
            if (eventSourceRef.current) {
              eventSourceRef.current.close();
              eventSourceRef.current = null;
            }

            // Close all pending EventSource connections
            pendingEventSourcesRef.current.forEach((eventSource, sessionId) => {
              eventSource.close();
            });
            pendingEventSourcesRef.current.clear();

            // Clear loading state when closing chat
            if (aiChatVisible) {
              setAiChatLoading(false);
            }

            if (!aiChatVisible && cardIdRef.current) {
              getAIChat(cardIdRef.current);
            }
          }}
          allCards={allCards}
          currentCardId={card?.['uuid']}
          currentCardState={card?.['state']}
          deckStats={deckStats}
          onCardClick={handleCardClick}
          currentCard={card}
          onCardUpdate={updatedCard => {
            // 更新当前卡片状态
            setCard(updatedCard);
            console.log('Card updated with new tags:', updatedCard);
          }}
          pagination={pagination}
          onNotesReady={() => {}} // 添加缺失的prop
        />

        <div
          style={{
            display: 'flex',
            height: 'calc(100vh - 180px)',
          }}
        >
          {tocDrawerVisible && (
            <div
              className="side-toc-container"
              style={{
                width: '10%',
                border: '1px solid #f0f0f0',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                background: '#fff',
              }}
            >
              <div
                className="toc-header"
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
                    style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#2c3e50',
                    }}
                  >
                    {t('anki.toc.title')}
                  </span>
                </div>
                <div>
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => {
                      setTocDrawerVisible(false);
                    }}
                  />
                </div>
              </div>

              <div
                className="toc-container"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  overflow: 'hidden',
                }}
              >
                <BookTocTree
                  tocStructure={tocStructure}
                  onCardSelect={handleTocCardSelect}
                  currentCardUuid={card?.['uuid']}
                />
              </div>
            </div>
          )}

          <div
            style={{
              width:
                tocDrawerVisible && aiChatVisible
                  ? '65%'
                  : tocDrawerVisible
                    ? '90%'
                    : aiChatVisible
                      ? '75%'
                      : '100%',
              transition: 'width 0.3s',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                flex: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <AnkiCard
                ref={editorRef}
                config={config}
                front={card['front']}
                back={card['customBack']}
                frontType={
                  card['frontType'] === 'audio'
                    ? 'audio'
                    : card['front']?.includes('audio/decks')
                      ? 'audio'
                      : card['front']?.startsWith('CHAPTER:')
                        ? 'title'
                        : card['frontType']
                }
                cardUUID={card['uuid']}
                onChange={value => updateCard(value)}
                isNew={isNew}
                flipped={flipped}
                onNext={quality => {
                  setQualityForThisCardAndGetNext(params.deckId, quality);
                }}
                cardState={card['state']}
                onInitChunkChatSession={onInitChunkChatSession}
                onRefreshCard={async cardUuid => {
                  await getCardByUuid(cardUuid, false, false); // false, false 表示不翻转且不是初始化
                }}
                getChatMessageAndShowSidebar={getChatMessageAndShowSidebar}
                showAIChatSidebar={aiChatVisible}
                onFlip={action => setFlipped(action)}
              />
            </div>
          </div>

          {aiChatVisible && (
            <div
              className="side-chat-container"
              style={{
                backgroundColor: 'white',
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
                      <span style={{ fontSize: '16px' }}>{currentEmotion}</span>
                      <span style={{ fontSize: '10px', color: '#666' }}>{emotionText}</span>
                      {/* 音频调试信息 */}
                      <div style={{ fontSize: '8px', color: '#999', marginLeft: '4px' }}>
                        {audioPlaying ? '🔊播放中' : '⏸️待机'}
                        {audioSystemRef.current.context &&
                          ` | ${audioSystemRef.current.context.state}`}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* 语音按钮 */}
                  <Tooltip title={voiceEnabled ? t('anki.disableVoice') : t('anki.enableVoice')}>
                    <Button
                      type="text"
                      size="small"
                      icon={<SoundOutlined />}
                      onClick={voiceEnabled ? handleDisableVoice : handleVoiceButtonClick}
                      style={{
                        color: voiceEnabled ? '#1890ff' : '#666',
                        fontSize: '16px',
                      }}
                    />
                  </Tooltip>

                  {/* 语音控制按钮（打断/暂停/恢复） */}
                  {voiceEnabled && audioPlaying && (
                    <Tooltip
                      title={
                        voiceSynthesisCompleted
                          ? audioSystemRef.current.element && audioSystemRef.current.element.paused
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
                        }}
                      >
                        {getVoiceControlButtonContent()}
                      </Button>
                    </Tooltip>
                  )}
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => {
                      setAiChatVisible(false);
                      setChunkId(undefined);
                      setAiChatLoading(false);
                    }}
                  />
                </div>
              </div>

              <div
                className="ai-chat-container"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  // height: 'calc(100% - 125px)',
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
                      backgroundColor: 'rgba(255, 255, 255, 0.8) ',
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
                            // 为pending状态的AI消息设置最小高度，完成后自适应
                            minHeight:
                              message.pending && message.role !== 'user' ? '480px' : 'auto',
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
                    background: 'white',
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

                            {/* Translation Language Select - directly below translate button */}
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
                      onPressEnter={e => {
                        // Shift + Enter: 换行，不发送消息
                        if (e.shiftKey) {
                          return; // 允许默认的换行行为
                        }

                        // Enter: 发送消息
                        e.preventDefault(); // 阻止默认的换行行为

                        if (
                          chatMessages.length > 0 &&
                          chatMessages[chatMessages.length - 1].pending
                        ) {
                          message.warning(t('anki.pleaseWait'));
                          return;
                        }

                        if (aiChatPrompt.trim()) {
                          // 使用trim()避免发送空白消息
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
                          {/* {t('anki.contextLabel')} */}
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
                    <SendOutlined
                      style={{
                        padding: '0px 12px 0px 2px',
                      }}
                      onClick={() => {
                        if (
                          chatMessages.length > 0 &&
                          chatMessages[chatMessages.length - 1].pending
                        ) {
                          message.warning(t('anki.pleaseWait'));
                          return;
                        }
                        if (aiChatPrompt.trim()) {
                          // 使用trim()避免发送空白消息
                          sendAiChatMessage(aiChatPrompt);
                          setAiChatPrompt('');
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 角色选择弹窗 */}
        <Modal
          title={t('anki.selectCharacter')}
          open={characterSelectVisible}
          onCancel={() => setCharacterSelectVisible(false)}
          footer={null}
          width={600}
        >
          <div style={{ padding: '20px 0' }}>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              {t('anki.selectCharacterDescription')}
            </p>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              {characters.map(character => (
                <div
                  key={character.id}
                  onClick={() => handleCharacterSelect(character)}
                  style={{
                    flex: '1 1 calc(33.333% - 12px)',
                    minWidth: '160px',
                    padding: '20px',
                    border: '2px solid #f0f0f0',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.3s ease',
                    backgroundColor: '#fff',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = character.color;
                    e.currentTarget.style.backgroundColor = character.color + '10';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#f0f0f0';
                    e.currentTarget.style.backgroundColor = '#fff';
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>{character.avatar}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px' }}>
                    {character.name}
                  </div>
                  <div style={{ color: '#666', fontSize: '14px', marginBottom: '8px' }}>
                    {character.description}
                  </div>
                  <div style={{ color: '#999', fontSize: '12px' }}>{character.personality}</div>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      </div>
    </Spin>
  );
}

export default Anki;
