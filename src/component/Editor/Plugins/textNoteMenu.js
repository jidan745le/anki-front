import { DomEditor, SlateEditor, SlateTransforms } from '@wangeditor/editor';
import { h } from 'snabbdom';
import { getStoredLanguage, translate } from 'src/common/i18n';
import apiClient from '../../../common/http/apiClient';

// 全局 Map 存储每个元素的防抖定时器
const clickTimeoutMap = new Map();

// 定义笔记节点的数据结构
class TextNoteElement {
  type = 'textnote';
  noteId = '';
  noteUuid = '';
  noteContent = '';
  noteColor = '#667eea';
  chunkId = '';
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

  // 为编辑器添加更新笔记的方法
  newEditor.updateNoteByChunkId = (chunkId, noteUuid, noteData) => {
    const nodes = Array.from(
      SlateEditor.nodes(newEditor, {
        at: [],
        match: n => {
          return n && n.type === 'textnote' && n.chunkId === chunkId;
        },
      })
    );

    if (nodes.length > 0) {
      const [node, path] = nodes[0];
      const newProps = {
        ...node,
        noteUuid,
        noteContent: noteData.noteContent || '',
        noteId: noteData.id || node.noteId,
      };

      SlateTransforms.setNodes(newEditor, newProps, { at: path });

      // setTimeout(() => {
      //   SlateTransforms.select(newEditor, {
      //     anchor: { path: [0], offset: 0 },
      //     focus: { path: [0], offset: 10 },
      //   });
      // }, 1000);
      // newEditor.selectAll();
      // alert('updateNoteByChunkId');
    }
  };

  // 为编辑器添加删除笔记的方法
  newEditor.deleteNoteByChunkId = chunkId => {
    const nodes = Array.from(
      SlateEditor.nodes(newEditor, {
        at: [],
        match: n => {
          return n && n.type === 'textnote' && n.chunkId === chunkId;
        },
      })
    );

    if (nodes.length > 0) {
      const [node, path] = nodes[0];
      // 移除笔记标记，保留文本内容
      SlateTransforms.unwrapNodes(newEditor, {
        at: path,
        match: n => {
          return n && n.type === 'textnote' && n.chunkId === chunkId;
        },
      });
    }
  };

  // 为编辑器添加通过 UUID 删除笔记的方法
  newEditor.deleteNoteByUuid = noteUuid => {
    const nodes = Array.from(
      SlateEditor.nodes(newEditor, {
        at: [],
        match: n => {
          return n && n.type === 'textnote' && n.noteUuid === noteUuid;
        },
      })
    );

    if (nodes.length > 0) {
      const [node, path] = nodes[0];
      // 移除笔记标记，保留文本内容
      SlateTransforms.unwrapNodes(newEditor, {
        at: path,
        match: n => {
          return n && n.type === 'textnote' && n.noteUuid === noteUuid;
        },
      });
    }
  };

  newEditor.selectNoteByChunkId = chunkId => {
    const nodes = Array.from(
      SlateEditor.nodes(newEditor, {
        at: [],
        match: n => {
          return n && n.type === 'textnote' && n.chunkId === chunkId;
        },
      })
    );

    if (nodes.length > 0) {
      const [node, path] = nodes[0];
      console.log('selectNoteByChunkId', path);
      // setTimeout(() => {
      //   SlateTransforms.select(newEditor, path);
      // }, 0);
    }
  };

  return newEditor;
}

// 渲染笔记元素
function renderTextNote(elem, children, editor) {
  const {
    noteId = '',
    noteUuid = '',
    noteContent = '',
    noteColor = '#667eea',
    chunkId = '',
  } = elem;

  // 点击处理函数 - 实现防抖：1000ms内如果有第二次点击则取消执行
  const handleClick = e => {
    // e.preventDefault();
    // e.stopPropagation();

    // 使用 chunkId 作为键来获取该元素的定时器
    const existingTimeout = clickTimeoutMap.get(chunkId);

    // 如果已经有定时器在运行，清除它
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      clickTimeoutMap.delete(chunkId);
      return; // 直接返回，不执行后续逻辑
    }

    // 设置1000ms的延迟执行
    const newTimeout = setTimeout(() => {
      // 获取选中的文本
      const selectedText = editor.getSelectionText();

      // 调用编辑器的显示笔记弹窗方法
      if (editor && editor.showNotesModal) {
        editor.showNotesModal({
          noteUuid: noteUuid,
          selectedText,
          chunkId,
          noteId,
          initial: false,
        });
      }

      // 清除定时器引用
      clickTimeoutMap.delete(chunkId);
    }, 250);

    // 存储定时器到 Map 中
    clickTimeoutMap.set(chunkId, newTimeout);
  };

  // 主容器，使用 border-bottom 实现下划线
  return h(
    'span',
    {
      attrs: {
        'data-note-id': noteId,
        'data-note-uuid': noteUuid,
        'data-chunk-id': chunkId,
        'data-w-e-type': 'textnote',
        'data-w-e-is-inline': '',
      },
      style: {
        textDecoration: 'none',
        cursor: 'pointer',
        display: 'inline',
        borderBottom: `2px solid ${noteColor}`,
        transition: 'border-bottom 0.2s ease',
        paddingBottom: '5px', // 稍微调整文本与下划线的间距
      },
      on: {
        click: handleClick,
        mouseenter: e => {
          const target = e.currentTarget;
          if (target && target.style) {
            target.style.borderBottom = `3px solid ${noteColor}`;
          }
        },
        mouseleave: e => {
          const target = e.currentTarget;
          if (target && target.style) {
            target.style.borderBottom = `2px solid ${noteColor}`;
          }
        },
      },
    },
    children
  );
}

// 转换为 HTML
function textNoteToHtml(elem, childrenHtml) {
  const { noteId, noteUuid = '', noteContent = '', noteColor = '#667eea', chunkId = '' } = elem;
  return `<span data-w-e-type="textnote" data-w-e-is-inline data-note-id="${noteId}" data-note-uuid="${noteUuid}" data-note-content="${encodeURIComponent(noteContent)}" data-note-color="${noteColor}" data-chunk-id="${chunkId}" style="display: inline; border-bottom: 2px solid ${noteColor}; padding-bottom: 5px; text-decoration: none; cursor: pointer; transition: border-bottom 0.2s ease;">
    ${childrenHtml}
  </span>`;
}

// 解析 HTML
function parseTextNoteHtml(domElem, children, editor) {
  const noteId = domElem.getAttribute('data-note-id') || '';
  const noteUuid = domElem.getAttribute('data-note-uuid') || '';
  const noteContent = decodeURIComponent(domElem.getAttribute('data-note-content') || '');
  const noteColor = domElem.getAttribute('data-note-color') || '#667eea';
  const chunkId = domElem.getAttribute('data-chunk-id') || '';

  return {
    type: 'textnote',
    noteId,
    noteUuid,
    noteContent,
    noteColor,
    chunkId,
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

  async exec(editor, value) {
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
        // 如果已经是笔记，先调用删除接口，然后取消笔记标记
        const [noteNode] = nodes[0];
        const { noteId } = noteNode;

        // 如果有noteUuid或noteId，调用删除接口
        if (noteId) {
          try {
            // 根据noteUuid或noteId调用删除接口
            const deleteId = noteId;
            await apiClient.delete(`/notes/${deleteId}`);
            console.log('笔记删除成功:', deleteId);
          } catch (error) {
            console.error('删除笔记失败:', error);
            // 即使删除接口失败，也继续执行取消标记操作
          }
        }

        // 取消笔记标记
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
    const chunkId = 'chunk_' + Date.now();
    // const colors = ['#4facfe'];
    const noteColor = '#4facfe';

    // 创建临时笔记节点
    const noteNode = {
      type: 'textnote',
      noteId,
      noteUuid: '',
      noteContent: '',
      noteColor,
      chunkId,
      children: [],
    };

    // 包装选中的文本
    SlateTransforms.wrapNodes(editor, noteNode, { split: true });

    // 显示笔记弹窗
    if (editor.showNotesModal) {
      editor.showNotesModal({
        title: selectedText,
        chunkId,
        noteId: '',
        noteUuid: '',
        selectedText,
        referenceText: selectedText, // 添加引用文本
        initial: true,
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
