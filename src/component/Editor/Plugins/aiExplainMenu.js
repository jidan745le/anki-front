import { SlateEditor, SlateElement, SlateTransforms } from '@wangeditor/editor';
import { message } from 'antd';
import { omit } from 'lodash';
import apiClient from 'src/common/http/apiClient';
import { getStoredLanguage, translate } from 'src/common/i18n';

const initChunkSession = async (requestData, handleAudioCleanupOnNavigation) => {
  try {
    let isInterrupt;
    handleAudioCleanupOnNavigation &&
      (isInterrupt = await handleAudioCleanupOnNavigation.current.handleAudioCleanupOnNavigation());
    if (isInterrupt) {
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    const response = await apiClient.post('/aichat/initSession', requestData);
    console.log(response, 'response');

    if (response.data.success) {
      return response.data?.data;
    } else {
    }
  } catch (err) {
    console.error('转换文本到对话块时出错:', err);
    message.error(err.response.data.message);
  } finally {
  }
};

class AiExplain {
  constructor() {
    const currentLanguage = getStoredLanguage();
    this.title = translate('editor.explainInCard', currentLanguage, '在卡片中解释选择文本');
    this.iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="size-6" style="fill: #fbbf24 !important;">
  <path fill="#fbbf24" fill-rule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clip-rule="evenodd" />
</svg>`;

    this.tag = 'button';
    this.width = 30;
  }

  // getOptions(editor) {
  //   const options = [
  //     { value: '✨', text: '✨', styleForRenderMenuList: { display: 'none' } },
  //     { value: 'card', text: 'card' },
  //     { value: 'deck', text: 'deck' },
  //   ];
  //   return options;
  // }

  getValue(editor) {
    return '✨';
  }
  isActive(editor) {
    return false;
  }
  isDisabled(editor) {
    const nodes = Array.from(
      SlateEditor.nodes(editor, {
        match: n => {
          return n && (n['type'] === 'chatchunk' || n['type'] === 'ailoadingchunk');
        },
      })
    );
    return nodes.length > 0;
  }

  async exec(editor, value) {
    const selectedText = editor.getSelectionText().trim();
    if (!selectedText) return;

    await this.convertTextToChatChunk(editor);
  }

  async convertTextToChatChunk(editor) {
    const { selection } = editor;
    if (!selection) return;

    console.log(selection, 'selection');
    const nodes = Array.from(
      SlateEditor.nodes(editor, {
        at: selection,
        match: n => !SlateEditor.isEditor(n) && !n.type,
      })
    );
    console.log(nodes, 'nodes');
    const node = nodes[0];
    console.log(node, 'node');
    const textNode = node[0];
    console.log(textNode, 'textNode');
    const properties = omit(textNode, ['children', 'text']);

    try {
      const chunkId = 'chunk_' + Date.now();

      const promptData = {
        localContextHtml: editor.getHtml(),
        selectionText: editor.getSelectionText(),
      };
      const requestData = {
        chunkId,
        chatcontext: 'Card',
        contextContent: promptData.localContextHtml,
        selectionText: promptData.selectionText,
        chattype: 'Explain',
        model: 'deepseek-chat',
        cardId: editor.cardId,
        // 添加角色支持
        character: editor.characterId || undefined,
        socketId: editor.socketId || undefined,
      };

      SlateTransforms.wrapNodes(
        editor,
        { type: 'ailoadingchunk', chunkId, children: [] },
        { split: true }
      );

      editor.deselect();

      const data = await initChunkSession(requestData, editor.cleanupOnNavigation);
      const sessionId = data.sessionId;

      SlateTransforms.setNodes(
        editor,
        { type: 'chatchunk' },
        {
          split: true,
          at: [],
          match: n =>
            SlateElement.isElement(n) && n.type === 'ailoadingchunk' && n.chunkId === chunkId,
        }
      );
      console.log('editor.onInitChunkChatSession', editor.onInitChunkChatSession);
      // editor.getChatMessageAndShowSidebar && editor.getChatMessageAndShowSidebar(chunkId);
      editor.onInitChunkChatSession && editor.onInitChunkChatSession(requestData, sessionId);
    } catch (error) {
      console.error('转换文本到对话块时出错:', error);
    }
  }
}

class AiGlobalExplain {
  constructor() {
    const currentLanguage = getStoredLanguage();
    this.title = translate('editor.explainInDeck', currentLanguage, '在牌组中解释选择文本');
    this.iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" style="fill: #fbbf24 !important;">
  <!-- 灯泡主体 -->
  <path fill="#fbbf24" d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7z"/>
  <!-- 灯泡底座第一条线 -->
  <path fill="#fbbf24" d="M9 18h6v1H9z"/>
  <!-- 灯泡底座第二条线 -->
  <path fill="#fbbf24" d="M10 20h4v1h-4z"/>
  <!-- 灯泡内部高光效果 -->
  <path fill="#fbbf24" opacity="0.6" d="M8 9c0-2.21 1.79-4 4-4 .55 0 1 .45 1 1s-.45 1-1 1c-1.1 0-2 .9-2 2 0 .55-.45 1-1 1s-1-.45-1-1z"/>
</svg>`;

    this.tag = 'button';
    this.width = 30;
  }

  // getOptions(editor) {
  //   const options = [
  //     { value: '✨', text: '✨', styleForRenderMenuList: { display: 'none' } },
  //     { value: 'card', text: 'card' },
  //     { value: 'deck', text: 'deck' },
  //   ];
  //   return options;
  // }

  getValue(editor) {
    return '💡';
  }
  isActive(editor) {
    return false;
  }

  isDisabled(editor) {
    const nodes = Array.from(
      SlateEditor.nodes(editor, {
        match: n => {
          return n && (n['type'] === 'chatchunk' || n['type'] === 'ailoadingchunk');
        },
      })
    );
    return nodes.length > 0;
  }

  async exec(editor, value) {
    const selectedText = editor.getSelectionText().trim();
    if (!selectedText) return;

    await this.convertTextToChatChunk(editor);
  }

  async convertTextToChatChunk(editor) {
    const { selection } = editor;
    if (!selection) return;

    console.log(selection, 'selection');
    const nodes = Array.from(
      SlateEditor.nodes(editor, {
        at: selection,
        match: n => !SlateEditor.isEditor(n) && !n.type,
      })
    );
    console.log(nodes, 'nodes');
    const node = nodes[0];
    console.log(node, 'node');
    const textNode = node[0];
    console.log(textNode, 'textNode');
    const properties = omit(textNode, ['children', 'text']);
    let chunkId = '';

    try {
      chunkId = 'chunk_' + Date.now();

      const promptData = {
        localContextHtml: editor.getHtml(),
        selectionText: editor.getSelectionText(),
      };
      const requestData = {
        chunkId,
        chatcontext: 'Deck',
        contextContent: promptData.localContextHtml,
        selectionText: promptData.selectionText,
        chattype: 'Explain',
        model: 'deepseek-chat',
        cardId: editor.cardId,
        // 添加角色支持
        character: editor.characterId || undefined,
        socketId: editor.socketId || undefined,
      };

      SlateTransforms.wrapNodes(
        editor,
        { type: 'ailoadingchunk', chunkId, children: [] },
        { split: true }
      );

      editor.deselect();

      const data = await initChunkSession(requestData, editor.cleanupOnNavigation); // 调用cleanupOnNavigation方法，清理之前的语音播放和朗读
      const sessionId = data.sessionId;

      SlateTransforms.setNodes(
        editor,
        { type: 'chatchunk' },
        {
          split: true,
          at: [],
          match: n =>
            SlateElement.isElement(n) && n.type === 'ailoadingchunk' && n.chunkId === chunkId,
        }
      );
      console.log('editor.onInitChunkChatSession', editor.onInitChunkChatSession);
      // editor.getChatMessageAndShowSidebar && editor.getChatMessageAndShowSidebar(chunkId);
      editor.onInitChunkChatSession && editor.onInitChunkChatSession(requestData, sessionId);
    } catch (error) {
      console.error('转换文本到对话块时出错:', error);
      SlateTransforms.unwrapNodes(editor, {
        at: [],
        match: n => {
          const node = n;
          return node && node.type === 'ailoadingchunk' && node.chunkId === chunkId;
        },
      });
    }
  }
}

export const aiExplain = {
  key: 'aiExplain',
  factory() {
    return new AiExplain();
  },
};

export const aiGlobalExplain = {
  key: 'aiGlobalExplain',
  factory() {
    return new AiGlobalExplain();
  },
};
