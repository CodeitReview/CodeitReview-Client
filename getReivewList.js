const getReviewList = async (url, html) => {


  // URL에서 path 추출
  const urlObj = new URL(url);
  const path = urlObj.pathname;
  

  // 파라미터로 받은 html 문자열을 DOM으로 파싱
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  
  // 파싱된 HTML에서 path를 data-url 속성으로 가지고, id가 pullrequestreview-로 시작하는 요소 가져오기
  const containers = doc.querySelectorAll(`[data-url^="${path}"][id^="pullrequestreview-"]`);
  


  // 모든 컨테이너에서 turbo-frame들 수집
  if (containers.length > 0) {
    const allTurboFrames = [];
    const allWrappers = [];
    
    containers.forEach((container, containerIndex) => {
     
      
      
      // 각 컨테이너의 자식 중 TimelineItem-body 클래스를 가진 요소들 직접 찾기
      const timelineBodyElements = container.querySelectorAll('.TimelineItem-body');
      
      // my-0 클래스를 가진 TimelineItem-body 찾기 (코드가 있는 리뷰)
      const codeReviewBodies = Array.from(timelineBodyElements).filter(body => body.classList.contains('my-0'));
      
      // 실제로 turbo-frame이 있는지 확인
      let hasTurboFrames = false;
      
      // 코드가 있는 리뷰 처리
      codeReviewBodies.forEach((bodyElement, bodyIndex) => {
        
        allWrappers.push(bodyElement);
        
        
        // Wrapper의 직접 자식 중 turbo-frame들 찾기
        const turboFrames = bodyElement.querySelectorAll(':scope > turbo-frame');
        
        if (turboFrames.length > 0) {
          hasTurboFrames = true;
          Array.from(turboFrames).forEach(frame => {
            allTurboFrames.push({
              element: frame,
              hasCode: true,
              containerId: container.id,
              bodyIndex: bodyIndex
            });
          });
        }
      });
      
      // 코드가 없는 리뷰인지 확인 (turbo-frame이 실제로 없는 경우)
      if (!hasTurboFrames && timelineBodyElements.length > 0) {
        // 컨테이너 자체를 코드 없는 리뷰로 처리
        allTurboFrames.push({
          element: container, // 컨테이너 전체를 저장
          hasCode: false,
          containerId: container.id,
          bodyIndex: 0
        });
      }
      
      if (timelineBodyElements.length === 0) {
      }
    });
    
   
    
    // 디버깅을 위해 첫 번째 wrapper 정보 출력
    if (allWrappers.length > 0) {
      const firstWrapper = allWrappers[0];
     
    }
    
    const turboList = allTurboFrames;
        
        // 각 아이템에서 데이터 추출
        const reviewDataList = [];
        
        turboList.forEach((item, index) => {
          
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
            const containerElement = item.element;
            
            
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
                break;
              }
            }
            
            // 만약 위 방법으로 찾지 못했다면, approved/commented 등의 텍스트 추출
            if (!reviewContent) {
              const approvedElement = containerElement.querySelector('[data-view-component="true"] .flex-auto');
              if (approvedElement) {
                reviewContent = approvedElement.textContent.trim();
              }
            }
            
            // 프로필 이미지 추출
            const profileImageElement = containerElement.querySelector('img.avatar.circle');
            const profileImage = profileImageElement ? profileImageElement.src : '';
            
            
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

// 서버 API 호출 함수 (예시)
const sendReviewDataToServer = async (reviewDataList) => {
  try {
    
    // TODO: 실제 API 엔드포인트로 변경해주세요
    const API_ENDPOINT = 'https://your-api-domain.com/api/reviews/process';
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 필요하다면 인증 헤더 추가
        // 'Authorization': 'Bearer YOUR_TOKEN'
      },
      body: JSON.stringify({
        reviews: reviewDataList,
        timestamp: new Date().toISOString(),
        source: 'github_extension',
        version: '1.0.0'
      })
    });
    
    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }
    
    const result = await response.json();
    
    return result;
  } catch (error) {
    console.error("API 호출 에러:", error);
    throw error;
  }
};

// ES6 export 제거하고 전역으로 사용 가능하게 함