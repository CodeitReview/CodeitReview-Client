chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_FOOTER") {
    const footer = document.querySelector("footer");
    const html = footer ? footer.outerHTML : "<footer>푸터 없음</footer>";
    console.log(footer)
    console.log("푸터 HTML:", html);
    
    sendResponse({ html });
  }
});