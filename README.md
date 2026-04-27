# 원카드 멀티플레이 Render 배포

Supabase 없이 Render Web Service 하나로 프론트엔드와 실시간 WebSocket 서버를 같이 실행하는 원카드 게임입니다.

## 구조

```text
.
├─ index.html
├─ package.json
├─ server.js
├─ README.md
└─ src
   ├─ main.js
   └─ styles.css
```

## 실행 방식

- `npm run build`: Vite 프론트엔드를 `dist` 폴더로 빌드
- `npm start`: `server.js`가 `dist`를 서비스하고 WebSocket 방 서버를 실행
- Render 배포 시 별도 DB 없이 서버 메모리에 방 상태를 저장합니다.

주의: 무료 Render 서버가 재시작되거나 잠들면 진행 중인 방은 초기화됩니다. 처음 배포/테스트용으로는 충분하지만, 장기 보존이 필요하면 나중에 PostgreSQL 또는 Redis를 붙이면 됩니다.

## 로컬 테스트

```bash
npm install
npm run build
npm start
```

브라우저에서 접속:

```text
http://localhost:10000
```

## Render 배포 방법

1. GitHub에 이 프로젝트를 올립니다.
2. https://render.com 에 가입/로그인합니다.
3. 오른쪽 위 `New +`를 누릅니다.
4. `Web Service`를 선택합니다.
5. GitHub 저장소를 연결합니다.
6. 설정을 아래처럼 입력합니다.

```text
Name: one-card-game
Runtime: Node
Branch: main
Build Command: npm install && npm run build
Start Command: npm start
```

7. Instance Type은 처음에는 `Free`로 선택해도 됩니다.
8. `Create Web Service`를 누릅니다.
9. 배포가 끝나면 Render가 사이트 주소를 만들어줍니다.

예:

```text
https://one-card-game.onrender.com
```

## 게임 테스트

1. 배포된 Render 주소로 접속합니다.
2. 닉네임을 입력합니다.
3. `방 만들기`를 누릅니다.
4. 화면에 표시되는 초대코드를 확인합니다.
5. 다른 브라우저, 시크릿 창, 또는 다른 기기에서 같은 주소로 접속합니다.
6. 다른 닉네임을 입력합니다.
7. 초대코드를 입력하고 `방 입장`을 누릅니다.
8. 3명 이상 모이면 방장이 `게임 시작`을 누릅니다.

## 구현된 기능

- 3~4인 원카드 멀티플레이
- 초대코드 방 생성/입장
- 중복 닉네임 방지
- 방장만 게임 시작
- 실시간 카드/턴/덱/기록 동기화
- 실시간 채팅
- 원카드 선언
- 원카드 잡기
- 미선언 벌칙 카드 2장
- 카드 기호 `♥ ♠ ♦ ♣`
- 하트/다이아 빨간색, 스페이드/클로버 검정색
