import { h } from 'snabbdom'
import { DomEditor, SlateElement, SlateTransforms, SlateEditor } from '@wangeditor/editor'
import { omit } from 'lodash'

// 定义节点的数据结构和类型
class ChatChunkElement {
  type = 'chatchunk'
  chunkId = ''
  children = []
}

class AiLoadingChunkElement {
  type = 'ailoadingchunk'
  chunkId = ''
  children = []
}

// 插件：标记为 inline 节点
function withChatChunk(editor) {
  const { isInline } = editor
  const newEditor = editor

  // 重写 isInline - 对两种类型都处理
  newEditor.isInline = (elem) => {
    const type = DomEditor.getNodeType(elem)
    if (type === 'chatchunk' || type === 'ailoadingchunk') return true
    return isInline(elem)
  }

  return newEditor
}

// 渲染对话块元素到编辑器
function renderChatChunk(elem, children, editor) {
  const { chunkId = '' } = elem 

  // 创建撤销类型按钮
  const removeTypeBtn = h(
    'span',
    {
      style: {
        marginLeft: '8px',
        color: '#ff4d4f',
        cursor: 'pointer',
        padding: '2px 4px',
        borderRadius: '2px'
      },
      on: {
        click: (e) => {
          e.preventDefault()
          e.stopPropagation()

          try {
            const eventCurrent = e.currentTarget
            // 使编辑器获得焦点
            setTimeout(() => {
              const chatchunkElement = eventCurrent.closest('[data-chunk-id]')
              if (!chatchunkElement) return

              // 选中该元素
              const domSelection = window.getSelection()
              const range = document.createRange()

              // 将范围设置为整个 chatchunk 元素
              range.selectNodeContents(chatchunkElement)
              domSelection.removeAllRanges()
              domSelection.addRange(range)

              // 稍作延迟，确保选区已更新
              setTimeout(() => {
                SlateTransforms.unwrapNodes(editor, {
                  match: n => SlateElement.isElement(n) && n.type === 'chatchunk',
                  mode: "all",
                })
              }, 100)
            }, 100)
          } catch (error) {
            console.error('选中节点时出错:', error)
          }
        }
      }
    },
    ["删除"]
  )

  // 创建操作按钮容器
  const actionButtons = h(
    'span',
    {
      props: { contentEditable: false },
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 'auto',
      }
    },
    [removeTypeBtn]
  )

  // 完整的元素，包含内容和操作按钮
  return h(
    'span',
    {
      attrs: { 'data-chunk-id': chunkId },
      props: { contentEditable: true },
      on: {
        click: () => {
          alert("dd")
        }
      },
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 4px',
        margin: '0 2px',
        backgroundColor: 'yellow',
        border: '1px solid #e8e8e8',
        lineHeight: '1.5',
        verticalAlign: 'middle'   
      }
    },
    [
      // 内容部分
      h('span', {
        style: {
          flex: '1',
          minWidth: '30px'
        }
      }, children || []),

      // 操作按钮
      actionButtons
    ]
  )
}

// 渲染加载中的元素（带背景闪烁效果）
function renderAiLoadingChunk(elem, children, editor) {
  const { chunkId = '' } = elem
  
  // 添加闪烁样式 - 只添加一次
  if (!document.getElementById('ai-loading-flash-style')) {
    const style = document.createElement('style')
    style.id = 'ai-loading-flash-style'
    style.textContent = `
      @keyframes background-flash {
        0% { background-color: yellow; }
        50% { background-color: #ffffaa; }
        100% { background-color: yellow; }
      }
    `
    document.head.appendChild(style)
  }

  // 返回带闪烁效果的元素
  return h(
    'span',
    {
      attrs: { 'data-chunk-id': chunkId },
      props: { contentEditable: true },
      style: {
        display: 'inline-flex', 
        alignItems: 'center',
        padding: '2px 4px', 
        margin: '0 2px', 
        backgroundColor: 'yellow',
        border: '1px solid #e8e8e8',
        lineHeight: '1.5',
        verticalAlign: 'middle',
        animation: 'background-flash 1.5s infinite' // 添加背景闪烁动画
      }
    },
    children || []
  )
}

// ---- HTML 转换函数 ----

// 对话块的 HTML 转换
function chatChunkToHtml(elem, childrenHtml) {
  const { chunkId = '' } = elem
  return `<span 
    data-w-e-type="chatchunk"
    data-w-e-is-inline
    data-chunk-id="${chunkId}"
  >${childrenHtml}</span>`
}

// 加载块的 HTML 转换
function aiLoadingChunkToHtml(elem, childrenHtml) {
  const { chunkId = '' } = elem
  return `<span 
    data-w-e-type="ailoadingchunk"
    data-w-e-is-inline
    data-chunk-id="${chunkId}"
  >${childrenHtml}</span>`
}

// ---- HTML 解析函数 ----

// 对话块的 HTML 解析
function parseChatChunkHtml(domElem, children, editor) {
  const chunkId = domElem.getAttribute('data-chunk-id') || ''
  return {
    type: 'chatchunk',
    chunkId,
    children: children && children.length > 0 ? children : [{ text: '' }]
  }
}

// 加载块的 HTML 解析
function parseAiLoadingChunkHtml(domElem, children, editor) {
  const chunkId = domElem.getAttribute('data-chunk-id') || ''
  return {
    type: 'ailoadingchunk',
    chunkId,
    children: children && children.length > 0 ? children : [{ text: '' }]
  }
}

// 与 API 集成的数据获取函数
async function fetchAiResponse(content, options = {}) {
  try {
    const { isChat = false, isAskMode = false, isGlobalExplain = false, cardId, chatId, apiClient, onLoadingChange, onError, onSuccess } = options;
    
    if (onLoadingChange) onLoadingChange(true);
    
    const requestData = {
      content,
      model: 'deepseek-chat'
    };

    if (isChat) {
      if (isAskMode) {
        requestData.cardId = cardId;
      } else {
        requestData.chatId = chatId;
      }
    } else {
      requestData.cardId = cardId;
    }

    if (isGlobalExplain) {
      requestData.mode = "global";
    }

    const response = await apiClient.post('/aichat/message', requestData);
    
    if (response.data.success) {
      const { aiMessage: { content, chat: { uuid } } } = response.data.data;
      
      if (onSuccess) {
        onSuccess({
          content,
          chatId: uuid,
          data: response.data.data
        });
      }
      
      return { content, chatId: uuid, data: response.data.data };
    } else {
      if (onError) onError(response.data.message || 'Request failed');
      throw new Error(response.data.message || 'Request failed');
    }
  } catch (err) {
    if (onError) onError(err.message);
    throw err;
  } finally {
    if (onLoadingChange) onLoadingChange(false);
  }
}

// ---- 菜单定义 ----

// 选中文本转换为对话块的菜单
class TextToChatChunkMenu {
  constructor(options = {}) {
    this.title = '转换为对话块'
    this.tag = 'button'
    this.iconSvg = '<svg viewBox="0 0 1024 1024"><path d="M832 64H192c-35.2 0-64 28.8-64 64v768c0 35.2 28.8 64 64 64h640c35.2 0 64-28.8 64-64V128c0-35.2-28.8-64-64-64zM640 640H384c-17.6 0-32-14.4-32-32s14.4-32 32-32h256c17.6 0 32 14.4 32 32s-14.4 32-32 32zm128-256H384c-17.6 0-32-14.4-32-32s14.4-32 32-32h384c17.6 0 32 14.4 32 32s-14.4 32-32 32z"></path></svg>'
    this.showModal = false
    this.apiClient = options.apiClient
    this.cardId = options.cardId
    this.chatId = options.chatId
    this.onChatIdChange = options.onChatIdChange
    this.onSuccess = options.onSuccess
    this.onError = options.onError
    this.onLoadingChange = options.onLoadingChange
  }

  getValue(editor) {
    return ''
  }

  isActive(editor) {
    return false
  }

  isDisabled(editor) {
    // 只有选中了文本时才可用
    const { selection } = editor
    if (selection == null) return true
    if (selection.anchor.offset === selection.focus.offset) return true
    return false
  }

  // 执行命令
  exec(editor, value) {
    const selectedText = editor.getSelectionText().trim()
    if (!selectedText) return
    this.convertTextToChatChunk(editor, selectedText)
  }

  // 核心转换方法 - 与 API 集成
  async convertTextToChatChunk(editor, text) {
    const { selection } = editor
    if (!selection) return
    
    try {
      // 查找文本节点
      const nodes = Array.from(SlateEditor.nodes(editor, {
        at: selection,
        match: n => !SlateEditor.isEditor(n) && !n.type
      }))
      
      if (nodes.length === 0) return
      
      const node = nodes[0]
      const textNode = node[0]
      const properties = omit(textNode, ['children', 'text'])
      
      // 创建唯一的 chunkId
      const chunkId = 'chunk_' + Date.now()
      
      // 首先包装为带闪烁效果的 ailoadingchunk
      SlateTransforms.wrapNodes(
        editor,
        { type: 'ailoadingchunk', chunkId, children: [{ ...properties, text }] },
        { split: true }
      )
      
      // 调用 API 获取 AI 响应
      try {
        const response = await fetchAiResponse(text, {
          apiClient: this.apiClient,
          cardId: this.cardId,
          chatId: this.chatId,
          onLoadingChange: this.onLoadingChange,
          onError: this.onError,
          onSuccess: (data) => {
            // 更新 chatId
            if (this.onChatIdChange && data.chatId) {
              this.onChatIdChange(data.chatId);
            }
            
            if (this.onSuccess) {
              this.onSuccess(data);
            }
          }
        });
        
        // API 请求成功后，用返回的内容替换加载块
        setTimeout(() => {
          // 查找加载块
          const loadingNodes = Array.from(
            SlateEditor.nodes(editor, {
              at: [],
              match: n => (
                SlateElement.isElement(n) && 
                n.type === 'ailoadingchunk' && 
                n.chunkId === chunkId
              )
            })
          );
          
          if (loadingNodes.length > 0) {
            const [_, path] = loadingNodes[0];
            
            // 先移除加载节点
            SlateTransforms.removeNodes(editor, { at: path });
            
            // 然后在同一位置插入带有 AI 回答的 chatchunk
            SlateTransforms.insertNodes(
              editor,
              {
                type: 'chatchunk',
                chunkId: 'ai_' + Date.now(),
                children: [{ text: response.content }]
              },
              { at: path }
            );
          }
        }, 500); // 给一个短暂的延迟，确保动画效果明显
        
      } catch (error) {
        // API 请求失败，移除加载块
        const loadingNodes = Array.from(
          SlateEditor.nodes(editor, {
            at: [],
            match: n => (
              SlateElement.isElement(n) && 
              n.type === 'ailoadingchunk' && 
              n.chunkId === chunkId
            )
          })
        );
        
        if (loadingNodes.length > 0) {
          const [_, path] = loadingNodes[0];
          SlateTransforms.unwrapNodes(editor, {
            at: path,
            match: n => SlateElement.isElement(n) && n.type === 'ailoadingchunk'
          });
        }
      }
      
    } catch (error) {
      console.error('转换文本到对话块时出错:', error)
    }
  }
}

// 创建菜单工厂函数，允许传入 API 配置
function createTextToChatChunkMenuFactory(options = {}) {
  return {
    key: 'textToChatChunk',
    factory() {
      return new TextToChatChunkMenu(options)
    }
  }
}

// ---- 配置对象 ----

// 渲染配置
const renderChatChunkConf = {
  type: 'chatchunk',
  renderElem: renderChatChunk
}

const renderAiLoadingChunkConf = {
  type: 'ailoadingchunk',
  renderElem: renderAiLoadingChunk
}

// HTML 转换配置
const chatChunkToHtmlConf = {
  type: 'chatchunk',
  elemToHtml: chatChunkToHtml
}

const aiLoadingChunkToHtmlConf = {
  type: 'ailoadingchunk',
  elemToHtml: aiLoadingChunkToHtml
}

// HTML 解析配置
const parseChatChunkHtmlConf = {
  selector: 'span[data-w-e-type="chatchunk"]',
  parseElemHtml: parseChatChunkHtml
}

const parseAiLoadingChunkHtmlConf = {
  selector: 'span[data-w-e-type="ailoadingchunk"]',
  parseElemHtml: parseAiLoadingChunkHtml
}

// 创建模块工厂函数，允许传入配置
function createChatChunkModule(options = {}) {
  return {
    editorPlugin: withChatChunk,
    renderElems: [renderChatChunkConf, renderAiLoadingChunkConf],
    elemsToHtml: [chatChunkToHtmlConf, aiLoadingChunkToHtmlConf],
    parseElemsHtml: [parseChatChunkHtmlConf, parseAiLoadingChunkHtmlConf],
    menus: [createTextToChatChunkMenuFactory(options)]
  }
}

export { createChatChunkModule, fetchAiResponse }
export default createChatChunkModule