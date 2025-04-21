export const toString = value => {
  return value.toString ? value.toString() : '';
};

export const toNumber = value => {
  return value.toString ? Number(value.toString()) : 0;
};

export const bbb = 1;
export let ccc = 1;

export const addSpanBelowP = inputHtml => {
  // 创建一个临时容器来解析 HTML
  const container = document.createElement('div');
  container.innerHTML = inputHtml;

  // 获取所有的 <p> 节点
  const paragraphs = container.querySelectorAll('p');

  // 遍历每一个 <p> 节点
  paragraphs.forEach(p => {
    // 创建一个新的 <span> 节点
    const span = document.createElement('span');
    span.style.fontSize = '24px';

    // 将 <p> 的所有子节点移动到 <span> 中
    while (p.firstChild) {
      span.appendChild(p.firstChild);
    }

    // 将 <span> 插入到 <p> 中
    p.appendChild(span);
  });
  console.log(inputHtml, container.innerHTML, 'dsadadsad');
  // 获取转换后的 HTML
  const outputHtml = container.innerHTML;
  return outputHtml;
};
