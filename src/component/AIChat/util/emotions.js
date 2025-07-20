const defaultEmotion = 'happy';
// 角色表情映射配置（使用动态导入）
const characterEmotionMap = {
  angry: {
    imagePath: 'character/girl/生气.png',
    name: '生气',
    keywords: ['生气', '愤怒', '不满', '怒', '气', '错误', '失败'],
  },
  worried: {
    imagePath: 'character/girl/担心.png',
    name: '担心',
    keywords: ['担心', '焦虑', '忧虑', '困惑', '难过', '问题', '困难'],
  },
  tsundere: {
    imagePath: 'character/girl/傲娇.png',
    name: '傲娇',
    keywords: ['傲娇', '得意', '自豪', '炫耀', '不服'],
  },
  cold: {
    imagePath: 'character/girl/冷淡.png',
    name: '冷淡',
    keywords: ['冷淡', '平淡', '无趣', '沉默', '冷漠', '淡然'],
  },
  surprised: {
    imagePath: 'character/girl/惊讶.png',
    name: '惊讶',
    keywords: ['惊讶', '惊奇', '震惊', '意外', '没想到', '哇', '真的'],
  },
  shy: {
    imagePath: 'character/girl/害羞.png',
    name: '害羞',
    keywords: ['害羞', '羞涩', '腼腆', '可爱', '开心', '高兴', '笑'],
  },
  proud: {
    imagePath: 'character/girl/得意.png',
    name: '得意',
    keywords: ['得意', '满意', '完成', '成功', '棒', '好', '正确', '答对'],
  },
  gentle: {
    imagePath: 'character/girl/温柔.png',
    name: '温柔',
    keywords: ['温柔', '体贴', '善良', '关心', '爱护', '体贴', '照顾'],
  },
  happy: {
    imagePath: 'character/girl/开心.png',
    name: '开心',
    keywords: ['开心', '高兴', '愉快', '开心', '笑', '好', '棒', '成功'],
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

export { characterEmotionMap, defaultEmotion, analyzeEmotionFromText };
