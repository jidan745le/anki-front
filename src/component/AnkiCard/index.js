import React, { useEffect, useState } from "react"
import { Button, Modal, Spin, Card } from "antd"
import FooterBar from "../Footbar"
import MyEditor from "../Editor"


function AnkiCard({ flipped, onFlip, onNext, front, frontType, back,isNew, onChange }) {
  const audioRef = React.useRef(null);
  useEffect(() => {
    if (frontType === "audio" && audioRef.current) {
      audioRef.current.play().catch(e => {
        console.log("自动播放失败:", e);
        // 大多数浏览器需要用户交互后才能自动播放
      });
    }
  }, [front, frontType])


  return <>
    <Card
      bordered={false}
      title={
        < div style={{ display: "flex", justifyContent: "center", fontSize: "24px", fontWeight: "bold",padding:"12px" }}>

          {frontType === "audio" ? <audio ref={audioRef} controls>
            <source src={`http://localhost:3000/anki/media/${front}`} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio> : front}
        </div >
      }>
      {flipped ? <div>< MyEditor onChange={onChange} isNew={isNew} value={`${back}`} /></div > : <div style={{ display: "flex", justifyContent: "center" }}>点击下方按钮查看答案</div>}

    </Card >
    <FooterBar>
      {
        flipped ? [
          <Button color="danger" variant="solid" onClick={() => { onNext && onNext(0) }}> Again</Button >,
          <Button color="primary" variant="solid" onClick={() => { onNext && onNext(1) }}> Hard</Button >,
          <Button color="danger" variant="solid" onClick={() => { onNext && onNext(2) }}> Good</Button >,
          <Button color="default" variant="solid" onClick={() => { onNext && onNext(3) }}> Easy</Button >] :
          <Button danger type="primary" onClick={() => { onFlip && onFlip(true) }}>展示答案</Button>
      }
    </FooterBar>
  </>
}

export default AnkiCard;