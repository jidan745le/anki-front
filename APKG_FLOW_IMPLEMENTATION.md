# APKG文件两步式处理流程实现

## 概述

实现了APKG文件的两步式处理流程，允许用户先预览和选择模板，然后再进行导入。

## 实现的功能

### 1. 文件类型检测
- 自动检测上传的文件是否为`.apkg`格式
- 在UI中显示不同的提示信息

### 2. 第一步：模板解析
- **接口**: `POST /anki/parseApkgTemplates`
- **功能**: 解析APKG文件，提取模板信息
- **返回**: 模板列表、字段信息、样例卡片

### 3. 第二步：模板选择和导入
- **接口**: `POST /anki/processSelectedTemplates`
- **功能**: 根据用户选择的模板执行实际导入
- **监听**: 通过WebSocket监听导入进度

### 4. 用户界面组件

#### ApkgTemplateSelector组件
- 模板选择界面
- 支持多选/单选模板
- 预览模板的正面和背面HTML
- 显示样例卡片渲染效果
- 展示字段信息和卡片数量

#### Decks页面增强
- 文件上传时自动检测APKG格式
- 显示相应的处理流程提示
- 集成模板选择流程

## 使用流程

1. **上传APKG文件**
   - 用户在"添加Deck"中选择并上传APKG文件
   - 系统自动检测文件类型并显示提示

2. **解析模板** (第一步)
   - 点击"提交"按钮后自动调用解析接口
   - 显示加载状态："正在解析APKG文件..."
   - 解析完成后弹出模板选择界面

3. **选择模板** (交互)
   - 查看可用的模板列表
   - 每个模板显示：
     - 模板名称
     - 卡片数量
     - 使用的字段
     - 正面/背面模板预览
     - 样例卡片渲染效果
   - 用户可以选择/取消选择模板

4. **导入执行** (第二步)
   - 点击"导入选择的模板"执行实际导入
   - 通过WebSocket实时显示导入进度
   - 导入完成后刷新deck列表

## 技术实现

### 前端组件结构
```
src/
├── pages/
│   └── Decks/
│       └── index.js          # 主deck管理页面，集成APKG流程
└── component/
    └── ApkgTemplateSelector.js  # 专用的模板选择组件
```

### 状态管理
```javascript
// APKG相关状态
const [apkgTemplates, setApkgTemplates] = useState(null);
const [apkgTaskId, setApkgTaskId] = useState(null);
const [templateModalVisible, setTemplateModalVisible] = useState(false);
const [templateLoading, setTemplateLoading] = useState(false);
```

### 关键函数
- `isApkgFile()`: 检测文件类型
- `parseApkgTemplates()`: 第一步解析
- `processSelectedTemplates()`: 第二步处理
- WebSocket监听进度更新

## API接口

### 解析APKG模板
```http
POST /anki/parseApkgTemplates
Content-Type: multipart/form-data

Response:
{
  "taskId": "uuid-string",
  "templates": [...],
  "totalNotes": 5494,
  "totalCards": 16482
}
```

### 处理选择的模板
```http
POST /anki/processSelectedTemplates
Content-Type: application/json

{
  "taskId": "from-step-1",
  "selectedTemplates": [...],
  "deckInfo": {
    "name": "deck名称",
    "description": "描述",
    "type": "APKG"
  }
}
```

## 用户体验特点

1. **智能检测**: 自动识别APKG文件，无需用户手动选择
2. **可视化预览**: 提供模板和样例卡片的直观预览
3. **灵活选择**: 允许选择性导入特定模板
4. **实时反馈**: 通过WebSocket提供实时处理进度
5. **错误处理**: 完善的错误提示和状态管理

## 兼容性

- 向后兼容原有的普通文件导入流程
- APKG文件自动走新流程，其他文件类型走原流程
- 不影响现有的音频和播客deck创建功能

## 扩展性

设计支持未来扩展：
- 可以添加模板编辑功能
- 可以支持更多文件格式的两步式处理
- 组件化设计便于复用 