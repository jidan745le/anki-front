import React, { useState, useEffect } from 'react';
import { message, Spin,Tag } from 'antd';
import { pick, update } from 'lodash';
import {  useNavigate, useParams } from 'react-router-dom';
import AnkiCard from '../../component/AnkiCard';
import apiClient from '../../common/http/apiClient';
import axios from 'axios';



function Anki() {
  const [flipped, setFlipped] = useState(false);
  const navigate = useNavigate();
  const [card, setCard] = useState({});
  const [loading, setLoading] = useState(false);
  const [deckStats, setDeckStats] = useState({});
  const params = useParams();
  console.log(params, "params")

  useEffect(() => {
    getNextCard(params.deckId);
  }, [])

  const setQualityForThisCardAndGetNext = async (deckId, quality) => {
    try {
      await updateQualityForThisCard(deckId, quality);
      getNextCard(deckId);
    } catch (e) {
      console.log(e)
    }
  }

  const updateQualityForThisCard = async (deckId, quality) => {
    return await apiClient.post(`/app/anki/updateCardWithSM2/${quality}`, { id: card.id, deckId, quality: quality }).then(res => {
      const data = res.data;
      if (data.success) {
        return;
      }
      message.error(data.message)
      console.log(res)
    }).catch(err => {
      setLoading(false);
      throw err;
    })
  }

  const getDeckStats = (deckId) => {
    apiClient.get(`/app/anki/getDeckStats?deckId=${deckId}`).then(res => {
      const data = res.data;
      if (data.success) {
        setDeckStats(data.data)
        return;
      }
      message.error(data.message)
      console.log(res)
    }).catch(err => {
      console.log(err)
      throw err;
    })
  }

  const getNextCard = (deckId) => {
    setFlipped(false);
    setLoading(true);
    getDeckStats(deckId);
    apiClient.get(`/app/anki/getNextCard?deckId=${deckId}`).then(res => {
      setLoading(false);
      const data = res.data;
      if (data.success) {
        if (Object.keys(data.data || {}).length > 0) {
          setCard(data.data)
        } else {
          if (data.data === null) {
            //deck为空 需要插入新卡
            navigate(`/anki/create/${deckId}`)
            setCard({ front: "front", back: "back" })
          } else {
            navigate(`/anki/empty`)
            //deck为{} 代表今天或目前没有卡片了
          }
        }
        return;
      }
      message.error(data.message)
      console.log(res)
    }).catch(err => {
      setLoading(false);
      console.log(err)
    })
  }

  const updateCard = (value) => {
    console.log({ id: card.id, back: value });
    apiClient.post(`/app/anki/updateCard`, { id: card.id, back: value }).then(res => {
      // const data = res.data;
      // if (data.success) {
      //   setCard(data.data)
      //   return;
      // }
      // message.error(data.message)
    }).catch(err => {
      console.log(err)
    })
  }

  const isNew = card["card_type"] === "new";

  return <Spin spinning={loading}>    
    <div style={{ display: "flex", justifyContent: "flex-end", background: "white" ,padding:"12px"}}>  
      <Tag style={isNew?{fontSize:"16px",fontWeight:"bold"}:null} color="blue">New: {deckStats.newCards}</Tag>
      <Tag style={!isNew?{fontSize:"16px",fontWeight:"bold"}:null} color="green">Due: {deckStats.dueCards}</Tag>
    </div>
    <AnkiCard
      front={card["front"]}
      back={card["back"]}
      frontType={card["frontType"]}
      key={card["id"]}
      onChange={(value) => updateCard(value)}
      isNew={isNew}
      flipped={flipped}
      onNext={(quality) => {
        setQualityForThisCardAndGetNext(params.deckId, quality)
      }}
      onFlip={(action) => setFlipped(action)} />
  </Spin>
}

export default Anki;