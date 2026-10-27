# 속솜허지 말라 — 홍보 페이지

## 올릴 파일 (4개, 폴더 없음)

```
index.html
server.js
package.json
README.md
```

전부 같은 자리에 둡니다. 하위 폴더는 없습니다.

---

## 1. GitHub

1. github.com → 우측 상단 **+** → **New repository**
2. 이름 아무거나 (예: `soksom-book`), **Private** 선택
3. **Create repository**
4. 다음 화면의 **uploading an existing file** 링크 클릭
5. 파일 4개를 끌어다 놓기
6. 아래 **Commit changes** 클릭

---

## 2. Railway

1. railway.app → GitHub 계정으로 로그인
2. **New Project** → **Deploy from GitHub repo** → 위 저장소 선택
3. 2~3분 기다림
4. **Settings** → **Networking** → **Generate Domain**
5. 나온 주소를 열어 페이지가 뜨는지 확인

여기까지만 해도 홍보 페이지는 작동합니다.

---

## 3. 관리자 기능 켜기

**Variables** 탭에서 추가합니다.

| 변수명 | 값 |
|---|---|
| `ADMIN_KEY` | 직접 정한 긴 문자열 (필수) |
| `ANTHROPIC_API_KEY` | Anthropic API 키 (선택) |
| `OPENAI_API_KEY` | OpenAI API 키 (선택) |
| `PERPLEXITY_API_KEY` | Perplexity API 키 (선택) |
| `RUN_INTERVAL_HOURS` | `168` (주 1회, 선택) |

API 키가 없으면 AI 가시성 측정만 꺼지고 나머지는 정상입니다.

---

## 4. 주소 적고 다시 올리기

`index.html`에서 아래 줄을 찾습니다. (1075번째 줄 부근)

```javascript
const API='';
```

2단계에서 받은 주소를 넣습니다. **끝에 슬래시 금지.**

```javascript
const API='https://받은-주소.up.railway.app';
```

바로 위에 관리자 접근 코드도 있습니다. 바꾸고 싶으면 여기서.

```javascript
const PASS='tib2026';
```

고친 `index.html`을 GitHub에 다시 올리면 Railway가 자동으로 재배포합니다.

---

## 주소 목록

| 경로 | 내용 |
|---|---|
| `/` | 홍보 페이지 |
| `/#admin` | 관리자 (접근 코드 필요) |
| `/llms.txt` | AI용 요약 |
| `/robots.txt` | 수집 봇 설정 |

---

## 문제가 생기면

| 증상 | 확인 |
|---|---|
| 빌드 실패 | `package.json`이 최상단에 있는지 |
| 페이지 안 뜸 | `index.html`이 최상단에 있는지 |
| 관리자 숫자 0 | `const API` 주소, `ADMIN_KEY` |
