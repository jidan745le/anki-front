import React, { useEffect, useState,useRef } from 'react';
import { message, Table, Button, Drawer, Form, Input, Upload,Tag, Modal,Radio } from 'antd';
import apiClient from '../../common/http/apiClient';
import { useNavigate, useParams } from 'react-router-dom';
import FooterBar from '../../component/Footbar';
import { get } from 'lodash';
import StreamingTooltip from '../../component/StreamingTooltip';
import { render } from 'less';

const Decks = () => {
    const [decks, setDecks] = useState([]);
    const [visible, setVisible] = useState(false);
    const [fileList, setFileList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [audioModalVisible, setAudioModalVisible] = useState(false);
    const [audioFile, setAudioFile] = useState(null);
    const [transcriptText, setTranscriptText] = useState('');
    const [deckType, setDeckType] = useState('normal'); // 'normal' or 'audio'
    const [audioLoading, setAudioLoading] = useState(false);

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

    const deleteDeck =  (deckId) => {
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
        setVisible(true);
    };

    const handleClose = () => {
        setVisible(false);
        form.resetFields(); // Reset form fields when closing
    };

    // 新增的音频处理函数
    const handleAudioSubmit = async (values) => {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('text', transcriptText);
        formData.append('name', values.name);
        formData.append('description', values.description);

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

    const handleSubmit = async (values) => {
        if (deckType === 'audio') {
            await handleAudioSubmit(values);
            return;
        }
        // Handle form submission
        let formData = new FormData();
        Object.keys(values).forEach(key => {
            formData.set(key, values[key]);
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
const renderDrawerContent = () => (
    <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Deck Type" name="deckType">
            <Radio.Group 
                onChange={(e) => setDeckType(e.target.value)}
                value={deckType}
            >
                <Radio value="normal">Normal Deck</Radio>
                <Radio value="audio">Audio Deck</Radio>
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

        {deckType === 'normal' ? (
            <Form.Item name="file" label="Upload File">
                <Upload {...uploadProps}>
                    <Button>点击上传</Button>
                </Upload>
            </Form.Item>
        ) : (
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
                <Form.Item label="Transcript Text">
                    <Input.TextArea
                        rows={6}
                        value={transcriptText}
                        onChange={(e) => setTranscriptText(e.target.value)}
                        placeholder="00:00:00.84|Ira Glass: Hello..."
                    />
                </Form.Item>
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