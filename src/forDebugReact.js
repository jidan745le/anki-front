import { toString } from './common/util/util';
// import {max} from "lodash"
import React, { useState, useTransition, useDeferredValue, useEffect, Suspense } from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';
import { Button, Modal, Spin } from 'antd';
import styles from './style.module.css';
import './styles/global.less';

// console.log(resultToStr,styles,_style_module_css__WEBPACK_IMPORTED_MODULE_22__);
import { useTheme, ThemeProvider } from './context/ThemeContext';
// import Card from './component/Card/Card';
const LazyCard = React.lazy(() => import('./component/AnkiCard'));
import { BrowserRouter as Router, Route, Routes, Redirect } from 'react-router-dom';

import axios from 'axios';
import { pick, set } from 'lodash';
import '@wangeditor/editor/dist/css/style.css'; // 引入 css
import { Editor, Toolbar } from '@wangeditor/editor-for-react';
import { IDomEditor, IEditorConfig, IToolbarConfig } from '@wangeditor/editor';

// function Home1() {
//   const { theme, switchTheme } = useTheme();

//   return (
//     <div className="container">
//       <div className="card">
//         <h1>主题切换演示</h1>
//         <p>当前主题: {theme}</p>
//         <button
//           className="button"
//           onClick={() => switchTheme(theme === 'light' ? 'dark' : 'light')}

//         >
//           {`切换到${theme === 'light' ? '暗色' : '亮色'}`}
//         </button>
//       </div>
//       <Suspense fallback={<div>Loading...</div>}>
//         <LazyCard title="Card Title" content="Card Content" />
//       </Suspense>
//     </div>
//   );
// }

// function App() {
//   return (
//     <ThemeProvider>
//       <Home1 />
//     </ThemeProvider>
//   );
// }

// function AppRoute() {
//   return (
//     <Router>
//       <Layout>
//         <Routes>
//           <Route exact path="/" element={<Home />} />
//           <Route path="/about" element={<About />} />
//           <Route exact path="/user/:id" element={<User />} />
//         </Routes>
//       </Layout>
//     </Router>
//   );
// }
// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/" element={<Home />} />
//         <Route path="/user/:id" element={<User />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }

class Demo extends React.Component {
  state = { number: 666 };
  handleClick = () => {
    this.setState({
      number: this.state.number + 1,
    });
  };
  render() {
    return (
      <div>
        hello，world
        <p> 《React进阶实践指南》 {this.state.number} 👍 </p>
        <button onClick={this.handleClick}>点赞</button>
      </div>
    );
  }
}

const TestList = () => {
  const [list, setList] = React.useState([1, 2, 3]);
  const initList = () => {
    setList([1, 2, 3, 4, 5]);
  };

  return (
    <>
      <ul onClick={initList} className={styles.ulContainer}>
        <button>第一次更新点我，生成5个列表项，比初始多2项</button>
        {list.map((item, index) => (
          <li key={index} className={styles.ulContainerLi}>
            {item}
            <input></input>
            <a
              style={{ marginLeft: '2px' }}
              onClick={e => {
                e.stopPropagation();
                list.splice(index, 1);
                setList([...list]);
              }}
            >
              delete
            </a>
          </li>
        ))}
      </ul>
    </>
  );
};

const Test = ({ children }) => {
  const [num, setNum] = useState(2);
  const addNum = () => {
    // const user = null;
    // // 尝试访问 user 的属性
    // console.log(user.name); // TypeError: Cannot read property 'name' of null

    setNum(num + 1);
    setNum(num + 2);
    setNum(num + 4);
  };

  const onInputChange = e => {
    console.log(e);
    setNum(Number(e.target.value));
  };

  return (
    <div>
      <div>{num}</div>
      <input type="text" value={num} onChange={onInputChange} />
      <button onClick={addNum}>+</button>
      {children}
    </div>
  );
};

function TestHook() {
  const [number, setNumber] = React.useState(0); // 第一个hooks
  const [num, setNum] = React.useState(1); // 第二个hooks
  const dom = React.useRef(null); // 第三个hooks
  React.useEffect(() => {
    // 第四个hooks
    console.log(dom.current);
  }, []);
  React.useEffect(() => {
    // 第四个hooks
    console.log(ref1.current);
  }, [number]);
  const ref1 = React.useRef(1); // 第三个hooks

  const handleClick = () => {
    setTimeout(() => {
      setNumber(num => num + 4); // num = 1
      setNumber(num => num + 5); // num = 3
      setNumber(num => num + 6); // num = 6
    });
    setNumber(num => num + 1); // num = 1
    setNumber(num => num + 2); // num = 3
    setNumber(num => num + 3); // num = 6
  };
  console.log(number, 'number');
  return (
    <div ref={dom}>
      <div onClick={() => setNumber(number + 1)}> {number} </div>
      {/* <div onClick={() => setNum(num + 1)} > {num}</div> */}
      <button onClick={() => handleClick()}>点击此处测试hook更新过程 {number} </button>
    </div>
  );
}

const TestDiff = () => {
  const [sequence, setSequence] = useState(['A', 'B', 'C']);

  const transform = () => {
    setSequence(['A', 'B']);
  };

  return (
    <div style={{ padding: '20px' }}>
      <div className="TestDiff" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {sequence.map((item, index) => (
          <div
            key={item}
            style={{
              width: '40px',
              height: '40px',
              border: '1px solid black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {item}
          </div>
        ))}
      </div>
      <button onClick={transform}>Transform</button>
    </div>
  );
};
// const maxNumber = max([1,2,3,4,5])
// console.log(maxNumber);

/*  模拟数据  */
const mockDataArray = new Array(10000).fill(1);
/* 高量显示内容 */
function ShowText({ query }) {
  const text = 'asdfghjk';
  let children;

  if (text.indexOf(query) > 0) {
    /* 找到匹配的关键词 */
    const arr = text.split(query);
    children = (
      <div>
        {arr[0]}
        <span style={{ color: 'pink' }}>{query}</span>
        {arr[1]}{' '}
      </div>
    );
  } else {
    children = <div>{text}</div>;
  }
  return <div>{children}</div>;
}
/* 列表数据 */
function List({ query }) {
  return (
    <div>
      {mockDataArray.map((item, index) => (
        <div key={index}>
          <ShowText query={query} />
        </div>
      ))}
    </div>
  );
}
/* memo 做优化处理  */
const NewList = React.memo(List);

function App() {
  const [value, setInputValue] = React.useState('');
  const [isTransition, setTransion] = React.useState(false);
  const [query, setSearchQuery] = React.useState('');
  console.log(11111, value, query);
  const handleChange = e => {
    console.log(e.target.value);
    /* 高优先级任务 —— 改变搜索条件 */
    setInputValue(e.target.value);
    React.startTransition(() => {
      /* 低优先级任务 —— 改变搜索过滤后列表状态  */
      setSearchQuery(e.target.value);
    });
  };
  return (
    <div>
      <button onClick={() => setTransion(!isTransition)}>
        {isTransition ? 'transition' : 'normal'}{' '}
      </button>
      <input onChange={handleChange} placeholder="输入搜索内容" value={value} />
      <NewList query={query} />
    </div>
  );
}

function Index() {
  return (
    <div>
      <TestDiff />
      <TestHook />
      <TestList />
      <Test>
        <div>嘿嘿</div>
        <div
          onClick={() => {
            axios.get('/user').then(res => {
              console.log(res);
            });
          }}
        >
          嘻嘻
        </div>
      </Test>
      <Demo />
      <p> 《React进阶实践指南》 </p>
      <App />
      {/* <App /> */}
      {/* <AppRoute /> */}
      {/* <AnkiIndex/> */}
      {/* <MyEditor/> */}
    </div>
  );
}

function AnkiCard({ flipped, onFlip, onNext, front, back }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>{front}</div>
      {flipped ? (
        <div>
          <MyEditor value={`<div>${back}</div>`} />
        </div>
      ) : (
        <div style={{ height: '90vh' }}></div>
      )}
      {
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {flipped ? (
            <Button
              onClick={() => {
                onNext && onNext();
              }}
            >
              通过
            </Button>
          ) : (
            <Button
              onClick={() => {
                onFlip && onFlip(true);
              }}
            >
              展示答案
            </Button>
          )}
        </div>
      }
    </div>
  );
}

function AnkiIndex() {
  const [flipped, setFlipped] = useState(false);
  const [card, setCard] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getNextCard();
  }, []);

  const getNextCard = () => {
    setFlipped(false);
    setLoading(true);
    axios
      .get('/anki/getNextCard?deck=1')
      .then(res => {
        setLoading(false);
        setCard(res.data);
        console.log(res);
      })
      .catch(err => {
        setLoading(false);
        console.log(err);
      });
  };

  return (
    <Spin spinning={loading}>
      <AnkiCard
        {...pick(card, ['front', 'back'])}
        flipped={flipped}
        onNext={getNextCard}
        onFlip={action => setFlipped(action)}
      />
    </Spin>
  );
}

const HeavyListComponent = () => {
  // 列表状态
  const [items, setItems] = useState([]);
  const [isPending, startTransition] = useTransition();
  const [counter, setCounter] = useState(0);
  const [isInitializing, setIsInitializing] = useState(true);

  // 使用 useDeferredValue 处理大列表数据
  const deferredItems = useDeferredValue(items);

  // 低优先级初始化
  useEffect(() => {
    startTransition(() => {
      const newItems = Array.from({ length: 10000 }, (_, index) => ({
        id: index,
        value: `Item ${index}`,
        height: Math.floor(Math.random() * 30) + 30,
      }));
      setItems(newItems);
      setIsInitializing(false);
    });
  }, []);

  // 高优先级点击处理
  const handlePriorityClick = () => {
    setCounter(prev => prev + 1);
  };

  return (
    <div className="heavy-list-container">
      <div className="control-panel">
        <button className="priority-button" onClick={handlePriorityClick}>
          High Priority Action (Count: {counter})
        </button>

        {isPending && <div className="loading-indicator">Initializing large list...</div>}
      </div>

      <div className="list-container">
        {deferredItems.map(item => (
          <div key={item.id} className="list-item" style={{ height: `${item.height}px` }}>
            <span className="item-content">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

function MyEditor({ value }) {
  const [editor, setEditor] = useState(null); // 存储 editor 实例
  const [html, setHtml] = useState(value);

  const toolbarConfig = {};
  const editorConfig = {
    placeholder: '请输入内容...',
  };

  // 及时销毁 editor
  useEffect(() => {
    console.log(editor);
    return () => {
      if (editor == null) return;
      editor.destroy();
      setEditor(null);
    };
  }, [editor]);

  function insertText() {
    if (editor == null) return;
    editor.insertText(' hello ');
  }

  function printHtml() {
    if (editor == null) return;
    console.log(editor.getHtml());
  }

  return (
    <>
      {/* <div>
              <button onClick={insertText}>insert text</button>
              <button onClick={printHtml}>print html</button>
          </div> */}

      <div style={{ border: '1px solid #ccc', zIndex: 100, marginTop: '15px' }}>
        <Toolbar
          editor={editor}
          defaultConfig={toolbarConfig}
          mode="default"
          style={{ borderBottom: '1px solid #ccc' }}
        />
        <Editor
          defaultConfig={editorConfig}
          value={html}
          onCreated={setEditor}
          onChange={editor => {
            setHtml(editor.getHtml());
            console.log(editor.getHtml());
          }}
          mode="default"
          style={{ height: '500px' }}
        />
      </div>
      {/* <div style={{ marginTop: '15px' }}>
              {html}
          </div> */}
    </>
  );
}

const container = document.getElementById('root');

const root = createRoot(container);
// ReactDOM.render(React.createElement(Index), container);
root.render(<Index />);

if (module.hot) {
  module.hot.accept();
}
