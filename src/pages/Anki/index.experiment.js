import { CloseOutlined } from '@ant-design/icons';
import { Button, message, Modal, Spin } from 'antd';
import { debounce } from 'lodash';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../common/hooks/useI18n';
import apiClient from '../../common/http/apiClient';
import { generateSimplifiedPromptDisplay } from '../../common/util/ai-util';
import AIChatSidebar from '../../component/AIChat';
import AnkiBar from '../../component/AnkiBar';
import AnkiCard, { processBookIndex } from '../../component/AnkiCard';
import BookTocTree from '../../component/BookTocTree';
import VoiceAssistantChat from '../../component/VoiceAssistantChat';
import './style.less';

function Anki() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();

  // 基础状态
  const [flipped, setFlipped] = useState(false);
  const [card, setCard] = useState({});
  const [allCards, setAllCards] = useState([]);
  const [visibleCards, setVisibleCards] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deckStats, setDeckStats] = useState({});
  const [config, setConfig] = useState({});

  // AI Chat 相关状态
  const [aiChatVisible, setAiChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatStatus, setChatStatus] = useState([]);
  const [aiChatLoading, setAiChatLoading] = useState(false);
  const [chunkId, setChunkId] = useState(null);
  const [useStreamingApi, setUseStreamingApi] = useState(true);

  // 语音助手相关状态
  const [voiceAssistantVisible, setVoiceAssistantVisible] = useState(false);
  const [voiceChatMessages, setVoiceChatMessages] = useState([]);
  const [voiceChatStatus, setVoiceChatStatus] = useState([]);
  const [voiceAiChatLoading, setVoiceAiChatLoading] = useState(false);
  const [voiceChunkId, setVoiceChunkId] = useState(null);
  const [characterSelectVisible, setCharacterSelectVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  // 其他UI状态
  const [visualizerVisible, setVisualizerVisible] = useState(false);
  const [tocDrawerVisible, setTocDrawerVisible] = useState(false);
  const [tocStructure, setTocStructure] = useState([]);

  // Refs
  const cardIdRef = useRef(null);
  const processingChunkIdRef = useRef(null);
  const editorRef = useRef(null);
  const aiChatSidebarRef = useRef(null);
  const voiceAssistantRef = useRef(null);

  // 防抖更新卡片
  const updateCardRef = useRef(
    debounce((value, cardUuid) => {
      apiClient
        .post(`/anki/updateCard`, { id: cardUuid, custom_back: value })
        .then(res => {
          // 处理响应
        })
        .catch(err => {
          console.log(err);
        });
    }, 800)
  );

  useEffect(() => {
    return () => {
      updateCardRef.current.cancel();
    };
  }, []);

  const updateCard = value => {
    updateCardRef.current(value, card['uuid']);
  };

  // 初始化加载卡片
  useEffect(() => {
    const cardUuid = searchParams.get('uuid');
    if (cardUuid) {
      console.log('初始化时获取指定卡片:', cardUuid);
      getCardByUuid(cardUuid, false, true);
    } else {
      getNextCard(params.deckId, true);
    }
  }, [params.deckId, searchParams]);

  // 语音助手相关方法
  const handleToggleVoiceAssistant = () => {
    // 如果还没有选择角色，先显示角色选择Modal
    if (!selectedCharacter) {
      setCharacterSelectVisible(true);
      return;
    }

    // 如果已有角色，则切换语音助手显示状态
    setVoiceAssistantVisible(!voiceAssistantVisible);

    // 如果开启语音助手，清理其他聊天组件
    if (!voiceAssistantVisible) {
      // 清理AI聊天
      if (aiChatSidebarRef.current && aiChatSidebarRef.current.cleanupEventSources) {
        aiChatSidebarRef.current.cleanupEventSources();
      }
      setAiChatVisible(false);
    }
  };

  const handleCharacterSelect = character => {
    setSelectedCharacter(character);
    setCharacterSelectVisible(false);
    setVoiceAssistantVisible(true);

    // 延迟调用，确保VoiceAssistantChat组件已经渲染
    setTimeout(() => {
      if (voiceAssistantRef.current && voiceAssistantRef.current.selectCharacter) {
        voiceAssistantRef.current.selectCharacter(character);
      }
    }, 100);

    // 清理AI聊天
    if (aiChatSidebarRef.current && aiChatSidebarRef.current.cleanupEventSources) {
      aiChatSidebarRef.current.cleanupEventSources();
    }
    setAiChatVisible(false);
  };

  const handleVoiceAssistantClose = () => {
    setVoiceAssistantVisible(false);

    // 清理语音助手资源
    if (voiceAssistantRef.current) {
      if (voiceAssistantRef.current.cleanupEventSources) {
        voiceAssistantRef.current.cleanupEventSources();
      }
      if (voiceAssistantRef.current.disableVoice) {
        voiceAssistantRef.current.disableVoice();
      }
    }
  };

  const handleDisableVoiceAssistant = () => {
    setVoiceAssistantVisible(false);
    setSelectedCharacter(null);

    // 清理语音助手资源
    if (voiceAssistantRef.current) {
      if (voiceAssistantRef.current.cleanupEventSources) {
        voiceAssistantRef.current.cleanupEventSources();
      }
      if (voiceAssistantRef.current.disableVoice) {
        voiceAssistantRef.current.disableVoice();
      }
    }
  };

  const onInitVoiceChunkChatSession = async (promptConfig, sessionId) => {
    const pendingMessages = [
      { role: 'user', content: generateSimplifiedPromptDisplay(promptConfig) },
    ];

    setVoiceChunkId(promptConfig.chunkId);
    setVoiceChatMessages([...pendingMessages, { role: 'assistant', pending: true, content: '' }]);

    // 清理现有的EventSource连接
    if (voiceAssistantRef.current && voiceAssistantRef.current.cleanupEventSources) {
      voiceAssistantRef.current.cleanupEventSources();
    }

    // 直接处理chunk会话的EventSource连接
    if (voiceAssistantRef.current && voiceAssistantRef.current.handleChunkSession) {
      voiceAssistantRef.current.handleChunkSession(sessionId);
    }
  };

  const getVoiceChatMessageAndShowSidebar = chunkId => {
    console.log(chunkId, 'voiceChunkId');

    if (!voiceAssistantVisible) {
      setVoiceAssistantVisible(true);
    }

    // 清理现有的EventSource连接
    if (voiceAssistantRef.current && voiceAssistantRef.current.cleanupEventSources) {
      voiceAssistantRef.current.cleanupEventSources();
    }

    setVoiceChunkId(chunkId);
    setVoiceAiChatLoading(true);
  };

  // 目录相关方法
  const handleGenerateIndex = async () => {
    try {
      if (tocDrawerVisible) {
        setTocDrawerVisible(false);
        return;
      }

      const response = await apiClient.get(`/anki/user-cards/front-and-uuid/${params.deckId}`);
      console.log('Book index data:', response.data);

      if (response.data && response.data.data) {
        const processedTocStructure = processBookIndex(response.data.data);
        console.log('Processed TOC structure:', processedTocStructure);

        setTocStructure(processedTocStructure);
        setTocDrawerVisible(true);
      } else {
        message.warning(t('anki.toc.noData'));
      }
    } catch (error) {
      console.error('Failed to generate index:', error);
      message.error(error?.response?.data?.message || t('anki.indexGenerateFailed'));
    }
  };

  const handleTocCardSelect = async (uuid, nodeData) => {
    try {
      console.log('目录中选择的卡片:', uuid, nodeData);
      getCardByUuid(uuid, true, false);
    } catch (error) {
      console.error('跳转到卡片失败:', error);
      message.error(t('anki.getCardError'));
    }
  };

  // 卡片相关API方法
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
      })
      .catch(err => {
        setLoading(false);
        throw err;
      });
  };

  const setQualityForThisCardAndGetNext = async (deckId, quality) => {
    try {
      // 清理AI聊天相关连接和状态
      if (aiChatSidebarRef.current && aiChatSidebarRef.current.cleanupEventSources) {
        aiChatSidebarRef.current.cleanupEventSources();
      }

      // 清理语音助手相关连接和状态
      if (voiceAssistantRef.current && voiceAssistantRef.current.cleanupEventSources) {
        voiceAssistantRef.current.cleanupEventSources();
      }

      setAiChatVisible(false);
      setVoiceAssistantVisible(false);
      setChunkId(undefined);
      setVoiceChunkId(undefined);
      setAiChatLoading(false);
      setVoiceAiChatLoading(false);
      editorRef?.current?.getEditor()?.clearAiLoadingChunk();

      if (quality !== 0) {
        await updateQualityForThisCard(deckId, quality);
      }
      getNextCard(deckId, false);
    } catch (e) {
      console.log(e);
    }
  };

  const getNextCard = (deckId, isInit = false) => {
    setFlipped(false);
    setLoading(true);

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

              if (data.data?.visibleCards) {
                setVisibleCards(data.data.visibleCards);
                setAllCards(data.data.visibleCards);
              }

              if (data.data?.pagination) {
                setPagination(data.data.pagination);
              }
            } else {
              if (data.data?.card === null) {
                navigate(`/anki/create/${deckId}`);
                setCard({ front: 'front', back: 'back' });
              } else if (data.data?.card?.message) {
                navigate(`/anki/empty`);
              }
            }
            return;
          }
          message.error(data.message);
        }
      })
      .catch(err => {
        setLoading(false);
        console.log(err);
      });
  };

  const getCardByUuid = (cardUuid, flip = true, isInit = false) => {
    setFlipped(false);
    setLoading(true);
    setAiChatVisible(false);
    setVoiceAssistantVisible(false);
    setAiChatLoading(false);
    setVoiceAiChatLoading(false);
    editorRef?.current?.getEditor()?.clearAiLoadingChunk();

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

          if (data.data.stats) {
            setDeckStats(data.data.stats);
          }
          if (data.data.visibleCards) {
            setVisibleCards(data.data.visibleCards);
            setAllCards(data.data.visibleCards);
          }
          if (data.data.pagination) {
            setPagination(data.data.pagination);
          }
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

  const handleCardClick = (cardUuid, cardData) => {
    console.log('点击卡片:', cardUuid, cardData);

    if (cardUuid === card?.['uuid']) {
      console.log(t('anki.switchingToCurrentCard'));
      return;
    }

    getCardByUuid(cardUuid, true, false);
  };

  // AI Chat 相关方法
  const getChatMessageAndShowSidebar = chunkId => {
    console.log(chunkId, 'chunkId111');

    if (processingChunkIdRef.current === chunkId) {
      console.log('Already processing the same chunkId, skipping getChatMessageAndShowSidebar...');
      return;
    }

    processingChunkIdRef.current = chunkId;

    if (!aiChatVisible) {
      setAiChatVisible(true);
    }

    // 清理现有的EventSource连接
    if (aiChatSidebarRef.current && aiChatSidebarRef.current.cleanupEventSources) {
      aiChatSidebarRef.current.cleanupEventSources();
    }

    setChunkId(chunkId);
    setAiChatLoading(true);
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

    // 清理现有的EventSource连接
    if (aiChatSidebarRef.current && aiChatSidebarRef.current.cleanupEventSources) {
      aiChatSidebarRef.current.cleanupEventSources();
    }

    setChatMessages([...pendingMessages, { role: 'assistant', pending: true, content: '' }]);

    // 直接处理chunk会话的EventSource连接，不调用getAIChat
    if (aiChatSidebarRef.current && aiChatSidebarRef.current.handleChunkSession) {
      aiChatSidebarRef.current.handleChunkSession(sessionId);
    }
  };

  const isNew = card['state'] === 0;

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
            processingChunkIdRef.current = null;
            setAiChatVisible(!aiChatVisible);

            // 清理EventSource连接
            if (aiChatSidebarRef.current && aiChatSidebarRef.current.cleanupEventSources) {
              aiChatSidebarRef.current.cleanupEventSources();
            }

            if (aiChatVisible) {
              setAiChatLoading(false);
            }

            if (!aiChatVisible && cardIdRef.current) {
              setAiChatLoading(true);
            }
          }}
          voiceAssistantEnabled={!!cardIdRef.current}
          voiceAssistantVisible={voiceAssistantVisible}
          onToggleVoiceAssistant={handleToggleVoiceAssistant}
          deckId={params.deckId}
          onGenerateIndex={handleGenerateIndex}
          tocVisible={tocDrawerVisible}
          allCards={allCards}
          currentCardId={card?.['uuid']}
          currentCardState={card?.['state']}
          deckStats={deckStats}
          onCardClick={handleCardClick}
          currentCard={card}
          onCardUpdate={updatedCard => {
            setCard(updatedCard);
            console.log('Card updated with new tags:', updatedCard);
          }}
          pagination={pagination}
          onNotesReady={() => {}}
        />

        <div
          style={{
            display: 'flex',
            height: 'calc(100vh - 180px)',
          }}
        >
          {/* 目录侧边栏 */}
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

          {/* 主卡片区域 */}
          <div
            style={{
              width:
                tocDrawerVisible && (aiChatVisible || voiceAssistantVisible)
                  ? '65%'
                  : tocDrawerVisible
                    ? '90%'
                    : aiChatVisible || voiceAssistantVisible
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
                  getCardByUuid(cardUuid, false, false);
                }}
                getChatMessageAndShowSidebar={getChatMessageAndShowSidebar}
                showAIChatSidebar={aiChatVisible}
                onFlip={action => setFlipped(action)}
              />
            </div>
          </div>

          {/* AI聊天侧边栏 */}
          {aiChatVisible && (
            <AIChatSidebar
              ref={aiChatSidebarRef}
              visible={aiChatVisible}
              onClose={() => {
                setAiChatVisible(false);
                setChunkId(undefined);
                setAiChatLoading(false);
              }}
              cardIdRef={cardIdRef}
              chunkId={chunkId}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
              chatStatus={chatStatus}
              setChatStatus={setChatStatus}
              aiChatLoading={aiChatLoading}
              setAiChatLoading={setAiChatLoading}
              useStreamingApi={useStreamingApi}
              card={card}
              onCardClick={handleCardClick}
            />
          )}

          {/* 语音助手侧边栏 */}
          {voiceAssistantVisible && selectedCharacter && (
            <VoiceAssistantChat
              ref={voiceAssistantRef}
              visible={voiceAssistantVisible}
              onClose={handleVoiceAssistantClose}
              cardIdRef={cardIdRef}
              chunkId={voiceChunkId}
              chatMessages={voiceChatMessages}
              setChatMessages={setVoiceChatMessages}
              chatStatus={voiceChatStatus}
              setChatStatus={setVoiceChatStatus}
              aiChatLoading={voiceAiChatLoading}
              setAiChatLoading={setVoiceAiChatLoading}
              useStreamingApi={useStreamingApi}
              card={card}
              onCardClick={handleCardClick}
            />
          )}
        </div>
      </div>

      {/* 角色选择Modal */}
      <Modal
        title="选择虚拟陪学伙伴"
        open={characterSelectVisible}
        onCancel={() => setCharacterSelectVisible(false)}
        footer={null}
        width={700}
        styles={{
          mask: { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
          content: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
        }}
      >
        <div style={{ padding: '20px 0' }}>
          <p style={{ marginBottom: '20px', color: 'rgba(255, 255, 255, 0.8)' }}>
            选择一个虚拟伙伴来陪伴你的学习之旅
          </p>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {[
              {
                id: 'chihana',
                name: '千花',
                avatar: '🌸',
                description: '温柔体贴的学习伙伴',
                color: '#FFB6C1',
                personality: '温柔、耐心、善解人意',
                backgroundImage: 'linear-gradient(135deg, #FFB6C1 0%, #FFC0CB 100%)',
              },
              {
                id: 'yuki',
                name: '雪音',
                avatar: '❄️',
                description: '冷静理智的知识导师',
                color: '#87CEEB',
                personality: '冷静、理智、博学',
                backgroundImage: 'linear-gradient(135deg, #87CEEB 0%, #B0E0E6 100%)',
              },
              {
                id: 'sakura',
                name: '樱花',
                avatar: '🌺',
                description: '活泼开朗的学习助手',
                color: '#FFB7DD',
                personality: '活泼、开朗、充满活力',
                backgroundImage: 'linear-gradient(135deg, #FFB7DD 0%, #FFC0CB 100%)',
              },
            ].map(character => (
              <div
                key={character.id}
                onClick={() => handleCharacterSelect(character)}
                style={{
                  flex: '1 1 calc(33.333% - 15px)',
                  minWidth: '180px',
                  padding: '24px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = character.color;
                  e.currentTarget.style.background = character.color + '20';
                  e.currentTarget.style.transform = 'translateY(-5px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ fontSize: '60px', marginBottom: '16px' }}>{character.avatar}</div>
                <div
                  style={{
                    fontWeight: 'bold',
                    fontSize: '20px',
                    marginBottom: '8px',
                    color: 'white',
                  }}
                >
                  {character.name}
                </div>
                <div
                  style={{
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '14px',
                    marginBottom: '8px',
                  }}
                >
                  {character.description}
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
                  {character.personality}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </Spin>
  );
}

export default Anki;
