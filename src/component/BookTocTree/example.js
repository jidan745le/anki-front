import React from 'react';
import { processBookIndex } from '../AnkiCard';
import BookTocTree from './index';

// 使用示例数据
const exampleIndexData = [
  {
    uuid: 'card-1',
    front: 'CHAPTER:第一章|SECTION:第一节|BREADCRUMB:导言 > 基础概念|PROGRESS:2/5 (40%)|LEVEL:1',
  },
  {
    uuid: 'card-2',
    front: 'CHAPTER:第一章|SECTION:第二节|BREADCRUMB:导言 > 基础概念|PROGRESS:5/5 (100%)|LEVEL:1',
  },
  {
    uuid: 'card-3',
    front: 'CHAPTER:第一章|SECTION:第三节|BREADCRUMB:导言 > 高级概念|PROGRESS:1/3 (33%)|LEVEL:2',
  },
  {
    uuid: 'card-4',
    front: 'CHAPTER:第二章|SECTION:第一节|BREADCRUMB:实践 > 基础练习|PROGRESS:3/3 (100%)|LEVEL:1',
  },
  {
    uuid: 'card-5',
    front: 'CHAPTER:第二章|SECTION:第二节|BREADCRUMB:实践 > 高级练习|PROGRESS:1/4 (25%)|LEVEL:3',
  },
];

const BookTocTreeExample = () => {
  // 使用现有的processBookIndex函数处理数据
  const tocStructure = processBookIndex(exampleIndexData);

  const handleCardSelect = (uuid, nodeData) => {
    console.log('Selected card:', uuid, nodeData);
    // 这里可以处理卡片选择逻辑，比如跳转到特定卡片
  };

  return (
    <div style={{ height: '600px', border: '1px solid #ddd' }}>
      <BookTocTree tocStructure={tocStructure} onCardSelect={handleCardSelect} />
    </div>
  );
};

export default BookTocTreeExample;
