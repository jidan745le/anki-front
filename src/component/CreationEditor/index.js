/**
 * @description React wangEditor usage
 * @author wangfupeng
 */

import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import '@wangeditor/editor/dist/css/style.css';
import React, { useEffect, useState } from 'react';
function parseAnkiTemplate(template, fields) {
  let result = template;

  // 1. 处理基础字段替换 {{字段名}}
  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    const regex = new RegExp(`{{${fieldName}}}`, 'g');
    result = result.replace(regex, fieldValue || '');
  }

  // 2. 处理条件语句 {{#字段名}} 内容 {{/字段名}} - 递归处理
  let hasConditionals = true;
  let maxIterations = 10; // 防止无限循环
  let iterations = 0;

  while (hasConditionals && iterations < maxIterations) {
    const beforeReplace = result;

    result = result.replace(/{{#([^}]+)}}([\s\S]*?){{\/\1}}/g, (match, fieldName, content) => {
      const fieldValue = fields[fieldName];
      if (fieldValue && fieldValue.trim() !== '') {
        // 递归处理条件内容中的模板语法
        return parseAnkiTemplate(content, fields);
      }
      return '';
    });

    // 如果没有更多替换，退出循环
    hasConditionals = beforeReplace !== result;
    iterations++;
  }

  // 3. 处理反向条件语句 {{^字段名}} 内容 {{/字段名}} - 递归处理
  let hasReverseConditionals = true;
  iterations = 0;

  while (hasReverseConditionals && iterations < maxIterations) {
    const beforeReplace = result;

    result = result.replace(/{{\^([^}]+)}}([\s\S]*?){{\/\1}}/g, (match, fieldName, content) => {
      const fieldValue = fields[fieldName];
      if (!fieldValue || fieldValue.trim() === '') {
        // 递归处理条件内容中的模板语法
        return parseAnkiTemplate(content, fields);
      }
      return '';
    });

    hasReverseConditionals = beforeReplace !== result;
    iterations++;
  }

  // 4. 处理hint语法 {{hint:字段名}}
  result = result.replace(/{{hint:([^}]+)}}/g, (match, fieldName) => {
    const fieldValue = fields[fieldName];
    if (!fieldValue || fieldValue.trim() === '') {
      return '';
    }

    const hintId = 'hint' + Math.random().toString(36).substr(2, 9);
    return `<a class="hint" href="#" onclick="this.style.display='none';
document.getElementById('${hintId}').style.display='block';
return false;" draggable="false">
${fieldName}</a>
<div id="${hintId}" class="hint" style="display: none">${fieldValue}</div>`;
  });

  // 5. 处理音频文件 [sound:filename]
  result = result.replace(/\[sound:([^\]]+)\]/g, (match, filename) => {
    return `<audio controls><source src="${filename}" type="audio/mpeg"></audio>`;
  });

  // 6. 处理text:字段名语法（提取纯文本）
  result = result.replace(/{{text:([^}]+)}}/g, (match, fieldName) => {
    const fieldValue = fields[fieldName] || '';
    return fieldValue.replace(/<[^>]*>/g, '');
  });

  return result;
}

function renderAnkiCard(frontTemplate, backTemplate, fields) {
  const frontSide = parseAnkiTemplate(frontTemplate, fields);

  let backSide = backTemplate;
  backSide = backSide.replace(/{{FrontSide}}/g, frontSide);
  backSide = parseAnkiTemplate(backSide, fields);

  return {
    front: frontSide,
    back: backSide,
  };
}

const templates = {
  front:
    '<h1 class="R">RECITE</h1>\n<p><span class="Word">{{单词}}</span>\n<p><div class="PhoneticSymbol">{{音标}}</div>\n<p><hr class="POSR" />{{发音}}<hr class="POSR" />',
  back: '{{FrontSide}}\n<p>\n{{#词性1}}\n\t<h class="POSR">{{词性1}}</h>\n{{/词性1}}\n{{#释义1}}\n\t<span class="Paraphrase">{{释义1}}</span>\n{{/释义1}}\n{{#词性2}}<p>\n\t<h class="POSR">{{词性2}}</h>\n{{/词性2}}\n{{#释义2}}\n\t<span class="Paraphrase">{{释义2}}</span>\n{{/释义2}}\n\n{{#例句}}\n<p><br>\n\t<div class="En" style="border-left: 3px solid #338eca;">{{例句}}</div>\n\t{{#例句翻译}}<div class="Zh" style="border-left: 3px solid #338eca;">{{例句翻译}}</div>{{/例句翻译}}\n{{/例句}}\n\n{{#词组短语}}\n<br>\n\t<hr class="POSR" style="width:100%;" />\n\t<div class="hint">{{hint:词组短语}}</div>\n{{/词组短语}}\n{{#拓展}}\n\t<hr class="POSR" style="width:100%;" />\n\t<div class="hint">{{hint:拓展}}</div>\n{{/拓展}}',
};

const fields = {
  单词: 'maybe',
  音标: "['meɪbiː; -bɪ]",
  词性1: '',
  释义1: 'adv. 也许；可能；大概 n. 可能性；不确定性',
  词性2: '',
  释义2: '',
  发音: '[sound:maybe.mp3]',
  例句: 'So maybe if you routinely borrowed billions of dollars overnight, you could get the same deal.',
  例句翻译: '',
  拓展: '<font size=6 color=purple>maybe</font><font color=gold> ★★★★☆</font><head><meta http-equiv=""Content-Type"" content=""text/html; charset=utf-8"" /><link href=""collins.css"" rel=""stylesheet"" type=""text/css"" /></head><div class=""tab_content"" id=""dict_tab_101"" style=""display:block""><div class=""part_main""><div class=""collins_content""><div class=""collins_en_cn""><div class=""caption""><span class=""num"">1.</span><span class=""st"" tid=""1_38585"">ADV\t副词</span><span class=""text_blue"">或许;大概;可能</span> You use <b>maybe</b> to express uncertainty, for example when you do not know that something is definitely true, or when you are mentioning something that may possibly happen in the future in the way you describe. <span ><div   id=""word_gram_1_38585""><div ><div><br>【搭配模式】：ADV with cl/group</div><div><br>【语用信息】：vagueness</div></div></div></span></div><ul><li ><p>Maybe she is in love...</p><p>她大概是恋爱了。</p></li><li ><p>Maybe he sincerely wanted to help his country...</p><p>或许他是诚心诚意地想帮助自己的祖国。</p></li><li ><p>I do think about having children, <span class=\'text_blue\'>maybe</span> when I\'m 40...</p><p>我的确在考虑要孩子的问题，也许等到我40岁吧。</p></li><li  class=""sentence_1""><p>Things are <span class=\'text_blue\'>maybe</span> not as good as they should be...</p><p>情况也许并没有情理之中那么好。</p></li><li  class=""sentence_1""><p>Bill will come on then <span class=\'text_blue\'>maybe</span> Ralph, then Bobby and Johnny doing their hits.</p><p>比尔先上，然后大概是拉尔夫，接下来是博比和约翰尼击球。</p></li></ul></div><div class=""collins_en_cn""><div class=""caption""><span class=""num"">2.</span><span class=""st"" tid=""2_38586"">ADV\t副词</span><span class=""text_blue"">也许，或许(用于提出建议、作出礼貌的请求等)</span> You use <b>maybe</b> when you are making suggestions or giving advice. <b>Maybe</b> is also used to introduce polite requests. <span ><div   id=""word_gram_2_38586""><div ><div><br>【搭配模式】：ADV with cl/group</div><div><br>【语用信息】：politeness</div></div></div></span></div><ul><li ><p>Maybe we can go to the movies or something...</p><p>也许我们可以去看场电影什么的。</p></li><li ><p>Maybe you\'d better tell me what this is all about...</p><p>也许你应该告诉我这究竟是怎么回事。</p></li><li ><p>Maybe you shouldn\'t eat in that restaurant anymore...</p><p>也许你不该再去那家餐厅吃饭了。</p></li><li  class=""sentence_2""><p>Maybe if you tell me a little about her?...</p><p>也许你可以跟我讲一点关于她的事情？</p></li><li  class=""sentence_2""><p>Wait a while, <span class=\'text_blue\'>maybe</span> a few days.</p><p>等一等吧，也许要过几天。</p></li></ul></div><div class=""collins_en_cn""><div class=""caption""><span class=""num"">3.</span><span class=""st"" tid=""3_38587"">ADV\t副词</span><span class=""text_blue"">可能，也许(用于表示某一观点部分属实，但另一观点也应该加以考虑)</span> You use <b>maybe</b> to indicate that, although a comment is partly true, there is also another point of view that should be considered. <span ><div   id=""word_gram_3_38587""><div ><div><br>【搭配模式】：ADV cl</div></div></div></span></div><ul><li ><p>Maybe there is jealousy, but I think the envy is more powerful...</p><p>也许是羡慕，但我认为更多的是嫉妒。</p></li><li ><p>OK, <span class=\'text_blue\'>maybe</span> I am a failure, but, in my opinion, no more than the rest of this country.</p><p>好吧，也许我是个失败者，不过在我看来，这个国家里的其他人也不比我成功到哪里去。</p></li></ul></div><div class=""collins_en_cn""><div class=""caption""><span class=""num"">4.</span><span class=""st"" tid=""4_38588"">ADV\t副词</span><span class=""text_blue"">可能吧(用于表示未置可否)</span> You can say <b>maybe</b> as a response to a question or remark, when you do not want to agree or disagree. <span ><div   id=""word_gram_4_38588""><div ><div><br>【搭配模式】：ADV as reply</div></div></div></span></div><ul><li ><p>\'Do you think that another country will step in to become the dominant military power in the region?\' — \'Maybe.\'...</p><p>“您认为另一个国家会介入在该地区建立军事霸权吗？”——“可能吧。”</p></li><li ><p>\'Is she coming back?\' — \'Maybe. No one hears from her.\'</p><p>“她快回来了吗？”——“也许吧。都还没信儿呢。”</p></li></ul></div><div class=""collins_en_cn""><div class=""caption""><span class=""num"">5.</span><span class=""st"" tid=""5_38589"">ADV\t副词</span><span class=""text_blue"">大概,大约(用于对数目、数量或价值等作出约略的估计)</span> You use <b>maybe</b> when you are making a rough guess at a number, quantity, or value, rather than stating it exactly. <span ><div   id=""word_gram_5_38589""><div ><div><br>【搭配模式】：ADV amount</div><div><br>【语用信息】：vagueness</div></div></div></span></div><ul><li ><p>The men were <span class=\'text_blue\'>maybe</span> a hundred feet away and coming closer.</p><p>那些人大约有100英尺远，正在向这里靠近。</p></li></ul></div><div class=""collins_en_cn""><div class=""caption""><span class=""num"">6.</span><span class=""st"" tid=""6_38590"">ADV\t副词</span><span class=""text_blue"">有时(尤用于笼统地描述某人的行为或经常发生的事情)</span> People use <b>maybe</b> to mean \'sometimes\', particularly in a series of general statements about what someone does, or about something that regularly happens. <span ><div   id=""word_gram_6_38590""><div ><div><br>【搭配模式】：ADV with cl/group</div></div></div></span></div><ul><li ><p>They\'ll come to the bar for a year, or <span class=\'text_blue\'>maybe</span> even two, then they\'ll find another favourite spot.</p><p>他们会在一年，有时甚至是两年里一直光顾这个酒吧，然后再另寻好去处。</p></li></ul></div></div></div></div>',
  词组短语: '',
};
function CreationEditor({ onChange }) {
  const [editor, setEditor] = useState(null); // 存储 editor 实例
  const [html, setHtml] = useState('');

  // 模拟 ajax 请求，异步设置 html

  const toolbarConfig = {};
  const editorConfig = {
    placeholder: '请输入内容...',
  };

  // 及时销毁 editor
  useEffect(() => {
    const { front, back } = renderAnkiCard(templates.front, templates.back, fields);
    console.log(back);
    editor?.dangerouslyInsertHtml(back);
    console.log(editor);
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);

  function insertText() {
    if (editor == null) return;
    editor.insertText(' hello ');
  }

  function printHtml() {
    if (editor == null) return;
    console.log(editor.getHtml());
  }

  return (
    <>
      <div style={{ border: '1px solid #ccc', zIndex: 100 }}>
        <Toolbar
          editor={editor}
          defaultConfig={toolbarConfig}
          mode="default"
          style={{ borderBottom: '1px solid #ccc' }}
        />
        <Editor
          defaultConfig={editorConfig}
          value={html}
          onCreated={setEditor}
          onChange={editor => onChange && onChange(editor.getHtml())}
          mode="default"
          style={{ height: '500px' }}
        />
      </div>
    </>
  );
}

export default CreationEditor;
