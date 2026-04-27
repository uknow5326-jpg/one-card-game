const express = require("express");
const http = require("http");
const path = require("path");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 10000;
const ROOM_CODE_LENGTH = 6;
const ONE_CARD_DELAY = 2500;
const SUITS = [
  { id: "S", mark: "♠", name: "스페이드", color: "black" },
  { id: "H", mark: "♥", name: "하트", color: "red" },
  { id: "D", mark: "♦", name: "다이아", color: "red" },
  { id: "C", mark: "♣", name: "클로버", color: "black" },
];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const rooms = new Map();
const clients = new Map();

const app = express();
app.use(express.static(path.join(__dirname, "dist")));
app.get("*", (req, res) => res.sendFile(path.join(__dirname, "dist", "index.html")));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  socket.meta = { playerId: "", roomCode: "" };

  socket.on("message", (raw) => {
    try {
      const message = JSON.parse(raw);
      handleMessage(socket, message);
    } catch (error) {
      send(socket, "error", { message: "요청을 처리하지 못했습니다." });
    }
  });

  socket.on("close", () => {
    if (socket.meta.playerId) clients.delete(socket.meta.playerId);
    broadcastRoom(socket.meta.roomCode);
  });
});

server.listen(PORT, () => {
  console.log(`One Card server running on ${PORT}`);
});

function handleMessage(socket, message) {
  const { type, payload = {} } = message;
  if (type === "createRoom") return createRoom(socket, payload);
  if (type === "joinRoom") return joinRoom(socket, payload);
  if (type === "startGame") return startGame(socket);
  if (type === "playCard") return playCard(socket, payload.index);
  if (type === "drawCard") return drawCardAction(socket);
  if (type === "passTurn") return passTurn(socket);
  if (type === "declareOneCard") return declareOneCard(socket);
  if (type === "catchOneCard") return catchOneCard(socket);
  if (type === "chat") return chat(socket, payload.text);
}

function createRoom(socket, { playerId, nickname }) {
  const name = cleanName(nickname);
  if (!playerId || !name) return sendError(socket, "닉네임을 입력하세요.");
  const roomCode = createRoomCode();
  const player = makePlayer(playerId, name, 1);
  rooms.set(roomCode, {
    roomCode,
    hostId: playerId,
    players: [player],
    game: initialGame(),
    messages: [{ nickname: "시스템", body: `${name}님이 방을 만들었습니다.` }],
  });
  attach(socket, playerId, roomCode);
  send(socket, "joined", { roomCode });
  broadcastRoom(roomCode);
}

function joinRoom(socket, { playerId, nickname, roomCode }) {
  const code = String(roomCode || "").trim().toUpperCase();
  const name = cleanName(nickname);
  const room = rooms.get(code);
  if (!playerId || !name) return sendError(socket, "닉네임을 입력하세요.");
  if (!room) return sendError(socket, "초대코드에 해당하는 방이 없습니다.");

  const existing = room.players.find((player) => player.id === playerId);
  if (!existing && room.players.length >= 4) return sendError(socket, "이 방은 이미 4명이 입장했습니다.");
  if (room.players.some((player) => player.nickname === name && player.id !== playerId)) {
    return sendError(socket, "같은 방에서 이미 사용 중인 닉네임입니다.");
  }

  if (existing) {
    existing.nickname = name;
  } else {
    room.players.push(makePlayer(playerId, name, room.players.length + 1));
    addMessage(room, "시스템", `${name}님이 입장했습니다.`);
  }
  attach(socket, playerId, code);
  send(socket, "joined", { roomCode: code });
  broadcastRoom(code);
}

function startGame(socket) {
  const room = getSocketRoom(socket);
  if (!room) return;
  if (socket.meta.playerId !== room.hostId) return sendError(socket, "방장만 게임을 시작할 수 있습니다.");
  if (room.players.length < 3) return sendError(socket, "3명 이상 모이면 게임을 시작할 수 있습니다.");

  const game = initialGame();
  game.started = true;
  game.deck = createDeck();
  game.log = ["원카드 게임을 시작했습니다."];
  room.players.forEach((player) => { player.hand = []; });
  for (let i = 0; i < 7; i += 1) {
    room.players.forEach((player) => player.hand.push(game.deck.pop()));
  }
  let firstCard = game.deck.pop();
  while (["A", "2", "K"].includes(firstCard.rank)) {
    game.deck.unshift(firstCard);
    firstCard = game.deck.pop();
  }
  game.discard = [firstCard];
  game.status = `현재 턴: ${room.players[0].nickname}`;
  room.game = game;
  addLog(room, `첫 카드는 ${firstCard.label}입니다.`);
  broadcastRoom(room.roomCode);
}

function playCard(socket, index) {
  const room = getSocketRoom(socket);
  if (!room || !isMyTurn(room, socket.meta.playerId)) return;
  const player = getPlayer(room, socket.meta.playerId);
  const card = player.hand[index];
  if (!card || !canPlay(room, card)) return sendError(socket, "낼 수 없는 카드입니다.");

  player.hand.splice(index, 1);
  room.game.discard.push(card);
  addLog(room, `${player.nickname}님이 ${card.label}을 냈습니다.`);

  if (player.hand.length === 0) {
    room.game.started = false;
    room.game.oneCard = null;
    room.game.status = `${player.nickname}님 승리`;
    addLog(room, `${player.nickname}님이 승리했습니다.`);
    return broadcastRoom(room.roomCode);
  }

  updateOneCardAfterAction(room, player);
  applySpecialCard(room, card);
  moveTurn(room);
  room.game.status = `현재 턴: ${currentPlayer(room).nickname}`;
  broadcastRoom(room.roomCode);
}

function drawCardAction(socket) {
  const room = getSocketRoom(socket);
  if (!room || !isMyTurn(room, socket.meta.playerId)) return;
  const player = getPlayer(room, socket.meta.playerId);
  drawCards(room, player.id, 1);
  addLog(room, `${player.nickname}님이 카드 1장을 뽑았습니다.`);
  const drawn = player.hand.at(-1);
  if (!drawn || !canPlay(room, drawn)) {
    moveTurn(room);
    room.game.status = `현재 턴: ${currentPlayer(room).nickname}`;
  } else {
    room.game.status = `${drawn.label} 카드를 뽑았습니다. 낼 수 있으면 내세요.`;
  }
  broadcastRoom(room.roomCode);
}

function passTurn(socket) {
  const room = getSocketRoom(socket);
  if (!room || !isMyTurn(room, socket.meta.playerId)) return;
  const player = getPlayer(room, socket.meta.playerId);
  moveTurn(room);
  room.game.status = `현재 턴: ${currentPlayer(room).nickname}`;
  addLog(room, `${player.nickname}님이 턴을 넘겼습니다.`);
  broadcastRoom(room.roomCode);
}

function declareOneCard(socket) {
  const room = getSocketRoom(socket);
  const player = getPlayer(room, socket.meta.playerId);
  if (!room || !player || player.hand.length !== 1 || room.game.oneCard?.playerId !== player.id || room.game.oneCard.declared) return;
  room.game.oneCard = { playerId: player.id, declared: true, catchableAt: null };
  room.game.status = `${player.nickname}님이 원카드를 선언했습니다.`;
  addLog(room, `${player.nickname}님이 원카드를 선언했습니다.`);
  broadcastRoom(room.roomCode);
}

function catchOneCard(socket) {
  const room = getSocketRoom(socket);
  if (!room || !isCatchable(room)) return;
  const target = getPlayer(room, room.game.oneCard.playerId);
  if (!target || target.id === socket.meta.playerId) return;
  drawCards(room, target.id, 2);
  room.game.oneCard = null;
  room.game.status = `${target.nickname}님 원카드 미선언 → 카드 2장 추가`;
  addLog(room, `${target.nickname}님이 원카드 미선언 → 카드 2장 추가`);
  broadcastRoom(room.roomCode);
}

function chat(socket, text) {
  const room = getSocketRoom(socket);
  const player = getPlayer(room, socket.meta.playerId);
  const body = String(text || "").trim();
  if (!room || !player || !body) return;
  addMessage(room, player.nickname, body.slice(0, 300));
  broadcastRoom(room.roomCode);
}

function attach(socket, playerId, roomCode) {
  socket.meta = { playerId, roomCode };
  clients.set(playerId, socket);
}

function broadcastRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  for (const player of room.players) {
    const socket = clients.get(player.id);
    if (socket?.readyState === socket.OPEN) {
      send(socket, "room", {
        room: snapshotFor(room, player.id),
        onlineIds: room.players.filter((item) => clients.has(item.id)).map((item) => item.id),
      });
    }
  }
}

function snapshotFor(room, viewerId) {
  return {
    ...room,
    players: room.players.map((player) => ({
      ...player,
      hand: player.id === viewerId ? player.hand : [],
      handCount: player.hand.length,
    })),
  };
}

function initialGame() {
  return {
    started: false,
    deck: [],
    discard: [],
    currentPlayerIndex: 0,
    direction: 1,
    oneCard: null,
    log: ["대기실이 생성되었습니다."],
    status: "3명 이상 모이면 방장이 게임을 시작할 수 있습니다.",
  };
}

function makePlayer(id, nickname, slot) {
  return { id, nickname, slot, hand: [], joinedAt: new Date().toISOString() };
}

function createDeck() {
  return shuffle(SUITS.flatMap((suit) => RANKS.map((rank) => ({
    suit: suit.id,
    suitMark: suit.mark,
    suitName: suit.name,
    rank,
    color: suit.color,
    label: `${suit.mark}${rank}`,
  }))));
}

function shuffle(cards) {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createRoomCode() {
  let code = "";
  do {
    code = Math.random().toString(36).slice(2, 2 + ROOM_CODE_LENGTH).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function applySpecialCard(room, card) {
  if (card.rank === "2") {
    const target = nextPlayer(room);
    drawCards(room, target.id, 2);
    addLog(room, `${target.nickname}님이 벌칙 카드 2장을 받았습니다.`);
  }
  if (card.rank === "A") {
    moveTurn(room);
    addLog(room, "A 효과: 다음 플레이어를 건너뜁니다.");
  }
  if (card.rank === "K") {
    room.game.direction *= -1;
    addLog(room, "K 효과: 진행 방향이 바뀌었습니다.");
  }
}

function updateOneCardAfterAction(room, player) {
  if (player.hand.length === 1) {
    room.game.oneCard = { playerId: player.id, declared: false, catchableAt: Date.now() + ONE_CARD_DELAY };
    addLog(room, `${player.nickname}님이 원카드 선언 가능 상태입니다.`);
    return;
  }
  if (room.game.oneCard?.playerId === player.id) room.game.oneCard = null;
}

function drawCards(room, playerId, count) {
  const player = getPlayer(room, playerId);
  for (let i = 0; i < count; i += 1) {
    if (!room.game.deck.length) refillDeck(room);
    if (room.game.deck.length) player.hand.push(room.game.deck.pop());
  }
  if (room.game.oneCard?.playerId === playerId && player.hand.length !== 1) room.game.oneCard = null;
}

function refillDeck(room) {
  if (room.game.discard.length <= 1) return;
  const top = room.game.discard.pop();
  room.game.deck = shuffle(room.game.discard);
  room.game.discard = [top];
}

function canPlay(room, card) {
  const top = topCard(room);
  return !top || card.rank === top.rank || card.suit === top.suit;
}

function moveTurn(room) {
  const total = room.players.length;
  room.game.currentPlayerIndex = (room.game.currentPlayerIndex + room.game.direction + total) % total;
}

function nextPlayer(room) {
  const total = room.players.length;
  const index = (room.game.currentPlayerIndex + room.game.direction + total) % total;
  return room.players[index];
}

function currentPlayer(room) {
  return room.players[room.game.currentPlayerIndex];
}

function topCard(room) {
  return room.game.discard[room.game.discard.length - 1];
}

function getSocketRoom(socket) {
  return rooms.get(socket.meta.roomCode);
}

function getPlayer(room, playerId) {
  return room?.players.find((player) => player.id === playerId);
}

function isMyTurn(room, playerId) {
  return room.game.started && currentPlayer(room)?.id === playerId;
}

function isCatchable(room) {
  const oneCard = room.game.oneCard;
  return Boolean(oneCard && !oneCard.declared && oneCard.catchableAt && Date.now() >= oneCard.catchableAt);
}

function addLog(room, message) {
  room.game.log = [message, ...(room.game.log || [])].slice(0, 12);
}

function addMessage(room, nickname, body) {
  room.messages = [...(room.messages || []), { nickname, body, createdAt: new Date().toISOString() }].slice(-30);
}

function cleanName(value) {
  return String(value || "").trim().slice(0, 16);
}

function send(socket, type, payload) {
  socket.send(JSON.stringify({ type, payload }));
}

function sendError(socket, message) {
  send(socket, "error", { message });
}
