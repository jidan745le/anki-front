import { BookOutlined, PlusCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Modal, Steps, Typography } from 'antd';
import React, { useState } from 'react';
import './index.less';

const { Title, Paragraph } = Typography;
const { Step } = Steps;

const UserGuide = ({ visible, onClose, onAction }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const quickActions = [
    {
      title: '快速开始',
      icon: <PlusCircleOutlined />,
      description: '手动创建你的第一个卡组',
      action: 'create',
      color: '#1890ff',
    },
    {
      title: '导入文件',
      icon: <UploadOutlined />,
      description: '上传TXT、APKG或EPUB文件创建卡组',
      action: 'upload',
      color: '#52c41a',
    },
    {
      title: '浏览共享',
      icon: <BookOutlined />,
      description: '查看其他用户分享的优质卡组',
      action: 'browse',
      color: '#722ed1',
    },
  ];

  const stepGuide = [
    {
      title: '创建卡组',
      content: (
        <div>
          <Paragraph>选择适合你的方式创建记忆卡组：</Paragraph>
          <ul>
            <li>
              <strong>手动创建</strong>：逐张添加卡片，完全自定义
            </li>
            <li>
              <strong>文件导入</strong>：批量导入现有内容
            </li>
            <li>
              <strong>共享卡组</strong>：使用他人制作的优质内容
            </li>
          </ul>
        </div>
      ),
    },
    {
      title: '文件格式说明',
      content: (
        <div>
          <Paragraph>支持以下文件格式：</Paragraph>
          <Card size="small" style={{ marginBottom: 8 }}>
            <strong>TXT文件</strong> - 简单问答格式
            <br />
            <small>格式：问题\t答案 (每行一对)</small>
          </Card>
          <Card size="small" style={{ marginBottom: 8 }}>
            <strong>APKG文件</strong> - Anki标准格式
            <br />
            <small>可选择性导入模板和卡片</small>
          </Card>
          <Card size="small">
            <strong>EPUB文件</strong> - 电子书格式
            <br />
            <small>自动生成阅读理解卡片</small>
          </Card>
        </div>
      ),
    },
    {
      title: '开始学习',
      content: (
        <div>
          <Paragraph>创建卡组后，你可以：</Paragraph>
          <ul>
            <li>点击"开始学习"进入记忆训练</li>
            <li>查看和编辑卡片内容</li>
            <li>配置学习参数</li>
            <li>分享给其他用户</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <Modal
      title="欢迎使用 MyANKI"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      className="user-guide-modal"
    >
      <div className="guide-container">
        {/* 快速操作区域 */}
        <div className="quick-actions">
          <Title level={4}>快速开始</Title>
          <div className="action-cards">
            {quickActions.map((action, index) => (
              <Card
                key={index}
                className="action-card"
                hoverable
                onClick={() => {
                  onAction(action.action);
                  onClose();
                }}
              >
                <div className="action-icon" style={{ color: action.color }}>
                  {action.icon}
                </div>
                <div className="action-content">
                  <Title level={5}>{action.title}</Title>
                  <Paragraph>{action.description}</Paragraph>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* 详细指南 */}
        <div className="detailed-guide">
          <Title level={4}>使用指南</Title>
          <Steps current={currentStep} direction="vertical">
            {stepGuide.map((step, index) => (
              <Step key={index} title={step.title} description={step.content} />
            ))}
          </Steps>
        </div>

        {/* 底部按钮 */}
        <div className="guide-footer">
          <Button type="primary" size="large" onClick={onClose}>
            开始使用
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default UserGuide;
