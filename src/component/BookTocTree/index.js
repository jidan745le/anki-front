import { Tree } from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../common/hooks/useI18n';
import './style.less';

/**
 * 处理Markdown斜体格式为纯文本
 */
function processMarkdownToText(text) {
  if (!text) return '';
  // 移除markdown标记，只保留纯文本
  return text
    .replace(/\*\*_([^_]+)_\*\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/\*\*/g, '');
}

/**
 * 从树数据中查找包含指定UUID的节点key
 */
function findNodeKeyByUuid(treeData, targetUuid) {
  const searchInNode = node => {
    // 如果当前节点是目标卡片
    if (node.uuid === targetUuid) {
      return node.key;
    }

    // 递归搜索子节点
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const result = searchInNode(child);
        if (result) {
          return result;
        }
      }
    }

    return null;
  };

  for (const node of treeData) {
    const result = searchInNode(node);
    if (result) {
      return result;
    }
  }

  return null;
}

/**
 * 获取节点的所有父节点keys（用于展开）
 */
function getParentKeys(treeData, targetKey) {
  const parentKeys = new Set();

  const searchInNode = (node, parents = []) => {
    if (node.key === targetKey) {
      parents.forEach(parentKey => parentKeys.add(parentKey));
      return true;
    }

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        if (searchInNode(child, [...parents, node.key])) {
          return true;
        }
      }
    }

    return false;
  };

  for (const node of treeData) {
    if (searchInNode(node)) {
      break;
    }
  }

  return Array.from(parentKeys);
}

const BookTocTree = ({ tocStructure, onCardSelect, currentCardUuid }) => {
  const { t } = useI18n();
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState([]);

  /**
   * 将层级结构转换为Tree组件数据格式
   */
  const convertToTreeData = tocStructure => {
    const convertSection = (section, parentKey = '') => {
      const sectionKey = `${parentKey}-section-${section.title}`;
      const sectionTitle = processMarkdownToText(section.title);

      const sectionNode = {
        title: sectionTitle,
        key: sectionKey,
        children: [],
        className: 'toc-section-node',
      };

      // 添加section的直接cards
      if (section.items && section.items.length > 0) {
        // 按进度分组
        const completedItems = section.items.filter(
          card => card.progress?.current === card.progress?.total
        );
        const incompleteItems = section.items.filter(
          card => card.progress?.current !== card.progress?.total
        );

        // 添加未完成的卡片
        incompleteItems.forEach((card, index) => {
          const cardKey = `${sectionKey}-card-${card.uuid || index}`;
          const sectionText = card.sectionTitle ? processMarkdownToText(card.sectionTitle) : '';
          const progressText = `${card.progress?.current || 1}/${card.progress?.total || 1}`;
          const cardTitle = sectionText ? `${sectionText} (${progressText})` : progressText;

          sectionNode.children.push({
            title: cardTitle,
            key: cardKey,
            className: `toc-card-node level-${card.level}`,
            isLeaf: true,
            uuid: card.uuid,
            nodeType: 'card',
            level: card.level,
            progress: card.progress,
            sectionTitle: card.sectionTitle,
          });
        });

        // 添加完成的卡片（合并显示）
        if (completedItems.length > 0) {
          const firstCompleted = completedItems[0];
          const cardKey = `${sectionKey}-completed-${firstCompleted.uuid}`;
          const cleanTitle = firstCompleted.sectionTitle
            ? processMarkdownToText(firstCompleted.sectionTitle)
            : '';
          const completedTitle = `${cleanTitle} ✅ ${t('anki.toc.completed')}`;

          sectionNode.children.push({
            title: completedTitle,
            key: cardKey,
            className: `toc-card-node level-${firstCompleted.level} completed`,
            isLeaf: true,
            uuid: firstCompleted.uuid,
            nodeType: 'card',
            level: firstCompleted.level,
            progress: firstCompleted.progress,
            sectionTitle: firstCompleted.sectionTitle,
          });
        }
      }

      // 递归处理子sections
      if (section.sections && section.sections.size > 0) {
        const subsectionsArray = Array.from(section.sections.values());
        subsectionsArray.sort((a, b) => {
          const aFirstCard = a.items && a.items.length > 0 ? a.items[0] : null;
          const bFirstCard = b.items && b.items.length > 0 ? b.items[0] : null;
          if (aFirstCard && bFirstCard) {
            return aFirstCard.originalIndex - bFirstCard.originalIndex;
          }
          return 0;
        });

        subsectionsArray.forEach(subsection => {
          sectionNode.children.push(convertSection(subsection, sectionKey));
        });
      }

      return sectionNode;
    };

    return tocStructure.map((chapter, chapterIndex) => {
      const chapterKey = `chapter-${chapterIndex}`;
      const chapterTitle = chapter.title.replace(/^\d+-/, '').replace('.md', '');

      const chapterNode = {
        title: chapterTitle,
        key: chapterKey,
        children: [],
        className: 'toc-chapter-node',
        nodeType: 'chapter',
      };

      // 添加章节直接的卡片
      if (chapter.directCards && chapter.directCards.length > 0) {
        chapter.directCards.sort((a, b) => a.originalIndex - b.originalIndex);
        chapter.directCards.forEach((card, cardIndex) => {
          const cardKey = `${chapterKey}-direct-card-${cardIndex}`;
          const progressText = `${card.progress?.current || 1}/${card.progress?.total || 1} (${card.progress?.percentage || 100}%)`;

          chapterNode.children.push({
            title: progressText,
            key: cardKey,
            className: `toc-card-node level-${card.level}`,
            isLeaf: true,
            uuid: card.uuid,
            nodeType: 'card',
            level: card.level,
            progress: card.progress,
          });
        });
      }

      // 添加章节的sections
      if (chapter.sections && chapter.sections.size > 0) {
        const sectionsArray = Array.from(chapter.sections.values());
        sectionsArray.sort((a, b) => {
          const aFirstCard = a.items && a.items.length > 0 ? a.items[0] : null;
          const bFirstCard = b.items && b.items.length > 0 ? b.items[0] : null;
          if (aFirstCard && bFirstCard) {
            return aFirstCard.originalIndex - bFirstCard.originalIndex;
          }
          return 0;
        });

        sectionsArray.forEach(section => {
          chapterNode.children.push(convertSection(section, chapterKey));
        });
      }

      return chapterNode;
    });
  };

  // 使用useMemo优化treeData，避免每次重新计算
  const treeData = useMemo(() => {
    return convertToTreeData(tocStructure);
  }, [tocStructure, t]);

  console.log(treeData, 'treeData');

  // 当当前卡片UUID变化时，同步选中状态
  useEffect(() => {
    if (currentCardUuid && treeData.length > 0) {
      console.log('同步选中状态 - 当前卡片UUID:', currentCardUuid);
      const nodeKey = findNodeKeyByUuid(treeData, currentCardUuid);
      console.log('找到对应节点key:', nodeKey);

      if (nodeKey) {
        // 检查是否需要更新选中状态
        if (selectedKeys.length !== 1 || selectedKeys[0] !== nodeKey) {
          console.log('更新选中状态到:', nodeKey);
          setSelectedKeys([nodeKey]);

          // 获取并展开父节点
          const parentKeys = getParentKeys(treeData, nodeKey);
          console.log('需要展开的父节点keys:', parentKeys);
          setExpandedKeys(prevExpanded => {
            const newExpanded = new Set([...prevExpanded, ...parentKeys]);
            return Array.from(newExpanded);
          });
        }
      }
    } else if (selectedKeys.length > 0) {
      setSelectedKeys([]);
    }
  }, [currentCardUuid, treeData]);

  const handleSelect = (selectedKeys, info) => {
    const { node } = info;

    console.log('Tree选择事件触发:', {
      selectedKeys,
      nodeUuid: node.uuid,
      nodeType: node.nodeType,
      currentCardUuid,
    });

    // 只处理卡片节点的选择
    if (node.nodeType === 'card' && node.uuid && onCardSelect) {
      // 如果点击的是当前已选中的卡片，不需要处理
      if (node.uuid === currentCardUuid) {
        console.log('点击的是当前卡片，无需处理');
        return;
      }

      console.log('用户点击树节点，触发卡片切换:', node.uuid);
      onCardSelect(node.uuid, node);
    }
  };

  const handleExpand = expandedKeys => {
    setExpandedKeys(expandedKeys);
  };

  return (
    <div className="book-toc-tree">
      <Tree
        treeData={treeData}
        selectedKeys={selectedKeys}
        expandedKeys={expandedKeys}
        onExpand={handleExpand}
        showLine={true}
        onSelect={handleSelect}
        selectable={true}
      />
    </div>
  );
};

export default BookTocTree;
