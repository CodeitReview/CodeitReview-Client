const getCodeByTurboFrame = (turboFrame) => {
  try {
    // 1) 코드 경로 추출 - 더 포괄적인 선택자 사용
    const codePathElement = turboFrame.querySelector('a.text-mono.text-small.Link--primary.wb-break-all.mr-2');
    const codePath = codePathElement ? codePathElement.textContent.trim() : '';
    
    
    // 2) 코드 리스트 추출 - 더 포괄적인 선택자 사용
    const codeElements = turboFrame.querySelectorAll('td.blob-code span.blob-code-inner');
    const codeList = [];
    
    codeElements.forEach((codeElement, index) => {
      const codeText = codeElement.textContent.trim();
      // 빈 줄이나 단순히 <br>만 있는 경우 제외
      if (codeText && codeText !== '' && codeText !== '\n' && !codeText.match(/^[\s\n]*$/)) {
        codeList.push({
          lineNumber: index + 1,
          code: codeText,
          rawHTML: codeElement.innerHTML
        });
      }
    });
    
    // 3) 리뷰어 정보 추출 - 더 정확한 선택자
    const reviewerElement = turboFrame.querySelector('strong a.author.Link--primary.text-bold');
    const reviewerName = reviewerElement ? reviewerElement.textContent.trim() : '';
    
    // 4) 리뷰 내용 추출 - 더 정확한 선택자
    const reviewContentElement = turboFrame.querySelector('.comment-body.markdown-body');
    const reviewContent = reviewContentElement ? reviewContentElement.textContent.trim() : '';
    
    // 5) 프로필 이미지 추출
    const profileImageElement = turboFrame.querySelector('img.avatar.circle');
    const profileImage = profileImageElement ? profileImageElement.src : '';
    
    // 최종 결과 객체 생성
    const result = {
      success: true,
      codePath: codePath,
      codeList: codeList,
      codeCount: codeList.length,
      reviewerName: reviewerName,
      reviewContent: reviewContent,
      profileImage: profileImage
    };
    
    return result;
    
  } catch (error) {
    console.error('코드 추출 중 오류:', error);
    const errorResult = {
      success: false,
      error: error.message
    };
    
    return errorResult;
  }
};
