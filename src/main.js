const COLUMNS = "ABCDEFGHIJKLMNOP".split("");
const ROWS = 14;
const PLAYER_ID_KEY = "one-card-player-id";
const NICKNAME_KEY = "one-card-nickname";
const WS_URL = import.meta.env.VITE_WS_URL || `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`;

const state = {
  selectedCell: "A1",
  playerId: getPlayerId(),
  nickname: localStorage.getItem(NICKNAME_KEY) || "",
  roomCodeInput: "",
  roomCode: "",
  room: null,
  onlineIds: new Set(),
  chatDraft: "",
  status: "닉네임을 입력한 뒤 방을 만들거나 초대코드로 입장하세요.",
  socket: null,
  connected: false,
};

connectSocket();
setInterval(() => {
  if (state.room?.game?.oneCard && !state.room.game.oneCard.declared) render();
}, 1000);

function getPlayerId() {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

function connectSocket() {
  state.socket = new WebSocket(WS_URL);
  state.socket.addEventListener("open", () => {
    state.connected = true;
    setStatus("서버에 연결되었습니다.");
  });
  state.socket.addEventListener("close", () => {
    state.connected = false;
    setStatus("서버 연결이 끊겼습니다. 잠시 후 다시 시도합니다.");
    setTimeout(connectSocket, 1500);
  });
  state.socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "room") {
      state.room = message.payload.room;
      state.onlineIds = new Set(message.payload.onlineIds || []);
      render();
    }
    if (message.type === "joined") {
      state.roomCode = message.payload.roomCode;
      state.roomCodeInput = message.payload.roomCode;
      setStatus(`${message.payload.roomCode} 방에 연결되었습니다.`);
    }
    if (message.type === "error") setStatus(message.payload.message);
  });
}

function send(type, payload = {}) {
  if (!state.connected) {
    setStatus("서버에 아직 연결되지 않았습니다.");
    return;
  }
  state.socket.send(JSON.stringify({ type, payload }));
}

function validateNickname() {
  const nickname = state.nickname.trim();
  if (!nickname) {
    setStatus("닉네임을 먼저 입력하세요.");
    return "";
  }
  localStorage.setItem(NICKNAME_KEY, nickname);
  return nickname;
}

function createRoom() {
  const nickname = validateNickname();
  if (!nickname) return;
  send("createRoom", { playerId: state.playerId, nickname });
}

function joinRoom() {
  const nickname = validateNickname();
  const roomCode = state.roomCodeInput.trim().toUpperCase();
  if (!nickname || !roomCode) {
    setStatus("닉네임과 초대코드를 모두 입력하세요.");
    return;
  }
  send("joinRoom", { playerId: state.playerId, nickname, roomCode });
}

function startGame() {
  send("startGame");
}

function playCard(index) {
  send("playCard", { index });
}

function drawForMe() {
  send("drawCard");
}

function passTurn() {
  send("passTurn");
}

function declareOneCard() {
  send("declareOneCard");
}

function catchOneCard() {
  send("catchOneCard");
}

function sendChat(text) {
  if (!text.trim()) return;
  send("chat", { text: text.trim() });
}

function myPlayer() {
  return state.room?.players?.find((player) => player.id === state.playerId);
}

function currentPlayer() {
  return state.room?.players?.[state.room.game.currentPlayerIndex];
}

function topCard() {
  return state.room?.game?.discard?.[state.room.game.discard.length - 1];
}

function isHost() {
  return state.room?.hostId === state.playerId;
}

function isMyTurn() {
  return Boolean(state.room?.game?.started && currentPlayer()?.id === state.playerId);
}

function canPlay(card) {
  const top = topCard();
  return !top || card.rank === top.rank || card.suit === top.suit;
}

function isCatchable() {
  const oneCard = state.room?.game?.oneCard;
  return Boolean(oneCard && !oneCard.declared && oneCard.catchableAt && Date.now() >= oneCard.catchableAt);
}

function canDeclareOneCard() {
  const me = myPlayer();
  return Boolean(state.room?.game?.started && me?.hand.length === 1 && state.room.game.oneCard?.playerId === state.playerId && !state.room.game.oneCard.declared);
}

function canCatchOneCard() {
  return Boolean(state.room?.game?.started && state.room.game.oneCard?.playerId !== state.playerId && isCatchable());
}

function oneCardTargetLabel() {
  const player = state.room?.players?.find((item) => item.id === state.room?.game?.oneCard?.playerId);
  if (!player) return "-";
  if (state.room.game.oneCard.declared) return `${player.nickname} 선언 완료`;
  if (isCatchable()) return `${player.nickname} 미선언`;
  return `${player.nickname} 선언 대기`;
}

function setStatus(message) {
  state.status = message;
  render();
}

function roomStatus() {
  if (!state.room) return state.status;
  return `${state.status} / 현재 턴: ${currentPlayer()?.nickname || "-"} / 원카드 대상: ${oneCardTargetLabel()}`;
}

function render() {
  const focusState = captureFocusState();
  document.querySelector("#app").innerHTML = `
    <main class="workbook">
      <header class="title-bar">
        <div class="app-mark">1C</div>
        <div class="title-text">원카드 멀티플레이 통합 문서</div>
        <div class="window-actions"><button>-</button><button>[]</button><button>x</button></div>
      </header>
      <nav class="menu-tabs">${["파일", "홈", "삽입", "레이아웃", "규칙", "데이터", "검토", "보기"].map((tab, index) => `<button class="${index === 1 ? "active" : ""}">${tab}</button>`).join("")}</nav>
      <section class="ribbon">
        ${ribbonGroup("방", [
          `<button type="button" data-action="create-room">방 만들기</button>`,
          `<button type="button" data-action="join-room">방 입장</button>`,
          `<button type="button" data-action="start" ${isHost() && state.room?.players.length >= 3 && !state.room?.game.started ? "" : "disabled"}>게임 시작</button>`,
        ])}
        ${ribbonGroup("조작", [
          `<button type="button" data-action="draw" ${isMyTurn() ? "" : "disabled"}>카드 뽑기</button>`,
          `<button type="button" data-action="pass" ${isMyTurn() ? "" : "disabled"}>턴 넘기기</button>`,
          `<button type="button" data-action="declare-one-card" ${canDeclareOneCard() ? "" : "disabled"}>원카드!</button>`,
          `<button type="button" data-action="catch-one-card" ${canCatchOneCard() ? "" : "disabled"}>원카드 잡기</button>`,
        ])}
        ${ribbonGroup("안내", [
          `<span class="ribbon-note">Render 서버 하나로 방과 실시간 동기화를 처리합니다.</span>`,
          `<span class="ribbon-note">3~4명이 같은 초대코드로 입장하세요.</span>`,
        ])}
      </section>
      <section class="formula-row">
        <div class="name-box">${state.selectedCell}</div>
        <div class="formula-box">${escapeHtml(roomStatus())}</div>
      </section>
      <section class="sheet-wrap"><div class="sheet">${sheetCells()}</div></section>
      <footer class="sheet-tabs"><button class="active">원카드_방</button><button>플레이어</button><button>기록</button><button>채팅</button><button>+ 새 시트</button></footer>
    </main>
  `;
  bindEvents();
  restoreFocusState(focusState);
}

function captureFocusState() {
  const active = document.activeElement;
  if (!active?.matches?.("input, textarea")) return null;
  return {
    id: active.id,
    value: active.value,
    start: active.selectionStart,
    end: active.selectionEnd,
  };
}

function restoreFocusState(focusState) {
  if (!focusState?.id) return;
  const input = document.querySelector(`#${focusState.id}`);
  if (!input || input.disabled) return;
  input.value = focusState.value;
  if (focusState.id === "nicknameInput") state.nickname = focusState.value;
  if (focusState.id === "roomCodeInput") state.roomCodeInput = focusState.value;
  if (focusState.id === "chatInput") state.chatDraft = focusState.value;
  input.focus();
  try {
    input.setSelectionRange(focusState.start, focusState.end);
  } catch {
    input.setSelectionRange(input.value.length, input.value.length);
  }
}

function ribbonGroup(label, items) {
  return `<div class="ribbon-group"><div class="ribbon-actions">${items.join("")}</div><span>${label}</span></div>`;
}

function sheetCells() {
  const cells = [`<div class="corner"></div>`];
  COLUMNS.forEach((column) => cells.push(`<div class="col-header">${column}</div>`));
  for (let row = 1; row <= ROWS; row += 1) {
    cells.push(`<div class="row-header">${row}</div>`);
    COLUMNS.forEach((column) => {
      const id = `${column}${row}`;
      cells.push(`<div class="cell ${id === state.selectedCell ? "selected" : ""}" data-cell="${id}">${cellContent(id)}</div>`);
    });
  }
  return cells.join("");
}

function cellContent(id) {
  return ({
    B2: roomPanel(),
    F2: statusPanel(),
    I2: rulesPanel(),
    B4: playersPanel(),
    E4: tablePanel(),
    H4: deckPanel(),
    B8: controlsPanel(),
    B12: logPanel(),
    E8: handPanel(),
    L4: chatPanel(),
  })[id] || "";
}

function roomPanel() {
  return `
    <section class="cell-panel room-panel">
      <strong>방 설정</strong>
      <input id="nicknameInput" value="${escapeHtml(state.nickname)}" placeholder="닉네임" />
      <input id="roomCodeInput" value="${escapeHtml(state.roomCodeInput)}" placeholder="초대코드" />
      <span>현재 방: ${escapeHtml(state.roomCode || "-")}</span>
      <span>방장: ${escapeHtml(state.room?.players.find((player) => player.id === state.room.hostId)?.nickname || "-")}</span>
      <span>연결: ${state.connected ? "온라인" : "연결 중"}</span>
    </section>
  `;
}

function statusPanel() {
  return `
    <section class="cell-panel">
      <strong>턴 상태</strong>
      <span>현재 턴: ${escapeHtml(currentPlayer()?.nickname || "-")}</span>
      <span>방향: ${state.room?.game.direction === -1 ? "역방향" : "정방향"}</span>
      <span>원카드 대상: ${escapeHtml(oneCardTargetLabel())}</span>
      <span>접속자: ${state.onlineIds.size || "-"}</span>
    </section>
  `;
}

function rulesPanel() {
  return `
    <section class="cell-panel">
      <strong>초보자 안내</strong>
      <span>맨 위 카드와 숫자 또는 문양이 같으면 낼 수 있습니다.</span>
      <span>카드가 1장 남으면 원카드를 선언하세요.</span>
      <span>상대가 미선언 상태이면 원카드 잡기를 누를 수 있습니다.</span>
    </section>
  `;
}

function playersPanel() {
  const players = state.room?.players || [];
  return `
    <section class="players-grid">
      ${players.length ? players.map((player) => `
        <div class="player-row ${currentPlayer()?.id === player.id && state.room?.game.started ? "current" : ""}">
          <strong>${escapeHtml(player.nickname)}${state.room?.hostId === player.id ? " (방장)" : ""}</strong>
          <span>${state.onlineIds.has(player.id) ? "접속 중" : "오프라인"} / 카드 ${player.handCount ?? player.hand.length}장</span>
        </div>
      `).join("") : `<div class="player-row"><strong>대기 중</strong><span>방을 만들거나 입장하세요.</span></div>`}
    </section>
  `;
}

function tablePanel() {
  const card = topCard();
  return `
    <section class="table-panel">
      <strong>중앙 카드</strong>
      <div class="table-card">${card ? cardButton(card, null, "large") : "<span>카드 없음</span>"}</div>
      <span>같은 숫자 또는 같은 문양을 내세요.</span>
    </section>
  `;
}

function deckPanel() {
  return `
    <section class="cell-panel">
      <strong>덱 정보</strong>
      <span>뽑을 카드: ${state.room?.game.deck.length || 0}장</span>
      <span>버린 카드: ${state.room?.game.discard.length || 0}장</span>
      <span>게임 상태: ${state.room?.game.started ? "진행 중" : "대기 중"}</span>
    </section>
  `;
}

function controlsPanel() {
  return `
    <section class="cell-panel controls-panel">
      <strong>조작</strong>
      <button type="button" data-action="draw" ${isMyTurn() ? "" : "disabled"}>카드 뽑기</button>
      <button type="button" data-action="pass" ${isMyTurn() ? "" : "disabled"}>턴 넘기기</button>
      <button type="button" data-action="declare-one-card" ${canDeclareOneCard() ? "" : "disabled"}>원카드!</button>
      <button type="button" data-action="catch-one-card" ${canCatchOneCard() ? "" : "disabled"}>원카드 잡기</button>
      <span>내 턴일 때만 카드 내기/뽑기/턴 넘기기가 가능합니다.</span>
    </section>
  `;
}

function handPanel() {
  const me = myPlayer();
  return `
    <section class="hand-panel">
      <strong>내 카드</strong>
      <div class="cards">${me?.hand.length ? me.hand.map((card, index) => cardButton(card, index)).join("") : "<span>아직 카드가 없습니다.</span>"}</div>
    </section>
  `;
}

function logPanel() {
  const log = state.room?.game.log || [];
  return `<section class="log-panel"><strong>기록</strong><ol>${log.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>`;
}

function chatPanel() {
  const messages = state.room?.messages || [];
  return `
    <section class="chat-panel">
      <strong>채팅</strong>
      <div class="chat-messages">
        ${messages.map((message) => `<div class="chat-message"><b>${escapeHtml(message.nickname)}</b><span>${escapeHtml(message.body)}</span></div>`).join("")}
      </div>
      <form class="chat-form" data-chat-form>
        <input id="chatInput" type="text" value="${escapeHtml(state.chatDraft)}" placeholder="${state.room ? "메시지 입력" : "방 입장 후 채팅 가능"}" autocomplete="off" ${state.room ? "" : "disabled"} />
        <button type="submit" ${state.room ? "" : "disabled"}>전송</button>
      </form>
    </section>
  `;
}

function cardButton(card, index, size = "") {
  const disabled = index === null || !isMyTurn() ? "disabled" : "";
  const playable = index !== null && canPlay(card) ? "playable" : "";
  const data = index === null ? "" : `data-card="${index}"`;
  return `<button type="button" class="card ${card.color} ${size} ${playable}" ${data} ${disabled}><span>${card.suitMark}</span><b>${card.rank}</b></button>`;
}

function bindEvents() {
  const nicknameInput = document.querySelector("#nicknameInput");
  const roomCodeInput = document.querySelector("#roomCodeInput");
  if (nicknameInput) nicknameInput.addEventListener("input", (event) => { state.nickname = event.target.value; });
  if (roomCodeInput) roomCodeInput.addEventListener("input", (event) => { state.roomCodeInput = event.target.value.toUpperCase(); });
  const chatInput = document.querySelector("#chatInput");
  if (chatInput) chatInput.addEventListener("input", (event) => { state.chatDraft = event.target.value; });

  document.querySelectorAll("[data-cell]").forEach((cell) => {
    cell.addEventListener("click", (event) => {
      if (event.target.closest("button, input")) return;
      state.selectedCell = cell.dataset.cell;
      document.querySelector(".name-box").textContent = state.selectedCell;
      document.querySelectorAll(".cell").forEach((item) => item.classList.remove("selected"));
      cell.classList.add("selected");
    });
  });

  bindAction("create-room", createRoom);
  bindAction("join-room", joinRoom);
  bindAction("start", startGame);
  bindAction("draw", drawForMe);
  bindAction("pass", passTurn);
  bindAction("declare-one-card", declareOneCard);
  bindAction("catch-one-card", catchOneCard);
  document.querySelectorAll("[data-card]").forEach((button) => button.addEventListener("click", () => playCard(Number(button.dataset.card))));
  document.querySelectorAll("[data-chat-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = form.querySelector("#chatInput");
      sendChat(state.chatDraft || input.value);
      state.chatDraft = "";
      input.value = "";
    });
  });
}

function bindAction(action, handler) {
  document.querySelectorAll(`[data-action='${action}']`).forEach((button) => button.addEventListener("click", handler));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

render();
