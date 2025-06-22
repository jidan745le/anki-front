import { Button, message, Modal, Table, Tag } from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '../../common/hooks/useI18n';
import apiClient from '../../common/http/apiClient';

const SharedDeckView = () => {
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
  const [deckInfo, setDeckInfo] = useState(null);
  const [duplicating, setDuplicating] = useState(false);

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
      message.error(t('sharedDeckView.messages.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = () => {
    Modal.confirm({
      title: t('sharedDeckView.duplicate.title'),
      content: t('sharedDeckView.duplicate.content', undefined, { deckName: deckInfo?.name }),
      okText: t('sharedDeckView.duplicate.okText'),
      cancelText: t('sharedDeckView.duplicate.cancelText'),
      onOk: async () => {
        setDuplicating(true);
        try {
          const response = await apiClient.post(`/anki/duplicate/${deckId}`);
          if (response.data.success) {
            message.success(t('sharedDeckView.duplicate.success'));
            navigate('/decks');
          } else {
            message.error(response.data.message);
          }
        } catch (error) {
          message.error(t('sharedDeckView.duplicate.error'));
        } finally {
          setDuplicating(false);
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
      title: t('sharedDeckView.table.front'),
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
      title: t('sharedDeckView.table.back'),
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
      title: t('sharedDeckView.table.createdAt'),
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
            ← {t('sharedDeckView.backToDecks')}
          </Button>
          <h2 style={{ display: 'inline-block', margin: 0 }}>
            {deckInfo?.name || t('deckOriginalCards.loading')}
          </h2>
          <Tag color="blue" style={{ marginLeft: '12px' }}>
            {t('sharedDeckView.sharedDeckTag')}
          </Tag>
        </div>
        <Button
          type="primary"
          disabled={deckInfo?.duplicated}
          onClick={handleDuplicate}
          loading={duplicating}
        >
          {deckInfo?.duplicated
            ? t('sharedDeckView.duplicated')
            : t('sharedDeckView.duplicateToCollection')}
        </Button>
      </div>

      {deckInfo && (
        <div
          style={{
            background: '#f5f5f5',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          <h3>{t('sharedDeckView.deckInformation')}</h3>
          <p>
            <strong>{t('sharedDeckView.creator')}:</strong>{' '}
            {deckInfo.creator?.username || t('sharedDeckView.unknown')}
          </p>
          <p>
            <strong>{t('sharedDeckView.description')}:</strong>{' '}
            {deckInfo.description || t('sharedDeckView.noDescription')}
          </p>
          <p>
            <strong>{t('sharedDeckView.totalCards')}:</strong> {deckInfo.totalCards || 0}
          </p>
          <p>
            <strong>{t('sharedDeckView.deckType')}:</strong>{' '}
            {deckInfo.deckType || t('sharedDeckView.normal')}
          </p>
        </div>
      )}

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
          showTotal: total => t('sharedDeckView.table.totalCards', undefined, { total }),
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default SharedDeckView;
