const defaultEmotion = 'happy';

// Live2D表情映射配置
const characterEmotionMap = {
  angry: {
    expressionName: 'angry',
    expressionFile: 'Angry.exp3.json',
    name: '愤怒',
    keywords: ['生气', '愤怒', '不满', '怒', '气', '错误', '失败', '讨厌'],
  },
  sad: {
    expressionName: 'sad',
    expressionFile: 'Cry.exp3.json',
    name: '伤心',
    keywords: ['伤心', '难过', '哭', '悲伤', '失望', '痛苦'],
  },
  upset: {
    expressionName: 'upset',
    expressionFile: 'Upset.exp3.json',
    name: '沮丧',
    keywords: ['沮丧', '郁闷', '烦躁', '烦恼', '不爽', '糟糕'],
  },
  neutral: {
    expressionName: 'neutral',
    expressionFile: 'HideWing.exp3.json',
    name: '中性',
    keywords: ['平静', '正常', '一般', '普通', '冷静'],
  },
  surprised: {
    expressionName: 'surprised',
    expressionFile: 'Surprised.exp3.json',
    name: '惊讶',
    keywords: ['惊讶', '惊奇', '震惊', '意外', '没想到', '哇', '真的', '竟然'],
  },
  embarrassed: {
    expressionName: 'embarrassed',
    expressionFile: 'Shame.exp3.json',
    name: '尴尬',
    keywords: ['尴尬', '害羞', '羞涩', '腼腆', '不好意思', '羞耻'],
  },
  happy: {
    expressionName: 'happy',
    expressionFile: 'Heart.exp3.json',
    name: '开心',
    keywords: ['开心', '高兴', '愉快', '快乐', '兴奋', '好', '棒', '成功', '赞', '爱'],
  },
  sparkle: {
    expressionName: 'sparkle',
    expressionFile: 'Twinkle.exp3.json',
    name: '闪闪发光',
    keywords: ['闪闪发光', '闪亮', '光芒', '美丽', '漂亮', '完美', '精彩', '厉害'],
  },
  panic: {
    expressionName: 'panic',
    expressionFile: 'Panic.exp3.json',
    name: '恐慌',
    keywords: ['恐慌', '惊慌', '害怕', '紧张', '焦虑', '担心', '忧虑', '困惑', '问题', '困难'],
  },
  sick: {
    expressionName: 'sick',
    expressionFile: 'Sick.exp3.json',
    name: '生病',
    keywords: ['生病', '不舒服', '难受', '疲倦', '累', '虚弱'],
  },
  pale: {
    expressionName: 'pale',
    expressionFile: 'Pale.exp3.json',
    name: '苍白',
    keywords: ['苍白', '无力', '虚弱', '疲惫', '无聊', '无趣'],
  },
  hideear: {
    expressionName: 'hideear',
    expressionFile: 'HideEar.exp3.json',
    name: '隐藏耳朵',
    keywords: ['隐藏', '躲避', '回避', '不想听', '捂耳朵'],
  },
};

// 根据文本内容分析情感并返回对应的表情配置
const analyzeEmotionFromText = text => {
  if (!text) return characterEmotionMap[defaultEmotion];

  const lowerText = text.toLowerCase();

  // 遍历表情映射，检查关键词匹配
  for (const [emotion, config] of Object.entries(characterEmotionMap)) {
    if (config.keywords.some(keyword => lowerText.includes(keyword))) {
      return config;
    }
  }

  // 如果没有匹配到特定情感，返回默认表情
  return characterEmotionMap[defaultEmotion];
};

export { analyzeEmotionFromText, characterEmotionMap, defaultEmotion };
