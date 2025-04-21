import React, { useState, useEffect, useRef, useCallback } from 'react';
import { message, Spin, Switch, Tag, Input, Space, Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import AnkiCard from '../../component/AnkiCard';
import apiClient from '../../common/http/apiClient';
import axios from 'axios';
import {
  CaretDownOutlined,
  SendOutlined,
  PaperClipOutlined,
  CloseOutlined,
  HighlightOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import './style.less';
import { marked } from 'marked';

function Anki() {
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();
  const [card, setCard] = useState({});
  const [loading, setLoading] = useState(false);
  const [deckStats, setDeckStats] = useState({});
  const params = useParams();
  const [config, setConfig] = useState({});
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const cardIdRef = useRef(null);
  const aiChatPromptRef = useRef(null);
  const aiChatMessagesRef = useRef(null);
  const [chunkId, setChunkId] = useState(null);
  console.log(params, 'params');

  useEffect(() => {
    getNextCard(params.deckId, true);
  }, []);

  useEffect(() => {
    // if (aiChatVisible) {
    //   getAIChat(chatIdRef.current);
    // }
  }, [aiChatVisible]);

  const getAIChat = (chatId, chunkId) => {
    let paramsStr = '';
    if (chunkId) {
      paramsStr = `?chunkId=${chunkId}`;
    }
    apiClient.get(`/aichat/${chatId}/messages${paramsStr}`).then(res => {
      const data = res.data.data;
      setChatMessages(
        data.messages.map(item => ({ role: item.role, content: item.content })).reverse()
      );
      // console.log(res)
    });
  };

  const sendAiChatMessage = async message => {
    const pendingMessages = [...chatMessages, { role: 'user', content: message }];
    setChatMessages([...pendingMessages, { role: 'assistant', pending: true }]);
    const response = await apiClient.post('/aichat/message', {
      cardId: cardIdRef.current,
      chatcontext: 'None',
      chattype: 'Generic',
      chunkId,
      question: message,
      model: 'deepseek-chat',
    });

    if (response.data.success) {
      const aiData = response.data.data;
      setChatMessages([...pendingMessages, aiData.aiMessage]);
    } else {
      message.error(response.data.message || 'Request failed');
    }
  };

  useEffect(() => {
    if (aiChatMessagesRef.current) {
      aiChatMessagesRef.current.scrollTo({
        top: aiChatMessagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatMessages]);

  const setQualityForThisCardAndGetNext = async (deckId, quality) => {
    try {
      await updateQualityForThisCard(deckId, quality);
      getNextCard(deckId);
    } catch (e) {
      console.log(e);
    }
  };

  const updateQualityForThisCard = async (deckId, quality) => {
    setLoading(true);
    return await apiClient
      .post(`/anki/updateCardWithFSRS`, { userCardId: card.uuid, reviewQuality: quality })
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

  const getDeckStats = deckId => {
    apiClient
      .get(`/anki/getDeckStats?deckId=${deckId}`)
      .then(res => {
        const data = res.data;
        if (data.success) {
          setDeckStats(data.data);
          return;
        }
        message.error(data.message);
        console.log(res);
      })
      .catch(err => {
        console.log(err);
        throw err;
      });
  };

  const getNextCard = (deckId, isInit = false) => {
    setFlipped(false);
    setLoading(true);
    // getDeckStats(deckId);
    apiClient
      .get(`/anki/getNextCard?deckId=${deckId}`)
      .then(res => {
        setLoading(false);
        const data = res.data;
        if (data.success) {
          if (Object.keys(data.data || {}).length > 0) {
            cardIdRef.current = data.data?.uuid;
            setCard(data.data);
          } else {
            if (data.data === null) {
              //deck为空 需要插入新卡
              navigate(`/anki/create/${deckId}`);
              setCard({ front: 'front', back: 'back' });
            } else {
              navigate(`/anki/empty`);
              //deck为{} 代表今天或目前没有卡片了
            }
          }
          return;
        }
        message.error(data.message);
        console.log(res);
      })
      .catch(err => {
        setLoading(false);
        console.log(err);
      });
  };

  const updateCard = value => {
    console.log({ id: card.id, back: value });
    apiClient
      .post(`/anki/updateCard`, { id: card.uuid, custom_back: value })
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
    setChunkId(chunkId);
    getAIChat(cardIdRef.current, chunkId);
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

  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: '0px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            background: 'white',
            padding: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span
              style={{ cursor: 'pointer', marginRight: '8px' }}
              onClick={() => setConfig({ ...config, autoMarkTitle: !config.autoMarkTitle })}
            >
              {config.autoMarkTitle ? (
                <HighlightOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
              ) : (
                <HighlightOutlined style={{ fontSize: '16px', color: '#d9d9d9' }} />
              )}
            </span>
            {cardIdRef.current && (
              <span
                style={{ cursor: 'pointer', marginRight: '8px' }}
                onClick={() => {
                  setChunkId(undefined);
                  setAiChatVisible(!aiChatVisible);
                  if (!aiChatVisible) {
                    getAIChat(cardIdRef.current);
                  }
                }}
              >
                <MessageOutlined
                  style={{ fontSize: '16px', color: aiChatVisible ? '#1890ff' : '#d9d9d9' }}
                />
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Tag style={isNew ? { fontSize: '16px', fontWeight: 'bold' } : null} color="blue">
              New: {deckStats?.newCards}
            </Tag>
            <Tag style={isNew ? { fontSize: '16px', fontWeight: 'bold' } : null} color="red">
              Learning: {deckStats?.learning}
            </Tag>
            <Tag style={!isNew ? { fontSize: '16px', fontWeight: 'bold' } : null} color="green">
              Review: {deckStats?.review}
            </Tag>
          </div>
        </div>

        <div style={{ display: 'flex', height: 'calc(100vh - 120px)' }}>
          <div style={{ width: aiChatVisible ? '75%' : '100%', transition: 'width 0.3s' }}>
            <AnkiCard
              config={config}
              front={card['front']}
              back={card['customBack']}
              frontType={card['frontType']}
              key={card['id']}
              cardUUID={card['uuid']}
              onChange={value => updateCard(value)}
              isNew={isNew}
              flipped={flipped}
              onNext={quality => {
                setQualityForThisCardAndGetNext(params.deckId, quality);
              }}
              getChatMessageAndShowSidebar={getChatMessageAndShowSidebar}
              onFlip={action => setFlipped(action)}
            />
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
                <div>
                  <Button type="link" onClick={() => getAIChat(cardIdRef.current)}>
                    View history
                  </Button>
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => setAiChatVisible(false)}
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
                          backgroundColor: message.role === 'user' ? '#1890ff' : '#f5f5f5',
                          color: message.role === 'user' ? 'white' : 'rgba(0, 0, 0, 0.85)',
                        }}
                      >
                        {message.pending
                          ? 'thinking...'
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
                  <Input
                    placeholder="Ask AI anything..."
                    onChange={e => (aiChatPromptRef.current = e.target.value)}
                    onPressEnter={() => {
                      if (
                        chatMessages.length > 0 &&
                        chatMessages[chatMessages.length - 1].pending
                      ) {
                        return;
                      }
                      if (aiChatPromptRef.current) {
                        sendAiChatMessage(aiChatPromptRef.current);
                        aiChatPromptRef.current = '';
                      }
                    }}
                    suffix={
                      <Space>
                        <SendOutlined
                          onClick={() => {
                            if (
                              chatMessages.length > 0 &&
                              chatMessages[chatMessages.length - 1].pending
                            ) {
                              return;
                            }
                            if (aiChatPromptRef.current) {
                              sendAiChatMessage(aiChatPromptRef.current);
                              aiChatPromptRef.current = '';
                            }
                          }}
                        />
                      </Space>
                    }
                  />
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
