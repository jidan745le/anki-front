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
    newCardsStatus: 'New',
    dueLearningStatus: 'Due Learning',
    dueReviewStatus: 'Due Review',

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

  // Editor plugins
  editor: {
    // AI explain plugins
    explainInCard: 'Explain selected text in card',
    explainInDeck: 'Explain selected text in deck',
    // Note plugin
    addNote: 'Add Note',
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

    // Suspend functionality
    suspend: 'Suspend',
    suspendCard: 'Suspend Card',
    resumeCard: 'Resume Card',
    suspendSuccess: 'Card suspended successfully',
    resumeSuccess: 'Card resumed successfully',
    suspendFailed: 'Failed to suspend card',
    cardSuspended: 'This card is suspended',
    confirmSuspendCard: 'Are you sure you want to suspend this card?',
    confirmResumeCard: 'Are you sure you want to resume this card?',

    // AI Chat
    aiChat: 'AI Chat',
    thinking: 'Thinking...',
    askAiPlaceholder: 'Ask AI anything...',

    // Reference cards
    referenceCard: 'Reference Card',
    jumpToCard: 'Jump to Card',

    // Context options
    contextDeck: 'Deck',
    contextCard: 'Card',
    contextNone: 'Chat Mode',

    // Context selector
    contextLabel: 'Context',
    contextTooltip: 'Select reference context for AI chat',
    contextDeckTooltip: 'AI will reference all cards in the current deck',
    contextCardTooltip: 'AI will only reference the current card',
    contextNoneTooltip: 'AI will chat without any card context',

    // Quick actions for AI chat
    quickActions: 'Quick Actions',
    translateCard: 'Translate',
    explainCard: 'Explain in Detail',
    polishText: 'Polish & Improve',
    summarizeCard: 'Summarize',
    generateQuestions: 'Generate Questions',
    findSimilar: 'Find Similar Content',

    // Translation languages
    translateTo: 'Translate to',
    translateToChinese: 'Chinese',
    translateToEnglish: 'English',
    translateToJapanese: 'Japanese',
    translateToKorean: 'Korean',
    translateToFrench: 'French',
    translateToGerman: 'German',
    translateToSpanish: 'Spanish',

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

    // Tag functionality
    manageTags: 'Manage Tags',
    currentTags: 'Current Tags',
    presetTags: 'Preset Tags',
    addTag: '+ Add Tag',
    tagUpdatedSuccess: 'Tags updated successfully',
    tagUpdateFailed: 'Failed to update tags',
    noCardSelected: 'No card selected or card ID missing',

    // Preset tag translations
    'tags.favorite': 'Favorite',
    'tags.important': 'Important',
    'tags.difficult': 'Difficult',
    'tags.error_prone': 'Error Prone',
    'tags.review': 'Review',

    // Preset tag labels
    presetTagLabels: {
      favorite: 'Favorite',
      important: 'Important',
      difficult: 'Difficult',
      error_prone: 'Error Prone',
      review: 'Review',
    },

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
    pleaseWait: 'Please wait for the previous message to be processed',
  },

  // Search page
  searchPage: {
    title: 'Search Cards',
    description: 'Search and browse your cards across all decks',

    // Table columns
    columnDeck: 'Deck',
    columnFront: 'Front',
    columnBack: 'Back',
    columnTags: 'Tags',
    columnState: 'State',
    columnCreated: 'Created',
    columnActions: 'Actions',

    // Filter placeholders and labels
    selectDeck: 'Select deck',
    searchFrontContent: 'Search front content',
    searchBackContent: 'Search back content',
    searchTags: 'Search tags',
    selectState: 'Select state',

    // Filter buttons
    filterButton: 'Filter',
    searchButton: 'Search',
    resetButton: 'Reset',

    // Learning states
    stateNew: 'New',
    stateLearning: 'Learning',
    stateReview: 'Review',
    stateRelearning: 'Relearning',
    stateSuspended: 'Suspended',
    stateUnknown: 'Unknown',

    // Actions
    view: 'View',

    // Pagination
    showTotal: '{start}-{end} of {total} items',

    // Empty state
    noData: 'No cards found',

    // Loading
    loading: 'Loading cards...',

    // Error messages
    queryFailed: 'Query failed',
    queryError: 'Query error',
  },

  // Shared Decks page
  sharedDecks: {
    title: 'Shared Decks',
    navigation: {
      backToMyDecks: 'Back to My Decks',
    },
    cardInfo: {
      noDescription: 'No description available',
      createdBy: 'By',
      unknown: 'Unknown',
      cards: 'cards',
      normalType: 'Normal',
      sharedTag: 'Shared',
    },
    actions: {
      viewDetails: 'View Details',
      duplicate: 'Duplicate',
      duplicated: 'Duplicated',
    },
    messages: {
      fetchError: 'Failed to fetch shared decks',
      duplicateSuccess: 'Deck {deckName} duplicated successfully!',
      duplicateError: 'Failed to duplicate deck',
    },
    loading: {
      fetchingDecks: 'Loading shared decks...',
    },
    empty: {
      noDecksAvailable: 'No shared decks available',
    },
  },

  // Deck Original Cards page
  deckOriginalCards: {
    title: 'Deck Cards',
    backToDecks: 'Back to Decks',
    loading: 'Loading...',
    publishToShare: 'Publish to Share',
    alreadyShared: 'Already Shared',
    table: {
      front: 'Front',
      back: 'Back',
      createdAt: 'Created At',
      totalCards: 'Total {total} cards',
    },
    share: {
      title: 'Share Deck',
      content:
        'Are you sure you want to share the deck "{deckName}"? Once shared, other users will be able to view and duplicate it.',
      okText: 'Share',
      cancelText: 'Cancel',
      success: 'Deck shared successfully!',
      error: 'Failed to share deck',
    },
    messages: {
      fetchError: 'Failed to fetch cards',
    },
  },

  // Shared Deck View page
  sharedDeckView: {
    title: 'Shared Deck View',
    backToDecks: 'Back to Decks',
    sharedDeckTag: 'Shared Deck',
    duplicateToCollection: 'Duplicate to My Deck',
    duplicated: 'Duplicated',
    deckInformation: 'Deck Information',
    creator: 'Creator',
    description: 'Description',
    totalCards: 'Total Cards',
    deckType: 'Deck Type',
    unknown: 'Unknown',
    noDescription: 'No description',
    normal: 'Normal',
    table: {
      front: 'Front',
      back: 'Back',
      createdAt: 'Created At',
      totalCards: 'Total {total} cards',
    },
    duplicate: {
      title: 'Duplicate Deck',
      content:
        'Are you sure you want to duplicate the deck "{deckName}"? This will add all cards to your personal collection.',
      okText: 'Duplicate',
      cancelText: 'Cancel',
      success: 'Deck duplicated successfully!',
      error: 'Failed to duplicate deck',
    },
    messages: {
      fetchError: 'Failed to fetch cards',
    },
  },

  // Card Visualizer component
  cardVisualizer: {
    legend: {
      title: 'Card Status Legend',
      cardStates: 'Card States',
      newCard: 'New Card',
      learning: 'Learning',
      review: 'Review',
      relearning: 'Relearning',
      suspended: 'Suspended',
      memoryStrength: 'Memory Strength',
      strongMemory: 'Strong Memory (80-100%)',
      mediumMemory: 'Medium Memory (40-80%)',
      weakMemory: 'Weak Memory (0-40%)',
      memoryNote: 'Card opacity reflects memory strength',
    },
    tooltip: {
      status: 'Status',
      dueTime: 'Due Time',
      position: 'Position',
      memoryStrength: 'Memory Strength',
      currentCard: 'Current Card',
      clickToView: 'Click to view this card',
      unknownStatus: 'Unknown Status',
    },
    showAllCards: 'Showing all {count} cards',
    showPartialCards: 'Showing {visible} cards (total {total})',
  },
};
