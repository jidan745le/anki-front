import { h } from 'snabbdom'
import { DomEditor, IDomEditor, SlateElement, SlateDescendant, SlateTransforms, SlateEditor, SlateNode } from '@wangeditor/editor'
import { omit } from 'lodash'
import apiClient from '../../../common/http/apiClient'

// 定义节点的数据结构和类型
class ChatChunkElement {
  type = 'chatchunk'
  chunkId = '' // 替换原来的文件相关属性
  children = []
}

// 插件：标记为 inline 节点
function withChatChunk(editor) {
  const { isInline } = editor
  const newEditor = editor

  // 重写 isInline
  newEditor.isInline = (elem) => {
    const type = DomEditor.getNodeType(elem)
    if (type === 'chatchunk') return true
    if (type === 'ailoadingchunk') return true
    return isInline(elem)
  }

  return newEditor
}

// 渲染附件元素到编辑器
function renderChatChunk(elem, children, editor) {
  const { chunkId = '' } = elem

  // 不再使用 h 函数创建 SVG
  // 而是直接使用 HTML 字符串
  const svgHtml = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="display:block">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"></path>
      <path d="M0 0h24v24H0z" fill="none"></path>
    </svg>
  `;

  // 创建撤销类型按钮 (using HTML string)
  const removeTypeBtn = h(
    'span',
    {
      style: {
        color: '#ff4d4f',
        cursor: 'pointer',
        padding: '2px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      },
      props: {
        innerHTML: svgHtml  // 直接嵌入 HTML
      },
      on: {
        click: (e) => {
          e.preventDefault()
          e.stopPropagation()

          try {
            const eventCurrent = e.currentTarget
            // 使编辑器获得焦点
            setTimeout(() => {
              if (!(eventCurrent instanceof Element)) return; // Add check

              const chatchunkContainer = eventCurrent.closest('[data-chunk-id]'); // Find parent container
              if (!chatchunkContainer) return

              // Find the element with data-chunk-id, which should be the container itself in this structure
              const chunkElementWithId = chatchunkContainer;
              // const chunkElementWithId = chatchunkContainer.querySelector('[data-chunk-id]') || chatchunkContainer; // Alternative if id is nested

              // 选中该元素
              // 为了选中该元素，我们可以先设置一个临时 DOM 选区
              const domSelection = window.getSelection()
              if (!domSelection) return; // Add null check for getSelection
              const range = document.createRange()

              // 将范围设置为整个 chatchunk 元素
              range.selectNodeContents(chunkElementWithId)
              domSelection.removeAllRanges()
              domSelection.addRange(range)

              // 通知编辑器更新 Slate 选区
              // const sel = editor.selection // Keep track if needed
              console.log('已选中元素，准备 unwrap:', domSelection, chunkElementWithId)
              setTimeout(() => {
                // Use the original unwrap logic based on selection/match
                SlateTransforms.unwrapNodes(editor, {
                  match: n => SlateElement.isElement(n) && n.type === 'chatchunk',
                  mode: "all",
                })
              }, 100)

              // domSelection.removeAllRanges() // Consider if needed after unwrap

            }, 100)

          } catch (error) {
            console.error('选中节点时出错:', error)
          }
        }
      }
    },
    [] // 空子元素数组，因为我们使用 innerHTML
  )

  // 创建操作按钮容器
  const actionButtons = h(
    'span',
    {
      props: { contentEditable: false, className: 'chat-chunk-actions' },
      class: { 'chat-chunk-actions': true }, // Class for targeting
      style: {
        position: 'absolute',
        top: '-25px', // Position above the element
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)', // Semi-transparent background
        color: 'white',
        padding: '3px 5px',
        borderRadius: '3px',
        opacity: '0', // Initially hidden
        visibility: 'hidden',
        transition: 'opacity 0.2s, visibility 0.2s',
        whiteSpace: 'nowrap', // Prevent wrapping
        zIndex: '10', // Ensure it's above other content
        // Removed marginLeft: 'auto'
      }
    },
    [removeTypeBtn /* Add other buttons here if needed */]
  )

  // 完整的元素，包含内容和操作按钮
  return h(
    'span',
    {
      attrs: { 'data-chunk-id': chunkId },
      props: { contentEditable: true },
      class: { 'chat-chunk-container': true }, // Add class for hover targeting
      on: {
        click: () => {
          editor.getChatMessageAndShowSidebar && editor.getChatMessageAndShowSidebar(chunkId)
        },
        // Add mouseenter/mouseleave to show/hide actions
        mouseenter: (e) => {
          // No type assertion needed, querySelector works on EventTarget if it's an Element
          const target = e.currentTarget;
          if (target instanceof Element) { // Add check
            const actions = target.querySelector('.chat-chunk-actions');
            if (actions instanceof HTMLElement) { // Check if actions is HTMLElement
              actions.style.opacity = '1';
              actions.style.visibility = 'visible';
            }
          }
        },
        mouseleave: (e) => {
          const target = e.currentTarget;
          if (target instanceof Element) { // Add check
            const actions = target.querySelector('.chat-chunk-actions');
            if (actions instanceof HTMLElement) { // Check if actions is HTMLElement
              actions.style.opacity = '0';
              actions.style.visibility = 'hidden';
            }
          }
        }
      },
      style: {
        position: 'relative', // Needed for absolute positioning of children
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 204, 153)',
        border: '1px solid #e8e8e8',
        lineHeight: '1.5',
      }
    },
    [
      // 内容部分
      h('span', {
        style: {
          flex: '1',
          minWidth: '30px' // Ensure some minimum width
        }
      }, children || []),

      // 操作按钮 (absolutely positioned, visibility controlled by hover)
      actionButtons
    ]
  )
}


// 渲染加载中的元素（只有背景闪烁效果）
function renderAiLoadingChunk(elem, children, editor) {
  const { chunkId = '' } = elem

  // 添加闪烁样式
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

  return h(
    'span',
    {
      attrs: { 'data-chunk-id': chunkId },
      props: { contentEditable: true },
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'yellow',
        lineHeight: '1.5',
        animation: 'background-flash 1.5s infinite' // 添加背景闪烁动画
      }
    },
    children || []
  )
}


// HTML 转换
function chatChunkToHtml(elem, childrenHtml) {
  const { chunkId = '' } = elem

  return `<span 
    data-w-e-type="chatchunk"
    data-w-e-is-inline
    data-chunk-id="${chunkId}"
  >${childrenHtml}</span>`
}

// HTML 转换
function aiLoadingChunkToHtml(elem, childrenHtml) {
  const { chunkId = '' } = elem

  return `<span 
    data-w-e-type="ailoadingchunk"
    data-w-e-is-inline
    data-chunk-id="${chunkId}"
  >${childrenHtml}</span>`
}

// HTML 解析
function parseChatChunkHtml(domElem, children, editor) {
  const chunkId = domElem.getAttribute('data-chunk-id') || ''

  return {
    type: 'chatchunk',
    chunkId,
    children: children && children.length > 0 ? children : [{ text: '' }]
  }
}

// HTML 解析
function parseAiLoadingChunkHtml(domElem, children, editor) {
  const chunkId = domElem.getAttribute('data-chunk-id') || ''

  return {
    type: 'ailoadingchunk',
    chunkId,
    children: children && children.length > 0 ? children : [{ text: '' }]
  }
}

// 定义菜单


// 新增：选中文本转换为附件的菜单
class TextToChatChunkMenu {
  constructor() {
    this.title = '转换为对话块'
    this.tag = 'button'
    this.iconSvg = '<svg viewBox="0 0 1024 1024"><path d="M832 64H192c-35.2 0-64 28.8-64 64v768c0 35.2 28.8 64 64 64h640c35.2 0 64-28.8 64-64V128c0-35.2-28.8-64-64-64zM640 640H384c-17.6 0-32-14.4-32-32s14.4-32 32-32h256c17.6 0 32 14.4 32 32s-14.4 32-32 32zm128-256H384c-17.6 0-32-14.4-32-32s14.4-32 32-32h384c17.6 0 32 14.4 32 32s-14.4 32-32 32z"></path></svg>'
    this.showModal = false
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
    console.log(selection, "diabled selection")
    if (selection == null) return true
    if (selection.anchor.path.join('-') === selection.focus.path.join('-') && selection.anchor.offset === selection.focus.offset) return true
    return false
  }

  // 执行命令
  async exec(editor, value) {
    const selectedText = editor.getSelectionText().trim()
    if (!selectedText) return


    // 创建一个模拟文件
    await this.convertTextToChatChunk(editor)
  }

  async convertTextToChatChunk(editor) {
    const { selection } = editor
    if (!selection) return


    console.log(selection, "selection")
    const nodes = Array.from(SlateEditor.nodes(editor, {
      at: selection,
      match: n => !SlateEditor.isEditor(n) && !n.type
    }))
    console.log(nodes, "nodes")
    const node = nodes[0]
    console.log(node, "node")
    const textNode = node[0]
    console.log(textNode, "textNode")
    const properties = omit(textNode, ['children', 'text'])

    try {
      // 创建唯一的 chunkId (实际应用中可能是后端生成)
      // const chunkId = 'chunk_' + Date.now()

      // // 创建对话块节点
      // const chatChunkNode = {
      //   type: 'chatchunk',
      //   chunkId,
      //   children: [{...properties, text}]
      // }

      // // 删除选中文本
      // editor.deleteFragment()

      // // 插入新节点
      // editor.insertNode(chatChunkNode)
      const generatePrompt = (promptData) => {
        return "please explain selected part below：html structure context:" + promptData.localContextHtml + "selectionText:" + promptData.selectionText;
      }
      const promptData = {
        localContextHtml: editor.getHtml(),
        selectionText: editor.getSelectionText()
      }
      const prompt = generatePrompt(promptData)
      const fetchData = async () => {
        try {

          const requestData = {
            chunkId,
            chatcontext: "Card",
            contextContent: promptData.localContextHtml,
            selectionText: promptData.selectionText,
            chattype: "Explain",
            model: 'deepseek-chat',
            cardId: editor.cardId
          }



          const response = await apiClient.post('/aichat/message', requestData);
          console.log(response, "response")

          if (response.data.success) {
            const { aiMessage: { content } } = response.data.data;

            return response.data?.data;
          } else {
          }

        } catch (err) {
          console.error('转换文本到对话块时出错:', err)
        } finally {
        }
      }
      const chunkId = 'chunk_' + Date.now()
      const recordSelection = editor.selection
      SlateTransforms.wrapNodes(editor, { type: 'ailoadingchunk', chunkId, children: [] }, { split: true })
      // SlateTransforms.unwrapNodes(editor, {
      //   match: n => SlateElement.isElement(n) && n.type === 'ailoadingchunk' && n.chunkId === chunkId,
      // })
      await fetchData()

      SlateTransforms.setNodes(editor, { type: 'chatchunk' }, { split: true, at: [], match: n => SlateElement.isElement(n) && n.type === 'ailoadingchunk' && n.chunkId === chunkId })
      editor.getChatMessageAndShowSidebar && editor.getChatMessageAndShowSidebar(chunkId)
      // SlateTransforms.wrapNodes(editor, { type: 'chatchunk', chunkId, children: [{ ...properties, text }] }, { split: true,match: n => SlateElement.isElement(n) && n.type === 'ailoadingchunk' && n.chunkId === chunkId })
      // editor.deselect();



    } catch (error) {
      console.error('转换文本到对话块时出错:', error)
    }
  }

}

// 配置文本转附件菜单
const textToChatChunkMenuConf = {
  key: 'textToChatChunk',
  factory() {
    return new TextToChatChunkMenu()
  }
}

// 配置渲染函数
const renderElemConf = {
  type: 'chatchunk',
  renderElem: renderChatChunk
}

// 配置 HTML 转换
const elemToHtmlConf = {
  type: 'chatchunk',
  elemToHtml: chatChunkToHtml
}

// 配置 HTML 解析
const parseHtmlConf = {
  selector: 'span[data-w-e-type="chatchunk"]',
  parseElemHtml: parseChatChunkHtml
}

// 配置渲染函数
const renderAiLoadingChunkConf = {
  type: 'ailoadingchunk',
  renderElem: renderAiLoadingChunk
}

// 配置 HTML 转换
const elemToHtmlAiLoadingChunkConf = {
  type: 'ailoadingchunk',
  elemToHtml: aiLoadingChunkToHtml
}

// 配置 HTML 解析
const parseHtmlAiLoadingChunkConf = {
  selector: 'span[data-w-e-type="ailoadingchunk"]',
  parseElemHtml: parseAiLoadingChunkHtml
}

// 导出模块
export const chatChunkModule = {
  editorPlugin: withChatChunk,
  renderElems: [renderElemConf, renderAiLoadingChunkConf],
  elemsToHtml: [elemToHtmlConf, elemToHtmlAiLoadingChunkConf],
  parseElemsHtml: [parseHtmlConf, parseHtmlAiLoadingChunkConf],
  menus: [textToChatChunkMenuConf]
}

export default chatChunkModule 