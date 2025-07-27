// import getReviewList from "./getReivewList"; // ES6 import 제거

// document.getElementById("get-footer-btn").addEventListener("click", () => {
//   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
//     chrome.tabs.sendMessage(
//       tabs[0].id,
//       { type: <script type="module" src="popup.js"></script>"GET_FOOTER" },
//       (response) => {
//         console.log(response);
//         console.log("푸터 HTML:", response.html);
//         document.getElementById("output").textContent = response.html;
//       }
//     );
//   });
// });

document.addEventListener("click", () => {
  console.log("start content script!!");
  
  // 현재 활성 탭의 정보 가져오기
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    const pageUrl = currentTab.url;
    
    console.log("Current tab URL:", pageUrl);
    
    // 현재 탭에 스크립트를 주입하여 HTML 가져오기
    chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      function: () => {
        return {
          url: window.location.href,
          html: document.documentElement.outerHTML
        };
      }
    }, (results) => {
      if (results && results[0]) {
        const { url, html } = results[0].result;
        console.log("Page URL:", url);
        console.log("Page HTML:", html);
        
        // getReviewList 함수 호출
        console.log(getReviewList(url, html));
      }
    });
  });
});