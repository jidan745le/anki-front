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
    shared: '分享给我的',

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
    share: '分享',
    duplicate: '复制',
    delete: '删除',
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

    // AI 聊天
    aiChat: 'AI Chat',
    thinking: '思考中...',
    loading: '加载中...',
    askAiPlaceholder: 'Ask AI anything... (Enter to send, Shift+Enter for new line)',

    // 引用卡片
    referenceCard: '引用卡片',
    jumpToCard: '跳转到卡片',

    // 上下文选项
    contextDeck: 'Deck',
    contextCard: 'Card',
    contextNone: 'None',

    // 错误信息
    cardNotFound: '未找到对应的卡片',
    getCardFailed: '获取引用卡片失败',
    getCardError: '获取卡片失败',
    switchingToCurrentCard: '点击的是当前卡片，无需切换',

    // AnkiBar 工具提示
    autoMarkTitle: '标记标题',
    toggleVisualizer: '记忆可视化',
    toggleAiChat: 'AI聊天',
    newCards: '新卡片',
    dueLearning: '学习中',
    dueReview: '复习中',
  },
};
