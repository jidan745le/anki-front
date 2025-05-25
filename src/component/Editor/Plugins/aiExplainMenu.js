import { SlateEditor, SlateElement, SlateTransforms } from '@wangeditor/editor';
import { omit } from 'lodash';
import apiClient from 'src/common/http/apiClient';

const initChunkSession = async requestData => {
  try {
    const response = await apiClient.post('/aichat/initSession', requestData);
    console.log(response, 'response');

    if (response.data.success) {
      return response.data?.data;
    } else {
    }
  } catch (err) {
    console.error('转换文本到对话块时出错:', err);
  } finally {
  }
};

class AiExplain {
  constructor() {
    this.title = 'explain';
    this.iconSvg =
      '<svg viewBox="0 0 1024 1024"><path d="M832 64H192c-35.2 0-64 28.8-64 64v768c0 35.2 28.8 64 64 64h640c35.2 0 64-28.8 64-64V128c0-35.2-28.8-64-64-64zM640 640H384c-17.6 0-32-14.4-32-32s14.4-32 32-32h256c17.6 0 32 14.4 32 32s-14.4 32-32 32zm128-256H384c-17.6 0-32-14.4-32-32s14.4-32 32-32h384c17.6 0 32 14.4 32 32s-14.4 32-32 32z"></path></svg>';
    this.tag = 'select';
    this.width = 30;
  }

  getOptions(editor) {
    const options = [
      { value: '✨', text: '✨', styleForRenderMenuList: { display: 'none' } },
      { value: 'card', text: 'card' },
      { value: 'deck', text: 'deck' },
    ];
    return options;
  }

  getValue(editor) {
    return '✨';
  }
  isActive(editor) {
    return false;
  }
  isDisabled(editor) {
    return false;
  }

  async exec(editor, value) {
    const selectedText = editor.getSelectionText().trim();
    if (!selectedText) return;

    await this.convertTextToChatChunk(editor, value);
  }

  async convertTextToChatChunk(editor, contextType) {
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
        chatcontext: contextType === 'deck' ? 'Deck' : 'Card',
        contextContent: promptData.localContextHtml,
        selectionText: promptData.selectionText,
        chattype: 'Explain',
        model: 'deepseek-chat',
        cardId: editor.cardId,
      };

      SlateTransforms.wrapNodes(
        editor,
        { type: 'ailoadingchunk', chunkId, children: [] },
        { split: true }
      );

      const data = await initChunkSession(requestData);
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
      // editor.getChatMessageAndShowSidebar && editor.getChatMessageAndShowSidebar(chunkId);
      editor.onInitChunkChatSession && editor.onInitChunkChatSession(requestData, sessionId);
    } catch (error) {
      console.error('转换文本到对话块时出错:', error);
    }
  }
}

export const aiExplain = {
  key: 'aiExplain',
  factory() {
    return new AiExplain();
  },
};
