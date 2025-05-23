import { CloseOutlined, SendOutlined } from '@ant-design/icons';
import { Button, Input, message, Select, Spin } from 'antd';
import { marked } from 'marked';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../common/http/apiClient';
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
  const [chatContext, setChatContext] = useState('None');
  const aiChatMessagesRef = useRef(null);
  const aiChatInputRef = useRef(null);
  const [chunkId, setChunkId] = useState(null);
  const [visualizerVisible, setVisualizerVisible] = useState(false);
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

    // Determine context content based on context type
    let contextContent = '';
    if (['Deck', 'Card'].includes(chatContext) && card) {
      contextContent = `${card.customBack || card.back || ''}`;
    }

    const response = await apiClient.post('/aichat/message', {
      cardId: cardIdRef.current,
      chatcontext: chatContext,
      chattype: 'Generic',
      chunkId,
      question: message,
      contextContent: contextContent,
      model: 'deepseek-chat',
    });

    if (response.data.success) {
      const aiData = response.data.data;
      setChatMessages([...pendingMessages, aiData.aiMessage]);
    } else {
      message.error(response.data.message || 'Request failed');
    }
  };

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
      setAiChatVisible(false);
      await updateQualityForThisCard(deckId, quality);
      getNextCard(deckId);
      setChatContext('None');
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

  console.log(card, 'card');
  return (
    <Spin spinning={loading}>
      <div style={{ marginBottom: '0px' }}>
        <AnkiBar
          autoMarkTitleEnabled={config.autoMarkTitle}
          onToggleAutoMarkTitle={() =>
            setConfig({ ...config, autoMarkTitle: !config.autoMarkTitle })
          }
          visualizerVisible={visualizerVisible}
          onToggleVisualizer={() => setVisualizerVisible(!visualizerVisible)}
          aiChatEnabled={!!cardIdRef.current}
          aiChatVisible={aiChatVisible}
          onToggleAIChat={() => {
            setChunkId(undefined);
            setAiChatVisible(!aiChatVisible);
            if (!aiChatVisible && cardIdRef.current) {
              getAIChat(cardIdRef.current);
            }
          }}
          allCards={allCards}
          currentCardId={card?.uuid}
          currentCardState={card?.state}
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
