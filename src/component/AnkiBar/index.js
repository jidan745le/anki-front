import {
  BookOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileTextOutlined,
  HighlightOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  SoundOutlined,
  TagOutlined,
} from '@ant-design/icons';
import { Input, Modal, Popover, Tag, Tooltip, message } from 'antd';
import React, { useState } from 'react';
import { useI18n } from '../../common/hooks/useI18n';
import apiClient from '../../common/http/apiClient';
import CardVisualizer from '../CardVisualizer';
import NotesModal from '../NotesModal';
import './style.less';

const AnkiBar = ({
  autoMarkTitleEnabled,
  onToggleAutoMarkTitle,
  visualizerVisible,
  onToggleVisualizer,
  aiChatEnabled,
  aiChatVisible,
  onToggleAIChat,
  allCards,
  currentCardId,
  currentCardState,
  deckStats,
  debugModeForVisualizer = false,
  onCardClick,
  deckId,
  onGenerateIndex,
  tocVisible,
  currentCard,
  onCardUpdate,
  pagination = null,
  onNotesReady, // 可选回调，用于将笔记功能暴露给父组件
  selectedCharacter,
  onSelectCharacter,
}) => {
  const { t, currentLanguage } = useI18n();
  const [tagsVisible, setTagsVisible] = useState(false);
  const [inputVisible, setInputVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState(
    currentCard?.tags ? currentCard.tags.split(',').filter(Boolean) : []
  );
  const [updating, setUpdating] = useState(false);
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [notesModalTitle, setNotesModalTitle] = useState(null);
  const [characterSelectVisible, setCharacterSelectVisible] = useState(false);

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

  // 预设标签（英文key）
  const presetTags = ['favorite', 'important', 'difficult', 'error_prone', 'review'];

  // CardVisualizer相关函数，MAX_VISIBLE_CARDS已不再需要，后端计算可见卡片

  // Helper function to convert hex to RGB (从CardVisualizer复制)
  const hexToRgb = hex => {
    let r = 0,
      g = 0,
      b = 0;
    // 3 digits
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
      // 6 digits
    } else if (hex.length === 7) {
      r = parseInt(hex[1] + hex[2], 16);
      g = parseInt(hex[3] + hex[4], 16);
      b = parseInt(hex[5] + hex[6], 16);
    } else {
      return null; // Invalid hex format
    }
    return { r, g, b };
  };

  // Function to determine the color based on card state (从CardVisualizer复制)
  const getCardColor = (state, opacityValue = 1) => {
    let baseColorHex;
    switch (state) {
      case 0: // New card
        baseColorHex = '#8CB9DE'; // Soft Blue
        break;
      case 1: // Learning
        baseColorHex = '#F4A9A8'; // Soft Red/Pink
        break;
      case 2: // Review
        baseColorHex = '#A8D8B9'; // Soft Green
        break;
      case 3: // Relearning
        baseColorHex = '#FDDDA0'; // Soft Orange/Peach
        break;
      case 4: // Suspended
        baseColorHex = '#FF6B6B'; // Red for suspended cards
        break;
      default:
        baseColorHex = '#D3D3D3'; // Light Gray
    }
    const rgb = hexToRgb(baseColorHex);
    if (!rgb) {
      // Fallback to a default gray if hex conversion fails, applying opacity
      return `rgba(217, 217, 217, ${opacityValue})`;
    }
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacityValue})`;
  };

  // 生成图例内容 (从CardVisualizer复制并修改)
  const getLegendContent = () => {
    // 现在allCards已经是后端计算好的visibleCards，使用pagination显示正确信息
    // 获取卡片数量信息
    const cardCountText =
      pagination && pagination.totalCards > (allCards?.length || 0)
        ? t('cardVisualizer.showPartialCards', undefined, {
            visible: allCards?.length || 0,
            total: pagination.totalCards,
          })
        : t('cardVisualizer.showAllCards', undefined, {
            count: allCards?.length || 0,
          });

    return (
      <div style={{ padding: '8px' }}>
        <div style={{ marginBottom: '12px', fontWeight: 'bold', fontSize: '14px' }}>
          {t('cardVisualizer.legend.title')}
        </div>

        {/* 卡片数量信息 */}
        <div style={{ marginBottom: '12px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
          {cardCountText}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* 卡片状态 */}
          <div style={{ marginBottom: '8px' }}>
            <div
              style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}
            >
              {t('cardVisualizer.legend.cardStates')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: getCardColor(0),
                    borderRadius: '2px',
                  }}
                />
                <span style={{ fontSize: '12px' }}>{t('cardVisualizer.legend.newCard')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: getCardColor(1),
                    borderRadius: '2px',
                  }}
                />
                <span style={{ fontSize: '12px' }}>{t('cardVisualizer.legend.learning')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: getCardColor(2),
                    borderRadius: '2px',
                  }}
                />
                <span style={{ fontSize: '12px' }}>{t('cardVisualizer.legend.review')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: getCardColor(3),
                    borderRadius: '2px',
                  }}
                />
                <span style={{ fontSize: '12px' }}>{t('cardVisualizer.legend.relearning')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: getCardColor(4),
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                  }}
                >
                  ❌
                </div>
                <span style={{ fontSize: '12px' }}>{t('cardVisualizer.legend.suspended')}</span>
              </div>
            </div>
          </div>

          {/* 记忆强度 */}
          <div>
            <div
              style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#666' }}
            >
              {t('cardVisualizer.legend.memoryStrength')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#666',
                    borderRadius: '2px',
                    border: '1px solid #999',
                  }}
                />
                <span style={{ fontSize: '12px' }}>{t('cardVisualizer.legend.strongMemory')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#ccc',
                    borderRadius: '2px',
                    border: '1px solid #999',
                  }}
                />
                <span style={{ fontSize: '12px' }}>{t('cardVisualizer.legend.mediumMemory')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    backgroundColor: '#fff',
                    borderRadius: '2px',
                    border: '1px solid #ddd',
                  }}
                />
                <span style={{ fontSize: '12px' }}>{t('cardVisualizer.legend.weakMemory')}</span>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
              {t('cardVisualizer.legend.memoryNote')}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 简化翻译函数
  const getTranslation = (key, fallback) => {
    const translations = {
      zh: {
        manageTags: '管理标签',
        currentTags: '当前标签',
        presetTags: '预设标签',
        addTag: '+ 添加标签',
        tagUpdatedSuccess: '标签更新成功',
        tagUpdateFailed: '标签更新失败',
        noCardSelected: '未选择卡片或卡片ID缺失',
      },
      en: {
        manageTags: 'Manage Tags',
        currentTags: 'Current Tags',
        presetTags: 'Preset Tags',
        addTag: '+ Add Tag',
        tagUpdatedSuccess: 'Tags updated successfully',
        tagUpdateFailed: 'Failed to update tags',
        noCardSelected: 'No card selected or card ID missing',
      },
    };

    return translations[currentLanguage]?.[key] || translations.en[key] || fallback;
  };

  // 获取预设标签的翻译
  const getPresetTagLabel = tagKey => {
    console.log('Current language:', currentLanguage, 'Tag key:', tagKey); // 调试信息

    const translations = {
      en: {
        favorite: 'Favorite',
        important: 'Important',
        difficult: 'Difficult',
        error_prone: 'Error Prone',
        review: 'Review',
      },
      zh: {
        favorite: '收藏',
        important: '重要',
        difficult: '难点',
        error_prone: '易错',
        review: '复习',
      },
    };

    const result = translations[currentLanguage]?.[tagKey] || translations.en[tagKey] || tagKey;
    console.log('Translation result:', result); // 调试信息

    return result;
  };

  const handleClose = removedTag => {
    const newTags = tags.filter(tag => tag !== removedTag);
    setTags(newTags);
    updateCardTags(newTags);
  };

  const showInput = () => {
    setInputVisible(true);
  };

  const handleInputConfirm = () => {
    if (inputValue && !tags.includes(inputValue)) {
      const newTags = [...tags, inputValue];
      setTags(newTags);
      updateCardTags(newTags);
    }
    setInputVisible(false);
    setInputValue('');
  };

  const handlePresetTagClick = tag => {
    if (!tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      updateCardTags(newTags);
    }
  };

  const updateCardTags = async newTags => {
    console.log('updateCardTags called with:', { newTags, currentCard });

    if (!currentCard?.id) {
      console.warn('Cannot update tags: currentCard or currentCard.id is missing', currentCard);
      message.warning(getTranslation('noCardSelected', 'No card selected or card ID missing'));
      return;
    }

    console.log('Updating card tags for card ID:', currentCard.id, 'with tags:', newTags.join(','));

    setUpdating(true);
    try {
      const payload = {
        id: currentCard.uuid,
        tags: newTags.join(','),
      };

      console.log('API payload:', payload);

      const response = await apiClient.post('/anki/updateCard', payload);

      console.log('API response:', response.data);

      if (response.data.success) {
        message.success(getTranslation('tagUpdatedSuccess', 'Tags updated successfully'));
        if (onCardUpdate) {
          onCardUpdate({
            ...currentCard,
            tags: newTags.join(','),
          });
        } else {
          console.warn('onCardUpdate callback not provided');
        }
      } else {
        message.error(
          getTranslation('tagUpdateFailed', 'Failed to update tags') +
            ': ' +
            (response.data.message || 'Unknown error')
        );
        setTags(currentCard?.tags ? currentCard.tags.split(',').filter(Boolean) : []);
      }
    } catch (error) {
      console.error('Error updating tags:', error);
      message.error(
        getTranslation('tagUpdateFailed', 'Error updating tags') +
          ': ' +
          (error.response?.data?.message || error.message)
      );
      setTags(currentCard?.tags ? currentCard.tags.split(',').filter(Boolean) : []);
    } finally {
      setUpdating(false);
    }
  };

  React.useEffect(() => {
    setTags(currentCard?.tags ? currentCard.tags.split(',').filter(Boolean) : []);
  }, [currentCard?.id, currentCard?.tags]);

  // 将笔记功能暴露给父组件
  React.useEffect(() => {
    if (onNotesReady) {
      onNotesReady({ openNotes: handleOpenNotes });
    }
  }, [onNotesReady]);

  // 笔记功能处理函数
  const handleOpenNotes = (initialTitle = null) => {
    if (!currentCard) {
      message.warning('请先选择一个卡片');
      return;
    }
    setNotesModalTitle(initialTitle);
    setNotesModalVisible(true);
  };

  const handleCloseNotes = () => {
    setNotesModalVisible(false);
    setNotesModalTitle(null);
  };

  const tagsContent = (
    <div style={{ minWidth: 300, maxWidth: 400 }}>
      <div style={{ marginBottom: 8 }}>
        <strong>{getTranslation('currentTags', 'Current Tags')}:</strong>
      </div>
      <div style={{ marginBottom: 12 }}>
        {tags.map(tag => (
          <Tag key={tag} closable onClose={() => handleClose(tag)} style={{ marginBottom: 4 }}>
            {getPresetTagLabel(tag)}
          </Tag>
        ))}
        {inputVisible && (
          <Input
            type="text"
            size="small"
            style={{ width: 78, marginLeft: 8, verticalAlign: 'top' }}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onBlur={handleInputConfirm}
            onPressEnter={handleInputConfirm}
            autoFocus
          />
        )}
        {!inputVisible && (
          <Tag
            onClick={showInput}
            style={{
              background: '#fff',
              borderStyle: 'dashed',
              cursor: 'pointer',
              marginLeft: 8,
            }}
          >
            {getTranslation('addTag', '+ Add Tag')}
          </Tag>
        )}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>{getTranslation('presetTags', 'Preset Tags')}:</strong>
      </div>
      <div>
        {presetTags.map(presetTag => (
          <Tag
            key={presetTag}
            onClick={() => handlePresetTagClick(presetTag)}
            style={{
              cursor: 'pointer',
              marginBottom: 4,
              opacity: tags.includes(presetTag) ? 0.5 : 1,
            }}
            color={tags.includes(presetTag) ? 'default' : 'blue'}
          >
            {getPresetTagLabel(presetTag)}
          </Tag>
        ))}
      </div>
    </div>
  );

  // 角色选择处理
  const handleCharacterSelect = character => {
    onSelectCharacter?.(character);
    setCharacterSelectVisible(false);
    console.log('选择角色:', character);
  };

  // 打开角色选择弹窗
  const handleVoiceButtonClick = () => {
    console.log('handleVoiceButtonClick', selectedCharacter);
    if (selectedCharacter) {
      // 如果已选择角色，直接禁用语音
      onSelectCharacter?.(null);
    } else {
      // 如果未选择角色，打开选择弹窗
      setCharacterSelectVisible(true);
    }
  };

  return (
    <div
      className="anki-bar-container"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'white',
        padding: '12px',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        <Tooltip title={t('anki.autoMarkTitle')}>
          <span style={{ cursor: 'pointer', marginRight: '8px' }} onClick={onToggleAutoMarkTitle}>
            {autoMarkTitleEnabled ? (
              <HighlightOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
            ) : (
              <HighlightOutlined style={{ fontSize: '16px', color: '#d9d9d9' }} />
            )}
          </span>
        </Tooltip>
        <Tooltip title={t('anki.toggleVisualizer')}>
          <span style={{ cursor: 'pointer', marginRight: '8px' }} onClick={onToggleVisualizer}>
            {visualizerVisible ? (
              <EyeOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
            ) : (
              <EyeInvisibleOutlined style={{ fontSize: '16px', color: '#d9d9d9' }} />
            )}
          </span>
        </Tooltip>

        {/* 添加图例信息图标，只在visualizer可见时显示 */}
        {visualizerVisible && (
          <Tooltip
            title={getLegendContent()}
            placement="bottomLeft"
            overlayStyle={{ maxWidth: '300px' }}
          >
            <span style={{ cursor: 'pointer', marginRight: '8px' }}>
              <InfoCircleOutlined
                style={{
                  fontSize: '16px',
                  color: '#666',
                }}
              />
            </span>
          </Tooltip>
        )}

        {/* 角色选择按钮 */}
        <Tooltip
          title={
            selectedCharacter ? `${selectedCharacter.name} (点击切换)` : t('anki.selectCharacter')
          }
        >
          <span style={{ cursor: 'pointer', marginRight: '8px' }} onClick={handleVoiceButtonClick}>
            {selectedCharacter ? (
              <span style={{ fontSize: '16px' }}>{selectedCharacter.avatar}</span>
            ) : (
              <SoundOutlined style={{ fontSize: '16px', color: '#d9d9d9' }} />
            )}
          </span>
        </Tooltip>

        {aiChatEnabled && (
          <Tooltip title={t('anki.toggleAiChat')}>
            <span style={{ cursor: 'pointer', marginRight: '8px' }} onClick={onToggleAIChat}>
              <MessageOutlined
                style={{
                  fontSize: '16px',
                  color: aiChatVisible ? '#1890ff' : '#d9d9d9',
                }}
              />
            </span>
          </Tooltip>
        )}
        <Tooltip title={tocVisible ? t('anki.closeToc') : t('anki.openToc')}>
          <span style={{ cursor: 'pointer', marginRight: '8px' }} onClick={onGenerateIndex}>
            <BookOutlined
              style={{
                fontSize: '16px',
                color: tocVisible ? '#1890ff' : '#d9d9d9',
              }}
            />
          </span>
        </Tooltip>
        <Popover
          content={tagsContent}
          title={getTranslation('manageTags', 'Manage Tags')}
          trigger="click"
          open={tagsVisible}
          onOpenChange={setTagsVisible}
          placement="bottomLeft"
        >
          <Tooltip title={getTranslation('manageTags', 'Manage Tags')}>
            <span style={{ cursor: 'pointer', marginRight: '8px' }}>
              <TagOutlined
                style={{
                  fontSize: '16px',
                  color: tags.length > 0 ? '#1890ff' : '#d9d9d9',
                }}
                spin={updating}
              />
              {tags.length > 0 && (
                <span
                  style={{
                    fontSize: '10px',
                    background: '#1890ff',
                    color: 'white',
                    borderRadius: '50%',
                    padding: '1px 4px',
                    marginLeft: '2px',
                    minWidth: '14px',
                    textAlign: 'center',
                    display: 'inline-block',
                  }}
                >
                  {tags.length}
                </span>
              )}
            </span>
          </Tooltip>
        </Popover>
        <Tooltip title="查看笔记">
          <span style={{ cursor: 'pointer', marginRight: '8px' }} onClick={() => handleOpenNotes()}>
            <FileTextOutlined
              style={{
                fontSize: '16px',
                color: notesModalVisible ? '#1890ff' : '#d9d9d9',
              }}
            />
          </span>
        </Tooltip>
      </div>
      {visualizerVisible && (
        <CardVisualizer
          cards={allCards}
          currentCardId={currentCardId}
          debugMode={debugModeForVisualizer}
          onCardClick={onCardClick}
          pagination={pagination}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div>
          <Tooltip title={t('anki.newCards')}>
            <span
              style={{
                color: 'blue',
                textDecoration: currentCardState === 0 ? 'underline' : 'none',
                marginRight: 12,
              }}
            >
              {deckStats?.newCount || 0}
            </span>
          </Tooltip>
          <Tooltip title={t('anki.dueLearning')}>
            <span
              style={{
                color: 'red',
                textDecoration: [1, 3].includes(currentCardState) ? 'underline' : 'none',
                marginRight: 12,
              }}
            >
              {deckStats?.learningCount || 0}
            </span>
          </Tooltip>
          <Tooltip title={t('anki.dueReview')}>
            <span
              style={{
                color: 'green',
                textDecoration: currentCardState === 2 ? 'underline' : 'none',
                marginRight: 12,
              }}
            >
              {deckStats?.reviewCount || 0}
            </span>
          </Tooltip>
        </div>
      </div>
      <NotesModal
        visible={notesModalVisible}
        onClose={handleCloseNotes}
        userCard={currentCard}
        title={notesModalTitle}
        onNoteDeleted={deletedNote => {
          // 当笔记删除成功后的回调
          // 在AnkiBar中，删除笔记时不需要删除note element
          // 因为这是从AnkiBar直接访问的笔记，不是从编辑器中的note element访问的
          console.log('笔记删除成功:', deletedNote);
        }}
      />

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
  );
};

export default AnkiBar;
