import React, { useEffect, useState } from "react"
import { Button, Modal, Spin, Card } from "antd"
import FooterBar from "../Footbar"
import MyEditor from "../Editor"

function AnkiCard({ flipped, onFlip, onNext, front, frontType, back, isNew, onChange }) {
  const audioRef = React.useRef(null);

  // 添加键盘事件监听
  useEffect(() => {
    const handleKeyPress = (event) => {
      const isCtrlPressed = event.ctrlKey || event.metaKey;

      // Ctrl + 数字键组合不受编辑器状态影响
      if (isCtrlPressed && flipped) {
        switch (event.code) {
          case 'Digit1':
          case 'Numpad1':
            event.preventDefault();
            onNext && onNext(0); // Again
            return;
          case 'Digit2':
          case 'Numpad2':
            event.preventDefault();
            onNext && onNext(1); // Hard
            return;
          case 'Digit3':
          case 'Numpad3':
            event.preventDefault();
            onNext && onNext(2); // Good
            return;
          case 'Digit4':
          case 'Numpad4':
            event.preventDefault();
            onNext && onNext(3); // Easy
            return;
        }
      }

      // 如果事件来自编辑器或其他可编辑元素，不处理普通快捷键
      if (event.target.contentEditable === 'true' ||
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA') {
        return;
      }

      if (!flipped) {
        // 未翻转状态：空格键显示答案
        if (event.code === 'Space') {
          event.preventDefault();
          onFlip && onFlip(true);
        }
      } else {
        // 翻转状态：数字键1-4对应不同难度
        switch (event.code) {
          case 'Digit1':
          case 'Numpad1':
            event.preventDefault();
            onNext && onNext(0); // Again
            break;
          case 'Digit2':
          case 'Numpad2':
            event.preventDefault();
            onNext && onNext(1); // Hard
            break;
          case 'Digit3':
          case 'Numpad3':
            event.preventDefault();
            onNext && onNext(2); // Good
            break;
          case 'Digit4':
          case 'Numpad4':
            event.preventDefault();
            onNext && onNext(3); // Easy
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [flipped, onFlip, onNext]);

  useEffect(() => {
    if (frontType === "audio" && audioRef.current) {
      audioRef.current.play().catch(e => {
        console.log("自动播放失败:", e);
      });
    }
  }, [front, frontType]);

  return <>
    <Card
      bordered={false}
      title={
        <div style={{ display: "flex", justifyContent: "center", fontSize: "24px", fontWeight: "bold", padding: "12px" }}>
          {frontType === "audio" ? <audio ref={audioRef} controls>
            <source src={`${front}`} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio> : front}
        </div>
      }>
      {flipped ? <div><MyEditor onChange={onChange} isNew={isNew} value={`${back}`} /></div> :
        <div style={{ display: "flex", justifyContent: "center" }}>点击下方按钮或按空格键查看答案</div>}
    </Card>
    <FooterBar>
      {
        flipped ? [
          <Button key="1" color="danger" variant="solid" onClick={() => { onNext && onNext(0) }}>Again (1)</Button>,
          <Button key="2" color="primary" variant="solid" onClick={() => { onNext && onNext(1) }}>Hard (2)</Button>,
          <Button key="3" color="danger" variant="solid" onClick={() => { onNext && onNext(2) }}>Good (3)</Button>,
          <Button key="4" color="default" variant="solid" onClick={() => { onNext && onNext(3) }}>Easy (4)</Button>
        ] :
          <Button danger type="primary" onClick={() => { onFlip && onFlip(true) }}>展示答案 (Space)</Button>
      }
    </FooterBar>
  </>;
}

export default AnkiCard;