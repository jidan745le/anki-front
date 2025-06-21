export const en = {
  // Common
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    loading: 'Loading...',
    success: 'Operation successful',
    error: 'Operation failed',
    warning: 'Warning',
    info: 'Info',
  },

  // Navigation
  nav: {
    brand: 'MyANKI Memory Cards',
    myDecks: 'My Decks',
    sharedDecks: 'Shared Decks',
    i18nDemo: 'I18n Demo',
    search: 'Search',
    login: 'Login',
    signup: 'Sign Up',
    logout: 'Logout',
    profile: 'Profile',
    account: 'Account',
    accountInfo: 'Account Information',
    selectLanguage: 'Select Language',
  },

  // User information
  user: {
    username: 'Username',
    email: 'Email',
    memberSince: 'Member Since',
    totalDecks: 'Total Decks',
    totalCards: 'Total Cards',
    studiedToday: 'Studied Today',
    accountInfo: 'Account Information',
  },

  // Decks page
  decks: {
    title: 'My Decks',
    addDeck: 'Create New Deck',
    uploadFile: 'Create from File',
    createManually: 'Create Manually',
    allDecks: 'All Decks',
    myCreated: 'My Created',
    shared: 'Shared with Me',

    // File upload
    uploadTips: 'Click or drag files to this area to upload',
    supportedFormats: 'Supported Formats',
    txtFormat: 'TXT Text File - Simple Q&A format',
    apkgFormat: 'APKG File - Anki deck file',
    epubFormat: 'EPUB eBook - Auto-generate reading cards',

    // APKG processing
    apkgProcessing: 'APKG File Processing',
    selectTemplates: 'Select templates to import',
    templatePreview: 'Template Preview',
    cardCount: 'Card Count',
    importSelected: 'Import Selected Templates',

    // Table columns
    deckName: 'Deck Name',
    cardCountColumn: 'Cards',
    status: 'Status',
    createdAt: 'Created',
    actions: 'Actions',

    // Status
    processing: 'Processing',
    completed: 'Completed',
    failed: 'Failed',

    // Actions
    study: 'Study',
    viewCards: 'View Cards',
    configure: 'Configure',
    share: 'Share',
    duplicate: 'Duplicate',
    delete: 'Delete',
    add: 'Add',
    update: 'Update',
    embedding: 'Embedding',
    actionsButton: 'Actions',

    // Status tips
    shared: 'Shared',
    embeddingTag: 'Embedding',
    failedStatus: 'Failed',
    newCards: 'New',
    dueLearning: 'Due Learning',
    dueReview: 'Due Review',

    // Notifications
    deleteConfirm: 'Are you sure you want to delete this deck?',
    deleteSuccess: 'Deck deleted successfully',
    createSuccess: 'Deck created successfully',

    // Form
    deckNameLabel: 'Deck Name',
    deckNamePlaceholder: 'Enter deck name',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'Enter deck description (optional)',
    typeLabel: 'Type',
    submit: 'Submit',

    // Tabs
    allTab: 'All',
    createdTab: 'Created',
    duplicatedTab: 'Duplicated',
    totalItems: 'Total {total} items',
    connected: 'Connected',
    disconnected: 'Disconnected',
    addDeckButton: 'Add Deck',
    addDeckTitle: 'Add Deck',
    parsingApkg: 'Parsing APKG file...',
    removeFile: 'Remove',
    supportedFileTypes: 'Supported file types:',
    txtFileDesc: 'TXT File: Text content with custom separators',
    apkgFileDesc: 'APKG File: Anki deck files with template selection',
    epubFileDesc: 'EPUB File: E-book files with automatic chapter processing',
    dragUploadText: 'Click or drag files to this area to upload',
    uploadHint: 'Support TXT, APKG, EPUB format files',
  },

  // Deck Configuration
  deckConfig: {
    title: 'Deck Configuration',
    appearance: 'Appearance Settings',
    fontSize: 'Font Size',
    fontSizeRequired: 'Please set font size',
    textAlign: 'Text Alignment',
    textAlignRequired: 'Please select text alignment',
    selectTextAlign: 'Select text alignment',
    alignLeft: 'Left Align',
    alignCenter: 'Center Align',
    alignRight: 'Right Align',
    fsrsAlgorithm: 'FSRS Algorithm',
    basicParams: 'Basic Parameters',
    targetRetention: 'Target Retention Rate',
    targetRetentionRequired: 'Please set target retention rate',
    maxInterval: 'Maximum Interval (Days)',
    maxIntervalRequired: 'Please set maximum interval',
    advancedOptions: 'Advanced Options',
    enableFuzz: 'Enable Fuzz',
    enableShortTerm: 'Enable Short Term',
    learningSteps: 'Learning Steps (Minutes)',
    learningStepsRequired: 'Please set learning steps',
    relearningSteps: 'Relearning Steps (Minutes)',
    relearningStepsRequired: 'Please set relearning steps',
    weightParams: 'Weight Parameters',
    wParams: 'W Parameters',
    wParamsRequired: 'Please set W parameters',
    fsrsDescription:
      'FSRS (Free Spaced Repetition Scheduler) is an open-source spaced repetition algorithm that intelligently adjusts review intervals based on your learning data.',
  },

  // Demo page
  demo: {
    title: 'Internationalization Demo',
    description:
      'This is a demo page showcasing multilingual functionality. You can use the language switcher below to test switching between different languages.',
    currentLanguage: 'Current Language',
    selectMode: 'Select Mode',
    buttonMode: 'Button Mode',
    alertTitle: 'Multilingual Support Description',
    alertDescription:
      'This project fully supports Chinese and English bilingual switching. Language preferences are automatically saved to browser local storage and will remember your choice on your next visit.',
    featuresTitle: 'Features',
    feature1: '✅ Support for Chinese and English bilingual',
    feature2: '✅ Language preference local storage',
    feature3: '✅ Real-time language switching',
    feature4: '✅ Fallback mechanism ensures translation completeness',
    feature5: '✅ Global event notification mechanism',
    examplesTitle: 'Translation Examples',
    footer: 'Thank you for using MyANKI Memory Card System!',
  },

  // Anki Cards
  anki: {
    // Audio related
    audioNotSupported: 'Your browser does not support the audio element',
    audioCard: 'This is an audio card',

    // TTS related
    stopReading: 'Stop Reading',
    readText: 'Read Text',
    readAnswer: 'Read Answer',

    // Card operations
    expandFront: 'Expand Front Content',
    collapseFront: 'Collapse Front Content',
    showAnswer: 'Show Answer (Space)',
    clickToShowAnswer: 'Click the button below or press Space to view the answer',

    // Review buttons
    again: 'Again (1)',
    hard: 'Hard (2)',
    good: 'Good (3)',
    easy: 'Easy (4)',

    // AI Chat
    aiChat: 'AI Chat',
    thinking: 'Thinking...',
    loading: 'Loading...',
    askAiPlaceholder: 'Ask AI anything... (Enter to send, Shift+Enter for new line)',

    // Reference cards
    referenceCard: 'Reference Card',
    jumpToCard: 'Jump to Card',

    // Context options
    contextDeck: 'Deck',
    contextCard: 'Card',
    contextNone: 'None',

    // Error messages
    cardNotFound: 'Card not found',
    getCardFailed: 'Failed to get reference card',
    getCardError: 'Failed to get card',
    switchingToCurrentCard: 'Clicked on current card, no need to switch',
    indexGenerated: 'Book index generated successfully',
    indexGenerateFailed: 'Failed to generate book index',

    // AnkiBar tooltips
    autoMarkTitle: 'Auto Mark Title',
    toggleVisualizer: 'Toggle Card Visualizer',
    toggleAiChat: 'Toggle AI Chat',
    generateIndex: 'Generate Book Index',
    openToc: 'Open Table of Contents',
    closeToc: 'Close Table of Contents',
    newCards: 'New Cards',
    dueLearning: 'Due Learning',
    dueReview: 'Due Review',

    // Table of Contents
    toc: {
      title: 'Table of Contents',
      loading: 'Loading table of contents...',
      noData: 'No card data found',
      generateFailed: 'Failed to generate table of contents',
      jumpToCard: 'Jump to card: {title}',
      completed: 'Completed',
      progress: 'Progress',
      chapter: 'Chapter',
      section: 'Section',
    },
  },
};
