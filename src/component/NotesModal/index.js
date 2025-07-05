import { DeleteOutlined, PlusOutlined, PushpinFilled, PushpinOutlined } from '@ant-design/icons';
import { Button, Input, List, message, Popconfirm, Spin, Tag, Tooltip } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../common/hooks/useI18n';
import apiClient from '../../common/http/apiClient';
import DraggableModal from '../DraggableModal';
import './style.less';

// 导入 wangeditor
import { Editor } from '@wangeditor/editor-for-react';
import '@wangeditor/editor/dist/css/style.css';

const { TextArea } = Input;

const NotesModal = ({
  visible,
  onClose,
  userCard,
  title = null, // 可选的标题，传入时自动创建临时笔记并进入编辑状态
  noteUuid = null, // 可选的笔记UUID，传入时自动定位到该笔记
  chunkId = null, // 可选的chunkId，用于定位文本块
  referenceText = null, // 可选的引用文本，用于标识引用笔记
  onNoteCreated = null, // 创建笔记成功的回调
  onNoteDeleted = null, // 删除笔记成功的回调
  onBeforeClose = null, // 关闭前的回调，用于返回保存的笔记信息
}) => {
  const { t } = useI18n();
  const [notes, setNotes] = useState([]);
  const [originalNotes, setOriginalNotes] = useState([]); // 保存原始数据用于比对
  const [loading, setLoading] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [highlightedNoteId, setHighlightedNoteId] = useState(null); // 高亮笔记ID

  // wangeditor 相关状态
  const [editor, setEditor] = useState(null);
  const [editorKey, setEditorKey] = useState(0); // 用于重置编辑器的 key

  // 创建refs
  const noteListRef = useRef(null);
  const noteItemRefs = useRef({});

  // 编辑器配置
  const editorConfig = {
    placeholder: '在此处输入笔记内容...',
    MENU_CONF: {},
    // 禁用上传功能，避免复杂配置
    uploadImgShowBase64: true,
  };

  // 工具栏配置 - 空数组表示不显示工具栏
  const toolbarConfig = {
    toolbarKeys: [], // 空数组，不显示任何工具栏按钮
  };

  // 滚动到指定笔记并高亮
  const scrollToNote = noteId => {
    const noteElement = noteItemRefs.current[noteId];
    if (noteElement) {
      // 滚动到指定笔记
      noteElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });

      // 高亮效果
      setHighlightedNoteId(noteId);

      // 2秒后移除高亮
      setTimeout(() => {
        setHighlightedNoteId(null);
      }, 2000);
    }
  };

  // 获取用户卡片的笔记
  const fetchNotes = async () => {
    if (!userCard?.uuid) return;

    setLoading(true);
    try {
      const response = await apiClient.get(`/notes/user-card/${userCard.uuid}`);
      if (response.data.success) {
        const fetchedNotes = response.data.data || [];
        setNotes(prev => [...prev, ...fetchedNotes]);
        // 保存原始数据的深拷贝，用于关闭时比对
        setOriginalNotes(JSON.parse(JSON.stringify(fetchedNotes)));
      } else {
        message.error('获取笔记失败');
      }
    } catch (error) {
      console.error('获取笔记失败:', error);
      message.error('获取笔记失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建新笔记（前端临时状态，不调用接口）
  const createNote = (
    initialTitle = '新建笔记',
    isFromChunkId = false,
    initialReferenceText = null
  ) => {
    if (!userCard?.uuid) return;

    // 创建临时笔记对象
    const tempNote = {
      id: `temp_${Date.now()}`, // 临时ID，以temp_开头标识
      uuid: `temp_uuid_${Date.now()}`,
      title: initialTitle,
      noteContent: '',
      color: 'blue',
      isPinned: false,
      referenceText: initialReferenceText || referenceText, // 支持传入引用文本
      userCard: {
        id: userCard.id,
        uuid: userCard.uuid,
        front: userCard.front,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemp: true, // 标记为临时笔记
      chunkId: isFromChunkId ? chunkId : null, // 只有从chunkId创建的笔记才关联chunkId
      isFromChunkId: isFromChunkId, // 标记是否来自chunkId
    };

    // 添加到笔记列表最前面
    setNotes(prev => [tempNote, ...prev]);
    setSelectedNote(tempNote);
    setEditingNote(tempNote);
    setNoteTitle(tempNote.title);
    setNoteContent(tempNote.noteContent);

    // 重置编辑器 key，强制重新初始化
    setEditorKey(Date.now());
  };

  // 更新笔记
  const updateNote = async (noteId, updates) => {
    setSaving(true);
    try {
      const response = await apiClient.patch(`/notes/${noteId}`, updates);

      if (response.data.success) {
        const updatedNote = response.data.data;
        setNotes(prev => prev.map(note => (note.id === noteId ? updatedNote : note)));
        setSelectedNote(updatedNote);
        message.success('笔记更新成功');
        return true;
      } else {
        message.error('更新笔记失败');
        return false;
      }
    } catch (error) {
      console.error('更新笔记失败:', error);
      message.error('更新笔记失败');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // 删除笔记
  const deleteNote = async noteId => {
    // 检查是否为临时笔记
    const note = notes.find(n => n.id === noteId);

    if (note && (note.isTemp || noteId.toString().startsWith('temp_'))) {
      // 临时笔记直接从前端删除
      setNotes(prev => prev.filter(note => note.id !== noteId));
      if (selectedNote?.id === noteId) {
        setSelectedNote(null);
        setEditingNote(null);
        setNoteTitle('');
        setNoteContent('');
      }
      return;
    }

    // 真实笔记调用删除接口
    try {
      const response = await apiClient.delete(`/notes/${noteId}`);

      if (response.data.success) {
        // 调用删除成功的回调，传递被删除笔记的信息
        if (onNoteDeleted && note) {
          onNoteDeleted(note);
        }

        setNotes(prev => prev.filter(note => note.id !== noteId));
        if (selectedNote?.id === noteId) {
          setSelectedNote(null);
          setEditingNote(null);
          setNoteTitle('');
          setNoteContent('');
        }
        message.success('笔记删除成功');
      } else {
        message.error('删除笔记失败');
      }
    } catch (error) {
      console.error('删除笔记失败:', error);
      message.error('删除笔记失败');
    }
  };

  // 切换置顶状态
  const togglePin = async noteId => {
    // 检查是否为临时笔记
    const note = notes.find(n => n.id === noteId);

    if (note && (note.isTemp || noteId.toString().startsWith('temp_'))) {
      // 临时笔记只在前端切换置顶状态
      const updatedNote = { ...note, isPinned: !note.isPinned };
      setNotes(prev => [updatedNote, ...prev.filter(n => n.id !== noteId)]);
      if (selectedNote?.id === noteId) {
        setSelectedNote(updatedNote);
      }
      message.success(`笔记${updatedNote.isPinned ? '置顶' : '取消置顶'}成功`);
      return;
    }

    // 真实笔记调用置顶接口
    try {
      const response = await apiClient.patch(`/notes/${noteId}/toggle-pin`);

      if (response.data.success) {
        const updatedNote = response.data.data;
        setNotes(prev => [updatedNote, ...prev.filter(n => n.id !== noteId)]);
        if (selectedNote?.id === noteId) {
          setSelectedNote(updatedNote);
        }
        message.success(`笔记${updatedNote.isPinned ? '置顶' : '取消置顶'}成功`);
      } else {
        message.error('操作失败');
      }
    } catch (error) {
      console.error('切换置顶状态失败:', error);
      message.error('操作失败');
    }
  };

  // 获取当前的实际数据（包括正在编辑的笔记的最新内容）
  const getCurrentNotesData = () => {
    let currentNotes = [...notes];

    // 如果有正在编辑的笔记，确保包含最新的编辑内容
    if (editingNote) {
      currentNotes = currentNotes.map(note => {
        if (note.id === editingNote.id) {
          return {
            ...note,
            title: noteTitle || note.title,
            noteContent: noteContent || note.noteContent,
          };
        }
        return note;
      });
    }

    return currentNotes;
  };

  // 自动保存：使用批量接口保存所有笔记
  const autoSaveAllNotes = async () => {
    const savedNotes = [];
    const currentNotes = getCurrentNotesData();

    // 1. 收集需要创建的临时笔记
    const tempNotes = currentNotes.filter(
      note =>
        (note.isTemp || note.id.toString().startsWith('temp_')) &&
        note.noteContent &&
        note.noteContent.trim()
    );

    // 2. 收集需要更新的已有笔记
    const existingNotes = currentNotes.filter(
      note => !note.isTemp && !note.id.toString().startsWith('temp_')
    );

    const notesToUpdate = [];
    existingNotes.forEach(currentNote => {
      // 找到对应的原始笔记
      const originalNote = originalNotes.find(orig => orig.id === currentNote.id);

      if (originalNote) {
        // 检查是否有变化
        const hasChanged =
          currentNote.title !== originalNote.title ||
          currentNote.noteContent !== originalNote.noteContent;

        if (hasChanged) {
          notesToUpdate.push({
            currentNote,
            originalNote,
          });
        }
      }
    });

    // 如果没有需要保存的笔记，直接返回
    if (tempNotes.length === 0 && notesToUpdate.length === 0) {
      return savedNotes;
    }

    // 3. 构建批量请求数据
    const batchNotes = [];

    // 先添加创建请求
    tempNotes.forEach(tempNote => {
      batchNotes.push({
        title: tempNote.title || '未命名笔记',
        noteContent: tempNote.noteContent,
        userCardUuid: userCard.uuid,
        color: tempNote.color || 'blue',
        isPinned: tempNote.isPinned || false,
        referenceText: tempNote.referenceText || null,
      });
    });

    // 再添加更新请求
    notesToUpdate.forEach(({ currentNote }) => {
      batchNotes.push({
        id: currentNote.id,
        title: currentNote.title,
        noteContent: currentNote.noteContent,
        userCardUuid: userCard.uuid,
      });
    });

    // 4. 调用批量接口
    try {
      const response = await apiClient.post('/notes/batch', {
        notes: batchNotes,
      });

      if (response.data.success) {
        const { created = [], updated = [], errors = [] } = response.data.data;

        // 5. 处理创建成功的笔记（按顺序对应）
        created.forEach((newNote, index) => {
          if (index < tempNotes.length) {
            const tempNote = tempNotes[index];
            savedNotes.push({
              oldNote: tempNote,
              newNote: newNote,
            });

            // 更新笔记列表
            setNotes(prev => prev.map(note => (note.id === tempNote.id ? newNote : note)));

            // 如果是当前正在编辑的笔记，更新相关状态
            if (editingNote && editingNote.id === tempNote.id) {
              setSelectedNote(newNote);
              setEditingNote(newNote);
            }
          }
        });

        // 6. 处理更新成功的笔记（按顺序对应）
        updated.forEach((updatedNote, index) => {
          if (index < notesToUpdate.length) {
            const { originalNote } = notesToUpdate[index];
            savedNotes.push({
              oldNote: originalNote,
              newNote: updatedNote,
            });

            // 更新笔记列表
            setNotes(prev => prev.map(note => (note.id === updatedNote.id ? updatedNote : note)));

            // 如果是当前正在编辑的笔记，更新相关状态
            if (editingNote && editingNote.id === updatedNote.id) {
              setSelectedNote(updatedNote);
              setEditingNote(updatedNote);
            }
          }
        });

        // 7. 处理错误
        if (errors.length > 0) {
          console.error('批量保存笔记时发生错误:', errors);
          errors.forEach(error => {
            message.error(`保存笔记失败 (第${error.index + 1}项): ${error.error}`);
          });
        }

        // 如果有成功保存的笔记，显示成功消息
        if (created.length > 0 || updated.length > 0) {
          const createdCount = created.length;
          const updatedCount = updated.length;
          let successMsg = '';

          if (createdCount > 0 && updatedCount > 0) {
            successMsg = `成功创建 ${createdCount} 条笔记，更新 ${updatedCount} 条笔记`;
          } else if (createdCount > 0) {
            successMsg = `成功创建 ${createdCount} 条笔记`;
          } else if (updatedCount > 0) {
            successMsg = `成功更新 ${updatedCount} 条笔记`;
          }

          if (successMsg) {
            message.success(successMsg);
          }
        }
      } else {
        console.error('批量保存笔记失败:', response.data);
        message.error('批量保存笔记失败');
      }
    } catch (error) {
      console.error('批量保存笔记失败:', error);
      message.error('批量保存笔记失败');
    }

    return savedNotes;
  };

  // 安全设置编辑器内容
  const setEditorContentSafely = content => {
    if (editor && typeof editor.setHtml === 'function' && typeof editor.getHtml === 'function') {
      try {
        editor.setHtml(content || '');
      } catch (error) {
        console.warn('设置编辑器内容失败:', error);
      }
    }
  };

  // 选择笔记（始终进入编辑状态）
  const selectNote = note => {
    // 在切换笔记前，先保存当前编辑的内容到notes状态
    // if (editingNote && (noteTitle || noteContent)) {
    //   setNotes(prev =>
    //     prev.map(n => {
    //       if (n.id === editingNote.id) {
    //         return {
    //           ...n,
    //           title: noteTitle,
    //           noteContent: noteContent,
    //         };
    //       }
    //       return n;
    //     })
    //   );
    // }

    // 重置编辑器 key，强制重新初始化
    setEditorKey(Date.now());

    setSelectedNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.noteContent);
    setEditingNote(note); // 始终设置为编辑状态
  };

  // 开始编辑
  const startEdit = note => {
    setSelectedNote(note);
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.noteContent);
  };

  // 取消编辑
  const cancelEdit = () => {
    if (editingNote && (editingNote.isTemp || editingNote.id.toString().startsWith('temp_'))) {
      // 取消编辑临时笔记时删除它
      setNotes(prev => prev.filter(note => note.id !== editingNote.id));
      setSelectedNote(null);
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
    } else if (selectedNote) {
      // 恢复原始内容
      setNoteTitle(selectedNote.title);
      setNoteContent(selectedNote.noteContent);
      setEditingNote(null);
    }
  };

  // 格式化日期
  const formatDate = dateString => {
    const date = new Date(dateString);
    console.log('1212312恶俗大赛3 ', dateString, date.toLocaleString('zh-CN'));
    return date.toLocaleString('zh-CN');
  };

  // 清理HTML内容，防止XSS攻击
  const sanitizeHTML = html => {
    if (!html) return '';

    // 基础的HTML清理，移除脚本标签和事件处理器
    const cleanHTML = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/on\w+\s*=\s*'[^']*'/gi, '')
      .replace(/javascript:/gi, '');

    return cleanHTML;
  };

  // 处理编辑器内容变化
  const handleEditorChange = editor => {
    try {
      if (editor && editor.getHtml && typeof editor.getHtml === 'function') {
        console.log('1212312恶俗大赛2 ', editor.getHtml());
        const html = editor.getHtml();
        setNoteContent(html);

        // 同时更新notes状态中对应笔记的内容
        if (editingNote) {
          setNotes(prev =>
            prev.map(n => (n.id === editingNote.id ? { ...n, noteContent: html } : n))
          );
        }
      }
    } catch (error) {
      console.warn('编辑器内容变化处理失败:', error);
    }
  };

  // 编辑器创建完成后的回调
  //   const handleEditorCreated = editor => {
  //     setEditor(editor);

  //     // 如果有选中的笔记，设置编辑器内容
  //     if (selectedNote && selectedNote.noteContent) {
  //       // 延迟一点时间确保编辑器完全准备好
  //       setTimeout(() => {
  //         setEditorContentSafely(selectedNote.noteContent);
  //       }, 100);
  //     }
  //   };

  // 编辑器销毁处理
  useEffect(() => {
    if (!visible) {
      if (editor) {
        editor.destroy();
        setEditor(null);
      }
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy();
        setEditor(null);
      }
    };
  }, [editor]);

  // 组件初始化时获取笔记
  useEffect(() => {
    if (visible && userCard) {
      fetchNotes();
    }
  }, [visible]);

  // 关闭弹窗时重置状态
  useEffect(() => {
    if (!visible) {
      setSelectedNote(null);
      setEditingNote(null);
      setNoteTitle('');
      setNoteContent('');
      setNotes([]);
      setOriginalNotes([]); // 清空原始数据
      setEditorKey(0); // 重置编辑器 key
    }
  }, [visible]);

  // 处理关闭弹窗
  const handleClose = async () => {
    // 自动保存所有有内容的临时笔记和更新已有笔记
    const savedNotes = await autoSaveAllNotes();

    // 在关闭前调用回调，返回保存的笔记信息
    if (onBeforeClose) {
      onBeforeClose(savedNotes);
    }

    // 调用原始的关闭回调
    onClose();
  };

  // 处理传入的 title prop，自动创建临时笔记并进入编辑状态
  useEffect(() => {
    if (visible && title && userCard && !editingNote) {
      // 当有 title 传入且当前没有在编辑状态时，创建临时笔记
      // 如果有chunkId，说明这是从编辑器创建的临时笔记
      createNote(title, !!chunkId, referenceText);
    }
  }, [visible, title, userCard, chunkId, referenceText]);

  // 处理传入的 noteUuid prop，自动定位到指定笔记
  useEffect(() => {
    if (visible && noteUuid && notes.length > 0 && !selectedNote) {
      // 通过noteUuid找到对应的笔记
      const targetNote = notes.find(note => note.uuid === noteUuid);
      if (targetNote) {
        selectNote(targetNote);
        // 延迟一点时间确保DOM渲染完成后再滚动
        setTimeout(() => {
          scrollToNote(targetNote.id);
        }, 100);
      }
    }
  }, [visible, noteUuid, notes, selectedNote]);

  console.log('1212312恶俗大赛 ', noteContent, notes, selectedNote);

  // 模拟后端排序逻辑：isPinned DESC, updatedAt DESC
  const sortNotes = notes => {
    return [...notes].sort((a, b) => {
      // 首先按 isPinned 降序排序（置顶的在前）
      if (a.isPinned !== b.isPinned) {
        return b.isPinned ? 1 : -1;
      }
      // 然后按 updatedAt 降序排序（最新的在前）
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  };

  return (
    <DraggableModal
      title={
        <div
          dangerouslySetInnerHTML={{
            __html: sanitizeHTML(`${userCard?.front || ''} - 笔记`),
          }}
        />
      }
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={900}
      height={600}
      className="notes-modal"
      resizable={true}
      minWidth={600}
      minHeight={400}
      maxWidth={1200}
      maxHeight={800}
    >
      <div className="notes-container">
        {/* 左侧笔记列表 */}
        <div className="notes-sidebar">
          <div className="notes-header">
            <h3>我的笔记</h3>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => createNote()}
              loading={saving}
            >
              新建笔记
            </Button>
          </div>

          <div className="notes-list" ref={noteListRef}>
            {loading ? (
              <Spin style={{ display: 'block', textAlign: 'center', margin: '20px 0' }} />
            ) : (
              <List
                dataSource={sortNotes(notes)}
                renderItem={note => (
                  <List.Item
                    ref={el => {
                      if (el) {
                        noteItemRefs.current[note.id] = el;
                      }
                    }}
                    className={`note-item ${selectedNote?.id === note.id ? 'active' : ''} ${
                      highlightedNoteId === note.id ? 'highlighted' : ''
                    }`}
                    onClick={() => selectNote(note)}
                  >
                    <div className="note-item-content">
                      <div className="note-item-header">
                        <span
                          className="note-title"
                          dangerouslySetInnerHTML={{ __html: sanitizeHTML(note.title) }}
                        />
                        <div className="note-actions">
                          <Tooltip title={note.isPinned ? '取消置顶' : '置顶'}>
                            <Button
                              type="text"
                              size="small"
                              icon={note.isPinned ? <PushpinFilled /> : <PushpinOutlined />}
                              onClick={e => {
                                e.stopPropagation();
                                togglePin(note.id);
                              }}
                            />
                          </Tooltip>

                          <Popconfirm
                            title="确定删除这条笔记吗？"
                            onConfirm={() => deleteNote(note.id)}
                            okText="确定"
                            cancelText="取消"
                          >
                            <Tooltip title="删除">
                              <Button
                                type="text"
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={e => e.stopPropagation()}
                              />
                            </Tooltip>
                          </Popconfirm>
                        </div>
                      </div>
                      {/* <div
                        className="note-preview"
                        dangerouslySetInnerHTML={{
                          __html: sanitizeHTML(
                            note.noteContent.substring(0, 50) +
                              (note.noteContent.length > 50 ? '...' : '')
                          ),
                        }}
                      /> */}
                      <div className="note-meta">
                        <span className="note-date">{formatDate(note.updatedAt)}</span>
                        {note.isPinned && <Tag color="orange">置顶</Tag>}
                        {note.referenceText && (
                          <Tag color="blue">引用 {note.referenceText.substring(0, 10)}</Tag>
                        )}
                      </div>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </div>
        </div>

        {/* 右侧笔记内容 */}
        <div className="notes-content">
          {selectedNote ? (
            <>
              <div className="content-header">
                <Input
                  value={noteTitle}
                  onChange={e => {
                    setNoteTitle(e.target.value);
                    setNotes(prev =>
                      prev.map(n => (n.id === editingNote.id ? { ...n, title: e.target.value } : n))
                    );
                  }}
                  placeholder="笔记标题"
                  className="note-title-input"
                />
              </div>

              <div className="note-editor-container">
                <Editor
                  key={editorKey}
                  defaultConfig={editorConfig}
                  defaultHtml={noteContent}
                  value={noteContent}
                  onCreated={editor => {
                    setEditor(editor);
                  }}
                  onChange={handleEditorChange}
                  mode="default"
                  style={{
                    height: '400px',
                    overflowY: 'hidden',
                  }}
                />
              </div>
            </>
          ) : (
            <div className="empty-state">
              <p>选择一个笔记来查看内容</p>
            </div>
          )}
        </div>
      </div>
    </DraggableModal>
  );
};

export default NotesModal;
