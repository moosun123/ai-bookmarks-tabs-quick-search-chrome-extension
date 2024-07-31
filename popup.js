const debounceFunc = (func, delay) => {
  let timer = null;
  return function (...args) {
    let _this = this;
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      func.apply(_this, args);
    }, delay);
  };
};

const removeChildren = (id) => {
  document.getElementById(id).replaceChildren();
};

const addListDom = (id, content) => {
  const li = document.createElement("li");
  li.textContent = content;
  document.getElementById(id)?.appendChild(li);
};

const render = (list, id) => {
  try {
    removeChildren(id);
    if (Array.isArray(list)) {
      list.slice(0, 10).forEach((item) => {
        addListDom(id, item[0]);
      });
    }
  } catch (err) {
    sendConsole(err);
  }
};

const debounceSendMessage = debounceFunc((message) => {
  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      sendConsole(chrome.runtime.lastError);
    } else {
      const { bookmarks, tabs } = response.data || {};
      render(bookmarks, "ai-extension-bookmarks");
      render(tabs, "ai-extension-tabs");
    }
  });
}, 700);

const sendConsole = (message, title) => {
  chrome.runtime.sendMessage({
    type: "console",
    title,
    data: message,
  });
};

document
  .getElementById("ai-extension-input")
  .addEventListener("keydown", async (e) => {
    // 1. 输入框传入空值 2. 输入的不是enter
    if (!e.target.value || e.key !== "Enter") {
      return;
    }
    const message = { type: "get_similarity", data: e.target.value };
    debounceSendMessage(message);
  });
