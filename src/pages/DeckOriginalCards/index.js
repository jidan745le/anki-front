import { Button, message, Modal, Table } from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../common/hooks/useI18n';
import apiClient from '../../common/http/apiClient';

const DeckOriginalCards = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [publishing, setPublishing] = useState(false);
  const [deckInfo, setDeckInfo] = useState(null);

  useEffect(() => {
    fetchCards();
  }, [deckId, pagination.current, pagination.pageSize]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/anki/decks/${deckId}/original-cards?page=${pagination.current}&limit=${pagination.pageSize}`
      );

      if (response.data.success) {
        setCards(response.data.data.data);
        setDeckInfo(response.data.data.deckInfo);
        setPagination(prev => ({
          ...prev,
          total: response.data.data.total,
        }));
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error(t('deckOriginalCards.messages.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    Modal.confirm({
      title: t('deckOriginalCards.share.title'),
      content: t('deckOriginalCards.share.content', undefined, { deckName: deckInfo?.name }),
      okText: t('deckOriginalCards.share.okText'),
      cancelText: t('deckOriginalCards.share.cancelText'),
      onOk: async () => {
        setPublishing(true);
        try {
          const response = await apiClient.post(`/anki/share/${deckId}`);
          if (response.data.success) {
            message.success(t('deckOriginalCards.share.success'));
            navigate('/decks');
          } else {
            message.error(response.data.message);
          }
        } catch (error) {
          message.error(t('deckOriginalCards.share.error'));
        } finally {
          setPublishing(false);
        }
      },
    });
  };

  const handleTableChange = paginationConfig => {
    setPagination({
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
      total: paginationConfig.total,
    });
  };

  const columns = [
    {
      title: t('deckOriginalCards.table.front'),
      dataIndex: 'front',
      key: 'front',
      width: '40%',
      render: text => (
        <div
          style={{
            maxHeight: '100px',
            overflow: 'auto',
            wordBreak: 'break-word',
            padding: '8px',
            background: '#fafafa',
            borderRadius: '4px',
            border: '1px solid #e8e8e8',
          }}
        >
          {text}
        </div>
      ),
    },
    {
      title: t('deckOriginalCards.table.back'),
      dataIndex: 'back',
      key: 'back',
      width: '40%',
      render: text => (
        <div
          style={{
            maxHeight: '100px',
            overflow: 'auto',
            wordBreak: 'break-word',
            padding: '8px',
            background: '#f0f9ff',
            borderRadius: '4px',
            border: '1px solid #bae7ff',
          }}
        >
          {text}
        </div>
      ),
    },
    {
      title: t('deckOriginalCards.table.createdAt'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '20%',
      render: text => (
        <div style={{ fontSize: '12px', color: '#666' }}>{new Date(text).toLocaleString()}</div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <Button onClick={() => navigate('/decks')} style={{ marginRight: '12px' }}>
            ← {t('deckOriginalCards.backToDecks')}
          </Button>
          <h2 style={{ display: 'inline-block', margin: 0 }}>
            {deckInfo?.name || t('deckOriginalCards.loading')}
          </h2>
        </div>
        <Button
          type="primary"
          onClick={handlePublish}
          loading={publishing}
          disabled={!deckInfo || deckInfo.isShared}
        >
          {deckInfo?.isShared
            ? t('deckOriginalCards.alreadyShared')
            : t('deckOriginalCards.publishToShare')}
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={cards}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: total => t('deckOriginalCards.table.totalCards', undefined, { total }),
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default DeckOriginalCards;
