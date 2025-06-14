import {
  Button,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Progress,
  Radio,
  Select,
  Spin,
  Table,
  Tabs,
  Tooltip,
  Typography,
  Upload,
} from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSocket from '../../common/hooks/useSocket';
import apiClient from '../../common/http/apiClient';
import ApkgTemplateSelector from '../../component/ApkgTemplateSelector';
import FooterBar from '../../component/Footbar';

const { Text } = Typography;

const Decks = () => {
  const [decks, setDecks] = useState([]);
  const [originalDecks, setOriginalDecks] = useState([]); // 自己创建的
  const [duplicatedDecks, setDuplicatedDecks] = useState([]); // 复制的
  const [visible, setVisible] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decksLoading, setDecksLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [audioFile, setAudioFile] = useState(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [deckType, setDeckType] = useState('normal'); // 'normal' or 'audio' or 'podcast' or 'epub'
  const [podcastFile, setPodcastFile] = useState(null);
  const [podcastMode, setPodcastMode] = useState('existing');
  const [epubFile, setEpubFile] = useState(null);
  const { socket, emit, on, isConnected } = useSocket();
  const [progresses, setProgresses] = useState({});
  const [pendingTaskIds, setPendingTaskIds] = useState([]);
  const [activeTab, setActiveTab] = useState('original'); // 'original' or 'duplicated'

  // APKG两步式处理相关状态
  const [apkgTemplates, setApkgTemplates] = useState(null);
  const [apkgTaskId, setApkgTaskId] = useState(null);
  const [selectedTemplates, setSelectedTemplates] = useState([]);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);

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
    form.setFieldValue('deckType', 'normal');
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
    setFileList([]);
    setAudioFile(null);
    setEpubFile(null);
    form.resetFields(); // Reset form fields when closing
    // 重置APKG相关状态
    setApkgTemplates(null);
    setApkgTaskId(null);
    setSelectedTemplates([]);
    setTemplateModalVisible(false);
  };

  // 检测文件类型
  const isApkgFile = file => {
    return file.name.toLowerCase().endsWith('.apkg');
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
        const { taskId } = response.data.data;
        message.success('开始处理选择的模板，请等待...');

        // 监听处理进度
        setPendingTaskIds(prev => [...prev, taskId]);
        on(`task-${taskId}-pending`, data => {
          const { progress, message: progressMessage } = data;
          if (progress == 100) {
            socket.off(`task-${taskId}-pending`);
            setPendingTaskIds(prev => prev.filter(id => id !== taskId));
            getDecks();
            message.success('APKG导入完成！');
          }
          setProgresses(prev => ({ ...prev, [taskId]: { progress, message: progressMessage } }));
        });

        handleClose();
        getDecks();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('处理模板失败');
    }
  };

  // 新增的音频处理函数
  const handleAudioSubmit = async values => {
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('text', values.transcriptText);
    formData.append('name', values.name);
    values.description && formData.append('description', values.description);

    setAudioLoading(true);
    try {
      const response = await apiClient.post('/anki/createAdvancedDeckWithAudio', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        message.success('Audio deck created successfully!');
        handleClose();
        getDecks();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('Failed to create audio deck');
    } finally {
      setAudioLoading(false);
    }
  };

  // 播客模式提交
  const handlePodcastSubmit = async values => {
    const formData = new FormData();
    formData.append('name', values.name);
    values.description && formData.append('description', values.description);
    console.log(values, 'values');

    if (podcastMode === 'existing') {
      formData.append('podcastType', values.podcastType);
      formData.append('podcastUrl', values.podcastUrl);
    } else {
      formData.append('file', podcastFile);
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/anki/createDeckWithPodcast', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        message.success('Podcast deck created successfully!');
        const { taskId } = response.data.data;

        // 等待 socket 连接

        setPendingTaskIds(prev => [...prev, taskId]);
        on(`task-${taskId}-pending`, data => {
          const { progress, message } = data;
          if (progress == 100) {
            socket.off(`task-${taskId}-pending`);
            setPendingTaskIds(prev => prev.filter(id => id !== taskId));
            getDecks();
          }
          setProgresses(prev => ({ ...prev, [taskId]: { progress, message } }));
        });

        handleClose();
        getDecks();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('Failed to create podcast deck');
    } finally {
      setLoading(false);
    }
  };

  // EPUB模式提交
  const handleEpubSubmit = async values => {
    if (!epubFile) {
      message.error('Please select an EPUB file');
      return;
    }

    const formData = new FormData();
    formData.append('name', values.name);
    formData.append('file', epubFile);

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
    if (values.language) {
      formData.append('language', values.language);
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

  const handleSubmit = async values => {
    if (deckType === 'audio') {
      await handleAudioSubmit(values);
      return;
    }

    if (deckType === 'podcast') {
      //播客模式
      await handlePodcastSubmit(values);
      return;
    }

    if (deckType === 'epub') {
      // EPUB模式
      await handleEpubSubmit(values);
      return;
    }

    // 检查是否是APKG文件
    if (fileList.length > 0 && isApkgFile(fileList[0])) {
      // APKG文件：先解析模板
      await parseApkgTemplates(fileList[0]);
      return;
    }

    // 一般模式
    let formData = new FormData();
    Object.keys(values).forEach(key => {
      values[key] && formData.set(key, values[key]);
    });
    console.log('Received values:', values);
    if (fileList.length > 0) {
      console.log(fileList[0], 'fileList[0]');
      formData.set('file', fileList[0]);
    }
    setLoading(true);
    const response = await apiClient
      .post('/anki/addDeck', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .catch(err => err.response);
    console.log(response, 'response');
    setLoading(false);

    if (response.data.success) {
      message.success('Deck added successfully!');
      // Optionally refresh the decks list
      handleClose();
      getDecks();
    } else {
      message.error(response.data.message);
    }

    //handleClose(); // Close the drawer after submission (for now)
  };

  const getColumns = (isDuplicated = false) => [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text, row) => (
        <div>
          <a onClick={() => navigate(`/anki/${row.id}`)}>{text}</a>
          {row.status == 'processing' && row.taskId && (
            <>
              <Progress percent={progresses[row.taskId]?.progress || 0} />
              <div>{progresses[row.taskId]?.message || ''}</div>
            </>
          )}
          {row.status == 'failed' && <div style={{ color: 'red' }}>failed </div>}
          {isDuplicated && row.originalDeckName && (
            <div style={{ color: '#666', fontSize: '12px' }}>原始: {row.originalDeckName}</div>
          )}
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
      title: 'deckType',
      dataIndex: 'deckType',
      key: 'deckType',
      width: 100,
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
      width: 200,
      render: (text, row) => (
        <div>
          <Button
            disabled={row.status == 'processing'}
            type="link"
            onClick={() => navigate(`/anki/create/${row.id}`)}
          >
            Add
          </Button>
          <Button
            disabled={false && row.status == 'processing'}
            danger
            type="link"
            onClick={() => deleteDeck(row.id)}
          >
            Delete
          </Button>
          {row.owned && !isDuplicated && (
            <Button type="link" onClick={() => navigate(`/deck-original-cards/${row.id}`)}>
              {row.isShared ? 'Update' : 'Share'}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const uploadProps = {
    onRemove: file => {
      setFileList([]);
    },
    beforeUpload: file => {
      console.log(file, 'file');
      setFileList([file]);

      return false;
    },
    onChange: info => {
      console.log(info);
    },
    fileList,
  };

  // 修改Drawer内容
  const renderDrawerContent = () => {
    console.log(deckType, 'deckType');
    return (
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={changedValues => {
          if (changedValues.deckType) {
            setDeckType(changedValues.deckType);
            if (changedValues.deckType === 'podcast') {
              form.setFieldsValue({ podcastMode: 'existing' });
              form.setFieldsValue({ podcastType: 'this american life' });
            } else if (changedValues.deckType === 'epub') {
              // Set default values for EPUB
              form.setFieldsValue({
                chunkSize: 500,
                chunkOverlap: 50,
                language: 'zh',
              });
            }
          }

          if (changedValues.podcastMode) {
            setPodcastMode(changedValues.podcastMode);
          }
        }}
      >
        <Form.Item label="Deck Type" name="deckType">
          <Radio.Group buttonStyle="solid">
            <Radio.Button value="normal">Normal Deck</Radio.Button>
            <Radio.Button value="audio">Custom Audio Deck</Radio.Button>
            <Radio.Button value="podcast">Podcast Deck</Radio.Button>
            <Radio.Button value="epub">EPUB Deck</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="name"
          label="Deck Name"
          rules={[{ required: true, message: '请输入 Deck 名称!' }]}
        >
          <Input />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea />
        </Form.Item>

        {form.getFieldValue('deckType') === 'normal' ? (
          <Form.Item name="file" label="Upload File">
            <Upload {...uploadProps}>
              <Button>点击上传</Button>
            </Upload>
            {fileList.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                {isApkgFile(fileList[0]) ? (
                  <Text type="success">检测到APKG文件，将使用两步式导入流程</Text>
                ) : (
                  <Text type="secondary">普通文件，将直接导入</Text>
                )}
              </div>
            )}
          </Form.Item>
        ) : form.getFieldValue('deckType') === 'audio' ? (
          <>
            <Form.Item label="Audio File">
              <Upload
                beforeUpload={file => {
                  setAudioFile(file);
                  return false;
                }}
                onRemove={() => setAudioFile(null)}
                fileList={audioFile ? [audioFile] : []}
              >
                <Button>Upload Audio</Button>
              </Upload>
            </Form.Item>
            <Form.Item label="Transcript Text" name="transcriptText">
              <Input.TextArea rows={6} placeholder="00:00:00.84|Ira Glass: Hello..." />
            </Form.Item>
          </>
        ) : form.getFieldValue('deckType') === 'epub' ? (
          <>
            <Form.Item label="EPUB File" required>
              <Upload
                beforeUpload={file => {
                  // Validate EPUB file
                  if (!file.name.toLowerCase().endsWith('.epub')) {
                    message.error('Please select a valid EPUB file');
                    return false;
                  }
                  setEpubFile(file);
                  return false;
                }}
                onRemove={() => setEpubFile(null)}
                fileList={epubFile ? [epubFile] : []}
                accept=".epub"
              >
                <Button>Upload EPUB File</Button>
              </Upload>
              {epubFile && (
                <div style={{ marginTop: '8px' }}>
                  <Text type="success">✓ {epubFile.name}</Text>
                </div>
              )}
            </Form.Item>

            <Form.Item
              label="Chunk Size"
              name="chunkSize"
              tooltip="Text segmentation size (100-2000 characters)"
            >
              <Input type="number" placeholder="500" min={100} max={2000} />
            </Form.Item>

            <Form.Item
              label="Chunk Overlap"
              name="chunkOverlap"
              tooltip="Overlap between text segments (0-200 characters)"
            >
              <Input type="number" placeholder="50" min={0} max={200} />
            </Form.Item>

            <Form.Item
              label="Language"
              name="language"
              tooltip="Language for better text segmentation"
            >
              <Select placeholder="Select language" defaultValue="zh">
                <Select.Option value="zh">Chinese (中文)</Select.Option>
                <Select.Option value="en">English</Select.Option>
                <Select.Option value="es">Spanish</Select.Option>
                <Select.Option value="fr">French</Select.Option>
                <Select.Option value="de">German</Select.Option>
                <Select.Option value="ja">Japanese</Select.Option>
                <Select.Option value="ko">Korean</Select.Option>
              </Select>
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item label="Podcast Mode" name="podcastMode">
              <Radio.Group buttonStyle="solid">
                <Radio.Button value="existing">Use Existing Podcast</Radio.Button>
                <Radio.Button value="ai">Use AI to Split Podcast</Radio.Button>
              </Radio.Group>
            </Form.Item>

            {form.getFieldValue('podcastMode') === 'existing' ? (
              <>
                <Form.Item label="Podcast" name="podcastType">
                  <Select>
                    <Select.Option value="this american life">This American Life</Select.Option>
                    <Select.Option value="overthink">Overthink</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item label="URL" name="podcastUrl">
                  <Input placeholder="Enter URL, e.g., https://www.thisamericanlife.org/846/transcript" />
                </Form.Item>
              </>
            ) : (
              <Form.Item label="Upload Podcast File" name="podcastFile">
                <Upload
                  beforeUpload={file => {
                    setPodcastFile(file);
                    return false;
                  }}
                  onRemove={() => setPodcastFile(null)}
                  fileList={podcastFile ? [podcastFile] : []}
                >
                  <Button>Upload Podcast</Button>
                </Upload>
              </Form.Item>
            )}
          </>
        )}

        <Form.Item>
          <Button
            loading={deckType === 'audio' ? audioLoading : loading}
            type="primary"
            htmlType="submit"
          >
            提交
          </Button>
        </Form.Item>
      </Form>
    );
  };

  const tabItems = [
    {
      key: 'original',
      label: `Created (${originalDecks.length})`,
      children: (
        <Table
          loading={decksLoading}
          dataSource={originalDecks}
          rowKey={row => row.id}
          pagination={false}
          columns={getColumns(false)}
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
          pagination={false}
          columns={getColumns(true)}
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
      <Drawer
        title="添加 Deck"
        placement="right"
        onClose={handleClose}
        maskClosable={false}
        open={visible}
        width={600}
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
          renderDrawerContent()
        )}
      </Drawer>
      <ApkgTemplateSelector
        visible={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        onConfirm={processSelectedTemplates}
        templates={apkgTemplates?.templates}
        totalNotes={apkgTemplates?.totalNotes}
        totalCards={apkgTemplates?.totalCards}
      />
    </div>
  );
};

export default Decks;
