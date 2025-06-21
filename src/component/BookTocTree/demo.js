import { Button, Drawer, message } from 'antd';
import React, { useState } from 'react';
import { processBookIndex } from '../AnkiCard';
import BookTocTree from './index';

// 模拟书籍卡片数据
const mockIndexData = [
  {
    uuid: 'chapter1-card1',
    front:
      'CHAPTER:第一章 JavaScript基础|SECTION:_变量声明_基础|BREADCRUMB:基础语法 > 变量|PROGRESS:3/5 (60%)|LEVEL:1',
  },
  {
    uuid: 'chapter1-card2',
    front:
      'CHAPTER:第一章 JavaScript基础|SECTION:**数据类型**详解|BREADCRUMB:基础语法 > 数据类型|PROGRESS:5/5 (100%)|LEVEL:1',
  },
  {
    uuid: 'chapter1-card3',
    front:
      'CHAPTER:第一章 JavaScript基础|SECTION:_函数定义_|BREADCRUMB:高级特性 > 函数|PROGRESS:2/4 (50%)|LEVEL:2',
  },
  {
    uuid: 'chapter1-card4',
    front:
      'CHAPTER:第一章 JavaScript基础|SECTION:**_闭包概念_**|BREADCRUMB:高级特性 > 函数 > 闭包|PROGRESS:1/3 (33%)|LEVEL:3',
  },
  {
    uuid: 'chapter2-card1',
    front:
      'CHAPTER:第二章 React入门|SECTION:_组件基础_|BREADCRUMB:React核心 > 组件|PROGRESS:4/4 (100%)|LEVEL:1',
  },
  {
    uuid: 'chapter2-card2',
    front:
      'CHAPTER:第二章 React入门|SECTION:State管理详解|BREADCRUMB:React核心 > 状态|PROGRESS:2/6 (33%)|LEVEL:2',
  },
  {
    uuid: 'chapter2-card3',
    front:
      'CHAPTER:第二章 React入门|SECTION:_生命周期_函数|BREADCRUMB:React核心 > 生命周期|PROGRESS:1/4 (25%)|LEVEL:2',
  },
  {
    uuid: 'chapter3-card1',
    front:
      'CHAPTER:第三章 项目实战|SECTION:项目搭建|BREADCRUMB:实战应用 > 项目构建|PROGRESS:6/6 (100%)|LEVEL:1',
  },
  {
    uuid: 'chapter3-card2',
    front:
      'CHAPTER:第三章 项目实战|SECTION:**_组件设计_**模式|BREADCRUMB:实战应用 > 组件架构|PROGRESS:3/8 (37%)|LEVEL:2',
  },
];

const BookTocTreeDemo = () => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentCard, setCurrentCard] = useState(null);

  // 处理数据生成目录结构
  const tocStructure = processBookIndex(mockIndexData);

  // 处理卡片选择
  const handleCardSelect = (uuid, nodeData) => {
    console.log('选中的卡片:', uuid, nodeData);

    // 模拟查找卡片数据
    const selectedCard = mockIndexData.find(card => card.uuid === uuid);

    if (selectedCard) {
      setCurrentCard(selectedCard);
      setDrawerVisible(false);
      message.success(`已跳转到: ${nodeData.sectionTitle || '选定卡片'}`);
    } else {
      message.warning('未找到指定卡片');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>BookTocTree 组件演示 - 纯Tree Data驱动</h1>

      <div style={{ marginBottom: '20px' }}>
        <Button type="primary" onClick={() => setDrawerVisible(true)} size="large">
          打开书籍目录
        </Button>
      </div>

      {/* 当前选中的卡片信息 */}
      {currentCard && (
        <div
          style={{
            background: '#f0f2f5',
            padding: '16px',
            borderRadius: '6px',
            marginBottom: '20px',
          }}
        >
          <h3>当前卡片</h3>
          <p>
            <strong>UUID:</strong> {currentCard.uuid}
          </p>
          <p>
            <strong>原始内容:</strong> {currentCard.front}
          </p>
        </div>
      )}

      {/* 功能特性说明 */}
      <div
        style={{
          background: '#e6f7ff',
          padding: '16px',
          borderRadius: '6px',
          border: '1px solid #91d5ff',
        }}
      >
        <h3>🎯 纯Tree Data特性</h3>
        <ul>
          <li>
            ✅ <strong>完全数据驱动:</strong> 无自定义titleRender，完全依赖tree data
          </li>
          <li>
            ✅ <strong>统一样式:</strong> 通过className和CSS控制所有样式
          </li>
          <li>
            ✅ <strong>纯文本显示:</strong> Markdown自动转换为纯文本
          </li>
          <li>
            ✅ <strong>默认Tree渲染:</strong> 使用Ant Design Tree默认渲染逻辑
          </li>
          <li>
            ✅ <strong>层级颜色:</strong> 不同层级自动应用不同颜色
          </li>
          <li>
            ✅ <strong>完成标识:</strong> 完成的卡片自动显示✅标识
          </li>
        </ul>
      </div>

      {/* 目录抽屉 */}
      <Drawer
        title="书籍目录 - 纯Tree Data驱动"
        placement="left"
        width={450}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        bodyStyle={{ padding: 0 }}
      >
        <BookTocTree tocStructure={tocStructure} onCardSelect={handleCardSelect} />
      </Drawer>
    </div>
  );
};

export default BookTocTreeDemo;
