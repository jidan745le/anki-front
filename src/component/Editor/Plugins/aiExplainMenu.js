import { SlateEditor, SlateTransforms, SlateElement } from '@wangeditor/editor'
import { omit } from 'lodash'
import apiClient from 'src/common/http/apiClient'

class AiExplain {
    constructor() {
        this.title = '';
        this.tag = 'select';
        this.width = 30;
    }

    getOptions(editor) {
        const options = [
            { value: '✨', text: '✨', styleForRenderMenuList: { "display": "none" } },
            { value: 'card', text: 'card' },
            { value: 'deck', text: 'deck' },
        ]
        return options
    }

    getValue(editor) { return '✨'; }
    isActive(editor) { return false; }
    isDisabled(editor) { return false; }
    // exec(editor, value) {
    //     editor.restoreSelection = editor.selection;
    //     editor.lastSelectionText = editor.getSelectionText();
    //     editor.promptData = {
    //         localContextHtml: editor.getHtml(),
    //         selectionText: editor.getSelectionText()
    //     }
    //     console.log(editor.getSelectionPosition(), "editor.getSelectionText(),editor.getSelectionPosition()")
    //     console.log(editor.selection, editor.promptData, editor.children, editor.operations, "editor.getSelectionText(),editor.getSelectionPosition()")
    //     editor.setPosition(editor.getSelectionPosition())
    //     editor.showTooltip(true)
    //     editor.deselect()
    //     editor.insertText(value) // value 即 this.getValue(editor) 的返回值
    //     editor.insertText(' ')
    // }
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
                        const { aiMessage: { content, chat: { uuid } } } = response.data.data;

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

            // SlateTransforms.wrapNodes(editor, { type: 'chatchunk', chunkId, children: [{ ...properties, text }] }, { split: true,match: n => SlateElement.isElement(n) && n.type === 'ailoadingchunk' && n.chunkId === chunkId })
            // editor.deselect();



        } catch (error) {
            console.error('转换文本到对话块时出错:', error)
        }
    }
}

export const aiExplain = {
    key: 'aiExplain',
    factory() {
        return new AiExplain()
    }
}