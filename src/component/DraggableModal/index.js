import { CloseOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import './style.less';

const DraggableModal = ({
  title,
  open = false,
  onCancel,
  onOk = null,
  footer = null,
  width = 520,
  height = 'auto',
  className = '',
  children,
  minWidth = 300,
  minHeight = 200,
  maxWidth = null,
  maxHeight = null,
  resizable = true,
  ...otherProps
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({
    width: typeof width === 'number' ? width : 520,
    height:
      typeof height === 'number' ? height : typeof height === 'string' ? parseInt(height) : 400,
  });
  const [initialized, setInitialized] = useState(false);
  const modalRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  // 初始化位置（居中）和大小
  useEffect(() => {
    if (open && modalRef.current && !initialized) {
      // 使用 requestAnimationFrame 确保 DOM 完全渲染
      requestAnimationFrame(() => {
        if (modalRef.current) {
          const modal = modalRef.current;

          // 设置初始大小
          const initialWidth = typeof width === 'number' ? width : 520;
          const initialHeight =
            typeof height === 'number'
              ? height
              : typeof height === 'string'
                ? parseInt(height)
                : 400;

          setSize({ width: initialWidth, height: initialHeight });

          // 计算居中位置
          const centerX = (window.innerWidth - initialWidth) / 2;
          const centerY = (window.innerHeight - initialHeight) / 2;

          setPosition({
            x: Math.max(50, centerX),
            y: Math.max(50, centerY),
          });
          setInitialized(true);
        }
      });
    }

    // 当Modal关闭时重置初始化状态
    if (!open) {
      setInitialized(false);
      setSize({
        width: typeof width === 'number' ? width : 520,
        height:
          typeof height === 'number' ? height : typeof height === 'string' ? parseInt(height) : 400,
      });
    }
  }, [open, initialized, width, height]);

  // ESC键关闭功能
  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && open && onCancel) {
        e.preventDefault();
        onCancel();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onCancel]);

  // 调整大小开始
  const handleResizeStart = (e, direction) => {
    e.stopPropagation();
    e.preventDefault();

    if (!resizable) return;

    setIsResizing(true);
    setResizeDirection(direction);

    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
    };

    // 调整大小中的处理函数
    const handleMouseMove = e => {
      const deltaX = e.clientX - resizeStartRef.current.x;
      const deltaY = e.clientY - resizeStartRef.current.y;

      let newWidth = resizeStartRef.current.width;
      let newHeight = resizeStartRef.current.height;
      let newX = position.x;
      let newY = position.y;

      // 根据调整方向计算新的大小和位置
      if (direction.includes('right')) {
        newWidth = resizeStartRef.current.width + deltaX;
      }
      if (direction.includes('left')) {
        newWidth = resizeStartRef.current.width - deltaX;
        newX = position.x + deltaX;
      }
      if (direction.includes('bottom')) {
        newHeight = resizeStartRef.current.height + deltaY;
      }
      if (direction.includes('top')) {
        newHeight = resizeStartRef.current.height - deltaY;
        newY = position.y + deltaY;
      }

      // 应用最小和最大尺寸限制
      newWidth = Math.max(minWidth, Math.min(maxWidth || window.innerWidth, newWidth));
      newHeight = Math.max(minHeight, Math.min(maxHeight || window.innerHeight, newHeight));

      // 确保不超出窗口边界
      if (newX < 0) {
        newWidth += newX;
        newX = 0;
      }
      if (newY < 0) {
        newHeight += newY;
        newY = 0;
      }
      if (newX + newWidth > window.innerWidth) {
        newWidth = window.innerWidth - newX;
      }
      if (newY + newHeight > window.innerHeight) {
        newHeight = window.innerHeight - newY;
      }

      setSize({ width: newWidth, height: newHeight });
      if (direction.includes('left') || direction.includes('top')) {
        setPosition({ x: newX, y: newY });
      }
    };

    // 调整大小结束的处理函数
    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection('');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // 拖拽开始
  const handleMouseDown = e => {
    if (
      e.target.closest('.draggable-modal-close') ||
      e.target.closest('.draggable-modal-content') ||
      e.target.closest('.resize-handle')
    ) {
      return; // 如果点击关闭按钮、内容区域或调整大小控制点，不启动拖拽
    }

    setIsDragging(true);
    const startX = e.clientX - position.x;
    const startY = e.clientY - position.y;

    dragStartRef.current = { x: startX, y: startY };

    // 拖拽中的处理函数
    const handleMouseMove = e => {
      const newX = e.clientX - startX;
      const newY = e.clientY - startY;

      // 限制在窗口边界内
      const maxX = window.innerWidth - size.width;
      const maxY = window.innerHeight - size.height;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    // 拖拽结束的处理函数
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // 添加全局鼠标事件监听
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    // 防止文本选择
    e.preventDefault();
  };

  // 处理关闭
  const handleClose = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // 渲染footer
  const renderFooter = () => {
    if (footer === null) return null;

    if (footer) {
      return <div className="draggable-modal-footer">{footer}</div>;
    }

    // 默认footer - 只有在提供了onOk时才显示
    if (onOk) {
      return (
        <div className="draggable-modal-footer">
          <Button onClick={handleClose}>取消</Button>
          <Button type="primary" onClick={onOk}>
            确定
          </Button>
        </div>
      );
    }

    return null;
  };

  if (!open) return null;

  return (
    <div className="draggable-modal-wrapper">
      <div
        ref={modalRef}
        className={`draggable-modal ${className} ${isDragging ? 'dragging' : ''} ${isResizing ? 'resizing' : ''}`}
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          transform: initialized
            ? `translate(${position.x}px, ${position.y}px)`
            : 'translate(50vw, 50vh) translate(-50%, -50%)',
        }}
        {...otherProps}
      >
        {/* 标题栏 */}
        <div
          className="draggable-modal-header"
          onMouseDown={handleMouseDown}
          style={{
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          <div className="draggable-modal-title">{typeof title === 'string' ? title : title}</div>
          <Button
            type="text"
            icon={<CloseOutlined />}
            className="draggable-modal-close"
            onClick={handleClose}
            size="small"
          />
        </div>

        {/* 内容区域 */}
        <div className="draggable-modal-content">{children}</div>

        {/* 底部区域 */}
        {renderFooter()}

        {/* 调整大小控制点 */}
        {resizable && (
          <>
            {/* 角落控制点 */}
            <div
              className="resize-handle resize-handle-nw"
              onMouseDown={e => handleResizeStart(e, 'top-left')}
            />
            <div
              className="resize-handle resize-handle-ne"
              onMouseDown={e => handleResizeStart(e, 'top-right')}
            />
            <div
              className="resize-handle resize-handle-sw"
              onMouseDown={e => handleResizeStart(e, 'bottom-left')}
            />
            <div
              className="resize-handle resize-handle-se"
              onMouseDown={e => handleResizeStart(e, 'bottom-right')}
            />

            {/* 边缘控制点 */}
            <div
              className="resize-handle resize-handle-n"
              onMouseDown={e => handleResizeStart(e, 'top')}
            />
            <div
              className="resize-handle resize-handle-e"
              onMouseDown={e => handleResizeStart(e, 'right')}
            />
            <div
              className="resize-handle resize-handle-s"
              onMouseDown={e => handleResizeStart(e, 'bottom')}
            />
            <div
              className="resize-handle resize-handle-w"
              onMouseDown={e => handleResizeStart(e, 'left')}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DraggableModal;
