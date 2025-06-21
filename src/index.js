import '@wangeditor/editor/dist/css/style.css'; // 引入 css
import React, { Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { printEnvInfo } from './common/util/env';
import wsClient from './common/websocket/wsClient';
import AnkiCreate from './pages/AnkiCreate';
import './styles/global.less';

// 打印环境信息
printEnvInfo();

const Anki = React.lazy(() => import('./pages/Anki'));
const Decks = React.lazy(() => import('./pages/Decks'));
const Layout = React.lazy(() => import('./pages/Layout'));
const Login = React.lazy(() => import('./pages/Login'));
const Signup = React.lazy(() => import('./pages/Signup'));
const OAuthRegister = React.lazy(() => import('./pages/OAuthRegister'));
const DeckOriginalCards = React.lazy(() => import('./pages/DeckOriginalCards'));
const SharedDeckView = React.lazy(() => import('./pages/SharedDeckView'));
const SharedDecks = React.lazy(() => import('./pages/SharedDecks'));

function App() {
  useEffect(() => {
    return () => {
      wsClient.disconnect();
      console.log('wsClient.disconnect');
    };
  });
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to={'/decks'} replace />} />
            <Route path="/decks" element={<Decks />} />
            <Route path="/anki/:deckId" element={<Anki />} />
            <Route path="/anki/empty" element={<div>今日已学完</div>} />
            <Route path="/anki/create/:deckId" element={<AnkiCreate />} />
            <Route path="/deck-original-cards/:deckId" element={<DeckOriginalCards />} />
            <Route path="/shared-deck-view/:deckId" element={<SharedDeckView />} />
            <Route path="/shared-decks" element={<SharedDecks />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/oauth/register" element={<OAuthRegister />} />
          </Routes>
        </Layout>
      </Router>
    </Suspense>
  );
}

function Index() {
  return (
    <>
      <App />
    </>
  );
}

const container = document.getElementById('root');

const root = createRoot(container);
// ReactDOM.render(React.createElement(Index), container);
root.render(<Index />);

// @ts-ignore
if (module && module.hot) {
  // @ts-ignore
  module.hot.accept();
}
