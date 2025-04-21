import React, { useEffect, useState, useRef } from 'react';
import { Button, Modal, Spin, Card, Input, Radio, Upload, message } from 'antd';
import FooterBar from '../Footbar';
import MyEditor from '../Editor';
import { UploadOutlined } from '@ant-design/icons';
import CreationEditor from '../CreationEditor';

const token = localStorage.getItem('token');
function AnkiCardCreator({ onChange }) {
  const [type, setType] = useState('text');
  const ankiRef = useRef({});
  const [fileList, setFileList] = useState([]);

  const onAnkiChange = value => {
    ankiRef.current = { ...ankiRef.current, ...value };
    onChange(ankiRef.current);
  };

  const uploadProps = {
    name: 'file',
    action: '/api/file/upload-temp',
    headers: {
      authorization: `Bearer ${token}`,
    },
    onChange(info) {
      let newFileList = [...info.fileList];
      newFileList = newFileList.slice(-1);
      setFileList(newFileList);

      if (info.file.status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      if (info.file.status === 'done') {
        const originalName = info.file.response.data.originalName;
        onAnkiChange({ front: info.file.response.data.tempFileId, originalName });
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };

  return (
    <>
      <Card
        bordered={false}
        title={
          <div
            style={{
              display: 'flex',
              justifyContent: 'flexStart',
              fontSize: '24px',
              fontWeight: 'bold',
            }}
          >
            <Radio.Group
              value={type}
              onChange={value => {
                setType(value.target.value);
              }}
            >
              <Radio.Button value="text">text</Radio.Button>
              <Radio.Button value="media">media</Radio.Button>
            </Radio.Group>
            {type === 'text' ? (
              <Input
                style={{ width: '600px' }}
                onChange={e => {
                  onAnkiChange({ front: e.target.value });
                }}
                placeholder="请输入正面"
              />
            ) : (
              <Upload style={{ display: 'flex' }} fileList={fileList} {...uploadProps}>
                <Button icon={<UploadOutlined />}>Upload</Button>
              </Upload>
            )}
          </div>
        }
      >
        <CreationEditor onChange={value => onAnkiChange({ back: value })} />
      </Card>
    </>
  );
}

export default AnkiCardCreator;
