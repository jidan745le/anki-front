import { DomEditor, SlateEditor, SlateTransforms } from '@wangeditor/editor';
import { h } from 'snabbdom';
import { getStoredLanguage, translate } from 'src/common/i18n';

// 定义笔记节点的数据结构
class TextNoteElement {
  type = 'textnote';
  noteId = '';
  noteContent = '';
  noteColor = '#667eea';
  children = [];
}

// 插件：标记为 inline 节点
function withTextNote(editor) {
  const { isInline } = editor;
  const newEditor = editor;

  newEditor.isInline = elem => {
    const type = DomEditor.getNodeType(elem);
    if (type === 'textnote') return true;
    return isInline(elem);
  };

  return newEditor;
}

// 渲染笔记元素
function renderTextNote(elem, children, editor) {
  const { noteId = '', noteContent = '', noteColor = '#667eea' } = elem;

  // 点击处理函数
  const handleClick = e => {
    e.preventDefault();
    // e.stopPropagation();
    console.log('handleClick', children);
    const unhangRange = SlateEditor.unhangRange(editor, editor.selection);
    console.log('handleClick unhangRange', editor.selection, unhangRange);
    const nodes = Array.from(
      SlateEditor.nodes(editor, {
        at: unhangRange,
        match: n => !SlateEditor.isEditor(n),
        // mode: 'lowest',
      })
    );
    //all会顺着选区的分支往上找到父节点
    console.log('handleClick nodes', nodes);

    // 获取选中的文本
    const selectedText = children.map(child => child.elm.innerText).join('');
    // 调用编辑器的显示笔记面板方法
    if (editor && editor.showNotePanel) {
      editor.showNotePanel({
        noteId,
        noteContent,
        noteColor,
        selectedText,
      });
    }
  };

  // 创建下划线元素
  const underline = h('span', {
    style: {
      position: 'absolute',
      left: '0',
      right: '0',
      bottom: '6px',
      height: '2px',
      backgroundColor: noteColor,
      transition: 'height 0.2s ease',
      pointerEvents: 'none', // 确保下划线不会阻止点击事件
      zIndex: '10', // 确保在最上层
    },
    attrs: {
      'data-underline': 'true',
    },
  });

  // 主容器
  return h(
    'span',
    {
      attrs: {
        'data-note-id': noteId,
        'data-w-e-type': 'textnote',
        'data-w-e-is-inline': '',
      },
      style: {
        position: 'relative',
        textDecoration: 'none',
        cursor: 'pointer',
        display: 'inline-block', // 改为 inline-block 以支持绝对定位
        paddingBottom: '4px', // 为下划线留出空间
      },
      on: {
        click: handleClick,
        mouseenter: e => {
          const target = e.currentTarget;
          if (target) {
            const underlineEl = target.querySelector('[data-underline="true"]');
            if (underlineEl) {
              underlineEl.style.height = '3px';
              underlineEl.style.bottom = '6px';
            }
          }
        },
        mouseleave: e => {
          const target = e.currentTarget;
          if (target) {
            const underlineEl = target.querySelector('[data-underline="true"]');
            if (underlineEl) {
              underlineEl.style.height = '2px';
              underlineEl.style.bottom = '6px';
            }
          }
        },
      },
    },
    [...children, underline] // 将下划线作为最后一个子元素
  );
}

// 转换为 HTML
function textNoteToHtml(elem, childrenHtml) {
  const { noteId, noteContent = '', noteColor = '#667eea' } = elem;
  return `<span data-w-e-type="textnote" data-w-e-is-inline data-note-id="${noteId}" data-note-content="${encodeURIComponent(noteContent)}" data-note-color="${noteColor}" style="position: relative; display: inline-block; padding-bottom: 4px; text-decoration: none;">
    ${childrenHtml}
    <span style="position: absolute; left: 0; right: 0; bottom: -2px; height: 2px; background-color: ${noteColor}; pointer-events: none; z-index: 10;"></span>
  </span>`;
}

// 解析 HTML
function parseTextNoteHtml(domElem, children, editor) {
  const noteId = domElem.getAttribute('data-note-id') || '';
  const noteContent = decodeURIComponent(domElem.getAttribute('data-note-content') || '');
  const noteColor = domElem.getAttribute('data-note-color') || '#667eea';

  return {
    type: 'textnote',
    noteId,
    noteContent,
    noteColor,
    children,
  };
}

// 简单的笔记菜单类
class TextNoteMenu {
  constructor() {
    const currentLanguage = getStoredLanguage();
    this.title = translate('editor.addNote', currentLanguage, '添加笔记');
    this.iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
  <!-- 编辑笔 -->
  <path fill="#3b82f6" style="fill: #3b82f6 !important;" d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-8.4 8.4a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32l8.4-8.4Z" />
  <!-- 文档 -->
  <path fill="#3b82f6" style="fill: #3b82f6 !important;" d="M5.25 5.25a3 3 0 0 0-3 3v10.5a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3V13.5a.75.75 0 0 0-1.5 0v5.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5V8.25a1.5 1.5 0 0 1 1.5-1.5h5.25a.75.75 0 0 0 0-1.5H5.25Z" />
</svg>
`;
    this.tag = 'button';
  }

  getValue(editor) {
    return '';
  }

  isActive(editor) {
    try {
      const nodes = Array.from(
        SlateEditor.nodes(editor, {
          match: n => {
            return n && n['type'] === 'textnote';
          },
        })
      );
      return nodes.length > 0;
    } catch (error) {
      return false;
    }
  }

  isDisabled(editor) {
    const { selection } = editor;
    if (selection == null) return true;
    if (
      selection.anchor.path.join('-') === selection.focus.path.join('-') &&
      selection.anchor.offset === selection.focus.offset
    ) {
      return true;
    }
    return false;
  }

  exec(editor, value) {
    const selectedText = editor.getSelectionText().trim();
    if (!selectedText) return;

    // 检查是否已经是笔记
    try {
      const nodes = Array.from(
        SlateEditor.nodes(editor, {
          match: n => {
            const node = n;
            return node && node.type === 'textnote';
          },
        })
      );

      if (nodes.length > 0) {
        // 如果已经是笔记，取消笔记标记
        SlateTransforms.unwrapNodes(editor, {
          match: n => {
            const node = n;
            return node && node.type === 'textnote';
          },
        });
        return;
      }
    } catch (error) {
      console.warn('检查笔记状态时出错:', error);
    }

    // 如果不是笔记，添加新笔记
    const { selection } = editor;
    if (!selection) return;

    const noteId = 'note_' + Date.now();
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a'];
    const noteColor = colors[Math.floor(Math.random() * colors.length)];

    // 创建笔记节点
    const noteNode = {
      type: 'textnote',
      noteId,
      noteContent: '',
      noteColor,
      children: [],
    };

    // 包装选中的文本
    SlateTransforms.wrapNodes(editor, noteNode, { split: true });

    // 显示右侧面板以编辑笔记
    if (editor.showNotePanel) {
      editor.showNotePanel({
        noteId,
        noteContent: '',
        noteColor,
        selectedText,
      });
    }
  }
}

// 配置
const textNoteMenuConf = {
  key: 'textNote',
  factory() {
    return new TextNoteMenu();
  },
};

const renderElemConf = {
  type: 'textnote',
  renderElem: renderTextNote,
};

const elemToHtmlConf = {
  type: 'textnote',
  elemToHtml: textNoteToHtml,
};

const parseHtmlConf = {
  selector: 'span[data-w-e-type="textnote"]',
  parseElemHtml: parseTextNoteHtml,
};

// 导出模块
export const textNoteModule = {
  editorPlugin: withTextNote,
  renderElems: [renderElemConf],
  elemsToHtml: [elemToHtmlConf],
  parseElemsHtml: [parseHtmlConf],
  menus: [textNoteMenuConf],
};

export default textNoteModule;
