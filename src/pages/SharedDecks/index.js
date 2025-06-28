import { CalendarOutlined, FileTextOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Card, Col, Empty, message, Row, Spin, Tag } from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../common/hooks/useI18n';
import apiClient from '../../common/http/apiClient';

const { Meta } = Card;

const SharedDecks = () => {
  const [sharedDecks, setSharedDecks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [duplicatingDeckIds, setDuplicatingDeckIds] = useState([]);
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    fetchSharedDecks();
  }, []);

  const fetchSharedDecks = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/anki/shared-decks');
      if (response.data.success) {
        setSharedDecks(response.data.data);
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error(t('sharedDecks.messages.fetchError'));
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (deckId, deckName) => {
    setDuplicatingDeckIds(prev => [...prev, deckId]);
    try {
      const response = await apiClient.post(`/anki/duplicate/${deckId}`);
      if (response.data.success) {
        message.success(t('sharedDecks.messages.duplicateSuccess', undefined, { deckName }));
        // Refresh the shared decks to update the duplicated status
        fetchSharedDecks();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error(t('sharedDecks.messages.duplicateError'));
    } finally {
      setDuplicatingDeckIds(prev => prev.filter(id => id !== deckId));
    }
  };

  const renderDeckCard = deck => {
    const cardActions = [
      <Button
        key="view"
        type="link"
        onClick={e => {
          e.stopPropagation();
          navigate(`/shared-deck-view/${deck.id}`);
        }}
      >
        {t('sharedDecks.actions.viewDetails')}
      </Button>,
      <Button
        key="duplicate"
        type="primary"
        disabled={!!deck.duplicated}
        loading={duplicatingDeckIds.includes(deck.id)}
        onClick={e => {
          e.stopPropagation();
          handleDuplicate(deck.id, deck.name);
        }}
      >
        {deck.duplicated ? t('sharedDecks.actions.duplicated') : t('sharedDecks.actions.duplicate')}
      </Button>,
    ];

    return (
      <Col xs={24} sm={12} md={8} lg={6} key={deck.id}>
        <Card
          hoverable
          style={{
            marginBottom: '16px',
            // height: '280px',
            display: 'flex',
            flexDirection: 'column',
          }}
          bodyStyle={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          actions={cardActions}
          onClick={() => navigate(`/shared-deck-view/${deck.id}`)}
        >
          <div>
            <Meta
              title={
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {deck.name}
                </div>
              }
              description={
                <div
                  style={{
                    height: '60px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: '#666',
                  }}
                >
                  {deck.description || t('sharedDecks.cardInfo.noDescription')}
                </div>
              }
            />
          </div>

          <div style={{ marginTop: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px',
                fontSize: '12px',
                color: '#888',
              }}
            >
              <UserOutlined style={{ marginRight: '4px' }} />
              <span>
                {t('sharedDecks.cardInfo.createdBy')}{' '}
                {deck.creator?.username || t('sharedDecks.cardInfo.unknown')}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px',
                fontSize: '12px',
                color: '#888',
              }}
            >
              <FileTextOutlined style={{ marginRight: '4px' }} />
              <span>
                {deck.totalCards || 0} {t('sharedDecks.cardInfo.cards')}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px',
                fontSize: '12px',
                color: '#888',
              }}
            >
              <CalendarOutlined style={{ marginRight: '4px' }} />
              <span>{new Date(deck.createdAt).toLocaleDateString()}</span>
            </div>

            <div style={{ marginTop: '8px' }}>
              <Tag color="blue">{deck.deckType || t('sharedDecks.cardInfo.normalType')}</Tag>
              <Tag color="green">{t('sharedDecks.cardInfo.sharedTag')}</Tag>
            </div>
          </div>
        </Card>
      </Col>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <Spin size="large" tip={t('sharedDecks.loading.fetchingDecks')} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f5f5f5' }}>
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
          {t('sharedDecks.title')}
        </h1>
        <Button onClick={() => navigate('/decks')}>
          ← {t('sharedDecks.navigation.backToMyDecks')}
        </Button>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '24px',
          minHeight: '400px',
        }}
      >
        {sharedDecks.length === 0 ? (
          <Empty
            description={t('sharedDecks.empty.noDecksAvailable')}
            style={{ margin: '50px 0' }}
          />
        ) : (
          <Row gutter={[16, 16]}>{sharedDecks.map(renderDeckCard)}</Row>
        )}
      </div>
    </div>
  );
};

export default SharedDecks;
