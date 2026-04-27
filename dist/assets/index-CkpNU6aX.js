(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))r(a);new MutationObserver(a=>{for(const s of a)if(s.type==="childList")for(const u of s.addedNodes)u.tagName==="LINK"&&u.rel==="modulepreload"&&r(u)}).observe(document,{childList:!0,subtree:!0});function o(a){const s={};return a.integrity&&(s.integrity=a.integrity),a.referrerPolicy&&(s.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?s.credentials="include":a.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function r(a){if(a.ep)return;a.ep=!0;const s=o(a);fetch(a.href,s)}})();const g="ABCDEFGHIJKLMNOP".split(""),P=14,y="one-card-player-id",$="one-card-nickname",A=`${location.protocol==="https:"?"wss":"ws"}://${location.host}`,n={selectedCell:"A1",playerId:O(),nickname:localStorage.getItem($)||"",roomCodeInput:"",roomCode:"",room:null,onlineIds:new Set,status:"닉네임을 입력한 뒤 방을 만들거나 초대코드로 입장하세요.",socket:null,connected:!1};h();setInterval(()=>b(),1e3);function O(){let t=localStorage.getItem(y);return t||(t=crypto.randomUUID(),localStorage.setItem(y,t)),t}function h(){n.socket=new WebSocket(A),n.socket.addEventListener("open",()=>{n.connected=!0,d("서버에 연결되었습니다.")}),n.socket.addEventListener("close",()=>{n.connected=!1,d("서버 연결이 끊겼습니다. 잠시 후 다시 시도합니다."),setTimeout(h,1500)}),n.socket.addEventListener("message",t=>{const e=JSON.parse(t.data);e.type==="room"&&(n.room=e.payload.room,n.onlineIds=new Set(e.payload.onlineIds||[]),b()),e.type==="joined"&&(n.roomCode=e.payload.roomCode,n.roomCodeInput=e.payload.roomCode,d(`${e.payload.roomCode} 방에 연결되었습니다.`)),e.type==="error"&&d(e.payload.message)})}function l(t,e={}){if(!n.connected){d("서버에 아직 연결되지 않았습니다.");return}n.socket.send(JSON.stringify({type:t,payload:e}))}function v(){const t=n.nickname.trim();return t?(localStorage.setItem($,t),t):(d("닉네임을 먼저 입력하세요."),"")}function j(){const t=v();t&&l("createRoom",{playerId:n.playerId,nickname:t})}function q(){const t=v(),e=n.roomCodeInput.trim().toUpperCase();if(!t||!e){d("닉네임과 초대코드를 모두 입력하세요.");return}l("joinRoom",{playerId:n.playerId,nickname:t,roomCode:e})}function N(){l("startGame")}function B(t){l("playCard",{index:t})}function M(){l("drawCard")}function R(){l("passTurn")}function D(){l("declareOneCard")}function T(){l("catchOneCard")}function U(t){t.trim()&&l("chat",{text:t.trim()})}function C(){var t,e;return(e=(t=n.room)==null?void 0:t.players)==null?void 0:e.find(o=>o.id===n.playerId)}function m(){var t,e;return(e=(t=n.room)==null?void 0:t.players)==null?void 0:e[n.room.game.currentPlayerIndex]}function I(){var t,e,o;return(o=(e=(t=n.room)==null?void 0:t.game)==null?void 0:e.discard)==null?void 0:o[n.room.game.discard.length-1]}function x(){var t;return((t=n.room)==null?void 0:t.hostId)===n.playerId}function p(){var t,e,o;return!!((e=(t=n.room)==null?void 0:t.game)!=null&&e.started&&((o=m())==null?void 0:o.id)===n.playerId)}function H(t){const e=I();return!e||t.rank===e.rank||t.suit===e.suit}function k(){var e,o;const t=(o=(e=n.room)==null?void 0:e.game)==null?void 0:o.oneCard;return!!(t&&!t.declared&&t.catchableAt&&Date.now()>=t.catchableAt)}function S(){var e,o,r;const t=C();return!!((o=(e=n.room)==null?void 0:e.game)!=null&&o.started&&(t==null?void 0:t.hand.length)===1&&((r=n.room.game.oneCard)==null?void 0:r.playerId)===n.playerId&&!n.room.game.oneCard.declared)}function E(){var t,e,o;return!!((e=(t=n.room)==null?void 0:t.game)!=null&&e.started&&((o=n.room.game.oneCard)==null?void 0:o.playerId)!==n.playerId&&k())}function L(){var e,o;const t=(o=(e=n.room)==null?void 0:e.players)==null?void 0:o.find(r=>{var a,s,u;return r.id===((u=(s=(a=n.room)==null?void 0:a.game)==null?void 0:s.oneCard)==null?void 0:u.playerId)});return t?n.room.game.oneCard.declared?`${t.nickname} 선언 완료`:k()?`${t.nickname} 미선언`:`${t.nickname} 선언 대기`:"-"}function d(t){n.status=t,b()}function K(){var t;return n.room?`${n.status} / 현재 턴: ${((t=m())==null?void 0:t.nickname)||"-"} / 원카드 대상: ${L()}`:n.status}function b(){var t,e;document.querySelector("#app").innerHTML=`
    <main class="workbook">
      <header class="title-bar">
        <div class="app-mark">1C</div>
        <div class="title-text">원카드 멀티플레이 통합 문서</div>
        <div class="window-actions"><button>-</button><button>[]</button><button>x</button></div>
      </header>
      <nav class="menu-tabs">${["파일","홈","삽입","레이아웃","규칙","데이터","검토","보기"].map((o,r)=>`<button class="${r===1?"active":""}">${o}</button>`).join("")}</nav>
      <section class="ribbon">
        ${f("방",['<button type="button" data-action="create-room">방 만들기</button>','<button type="button" data-action="join-room">방 입장</button>',`<button type="button" data-action="start" ${x()&&((t=n.room)==null?void 0:t.players.length)>=3&&!((e=n.room)!=null&&e.game.started)?"":"disabled"}>게임 시작</button>`])}
        ${f("조작",[`<button type="button" data-action="draw" ${p()?"":"disabled"}>카드 뽑기</button>`,`<button type="button" data-action="pass" ${p()?"":"disabled"}>턴 넘기기</button>`,`<button type="button" data-action="declare-one-card" ${S()?"":"disabled"}>원카드!</button>`,`<button type="button" data-action="catch-one-card" ${E()?"":"disabled"}>원카드 잡기</button>`])}
        ${f("안내",['<span class="ribbon-note">Render 서버 하나로 방과 실시간 동기화를 처리합니다.</span>','<span class="ribbon-note">3~4명이 같은 초대코드로 입장하세요.</span>'])}
      </section>
      <section class="formula-row">
        <div class="name-box">${n.selectedCell}</div>
        <div class="formula-box">${c(K())}</div>
      </section>
      <section class="sheet-wrap"><div class="sheet">${_()}</div></section>
      <footer class="sheet-tabs"><button class="active">원카드_방</button><button>플레이어</button><button>기록</button><button>채팅</button><button>+ 새 시트</button></footer>
    </main>
  `,et()}function f(t,e){return`<div class="ribbon-group"><div class="ribbon-actions">${e.join("")}</div><span>${t}</span></div>`}function _(){const t=['<div class="corner"></div>'];g.forEach(e=>t.push(`<div class="col-header">${e}</div>`));for(let e=1;e<=P;e+=1)t.push(`<div class="row-header">${e}</div>`),g.forEach(o=>{const r=`${o}${e}`;t.push(`<div class="cell ${r===n.selectedCell?"selected":""}" data-cell="${r}">${F(r)}</div>`)});return t.join("")}function F(t){return{B2:G(),F2:J(),I2:W(),B4:Y(),E4:z(),H4:Q(),B8:V(),B12:Z(),E8:X(),L4:tt()}[t]||""}function G(){var t,e;return`
    <section class="cell-panel room-panel">
      <strong>방 설정</strong>
      <input id="nicknameInput" value="${c(n.nickname)}" placeholder="닉네임" />
      <input id="roomCodeInput" value="${c(n.roomCodeInput)}" placeholder="초대코드" />
      <span>현재 방: ${c(n.roomCode||"-")}</span>
      <span>방장: ${c(((e=(t=n.room)==null?void 0:t.players.find(o=>o.id===n.room.hostId))==null?void 0:e.nickname)||"-")}</span>
      <span>연결: ${n.connected?"온라인":"연결 중"}</span>
    </section>
  `}function J(){var t,e;return`
    <section class="cell-panel">
      <strong>턴 상태</strong>
      <span>현재 턴: ${c(((t=m())==null?void 0:t.nickname)||"-")}</span>
      <span>방향: ${((e=n.room)==null?void 0:e.game.direction)===-1?"역방향":"정방향"}</span>
      <span>원카드 대상: ${c(L())}</span>
      <span>접속자: ${n.onlineIds.size||"-"}</span>
    </section>
  `}function W(){return`
    <section class="cell-panel">
      <strong>초보자 안내</strong>
      <span>맨 위 카드와 숫자 또는 문양이 같으면 낼 수 있습니다.</span>
      <span>카드가 1장 남으면 원카드를 선언하세요.</span>
      <span>상대가 미선언 상태이면 원카드 잡기를 누를 수 있습니다.</span>
    </section>
  `}function Y(){var e;const t=((e=n.room)==null?void 0:e.players)||[];return`
    <section class="players-grid">
      ${t.length?t.map(o=>{var r,a,s;return`
        <div class="player-row ${((r=m())==null?void 0:r.id)===o.id&&((a=n.room)!=null&&a.game.started)?"current":""}">
          <strong>${c(o.nickname)}${((s=n.room)==null?void 0:s.hostId)===o.id?" (방장)":""}</strong>
          <span>${n.onlineIds.has(o.id)?"접속 중":"오프라인"} / 카드 ${o.handCount??o.hand.length}장</span>
        </div>
      `}).join(""):'<div class="player-row"><strong>대기 중</strong><span>방을 만들거나 입장하세요.</span></div>'}
    </section>
  `}function z(){const t=I();return`
    <section class="table-panel">
      <strong>중앙 카드</strong>
      <div class="table-card">${t?w(t,null,"large"):"<span>카드 없음</span>"}</div>
      <span>같은 숫자 또는 같은 문양을 내세요.</span>
    </section>
  `}function Q(){var t,e,o;return`
    <section class="cell-panel">
      <strong>덱 정보</strong>
      <span>뽑을 카드: ${((t=n.room)==null?void 0:t.game.deck.length)||0}장</span>
      <span>버린 카드: ${((e=n.room)==null?void 0:e.game.discard.length)||0}장</span>
      <span>게임 상태: ${(o=n.room)!=null&&o.game.started?"진행 중":"대기 중"}</span>
    </section>
  `}function V(){return`
    <section class="cell-panel controls-panel">
      <strong>조작</strong>
      <button type="button" data-action="draw" ${p()?"":"disabled"}>카드 뽑기</button>
      <button type="button" data-action="pass" ${p()?"":"disabled"}>턴 넘기기</button>
      <button type="button" data-action="declare-one-card" ${S()?"":"disabled"}>원카드!</button>
      <button type="button" data-action="catch-one-card" ${E()?"":"disabled"}>원카드 잡기</button>
      <span>내 턴일 때만 카드 내기/뽑기/턴 넘기기가 가능합니다.</span>
    </section>
  `}function X(){const t=C();return`
    <section class="hand-panel">
      <strong>내 카드</strong>
      <div class="cards">${t!=null&&t.hand.length?t.hand.map((e,o)=>w(e,o)).join(""):"<span>아직 카드가 없습니다.</span>"}</div>
    </section>
  `}function Z(){var e;return`<section class="log-panel"><strong>기록</strong><ol>${(((e=n.room)==null?void 0:e.game.log)||[]).map(o=>`<li>${c(o)}</li>`).join("")}</ol></section>`}function tt(){var e;return`
    <section class="chat-panel">
      <strong>채팅</strong>
      <div class="chat-messages">
        ${(((e=n.room)==null?void 0:e.messages)||[]).map(o=>`<div class="chat-message"><b>${c(o.nickname)}</b><span>${c(o.body)}</span></div>`).join("")}
      </div>
      <form class="chat-form" data-chat-form>
        <input id="chatInput" type="text" placeholder="메시지 입력" autocomplete="off" ${n.room?"":"disabled"} />
        <button type="submit" ${n.room?"":"disabled"}>전송</button>
      </form>
    </section>
  `}function w(t,e,o=""){const r=e===null||!p()?"disabled":"",a=e!==null&&H(t)?"playable":"",s=e===null?"":`data-card="${e}"`;return`<button type="button" class="card ${t.color} ${o} ${a}" ${s} ${r}><span>${t.suitMark}</span><b>${t.rank}</b></button>`}function et(){const t=document.querySelector("#nicknameInput"),e=document.querySelector("#roomCodeInput");t&&t.addEventListener("input",o=>{n.nickname=o.target.value}),e&&e.addEventListener("input",o=>{n.roomCodeInput=o.target.value.toUpperCase()}),document.querySelectorAll("[data-cell]").forEach(o=>{o.addEventListener("click",r=>{r.target.closest("button, input")||(n.selectedCell=o.dataset.cell,document.querySelector(".name-box").textContent=n.selectedCell,document.querySelectorAll(".cell").forEach(a=>a.classList.remove("selected")),o.classList.add("selected"))})}),i("create-room",j),i("join-room",q),i("start",N),i("draw",M),i("pass",R),i("declare-one-card",D),i("catch-one-card",T),document.querySelectorAll("[data-card]").forEach(o=>o.addEventListener("click",()=>B(Number(o.dataset.card)))),document.querySelectorAll("[data-chat-form]").forEach(o=>{o.addEventListener("submit",r=>{r.preventDefault();const a=o.querySelector("#chatInput");U(a.value),a.value=""})})}function i(t,e){document.querySelectorAll(`[data-action='${t}']`).forEach(o=>o.addEventListener("click",e))}function c(t){return String(t??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;")}b();
