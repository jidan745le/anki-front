import React from 'react';
import {
  Link, useLocation, useNavigation, useNavigate
} from "react-router-dom";
import styles from './style.module.css';
import { includes } from 'lodash';
const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  // const navigation = useNavigation();

  return (
    <div >
      <nav className={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#e74c3c',
              borderRadius: '10%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '20px',
            }}
          >
            <span>📦</span> {/* 可以替换为实际图标 */}
          </div>
          <span style={{ marginLeft: '10px', fontFamily: 'Arial, sans-serif', fontSize: '16px', color: '#333' }}>
            MyANKI
          </span>
        </div>
        {["/login","/signup"].includes(location.pathname) ? null : <ul className={styles.navLeft}>
          <li>
            <a onClick={() => navigate("/decks")}>decks</a>
          </li>
          <li>
            <a>search</a>
          </li>
        </ul>}
        <ul className={styles.navRight}>
          {["/login","/signup"].includes(location.pathname) ?
            <li>
              <a onClick={() => navigate("/signup")}>Sign Up</a>
            </li> :
            <><li>
              <a>Account</a>
            </li>
              <li>
                <a onClick={() =>{
                  localStorage.removeItem('token');
                  navigate("/login");
                }}>Log Out</a>
              </li></>}
        </ul>
        {/* <Link to="/decks">decks</Link>
        <Link to="/search">search</Link> */}
      </nav>
      <main>{children}</main>
    </div>
  );
};

export default Layout;