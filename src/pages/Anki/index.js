import { CloseOutlined } from '@ant-design/icons';
import { Button, message, Spin } from 'antd';
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
  const [selectedCharacter, setSelectedCharacter] = useState(null);

  // 其他UI状态
  const [visualizerVisible, setVisualizerVisible] = useState(false);
  const [tocDrawerVisible, setTocDrawerVisible] = useState(false);
  const [tocStructure, setTocStructure] = useState([]);

  // 语音相关状态

  // Refs
  const cardIdRef = useRef(null);
  const processingChunkIdRef = useRef(null);
  const editorRef = useRef(null);
  const aiChatSidebarRef = useRef(null);

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

      if (aiChatSidebarRef.current && aiChatSidebarRef.current.handleAudioCleanupOnNavigation) {
        aiChatSidebarRef.current.handleAudioCleanupOnNavigation();
      }

      setAiChatVisible(false);
      setChunkId(undefined);
      setAiChatLoading(false);
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
    setAiChatLoading(false);
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

    // 中断之前的朗读（如果有）
    if (aiChatSidebarRef.current && aiChatSidebarRef.current.handleAudioCleanupOnNavigation) {
      aiChatSidebarRef.current.handleAudioCleanupOnNavigation();
    }

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

    // 中断之前的朗读（如果有）
    if (aiChatSidebarRef.current && aiChatSidebarRef.current.handleAudioCleanupOnNavigation) {
      aiChatSidebarRef.current.handleAudioCleanupOnNavigation();
    }

    if (!aiChatVisible) {
      setAiChatVisible(true);
    }
    setChunkId(promptConfig.chunkId);
    processingChunkIdRef.current = promptConfig.chunkId;

    // 清理现有的EventSource连接
    if (aiChatSidebarRef.current && aiChatSidebarRef.current.cleanupEventSources) {
      aiChatSidebarRef.current.cleanupEventSources();
    }

    // 关键修改：不设置sessionId，避免触发状态监听effect
    setChatMessages([...pendingMessages, { role: 'assistant', pending: true, content: '' }]);

    // 直接处理chunk会话的EventSource连接
    if (aiChatSidebarRef.current && aiChatSidebarRef.current.handleChunkSession) {
      aiChatSidebarRef.current.handleChunkSession(sessionId);
    }
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
          deckId={params.deckId}
          onGenerateIndex={handleGenerateIndex}
          tocVisible={tocDrawerVisible}
          onToggleAIChat={() => {
            // 中断之前的朗读（如果有）
            if (
              aiChatSidebarRef.current &&
              aiChatSidebarRef.current.handleAudioCleanupOnNavigation
            ) {
              aiChatSidebarRef.current.handleAudioCleanupOnNavigation();
            }

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
          selectedCharacter={selectedCharacter}
          onSelectCharacter={setSelectedCharacter}
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
                characterId={selectedCharacter?.id}
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
          <AIChatSidebar
            ref={aiChatSidebarRef}
            visible={aiChatVisible}
            onClose={() => {
              // 中断之前的朗读（如果有）
              if (
                aiChatSidebarRef.current &&
                aiChatSidebarRef.current.handleAudioCleanupOnNavigation
              ) {
                aiChatSidebarRef.current.handleAudioCleanupOnNavigation();
              }
              setAiChatVisible(false);
              processingChunkIdRef.current = null;
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
            selectedCharacter={selectedCharacter}
            onSelectCharacter={setSelectedCharacter}
          />
        </div>
      </div>
    </Spin>
  );
}

export default Anki;
