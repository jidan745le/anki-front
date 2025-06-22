import {
  CloseOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { Button, Input, message, Select, Spin, Tooltip } from 'antd';
import { EventSource } from 'extended-eventsource';
import { debounce } from 'lodash';
import { marked } from 'marked';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../common/hooks/useI18n';
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
  console.log(params, 'params');

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

  const sendAiChatMessage = async (msg, contextMode, useStreaming = useStreamingApi) => {
    // Close any existing EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const pendingMessages = [...chatMessages, { role: 'user', content: msg }];
    setChatMessages([...pendingMessages, { role: 'assistant', pending: true, content: '' }]);

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

        // Step 2: Set up SSE connection
        const token = localStorage.getItem('token');
        const eventSource = new EventSource(
          `${process.env.API_BASE_URL}/aichat/stream/${sessionId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
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

            // Scroll to bottom as content is streamed
            if (aiChatMessagesRef.current) {
              aiChatMessagesRef.current.scrollTo({
                top: aiChatMessagesRef.current.scrollHeight,
                behavior: 'smooth',
              });
            }
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
      getNextCard(deckId, false);
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

  const getNextCard = (deckId, isInit = false) => {
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
              setAllCards(data.data?.allCards);
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
  const getCardByUuid = (cardUuid, flip = true, isInit = false) => {
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

          // 如果返回了统计信息和所有卡片数据，也更新它们
          if (data.data.stats) {
            setDeckStats(data.data.stats);
          }
          if (data.data.allCards) {
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
  const handleCardClick = (cardUuid, cardData) => {
    console.log('点击卡片:', cardUuid, cardData);

    // 如果点击的是当前卡片，不需要重新加载
    if (cardUuid === card?.['uuid']) {
      console.log(t('anki.switchingToCurrentCard'));
      return;
    }

    // 通过UUID获取卡片详情
    getCardByUuid(cardUuid, true, false); // true 表示翻转，false 表示不是初始化
  };

  const getChatMessageAndShowSidebar = chunkId => {
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
        if (aiChatMessagesRef.current) {
          aiChatMessagesRef.current.scrollTo({
            top: aiChatMessagesRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
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
                    onClick={() => {
                      setPopoverVisible(false);
                      handleCardClick(popoverCard.uuid, popoverCard);
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
      getCardByUuid(uuid, true, false); // true 表示翻转，false 表示不是初始化
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
                onRefreshCard={cardUuid => {
                  getCardByUuid(cardUuid, false, false); // false, false 表示不翻转且不是初始化
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
                </div>
                <div>
                  {/* <Button type="link" onClick={() => getAIChat(cardIdRef.current)}>
                    View history
                  </Button> */}
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
      </div>
    </Spin>
  );
}

export default Anki;
