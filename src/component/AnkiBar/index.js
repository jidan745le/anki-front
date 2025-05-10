import {
  EyeInvisibleOutlined,
  EyeOutlined,
  HighlightOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import React from 'react';
import CardVisualizer from '../CardVisualizer';
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
}) => {
  return (
    <div
      className="anki-bar-container"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        background: 'white',
        padding: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ cursor: 'pointer', marginRight: '8px' }} onClick={onToggleAutoMarkTitle}>
          {autoMarkTitleEnabled ? (
            <HighlightOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
          ) : (
            <HighlightOutlined style={{ fontSize: '16px', color: '#d9d9d9' }} />
          )}
        </span>
        <span style={{ cursor: 'pointer', marginRight: '8px' }} onClick={onToggleVisualizer}>
          {visualizerVisible ? (
            <EyeOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
          ) : (
            <EyeInvisibleOutlined style={{ fontSize: '16px', color: '#d9d9d9' }} />
          )}
        </span>

        {aiChatEnabled && (
          <span style={{ cursor: 'pointer', marginRight: '8px' }} onClick={onToggleAIChat}>
            <MessageOutlined
              style={{
                fontSize: '16px',
                color: aiChatVisible ? '#1890ff' : '#d9d9d9',
              }}
            />
          </span>
        )}
      </div>
      {visualizerVisible && (
        <CardVisualizer
          cards={allCards}
          currentCardId={currentCardId}
          debugMode={debugModeForVisualizer}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div>
          <Tooltip title="New">
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
          <Tooltip title="Due Learning">
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
          <Tooltip title="Due Review">
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
    </div>
  );
};

export default AnkiBar;
