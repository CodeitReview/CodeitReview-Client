class ReviewExtractor {
  constructor() {
    this.reviewData = [];
    // API 베이스 URL 설정 (HTML에서 설정된 값 사용 또는 기본값)
    this.API_BASE_URL = window.API_CONFIG?.BASE_URL || 'http://localhost:8080';
    this.init();
  }

  init() {
    // DOM 요소 가져오기
    this.extractBtn = document.getElementById('extract-reviews-btn');
    this.statusContent = document.getElementById('status-content');
    this.resultsSection = document.getElementById('results-section');
    this.reviewsContainer = document.getElementById('reviews-container');
    this.copyAllBtn = document.getElementById('copy-all-btn');
    
    // 통계 요소들
    this.totalCountEl = document.getElementById('total-count');
    this.codeCountEl = document.getElementById('code-count');
    this.nonCodeCountEl = document.getElementById('non-code-count');

    // 이벤트 리스너 등록
    this.extractBtn.addEventListener('click', () => this.extractReviews());
    this.copyAllBtn.addEventListener('click', () => this.copyAllReviews());
  }

  // 로딩 상태 표시
  showLoading(message = '리뷰를 추출하는 중...') {
    this.statusContent.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <span>${message}</span>
      </div>
    `;
  }

  // 에러 상태 표시
  showError(message) {
    this.statusContent.innerHTML = `
      <div class="error">
        ❌ ${message}
      </div>
    `;
  }

  // 성공 상태 표시
  showSuccess(message) {
    this.statusContent.innerHTML = `
      <div class="success">
        ✅ ${message}
      </div>
    `;
  }

  // 리뷰 추출 메인 함수
  async extractReviews() {
    try {
      this.extractBtn.disabled = true;
      this.extractBtn.innerHTML = '⏳ 추출 중...';
      this.showLoading('GitHub 페이지 정보를 가져오는 중...');

      // 현재 탭 정보 가져오기
      const tabs = await this.getCurrentTabs();
      const currentTab = tabs[0];
      
      if (!this.isGitHubPullRequest(currentTab.url)) {
        throw new Error('GitHub Pull Request 페이지에서만 사용할 수 있습니다.');
      }

      this.showLoading('페이지 HTML을 분석하는 중...');

      // 페이지 HTML 가져오기
      const pageData = await this.getPageData(currentTab.id);
      
      this.showLoading('리뷰 데이터를 추출하는 중...');

      // 리뷰 추출
      const result = await getReviewList(pageData.url, pageData.html);
      
      if (!result.success) {
        throw new Error(result.error || '리뷰를 찾을 수 없습니다.');
      }

      this.reviewData = result.reviewDataList;
      this.showSuccess(`총 ${this.reviewData.length}개의 리뷰를 추출했습니다.`);
      
      // 서버에서 notion 템플릿을 받았다면 자동으로 클립보드에 복사
      if (result.shouldCopyToClipboard && result.notionTemplate) {
        try {
          await this.copyNotionFormatToClipboard(result.notionTemplate, pageData.url);
          this.showSuccess(`✅ 리뷰 추출 완료! Notion 템플릿이 클립보드에 복사되었습니다.`);
        } catch (clipboardError) {
          console.error("클립보드 복사 실패:", clipboardError);
          this.showSuccess(`총 ${this.reviewData.length}개의 리뷰를 추출했습니다. (클립보드 복사 실패)`);
        }
      }
      
      // 결과 표시
      this.displayResults();

    } catch (error) {
      console.error('리뷰 추출 에러:', error);
      this.showError(error.message);
    } finally {
      this.extractBtn.disabled = false;
      this.extractBtn.innerHTML = '📋 리뷰 추출하기';
    }
  }

  // 현재 탭 정보 가져오기 (Promise 래퍼)
  getCurrentTabs() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, resolve);
    });
  }

  // GitHub PR 페이지인지 확인
  isGitHubPullRequest(url) {
    return url.includes('github.com') && url.includes('/pull/');
  }

  // 페이지 데이터 가져오기 (Promise 래퍼)
  getPageData(tabId) {
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript({
        target: { tabId },
        function: () => {
          return {
            url: window.location.href,
            html: document.documentElement.outerHTML
          };
        }
      }, (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (results && results[0]) {
          resolve(results[0].result);
        } else {
          reject(new Error('페이지 데이터를 가져올 수 없습니다.'));
        }
      });
    });
  }

  // 결과 표시
  displayResults() {
    if (this.reviewData.length === 0) {
      this.resultsSection.style.display = 'none';
      return;
    }

    // 통계 업데이트
    const codeReviews = this.reviewData.filter(review => review.withCodeField);
    const nonCodeReviews = this.reviewData.filter(review => !review.withCodeField);

    this.totalCountEl.textContent = this.reviewData.length;
    this.codeCountEl.textContent = codeReviews.length;
    this.nonCodeCountEl.textContent = nonCodeReviews.length;

    // 리뷰 아이템들 렌더링
    this.reviewsContainer.innerHTML = this.reviewData
      .map((review, index) => this.renderReviewItem(review, index))
      .join('');

    // 개별 복사 버튼 이벤트 등록
    this.reviewsContainer.querySelectorAll('.copy-button').forEach((btn, index) => {
      btn.addEventListener('click', () => this.copyIndividualReview(index));
    });

    this.resultsSection.style.display = 'block';
  }

  // 개별 리뷰 아이템 렌더링
  renderReviewItem(review, index) {
    const reviewType = review.withCodeField ? '코드 리뷰' : '일반 리뷰';
    const reviewTypeClass = review.withCodeField ? 'code-review' : 'general-review';
    
    const reviewContent = review.reviewContent || 
      (review.withCodeField ? `${review.codeCount}개의 코드 변경사항` : '승인/댓글');

    const codeInfo = review.withCodeField && review.codeCount > 0 
      ? `${review.codeCount}개 코드` 
      : '';

    return `
      <div class="review-item ${reviewTypeClass}">
        <div class="review-header">
          <span class="reviewer-name">${review.reviewerName || '알 수 없음'}</span>
          <span class="review-type">${reviewType}</span>
        </div>
        <div class="review-content">${this.truncateText(reviewContent, 100)}</div>
        <div class="review-meta">
          <span class="code-count">${codeInfo}</span>
        </div>
      </div>
    `;
  }

  // 텍스트 자르기
  truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  // 개별 리뷰 복사
  async copyIndividualReview(index) {
    try {
      const review = this.reviewData[index];
      
      // 개별 리뷰 데이터를 배열로 감싸서 전달
      await this.copyNotionFormatToClipboard([review]);
      
      // 복사 버튼 상태 변경
      const button = this.reviewsContainer.querySelector(`[data-index="${index}"]`);
      const originalText = button.textContent;
      button.textContent = '복사됨!';
      button.style.background = '#27ae60';
      
      setTimeout(() => {
        button.textContent = originalText;
        button.style.background = '';
      }, 1500);

    } catch (error) {
      console.error('복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  }

  // 모든 리뷰 복사
  async copyAllReviews() {
    try {

      // 모든 리뷰 데이터를 배열로 전달
      await this.copyNotionFormatToClipboard(this.reviewData);
      
      // 버튼 상태 변경
      const originalText = this.copyAllBtn.textContent;
      this.copyAllBtn.textContent = '✅ 복사 완료!';
      this.copyAllBtn.style.background = '#27ae60';
      
      setTimeout(() => {
        this.copyAllBtn.textContent = originalText;
        this.copyAllBtn.style.background = '';
      }, 2000);

    } catch (error) {
      console.error('전체 복사 실패:', error);
      alert('복사에 실패했습니다.');
    }
  }

  // 리뷰를 복사용 텍스트로 포맷팅
  formatReviewForCopy(review) {
    // 리뷰 데이터를 JSON 형태로 구조화
    const reviewJson = {
      reviewer: review.reviewerName || '알 수 없음',
      type: review.withCodeField ? '코드 리뷰' : '일반 리뷰',
      content: review.reviewContent || '',
      ...(review.withCodeField && {
        codePath: review.codePath,
        codeCount: review.codeCount,
        codeList: review.codeList
      })
    };

    return JSON.stringify(reviewJson, null, 2);
  }

  // 모든 리뷰를 Notion 블록용으로 포맷팅
  formatAllReviewsForNotion() {
    return this.reviewData.map((review, index) => ({
      index: index + 1,
      reviewer: review.reviewerName || '알 수 없음',
      type: review.withCodeField ? '코드 리뷰' : '일반 리뷰',
      content: review.reviewContent || (review.withCodeField ? '코드 변경사항' : '승인/댓글'),
      ...(review.withCodeField && review.codeCount && {
        codeCount: review.codeCount
      })
    }));
  }

  // Notion 포맷으로 클립보드에 복사
  async copyNotionFormatToClipboard(reviewData, prURL) {
    try {
      
      // 리뷰 데이터가 배열인지 개별 리뷰인지 확인
      let reviews = [];
      if (Array.isArray(reviewData)) {
        // 모든 리뷰 복사인 경우
        reviews = this.reviewData;
      } else {
        // 개별 리뷰 복사인 경우 - reviewData는 JSON 문자열이므로 원본 데이터를 찾아야 함
        reviews = this.reviewData;
      }

      // AI 요약 생성
      const aiSummary = await this.generateAISummary(reviews, prURL);
      
      // 각 리뷰를 템플릿에 맞춰 포맷팅
      const formattedReviews = reviews.map((review, index) => {
        const reviewNumber = index + 1;
        const codeSection = review.withCodeField && review.codeList && review.codeList.length > 0 
          ? review.codeList.map(code => this.preserveCodeIndentation(code)).join('\n') 
          : 'No code changes';
        const reviewerName = review.reviewerName || 'Unknown';
        const reviewerProfileUrl = review.profileImage || 'https://avatars.githubusercontent.com/u/default';
        const reviewContent = review.reviewContent || 'No comment';
        
        const plainText = `# Review ${reviewNumber}  반영 여부  ✅  or ❌

\`\`\`java
${codeSection}
\`\`\`

[@${reviewerName}](${reviewerProfileUrl})

**[${reviewerName}](https://github.com/${reviewerName}) [4 days ago](${prURL})**

> ${reviewContent}
> 

---`;

        const htmlText = `<h1>Review ${reviewNumber}  반영 여부  ✅  or ❌ </h1>
<pre><code class="language-java">${this.escapeHtml(codeSection)}
</code></pre>
<div style="margin: 8px 0;">
<h3>👨‍🏫 ${reviewerName}</h3>
</div>
<blockquote>
<p>${this.escapeHtml(reviewContent)}</p>
</blockquote>
<hr>`;

        return { plainText, htmlText };
      });

      // AI 요약을 맨 앞에 추가하고 모든 리뷰를 하나의 텍스트로 결합
      const combinedPlainText = aiSummary.plainText + '\n\n' + formattedReviews.map(r => r.plainText).join('\n\n');
      const combinedHtmlText = aiSummary.htmlText + '\n\n' + formattedReviews.map(r => r.htmlText).join('\n\n');
      
      // Plain text와 HTML을 별도의 클립보드 형식으로 복사
      const clipboardData = new ClipboardItem({
        'text/plain': new Blob([combinedPlainText], { type: 'text/plain' }),
        'text/html': new Blob([combinedHtmlText], { type: 'text/html' })
      });

      await navigator.clipboard.write([clipboardData]);
      
    } catch (error) {
      console.warn("클립보드 복사 실패, 일반 텍스트로 대체:", error);
      const fallbackText = `# Review 1  반영 여부  ✅  or ❌  ****

\`\`\`java
Error loading code
\`\`\`

[@Unknown](https://avatars.githubusercontent.com/u/default)

**[Unknown](https://github.com/Unknown) [4 days ago](${prURL})**

> Error loading review content
> 

---`;
      // 모든 포맷 실패시 일반 텍스트로 fallback
      await navigator.clipboard.writeText(fallbackText);
    }
  }

  // Plain text 포맷 생성 (JSON 형태로 깔끔하게)
  formatAsPlainText(text) {
    return text; // JSON 데이터를 그대로 사용
  }

  // Notion HTML 포맷 생성 (JSON을 코드 블록으로)
  formatAsNotionHtml(text) {
    const escapedText = this.escapeHtml(text);
    return `<meta charset='utf-8'>
<pre><code class="language-json">${escapedText}</code></pre>`;
  }

  // Notion 블록 구조 생성
  generateNotionBlocks(text) {
    const spaceId = this.generateNotionId();
    const parentId = this.generateNotionId();
    const currentTime = Date.now();
    const userId = this.generateNotionId();
    
    const headerBlockId = this.generateNotionId();
    const codeBlockId = this.generateNotionId();
    const quoteBlockId = this.generateNotionId();

    return {
      "blocks": [
        {
          "blockId": headerBlockId,
          "blockSubtree": {
            "__version__": 3,
            "block": {
              [headerBlockId]: {
                "value": {
                  "id": headerBlockId,
                  "type": "header",
                  "space_id": spaceId,
                  "created_time": currentTime,
                  "created_by_table": "notion_user",
                  "created_by_id": userId,
                  "version": 26,
                  "parent_id": parentId,
                  "parent_table": "block",
                  "alive": true,
                  "last_edited_time": currentTime + 1000,
                  "last_edited_by_id": userId,
                  "last_edited_by_table": "notion_user",
                  "properties": {
                    "title": [["Review 1"]]
                  }
                }
              }
            }
          }
        },
        {
          "blockId": codeBlockId,
          "blockSubtree": {
            "__version__": 3,
            "block": {
              [codeBlockId]: {
                "value": {
                  "id": codeBlockId,
                  "type": "code",
                  "space_id": spaceId,
                  "created_time": currentTime + 2000,
                  "created_by_table": "notion_user",
                  "created_by_id": userId,
                  "version": 49,
                  "parent_id": parentId,
                  "parent_table": "block",
                  "alive": true,
                  "last_edited_time": currentTime + 3000,
                  "last_edited_by_id": userId,
                  "last_edited_by_table": "notion_user",
                  "properties": {
                    "language": [["JSON"]],
                    "title": [[text]]
                  }
                }
              }
            }
          }
        },
        {
          "blockId": quoteBlockId,
          "blockSubtree": {
            "__version__": 3,
            "block": {
              [quoteBlockId]: {
                "value": {
                  "id": quoteBlockId,
                  "type": "quote",
                  "space_id": spaceId,
                  "created_time": currentTime + 4000,
                  "created_by_table": "notion_user",
                  "created_by_id": userId,
                  "version": 170,
                  "parent_id": parentId,
                  "parent_table": "block",
                  "alive": true,
                  "last_edited_time": currentTime + 5000,
                  "last_edited_by_id": userId,
                  "last_edited_by_table": "notion_user",
                  "properties": {
                    "title": [["리뷰 내용입니다...."]]
                  }
                }
              }
            }
          }
        }
      ],
      "action": "copy",
      "wasContiguousSelection": true
    };
  }

  // 코드의 원본 들여쓰기 보존
  preserveCodeIndentation(codeItem) {
    if (!codeItem || !codeItem.code) {
      return '';
    }

    // rawHTML이 있는 경우 원본 공백 수 계산
    if (codeItem.rawHTML) {
      try {
        // rawHTML에서 실제 텍스트만 추출 (HTML 태그 제거)
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = codeItem.rawHTML;
        const rawText = tempDiv.textContent || tempDiv.innerText || '';
        
        // 첫 번째 라인에서 앞쪽 공백 수 계산
        const leadingSpaces = rawText.match(/^(\s*)/);
        const spaceCount = leadingSpaces ? leadingSpaces[1].length : 0;
        
        // 원본 공백 + 코드 내용
        return ' '.repeat(spaceCount) + codeItem.code.trim();
      } catch (error) {
        console.warn('rawHTML 처리 중 오류:', error);
        return codeItem.code;
      }
    }
    
    // rawHTML이 없는 경우 기본 코드 반환
    return codeItem.code;
  }

  // AI 요약 생성 (서버 API 호출)
  async generateAISummary(reviews, prURL) {
    try {
      // 요청 body 구성
      const codeReviewList = [];
      const nonCodeReviewList = [];
      
      reviews.forEach(review => {
        if (review.withCodeField && review.codeList && review.codeList.length > 0) {
          // 코드 리뷰
          const codeSection = review.codeList.map(code => this.preserveCodeIndentation(code)).join('\n');
          codeReviewList.push({
            comment: review.reviewContent || 'No comment',
            code: codeSection
          });
        } else {
          // 일반 리뷰
          nonCodeReviewList.push({
            comment: review.reviewContent || 'No comment'
          });
        }
      });
      
      const requestBody = {
        prURL: prURL || '',
        codeReviewList: codeReviewList,
        nonCodeReviewList: nonCodeReviewList
      };
      
      // API 호출
      const response = await fetch(`${this.API_BASE_URL}/api/v1/codereview/notion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`API 요청 실패: ${response.status}`);
      }
      
      const result = await response.json(); // JSON으로 파싱
      // 서버에서 받은 요약 사용 (응답 구조에 맞춰 수정)
      let summaryText = '코드리뷰 요약이 들어갈 예정입니다. 코드잇 리뷰를 사용해주셔서 감사합니다....!!';

      if (result && result.success) {
        summaryText = result.message || summaryText;
      }
      const plainText = `# ✨ **코드리뷰 요약**

> ${summaryText}
>`;

      const htmlText = `<meta charset='utf-8'><h1>✨ <strong>코드리뷰 요약</strong></h1>
<blockquote>
<p>${this.escapeHtml(summaryText)}</p>
</blockquote>
<!-- notionvc: ${this.generateNotionId()} -->`;

      return { plainText, htmlText };
      
    } catch (error) {
      console.error('AI 요약 API 호출 실패:', error);
      
      // API 실패시 기본 텍스트 사용
      const summaryText = '코드리뷰 요약이 들어갈 예정입니다. 코드잇 리뷰를 사용해주셔서 감사합니다....!!';
      
      const plainText = `# ✨ **코드리뷰 요약**

> ${summaryText}
>`;

      const htmlText = `<meta charset='utf-8'><h1>✨ <strong>코드리뷰 요약</strong></h1>
<blockquote>
<p>${this.escapeHtml(summaryText)}</p>
</blockquote>
<!-- notionvc: ${this.generateNotionId()} -->`;

      return { plainText, htmlText };
    }
  }

  // HTML 이스케이프
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Notion 스타일 ID 생성 (UUID v4 형식)
  generateNotionId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// 팝업이 로드되면 ReviewExtractor 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
  new ReviewExtractor();
});