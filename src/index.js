import { add } from './common/util/math';
import React, { useState, useTransition, useDeferredValue, useEffect, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from "react-dom/client";
import styles from "./style.module.css"
import './styles/global.less';
import { BrowserRouter as Router, Route, Routes, Redirect, Navigate } from 'react-router-dom';
import Anki from './pages/Anki';
import Decks from './pages/Decks';
import Layout from './pages/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { pick, set } from 'lodash';
import { Spin } from 'antd';
import '@wangeditor/editor/dist/css/style.css' // 引入 css
import AnkiCreate from './pages/AnkiCreate';




function App() {
  // const [isLogin, setIsLogin] = useState(false)
  // const [validatePending, setPending] = useState(false)
  // useEffect(() => {
  //   // Add code here to fetch whether login or not
  //   console.log(window.location.pathname)
  //   if (window.location.pathname === "/") {
  //     setPending(true)
  //     setTimeout(() => {
  //       console.log("fetch decks")
  //       setIsLogin(false)
  //       setPending(false)
  //     }, 2000)
  //   }

  // }, []);


  return (
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to={"/decks"} replace />} />
            <Route path="/decks" element={<Decks />} />
            <Route path="/anki/:deckId" element={<Anki />} />
            <Route  path="/anki/empty" element={<div>今日已学完</div>} />
            <Route path="/anki/create/:deckId" element={<AnkiCreate/>} />
            <Route path="/login" element={<Login/>} />
            <Route path="/signup" element={<Signup/>} />
          </Routes>
        </Layout>
      </Router>
  );
}

function Index() {
  return <>
    <App />
  </> 
}


const container = document.getElementById('root');

const root = createRoot(container);
// ReactDOM.render(React.createElement(Index), container);
root.render(<Index />);

if (module.hot) {
  module.hot.accept();
}