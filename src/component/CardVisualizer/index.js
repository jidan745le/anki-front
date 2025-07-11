import { Tooltip } from 'antd';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../common/hooks/useI18n';
import './style.less';

// 全局日志函数
const logInfo = (message, data) => {
  console.log(`[CardVisualizer] ${message}`, data);
};

const logWarning = (message, data) => {
  console.warn(`[CardVisualizer] ${message}`, data);
};

const logError = (message, data) => {
  console.error(`[CardVisualizer] ${message}`, data);
};

// Helper function to convert hex to RGB
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

// 常量定义
// MAX_VISIBLE_CARDS 常量已不再需要，后端现在计算可见卡片

const CardVisualizerComponent = ({
  cards = [],
  currentCardId,
  debugMode = false,
  onCardClick,
  pagination = null,
}) => {
  const [now, setNow] = useState(new Date());
  const lastUpdateTimeRef = useRef(0);
  const rafRef = useRef(null);
  const [clickedCardId, setClickedCardId] = useState(null); // 新增：跟踪被点击的卡片
  const [animationType, setAnimationType] = useState('ripple'); // 新增：动画类型
  const { t } = useI18n();

  // 组件初始化日志
  useEffect(() => {
    if (debugMode) {
      logInfo('组件初始化', {
        cardsCount: cards.length,
        currentTime: now.toISOString(),
        currentCardId,
        debugMode,
      });
    }
  }, [cards.length, currentCardId, debugMode, now]);

  // Use requestAnimationFrame for smoother updates but with throttling
  useEffect(() => {
    let frameId = null;

    // Update time with throttling to prevent too many re-renders
    const updateTime = () => {
      const currentTime = performance.now();
      // Only update every 1000ms (1 second) to avoid excessive re-renders
      if (currentTime - lastUpdateTimeRef.current > 1000) {
        lastUpdateTimeRef.current = currentTime;
        const newTime = new Date();
        if (debugMode) {
          logInfo('更新当前时间', {
            oldTime: now.toISOString(),
            newTime: newTime.toISOString(),
          });
        }
        setNow(newTime);
      }

      frameId = requestAnimationFrame(updateTime);
    };

    // Start animation loop
    frameId = requestAnimationFrame(updateTime);
    if (debugMode) {
      logInfo('启动记忆强度实时更新');
    }

    // Clean up
    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
        if (debugMode) {
          logInfo('停止记忆强度实时更新');
        }
      }
    };
  }, [debugMode]);

  // Function to determine the color based on card state
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

  // Format date to more readable format
  const formatDate = dateString => {
    if (!dateString) return '无日期';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '无效日期';

    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  // 在组件内添加详细的调试函数
  const debugCard = (card, opacity, extraInfo = {}) => {
    if (!debugMode) return;

    const dueDate = new Date(card.dueDate);
    const timeDiff = dueDate.getTime() - now.getTime();
    const isDue = isCardDue(card.dueDate);

    logInfo('卡片详情', {
      uuid: card.uuid,
      state: card.state,
      stateText:
        card.state === 0
          ? '新卡片'
          : card.state === 1
            ? '学习中'
            : card.state === 2
              ? '复习'
              : card.state === 3
                ? '重新学习'
                : card.state === 4
                  ? '已暂停'
                  : '未知状态',
      dueDate: card.dueDate,
      formattedDueDate: formatDate(card.dueDate),
      currentTime: now.toISOString(),
      timeDifference: timeDiff,
      timeDifferenceHuman: `${Math.floor(timeDiff / (1000 * 60 * 60 * 24))}天${Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))}小时`,
      isDue: isDue,
      calculatedOpacity: opacity,
      memoryStrength: `${Math.round(opacity * 100)}%`,
      ...extraInfo,
    });
  };

  // 修改时间比较逻辑，确保正确处理未来和过去的日期
  const isCardDue = dueDate => {
    if (!dueDate) {
      logWarning('卡片没有到期日期', { dueDate });
      return true; // 没有到期日期的卡片视为已到期
    }

    const dueTime = new Date(dueDate).getTime();
    if (isNaN(dueTime)) {
      logError('无效的到期日期格式', { dueDate });
      return true;
    }

    const currentTime = now.getTime();

    // 明确使用时间戳比较，避免Date对象比较的可能问题
    const result = dueTime <= currentTime;
    if (result && debugMode) {
      logInfo('卡片已到期', { dueDate, dueTime, currentTime, diff: dueTime - currentTime });
    }
    return result;
  };

  // 优化calculateOpacity函数，使用更清晰的时间戳比较
  const calculateOpacity = (dueDate, lastReviewDate, state) => {
    // 新增：新卡片（state 0）始终完全不透明
    if (state === 0) {
      if (debugMode)
        logInfo('计算透明度：新卡片，不应用记忆强度，设为100%', { cardState: state, opacity: 1.0 });
      return 1.0;
    }

    // 新增：暂停卡片（state 4）始终完全不透明
    if (state === 4) {
      if (debugMode) logInfo('计算透明度：暂停卡片，设为100%', { cardState: state, opacity: 1.0 });
      return 1.0;
    }

    // 安全检查
    if (!dueDate) {
      if (debugMode) logWarning('计算透明度：没有到期日期', { dueDate, opacity: 0.0 });
      return 0.0; // 如果没有到期日期，视为完全透明
    }

    const dueTime = new Date(dueDate).getTime();
    const currentTime = now.getTime(); // 'now' is from component state

    // 确保日期有效
    if (isNaN(dueTime)) {
      if (debugMode) logError('计算透明度：无效的到期日期格式', { dueDate, opacity: 0.0 });
      return 0.0; // 无效日期，视为完全透明
    }

    // 检查是否已到期
    if (dueTime <= currentTime) {
      if (debugMode) logInfo('计算透明度：卡片已到期', { dueDate, opacity: 0.0 });
      return 0.0; // 已到期卡片，视为完全透明
    }

    // 如果没有上次复习时间，或者上次复习时间无效，则视为记忆最强或根据情况处理
    if (!lastReviewDate) {
      if (debugMode)
        logWarning('计算透明度：没有上次复习日期，无法使用新公式。默认为1.0', { dueDate });
      return 1.0;
    }

    const lastReviewTime = new Date(lastReviewDate).getTime();
    if (isNaN(lastReviewTime)) {
      if (debugMode) logError('计算透明度：无效的上次复习日期格式', { lastReviewDate });
      return 1.0;
    }

    const totalInterval = dueTime - lastReviewTime;
    const remainingInterval = dueTime - currentTime;

    if (totalInterval <= 0) {
      if (debugMode) {
        logInfo('计算透明度：总间隔为0或负数（可能刚复习或新卡），设为100%', {
          dueDate,
          lastReviewDate,
          totalInterval,
        });
      }
      return 1.0;
    }

    const calculatedOpacity = remainingInterval / totalInterval;

    // Clamp opacity between 0.0 and 1.0
    const finalOpacity = Math.max(0.0, Math.min(1.0, calculatedOpacity));

    if (debugMode) {
      logInfo('计算透明度：基于上次复习时间', {
        dueDate,
        lastReviewDate,
        currentTime: now.toISOString(),
        dueTime,
        lastReviewTime,
        remainingInterval,
        totalInterval,
        calculatedOpacityBeforeClamp: calculatedOpacity,
        finalOpacity,
      });
    }

    return finalOpacity;
  };

  // 计算剩余时间的人性化格式
  const getTimeRemaining = dueDate => {
    if (!dueDate) {
      logWarning('剩余时间：没有到期日期', { dueDate });
      return '已到期';
    }

    const dueTime = new Date(dueDate).getTime();

    // 确保日期有效
    if (isNaN(dueTime)) {
      logError('剩余时间：无效的到期日期格式', { dueDate });
      return '日期无效';
    }

    const currentTime = now.getTime();

    // 检查是否已到期
    if (dueTime <= currentTime) {
      return '已到期';
    }

    const msUntilDue = dueTime - currentTime;
    const secondsUntilDue = Math.floor(msUntilDue / 1000);
    const minutesUntilDue = Math.floor(secondsUntilDue / 60);
    const hoursUntilDue = Math.floor(minutesUntilDue / 60);
    const daysUntilDue = Math.floor(hoursUntilDue / 24);

    let result = '';
    if (daysUntilDue > 0) {
      result = `${daysUntilDue}天${hoursUntilDue % 24}小时后到期`;
    } else if (hoursUntilDue > 0) {
      result = `${hoursUntilDue}小时${minutesUntilDue % 60}分钟后到期`;
    } else if (minutesUntilDue > 0) {
      result = `${minutesUntilDue}分钟后到期`;
    } else {
      result = '即将到期';
    }

    return result;
  };

  // Get index of current card
  const currentCardIndex = cards.findIndex(card => card.uuid === currentCardId);

  // 直接使用传入的cards，后端已经计算好了visibleCards
  const visibleCards = useMemo(() => {
    if (debugMode) {
      logInfo('使用后端计算的可见卡片', {
        totalCards: cards.length,
        currentCardIndex,
        visibleCount: cards.length,
      });
    }
    return cards;
  }, [cards, currentCardIndex, debugMode]);

  // 显示卡片数量信息
  const cardCountInfo = useMemo(() => {
    if (pagination && pagination.totalCards > cards.length) {
      // 如果有pagination信息且总数大于可见数，显示部分卡片信息
      return t('cardVisualizer.showPartialCards', undefined, {
        visible: cards.length,
        total: pagination.totalCards,
      });
    } else {
      // 否则显示所有卡片
      return t('cardVisualizer.showAllCards', undefined, { count: cards.length });
    }
  }, [cards.length, pagination, t]);

  // 修改点击处理函数
  const handleCardClick = card => {
    if (!onCardClick || typeof onCardClick !== 'function') return;

    // 如果点击的是当前卡片，只播放动画不切换
    if (card.uuid === currentCardId) {
      setClickedCardId(card.uuid);
      setAnimationType('pulse-effect');

      if (debugMode) {
        logInfo('点击当前卡片，播放脉冲动画', {
          uuid: card.uuid,
          animationType: 'pulse-effect',
        });
      }

      // 动画结束后清除状态
      setTimeout(() => {
        setClickedCardId(null);
      }, 500);
      return;
    }

    // 设置点击动画
    setClickedCardId(card.uuid);
    setAnimationType('ripple-effect');

    if (debugMode) {
      logInfo('卡片被点击，开始滑动动画', {
        uuid: card.uuid,
        state: card.state,
        dueDate: card.dueDate,
        animationType: 'ripple-effect',
      });
    }

    // 延迟执行卡片切换，让动画有时间播放
    setTimeout(() => {
      onCardClick(card.uuid, card);
      setClickedCardId(null); // 清除动画状态
    }, 300); // 动画持续时间的一半，让用户看到效果但不会等太久
  };

  if (!cards.length) {
    logInfo('没有卡片数据');
    return null;
  }

  if (debugMode) {
    logInfo('渲染卡片可视化组件', {
      cardsCount: cards.length,
      visibleCardsCount: visibleCards.length,
      currentTime: now.toISOString(),
      hasCurrentCard: currentCardIndex !== -1,
    });
  }

  return (
    <div className="card-visualizer-container">
      <div className="card-grid">
        {visibleCards.map((card, index) => {
          // 使用优化后的函数计算不透明度
          const calculatedAppOpacity = calculateOpacity(
            card.dueDate,
            card.lastReviewDate,
            card.state
          );
          const isDueStatus = isCardDue(card.dueDate);
          const isCurrentCard = card.uuid === currentCardId;
          const isClicked = clickedCardId === card.uuid;

          // 对可见卡片进行调试
          debugCard(card, calculatedAppOpacity, {
            index,
            isCurrentCard,
            isDue: isDueStatus,
            lastReviewDate: card.lastReviewDate,
          });

          const timeRemaining = getTimeRemaining(card.dueDate);

          // 为不同的记忆状态设置额外的样式
          let extraStyles = {};

          if (!isCurrentCard) {
            if (isDueStatus) {
              extraStyles.border = '1px solid rgba(0,0,0,0.3)';
            } else if (card.state !== 0 && calculatedAppOpacity < 0.3) {
              extraStyles.border = '1px solid rgba(0,0,0,0.2)';
            }
          }

          // 构建CSS类名
          let cardClass = `card-block ${isCurrentCard ? 'current-card' : ''} ${isDueStatus ? 'due-card' : ''}`;

          // 添加动画类名
          if (isClicked) {
            cardClass += ` ${animationType}`;
          }

          // 获取卡片在原始数组中的索引
          const originalIndex = cards.indexOf(card);

          return (
            <Tooltip
              key={card.uuid}
              title={`
${t('cardVisualizer.tooltip.status')}: ${
                card.state === 0
                  ? t('cardVisualizer.legend.newCard')
                  : card.state === 1
                    ? t('cardVisualizer.legend.learning')
                    : card.state === 2
                      ? t('cardVisualizer.legend.review')
                      : card.state === 3
                        ? t('cardVisualizer.legend.relearning')
                        : card.state === 4
                          ? t('cardVisualizer.legend.suspended')
                          : t('cardVisualizer.tooltip.unknownStatus')
              }
${t('cardVisualizer.tooltip.dueTime')}: ${formatDate(card.dueDate)}
${timeRemaining}
        ${t('cardVisualizer.tooltip.position')}: ${pagination ? `${pagination.currentIndex + 1}/${pagination.totalCards}` : `${originalIndex + 1}/${cards.length}`}
${t('cardVisualizer.tooltip.memoryStrength')}: ${Math.round(calculatedAppOpacity * 100)}%
${originalIndex === currentCardIndex ? `(${t('cardVisualizer.tooltip.currentCard')})` : ''}
${t('cardVisualizer.tooltip.clickToView')}
              `}
            >
              <div
                className={cardClass}
                style={{
                  backgroundColor: getCardColor(card.state, calculatedAppOpacity),
                  cursor: onCardClick ? 'pointer' : 'default',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  ...extraStyles,
                }}
                onClick={() => handleCardClick(card)}
              >
                {card.state === 4 && (
                  <span
                    style={{
                      fontSize: '8px',
                      color: '#fff',
                      fontWeight: 'bold',
                      textShadow: '0 0 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    ❌
                  </span>
                )}
              </div>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

const CardVisualizer = React.memo(CardVisualizerComponent);

export default CardVisualizer;
