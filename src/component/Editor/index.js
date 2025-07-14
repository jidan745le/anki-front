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
import useSocket from '../../common/hooks/useSocket';
import { API_BASE_URL } from '../../common/util/env';
import { aiExplain, aiGlobalExplain } from './Plugins/aiExplainMenu';
import { chatChunkModule } from './Plugins/chatChunk';
import { textNoteModule } from './Plugins/textNoteMenu';
import { textToSpeechModule } from './Plugins/textToSpeechMenu';
import { wordDictionaryModule } from './Plugins/wordDictionaryMenu';
import NotesModalIntegration from './components/NotesModalIntegration';

Boot.registerMenu(aiExplain);
Boot.registerMenu(aiGlobalExplain);
Boot.registerMenu(wordDictionaryModule);
// Boot.registerMenu(aiAsk);
Boot.registerModule(chatChunkModule);
Boot.registerModule(textNoteModule);
Boot.registerModule(textToSpeechModule);

// Houdini Paint Worklet 代码
const initializeHoudiniWorklet = () => {
  if (!CSS.paintWorklet) {
    console.warn('CSS Paint API not supported in this browser');
    return false;
  }

  // 检查是否已经注册过
  if (window.houdiniWorkletRegistered) {
    console.log('Houdini worklet already registered');
    return true;
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
          '--border-radius',
          '--text-highlight-color',
          '--text-highlight-opacity',
          '--text-highlight-rect-x',
          '--text-highlight-rect-y',
          '--text-highlight-rect-width',
          '--text-highlight-rect-height'
        ];
      }
      
      paint(ctx, size, props) {
        // 绘制矩形高亮的通用函数
        const drawHighlight = (color, opacity, x, y, width, height, borderRadius = 4) => {
          if (width <= 0 || height <= 0) return;
          
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
        };
        
        // 获取标题高亮的CSS变量
        const titleColor = props.get('--highlight-color').toString();
        const titleOpacity = parseFloat(props.get('--highlight-opacity').toString() || '0');
        const titleX = parseFloat(props.get('--title-rect-x').toString() || '0');
        const titleY = parseFloat(props.get('--title-rect-y').toString() || '0');
        const titleWidth = parseFloat(props.get('--title-rect-width').toString() || '0');
        const titleHeight = parseFloat(props.get('--title-rect-height').toString() || '0');
        const borderRadius = parseFloat(props.get('--border-radius').toString() || '4');
        
        // 获取文本高亮的CSS变量
        const textColor = props.get('--text-highlight-color').toString();
        const textOpacity = parseFloat(props.get('--text-highlight-opacity').toString() || '0');
        const textX = parseFloat(props.get('--text-highlight-rect-x').toString() || '0');
        const textY = parseFloat(props.get('--text-highlight-rect-y').toString() || '0');
        const textWidth = parseFloat(props.get('--text-highlight-rect-width').toString() || '0');
        const textHeight = parseFloat(props.get('--text-highlight-rect-height').toString() || '0');
        
        // 绘制标题高亮
        if (titleOpacity > 0) {
          drawHighlight(titleColor, titleOpacity, titleX, titleY, titleWidth, titleHeight, borderRadius);
        }
        
        // 绘制文本高亮
        if (textOpacity > 0) {
          drawHighlight(textColor, textOpacity, textX, textY, textWidth, textHeight, borderRadius);
        }
      }
    });
  `;

  try {
    const blob = new Blob([workletCode], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);

    return CSS.paintWorklet
      .addModule(workletUrl)
      .then(() => {
        window.houdiniWorkletRegistered = true;
        console.log('Houdini worklet registered successfully');
        return true;
      })
      .catch(error => {
        // 如果已经注册过，也认为是成功的
        if (error.message && error.message.includes('already registered')) {
          window.houdiniWorkletRegistered = true;
          console.log('Houdini worklet was already registered');
          return true;
        }
        console.error('Failed to register Houdini worklet:', error);
        return false;
      });
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
      characterId,
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
    const { socketId } = useSocket();

    // 模拟userCard数据，实际使用时应该从props传入
    const userCard = {
      uuid: cardUUID,
      id: cardUUID,
      front: title || '卡片',
    };

    // 初始化 Houdini Worklet
    useEffect(() => {
      const initWorklet = async () => {
        try {
          houdiniSupportRef.current = await initializeHoudiniWorklet();
        } catch (error) {
          console.error('Failed to initialize Houdini worklet:', error);
          houdiniSupportRef.current = false;
        }
      };

      initWorklet();
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
            containerElement.style.setProperty('--highlight-color', 'rgb(255, 248, 136)');
            containerElement.style.setProperty('--highlight-opacity', '0.6');
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

    // 通用文本高亮功能（供插件使用）
    const applyTextHighlight = useCallback(
      (text, enable = true, color = 'rgb(255, 248, 136)', opacity = '0.6') => {
        if (!houdiniSupportRef.current || !editorContainerRef.current) {
          console.warn('Houdini not supported or editor container not ready');
          return;
        }

        const containerElement = editorContainerRef.current;

        if (!enable) {
          // 清除高亮
          containerElement.style.removeProperty('--text-highlight-color');
          containerElement.style.removeProperty('--text-highlight-opacity');
          containerElement.style.removeProperty('--text-highlight-rect-x');
          containerElement.style.removeProperty('--text-highlight-rect-y');
          containerElement.style.removeProperty('--text-highlight-rect-width');
          containerElement.style.removeProperty('--text-highlight-rect-height');

          // 移除文本高亮的背景图片
          const currentBg = containerElement.style.backgroundImage;
          if (currentBg && currentBg.includes('paint(titleHighlighter)')) {
            // 如果只有文本高亮，完全移除
            if (!containerElement.style.getPropertyValue('--title-rect-x')) {
              containerElement.style.removeProperty('background-image');
            }
          }
          return;
        }

        // 查找文本位置
        const textPosition = findTitlePosition(text, containerElement);

        if (textPosition) {
          // 设置文本高亮的CSS变量
          containerElement.style.setProperty('--text-highlight-color', color);
          containerElement.style.setProperty('--text-highlight-opacity', opacity);
          containerElement.style.setProperty('--text-highlight-rect-x', `${textPosition.x}px`);
          containerElement.style.setProperty('--text-highlight-rect-y', `${textPosition.y}px`);
          containerElement.style.setProperty(
            '--text-highlight-rect-width',
            `${textPosition.width}px`
          );
          containerElement.style.setProperty(
            '--text-highlight-rect-height',
            `${textPosition.height}px`
          );

          // 应用 Paint Worklet
          containerElement.style.backgroundImage = 'paint(titleHighlighter)';

          console.log('Applied text highlight for:', text, textPosition);
        } else {
          console.warn('Text not found in DOM:', text);
        }
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
        // alert('editorCreated');
        setEditor(editor);
        editorContainerRef.current = editor.getEditableContainer();

        // 注入笔记面板相关方法
        // editor.showNotePanel = showNotePanel;
        // editor.hideNotePanel = hideNotePanel;
        // editor.updateNoteContent = updateNoteContent;

        // 注入文本高亮功能
        editor.applyTextHighlight = applyTextHighlight;

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
          console.log(editorContainerRef.current, 'editorContainerRef.current');
          editor.dangerouslyInsertHtml(value);
          initialFlag.current = true;
        });
      },
      [
        title,
        autoMarkTitle,
        applyHoudiniHighlight,
        value,
        // showNotePanel,
        // hideNotePanel,
        // updateNoteContent,
      ]
    );

    // 监听编辑器内容变化，重新计算标题位置
    const handleEditorChange = useCallback(
      editor => {
        // console.log(
        //   editor,
        //   JSON.stringify(editor.selection),
        //   'editor.selection',
        //   new Error().stack
        // );

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
            if (editor.getHtml() === '<p><br></p>') {
              return;
            }
            editor.selectAll();
            editor.addMark('fontSize', '24px');
            //每一个段落居中
            // SlateTransforms.setNodes(
            //   editor,
            //   { textAlign: 'left' },
            //   {
            //     at: [],
            //     match: n => SlateElement.isElement(n) && n.type === 'paragraph',
            //   }
            // );
            editor.deselect();
          } else {
            //防止滚动
            editor.selectAll();
            // editor.addMark('fontSize', '24px');
            //每一个段落居中
            // SlateTransforms.setNodes(
            //   editor,
            //   { textAlign: 'center' },
            //   { at: [], match: n => SlateElement.isElement(n) && n.type === 'paragraph' }
            // );
            editor.deselect();
          }

          initialFlag.current = false;
          // setTimeout(() => {
          //   editorContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          // }, 100);

          return;
        } else {
          let curHtmlStr = editor.getHtml();
          console.log(curHtmlStr, 'curHtmlStr');
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
      // insertKeys: {
      //   index: 0,
      //   keys: ['aiExplain', 'aiGlobalExplain', 'textNote', 'textToSpeech', 'wordDictionary'], // 添加字典查询菜单
      // },
      excludeKeys: ['todo', 'redo', 'undo', 'fullScreen'],
    };
    const editorConfig = {
      placeholder: '请输入内容...',

      // 图片上传配置

      MENU_CONF: {
        uploadImage: {
          // 服务端地址 - 使用现有的upload-temp接口
          server: `${API_BASE_URL}/file/upload-permanent`,

          // form-data fieldName，默认值 'wangeditor-uploaded-image'
          fieldName: 'file',

          // 单个文件的最大体积限制，默认为 2M
          maxFileSize: 5 * 1024 * 1024, // 5M

          // 最多可上传几个文件，默认为 100
          maxNumberOfFiles: 10,

          // 选择文件时的类型限制，默认为 ['image/*']
          allowedFileTypes: ['image/*'],

          // 自定义增加 http header
          headers: {
            authorization: `Bearer ${localStorage.getItem('token') || ''}`,
          },

          // 跨域是否传递 cookie ，默认为 false
          withCredentials: false,

          // 超时时间，默认为 10 秒
          timeout: 10 * 1000, // 10 秒

          // 小于该值就插入 base64 格式（而不上传），默认为 0
          base64LimitSize: 5 * 1024, // 5kb

          // 上传之前触发 - 完全跳过验证（调试版本）
          onBeforeUpload(file) {
            console.log(file, 'file');
            return file;
          },

          // 上传进度的回调函数
          onProgress(progress) {
            console.log('📈 上传进度:', progress + '%');
          },

          // 单个文件上传成功之后
          onSuccess(file, res) {
            console.log('✅ 上传成功:', file.name, res);
          },

          // 单个文件上传失败
          onFailed(file, res) {
            console.error('❌ 上传失败:', file.name, res);
          },

          // 上传错误，或者触发 timeout 超时
          onError(file, err, res) {
            console.error('💥 上传出错:', file.name, err, res);
          },

          // 自定义插入图片（适配upload-temp接口返回格式）
          customInsert(res, insertFn) {
            console.log('🖼️ 处理服务器响应:', res);

            try {
              // 适配不同的响应格式
              let imageUrl = '';
              let alt = '';
              let href = '';

              // 标准wangEditor格式
              if (res.errno === 0 && res.data && res.data.url) {
                imageUrl = res.data.url;
                alt = res.data.alt || '';
                href = res.data.href || '';
              }
              // 自定义格式 - success字段
              else if (res.success && res.data) {
                imageUrl = res.data.url || res.data.fileUrl || res.data.path || res.data.tempFileId;
                alt = res.data.alt || res.data.originalName || '';
                href = res.data.href || '';
              }
              // 直接返回URL的格式
              else if (typeof res === 'string' && res.startsWith('http')) {
                imageUrl = res;
              }
              // 其他可能的格式
              else if (res.url) {
                imageUrl = res.url;
                alt = res.alt || '';
                href = res.href || '';
              }

              if (imageUrl) {
                console.log('✨ 插入图片:', imageUrl);
                insertFn(imageUrl, alt, href);
              } else {
                console.error('❌ 无法从响应中提取图片URL:', res);
                // 如果是tempFileId，尝试构造URL
                if (res.data && res.data.tempFileId) {
                  const tempUrl = `${API_BASE_URL}/file/permanent/${res.data.tempFileId}`;
                  console.log('🔄 尝试使用临时文件URL:', tempUrl);
                  insertFn(tempUrl, alt, href);
                }
              }
            } catch (error) {
              console.error('💥 处理响应时出错:', error, res);
            }
          },
        },
      },
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
            'textToSpeech',
            'wordDictionary',
            // 'headerSelect',
            // 'insertLink',
            // 'bulletedList',
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
        editor.socketId = socketId;
        editor.cardId = cardUUID;
        editor.characterId = characterId;
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
    }, [editor, socketId]);

    // 单独的useEffect来更新characterId，避免重新创建编辑器
    useEffect(() => {
      if (editor) {
        editor.characterId = characterId;
      }
    }, [editor, characterId]);

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
            height: '100%',
          }}
        >
          <div
            style={{
              width: '100%',
              display: 'flex',
              border: '1px solid #ccc',
              flex: 1,
              flexDirection: 'column',
              height: '100%',
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
              style={{ flex: 1, overflow: 'auto', height: '100%' }}
            />
          </div>

          {/* 笔记弹窗集成组件 */}
          <NotesModalIntegration editor={editor} userCard={userCard} />
        </div>
        {/* <div style={{ marginTop: '15px' }}>
                {html}
            </div> */}
      </>
    );
  }
);

export default CardEditor;
