import { DownOutlined, InboxOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import {
  Button,
  Dropdown,
  Form,
  Input,
  message,
  Modal,
  Progress,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../../common/hooks/useSocket';
import apiClient from '../../common/http/apiClient';
import ApkgTemplateSelector from '../../component/ApkgTemplateSelector';
import DeckConfigModal from '../../component/DeckConfigModal';
import FooterBar from '../../component/Footbar';

const { Text } = Typography;
const { Dragger } = Upload;

const Decks = () => {
  const [decks, setDecks] = useState([]);
  const [originalDecks, setOriginalDecks] = useState([]); // 自己创建的
  const [duplicatedDecks, setDuplicatedDecks] = useState([]); // 复制的
  const [visible, setVisible] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileType, setFileType] = useState(''); // 'txt', 'apkg', 'epub'
  const [loading, setLoading] = useState(false);
  const [decksLoading, setDecksLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { socket, emit, on, isConnected } = useSocket();
  const [progresses, setProgresses] = useState({});
  const [pendingTaskIds, setPendingTaskIds] = useState([]);
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'original' or 'duplicated'

  // APKG两步式处理相关状态
  const [apkgTemplates, setApkgTemplates] = useState(null);
  const [apkgTaskId, setApkgTaskId] = useState(null);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

  // Deck配置相关状态
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [currentDeck, setCurrentDeck] = useState(null);

  // useEffect(() => {

  // }, []);
  console.log('Decks.js socket', socket, emit, on, isConnected);

  useEffect(() => {
    console.log('Decks.js useEffect', isConnected);
    if (!isConnected) {
      return;
    }

    getDecks(true);

    // 初始化任务
    on('task-init', data => {
      const { taskId } = data;

      setPendingTaskIds(prevPendingTaskIds => {
        // Check using the latest state value
        if (prevPendingTaskIds.includes(taskId)) {
          return prevPendingTaskIds;
        }

        // Already opened in multiple browser tabs scenario - need to refresh data
        getDecks();

        // Add new taskId to the list
        return [...prevPendingTaskIds, taskId];
      });

      socket.on(`task-${taskId}-pending`, data => {
        console.log('Decks.js socket.on11', data);
        if (data.progress == 100) {
          socket.off(`task-${taskId}-pending`);
          setPendingTaskIds(prev => prev.filter(id => id !== taskId));
          getDecks();
        }
        const { progress, message } = data;
        setProgresses(prev => ({ ...prev, [taskId]: { progress, message } }));
      });
    });
  }, [isConnected]);

  const getDecks = async (isInit = false) => {
    // console.log(new Error().stack);
    setDecksLoading(true);
    const res = await apiClient.get(`/anki/getDecks`).catch(err => err.response);
    const data = res.data;
    setDecksLoading(false);
    if (data.success) {
      const newDecks = data.data;
      setDecks(newDecks);

      // 分类deck：原创的和复制的
      const original = newDecks.filter(deck => deck.owned);
      const duplicated = newDecks.filter(deck => !deck.owned);

      setOriginalDecks(original);
      setDuplicatedDecks(duplicated);

      if (isInit) {
        // 等待 socket 连接就绪
        if (!isConnected) {
          return;
        }

        newDecks.forEach(deck => {
          if (deck.status == 'processing' && deck.taskId && !pendingTaskIds.includes(deck.taskId)) {
            setPendingTaskIds(prev => [...prev, deck.taskId]);
            on(`task-${deck.taskId}-pending`, data => {
              if (data.progress == 100) {
                socket.off(`task-${deck.taskId}-pending`);
                setPendingTaskIds(prev => prev.filter(id => id !== deck.taskId));
                getDecks();
              }
              const { progress, message } = data;
              setProgresses(prev => ({ ...prev, [deck.taskId]: { progress, message } }));
            });
          }
        });
      }
      return newDecks;
    }

    message.error(data.message);
  };

  const deleteDeck = deckId => {
    Modal.confirm({
      title: 'Delete Deck',
      content: 'Are you sure you want to delete this deck?',
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      async onOk() {
        const response = await apiClient
          .post(`/anki/deleteDeck/${deckId}`)
          .catch(err => err.response);
        if (response.data.success) {
          message.success('Deck deleted successfully!');
          getDecks();
        } else {
          message.error(response.data.message);
        }
      },
    });
  };

  const handleAddDeck = () => {
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
    setUploadedFile(null);
    setFileType('');
    form.resetFields(); // Reset form fields when closing
    // 重置APKG相关状态
    setApkgTemplates(null);
    setApkgTaskId(null);
    setSelectedTemplates([]);
    setTemplateModalVisible(false);
  };

  // 检测文件类型
  const detectFileType = file => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.txt')) {
      return 'txt';
    } else if (fileName.endsWith('.apkg')) {
      return 'apkg';
    } else if (fileName.endsWith('.epub')) {
      return 'epub';
    }
    return '';
  };

  // 第一步：解析APKG模板
  const parseApkgTemplates = async file => {
    setTemplateLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/anki/parseApkgTemplates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const { taskId, templates, totalNotes, totalCards } = response.data.data;
        setApkgTaskId(taskId);
        setApkgTemplates({ templates, totalNotes, totalCards });
        setSelectedTemplates(templates.map(t => ({ name: t.name, selected: true })));
        setTemplateModalVisible(true);
        message.success(
          `解析成功！发现 ${templates.length} 个模板，共 ${totalNotes} 个笔记，${totalCards} 张卡片`
        );
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('解析APKG文件失败');
    } finally {
      setTemplateLoading(false);
    }
  };

  // 第二步：处理选择的模板
  const processSelectedTemplates = async selectedTemplates => {
    if (!apkgTaskId || selectedTemplates.length === 0) {
      message.error('请至少选择一个模板');
      return;
    }

    const formValues = form.getFieldsValue();
    const selectedTemplateData = selectedTemplates.map(t => {
      return {
        name: t.name,
        front: t.front || apkgTemplates.templates.find(orig => orig.name === t.name)?.front,
        back: t.back || apkgTemplates.templates.find(orig => orig.name === t.name)?.back,
      };
    });

    try {
      const response = await apiClient.post('/anki/processSelectedTemplates', {
        taskId: apkgTaskId,
        selectedTemplates: selectedTemplateData,
        deckInfo: {
          name: formValues.name,
          description: formValues.description,
          type: 'APKG',
        },
      });

      if (response.data.success) {
        // const { taskId } = response.data.data;
        message.success('开始处理选择的模板，请等待...');

        // 监听处理进度
        // setPendingTaskIds(prev => [...prev, taskId]);
        // on(`task-${taskId}-pending`, data => {
        //   const { progress, message: progressMessage } = data;
        //   if (progress == 100) {
        //     socket.off(`task-${taskId}-pending`);
        //     setPendingTaskIds(prev => prev.filter(id => id !== taskId));
        //     getDecks();
        //     message.success('APKG导入完成！');
        //   }
        //   setProgresses(prev => ({ ...prev, [taskId]: { progress, message: progressMessage } }));
        // });

        handleClose();
        // getDecks();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('处理模板失败');
    }
  };

  // EPUB模式提交
  const handleEpubSubmit = async values => {
    if (!uploadedFile) {
      message.error('Please select an EPUB file');
      return;
    }

    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('file', uploadedFile);

    // 添加可选参数
    if (values.description) {
      formData.append('description', values.description);
    }
    if (values.chunkSize) {
      formData.append('chunkSize', values.chunkSize);
    }
    if (values.chunkOverlap) {
      formData.append('chunkOverlap', values.chunkOverlap);
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/anki/addEpubDeck', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        message.success(
          `EPUB deck created successfully! Generated ${response.data.data.cardsCount} cards.`
        );

        handleClose();
        getDecks();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error(
        'Failed to create EPUB deck: ' + (error.response?.data?.message || error.message)
      );
    } finally {
      setLoading(false);
    }
  };

  // TXT模式提交
  const handleTxtSubmit = async values => {
    if (!uploadedFile) {
      message.error('Please select a TXT file');
      return;
    }

    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('file', uploadedFile);
    if (values.description) {
      formData.append('description', values.description);
    }
    if (values.separator) {
      formData.append('separator', values.separator);
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/anki/addDeck', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        message.success('TXT deck created successfully!');
        handleClose();
        getDecks();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('Failed to create TXT deck');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async values => {
    if (fileType === 'txt') {
      await handleTxtSubmit(values);
      return;
    }

    if (fileType === 'epub') {
      await handleEpubSubmit(values);
      return;
    }

    if (fileType === 'apkg') {
      // APKG文件：先解析模板
      await parseApkgTemplates(uploadedFile);
      return;
    }

    message.error('Please select a valid file');
  };

  // 打开配置模态框
  const handleConfigureDeck = deck => {
    setCurrentDeck(deck);
    setConfigModalVisible(true);
  };

  // 保存配置
  const handleSaveConfig = async config => {
    if (!currentDeck) return;

    setConfigLoading(true);
    try {
      const response = await apiClient.post(`/anki/updateDeckConfig/${currentDeck.id}`, {
        config: {
          size: config.size,
          align: config.align,
        },
        fsrsParameters: config.fsrsParameters,
      });

      if (response.data.success) {
        message.success('配置保存成功！');
        setConfigModalVisible(false);
        setCurrentDeck(null);
        getDecks(); // 刷新数据
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('保存配置失败');
    } finally {
      setConfigLoading(false);
    }
  };

  // 关闭配置模态框
  const handleCloseConfig = () => {
    setConfigModalVisible(false);
    setCurrentDeck(null);
  };

  // 处理嵌入功能
  const handleEmbedDeck = async deck => {
    try {
      const response = await apiClient.post(`/anki/embedding/${deck.id}`);
      if (response.data.success) {
        message.success('嵌入功能已启用！');
        // getDecks(); // 刷新数据
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('启用嵌入功能失败');
    }
  };

  const getColumns = () => [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <a onClick={() => navigate(`/anki/${row.id}`)}>{text}</a>
            {row.isShared && row.owned && (
              <Tag color="blue" style={{ fontSize: '12px', padding: '0 6px' }}>
                Shared
              </Tag>
            )}
            {row.isEmbedding && (
              <Tag color="green" style={{ fontSize: '12px', padding: '0 6px' }}>
                Embedding
              </Tag>
            )}
          </div>
          {row.status == 'processing' && row.taskId && (
            <>
              <Progress percent={progresses[row.taskId]?.progress || 0} />
              <div>{progresses[row.taskId]?.message || ''}</div>
            </>
          )}
          {row.status == 'failed' && <div style={{ color: 'red' }}>failed </div>}
        </div>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: text => text || '',
    },
    {
      title: 'statistics',
      dataIndex: 'stats',
      key: 'stats',
      width: 150,
      render: (text, row) => {
        return (
          <div>
            <Tooltip title="New">
              <span style={{ color: 'blue', textDecoration: 'underline', marginRight: 12 }}>
                {row?.stats?.newCount || 0}
              </span>
            </Tooltip>
            <Tooltip title="Due Learning">
              <span style={{ color: 'red', textDecoration: 'underline', marginRight: 12 }}>
                {row?.stats?.learningCount || 0}
              </span>
            </Tooltip>
            <Tooltip title="Due Review">
              <span style={{ color: 'green', textDecoration: 'underline', marginRight: 12 }}>
                {row?.stats?.reviewCount || 0}
              </span>
            </Tooltip>
          </div>
        );
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (text, row) => {
        const handleMenuClick = ({ key }) => {
          switch (key) {
            case 'add':
              navigate(`/anki/create/${row.id}`);
              break;
            case 'embed':
              handleEmbedDeck(row);
              break;
            case 'configure':
              handleConfigureDeck(row);
              break;
            case 'delete':
              deleteDeck(row.id);
              break;
            case 'share':
              navigate(`/deck-original-cards/${row.id}`);
              break;
          }
        };

        const menuItems = [
          {
            key: 'add',
            label: 'Add',
            disabled: row.status === 'processing',
          },
          {
            key: 'share',
            label: row.isShared ? 'Update' : 'Share',
            disabled: !row.owned,
          },
          {
            key: 'delete',
            label: 'Delete',
            danger: true,
            // disabled: row.status === 'processing',
          },

          {
            type: 'divider',
          },
          {
            key: 'configure',
            label: 'Configure',
            disabled: row.status === 'processing' || !row.owned,
          },
          {
            key: 'embed',
            label: 'Embedding',
            disabled: !row.owned || row.status === 'processing' || row.isEmbedding,
          },
        ];

        return (
          <Dropdown
            menu={{
              items: menuItems,
              onClick: handleMenuClick,
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button type="link">
              Actions
              <DownOutlined />
            </Button>
          </Dropdown>
        );
      },
    },
  ];

  // 文件上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    maxCount: 1,
    beforeUpload: file => {
      const detectedType = detectFileType(file);
      if (!detectedType) {
        message.error('Please upload a valid file (TXT, APKG, or EPUB)');
        return false;
      }

      setUploadedFile(file);
      setFileType(detectedType);

      // 为不同文件类型设置默认值
      if (detectedType === 'epub') {
        form.setFieldsValue({
          chunkSize: 2000,
          chunkOverlap: 50,
        });
      } else if (detectedType === 'txt') {
        form.setFieldsValue({
          separator: '|',
        });
      }

      return false; // 阻止自动上传
    },
    onRemove: () => {
      setUploadedFile(null);
      setFileType('');
      form.resetFields(['separator', 'chunkSize', 'chunkOverlap']);
    },
    fileList: uploadedFile ? [uploadedFile] : [],
  };

  // 渲染文件类型说明
  const renderFileTypeDescription = (inDragArea = false) => {
    const descriptions = {
      txt: '已检测到TXT文件，将根据分隔符处理文本内容',
      apkg: '已检测到APKG文件，将使用两步式导入流程进行模板处理',
      epub: '已检测到EPUB文件，将自动提取内容并分段处理',
    };

    if (!fileType) {
      return null;
    }

    // 使用内联样式对象
    return (
      <div
        style={
          inDragArea
            ? { textAlign: 'center', margin: '8px 0', fontSize: '14px', color: '#666' }
            : { textAlign: 'center', margin: '16px 0', fontSize: '14px', color: '#666' }
        }
      >
        {descriptions[fileType]}
      </div>
    );
  };

  // 渲染文件类型特定的配置项
  const renderFileTypeConfig = () => {
    if (fileType === 'txt') {
      return (
        <Form.Item label="分隔符" name="separator" tooltip="用于分割文本内容的分隔符">
          <Select placeholder="选择分隔符" defaultValue="|">
            <Select.Option value="|">| (竖线)</Select.Option>
          </Select>
        </Form.Item>
      );
    }

    if (fileType === 'epub') {
      return (
        <>
          <Form.Item label="分段大小" name="chunkSize" tooltip="文本分段大小 (100-3000 字符)">
            <Input type="number" placeholder="2000" min={100} max={3000} />
          </Form.Item>

          <Form.Item
            label="分段重叠"
            name="chunkOverlap"
            tooltip="文本段落之间的重叠字符数 (0-200 字符)"
          >
            <Input type="number" placeholder="50" min={0} max={200} />
          </Form.Item>
        </>
      );
    }

    return null;
  };

  const tabItems = [
    {
      key: 'all',
      label: `All (${decks.length})`,
      children: (
        <Table
          loading={decksLoading}
          dataSource={decks}
          rowKey={row => row.id}
          showHeader={false}
          pagination={{
            pageSize: 10,
            showTotal: total => `Total ${total} items`,
          }}
          columns={getColumns()}
        />
      ),
    },
    {
      key: 'original',
      label: `Created (${originalDecks.length})`,
      children: (
        <Table
          loading={decksLoading}
          dataSource={originalDecks}
          showHeader={false}
          rowKey={row => row.id}
          pagination={{
            pageSize: 10,
            showTotal: total => `Total ${total} items`,
          }}
          columns={getColumns()}
        />
      ),
    },
    {
      key: 'duplicated',
      label: `Duplicated (${duplicatedDecks.length})`,
      children: (
        <Table
          loading={decksLoading}
          dataSource={duplicatedDecks}
          rowKey={row => row.id}
          showHeader={false}
          pagination={{
            pageSize: 10,
            showTotal: total => `Total ${total} items`,
          }}
          columns={getColumns()}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '12px', marginBottom: '64px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          style={{ flex: 1 }}
          tabBarExtraContent={{
            right: (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '16px' }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: isConnected ? '#52c41a' : '#ff4d4f',
                    boxShadow: isConnected
                      ? '0 0 8px rgba(82, 196, 26, 0.6)'
                      : '0 0 8px rgba(255, 77, 79, 0.6)',
                    transition: 'all 0.3s ease',
                  }}
                  title={isConnected ? 'Socket连接正常' : 'Socket连接断开'}
                />
                <Text
                  style={{
                    fontSize: '12px',
                    color: isConnected ? '#52c41a' : '#ff4d4f',
                    fontWeight: '500',
                  }}
                >
                  {isConnected ? 'connected' : 'disconnected'}
                </Text>
              </div>
            ),
          }}
        />
      </div>

      <FooterBar>
        <Button danger type="primary" onClick={handleAddDeck}>
          添加 Deck
        </Button>
      </FooterBar>

      <Modal
        title="添加 Deck"
        open={visible}
        onCancel={handleClose}
        footer={null}
        width={680}
        destroyOnClose={true}
      >
        {templateLoading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
            }}
          >
            <Spin size="large" />
            <Text style={{ marginLeft: '12px' }}>正在解析APKG文件...</Text>
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              name="name"
              label="Deck 名称"
              rules={[{ required: true, message: '请输入 Deck 名称!' }]}
            >
              <Input placeholder="请输入Deck名称" />
            </Form.Item>

            <Form.Item name="description" label="描述">
              <Input.TextArea placeholder="请输入Deck描述（可选）" rows={3} />
            </Form.Item>

            <Form.Item
              label={
                <>
                  上传文件
                  <Tooltip
                    title={
                      <div style={{ textAlign: 'left' }}>
                        <p>
                          <strong>支持的文件类型：</strong>
                        </p>
                        <p>
                          <strong>TXT文件：</strong> 文本内容，支持自定义分隔符
                        </p>
                        <p>
                          <strong>APKG文件：</strong> Anki卡包文件，支持模板选择和编辑
                        </p>
                        <p>
                          <strong>EPUB文件：</strong> 电子书文件，自动分章节处理
                        </p>
                      </div>
                    }
                  >
                    <QuestionCircleOutlined style={{ marginLeft: '4px' }} />
                  </Tooltip>
                </>
              }
              required
            >
              <Dragger {...uploadProps} style={{ marginBottom: '16px' }}>
                {!uploadedFile ? (
                  <>
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                    <p className="ant-upload-hint">支持 TXT、APKG、EPUB 格式文件</p>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '16px', margin: '8px 0' }}>
                      {uploadedFile.name}
                      <Button
                        type="text"
                        danger
                        onClick={e => {
                          e.stopPropagation();
                          uploadProps.onRemove();
                        }}
                        style={{ marginLeft: '8px' }}
                      >
                        移除
                      </Button>
                    </p>
                    {renderFileTypeDescription(true)}
                  </>
                )}
              </Dragger>
            </Form.Item>

            {renderFileTypeConfig()}

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Button onClick={handleClose} style={{ marginRight: '8px' }}>
                取消
              </Button>
              <Button loading={loading} type="primary" htmlType="submit" disabled={!uploadedFile}>
                提交
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>

      <ApkgTemplateSelector
        visible={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        onConfirm={processSelectedTemplates}
        templates={apkgTemplates?.templates}
        totalNotes={apkgTemplates?.totalNotes}
        totalCards={apkgTemplates?.totalCards}
      />

      <DeckConfigModal
        visible={configModalVisible}
        onCancel={handleCloseConfig}
        onConfirm={handleSaveConfig}
        deckData={currentDeck}
        loading={configLoading}
      />
    </div>
  );
};

export default Decks;
