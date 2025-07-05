import React, { useEffect, useRef, useState } from 'react';
import NotesModal from '../../NotesModal';

const NotesModalIntegration = ({ editor, userCard }) => {
  const [notesModalVisible, setNotesModalVisible] = useState(false);
  const [modalData, setModalData] = useState(null);
  const modalDataRef = useRef(null);
  const hasUpdatedByChunkId = useRef(false); // 标记是否已经通过 onNoteCreated 更新过

  // 将显示笔记弹窗的方法挂载到编辑器上
  useEffect(() => {
    if (editor) {
      editor.showNotesModal = data => {
        setModalData(data);
        modalDataRef.current = data;
        hasUpdatedByChunkId.current = false; // 重置标记
        setNotesModalVisible(true);
      };
    }

    return () => {
      if (editor) {
        delete editor.showNotesModal;
      }
    };
  }, [editor]);

  // 关闭弹窗并处理笔记保存
  const handleCloseModal = (savedNotes = []) => {
    setNotesModalVisible(false);

    // 检查是否有与当前chunkId相关的笔记被保存，但没有通过onNoteCreated回调更新
    const currentData = modalDataRef.current;
    if (currentData && currentData.chunkId && !!currentData.initial) {
      // 查找与当前chunkId匹配的保存的笔记
      const relatedSavedNote = savedNotes.find(
        saved => saved.oldNote.chunkId === currentData.chunkId
      );

      if (relatedSavedNote && editor && editor.updateNoteByChunkId) {
        editor.updateNoteByChunkId(
          currentData.chunkId,
          relatedSavedNote.newNote.uuid,
          relatedSavedNote.newNote
        );
      } else {
        // 如果笔记没有被保存，则删除这个临时笔记
        if (editor && editor.deleteNoteByChunkId) {
          editor.deleteNoteByChunkId(currentData.chunkId);
        }
      }
    }

    if (editor && editor.selectNoteByChunkId && currentData?.chunkId) {
      editor.selectNoteByChunkId(currentData.chunkId);
    }

    setModalData(null);
    modalDataRef.current = null;
    hasUpdatedByChunkId.current = false;
  };

  return (
    <NotesModal
      visible={notesModalVisible}
      onClose={() => {}}
      userCard={userCard}
      title={modalData?.title}
      noteUuid={modalData?.noteUuid}
      chunkId={modalData?.chunkId}
      referenceText={modalData?.referenceText}
      onBeforeClose={handleCloseModal}
      onNoteDeleted={deletedNote => {
        // 当笔记删除成功后的回调
        if (deletedNote && deletedNote.uuid && editor && editor.deleteNoteByUuid) {
          editor.deleteNoteByUuid(deletedNote.uuid);
        }
      }}
      //   onNoteCreated={(noteData, isFromChunk) => {
      //     // 当笔记创建成功后的回调
      //     const currentData = modalDataRef.current;

      //     // 只有当这个笔记是从当前chunkId创建的临时笔记转换而来时，才更新note element
      //     if (
      //       currentData &&
      //       currentData.chunkId &&
      //       isFromChunk &&
      //       editor &&
      //       editor.updateNoteByChunkId
      //     ) {
      //       editor.updateNoteByChunkId(currentData.chunkId, noteData.uuid, noteData);
      //       hasUpdatedByChunkId.current = true; // 标记已经更新过
      //     }
      //   }}
    />
  );
};

export default React.memo(NotesModalIntegration);
