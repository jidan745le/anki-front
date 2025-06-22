import { SearchOutlined } from '@ant-design/icons';
import { Button, Input, Select, Space, Table, Tag, Tooltip } from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../common/hooks/useI18n';
import apiClient from '../../common/http/apiClient';
import './style.less';

const Search = () => {
  const { t, currentLanguage } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [decks, setDecks] = useState([]);
  const [decksLoading, setDecksLoading] = useState(false);
  const [tableParams, setTableParams] = useState({
    pagination: {
      current: 1,
      pageSize: 20,
    },
    filters: {},
    sortField: 'createdAt',
    sortOrder: 'ascend',
  });

  // 获取标签的翻译显示
  const getTagLabel = tagKey => {
    const translations = {
      en: {
        favorite: 'Favorite',
        important: 'Important',
        difficult: 'Difficult',
        error_prone: 'Error Prone',
        review: 'Review',
      },
      zh: {
        favorite: '收藏',
        important: '重要',
        difficult: '难点',
        error_prone: '易错',
        review: '复习',
      },
    };

    return translations[currentLanguage]?.[tagKey] || translations.en[tagKey] || tagKey;
  };

  // 获取用户的所有deck
  const fetchDecks = async () => {
    setDecksLoading(true);
    try {
      const response = await apiClient.get('/anki/getDecks');
      if (response.data.success) {
        setDecks(response.data.data);
      } else {
        console.error('Failed to fetch decks:', response.data.message);
      }
    } catch (error) {
      console.error('Error fetching decks:', error);
    } finally {
      setDecksLoading(false);
    }
  };

  // 初始化时获取decks
  useEffect(() => {
    fetchDecks();
  }, []);

  // 定义表格列
  const columns = [
    {
      title: t('searchPage.columnDeck'),
      dataIndex: ['deck', 'name'],
      key: 'deckName',
      width: '15%',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters = () => {} }) => (
        <div style={{ padding: 8 }}>
          <Select
            placeholder={t('searchPage.selectDeck')}
            value={selectedKeys[0]}
            onChange={value => setSelectedKeys(value ? [value] : [])}
            style={{ width: 200, marginBottom: 8, display: 'block' }}
            loading={decksLoading}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={decks.map(deck => ({
              value: deck.id,
              label: deck.name,
            }))}
          />
          <Space>
            <Button type="primary" onClick={() => confirm()} size="small" style={{ width: 90 }}>
              {t('searchPage.filterButton')}
            </Button>
            <Button
              onClick={() => clearFilters && clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              {t('searchPage.resetButton')}
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
    },
    {
      title: t('searchPage.columnFront'),
      dataIndex: 'front',
      key: 'front',
      width: '20%',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters = () => {} }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder={t('searchPage.searchFrontContent')}
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              {t('searchPage.searchButton')}
            </Button>
            <Button
              onClick={() => clearFilters && clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              {t('searchPage.resetButton')}
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      render: text => (
        <Tooltip title={text} placement="topLeft">
          <div
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </div>
        </Tooltip>
      ),
      sorter: true,
    },
    {
      title: t('searchPage.columnBack'),
      dataIndex: 'back',
      key: 'back',
      width: '20%',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters = () => {} }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder={t('searchPage.searchBackContent')}
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              {t('searchPage.searchButton')}
            </Button>
            <Button
              onClick={() => clearFilters && clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              {t('searchPage.resetButton')}
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      render: (text, record) => {
        const backContent = record.customBack || record.back || '';
        return (
          <Tooltip title={backContent} placement="topLeft">
            <div
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {backContent}
            </div>
          </Tooltip>
        );
      },
      sorter: true,
    },
    {
      title: t('searchPage.columnTags'),
      dataIndex: 'tags',
      key: 'tags',
      width: '15%',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters = () => {} }) => (
        <div style={{ padding: 8 }}>
          <Input
            placeholder={t('searchPage.searchTags')}
            value={selectedKeys[0]}
            onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
            onPressEnter={() => confirm()}
            style={{ marginBottom: 8, display: 'block' }}
          />
          <Space>
            <Button
              type="primary"
              onClick={() => confirm()}
              icon={<SearchOutlined />}
              size="small"
              style={{ width: 90 }}
            >
              {t('searchPage.searchButton')}
            </Button>
            <Button
              onClick={() => clearFilters && clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              {t('searchPage.resetButton')}
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      render: (tags, record) => {
        const tagContent = record.tags || record.card?.tags || '';
        if (!tagContent) return '-';

        // 将逗号分隔的字符串拆分成数组
        const tagArray = tagContent.split(',').filter(tag => tag.trim() !== '');

        if (tagArray.length === 0) return '-';

        return (
          <div
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {tagArray.map((tag, index) => (
              <Tag
                key={index}
                color="blue"
                style={{
                  marginBottom: 4,
                  fontSize: '12px',
                }}
              >
                {getTagLabel(tag.trim())}
              </Tag>
            ))}
          </div>
        );
      },
      sorter: true,
    },
    {
      title: t('searchPage.columnState'),
      dataIndex: 'state',
      key: 'state',
      width: '10%',
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters = () => {} }) => (
        <div style={{ padding: 8 }}>
          <Select
            placeholder={t('searchPage.selectState')}
            value={selectedKeys[0]}
            onChange={value => setSelectedKeys(value ? [value] : [])}
            style={{ width: 150, marginBottom: 8, display: 'block' }}
            allowClear
            options={[
              { value: 0, label: t('searchPage.stateNew') },
              { value: 1, label: t('searchPage.stateLearning') },
              { value: 2, label: t('searchPage.stateReview') },
              { value: 3, label: t('searchPage.stateRelearning') },
              { value: 4, label: t('searchPage.stateSuspended') },
            ]}
          />
          <Space>
            <Button type="primary" onClick={() => confirm()} size="small" style={{ width: 90 }}>
              {t('searchPage.filterButton')}
            </Button>
            <Button
              onClick={() => clearFilters && clearFilters()}
              size="small"
              style={{ width: 90 }}
            >
              {t('searchPage.resetButton')}
            </Button>
          </Space>
        </div>
      ),
      filterIcon: filtered => (
        <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
      ),
      render: state => {
        const stateLabels = {
          0: t('searchPage.stateNew'),
          1: t('searchPage.stateLearning'),
          2: t('searchPage.stateReview'),
          3: t('searchPage.stateRelearning'),
          4: t('searchPage.stateSuspended'),
        };
        const stateColors = {
          0: '#52c41a',
          1: '#1890ff',
          2: '#722ed1',
          3: '#fa8c16',
          4: '#f5222d',
        };
        return (
          <span style={{ color: stateColors[state] || '#000' }}>
            {stateLabels[state] || t('searchPage.stateUnknown')}
          </span>
        );
      },
      sorter: true,
    },
    {
      title: t('searchPage.columnCreated'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '12%',
      render: createdAt => {
        if (!createdAt) return '-';
        const date = new Date(createdAt);
        return date.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
      sorter: true,
    },
    {
      title: t('searchPage.columnActions'),
      key: 'actions',
      width: '8%',
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            // 跳转到Anki页面并定位到特定卡片
            navigate(`/anki/${record.deck.id}?uuid=${record.uuid}`);
          }}
        >
          {t('searchPage.view')}
        </Button>
      ),
    },
  ];

  // 转换查询参数
  const getQueryParams = params => {
    const { pagination, filters, sortField, sortOrder } = params;
    const result = {};

    // 分页参数
    result.page = pagination?.current || 1;
    result.limit = pagination?.pageSize || 20;

    // 排序参数
    if (sortField) {
      result.sortBy = sortField;
      result.sortOrder = sortOrder === 'ascend' ? 'ASC' : 'DESC';
    }

    // 过滤参数
    if (filters) {
      if (filters.deckName && filters.deckName[0]) {
        result.deckId = filters.deckName[0];
      }
      if (filters.front && filters.front[0]) {
        result.front = filters.front[0];
      }
      if (filters.back && filters.back[0]) {
        result.back = filters.back[0];
      }
      if (filters.tags && filters.tags[0]) {
        result.tags = filters.tags[0];
      }
      if (filters.state && filters.state[0] !== undefined) {
        result.state = filters.state[0];
      }
    }

    return result;
  };

  // 获取数据
  const fetchData = () => {
    setLoading(true);
    const queryParams = getQueryParams(tableParams);

    const urlParams = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        urlParams.append(key, value);
      }
    });

    apiClient
      .get(`/anki/user-cards/query?${urlParams.toString()}`)
      .then(res => {
        const response = res.data;
        if (response.success) {
          const { data: cards, total } = response.data;
          setData(cards || []);
          setTableParams({
            ...tableParams,
            pagination: {
              ...tableParams.pagination,
              total: total,
            },
          });
        } else {
          console.error(t('searchPage.queryFailed'), response.message);
          setData([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(t('searchPage.queryError'), err);
        setData([]);
        setLoading(false);
      });
  };

  // 监听参数变化
  useEffect(() => {
    fetchData();
  }, [
    tableParams.pagination?.current,
    tableParams.pagination?.pageSize,
    tableParams.sortOrder,
    tableParams.sortField,
    JSON.stringify(tableParams.filters),
  ]);

  // 处理表格变化
  const handleTableChange = (pagination, filters, sorter) => {
    const newTableParams = {
      pagination,
      filters,
      sortOrder: Array.isArray(sorter) ? undefined : sorter.order,
      sortField: Array.isArray(sorter) ? undefined : sorter.field,
    };

    setTableParams(newTableParams);

    // 如果页面大小改变，清空数据
    if (pagination.pageSize !== tableParams.pagination?.pageSize) {
      setData([]);
    }
  };

  return (
    <div className="search-page">
      <div className="search-header">
        <h2>{t('searchPage.title')}</h2>
        <p>{t('searchPage.description')}</p>
      </div>

      <Table
        columns={columns}
        rowKey={record => record.uuid}
        dataSource={data}
        tableLayout="fixed"
        pagination={{
          ...tableParams.pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            t('searchPage.showTotal')
              .replace('{start}', range[0])
              .replace('{end}', range[1])
              .replace('{total}', total),
        }}
        loading={loading}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default Search;
