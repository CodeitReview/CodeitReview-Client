# 🔍 CodeitReview - GitHub 리뷰 추출기

> GitHub Pull Request의 리뷰를 추출하여 Notion에 복사할 수 있는 Chrome 확장 프로그램

[![Chrome Web Store](https://img.shields.io/badge/Chrome-Web%20Store-blue)](https://chrome.google.com/webstore)
[![Version](https://img.shields.io/badge/version-1.0.0-green)](https://github.com/CodeitReview/CodeitReview-Client)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

## ✨ 주요 기능

- **🚀 원클릭 추출**: GitHub PR 페이지에서 모든 리뷰를 한 번에 추출
- **🤖 AI 요약**: 서버 연동을 통한 스마트 리뷰 요약 생성
- **📝 코드 보존**: 코드 리뷰의 원본 들여쓰기 완벽 유지
- **📋 Notion 호환**: Plain Text + HTML 형식으로 클립보드 복사
- **🎨 직관적 UI**: 보라색 테마의 깔끔한 사용자 인터페이스

## 📖 사용법

### 1️⃣ 설치

Chrome 웹 스토어에서 "CodeitReview" 검색 후 설치

### 2️⃣ 리뷰 추출

1. GitHub Pull Request 페이지로 이동
2. 확장 프로그램 아이콘 클릭
3. **"📋 리뷰 추출하기"** 버튼 클릭
4. 추출 진행 상황 확인

### 3️⃣ Notion에 복사

1. 추출된 리뷰 목록 확인
2. **"📋 모든 리뷰 복사하기"** 버튼 클릭
3. Notion 페이지에 `Ctrl+V` (또는 `Cmd+V`)로 붙여넣기

## 📸 스크린샷

| 메인 화면                     | 추출 완료                       | Notion 결과                     |
| ----------------------------- | ------------------------------- | ------------------------------- |
| ![Main](docs/screenshot1.png) | ![Result](docs/screenshot2.png) | ![Notion](docs/screenshot3.png) |

## 🛠️ 개발자용 설치

### 로컬 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/CodeitReview/CodeitReview-Client.git
cd CodeitReview-Client

# Chrome 확장 프로그램 개발자 모드 설치
# 1. Chrome → 확장 프로그램 관리 (chrome://extensions/)
# 2. 개발자 모드 활성화
# 3. "압축해제된 확장 프로그램을 로드합니다" 클릭
# 4. 이 폴더 선택
```

### 배포용 빌드

```bash
# ZIP 파일 생성
zip -r codeit-review-extension.zip . -x ".git/*" ".DS_Store" "docs/*"
```

## 🏗️ 아키텍처

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   GitHub PR     │───▶│  Extension   │───▶│     Notion      │
│     Page        │    │   Popup      │    │    Document     │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────┐
                       │ AI Summary   │
                       │   Server     │
                       │(gyural.shop) │
                       └──────────────┘
```

## 📦 주요 구성 요소

| 파일                     | 역할                      |
| ------------------------ | ------------------------- |
| `manifest.json`          | Chrome 확장 프로그램 설정 |
| `popup.html/js`          | 메인 UI 및 로직           |
| `getReivewList.js`       | GitHub 페이지 파싱        |
| `getCodeByTurboFrame.js` | 코드 리뷰 추출            |

## 🔒 개인정보 보호

- ✅ **개인정보 수집 없음**: 이메일, 메시지 등 개인 정보 미수집
- ✅ **임시 처리**: 리뷰 데이터는 AI 요약 후 즉시 삭제
- ✅ **로컬 우선**: 대부분의 처리는 브라우저에서 진행
- ✅ **투명성**: 모든 소스코드 공개

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 📞 지원 및 문의

- **이슈 제보**: [GitHub Issues](https://github.com/CodeitReview/CodeitReview-Client/issues)
- **기능 요청**: [GitHub Discussions](https://github.com/CodeitReview/CodeitReview-Client/discussions)
- **이메일**: codeitreview@example.com

## 🚀 로드맵

- [ ] 다른 Git 플랫폼 지원 (GitLab, Bitbucket)
- [ ] 더 많은 문서 도구 지원 (Confluence, Slack)
- [ ] 커스텀 템플릿 기능
- [ ] 다국어 지원

---

<div align="center">

**⭐ 이 프로젝트가 도움이 되었다면 Star를 눌러주세요! ⭐**

Made with ❤️ by [CodeitReview Team](https://github.com/CodeitReview)

</div>
