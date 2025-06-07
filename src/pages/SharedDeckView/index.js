import { Button, message, Modal, Table, Tag } from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import apiClient from '../../common/http/apiClient';

const SharedDeckView = () => {
  const { deckId } = useParams();
  const navigate = useNavigate();
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
      message.error('Failed to fetch cards');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = () => {
    Modal.confirm({
      title: 'Duplicate Deck',
      content: `Are you sure you want to duplicate the deck "${deckInfo?.name}"? This will add all cards to your personal collection.`,
      okText: 'Duplicate',
      cancelText: 'Cancel',
      onOk: async () => {
        setDuplicating(true);
        try {
          const response = await apiClient.post(`/anki/duplicate/${deckId}`);
          if (response.data.success) {
            message.success('Deck duplicated successfully!');
            navigate('/decks');
          } else {
            message.error(response.data.message);
          }
        } catch (error) {
          message.error('Failed to duplicate deck');
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
      title: 'Front',
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
      title: 'Back',
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
      title: 'Created At',
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
            ← Back to Decks
          </Button>
          <h2 style={{ display: 'inline-block', margin: 0 }}>{deckInfo?.name || 'Loading...'}</h2>
          <Tag color="blue" style={{ marginLeft: '12px' }}>
            Shared Deck
          </Tag>
        </div>
        <Button type="primary" onClick={handleDuplicate} loading={duplicating}>
          Duplicate to My Collection
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
          <h3>Deck Information</h3>
          <p>
            <strong>Creator:</strong> {deckInfo.creator?.username || 'Unknown'}
          </p>
          <p>
            <strong>Description:</strong> {deckInfo.description || 'No description'}
          </p>
          <p>
            <strong>Total Cards:</strong> {deckInfo.totalCards || 0}
          </p>
          <p>
            <strong>Deck Type:</strong> {deckInfo.deckType || 'Normal'}
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
          showTotal: total => `Total ${total} cards`,
        }}
        onChange={handleTableChange}
      />
    </div>
  );
};

export default SharedDeckView;
