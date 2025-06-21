import { CloseOutlined, LoadingOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Input, message, Select, Spin } from 'antd';
import { EventSource } from 'extended-eventsource';
import { debounce } from 'lodash';
import { marked } from 'marked';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../common/hooks/useI18n';
import apiClient from '../../common/http/apiClient';
import { generateSimplifiedPromptDisplay } from '../../common/util/ai-util';
import AnkiBar from '../../component/AnkiBar';
import AnkiCard from '../../component/AnkiCard';
import './style.less';

function Anki() {
  const { t } = useI18n();
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();
  const [card, setCard] = useState({});
  const [allCards, setAllCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deckStats, setDeckStats] = useState({});
  const params = useParams();
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
  console.log(params, 'params');

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
    getNextCard(params.deckId, true);
  }, []);

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

  const sendAiChatMessage = async (message, useStreaming = useStreamingApi) => {
    // Close any existing EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const pendingMessages = [...chatMessages, { role: 'user', content: message }];
    setChatMessages([...pendingMessages, { role: 'assistant', pending: true, content: '' }]);

    // Determine context content based on context type
    let contextContent = '';
    if (['Deck', 'Card'].includes(chatContext) && card) {
      contextContent = `${card['customBack'] || card['back'] || ''}`;
    }

    // Common request parameters
    const requestParams = {
      cardId: cardIdRef.current,
      chatcontext: chatContext,
      chattype: 'Generic',
      chunkId,
      question: message,
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
        message.error(error.message || 'Failed to send message');

        // Update the assistant message to show error
        setChatMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const lastMessageIndex = updatedMessages.length - 1;

          if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === 'assistant') {
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              content: 'Error: Failed to connect to AI service',
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
      editorRef.current.getEditor().clearAiLoadingChunk();
      await updateQualityForThisCard(deckId, quality);
      getNextCard(deckId);
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
  const getCardByUuid = cardUuid => {
    setFlipped(false);
    setLoading(true);
    setAiChatVisible(false);
    setAiChatLoading(false);
    // editorRef.current.getEditor().clearAiLoadingChunk();
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
    getCardByUuid(cardUuid);
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

    // 更精确的匹配引用格式：[引用：卡片名称 (ID: 卡片UUID)]
    // 只匹配以"引用："开头的格式，并且ID必须是UUID格式
    const referenceRegex = /\[引用：([^[\]()]+?)\s*\(ID:\s*([a-f0-9-]{36}|[a-f0-9-]{8,})\)\]/g;

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

  console.log(card, 'card');
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
        />

        <div
          style={{
            display: 'flex',
            height: visualizerVisible ? 'calc(100vh - 300px)' : 'calc(100vh - 180px)',
          }}
        >
          <div
            style={{
              width: aiChatVisible ? '75%' : '100%',
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
                onInitChunkChatSession={onInitChunkChatSession}
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
                  }}
                >
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
                      onChange={e => setAiChatPrompt(e.target.value)}
                      ref={aiChatInputRef}
                      autoSize={{ minRows: 1, maxRows: 4 }}
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
                    <Select
                      bordered={false}
                      value={chatContext}
                      size="middle"
                      dropdownMatchSelectWidth={false}
                      onChange={value => {
                        try {
                          setChatContext(value);
                        } catch (err) {
                          console.error('Context selection error:', err);
                        }
                      }}
                      options={[
                        { value: 'Deck', label: t('anki.contextDeck') },
                        { value: 'Card', label: t('anki.contextCard') },
                        { value: 'None', label: t('anki.contextNone') },
                      ]}
                    />
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
