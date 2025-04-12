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

const aiAsk = {
    key: 'aiAsk',
    factory() {
        return new AiAsk()
    }
}

export default aiAsk;