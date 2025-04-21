import React, { useState, useEffect } from 'react';
import { message, Spin, Tag, Button, Modal } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import AnkiCardCreator from '../../component/AnkiCardCreator';
import apiClient from '../../common/http/apiClient';
import FooterBar from '../../component/Footbar';

function AnkiCreate() {
  const params = useParams();
  const navigate = useNavigate();
  const createParamsRef = React.useRef({});
  const [refresh, setRefresh] = useState(Date.now());

  const createCard = () => {
    apiClient
      .post(`/anki/addCard`, { ...createParamsRef.current, deckId: Number(params.deckId) })
      .then(res => {
        const data = res.data;
        if (data.success) {
          console.log(data);
          Modal.confirm({
            title: 'Anki创建成功,是否继续创建？',
            content: data.data.id + ':Anki创建成功，Anki创建成功,是否继续创建？',
            okText: '确定',
            onOk() {
              createParamsRef.current = {};
              setRefresh(Date.now());
            },
            cancelText: '取消',
            onCancel() {
              navigate('/decks');
            },
          });
          return;
        }
        // message.error(data.message)
      })
      .catch(err => {
        console.log(err);
      });
  };

  return (
    <>
      <AnkiCardCreator
        key={refresh}
        onChange={value => {
          createParamsRef.current = { ...createParamsRef.current, ...value };
        }}
      />
      <FooterBar>
        <Button danger type="primary" onClick={createCard}>
          创建Anki
        </Button>
      </FooterBar>
    </>
  );
}

export default AnkiCreate;
