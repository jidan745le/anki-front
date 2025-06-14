import {
  Button,
  Divider,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tabs,
  Typography,
} from 'antd';
import React, { useEffect, useState } from 'react';

const { Text, Title } = Typography;
const { Option } = Select;

const DeckConfigModal = ({ visible, onCancel, onConfirm, deckData, loading }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('appearance');

  useEffect(() => {
    if (visible && deckData) {
      // 设置表单初始值
      form.setFieldsValue({
        // 外观设置
        fontSize: deckData.config?.size?.replace('px', ''),
        textAlign: deckData.config?.align,

        // FSRS 参数
        requestRetention: deckData.fsrsParameters?.request_retention,
        maximumInterval: deckData.fsrsParameters?.maximum_interval,
        enableFuzz: deckData.fsrsParameters?.enable_fuzz,
        enableShortTerm: deckData.fsrsParameters?.enable_short_term,
        learningSteps: deckData.fsrsParameters?.learning_steps?.join(','),
        relearningSteps: deckData.fsrsParameters?.relearning_steps?.join(','),
        w: deckData.fsrsParameters?.w?.join(','),
      });
    }
  }, [visible, deckData, form]);

  const handleSubmit = async values => {
    const config = {
      size: `${values.fontSize}px`,
      align: values.textAlign,
      fsrsParameters: {
        request_retention: values.requestRetention,
        maximum_interval: values.maximumInterval,
        w: values.w ? values.w.split(',').map(v => parseFloat(v.trim())) : [],
        enable_fuzz: values.enableFuzz,
        enable_short_term: values.enableShortTerm,
        learning_steps: values.learningSteps
          ? values.learningSteps.split(',').map(v => v.trim())
          : [],
        relearning_steps: values.relearningSteps
          ? values.relearningSteps.split(',').map(v => v.trim())
          : [],
      },
    };

    onConfirm(config);
  };

  const tabItems = [
    {
      key: 'appearance',
      label: '外观设置',
      children: (
        <div>
          <Form.Item
            name="fontSize"
            label="字体大小"
            rules={[{ required: false, message: '请设置字体大小' }]}
          >
            <InputNumber min={12} max={24} addonAfter="px" />
          </Form.Item>

          <Form.Item
            name="textAlign"
            label="文本对齐"
            rules={[{ required: false, message: '请选择文本对齐方式' }]}
          >
            <Select placeholder="选择文本对齐方式">
              <Option value="left">左对齐</Option>
              <Option value="center">居中对齐</Option>
              <Option value="right">右对齐</Option>
            </Select>
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'fsrs',
      label: 'FSRS 算法',
      children: (
        <div>
          <Title level={5}>基础参数</Title>
          <Form.Item
            name="requestRetention"
            label="目标记忆保持率"
            rules={[{ required: true, message: '请设置目标记忆保持率' }]}
          >
            <InputNumber
              min={0.1}
              max={1}
              step={0.01}
              placeholder="0.9"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="maximumInterval"
            label="最大间隔天数"
            rules={[{ required: true, message: '请设置最大间隔天数' }]}
          >
            <InputNumber min={1} max={100000} placeholder="36500" style={{ width: '100%' }} />
          </Form.Item>

          <Divider />

          <Title level={5}>高级选项</Title>
          <Form.Item name="enableFuzz" label="启用模糊化" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item name="enableShortTerm" label="启用短期学习" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            name="learningSteps"
            label="学习步骤 (分钟)"
            rules={[{ required: false, message: '请设置学习步骤' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="relearningSteps"
            label="重新学习步骤 (分钟)"
            rules={[{ required: false, message: '请设置重新学习步骤' }]}
          >
            <Input />
          </Form.Item>

          <Divider />

          <Title level={5}>权重参数</Title>
          <Form.Item name="w" label="W 参数" rules={[{ required: false, message: '请设置W参数' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            用逗号分隔的17个浮点数，代表FSRS算法的权重参数
          </Text>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={`配置 Deck: ${deckData?.name || ''}`}
      bodyStyle={{ padding: '0px 12px', height: '500px', overflow: 'auto' }}
      open={visible}
      onCancel={onCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="confirm" type="primary" loading={loading} onClick={() => form.submit()}>
          保存配置
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Form>
    </Modal>
  );
};

export default DeckConfigModal;
