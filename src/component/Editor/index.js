import { Boot, SlateEditor, SlatePath, SlateTransforms } from '@wangeditor/editor';
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { aiExplain, aiGlobalExplain } from './Plugins/aiExplainMenu';
import { chatChunkModule } from './Plugins/chatChunk';
import { textNoteModule } from './Plugins/textNoteMenu';
import NotePanel from './components/NoteBook';

Boot.registerMenu(aiExplain);
Boot.registerMenu(aiGlobalExplain);
// Boot.registerMenu(aiAsk);
Boot.registerModule(chatChunkModule);
Boot.registerModule(textNoteModule);

// Houdini Paint Worklet 代码
const initializeHoudiniWorklet = () => {
  if (!CSS.paintWorklet) {
    console.warn('CSS Paint API not supported in this browser');
    return false;
  }

  const workletCode = `
    registerPaint('titleHighlighter', class {
      static get inputProperties() {
        return [
          '--highlight-color',
          '--highlight-opacity',
          '--title-rect-x',
          '--title-rect-y', 
          '--title-rect-width',
          '--title-rect-height',
          '--border-radius'
        ];
      }
      
      paint(ctx, size, props) {
        // 获取CSS变量
        const color = props.get('--highlight-color').toString();
        const opacity = parseFloat(props.get('--highlight-opacity').toString() || '0.25');
        const x = parseFloat(props.get('--title-rect-x').toString() || '0');
        const y = parseFloat(props.get('--title-rect-y').toString() || '0');
        const width = parseFloat(props.get('--title-rect-width').toString() || '0');
        const height = parseFloat(props.get('--title-rect-height').toString() || '0');
        const borderRadius = parseFloat(props.get('--border-radius').toString() || '4');
        
        // 解析RGB颜色
        let r = 120, g = 208, b = 248; // 默认蓝色
        if (color.startsWith('rgb')) {
          const rgbMatch = color.match(/rgb\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)/);
          if (rgbMatch) {
            r = parseInt(rgbMatch[1]);
            g = parseInt(rgbMatch[2]);
            b = parseInt(rgbMatch[3]);
          }
        } else if (color.startsWith('#')) {
          r = parseInt(color.substring(1, 3), 16);
          g = parseInt(color.substring(3, 5), 16);
          b = parseInt(color.substring(5, 7), 16);
        }
        
        // 设置填充颜色
        ctx.fillStyle = \`rgba(\${r}, \${g}, \${b}, \${opacity})\`;
        
        // 绘制圆角矩形
        if (width > 0 && height > 0) {
          if (borderRadius > 0) {
            const rad = Math.min(borderRadius, width/2, height/2);
            ctx.beginPath();
            ctx.moveTo(x + rad, y);
            ctx.lineTo(x + width - rad, y);
            ctx.arcTo(x + width, y, x + width, y + rad, rad);
            ctx.lineTo(x + width, y + height - rad);
            ctx.arcTo(x + width, y + height, x + width - rad, y + height, rad);
            ctx.lineTo(x + rad, y + height);
            ctx.arcTo(x, y + height, x, y + height - rad, rad);
            ctx.lineTo(x, y + rad);
            ctx.arcTo(x, y, x + rad, y, rad);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillRect(x, y, width, height);
          }
        }
      }
    });
  `;

  try {
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);
    CSS.paintWorklet.addModule(workletUrl);
    return true;
  } catch (error) {
    console.error('Failed to initialize Houdini worklet:', error);
    return false;
  }
};

const CardEditor = forwardRef(
  (
    {
      title,
      value,
      cardUUID,
      isNew,
      onChange,
      showAIChatSidebar,
      getChatMessageAndShowSidebar,
      onInitChunkChatSession,
      config = {},
    },
    ref
  ) => {
    const [editor, setEditor] = useState(null); // 存储 editor 实例
    const [html, setHtml] = useState('');
    const initialFlag = useRef(false);
    const isNewFlag = useRef(isNew);
    const preHtmlStr = useRef('');
    const [position, setPosition] = useState({ left: 0, top: 0 });
    const editorContainerRef = useRef(null);
    const { autoMarkTitle = false } = config;
    const autoMarkTitleRef = useRef(autoMarkTitle);
    const houdiniSupportRef = useRef(false);
    const titleHighlightTimeoutRef = useRef(null);
    const resizeObserverRef = useRef(null);

    // 笔记面板状态管理
    const [notePanelVisible, setNotePanelVisible] = useState(false);
    const [currentNoteData, setCurrentNoteData] = useState(null);

    // 显示笔记面板
    const showNotePanel = noteData => {
      console.log(noteData, 'noteData showNotePanel');
      setCurrentNoteData(noteData);
      setNotePanelVisible(true);
    };

    // 隐藏笔记面板
    const hideNotePanel = noteData => {
      const nodes = Array.from(
        SlateEditor.nodes(editor, {
          at: [],
          match: n => {
            return n && n['type'] === 'textnote' && n['noteId'] === noteData.noteId;
          },
        })
      );
      const node = nodes[0][0];
      console.log(node, 'node');
      if (!node.noteContent) {
        setNotePanelVisible(false);
        SlateTransforms.unwrapNodes(editor, {
          at: [],
          match: n => {
            return n && n['type'] === 'textnote' && n['noteId'] === noteData.noteId;
          },
        });
      } else {
        setNotePanelVisible(false);
      }
      setCurrentNoteData(null);
    };

    // 更新笔记内容
    const updateNoteContent = (noteId, newContent) => {
      if (!editor) return;
      console.log(editor, currentNoteData, 'editor');

      // 查找并更新对应的笔记节点
      const nodes = Array.from(
        SlateEditor.nodes(editor, {
          at: [],
          match: n => {
            return n && n['type'] === 'textnote' && n['noteId'] === noteId;
          },
        })
      );
      console.log(nodes, 'nodes');

      if (nodes.length > 0) {
        const [node, path] = nodes[0];
        const updateData = {};
        updateData['noteContent'] = newContent;
        SlateTransforms.setNodes(editor, updateData, { at: path });

        // 更新当前显示的数据
        setCurrentNoteData(prev => ({
          ...prev,
          noteContent: newContent,
        }));
        // setNotePanelVisible(false);
      }
    };

    // 初始化 Houdini Worklet
    useEffect(() => {
      houdiniSupportRef.current = initializeHoudiniWorklet();
    }, []);

    // 清除ai loading chunk
    const clearAiLoadingChunk = () => {
      SlateTransforms.unwrapNodes(editor, {
        at: [],
        match: n => {
          const node = n;
          return node && node.type === 'ailoadingchunk';
        },
      });
    };

    useImperativeHandle(
      ref,
      () => ({
        clearAiLoadingChunk,
      }),
      [editor]
    );

    // 查找标题文本在DOM中的位置
    const findTitlePosition = useCallback((titleText, containerElement) => {
      if (!titleText || !containerElement) return null;

      const walker = document.createTreeWalker(containerElement, NodeFilter.SHOW_TEXT, {
        acceptNode: function (node) {
          return node.textContent.includes(titleText)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      });

      let textNode;
      while ((textNode = walker.nextNode())) {
        const text = textNode.textContent;
        const titleIndex = text.indexOf(titleText);

        if (titleIndex !== -1) {
          // 创建范围来获取标题文本的位置
          const range = document.createRange();
          range.setStart(textNode, titleIndex);
          range.setEnd(textNode, titleIndex + titleText.length);

          const rects = Array.from(range.getClientRects());
          if (rects.length > 0) {
            const rect = rects[0];
            const containerRect = containerElement.getBoundingClientRect();

            return {
              x: rect.left - containerRect.left,
              y: rect.top - containerRect.top,
              width: rect.width,
              height: rect.height,
            };
          }
        }
      }

      return null;
    }, []);

    // 应用 Houdini 高亮
    const applyHoudiniHighlight = useCallback(
      (titleText, enable = true) => {
        if (!houdiniSupportRef.current || !editorContainerRef.current) {
          console.warn('Houdini not supported or editor container not ready');
          return;
        }

        const containerElement = editorContainerRef.current;

        if (!enable) {
          // 清除高亮
          containerElement.style.removeProperty('background-image');
          containerElement.style.removeProperty('--title-rect-x');
          containerElement.style.removeProperty('--title-rect-y');
          containerElement.style.removeProperty('--title-rect-width');
          containerElement.style.removeProperty('--title-rect-height');
          return;
        }

        // 延迟查找位置，确保DOM已更新
        if (titleHighlightTimeoutRef.current) {
          clearTimeout(titleHighlightTimeoutRef.current);
        }

        titleHighlightTimeoutRef.current = setTimeout(() => {
          console.log(containerElement, titleText, 'containerElement');
          const titlePosition = findTitlePosition(titleText, containerElement);
          console.log(titlePosition, 'containerElement titlePosition');

          if (titlePosition) {
            // 设置CSS变量
            containerElement.style.setProperty('--highlight-color', 'rgb(120, 208, 248)');
            containerElement.style.setProperty('--highlight-opacity', '0.3');
            containerElement.style.setProperty('--title-rect-x', `${titlePosition.x}px`);
            containerElement.style.setProperty('--title-rect-y', `${titlePosition.y}px`);
            containerElement.style.setProperty('--title-rect-width', `${titlePosition.width}px`);
            containerElement.style.setProperty('--title-rect-height', `${titlePosition.height}px`);
            containerElement.style.setProperty('--border-radius', '4');

            // 应用 Paint Worklet
            containerElement.style.backgroundImage = 'paint(titleHighlighter)';

            console.log('Applied Houdini highlight for title:', titleText, titlePosition);
          } else {
            containerElement.style.removeProperty('background-image');
            containerElement.style.removeProperty('--title-rect-x');
            containerElement.style.removeProperty('--title-rect-y');
            containerElement.style.removeProperty('--title-rect-width');
            containerElement.style.removeProperty('--title-rect-height');
            console.warn('Title not found in DOM:', titleText);
          }
        });
      },
      [findTitlePosition]
    );

    // 替换原来的 useEffect，使用 Houdini 实现
    useEffect(() => {
      if (autoMarkTitleRef.current !== autoMarkTitle) {
        autoMarkTitleRef.current = autoMarkTitle;

        if (title && editor && editorContainerRef.current) {
          if (autoMarkTitle) {
            applyHoudiniHighlight(title, true);
          } else {
            applyHoudiniHighlight(title, false);
          }
        }
      }
    }, [autoMarkTitle, title, editor, applyHoudiniHighlight]);

    // 监听编辑器容器大小变化和窗口大小变化
    useEffect(() => {
      const handleResize = () => {
        if (title && autoMarkTitle && editor) {
          applyHoudiniHighlight(title, true);
        }
      };

      // 监听窗口大小变化
      window.addEventListener('resize', handleResize);

      // 监听编辑器容器大小变化
      if (editorContainerRef.current && window.ResizeObserver) {
        resizeObserverRef.current = new ResizeObserver(entries => {
          for (const entry of entries) {
            console.log('Editor container resized:', entry.contentRect);
            handleResize();
          }
        });

        resizeObserverRef.current.observe(editorContainerRef.current);
      }

      return () => {
        // 清理窗口监听器
        window.removeEventListener('resize', handleResize);

        // 清理 ResizeObserver
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
          resizeObserverRef.current = null;
        }

        // 清理定时器
        if (titleHighlightTimeoutRef.current) {
          clearTimeout(titleHighlightTimeoutRef.current);
        }
      };
    }, [title, autoMarkTitle, editor, applyHoudiniHighlight]);

    // 当编辑器创建时设置 ResizeObserver
    const handleEditorCreated = useCallback(
      editor => {
        setEditor(editor);
        editorContainerRef.current = editor.getEditableContainer();

        // 注入笔记面板相关方法
        editor.showNotePanel = showNotePanel;
        editor.hideNotePanel = hideNotePanel;
        editor.updateNoteContent = updateNoteContent;

        // 设置 ResizeObserver 监听编辑器容器
        if (editorContainerRef.current && window.ResizeObserver) {
          // 如果已有观察器，先断开
          if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
          }

          resizeObserverRef.current = new ResizeObserver(entries => {
            for (const entry of entries) {
              console.log('Editor container resized:', entry.contentRect);
              // 容器大小变化时重新计算标题位置
              if (title && autoMarkTitle) {
                applyHoudiniHighlight(title, true);
              }
            }
          });

          resizeObserverRef.current.observe(editorContainerRef.current);
        }

        setTimeout(() => {
          editor.dangerouslyInsertHtml(value);
          initialFlag.current = true;
        });
      },
      [
        title,
        autoMarkTitle,
        applyHoudiniHighlight,
        value,
        showNotePanel,
        hideNotePanel,
        updateNoteContent,
      ]
    );

    // 监听编辑器内容变化，重新计算标题位置
    const handleEditorChange = useCallback(
      editor => {
        console.log(editor, editor.selection, 'editor.selection');

        if (initialFlag.current) {
          preHtmlStr.current = editor.getHtml();
          console.log(preHtmlStr.current, editor.children, 'editor.getHtml() titleLocation');

          // 使用 Houdini 高亮标题
          if (title && autoMarkTitle) {
            applyHoudiniHighlight(title, true);
          }

          //第一次有意义赋值
          if (isNew) {
            console.log(html, editor, editor.marks, editor.getHtml(), 'initial3');
            editor.selectAll();
            editor.addMark('fontSize', '22px');
            editor.deselect();
          }

          initialFlag.current = false;
          return;
        } else {
          let curHtmlStr = editor.getHtml();
          if (preHtmlStr.current && curHtmlStr !== preHtmlStr.current) {
            preHtmlStr.current = curHtmlStr;
            onChange && onChange(curHtmlStr);

            // 内容变化时重新应用高亮
            if (title && autoMarkTitle) {
              applyHoudiniHighlight(title, true);
            }
          }
          console.log(curHtmlStr, editor.children, 'editor.getHtml()');
        }
      },
      [title, autoMarkTitle, isNew, html, onChange, applyHoudiniHighlight]
    );

    // 添加一个额外的监听器来处理编辑器样式变化
    useEffect(() => {
      if (!editorContainerRef.current) return;

      const containerElement = editorContainerRef.current;

      // 使用 MutationObserver 监听样式变化
      const mutationObserver = new MutationObserver(mutations => {
        let shouldRecalculate = false;

        mutations.forEach(mutation => {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            // 检查是否是影响布局的样式变化
            const target = mutation.target;
            if (target === containerElement || containerElement.contains(target)) {
              shouldRecalculate = true;
            }
          }

          if (mutation.type === 'childList') {
            // DOM结构变化也需要重新计算
            shouldRecalculate = true;
          }
        });

        if (shouldRecalculate && title && autoMarkTitle) {
          console.log('DOM mutation detected, recalculating title position');
          applyHoudiniHighlight(title, true);
        }
      });

      mutationObserver.observe(containerElement, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        childList: true,
        subtree: true,
      });

      return () => {
        mutationObserver.disconnect();
      };
    }, [title, autoMarkTitle, applyHoudiniHighlight]);

    const toolbarConfig = {
      insertKeys: {
        index: 0,
        keys: ['aiExplain', 'aiGlobalExplain', 'textNote'], // 添加笔记菜单
      },
      excludeKeys: ['todo', 'redo', 'undo', 'fullScreen'],
    };
    const editorConfig = {
      placeholder: '请输入内容...',

      hoverbarKeys: {
        link: {
          menuKeys: ['editLink', 'unLink', 'viewLink'],
        },
        image: {
          menuKeys: [
            'imageWidth30',
            'imageWidth50',
            'imageWidth100',
            'editImage',
            'viewImageLink',
            'deleteImage',
          ],
        },
        pre: {
          menuKeys: ['enter', 'codeBlock', 'codeSelectLang'],
        },
        table: {
          menuKeys: [
            'enter',
            'tableHeader',
            'tableFullWidth',
            'insertTableRow',
            'deleteTableRow',
            'insertTableCol',
            'deleteTableCol',
            'deleteTable',
          ],
        },
        divider: {
          menuKeys: ['enter'],
        },
        video: {
          menuKeys: ['enter', 'editVideoSize'],
        },
        text: {
          menuKeys: [
            'aiExplain',
            'aiGlobalExplain',
            'textNote',
            'headerSelect',
            'insertLink',
            'bulletedList',
            '|',
            'bold',
            'underline',
            'italic',
            'through',
            'color',
            'bgColor',
            'clearStyle',
          ],
        },
      },
      plugins: [chatChunkModule, textNoteModule],
    };

    // 及时销毁 editor
    useEffect(() => {
      if (editor) {
        editor.cardId = cardUUID;
        editor.showAIChatSidebar = showAIChatSidebar;
        editor.getChatMessageAndShowSidebar = getChatMessageAndShowSidebar;
        editor.onInitChunkChatSession = onInitChunkChatSession;
        console.log(
          editor.getConfig(),
          editor.getConfig().hoverbarKeys,
          editor.getMenuConfig(),
          editor.getAllMenuKeys(),
          '1111111'
        );

        // 监听selection变化
      }
      return () => {
        if (editor == null) return;
        editor.destroy();
        console.log('destroy');
        setEditor(null);
      };
    }, [editor]);

    const insertTextBelow = (editor, text) => {
      const { selection } = editor;
      console.log(editor.restoreSelection, editor, 'selection');
      if (!editor.restoreSelection) return;

      // 获取当前行的路径
      const [node, path] = SlateEditor.node(editor, editor.restoreSelection || selection);
      console.log(node, path, SlatePath.next(path), editor.children, 'node, path');
      // 创建新的段落节点
      const newNode = {
        type: 'paragraph',
        children: [{ text, fontSize: '22px' }],
      };

      // 在下一行插入
      SlateTransforms.insertNodes(editor, newNode, {
        at: [path[0] + 1],
      });
    };

    const insertHtmlBelow = (editor, htmlContent) => {
      const { selection } = editor;
      if (!editor.restoreSelection) return;
      console.log(editor.restoreSelection, selection, 'editor.restoreSelection');

      // Get current path
      const [node, path] = SlateEditor.node(editor, editor.restoreSelection || selection);
      const newNode = {
        type: 'paragraph',
        children: [{ text: '', fontSize: '22px' }],
      };
      SlateTransforms.insertNodes(editor, newNode, {
        at: [path[0] + 1],
      });
      // SlateTransforms.select(editor, editor.restoreSelection)

      SlateTransforms.select(editor, {
        anchor: { path: [path[0] + 1, 0], offset: 0 },
        focus: { path: [path[0] + 1, 0], offset: 0 },
      });

      console.log(node, path, 'node, path');
      // Move cursor to the end of current selection
      // editor.select(editor.restoreSelection)

      // Insert the HTML content below the current paragraph
      editor.dangerouslyInsertHtml(htmlContent);
      editor.select({
        anchor: { path: [path[0] + 1, 0], offset: 0 },
        focus: editor.selection['focus'],
      });
      editor.addMark('fontSize', '22px');
      editor.addMark('color', '#ff0000'); // 文字颜色

      // console.log(editor.selection, "editor.selection")
      // SlateTransforms.removeNodes(editor, {
      //     at: [path[0] + 1]
      // })
    };

    function insertText() {
      if (editor == null) return;
      editor.insertText(' hello ');
    }

    function printHtml() {
      if (editor == null) return;
      console.log(editor.getHtml());
    }

    const traverseDOMLeafNodes = (containerElement, callback) => {
      if (!containerElement) return;

      // 创建 TreeWalker 来遍历文本节点
      const walker = document.createTreeWalker(
        containerElement,
        NodeFilter.SHOW_TEXT, // 只显示文本节点
        {
          acceptNode: function (node) {
            // 过滤掉空白节点和不可见节点
            if (node.textContent.trim() === '') {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      let currentNode;
      let index = 0;

      while ((currentNode = walker.nextNode())) {
        callback(currentNode, index);
        index++;
      }
    };

    return (
      <>
        {/* <div>
                <button onClick={insertText}>insert text</button>
                <button onClick={printHtml}>print html</button>
            </div> */}

        <div
          style={{
            position: 'relative',
            marginTop: '15px',
            display: 'flex',
            flex: 1,
          }}
        >
          <div
            style={{
              width: notePanelVisible ? '80%' : '100%',
              transition: 'width 0.3s',
              display: 'flex',
              border: '1px solid #ccc',
              flex: 1,
              flexDirection: 'column',
            }}
          >
            <Toolbar
              editor={editor}
              defaultConfig={toolbarConfig}
              mode="default"
              style={{ borderBottom: '1px solid #ccc' }}
            />
            <Editor
              defaultConfig={editorConfig}
              onCreated={handleEditorCreated}
              onChange={handleEditorChange}
              mode="default"
              style={{ flex: 1, overflow: 'auto' }}
            />
          </div>

          {notePanelVisible && (
            <NotePanel
              noteData={currentNoteData}
              onUpdateNote={updateNoteContent}
              onClose={hideNotePanel}
              isVisible={notePanelVisible}
            />
          )}
        </div>
        {/* <div style={{ marginTop: '15px' }}>
                {html}
            </div> */}
      </>
    );
  }
);

export default CardEditor;
