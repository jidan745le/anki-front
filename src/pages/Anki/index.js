import React, { useState, useEffect, useRef } from 'react';
import { message, Spin, Switch, Tag, Drawer, Input, Space,Button } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import AnkiCard from '../../component/AnkiCard';
import apiClient from '../../common/http/apiClient';
import axios from 'axios';
import { CaretDownOutlined, SendOutlined, PaperClipOutlined, CloseOutlined, HighlightOutlined, MessageOutlined } from '@ant-design/icons';
import './style.less';



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
  const [chatMessage, setChatMessage] = useState([]);
  const chatIdRef = useRef(null);
  const aiChatPromptRef = useRef(null);
  const aiChatMessagesRef = useRef(null);
  console.log(params, "params")

  useEffect(() => {
    getNextCard(params.deckId);
  }, [])

  useEffect(() => {
    // if (aiChatVisible) {
    //   getAIChat(chatIdRef.current);
    // }
  }, [aiChatVisible])


  const getAIChat = (chatId) => {
    apiClient.get(`/aichat/${chatId}/messages`).then(res => {
      const data = res.data.data;
      setChatMessage(data.messages.map(item => ({ role: item.role, content: item.content})).reverse());
      // console.log(res)
    })
  }

  const sendAiChatMessage = async (message) => {
    setChatMessage([...chatMessage, { role: 'user', content: message }, { role: "assistant", pending: true }]);
    const response = await apiClient.post('/aichat/message', {
      chatId: chatIdRef.current,
      // cardId: card.uuid,
      content: message,
      model: 'deepseek-chat'
    });

    if (response.data.success) {
      const aiData = response.data.data;
      setChatMessage([...chatMessage, aiData.userMessage, aiData.aiMessage]);
    } else {
      message.error(response.data.message || 'Request failed');
    }
  }

  useEffect(() => {
    if (aiChatMessagesRef.current) {
      aiChatMessagesRef.current.scrollTo({ top: aiChatMessagesRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessage])

  const setQualityForThisCardAndGetNext = async (deckId, quality) => {
    try {
      await updateQualityForThisCard(deckId, quality);
      getNextCard(deckId);
    } catch (e) {
      console.log(e)
    }
  }

  const updateQualityForThisCard = async (deckId, quality) => {
    setLoading(true);
    return await apiClient.post(`/anki/updateCardWithSM2/${quality}`, { id: card.id, deckId, quality: quality }).then(res => {
      setLoading(false);
      const data = res.data;
      if (data.success) {
        return;
      }
      message.error(data.message)
      console.log(res)
    }).catch(err => {
      setLoading(false);
      throw err;
    })
  }

  const getDeckStats = (deckId) => {
    apiClient.get(`/anki/getDeckStats?deckId=${deckId}`).then(res => {
      const data = res.data;
      if (data.success) {
        setDeckStats(data.data)
        return;
      }
      message.error(data.message)
      console.log(res)
    }).catch(err => {
      console.log(err)
      throw err;
    })
  }

  const getNextCard = (deckId) => {
    setFlipped(false);
    setLoading(true);
    getDeckStats(deckId);
    apiClient.get(`/anki/getNextCard?deckId=${deckId}`).then(res => {
      setLoading(false);
      const data = res.data;
      if (data.success) {
        if (Object.keys(data.data || {}).length > 0) {
          chatIdRef.current = data.data.chat?.uuid
          setCard(data.data)
        } else {
          if (data.data === null) {
            //deck为空 需要插入新卡
            navigate(`/anki/create/${deckId}`)
            setCard({ front: "front", back: "back" })
          } else {
            navigate(`/anki/empty`)
            //deck为{} 代表今天或目前没有卡片了
          }
        }
        return;
      }
      message.error(data.message)
      console.log(res)
    }).catch(err => {
      setLoading(false);
      console.log(err)
    })
  }

  const updateCard = (value) => {
    console.log({ id: card.id, back: value });
    apiClient.post(`/anki/updateCard`, { id: card.id, back: value }).then(res => {
      // const data = res.data;
      // if (data.success) {
      //   setCard(data.data)
      //   return;
      // }
      // message.error(data.message)
    }).catch(err => {
      console.log(err)
    })
  }

  const showAIChatSidebar = (chatData) => {
    const { aiMessage: { content, chat: { uuid } }, userMessage } = chatData;
    setChatMessage([userMessage, chatData.aiMessage])
    setAiChatVisible(true)
    chatIdRef.current = uuid;

  };

  const isNew = card["card_type"] === "new";

  return <Spin spinning={loading} >
    <div style={{ marginBottom: "0px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", background: "white", padding: "12px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span 
            style={{ cursor: 'pointer', marginRight: "8px" }}
            onClick={() => setConfig({ ...config, autoMarkTitle: !config.autoMarkTitle })}
          >
            {config.autoMarkTitle ? (
              <HighlightOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
            ) : (
              <HighlightOutlined style={{ fontSize: '16px', color: '#d9d9d9' }} />
            )}
          </span>
          {chatIdRef.current && (
            <span 
              style={{ cursor: 'pointer', marginRight: "8px" }}
              onClick={() => {
                setAiChatVisible(true);
                getAIChat(chatIdRef.current);
              }}
            >
              <MessageOutlined style={{ fontSize: '16px', color:aiChatVisible ? '#1890ff' : '#d9d9d9' }} />
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Tag style={isNew ? { fontSize: "16px", fontWeight: "bold" } : null} color="blue">New: {deckStats.newCards}</Tag>
          <Tag style={!isNew ? { fontSize: "16px", fontWeight: "bold" } : null} color="green">Due: {deckStats.dueCards}</Tag>
        </div>
      </div>
      <AnkiCard
        config={config}
        front={card["front"]}
        back={card["back"]}
        frontType={card["frontType"]}
        key={card["id"]}
        cardUUID={card["uuid"]}
        onChange={(value) => updateCard(value)}
        isNew={isNew}
        flipped={flipped}
        onNext={(quality) => {
          setQualityForThisCardAndGetNext(params.deckId, quality)
        }}
        showAIChatSidebar={showAIChatSidebar}
        onFlip={(action) => setFlipped(action)} />
      <Drawer
        title={
          <div className="ai-chat-header">
            <span className="alpha-tag">AI Chat</span>
            <Button type="link" variant="text" onClick={() => {
              getAIChat(chatIdRef.current)
            }}>view history</Button>
          </div>
        }
        placement="right"
        width={400}
        onClose={() => setAiChatVisible(false)}
        open={aiChatVisible}
        destroyOnClose
        className="ai-chat-drawer"
        closeIcon={<CloseOutlined />}
      >
        <div className="ai-chat-container">

          <div className="ai-chat-messages" ref={aiChatMessagesRef}>
            {chatMessage.map((message, index) => (
              <div key={message.uuid}
                className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-content">
                  {message.pending ? "thinking..." : message.content}
                </div>
              </div>
            ))}
          </div>

          <div className="ai-chat-input">
            <Input
              placeholder="Ask AI anything..."
              onChange={(e) => aiChatPromptRef.current = e.target.value}
              suffix={
                <Space>
                  <SendOutlined onClick={() => {
                    if (chatMessage[chatMessage.length - 1].pending) {
                      return;
                    }
                    sendAiChatMessage(aiChatPromptRef.current)
                  }} />
                </Space>
              }
            />
          </div>
        </div>
      </Drawer>
    </div>
  </Spin>
}

export default Anki;