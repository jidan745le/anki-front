import { Editor, Toolbar } from '@wangeditor/editor-for-react'
import { IDomEditor, IEditorConfig, IToolbarConfig, Boot, SlateTransforms, SlateEditor, SlatePath } from '@wangeditor/editor'
import React, { useEffect, useState, useRef } from 'react'
import { set } from 'lodash'
import { addSpanBelowP } from "../../common/util/util"
import { Modal } from 'antd'
import StreamingTooltip from '../StreamingTooltip'

class MyMenuClass {
    constructor() {
        this.title = '✨',
            // this.iconSvg = '<svg>...</svg>'
        this.tag = 'button'
        this.width = 30
    }

    getOptions(editor) {
        const options = [
            { value: 'beijing', text: '北京', styleForRenderMenuList: { 'font-size': '32px', 'font-weight': 'bold' } },
            { value: 'shanghai', text: '上海', selected: true },
            { value: 'shenzhen', text: '深圳' }
        ]
        return options
    }

    getValue(editor) {
        return 'shanghai' // 匹配 options 其中一个 value
    }
    isActive(editor) {

        return false // or true
    }
    isDisabled(editor) {
        return false // or true
    }
    exec(editor, value) {
        editor.restoreSelection = editor.selection;
        editor.lastSelectionText = editor.getSelectionText();
        console.log(editor.getSelectionPosition(), "editor.getSelectionText(),editor.getSelectionPosition()")
        console.log(editor.selection, editor.operations, "editor.getSelectionText(),editor.getSelectionPosition()")
        editor.setPosition(editor.getSelectionPosition())
        editor.showTooltip(true)

        // Modal.info({
        //     title: 'This is a notification message',
        //     mask: false,
        //     content: (
        //         <div>
        //             <p>Value: {value}</p>
        //             <p>editor.getSelectionText(): {editor.getSelectionText()}</p>
        //             <p>editor.getSelectionPosition(): </p>
        //         </div>
        //     ),
        //     onOk() { 
        //         const insertTextBelow = (editor, text) => {
        //             const { selection } = editor
        //             console.log(restoreSelection, editor,"selection")
        //             if (!restoreSelection) return

        //             // 获取当前行的路径
        //             const [node, path] = SlateEditor.node(editor, restoreSelection)
        //             console.log(node, path,SlatePath.next(path),editor.children, "node, path")
        //             // 创建新的段落节点
        //             const newNode = {
        //               type: 'paragraph',
        //               children: [{ text }]
        //             }

        //             // 在下一行插入
        //             SlateTransforms.insertNodes(editor, newNode, {
        //               at: [path[0]+1]
        //             })                
        //           }
        //           insertTextBelow(editor, 'hello')
        //     },
        // })
        editor.deselect()
        // editor.insertText(' ')
        // return false;
        // editor.insertText(value) // value 即 this.getValue(editor) 的返回值
        // editor.insertText(' ')
    }
}

const myMenuConf = {
    key: 'myMenu',
    factory() {
        return new MyMenuClass()
    }
}

Boot.registerMenu(myMenuConf)

function CardEditor({ value, isNew, onChange }) {
    const [editor, setEditor] = useState(null) // 存储 editor 实例
    const [html, setHtml] = useState("")
    const initialFlag = useRef(false)
    const isNewFlag = useRef(isNew)
    const preHtmlStr = useRef("")
    const [position, setPosition] = useState({ left: 0, top: 0 })
    const [showTooltip, setShowTooltip] = useState(false)
    const editorContainerRef = useRef(null)
   

    const toolbarConfig = {
        insertKeys: {
            index: 0,
            keys: ['myMenu'], // show menu in toolbar
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
                    "myMenu",
                    "headerSelect",
                    "insertLink",
                    "bulletedList",
                    "|",
                    "bold",
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
        console.log(editor.restoreSelection, editor,"selection")
        if (!editor.restoreSelection) return

        // 获取当前行的路径
        const [node, path] = SlateEditor.node(editor, editor.restoreSelection || selection)
        console.log(node, path,SlatePath.next(path),editor.children, "node, path")
        // 创建新的段落节点
        const newNode = {
          type: 'paragraph',
          children: [{ text, fontSize: '22px' }]
        }

        // 在下一行插入
        SlateTransforms.insertNodes(editor, newNode, {
          at: [path[0]+1]
        })                
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
                {/* <Toolbar

                    editor={editor}
                    defaultConfig={toolbarConfig}
                    mode="default"
                    style={{ borderBottom: '1px solid #ccc' }}
                /> */}
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
                        if (initialFlag.current) {
                            preHtmlStr.current = editor.getHtml()

                            //第一次有意义赋值
                            if (isNew) {
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
                        }
                    }}
                    mode="default"
                    style={{ height: '600px' }}
                />
                {showTooltip && (
                    <StreamingTooltip     
                        containerEl={editorContainerRef.current}            
                        position={position}
                        prompt={editor.lastSelectionText}
                        onClose={() => setShowTooltip(false)}
                        apiEndpoint='http://8.222.155.238:3001/chat'
                        onInsert={(value) => {insertTextBelow(editor, value)}}
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