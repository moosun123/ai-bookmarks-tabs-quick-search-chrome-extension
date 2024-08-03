let controller;
const getSimilarity = (bookmarks, tabs, word) => {
  controller = new AbortController();
  const signal = controller.signal;
  return fetch("http://127.0.0.1:5000/similarity", {
    signal,
    method: "POST",
    body: JSON.stringify({
      bookmarks,
      tabs,
      word,
    }),
    headers: {
      "content-type": "application/json",
    },
  })
    .then((response) => response.json())
    .catch((error) => {
      if (error.name === "AbortError") {
        console.log("Fetch request was aborted");
      } else {
        console.error("Fetch error:", error);
      }
    });
};

const getTabs = () => {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({}, function (tabsList) {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(tabsList.map((tab) => tab.title).filter((tab) => tab));
      }
    });
  });
};

const getBookmarks = () => {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.getTree((bookmarks) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(bookmarks);
      }
    });
  });
};

const dfsBookmarks = (bookmarks, bookmarkList, cascadeTitle = "") => {
  const { children, title } = bookmarks || {};
  if (Array.isArray(children) && children.length) {
    children.forEach((child) => {
      dfsBookmarks(child, bookmarkList, cascadeTitle + " " + title);
    });
  } else {
    bookmarkList.push((cascadeTitle + " " + title).trimStart());
  }
};

const wrapAsyncFunction = (listener) => (request, sender, sendResponse) => {
  // the listener(...) might return a non-promise result (not an async function), so we wrap it with Promise.resolve()
  Promise.resolve(listener(request, sender, sendResponse));
  return true; // return true to indicate you want to send a response asynchronously
};

chrome.runtime.onMessage.addListener(
  wrapAsyncFunction(async (message, sender, sendResponse) => {
    if (message.type === "get_similarity") {
      console.log("get_similarity", message);
      // 1. 终止上一次请求
      if (controller) {
        console.log("abort");
        controller.abort();
      }
      // 2. 处理从 popup 发送过来的消息
      const bookmarkList = [];
      const bookmarks = await getBookmarks();
      const tabs = await getTabs();
      dfsBookmarks(bookmarks[0], bookmarkList);

      // 3. 获取相似度
      const response = await getSimilarity(bookmarkList, tabs, message.data);
      // 4. 返回结果
      sendResponse({ type: "data", data: response });
      return true;
    } else if (message.type === "console") {
      console.log(message.title || "输出内容:", message.data);
      return true;
    }
  })
);

// 快捷键打开弹窗
chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    chrome.action.openPopup();
  }
});
