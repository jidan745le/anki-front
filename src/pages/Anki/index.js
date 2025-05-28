import { CloseOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Input, message, Select, Spin } from 'antd';
import { marked } from 'marked';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../common/http/apiClient';
import { generateSimplifiedPromptDisplay } from '../../common/util/ai-util';
import AnkiBar from '../../component/AnkiBar';
import AnkiCard from '../../component/AnkiCard';
import './style.less';

function Anki() {
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
  console.log(params, 'params');

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
          `${apiClient.defaults.baseURL}/aichat/status/${sessionId}?token=${token}`
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
          `${apiClient.defaults.baseURL}/aichat/stream/${sessionId}?token=${token}`
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

  const updateCard = value => {
    console.log({ id: card['id'], back: value });
    apiClient
      .post(`/anki/updateCard`, { id: card['uuid'], custom_back: value })
      .then(res => {
        // const data = res.data;
        // if (data.success) {
        //   setCard(data.data)
        //   return;
        // }
        // message.error(data.message)
      })
      .catch(err => {
        console.log(err);
      });
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

    const eventSource = new EventSource(`${apiClient.defaults.baseURL}/aichat/stream/${sessionId}`);
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

  // 修改内容渲染部分
  const renderContent = content => {
    if (!content) return null;

    const htmlContent = getHtmlContent(content);
    return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  };

  const isNew = card['state'] === 0;

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
        />

        <div style={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
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
              }}
            >
              <AnkiCard
                config={config}
                front={card['front']}
                back={card['customBack']}
                frontType={
                  card['frontType'] === 'audio'
                    ? 'audio'
                    : card['front']?.includes('audio/decks')
                      ? 'audio'
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
                    AI Chat
                  </span>
                </div>
                <div>
                  <Button type="link" onClick={() => getAIChat(cardIdRef.current)}>
                    View history
                  </Button>
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
                  height: 'calc(100% - 125px)',
                  overflow: 'hidden',
                }}
              >
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
                  {aiChatLoading && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        zIndex: 10,
                      }}
                    >
                      <Spin size="large" />
                    </div>
                  )}
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
                          backgroundColor: message.role === 'user' ? '#1890ff' : '#f5f5f5',
                          color: message.role === 'user' ? 'white' : 'rgba(0, 0, 0, 0.85)',
                        }}
                      >
                        {message.pending
                          ? message.content
                            ? renderContent(message.content)
                            : 'thinking...'
                          : message.role === 'user'
                            ? message.content
                            : renderContent(message.content)}
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className="ai-chat-input"
                  style={{ padding: '16px', borderTop: '1px solid #f0f0f0', background: 'white' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
                    <Input
                      placeholder="Ask AI anything..."
                      value={aiChatPrompt}
                      onChange={e => setAiChatPrompt(e.target.value)}
                      ref={aiChatInputRef}
                      onPressEnter={() => {
                        if (
                          chatMessages.length > 0 &&
                          chatMessages[chatMessages.length - 1].pending
                        ) {
                          return;
                        }
                        if (aiChatPrompt) {
                          sendAiChatMessage(aiChatPrompt);
                          setAiChatPrompt('');
                        }
                      }}
                    />
                    <Select
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
                        { value: 'Deck', label: 'Deck' },
                        { value: 'Card', label: 'Card' },
                        { value: 'None', label: 'None' },
                      ]}
                    />
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={() => {
                        if (
                          chatMessages.length > 0 &&
                          chatMessages[chatMessages.length - 1].pending
                        ) {
                          return;
                        }
                        if (aiChatPrompt) {
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
