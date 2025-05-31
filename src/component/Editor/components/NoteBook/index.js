import { Input } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

// 右侧笔记面板组件
const NotePanel = ({ noteData, onUpdateNote, onClose, isVisible }) => {
  const [noteContent, setNoteContent] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => {
    if (noteData) {
      setNoteContent(noteData.noteContent || '');
    }
  }, [noteData]);

  useEffect(() => {
    if (isVisible && textareaRef.current) {
      // 延迟聚焦，等待动画完成
      setTimeout(() => {
        textareaRef.current.focus();
      }, 300);
    }
  }, [isVisible]);

  // 监听 ESC 键关闭面板
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isVisible, onClose]);

  const handleSave = () => {
    if (onUpdateNote && noteData) {
      onUpdateNote(noteData.noteId, noteContent.trim());
    }
  };

  return (
    <>
      {/* 侧滑面板 */}
      <div
        style={{
          width: '20%',
          background: 'white',
          boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1000,
          position: 'relative',
        }}
      >
        {/* 收起/关闭按钮 */}
        <div
          style={{
            position: 'absolute',
            left: '-12px',
            top: '20px',
            width: '24px',
            height: '24px',
            background: 'white',
            borderRadius: '50%',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 1001,
          }}
          onClick={onClose}
          title="关闭笔记面板"
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="8"
              height="12"
              viewBox="0 0 8 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1.5 1L6.5 6L1.5 11"
                stroke="#666"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
          }}
        >
          {noteData && (
            <>
              <div style={{ marginBottom: '20px' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    background: noteData.noteColor ? `${noteData.noteColor}15` : '#f5f5f5',
                    borderLeft: `3px solid ${noteData.noteColor || '#667eea'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#333',
                    lineHeight: '1.6',
                  }}
                >
                  {noteData.selectedText || 'selected text'}
                </div>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '8px' }}>
                  Note Content
                </div>
                <Input.TextArea
                  ref={textareaRef}
                  value={noteContent}
                  onChange={e => {
                    setNoteContent(e.target.value);
                    onUpdateNote(noteData.noteId, e.target.value);
                  }}
                  placeholder="Enter your note here..."
                  style={{
                    flex: 1,
                    width: '100%',
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                    resize: 'none',
                    outline: 'none',
                    fontSize: '14px',
                    lineHeight: '1.8',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#e8e8e8';
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default NotePanel;
