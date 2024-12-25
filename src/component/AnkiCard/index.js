import React, { useEffect, useState } from "react"
import { Button, Modal, Spin, Card } from "antd"
import FooterBar from "../Footbar"
import MyEditor from "../Editor"
import "./ankicard.less"

function AnkiCard({ config, flipped, onFlip, onNext, front, frontType, back, isNew, onChange }) {
  const audioRef = React.useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // 添加窗口大小变化监听
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 添加键盘事件监听
  useEffect(() => {
    const handleKeyPress = (event) => {
      console.log(event,"event")

      const isCtrlPressed = event.ctrlKey || event.metaKey;

      // Audio control shortcuts
      if (frontType === "audio" && audioRef.current) {
        if (isCtrlPressed) {
          switch (event.code) {
            case 'Space':
              event.preventDefault();
              if (audioRef.current.paused) {
                audioRef.current.play();
              } else {
                audioRef.current.pause();
              }
              return;
            case 'ArrowDown':
              event.preventDefault();
              if (audioRef.current.paused) {
                audioRef.current.play();
              } else {
                audioRef.current.pause();
              }
              return;
            case 'ArrowLeft':
              event.preventDefault();
              audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 3);
              return;
            case 'ArrowRight':
              event.preventDefault();
              audioRef.current.currentTime = Math.min(audioRef.current.duration, audioRef.current.currentTime + 3);
              return;
          }
        }
      }

      // Ctrl + 数字键组合不受编辑器状态影响
      if (flipped) {
        if (isCtrlPressed) {
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
            case 'Space':
              event.preventDefault();
              onNext && onNext(3); // Easy
              return;
          }
        } 

      }

      // 如果事件来自编辑器或其他可编辑元素，不处理普通快捷键
      if (event.target.contentEditable === 'true' ||
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA') {
          if(event.code === 'Space' && isCtrlPressed){
            event.preventDefault();
            onNext && onNext(3);
          }
        return;
      }

      if (!flipped) {
        // 未翻转状态：空格键显示答案（仅在没有按下 Ctrl 时）
        if (event.code === 'Space') {
          event.preventDefault();
          onFlip && onFlip(true);
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
      className="anki-card"
      bordered={false}
      title={
        <div style={{ display: "flex", justifyContent: "center", fontSize: "24px", fontWeight: "bold", padding: "12px" }}>
          {frontType === "audio" ? <audio ref={audioRef} controls>
            <source src={`${front}`} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio> : front}
        </div>
      }>
      {flipped ? 
        <div>
          {isMobile ? 
            // 移动端显示只读内容
            <div 
              className="mobile-content"
              dangerouslySetInnerHTML={{ __html: back }}
              style={{ 
                padding: '10px',
                fontSize: '16px',
                lineHeight: '1.5',
                wordBreak: "break-word",
                overflowWrap: "break-word",
                whiteSpace: "pre-wrap",
                maxWidth: "100%",
              }}
            /> 
            : 
            // PC端显示编辑器
            <MyEditor 
              config={config} 
              title={frontType !== "audio" ? front : undefined} 
              onChange={onChange} 
              isNew={isNew} 
              value={`${back}`} 
            />
          }
        </div> 
        :
        <div style={{ display: "flex", justifyContent: "center" }}>
          点击下方按钮或按空格键查看答案
        </div>
      }
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