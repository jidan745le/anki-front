import React, { useEffect, useState, useRef } from 'react';
import { message, Table, Button, Drawer, Form, Input, Upload, Tag, Modal, Radio, Select } from 'antd';
import apiClient from '../../common/http/apiClient';
import { useNavigate, useParams } from 'react-router-dom';
import FooterBar from '../../component/Footbar';
import { get, set, values } from 'lodash';
import StreamingTooltip from '../../component/StreamingTooltip';
import { render } from 'less';

const Decks = () => {
    const [decks, setDecks] = useState([]);
    const [visible, setVisible] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [audioFile, setAudioFile] = useState(null);
    const [audioLoading, setAudioLoading] = useState(false);
    const [deckType, setDeckType] = useState('normal'); // 'normal' or 'audio' or 'podcast'
    const [podcastFile, setPodcastFile] = useState(null);
    const [podcastMode, setPodcastMode] = useState('existing');

    useEffect(() => {
        getDecks()
    }, []);

    const getDecks = () => {
        // Fetch decks
        apiClient.get(`/app/anki/getDecks`).then(res => {
            const data = res.data;
            if (data.success) {
                setDecks(data.data);
                return;
            }
            message.error(data.message);
        }).catch(err => {
            console.log(err);
        });
    }

    const deleteDeck = (deckId) => {
        Modal.confirm({
            title: 'Delete Deck',
            content: 'Are you sure you want to delete this deck?',
            okText: 'Yes',
            okType: 'danger',
            cancelText: 'No',
            async onOk() {
                const response = await apiClient.post(`/app/anki/deleteDeck/${deckId}`).catch(err => err.response);
                if (response.data.success) {
                    message.success('Deck deleted successfully!')
                    getDecks();
                } else {
                    message.error(response.data.message);
                }
            }
        })

    }

    const handleAddDeck = () => {
        form.setFieldValue('deckType', 'normal');
        setVisible(true);
    };

    const handleClose = () => {
        setVisible(false);
        setFileList([]);
        setAudioFile(null);
        form.resetFields(); // Reset form fields when closing
    };

    // 新增的音频处理函数
    const handleAudioSubmit = async (values) => {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('text', values.transcriptText);
        formData.append('name', values.name);
        values.description &&  formData.append('description', values.description);

        setAudioLoading(true);
        try {
            const response = await apiClient.post(
                '/app/anki/createDeckWithAudio',
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

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

    const handlePodcastSubmit = async (values) => {
        const formData = new FormData();
        formData.append('name', values.name);
        values.description && formData.append('description', values.description);
        console.log(values, "values")

        if (podcastMode === 'existing') {
            formData.append('podcastType', values.podcastType);
            formData.append('podcastUrl', values.podcastUrl);
        } else {
            formData.append('file', podcastFile);
        }

        setAudioLoading(true);
        try {
            const response = await apiClient.post(
                '/app/anki/createDeckWithPodcast',
                formData,
                { headers: { 'Content-Type': 'multipart/form-data' } }
            );

            if (response.data.success) {
                message.success('Podcast deck created successfully!');
                handleClose();
                getDecks();
            } else {
                message.error(response.data.message);
            }
        } catch (error) {
            message.error('Failed to create podcast deck');
        } finally {
            setAudioLoading(false);
        }
    };


    const handleSubmit = async (values) => {
        if (deckType === 'audio') {
            await handleAudioSubmit(values);
            return;
        }

        if (deckType === 'podcast') {
            //播客模式
            await handlePodcastSubmit(values);
            return;
        }


        // 一般模式
        let formData = new FormData();
        Object.keys(values).forEach(key => {
            values[key] && formData.set(key, values[key]);
        })
        console.log('Received values:', values);
        if (fileList.length > 0) {
            console.log(fileList[0], "fileList[0]")
            formData.set('file', fileList[0]);
        }
        setLoading(true);
        const response = await apiClient.post(
            '/app/anki/addDeck',
            formData,
            { headers: { 'Content-Type': 'multipart/form-data' } }
        ).catch(err => err.response);
        console.log(response, "response")
        setLoading(false);

        if (response.data.success) {
            message.success('Deck added successfully!')
            // Optionally refresh the decks list
            handleClose();
            getDecks();
        } else {
            message.error(response.data.message);
        }

        //handleClose(); // Close the drawer after submission (for now)
    };

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, row) => <a onClick={() => navigate(`/anki/${row.id}`)}>{text}</a>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            render: text => text || ""
        },
        {
            title: 'Stats',
            dataIndex: 'stats',
            key: 'stats',
            render: (text, row) => {
                return <div>
                    <Tag color="blue">New: {row.stats.newCards}</Tag>
                    <Tag color="green">Due: {row.stats.dueCards}</Tag>
                    <Tag color="red">Review: {row.stats.totalReviewCards}</Tag>
                    <Tag color="pink">Total: {row.stats.totalCards}</Tag>
                </div>
            }

        },
        {
            title: 'Action',
            key: 'action',
            width: 500,
            render: (text, row) => (
                <div>
                    <Button type="link" onClick={() => navigate(`/anki/create/${row.id}`)}>
                        Add Card
                    </Button>
                    <Button danger type="link" onClick={() => deleteDeck(row.id)}>
                        Delete
                    </Button>
                </div>

            ),
        }
    ];

    const uploadProps = {
        onRemove: (file) => {
            setFileList([]);
        },
        beforeUpload: (file) => {
            console.log(file, "file")
            setFileList([file]);

            return false;
        },
        onChange: (info) => {
            console.log(info);
        },
        fileList,
    };

    // 修改Drawer内容
    const renderDrawerContent = () => {
        console.log(deckType, "deckType");
        return <Form form={form} layout="vertical" onFinish={handleSubmit} onValuesChange={changedValues => {
            if (changedValues.deckType) {
                setDeckType(changedValues.deckType);
                if(changedValues.deckType === "podcast"){
                    form.setFieldsValue({podcastMode: "existing"})
                    form.setFieldsValue({podcastType: "this american life"})
                }
            }

            if(changedValues.podcastMode){
                setPodcastMode(changedValues.podcastMode);          
            }
        }}>
            <Form.Item label="Deck Type" name="deckType">
                <Radio.Group
                    buttonStyle="solid"               
                >
                    <Radio.Button value="normal">Normal Deck</Radio.Button>
                    <Radio.Button value="audio">Custom Audio Deck</Radio.Button>
                    <Radio.Button value="podcast">Podcast Deck</Radio.Button>
                </Radio.Group>
            </Form.Item>

            <Form.Item
                name="name"
                label="Deck Name"
                rules={[{ required: true, message: '请输入 Deck 名称!' }]}
            >
                <Input />
            </Form.Item>

            <Form.Item
                name="description"
                label="Description"
            >
                <Input.TextArea />
            </Form.Item>

            {form.getFieldValue("deckType") === 'normal' ? (
                <Form.Item name="file" label="Upload File">
                    <Upload {...uploadProps}>
                        <Button>点击上传</Button>
                    </Upload>
                </Form.Item>
            ) : form.getFieldValue("deckType")=== 'audio' ? (
                <>
                    <Form.Item label="Audio File">
                        <Upload
                            beforeUpload={(file) => {
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
                        <Input.TextArea
                            rows={6}
                            placeholder="00:00:00.84|Ira Glass: Hello..."
                        />
                    </Form.Item>
                </>
            ) : (
                <>
                    <Form.Item label="Podcast Mode" name="podcastMode">
                        <Radio.Group
                            buttonStyle="solid"
                        >
                            <Radio.Button value="existing">Use Existing Podcast</Radio.Button>
                            <Radio.Button value="ai">Use AI to Split Podcast</Radio.Button>
                        </Radio.Group>
                    </Form.Item>

                    {form.getFieldValue("podcastMode") === 'existing' ? (
                        <>
                            <Form.Item label="Podcast" name="podcastType">
                                <Select>
                                    <Select.Option value="this american life">This American Life</Select.Option>
                                    <Select.Option value="overthink">Overthink</Select.Option>
                                </Select>
                            </Form.Item>
                            <Form.Item label="URL" name="podcastUrl">
                                <Input
                                    placeholder="Enter URL, e.g., https://www.thisamericanlife.org/846/transcript"
                                />
                            </Form.Item>
                        </>
                    ) : (
                        <Form.Item label="Upload Podcast File" name="podcastFile">
                            <Upload                                
                                beforeUpload={(file) => {
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
    };




    return (
        <div style={{ padding: "12px" }}>
            <Table dataSource={decks} rowKey={row => row.id} pagination={false} columns={columns} />
            <FooterBar>
                <Button danger type="primary" onClick={handleAddDeck} >
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
                {renderDrawerContent()}
            </Drawer>

        </div>
    );
};

export default Decks;