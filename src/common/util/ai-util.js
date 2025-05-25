export const generateSimplifiedPromptDisplay = promptConfig => {
  const { chatcontext, contextContent, chattype, selectionText, question } = promptConfig;

  // 简化上下文展示
  let contextDisplay = '';
  if (contextContent) {
    switch (chatcontext) {
      case 'Deck':
        contextDisplay = '基于该牌组，';
        break;
      case 'Card':
        contextDisplay = '基于该卡片，';
        break;
      default:
        contextDisplay = '';
        break;
    }
  }

  // 简化选中内容展示
  const selectionDisplay = selectionText ? `关于"${selectionText}"，` : '';

  // 简化交互类型展示
  let typeDisplay = '';
  switch (chattype) {
    case 'Explain':
      typeDisplay = '解释';
      break;
    case 'Ask':
      typeDisplay = '回答';
      break;
    case 'Generic':
      typeDisplay = '回答';
      break;
  }

  // 简化问题展示
  const questionDisplay = question ? `"${question}"` : '';

  // 组合最终的简洁展示
  let simplifiedDisplay = `${contextDisplay}${selectionDisplay}${typeDisplay}${
    questionDisplay ? ` ${questionDisplay}` : ''
  }`;

  // 确保首字母大写，结尾添加适当标点
  simplifiedDisplay = simplifiedDisplay.charAt(0).toUpperCase() + simplifiedDisplay.slice(1);
  if (
    !simplifiedDisplay.endsWith('.') &&
    !simplifiedDisplay.endsWith('?') &&
    !simplifiedDisplay.endsWith('!')
  ) {
    simplifiedDisplay += '.';
  }

  return simplifiedDisplay;
};
