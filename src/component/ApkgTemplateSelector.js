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

const { Text, Title } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;

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

  if (!templates) return null;

  return (
    <Modal
      title="选择并编辑APKG模板"
      open={visible}
      onCancel={onCancel}
      width={1000}
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

            <Collapse size="small">
              <Panel header={isEditing ? '编辑模板' : '预览模板'} key="template">
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

              {template.sampleCards && template.sampleCards.length > 0 && (
                <Panel header="样例卡片" key="sample">
                  {template.sampleCards.slice(0, 2).map((sample, sampleIndex) => (
                    <div key={sampleIndex} style={{ marginBottom: '16px' }}>
                      <Text strong>样例 {sampleIndex + 1}:</Text>
                      <Row gutter={16} style={{ marginTop: '8px' }}>
                        <Col span={12}>
                          <Text type="secondary">正面：</Text>
                          <div
                            style={{
                              border: '1px solid #d9d9d9',
                              borderRadius: '4px',
                              padding: '8px',
                              maxHeight: '150px',
                              overflow: 'auto',
                              background: 'white',
                            }}
                            dangerouslySetInnerHTML={{
                              __html: sample.renderedSample?.front || '无预览',
                            }}
                          />
                        </Col>
                        <Col span={12}>
                          <Text type="secondary">背面：</Text>
                          <div
                            style={{
                              border: '1px solid #d9d9d9',
                              borderRadius: '4px',
                              padding: '8px',
                              maxHeight: '150px',
                              overflow: 'auto',
                              background: 'white',
                            }}
                            dangerouslySetInnerHTML={{
                              __html: sample.renderedSample?.back || '无预览',
                            }}
                          />
                        </Col>
                      </Row>
                    </div>
                  ))}
                </Panel>
              )}
            </Collapse>
          </Card>
        );
      })}
    </Modal>
  );
};

export default ApkgTemplateSelector;
