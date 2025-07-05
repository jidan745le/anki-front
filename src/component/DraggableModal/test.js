import { Button } from 'antd';
import React, { useState } from 'react';
import DraggableModal from './index';

const DraggableModalTest = () => {
  const [visible, setVisible] = useState(false);

  const showModal = () => {
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <Button type="primary" onClick={showModal}>
        打开测试Modal
      </Button>

      <DraggableModal
        title="测试拖拽Modal"
        open={visible}
        onCancel={handleClose}
        width={500}
        height="400px"
        resizable={true}
        minWidth={300}
        minHeight={200}
        maxWidth={800}
        maxHeight={600}
      >
        <div>
          <p>这是一个测试的可拖拽和调整大小的Modal组件。</p>
          <p>你可以通过拖拽标题栏来移动这个Modal。</p>
          <p>背景没有遮罩，你可以与后面的内容互动。</p>
          <h4>功能特性：</h4>
          <ul>
            <li>标题栏可以拖拽移动</li>
            <li>边缘和角落可以调整大小</li>
            <li>支持ESC键快捷关闭</li>
            <li>内容区域不能拖拽</li>
            <li>没有背景遮罩</li>
            <li>自动居中显示</li>
            <li>支持最小/最大尺寸限制</li>
            <li>调整大小时有虚线边框提示</li>
          </ul>
          <h4>使用说明：</h4>
          <ul>
            <li>拖拽标题栏移动窗口</li>
            <li>将鼠标悬停在边缘或角落调整大小</li>
            <li>按ESC键快速关闭窗口</li>
            <li>点击右上角X按钮关闭窗口</li>
            <li>最小尺寸：300x200</li>
            <li>最大尺寸：800x600</li>
          </ul>
        </div>
      </DraggableModal>
    </div>
  );
};

export default DraggableModalTest;
