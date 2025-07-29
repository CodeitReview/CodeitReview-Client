class ReviewExtractor {
  constructor() {
    this.reviewData = [];
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
          <button class="copy-button" data-index="${index}">복사</button>
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
      const formattedReview = this.formatReviewForCopy(review);
      
      await navigator.clipboard.writeText(formattedReview);
      
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
      const allReviewsText = this.reviewData
        .map(review => this.formatReviewForCopy(review))
        .join('\n\n---\n\n');

      await navigator.clipboard.writeText(allReviewsText);
      
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
    let formatted = `👤 리뷰어: ${review.reviewerName || '알 수 없음'}\n`;
    formatted += `📝 타입: ${review.withCodeField ? '코드 리뷰' : '일반 리뷰'}\n`;
    
    if (review.withCodeField && review.codePath) {
      formatted += `📁 파일: ${review.codePath}\n`;
    }
    
    if (review.withCodeField && review.codeCount > 0) {
      formatted += `🔢 코드 변경사항: ${review.codeCount}개\n`;
    }
    
    if (review.reviewContent) {
      formatted += `💬 내용: ${review.reviewContent}\n`;
    }
    
    if (review.withCodeField && review.codeList && review.codeList.length > 0) {
      formatted += `\n📋 코드 상세:\n`;
      review.codeList.forEach((code, index) => {
        formatted += `${index + 1}. ${code}\n`;
      });
    }
    
    return formatted;
  }
}

// 팝업이 로드되면 ReviewExtractor 인스턴스 생성
document.addEventListener('DOMContentLoaded', () => {
  new ReviewExtractor();
});