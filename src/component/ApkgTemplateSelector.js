import {
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Divider,
  Input,
  Modal,
  Row,
  Switch,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';
import './ApkgTemplateSelector.less';

const { Text, Title } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

// Anki 模板解析器
const parseAnkiTemplate = (template, fields) => {
  let result = template;

  // 1. 处理基础字段替换 {{fieldName}}
  for (const [fieldName, fieldValue] of Object.entries(fields)) {
    const regex = new RegExp(`{{${fieldName}}}`, 'g');
    result = result.replace(regex, fieldValue || '');
  }

  // 2. 处理条件语句 {{#fieldName}} content {{/fieldName}}
  let hasConditionals = true;
  const maxIterations = 10; // 防止无限循环
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

    // 如果没有替换，退出循环
    hasConditionals = beforeReplace !== result;
    iterations++;
  }

  // 3. 处理反向条件语句 {{^fieldName}} content {{/fieldName}}
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

  // 4. 处理提示语法 {{hint:fieldName}}
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

  // 6. 处理text:fieldName语法（提取纯文本）
  result = result.replace(/{{text:([^}]+)}}/g, (match, fieldName) => {
    const fieldValue = fields[fieldName] || '';
    return fieldValue.replace(/<[^>]*>/g, '');
  });

  return result;
};

// 使用模板和字段渲染Anki卡片
const renderAnkiCard = (frontTemplate, backTemplate, fields) => {
  const frontSide = parseAnkiTemplate(frontTemplate, fields);

  let backSide = backTemplate;
  backSide = backSide.replace(/{{FrontSide}}/g, frontSide);
  backSide = parseAnkiTemplate(backSide, fields);

  return {
    front: frontSide,
    back: backSide,
  };
};

const ApkgTemplateSelector = ({
  visible,
  onCancel,
  onConfirm,
  templates,
  totalNotes,
  totalCards,
}) => {
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [editedTemplates, setEditedTemplates] = useState({});
  const [editMode, setEditMode] = useState({});

  // 当templates变化时，重新初始化状态
  useEffect(() => {
    if (templates) {
      setSelectedTemplates(templates.map(t => ({ name: t.name, selected: true })));
      // 初始化编辑状态
      const initialEditedTemplates = {};
      const initialEditMode = {};
      templates.forEach(t => {
        initialEditedTemplates[t.name] = {
          front: t.front,
          back: t.back,
        };
        initialEditMode[t.name] = false;
      });
      setEditedTemplates(initialEditedTemplates);
      setEditMode(initialEditMode);
    }
  }, [templates]);

  const handleConfirm = () => {
    const selected = selectedTemplates
      .filter(t => t.selected)
      .map(t => ({
        name: t.name,
        front: editedTemplates[t.name]?.front,
        back: editedTemplates[t.name]?.back,
      }));
    onConfirm(selected);
  };

  const handleTemplateEdit = (templateName, field, value) => {
    setEditedTemplates(prev => ({
      ...prev,
      [templateName]: {
        ...prev[templateName],
        [field]: value,
      },
    }));
  };

  const toggleEditMode = templateName => {
    setEditMode(prev => ({
      ...prev,
      [templateName]: !prev[templateName],
    }));
  };

  // 渲染实时预览 - 使用真实的 sampleCards 数据
  const renderLivePreview = template => {
    const frontTemplate = editedTemplates[template.name]?.front || template.front;
    const backTemplate = editedTemplates[template.name]?.back || template.back;

    // 使用第一个样例卡片的真实字段数据
    const sampleFields =
      template.sampleCards && template.sampleCards.length > 0 ? template.sampleCards[0].fields : {};

    try {
      const rendered = renderAnkiCard(frontTemplate, backTemplate, sampleFields);
      return rendered;
    } catch (error) {
      return {
        front: '<div style="color: red;">模板解析错误</div>',
        back: '<div style="color: red;">模板解析错误</div>',
      };
    }
  };

  if (!templates) return null;

  return (
    <Modal
      title="选择并编辑APKG模板"
      open={visible}
      onCancel={onCancel}
      width={1200}
      style={{ top: 20 }}
      // bodyStyle={{
      //   height: '70vh',
      //   overflowY: 'auto',
      //   paddingBottom: '16px',
      // }}
      className="apkg-template-selector"
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          onClick={handleConfirm}
          disabled={selectedTemplates.filter(t => t.selected).length === 0}
        >
          导入选择的模板 ({selectedTemplates.filter(t => t.selected).length})
        </Button>,
      ]}
    >
      <div style={{ marginBottom: '16px' }}>
        <Text strong>
          文件信息：共 {totalNotes} 个笔记，{totalCards} 张卡片
        </Text>
      </div>

      <Divider />

      <Title level={4}>可用模板：</Title>

      {templates.map(template => {
        const isSelected = selectedTemplates.find(t => t.name === template.name)?.selected || false;
        const isEditing = editMode[template.name] || false;
        const livePreview = renderLivePreview(template);

        return (
          <Card
            key={template.name}
            style={{
              marginBottom: '16px',
              border: isSelected ? '2px solid #1890ff' : '1px solid #d9d9d9',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '12px',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox
                  checked={isSelected}
                  onChange={e => {
                    console.log(`Toggling ${template.name}: ${e.target.checked}`);
                    setSelectedTemplates(prev =>
                      prev.map(t =>
                        t.name === template.name ? { ...t, selected: e.target.checked } : t
                      )
                    );
                  }}
                >
                  <Text strong style={{ fontSize: '16px' }}>
                    {template.name}
                  </Text>
                </Checkbox>
                <Text type="secondary" style={{ marginLeft: '12px' }}>
                  ({template.count} 张卡片)
                </Text>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text type="secondary">编辑模式:</Text>
                <Switch
                  size="small"
                  checked={isEditing}
                  onChange={() => toggleEditMode(template.name)}
                  disabled={!isSelected}
                />
              </div>
            </div>

            <Text type="secondary" style={{ marginBottom: '8px', display: 'block' }}>
              字段：{template.fields.join(', ')}
            </Text>

            <Collapse
              size="small"
              defaultActiveKey={isEditing ? ['template', 'preview'] : ['preview']}
            >
              <Panel header={isEditing ? '编辑模板' : '查看模板'} key="template">
                <Row gutter={16}>
                  <Col span={12}>
                    <Title level={5}>正面模板：</Title>
                    {isEditing ? (
                      <TextArea
                        value={editedTemplates[template.name]?.front || template.front}
                        onChange={e => handleTemplateEdit(template.name, 'front', e.target.value)}
                        rows={8}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                        placeholder="编辑正面模板HTML..."
                      />
                    ) : (
                      <div
                        style={{
                          background: '#f5f5f5',
                          padding: '8px',
                          borderRadius: '4px',
                          maxHeight: '200px',
                          overflow: 'auto',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {editedTemplates[template.name]?.front || template.front}
                      </div>
                    )}
                  </Col>
                  <Col span={12}>
                    <Title level={5}>背面模板：</Title>
                    {isEditing ? (
                      <TextArea
                        value={editedTemplates[template.name]?.back || template.back}
                        onChange={e => handleTemplateEdit(template.name, 'back', e.target.value)}
                        rows={8}
                        style={{ fontFamily: 'monospace', fontSize: '12px' }}
                        placeholder="编辑背面模板HTML..."
                      />
                    ) : (
                      <div
                        style={{
                          background: '#f5f5f5',
                          padding: '8px',
                          borderRadius: '4px',
                          maxHeight: '200px',
                          overflow: 'auto',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {editedTemplates[template.name]?.back || template.back}
                      </div>
                    )}
                  </Col>
                </Row>
              </Panel>

              <Panel header="实时预览" key="preview">
                {template.sampleCards && template.sampleCards.length > 0 ? (
                  <>
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        * 使用第一个样例卡片的真实数据进行预览
                      </Text>
                    </div>
                    <Row gutter={16}>
                      <Col span={12}>
                        <Text strong>正面预览：</Text>
                        <div
                          style={{
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            padding: '12px',
                            minHeight: '100px',
                            maxHeight: '300px',
                            overflow: 'auto',
                            background: 'white',
                            marginTop: '4px',
                          }}
                          dangerouslySetInnerHTML={{
                            __html: livePreview.front || '无预览内容',
                          }}
                        />
                      </Col>
                      <Col span={12}>
                        <Text strong>背面预览：</Text>
                        <div
                          style={{
                            border: '1px solid #d9d9d9',
                            borderRadius: '4px',
                            padding: '12px',
                            minHeight: '100px',
                            maxHeight: '300px',
                            overflow: 'auto',
                            background: 'white',
                            marginTop: '4px',
                          }}
                          dangerouslySetInnerHTML={{
                            __html: livePreview.back || '无预览内容',
                          }}
                        />
                      </Col>
                    </Row>
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                    <Text type="secondary">暂无样例数据可供预览</Text>
                  </div>
                )}
              </Panel>
            </Collapse>
          </Card>
        );
      })}
    </Modal>
  );
};

export default ApkgTemplateSelector;
