import { Button, Input, Card, Space, Dropdown, Menu } from 'antd';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MessageOutlined, LikeOutlined, DislikeOutlined, QuestionCircleOutlined, DownOutlined } from '@ant-design/icons';
import apiClient from '../../common/http/apiClient';
import ReactDOM from 'react-dom';
import { marked } from 'marked';
import './markdown.css'
import './style.less'


// 位置计算工具函数
const calculatePosition = (anchorEl, placement = 'bottom') => {
  if (!anchorEl) return { top: 0, left: 0 };

  const rect = anchorEl.getBoundingClientRect();
  console.log(rect, "rect")
  const positions = {
    top: {
      top: rect.top - 8,
      left: rect.left + rect.width / 2,
      transform: 'translate(-50%, -100%)'
    },
    bottom: {
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
      transform: 'translate(-50%, 0)'
    },
    left: {
      top: rect.top + rect.height / 2,
      left: rect.left - 8,
      transform: 'translate(-100%, -50%)'
    },
    right: {
      top: rect.top + rect.height / 2,
      left: rect.right + 8,
      transform: 'translate(0, -50%)'
    }
  };

  return positions[placement] || positions.bottom;
};

const calculateChildPositionByContainer = (containerEl, childRelativePosition) => {
  if (!containerEl) return { top: 0, left: 0 };
  const newChildRelativePosition = {};
  const rect = containerEl.getBoundingClientRect();
  const parsePx = (value) => parseFloat(value.replace('px', ''));

  Object.keys(childRelativePosition).forEach(key => {
    if (["top", "left"].includes(key)) {
      newChildRelativePosition[key] = rect[key] + parsePx(childRelativePosition[key]);
    } else {
      if (key === "bottom") {
        newChildRelativePosition[key] = rect[key] - rect.height + parsePx(childRelativePosition[key]);
      }

      if (key === "right") {
        newChildRelativePosition[key] = rect[key] - rect.width + parsePx(childRelativePosition[key]);

      }
    }

  })
  console.log(newChildRelativePosition, childRelativePosition, rect, "newChildRelativePosition")
  return newChildRelativePosition;
}


const generatePrompt = (promptData) => {
  const { localContextHtml, selectionText, isAskMode, question, isGlobalExplain } = promptData;
  if (isAskMode) {
    return "please answer the question: \"" + question + "\" based on the selectionText below：\nselectionText:" + selectionText + "\n which is in the html structure context:" + localContextHtml;
  } else {
    if (isGlobalExplain) {
      return "please explain selected text '" + selectionText + "' according to context:" + localContextHtml;
    } else {
      return "please explain selected part below：html structure context:" + localContextHtml + "selectionText:" + selectionText;
    }
  }
}

const StreamingTooltip = ({
  // anchorEl,
  containerEl,
  // editorContainerRef,
  placement = 'bottom',
  position: childPosition,
  promptData,
  onClose,
  // onInsert,
  onInsertHtml,
  showAIChatSidebar,
  cardId
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const chatMessageRef = useRef(null);
  const [chatId, setChatId] = useState(null);
  const [isAskMode, setIsAskMode] = useState(!!promptData.isAskMode)
  console.log(promptData, "isAskMode")

  const fetchData = useCallback(async (content, isChat, isAskMode, isGlobalExplain) => {
    try {
      setIsLoading(true);
      setError(null);
      const requestData = {
        content,
        model: 'deepseek-chat'
      }

      if (isChat) {
        //进入侧边栏问答
        if (isAskMode) {
          requestData.cardId = cardId
        } else {
          requestData.chatId = chatId
        }
      } else {
        requestData.cardId = cardId
      }

      if (isGlobalExplain) {
        requestData.mode = "global"
      }

      const response = await apiClient.post('/aichat/message', requestData);
      console.log(response, "response")

      if (response.data.success) {
        const { aiMessage: { content, chat: { uuid } } } = response.data.data;
        if (!isChat) {
          setContent(content);
          setShowActionMenu(true);
          setChatId(uuid)
        }
        return response.data?.data;
      } else {
        setError(response.data.message || 'Request failed');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [promptData, cardId, chatId]);

  useEffect(() => {
    console.log(promptData, isAskMode, "promptData")
    if (!isAskMode) {
      //explain mode
      if (promptData.isGlobalExplain) {
        //global explain mode
        fetchData(generatePrompt(promptData), false, false, true);
      } else {
        //local explain mode
        fetchData(generatePrompt(promptData), false, false, false);

      }
    }
  }, []);

  // 计算位置
  const position = calculateChildPositionByContainer(containerEl, childPosition);

  // 点击外部关闭
  const tooltipRef = useRef(null);

  useEffect(() => {
    console.log(tooltipRef.current, "tooltipRef.current")
    const handleClickOutside = (event) => {
      if (tooltipRef.current &&
        !tooltipRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // 将 Markdown 转换为安全的 HTML
  const getHtmlContent = useCallback((markdownContent) => {
    const rawHtml = marked(markdownContent);
    return rawHtml;
  }, []);

  // 修改内容渲染部分
  const renderContent = () => {
    if (!content) return null;

    const htmlContent = getHtmlContent(content);
    return (
      <div
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  };

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className="streaming-tooltip-container"
      style={{
        position: 'fixed',
        ...position,

        zIndex: 1000,
        // minWidth: "400px"
      }}
    >
      <div style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
        {!isAskMode && <div className="streaming-tooltip-content">
          {isLoading && content === '' && (
            <div className="streaming-tooltip-loading">
              <div className="loading-spinner" />
              加载中...
            </div>
          )}

          {error && (
            <div className="streaming-tooltip-error">
              错误: {error}
            </div>
          )}

          {content && renderContent()}

          {isLoading && content && (
            <span className="streaming-tooltip-cursor" />
          )}
        </div>}

        {(showActionMenu || isAskMode) && <div className="streaming-tooltip-footer">
          <div style={{ flex: 1, display: "flex", position: 'relative' }}>
            <Input
              onChange={(e) => {
                chatMessageRef.current = e.target.value;
              }}
              placeholder="Ask AI anything..."
              style={{ flex: 1 }}
            />
            <Button onClick={async () => {
              const latestChatData = await fetchData(generatePrompt({ ...promptData, isAskMode, question: chatMessageRef.current }), true, isAskMode)
              //to do 出现一个聊天侧边栏
              onClose()
              showAIChatSidebar(latestChatData);
            }} style={{ width: "40px" }} type="text" icon={<MessageOutlined />} />
          </div>
        </div>}
      </div>
      {showActionMenu && !isAskMode && <div style={{ width: "40%", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", marginTop: "2px" }}>
        <Menu style={{ width: "100%" }}>
          <Menu.Item key="1" onClick={() => {
            onInsertHtml && onInsertHtml(getHtmlContent(content));
            onClose();
          }}>
            Insert below
          </Menu.Item>
          <Menu.Item key="2">Try again</Menu.Item>
          <Menu.Item key="3" onClick={onClose}>
            Close
          </Menu.Item>
        </Menu>
      </div>}

    </div>
  );

  return ReactDOM.createPortal(tooltipContent, document.body);
};

// 使用示例


const styles = `
  @keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0; }
    100% { opacity: 1; }
  }

  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #333;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

export default StreamingTooltip