import { Button } from 'antd';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { marked } from 'marked';
import './markdown.css'

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

const StreamingTooltip = ({
  anchorEl,
  containerEl,
  editorContainerRef,
  placement = 'bottom',
  position: childPosition,
  prompt,
  apiEndpoint = '/chat',
  onClose,
  onInsert,
  onInsertHtml
}) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const esController = useRef(null);

  const fetchStreamData = useCallback(() => {
    try {
      // 清理之前的连接
      if (esController.current) {
        esController.current.close();
      }

      const url = new URL(apiEndpoint, window.location.href);
      url.searchParams.set('prompt', "explain the following text:" + prompt)



      // 创建新的 EventSource 连接
      esController.current = new EventSource(url);

      // 处理消息
      esController.current.onmessage = (event) => {
        const data = event.data;

        if (data === '[DONE]') {
          esController.current.close();
          setIsLoading(false);
          return;
        }

        try {
          const obj = JSON.parse(data);
          const content = obj.choices[0].delta.content;

          if (content == null) {
            esController.current.close();
            setIsLoading(false);
            return;
          }

          setContent(prev => prev + content);
        } catch (err) {
          setError('Failed to parse response data');
          esController.current.close();
          setIsLoading(false);
        }
      };

      // 处理错误
      esController.current.onerror = (error) => {
        setError('EventSource failed: ' + error.message);
        esController.current.close();
        setIsLoading(false);
      };

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  }, [prompt, apiEndpoint]);

  useEffect(() => {
    fetchStreamData();

    return () => {
      if (esController.current) {
        esController.current.close();
      }
    };
  }, [fetchStreamData]);

  // 计算位置
  const position = anchorEl ? calculatePosition(anchorEl, placement) : calculateChildPositionByContainer(containerEl, childPosition);

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
      style={{
        position: 'fixed',
        ...position,
        backgroundColor: 'white',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        minWidth: "400px"
      }}
    >
      <div style={{
        borderRadius: '4px',
        padding: '12px 16px',
        maxWidth: '600px',
        fontSize: '18px',
        maxHeight: '400px',
        overflow: 'auto',
      }}>
        {isLoading && content === '' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="loading-spinner" />
            加载中...
          </div>
        )}

        {error && (
          <div style={{ color: 'red' }}>
            错误: {error}
          </div>
        )}

        {content && renderContent()}

        {isLoading && content && (
          <div
            style={{
              width: '8px',
              height: '16px',
              background: '#333',
              display: 'inline-block',
              animation: 'blink 1s infinite'
            }}
          />
        )}
      </div>
      <Button style={{ position: "absolute" }} onClick={() => {
        // onInsert && onInsert(content)
        onInsertHtml && onInsertHtml(getHtmlContent(content))
        onClose()
      }}>插入</Button>
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