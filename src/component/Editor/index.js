import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import { IDomEditor, IEditorConfig, IToolbarConfig, Boot, SlateTransforms, SlateEditor, SlatePath } from '@wangeditor/editor'
import React, { useEffect, useState, useRef } from 'react'

import { addSpanBelowP } from "../../common/util/util"
import { Modal } from 'antd'
import StreamingTooltip from '../StreamingTooltip'

class AiExplain  {
    constructor() {
        this.title = '✨';
        this.tag = 'button';
        this.width = 30;
    }

    getValue(editor) { return ''; }
    isActive(editor) { return false; }
    isDisabled(editor) { return false; }
    exec(editor, value) {
        editor.restoreSelection = editor.selection;
        editor.lastSelectionText = editor.getSelectionText();        
        editor.promptData = {   
            localContextHtml: editor.getHtml(),
            selectionText: editor.getSelectionText()
        }
        console.log(editor.getSelectionPosition(), "editor.getSelectionText(),editor.getSelectionPosition()")
        console.log(editor.selection, editor.promptData, editor.children, editor.operations, "editor.getSelectionText(),editor.getSelectionPosition()")
        editor.setPosition(editor.getSelectionPosition())
        editor.showTooltip(true)
        editor.deselect()
        editor.insertText(value) // value 即 this.getValue(editor) 的返回值
        editor.insertText(' ')
    }
}

class AiGlobalExplain  {
    constructor() {
        this.title = '💡';
        this.tag = 'button';
        this.width = 30;
    }

    getValue(editor) { return ''; }
    isActive(editor) { return false; }
    isDisabled(editor) { return false; }
    exec(editor, value) {
        editor.restoreSelection = editor.selection;
        editor.lastSelectionText = editor.getSelectionText();        
        editor.promptData = {   
            localContextHtml: editor.getHtml(),
            selectionText: editor.getSelectionText(),
            isAskMode: false,
            isGlobalExplain: true
        }
        console.log(editor.getSelectionPosition(), "editor.getSelectionText(),editor.getSelectionPosition()")
        console.log(editor.selection, editor.promptData, editor.children, editor.operations, "editor.getSelectionText(),editor.getSelectionPosition()")
        editor.setPosition(editor.getSelectionPosition())
        editor.showTooltip(true)
        editor.deselect()
        editor.insertText(value) // value 即 this.getValue(editor) 的返回值
        editor.insertText(' ')
    }
}

class AiAsk {
    constructor() {
        this.title = '💬';
        this.tag = 'button';
        this.width = 30;
    }

    getValue(editor) { return ''; }
    isActive(editor) { return false; }
    isDisabled(editor) { return false; }
    exec(editor, value) {
        editor.restoreSelection = editor.selection;
        editor.lastSelectionText = editor.getSelectionText();        
        editor.promptData = {   
            localContextHtml: editor.getHtml(),
            selectionText: editor.getSelectionText(),
            isAskMode: true // 添加标识区分是ASK模式
        }
        
        const position = editor.getSelectionPosition();
        editor.setPosition(position);
        editor.showTooltip(true);
        editor.deselect();
    }
}
const aiExplain = {
    key: 'aiExplain',
    factory() {
        return new AiExplain()
    }
}
const aiAsk = {
    key: 'aiAsk',
    factory() {
        return new AiAsk()
    }
}
const aiGlobalExplain = {
    key: 'aiGlobalExplain',
    factory() {
        return new AiGlobalExplain()
    }
}
Boot.registerMenu(aiExplain)
Boot.registerMenu(aiAsk)
Boot.registerMenu(aiGlobalExplain)

function CardEditor({ title, value,cardUUID, isNew, onChange, showAIChatSidebar, config = {} }) {
    const [editor, setEditor] = useState(null) // 存储 editor 实例
    const [html, setHtml] = useState("")
    const initialFlag = useRef(false)
    const isNewFlag = useRef(isNew)
    const preHtmlStr = useRef("")
    const [position, setPosition] = useState({ left: 0, top: 0 })
    const [showTooltip, setShowTooltip] = useState(false)
    const editorContainerRef = useRef(null)
    const { autoMarkTitle = false } = config
    const autoMarkTitleRef = useRef(autoMarkTitle)

    useEffect(() => {
        if (autoMarkTitleRef.current !== autoMarkTitle) {
            autoMarkTitleRef.current = autoMarkTitle
            if (title) {
                try {
                    // First deselect any existing selection
                    // editor.deselect();
                    if (!autoMarkTitle) {
                        editor.children.forEach((node, index) => {
                            if (node.children) {
                                node.children.forEach((child, childIndex) => {
                                    console.log(child, childIndex, "child")
                                    if (child.text === title) {
                                        console.log(child, childIndex, "child1")

                                        SlateTransforms.select(editor, {
                                            anchor: { path: [index, childIndex], offset: 0 },
                                            focus: { path: [index, childIndex], offset: title.length }
                                        });
                                        editor.removeMark('bgColor')
                                        editor.deselect()
                                    }
                                })
                            }
                        })
                    } else {
                        // Find the title text and highlight it
                        editor.children.forEach((node, index) => {
                            if (node.children) {
                                node.children.forEach((child, childIndex) => {
                                    const titleIndex = child.text.indexOf(title);
                                    if (titleIndex !== -1) {
                                        // Select the title text
                                        SlateTransforms.select(editor, {
                                            anchor: { path: [index, childIndex], offset: titleIndex },
                                            focus: { path: [index, childIndex], offset: titleIndex + title.length }
                                        });
                                        // Add background color mark
                                        editor.addMark('bgColor', 'rgb(255, 251, 143)');
                                        // Deselect after highlighting
                                        editor.deselect();
                                    }
                                })

                            }
                        })
                    };
                } catch (error) {
                    console.error('Error highlighting title:', error);
                }
            }
        }
    }, [autoMarkTitle])


    const toolbarConfig = {
        insertKeys: {
            index: 0,
            keys: ['aiExplain', 'aiAsk', 'aiGlobalExplain'], // show menu in toolbar
        }
    }
    const editorConfig = {
        placeholder: '请输入内容...',

        hoverbarKeys: {
            "link": {
                "menuKeys": [
                    "editLink",
                    "unLink",
                    "viewLink"
                ]
            },
            "image": {
                "menuKeys": [
                    "imageWidth30",
                    "imageWidth50",
                    "imageWidth100",
                    "editImage",
                    "viewImageLink",
                    "deleteImage"
                ]
            },
            "pre": {
                "menuKeys": [
                    "enter",
                    "codeBlock",
                    "codeSelectLang"
                ]
            },
            "table": {
                "menuKeys": [
                    "enter",
                    "tableHeader",
                    "tableFullWidth",
                    "insertTableRow",
                    "deleteTableRow",
                    "insertTableCol",
                    "deleteTableCol",
                    "deleteTable"
                ]
            },
            "divider": {
                "menuKeys": [
                    "enter"
                ]
            },
            "video": {
                "menuKeys": [
                    "enter",
                    "editVideoSize"
                ]
            },
            "text": {
                "menuKeys": [
                    "aiExplain",
                    "aiAsk",
                    "aiGlobalExplain",
                    "headerSelect",
                    "insertLink",
                    "bulletedList",
                    "|",
                    "bold",
                    "underline",
                    "italic",
                    "through",
                    "color",
                    "bgColor",
                    "clearStyle"
                ]
            }
        }

    }

    // 及时销毁 editor
    useEffect(() => {
        if (editor) {

            console.log(editor.getConfig(), editor.getConfig().hoverbarKeys, editor.getMenuConfig(), editor.getAllMenuKeys(), "1111111")

            // 监听selection变化


        }
        return () => {

            if (editor == null) return
            editor.destroy()
            console.log("destroy")
            setEditor(null)
        }
    }, [editor])

    const insertTextBelow = (editor, text) => {
        const { selection } = editor
        console.log(editor.restoreSelection, editor, "selection")
        if (!editor.restoreSelection) return

        // 获取当前行的路径
        const [node, path] = SlateEditor.node(editor, editor.restoreSelection || selection)
        console.log(node, path, SlatePath.next(path), editor.children, "node, path")
        // 创建新的段落节点
        const newNode = {
            type: 'paragraph',
            children: [{ text, fontSize: '22px' }]
        }

        // 在下一行插入
        SlateTransforms.insertNodes(editor, newNode, {
            at: [path[0] + 1]
        })
    }

    const insertHtmlBelow = (editor, htmlContent) => {
        const { selection } = editor
        if (!editor.restoreSelection) return
        console.log(editor.restoreSelection, selection, "editor.restoreSelection")

        // Get current path
        const [node, path] = SlateEditor.node(editor, editor.restoreSelection || selection)
        const newNode = {
            type: 'paragraph',
            children: [{ text: '', fontSize: '22px' }]
        }
        SlateTransforms.insertNodes(editor, newNode, {
            at: [path[0] + 1]
        })
        // SlateTransforms.select(editor, editor.restoreSelection)

        SlateTransforms.select(editor, { anchor: { path: [path[0] + 1, 0], offset: 0 }, focus: { path: [path[0] + 1, 0], offset: 0 } })

        console.log(node, path, "node, path")
        // Move cursor to the end of current selection
        // editor.select(editor.restoreSelection)

        // Insert the HTML content below the current paragraph
        editor.dangerouslyInsertHtml(htmlContent)
        editor.select({ anchor: { path: [path[0] + 1, 0], offset: 0 }, focus: editor.selection["focus"] })
        editor.addMark('fontSize', '22px');
        editor.addMark('color', '#ff0000')      // 文字颜色

        // console.log(editor.selection, "editor.selection")
        // SlateTransforms.removeNodes(editor, {
        //     at: [path[0] + 1]
        // })
    }



    function insertText() {
        if (editor == null) return
        editor.insertText(' hello ')
    }

    function printHtml() {
        if (editor == null) return
        console.log(editor.getHtml())
    }



    return (
        <>
            {/* <div>
                <button onClick={insertText}>insert text</button>
                <button onClick={printHtml}>print html</button>
            </div> */}

            <div style={{ border: '1px solid #ccc', zIndex: 100, marginTop: '15px', position: "relative" }}>
                <Toolbar

                    editor={editor}
                    defaultConfig={toolbarConfig}
                    mode="default"
                    style={{ borderBottom: '1px solid #ccc' }}
                />
                <Editor
                    defaultConfig={editorConfig}

                    // value={html}    

                    onCreated={(editor) => {
                        setEditor(editor)
                        editorContainerRef.current = editor.getEditableContainer()

                        editor.setPosition = setPosition;
                        editor.showTooltip = setShowTooltip;

                        setTimeout(() => {
                            editor.dangerouslyInsertHtml(value)
                            initialFlag.current = true;

                        })

                    }}

                    onChange={editor => {
                        console.log(editor, editor.selection, "editor.selection")

                        if (initialFlag.current) {
                            preHtmlStr.current = editor.getHtml()
                            console.log(preHtmlStr.current, editor.children, "editor.getHtml() titleLocation")
                            if (title && autoMarkTitle) {
                                try {
                                    // First deselect any existing selection
                                    editor.deselect();

                                    // Find the title text and highlight it
                                    editor.children.forEach((node, index) => {
                                        if (node.children) {
                                            node.children.forEach((child, childIndex) => {
                                                const titleIndex = child.text.indexOf(title);
                                                if (titleIndex !== -1) {
                                                    // Select the title text
                                                    SlateTransforms.select(editor, {
                                                        anchor: { path: [index, childIndex], offset: titleIndex },
                                                        focus: { path: [index, childIndex], offset: titleIndex + title.length }
                                                    });
                                                    // Add background color mark
                                                    editor.addMark('bgColor', 'rgb(255, 251, 143)');
                                                    // Deselect after highlighting
                                                    editor.deselect();
                                                }
                                            })

                                        }
                                    })
                                } catch (error) {
                                    console.error('Error highlighting title:', error);
                                }
                            }

                            //第一次有意义赋值
                            if (isNew) {
                                // alert("isNew")
                                //innerdangerouslyInsertHtmlC初始化
                                console.log(html, editor, editor.marks, editor.getHtml(), "initial3")
                                editor.selectAll();
                                editor.addMark('fontSize', '22px');
                                editor.deselect()
                            }

                            initialFlag.current = false
                            //字体初始化设为24px
                            // setHtml(addSpanBelowP(editor.getHtml()))
                            return
                        } else {
                            let curHtmlStr = editor.getHtml();
                            if (preHtmlStr.current && curHtmlStr !== preHtmlStr.current) {
                                preHtmlStr.current = curHtmlStr  // setHtml(addSpanBelowP(editor.getHtml()))
                                onChange && onChange(curHtmlStr)
                            }
                            console.log(curHtmlStr, editor.children, "editor.getHtml()")

                        }
                    }}
                    mode="default"
                    style={{ height: '600px' }}
                />
                {showTooltip && (
                    <StreamingTooltip                     
                        showAIChatSidebar={showAIChatSidebar}
                        containerEl={editorContainerRef.current}
                        position={position}
                        promptData={editor.promptData}
                        onClose={() => setShowTooltip(false)}
                        cardId={cardUUID}
                        // onInsert={(value) => { insertTextBelow(editor, value) }}
                        onInsertHtml={(value) => { insertHtmlBelow(editor, value) }}
                    />
                )}

            </div>
            {/* <div style={{ marginTop: '15px' }}>
                {html}
            </div> */}
        </>
    )
}

export default CardEditor;