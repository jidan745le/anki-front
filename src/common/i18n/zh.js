export const zh = {
  // 通用
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    loading: '加载中...',
    success: '操作成功',
    error: '操作失败',
    warning: '警告',
    info: '提示',
  },

  // 导航栏
  nav: {
    brand: 'MyANKI 记忆卡片',
    myDecks: '我的卡组',
    sharedDecks: '共享卡组',
    i18nDemo: '国际化演示',
    search: '搜索',
    login: '登录',
    signup: '注册',
    logout: '退出',
    profile: '个人资料',
    account: '账户',
    accountInfo: '账户信息',
    selectLanguage: '选择语言',
  },

  // 用户信息
  user: {
    username: '用户名',
    email: '邮箱',
    memberSince: '注册时间',
    totalDecks: '卡组总数',
    totalCards: '卡片总数',
    studiedToday: '今日学习',
    accountInfo: '账户信息',
  },

  // 卡组页面
  decks: {
    title: '我的卡组',
    addDeck: '创建新卡组',
    uploadFile: '上传文件创建',
    createManually: '手动创建',
    allDecks: '全部卡组',
    myCreated: '我创建的',
    share: '分享',
    delete: '删除',

    // 文件上传
    uploadTips: '点击或拖拽文件到此区域上传',
    supportedFormats: '支持格式',
    txtFormat: 'TXT文本文件 - 简单问答格式',
    apkgFormat: 'APKG文件 - Anki卡组文件',
    epubFormat: 'EPUB电子书 - 自动生成阅读卡片',

    // APKG处理
    apkgProcessing: 'APKG文件处理',
    selectTemplates: '选择要导入的模板',
    templatePreview: '模板预览',
    cardCount: '卡片数量',
    importSelected: '导入选中的模板',

    // 表格列名
    deckName: '卡组名称',
    cardCountColumn: '卡片数',
    status: '状态',
    createdAt: '创建时间',
    actions: '操作',
    nameColumn: '名称',
    descriptionColumn: '描述',
    statisticsColumn: '统计',
    actionColumn: '操作',

    // 状态
    processing: '处理中',
    completed: '已完成',
    failed: '失败',

    // 操作
    study: '开始学习',
    viewCards: '查看卡片',
    configure: '配置',
    shareAction: '分享',
    duplicateAction: '复制',
    deleteAction: '删除',
    add: '添加',
    update: '更新',
    embedding: '向量化',
    actionsButton: '操作',

    // 状态提示
    shared: '已分享',
    embeddingTag: '向量化',
    failedStatus: '失败',
    newCards: '新卡片',
    dueLearning: '学习中',
    dueReview: '复习',

    // 提示信息
    deleteConfirm: '确定要删除这个卡组吗？',
    deleteSuccess: '卡组删除成功',
    createSuccess: '卡组创建成功',

    // 表单
    deckNameLabel: '卡组名称',
    deckNamePlaceholder: '请输入卡组名称',
    descriptionLabel: '描述',
    descriptionPlaceholder: '请输入卡组描述（可选）',
    typeLabel: '类型',
    submit: '提交',

    // 标签页
    allTab: '全部',
    createdTab: '已创建',
    duplicatedTab: '已复制',
    totalItems: '总共 {total} 项',
    connected: '已连接',
    disconnected: '已断开',
    addDeckButton: '添加 Deck',
    addDeckTitle: '添加 Deck',
    parsingApkg: '正在解析APKG文件...',
    removeFile: '移除',
    supportedFileTypes: '支持的文件类型：',
    txtFileDesc: 'TXT文件：文本内容，支持自定义分隔符',
    apkgFileDesc: 'APKG文件：Anki卡包文件，支持模板选择和编辑',
    epubFileDesc: 'EPUB文件：电子书文件，自动分章节处理',
    dragUploadText: '点击或拖拽文件到此区域上传',
    uploadHint: '支持 TXT、APKG、EPUB 格式文件',
  },

  // 卡组配置
  deckConfig: {
    title: '卡组配置',
    appearance: '外观设置',
    fontSize: '字体大小',
    fontSizeRequired: '请设置字体大小',
    textAlign: '文本对齐',
    textAlignRequired: '请选择文本对齐方式',
    selectTextAlign: '选择文本对齐方式',
    alignLeft: '左对齐',
    alignCenter: '居中对齐',
    alignRight: '右对齐',
    fsrsAlgorithm: 'FSRS 算法',
    basicParams: '基础参数',
    targetRetention: '目标记忆保持率',
    targetRetentionRequired: '请设置目标记忆保持率',
    maxInterval: '最大间隔天数',
    maxIntervalRequired: '请设置最大间隔天数',
    advancedOptions: '高级选项',
    enableFuzz: '启用模糊化',
    enableShortTerm: '启用短期学习',
    learningSteps: '学习步骤 (分钟)',
    learningStepsRequired: '请设置学习步骤',
    relearningSteps: '重新学习步骤 (分钟)',
    relearningStepsRequired: '请设置重新学习步骤',
    weightParams: '权重参数',
    wParams: 'W 参数',
    wParamsRequired: '请设置W参数',
    fsrsDescription:
      'FSRS (Free Spaced Repetition Scheduler) 是一个开源的间隔重复算法，可以根据你的学习数据智能调整复习间隔。',
  },

  // 演示页面
  demo: {
    title: '国际化演示',
    description:
      '这是一个演示多语言功能的页面。您可以使用下面的语言切换器来测试不同语言之间的切换效果。',
    currentLanguage: '当前语言',
    selectMode: '选择模式',
    buttonMode: '按钮模式',
    alertTitle: '多语言支持说明',
    alertDescription:
      '此项目已全面支持中英文双语切换。语言偏好会自动保存到浏览器本地存储，下次访问时会记住您的选择。',
    featuresTitle: '功能特性',
    feature1: '✅ 支持中文和英文双语',
    feature2: '✅ 语言偏好本地存储',
    feature3: '✅ 实时语言切换',
    feature4: '✅ 回退机制保证翻译完整性',
    feature5: '✅ 全局事件通知机制',
    examplesTitle: '翻译示例',
    footer: '感谢使用 MyANKI 记忆卡片系统！',
  },

  // 编辑器插件
  editor: {
    // AI 解释插件
    explainInCard: '在卡片中解释选择文本',
    explainInDeck: '在牌组中解释选择文本',
    // 笔记插件
    addNote: '添加笔记',
    // 朗读插件
    textToSpeech: '朗读',
    stopSpeech: '停止朗读',
    readSelectedText: '朗读选中文本',
    readAllContent: '朗读全部内容',
    // 词典查询插件
    wordDictionary: '词典查询',
    noTextSelected: '请先选择文本',
    onlyWordsAllowed: '词典查询仅支持单个单词',
    wordDefinition: '单词释义',
    phraseExplanation: '短语解析',
    textAnalysis: '文本分析',
    dictionaryResult: '查询结果',
  },

  // Anki 卡片
  anki: {
    // 音频相关
    audioNotSupported: '您的浏览器不支持音频元素',
    audioCard: '这是一个音频卡片',

    // TTS 相关
    stopReading: '停止朗读',
    readText: '朗读文本',
    readAnswer: '朗读答案',

    // 卡片操作
    expandFront: '展开正面内容',
    collapseFront: '收缩正面内容',
    showAnswer: '展示答案 (Space)',
    clickToShowAnswer: '点击下方按钮或按空格键查看答案',

    // 复习按钮
    again: '再来 (1)',
    hard: '困难 (2)',
    good: '良好 (3)',
    easy: '简单 (4)',

    // 暂停功能
    suspend: '暂停',
    suspendCard: '暂停卡片',
    resumeCard: '恢复卡片',
    nextCard: '下一条',
    suspendSuccess: '卡片暂停成功',
    resumeSuccess: '卡片恢复成功',
    suspendFailed: '暂停卡片失败',
    cardSuspended: '此卡片已暂停',
    confirmSuspendCard: '确定要暂停这张卡片吗？',
    confirmResumeCard: '确定要恢复这张卡片吗？',

    // AI 聊天
    aiChat: 'AI Chat',
    thinking: '思考中...',
    loading: '加载中...',
    askAiPlaceholder: '问AI任何问题...',

    // 引用卡片
    referenceCard: '引用卡片',
    jumpToCard: '跳转到卡片',

    // 上下文选项
    contextDeck: '牌组',
    contextCard: '本卡片',
    contextNone: '聊天模式',

    // 上下文选择器
    contextLabel: '参考上下文',
    contextTooltip: '选择AI聊天的参考上下文',
    contextDeckTooltip: 'AI将参考当前牌组中的所有卡片',
    contextCardTooltip: 'AI只参考当前这张卡片',
    contextNoneTooltip: 'AI不参考任何卡片，进行纯聊天',

    // AI聊天快捷操作
    quickActions: '快捷操作',
    translateCard: '翻译',
    explainCard: '精读解释',
    polishText: '润色建议',
    summarizeCard: '总结要点',
    generateQuestions: '生成问题',
    findSimilar: '查找相似内容',

    // 翻译语言选项
    translateTo: '翻译为',
    translateToChinese: '中文',
    translateToEnglish: '英文',
    translateToJapanese: '日文',
    translateToKorean: '韩文',
    translateToFrench: '法文',
    translateToGerman: '德文',
    translateToSpanish: '西班牙文',

    // 错误信息
    cardNotFound: '未找到对应的卡片',
    getCardFailed: '获取引用卡片失败',
    getCardError: '获取卡片失败',
    switchingToCurrentCard: '点击的是当前卡片，无需切换',
    indexGenerated: '书本目录生成成功',
    indexGenerateFailed: '生成书本目录失败',

    // AnkiBar 工具提示
    autoMarkTitle: '标记标题',
    toggleVisualizer: '记忆可视化',
    toggleAiChat: 'AI聊天',
    generateIndex: '生成书本目录',
    openToc: '打开目录',
    closeToc: '关闭目录',
    newCards: '新卡片',
    dueLearning: '学习中',
    dueReview: '复习中',

    // 标签功能
    manageTags: '管理标签',
    currentTags: '当前标签',
    presetTags: '预设标签',
    addTag: '+ 添加标签',
    tagUpdatedSuccess: '标签更新成功',
    tagUpdateFailed: '标签更新失败',
    noCardSelected: '未选择卡片或卡片ID缺失',

    // 预设标签翻译
    'tags.favorite': '收藏',
    'tags.important': '重要',
    'tags.difficult': '难点',
    'tags.error_prone': '易错',
    'tags.review': '复习',

    // 预设标签
    presetTagLabels: {
      favorite: '收藏',
      important: '重要',
      difficult: '难点',
      error_prone: '易错',
      review: '复习',
    },

    // 书籍目录
    toc: {
      title: '书籍目录',
      loading: '正在加载目录...',
      noData: '没有找到卡片数据',
      generateFailed: '生成目录失败',
      jumpToCard: '跳转到卡片: {title}',
      completed: '完成',
      progress: '进度',
      chapter: '章节',
      section: '段落',
    },
    pleaseWait: '请等待前一个消息处理完成',

    // 笔记功能
    notes: {
      title: '笔记',
      viewNotes: '查看笔记',
      addNote: '新建笔记',
      editNote: '编辑笔记',
      deleteNote: '删除笔记',
      saveNote: '保存笔记',
      cancelEdit: '取消编辑',
      noteTitle: '笔记标题',
      noteContent: '笔记内容',
      pinNote: '置顶',
      unpinNote: '取消置顶',
      pinned: '置顶',
      emptyState: '选择一个笔记来查看内容',
      noCardSelected: '请先选择一个卡片',
      createSuccess: '笔记创建成功',
      createFailed: '创建笔记失败',
      updateSuccess: '笔记更新成功',
      updateFailed: '更新笔记失败',
      deleteSuccess: '笔记删除成功',
      deleteFailed: '删除笔记失败',
      deleteConfirm: '确定删除这条笔记吗？',
      fetchFailed: '获取笔记失败',
      pinSuccess: '笔记置顶成功',
      unpinSuccess: '笔记取消置顶成功',
      pinFailed: '操作失败',
      myNotes: '我的笔记',
      newNote: '新建笔记',
      noteTitlePlaceholder: '笔记标题',
      noteContentPlaceholder: '在此处输入笔记内容...',
    },
  },

  // 搜索页面
  searchPage: {
    title: '搜索卡片',
    description: '搜索并浏览您所有卡组中的卡片',

    // 表格列名
    columnDeck: '卡组',
    columnFront: '正面',
    columnBack: '背面',
    columnTags: '标签',
    columnState: '状态',
    columnCreated: '创建时间',
    columnActions: '操作',

    // 过滤器占位符和标签
    selectDeck: '选择卡组',
    searchFrontContent: '搜索正面内容',
    searchBackContent: '搜索背面内容',
    searchTags: '搜索标签',
    selectState: '选择状态',

    // 过滤器按钮
    filterButton: '过滤',
    searchButton: '搜索',
    resetButton: '重置',

    // 学习状态
    stateNew: '新卡片',
    stateLearning: '学习中',
    stateReview: '复习中',
    stateRelearning: '重新学习',
    stateSuspended: '已暂停',
    stateUnknown: '未知',

    // 操作
    view: '查看',

    // 分页
    showTotal: '第 {start}-{end} 项，共 {total} 项',

    // 空状态
    noData: '未找到卡片',

    // 加载中
    loading: '正在加载卡片...',

    // 错误信息
    queryFailed: '查询失败',
    queryError: '查询错误',
  },

  // 共享卡组页面
  sharedDecks: {
    title: '共享卡组',
    navigation: {
      backToMyDecks: '返回我的卡组',
    },
    cardInfo: {
      noDescription: '暂无描述',
      createdBy: '作者',
      unknown: '未知',
      cards: '张卡片',
      normalType: '普通',
      sharedTag: '已共享',
    },
    actions: {
      viewDetails: '查看详情',
      duplicate: '复制',
      duplicated: '已复制',
    },
    messages: {
      fetchError: '获取共享卡组失败',
      duplicateSuccess: '卡组 {deckName} 复制成功！',
      duplicateError: '复制卡组失败',
    },
    loading: {
      fetchingDecks: '正在加载共享卡组...',
    },
    empty: {
      noDecksAvailable: '暂无共享卡组',
    },
  },

  // 卡组原始卡片页面
  deckOriginalCards: {
    title: '卡组卡片',
    backToDecks: '返回卡组',
    loading: '加载中...',
    publishToShare: '发布共享',
    alreadyShared: '已共享',
    table: {
      front: '正面',
      back: '背面',
      createdAt: '创建时间',
      totalCards: '共 {total} 张卡片',
    },
    share: {
      title: '共享卡组',
      content: '确定要共享卡组 "{deckName}" 吗？共享后，其他用户将能够查看和复制该卡组。',
      okText: '共享',
      cancelText: '取消',
      success: '卡组共享成功！',
      error: '共享卡组失败',
    },
    messages: {
      fetchError: '获取卡片失败',
    },
  },

  // 共享卡组查看页面
  sharedDeckView: {
    title: '共享卡组查看',
    backToDecks: '返回卡组',
    sharedDeckTag: '共享卡组',
    duplicateToCollection: '复制到我的牌组',
    duplicated: '已复制',
    deckInformation: '卡组信息',
    creator: '创建者',
    description: '描述',
    totalCards: '总卡片数',
    deckType: '卡组类型',
    unknown: '未知',
    noDescription: '无描述',
    normal: '普通',
    table: {
      front: '正面',
      back: '背面',
      createdAt: '创建时间',
      totalCards: '共 {total} 张卡片',
    },
    duplicate: {
      title: '复制卡组',
      content: '确定要复制卡组 "{deckName}" 吗？这将把所有卡片添加到您的个人收藏中。',
      okText: '复制',
      cancelText: '取消',
      success: '卡组复制成功！',
      error: '复制卡组失败',
    },
    messages: {
      fetchError: '获取卡片失败',
    },
  },

  // 卡片可视化组件
  cardVisualizer: {
    legend: {
      title: '卡片状态图例',
      cardStates: '卡片状态',
      newCard: '新卡片',
      learning: '学习中',
      review: '复习',
      relearning: '重新学习',
      suspended: '已暂停',
      memoryStrength: '记忆强度',
      strongMemory: '强记忆 (80-100%)',
      mediumMemory: '中记忆 (40-80%)',
      weakMemory: '弱记忆 (0-40%)',
      memoryNote: '卡片透明度反映记忆强度',
    },
    tooltip: {
      status: '状态',
      dueTime: '到期时间',
      position: '位置',
      memoryStrength: '记忆强度',
      currentCard: '当前卡片',
      clickToView: '点击查看此卡片',
      unknownStatus: '未知状态',
    },
    showAllCards: '显示全部{count}张卡片',
    showPartialCards: '显示{visible}张卡片（共{total}张）',
  },
};
