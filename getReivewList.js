const getReviewList = async (url, html) => {

  console.log("URL in Param: " + url);

  // URL에서 path 추출
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  
  console.log("Extracted path: " + path);

  // 파라미터로 받은 html 문자열을 DOM으로 파싱
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // 파싱된 HTML에서 path를 data-url 속성으로 가지고, id가 pullrequestreview-로 시작하는 요소 가져오기
  const containers = doc.querySelectorAll(`[data-url^="${path}"][id^="pullrequestreview-"]`);
  
  console.log("Found containers: ", containers.length);
  console.log("Containers: ", containers);

  // 모든 컨테이너에서 turbo-frame들 수집
  if (containers.length > 0) {
    const allTurboFrames = [];
    const allWrappers = [];
    
    containers.forEach((container, containerIndex) => {
      console.log(`=== Processing Container ${containerIndex + 1}/${containers.length} ===`);
      console.log("Container ID:", container.id);
      
      // === 컨테이너 전체 구조 상세 출력 ===
      console.log("=== Container 전체 구조 ===");
      console.log("Container tagName:", container.tagName);
      console.log("Container classes:", container.className);
      console.log("직접 자식 요소들:");
      Array.from(container.children).forEach((child, childIndex) => {
        console.log(`  Child ${childIndex + 1}: tagName=${child.tagName}, id=${child.id}, class=${child.className}`);
      });
      console.log("=============================");
      
      // 각 컨테이너의 자식 중 TimelineItem-body 클래스를 가진 요소들 직접 찾기
      const timelineBodyElements = container.querySelectorAll('.TimelineItem-body');
      console.log(`Container ${containerIndex + 1}에서 TimelineItem-body ${timelineBodyElements.length}개 발견`);
      
      // my-0 클래스를 가진 TimelineItem-body 찾기 (코드가 있는 리뷰)
      const codeReviewBodies = Array.from(timelineBodyElements).filter(body => body.classList.contains('my-0'));
      console.log(`그 중 my-0 클래스를 가진 것: ${codeReviewBodies.length}개 (코드 리뷰)`);
      
      // 실제로 turbo-frame이 있는지 확인
      let hasTurboFrames = false;
      
      // 코드가 있는 리뷰 처리
      codeReviewBodies.forEach((bodyElement, bodyIndex) => {
        console.log(`--- Processing Code Review Body ${bodyIndex + 1}/${codeReviewBodies.length} in Container ${containerIndex + 1} ---`);
        
        allWrappers.push(bodyElement);
        
        // === TimelineItem-body 구조 상세 출력 ===
        console.log("=== Code Review Body 전체 구조 ===");
        console.log("outerHTML:", bodyElement.outerHTML);
        console.log("자식 요소들:");
        Array.from(bodyElement.children).forEach((child, childIndex) => {
          console.log(`  Child ${childIndex + 1}: tagName=${child.tagName}, id=${child.id}, class=${child.className}`);
        });
        console.log("===============================");
        
        // Wrapper의 직접 자식 중 turbo-frame들 찾기
        const turboFrames = bodyElement.querySelectorAll(':scope > turbo-frame');
        console.log(`Code Review Body에서 turbo-frame ${turboFrames.length}개 발견`);
        
        if (turboFrames.length > 0) {
          hasTurboFrames = true;
          Array.from(turboFrames).forEach(frame => {
            allTurboFrames.push({
              element: frame,
              hasCode: true,
              containerId: container.id,
              bodyIndex: bodyIndex
            });
            console.log(`추가된 turbo-frame ID: ${frame.id} (코드 있음)`);
          });
        }
      });
      
      console.log("코드없는 거 필터링하는 버전임!!!!!!")
      // 코드가 없는 리뷰인지 확인 (turbo-frame이 실제로 없는 경우)
      if (!hasTurboFrames && timelineBodyElements.length > 0) {
        console.log("--- 코드가 없는 리뷰로 판단 (turbo-frame이 없음) ---");
        // 컨테이너 자체를 코드 없는 리뷰로 처리
        allTurboFrames.push({
          element: container, // 컨테이너 전체를 저장
          hasCode: false,
          containerId: container.id,
          bodyIndex: 0
        });
        console.log(`추가된 non-code review: ${container.id} (코드 없음)`);
      }
      
      if (timelineBodyElements.length === 0) {
        console.log(`Container ${containerIndex + 1}에서 TimelineItem-body를 찾을 수 없음`);
      }
    });
    
    console.log("=== 전체 수집 결과 ===");
    console.log("Total containers processed: ", containers.length);
    console.log("Total wrappers found: ", allWrappers.length);
    console.log("Total items collected: ", allTurboFrames.length);
    console.log("Items with code: ", allTurboFrames.filter(item => item.hasCode).length);
    console.log("Items without code: ", allTurboFrames.filter(item => !item.hasCode).length);
    
    // 디버깅을 위해 첫 번째 wrapper 정보 출력
    if (allWrappers.length > 0) {
      const firstWrapper = allWrappers[0];
      console.log("=== 첫 번째 WRAPPER 전체 HTML ===");
      console.log("outerHTML:", firstWrapper.outerHTML);
      console.log("=====================================");
    }
    
    const turboList = allTurboFrames;
        
        // 각 아이템에서 데이터 추출
        console.log("=== 전체 리뷰 리스트 추출 시작 ===");
        const reviewDataList = [];
        
        turboList.forEach((item, index) => {
          console.log(`--- Processing Item ${index + 1}/${turboList.length} (hasCode: ${item.hasCode}) ---`);
          
          if (item.hasCode) {
            // 코드가 있는 리뷰 - turbo-frame 처리
            const reviewData = getCodeByTurboFrame(item.element);
            reviewDataList.push({
              frameIndex: index + 1,
              withCodeField: true,
              ...reviewData
            });
          } else {
            // 코드가 없는 리뷰 - Container 전체에서 정보 추출
            console.log("코드가 없는 리뷰 처리 중...");
            const containerElement = item.element;
            
            console.log("=== 코드 없는 리뷰 Container 구조 분석 ===");
            console.log("Container outerHTML:", containerElement.outerHTML);
            console.log("========================================");
            
            // 리뷰어 정보 추출 - 컨테이너 전체에서 검색
            const reviewerElement = containerElement.querySelector('strong a.author.Link--primary.text-bold');
            const reviewerName = reviewerElement ? reviewerElement.textContent.trim() : '';
            
            // 리뷰 내용 추출 - 일반적으로 comment-body가 없을 수 있음
            let reviewContent = '';
            
            // 여러 방법으로 리뷰 내용 찾기
            const contentSelectors = [
              '.comment-body.markdown-body',
              '.timeline-comment-body',
              '.js-comment-body',
              '[data-view-component="true"] .comment'
            ];
            
            for (const selector of contentSelectors) {
              const contentElement = containerElement.querySelector(selector);
              if (contentElement && contentElement.textContent.trim()) {
                reviewContent = contentElement.textContent.trim();
                console.log(`리뷰 내용을 ${selector}에서 찾음:`, reviewContent);
                break;
              }
            }
            
            // 만약 위 방법으로 찾지 못했다면, approved/commented 등의 텍스트 추출
            if (!reviewContent) {
              const approvedElement = containerElement.querySelector('[data-view-component="true"] .flex-auto');
              if (approvedElement) {
                reviewContent = approvedElement.textContent.trim();
                console.log("승인/댓글 텍스트에서 내용 추출:", reviewContent);
              }
            }
            
            // 프로필 이미지 추출
            const profileImageElement = containerElement.querySelector('img.avatar.circle');
            const profileImage = profileImageElement ? profileImageElement.src : '';
            
            console.log("추출된 정보:");
            console.log("- 리뷰어:", reviewerName);
            console.log("- 내용:", reviewContent);
            console.log("- 프로필 이미지:", profileImage);
            
            reviewDataList.push({
              frameIndex: index + 1,
              withCodeField: false,
              success: true,
              codePath: null,
              codeList: null,
              codeCount: 0,
              reviewerName: reviewerName,
              reviewContent: reviewContent,
              profileImage: profileImage
            });
          }
        });
        
        // 최종 전체 JSON 리스트 출력
        console.log("=== 최종 전체 리뷰 데이터 JSON ===");
        console.log(JSON.stringify(reviewDataList, null, 2));
        console.log("================================");
        
        // TODO: 서버 API 호출 함수 정의
        // 여기서 서버 API 호출을 할 수 있습니다
        // await sendReviewDataToServer(reviewDataList);
        
        return {
          success: true,
          count: turboList.length,
          turboFrames: turboList,
          reviewDataList: reviewDataList
        };
        
  } else {
    return {
      success: false,
      error: "pullrequestreview 컨테이너를 찾을 수 없습니다."
    };
  }
};

// TODO: 서버 API 호출 함수 정의
// 서버 API 호출 함수 (예시)
const sendReviewDataToServer = async (reviewDataList) => {
  try {
    console.log("=== 서버로 리뷰 데이터 전송 시작 ===");
    
    const response = await fetch('YOUR_API_ENDPOINT_HERE', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reviews: reviewDataList,
        timestamp: new Date().toISOString(),
        // 필요한 추가 메타데이터
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }
    
    const result = await response.json();
    console.log("서버 응답:", result);
    
    return result;
  } catch (error) {
    console.error("API 호출 에러:", error);
    throw error;
  }
};

// ES6 export 제거하고 전역으로 사용 가능하게 함