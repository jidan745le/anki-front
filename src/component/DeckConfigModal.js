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
import { useI18n } from '../common/hooks/useI18n';

const { Text, Title } = Typography;
const { Option } = Select;

const DeckConfigModal = ({ visible, onCancel, onConfirm, deckData, loading }) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('appearance');
  const { t } = useI18n();

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
      size: values.fontSize ? `${values.fontSize}px` : undefined,
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
      label: t('deckConfig.appearance', '外观设置'),
      children: (
        <div>
          <Form.Item
            name="fontSize"
            label={t('deckConfig.fontSize', '字体大小')}
            rules={[
              { required: false, message: t('deckConfig.fontSizeRequired', '请设置字体大小') },
            ]}
          >
            <InputNumber min={12} max={24} addonAfter="px" />
          </Form.Item>

          <Form.Item
            name="textAlign"
            label={t('deckConfig.textAlign', '文本对齐')}
            rules={[
              { required: false, message: t('deckConfig.textAlignRequired', '请选择文本对齐方式') },
            ]}
          >
            <Select placeholder={t('deckConfig.selectTextAlign', '选择文本对齐方式')}>
              <Option value="left">{t('deckConfig.alignLeft', '左对齐')}</Option>
              <Option value="center">{t('deckConfig.alignCenter', '居中对齐')}</Option>
              <Option value="right">{t('deckConfig.alignRight', '右对齐')}</Option>
            </Select>
          </Form.Item>
        </div>
      ),
    },
    {
      key: 'fsrs',
      label: t('deckConfig.fsrsAlgorithm', 'FSRS 算法'),
      children: (
        <div>
          <Title level={5}>{t('deckConfig.basicParams', '基础参数')}</Title>
          <Form.Item
            name="requestRetention"
            label={t('deckConfig.targetRetention', '目标记忆保持率')}
            rules={[
              {
                required: true,
                message: t('deckConfig.targetRetentionRequired', '请设置目标记忆保持率'),
              },
            ]}
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
            label={t('deckConfig.maxInterval', '最大间隔天数')}
            rules={[
              {
                required: true,
                message: t('deckConfig.maxIntervalRequired', '请设置最大间隔天数'),
              },
            ]}
          >
            <InputNumber min={1} max={100000} placeholder="36500" style={{ width: '100%' }} />
          </Form.Item>

          <Divider />

          <Title level={5}>{t('deckConfig.advancedOptions', '高级选项')}</Title>
          <Form.Item
            name="enableFuzz"
            label={t('deckConfig.enableFuzz', '启用模糊化')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="enableShortTerm"
            label={t('deckConfig.enableShortTerm', '启用短期学习')}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="learningSteps"
            label={t('deckConfig.learningSteps', '学习步骤 (分钟)')}
            rules={[
              { required: false, message: t('deckConfig.learningStepsRequired', '请设置学习步骤') },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="relearningSteps"
            label={t('deckConfig.relearningSteps', '重新学习步骤 (分钟)')}
            rules={[
              {
                required: false,
                message: t('deckConfig.relearningStepsRequired', '请设置重新学习步骤'),
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Divider />

          <Title level={5}>{t('deckConfig.weightParams', '权重参数')}</Title>
          <Form.Item
            name="w"
            label={t('deckConfig.wParams', 'W 参数')}
            rules={[{ required: false, message: t('deckConfig.wParamsRequired', '请设置W参数') }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Text type="secondary">
            {t(
              'deckConfig.fsrsDescription',
              'FSRS (Free Spaced Repetition Scheduler) 是一个开源的间隔重复算法，可以根据你的学习数据智能调整复习间隔。'
            )}
          </Text>
        </div>
      ),
    },
  ];

  return (
    <Modal
      open={visible}
      title={t('deckConfig.title', '卡组配置')}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t('common.cancel')}
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          {t('common.save')}
        </Button>,
      ]}
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Tabs defaultActiveKey="appearance" items={tabItems} onChange={setActiveTab} />
      </Form>
    </Modal>
  );
};

export default DeckConfigModal;
