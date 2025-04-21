import React, { useEffect, useState } from 'react';
import './style.less'; // 导入样式表
const FooterBar = ({ children }) => {
  return (
    <footer className="footer-bar">
      <div className="footer-content">
        <div className="footer-buttons">{children}</div>
      </div>
    </footer>
  );
};

export default FooterBar;
