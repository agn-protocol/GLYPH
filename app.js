// ─── ХРАНИЛИЩЕ ───────────────────────────────────────────────────────────────

var DB = {
  s: function(k, v) { try { localStorage.setItem('g_' + k, JSON.stringify(v)); } catch(e) {} },
  l: function(k, d) { try { var v = localStorage.getItem('g_' + k); return v !== null ? JSON.parse(v) : d; } catch(e) { return d; } }
};

// ─── ОБЩИЙ РЕЕСТР ПОЛЬЗОВАТЕЛЕЙ ──────────────────────────────────────────────

var USERS = DB.l('all_users', [
  { id:'demo1', email:'wolf@glyph.app',  glyphs:['волк','луна','огонь'] },
  { id:'demo2', email:'bird@glyph.app',  glyphs:['птица','стрела','волна'] },
  { id:'demo3', email:'root@glyph.app',  glyphs:['корень','земля','туман'] },
]);

// ─── СОСТОЯНИЕ ───────────────────────────────────────────────────────────────

var S = {
  user:      DB.l('user', null),
  myG:       DB.l('myG', []),
  contacts:  DB.l('contacts', []),
  chats:     DB.l('chats', {}),
  feed:      DB.l('feed', [
    { id:1, who:['гора','глаз','земля'], time:'сегодня 14:32', glyphs:['звезда','земля','огонь'], likes:5 },
    { id:2, who:['вода','звезда'],       time:'вчера 22:07',   glyphs:['луна','путь','вода'],     likes:12 },
    { id:3, who:['спираль','тень'],      time:'вчера 18:15',   glyphs:['эхо','граница'],          likes:3 },
  ]),
  notifs: DB.l('notifs', [
    { id:1, type:'reply', read:false, time:'2 мин', glyphs:['огонь'],       reply:['луна','волк'] },
    { id:2, type:'match', read:false, time:'1 ч',   glyphs:['гора','глаз'], match:['глаз'] },
    { id:3, type:'added', read:true,  time:'вчера', glyphs:['волна','спираль'] },
  ]),
  prev:        'feed',
  chatWith:    null,
  pending:     [],
  feedPending: [],
  loginMode:   false,
};

// ─── ИНИЦИАЛИЗАЦИЯ ───────────────────────────────────────────────────────────

function init() {
  if (S.user) showMain();
  else switchScreen('reg');
}

function showMain() {
  document.getElementById('bnav').style.display = 'flex';
  switchTab('feed');
  updateBadge();
}

// ─── РЕГИСТРАЦИЯ / ВХОД ──────────────────────────────────────────────────────

function toggleMode() {
  S.loginMode = !S.loginMode;
  document.getElementById('r-nf').style.display = S.loginMode ? 'none' : '';
  document.querySelector('#s-reg .pbtn').textContent = S.loginMode ? 'войти' : 'создать аккаунт';
  document.getElementById('r-sw').innerHTML = S.loginMode
    ? 'нет аккаунта? <span onclick="toggleMode()">зарегистрироваться</span>'
    : 'уже есть аккаунт? <span onclick="toggleMode()">войти</span>';
  document.getElementById('r-err').textContent = '';
}

function doReg() {
  var email = document.getElementById('r-email').value.trim();
  var pass  = document.getElementById('r-pass').value;
  var name  = document.getElementById('r-name').value.trim();
  var err   = document.getElementById('r-err');
  if (!email || !pass)      { err.textContent = 'заполни почту и пароль'; return; }
  if (!email.includes('@')) { err.textContent = 'неверный формат почты';  return; }
  if (pass.length < 6)      { err.textContent = 'пароль минимум 6 символов'; return; }
  err.textContent = '';
  var id = 'u' + Date.now();
  S.user = { id: id, email: email, name: name || email.split('@')[0] };
  DB.s('user', S.user);
  USERS.push({ id: id, email: email, glyphs: [] });
  DB.s('all_users', USERS);
  showMain();
}

function doLogout() {
  S.user = null;
  DB.s('user', null);
  document.getElementById('bnav').style.display = 'none';
  switchScreen('reg');
}

// ─── НАВИГАЦИЯ ───────────────────────────────────────────────────────────────

function switchScreen(n) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  var s = document.getElementById('s-' + n);
  if (s) s.classList.add('active');
}

function switchTab(n) {
  S.prev = n;
  switchScreen(n);
  document.querySelectorAll('.nb').forEach(function(b) { b.classList.remove('active'); });
  var nb = document.getElementById('nb-' + n);
  if (nb) nb.classList.add('active');
  if (n === 'feed')     renderFeed();
  if (n === 'search')   renderSearch();
  if (n === 'contacts') renderContacts();
  if (n === 'notif')    { renderNotif(); markRead(); }
  if (n === 'profile')  renderProfile();
}

function goBack() { switchTab(S.prev || 'feed'); }

// ─── БЕЙДЖИ ──────────────────────────────────────────────────────────────────

function updateBadge() {
  var u = S.notifs.filter(function(n) { return !n.read; }).length;
  var b = document.getElementById('badge-n');
  if (u > 0) { b.style.display = 'flex'; b.textContent = u; }
  else b.style.display = 'none';
}

function markRead() {
  S.notifs.forEach(function(n) { n.read = true; });
  DB.s('notifs', S.notifs);
  updateBadge();
}

// ─── ЛЕНТА ───────────────────────────────────────────────────────────────────

function renderFeed() {
  var el = document.getElementById('feed-list');

  var compose = '<div class="feed-compose">'
    + '<div class="fc-glyphs" id="fc-glyphs" onclick="openFeedLib()">'
    + '<span class="fc-ph" id="fc-ph">что хочешь сказать?</span>'
    + '</div>'
    + '<div class="fc-add" onclick="openFeedLib()">'
    + '<svg viewBox="0 0 16 16" fill="none" width="16" height="16"><line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'
    + '</div>'
    + '<div class="fc-send" onclick="publishPost()">'
    + '<svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M3 13 L13 8 L3 3 L3 7 L10 8 L3 9 Z" fill="currentColor"/></svg>'
    + '</div></div>';

  var items = S.feed.map(function(item) {
    return '<div class="feed-item">'
      + '<div class="astrip">' + item.who.slice(0,3).map(function(g){ return glyphEl(g,'ag'); }).join('') + '</div>'
      + '<div class="fbody">'
      + '<div class="fmeta"><span class="fwho">' + item.who.join(' · ') + '</span><span class="ftime">' + item.time + '</span></div>'
      + '<div class="mstrip">' + item.glyphs.map(function(g){ return glyphEl(g,'mg'); }).join('') + '</div>'
      + '<div class="factions">'
      + '<div class="abtn" onclick="likePost(' + item.id + ',this)"><svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 10 C3 8 1 6 1 4 C1 2.5 2.5 1 4 2 C5 2.5 6 3.5 6 3.5 C6 3.5 7 2.5 8 2 C9.5 1 11 2.5 11 4 C11 6 9 8 6 10Z" stroke="currentColor" stroke-width="1" fill="none"/></svg> ' + item.likes + '</div>'
      + '<div class="abtn" onclick="openChat(\'' + item.who[0] + '\',\'feed_' + item.id + '\')"><svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 9 L2 5 L5 2 L10 2 L10 7 L7 7 L5 9 Z" stroke="currentColor" stroke-width="1" fill="none"/></svg> ответить</div>'
      + '</div></div></div>';
  }).join('');

  el.innerHTML = compose + items;

  // Восстанавливаем образы в поле публикации если они были
  if (S.feedPending.length) renderFeedCompose();
}

function renderFeedCompose() {
  var fc = document.getElementById('fc-glyphs');
  var ph = document.getElementById('fc-ph');
  if (!fc) return;
  var old = fc.querySelectorAll('.fc-glyph');
  old.forEach(function(e){ e.remove(); });
  if (S.feedPending.length === 0) {
    if (ph) ph.style.display = '';
  } else {
    if (ph) ph.style.display = 'none';
    S.feedPending.forEach(function(k, i) {
      var d = document.createElement('div');
      d.className = 'fc-glyph';
      d.innerHTML = makeSVG(k, 16)
        + '<div class="rm" onclick="event.stopPropagation();removeFeedPending(' + i + ')">×</div>';
      fc.appendChild(d);
    });
  }
}

function removeFeedPending(i) {
  S.feedPending.splice(i, 1);
  renderFeedCompose();
}

function openFeedLib() {
  var el = document.getElementById('lib-chat');
  el.innerHTML = GKEYS.map(function(k) {
    return '<div class="li" onclick="pickFeedGlyph(\'' + k + '\')">'
      + '<div class="lg">' + makeSVG(k, 23) + '</div>'
      + '<div class="lname">' + k + '</div></div>';
  }).join('');
  S.prev = 'feed';
  switchScreen('lib');
}

function pickFeedGlyph(k) {
  S.feedPending.push(k);
  switchTab('feed');
  renderFeedCompose();
}

function publishPost() {
  if (!S.feedPending.length) return;
  var now  = new Date();
  var time = 'сегодня ' + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
  var myWho = S.myG.length ? S.myG.slice(0, 3) : ['пустота'];
  S.feed.unshift({
    id: Date.now(),
    who: myWho,
    time: time,
    glyphs: S.feedPending.slice(),
    likes: 0
  });
  DB.s('feed', S.feed);
  S.feedPending = [];
  renderFeed();
}

function likePost(id, btn) {
  var item = S.feed.filter(function(x){ return x.id === id; })[0];
  if (!item) return;
  item.likes++;
  DB.s('feed', S.feed);
  if (btn) btn.innerHTML = '<svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 10 C3 8 1 6 1 4 C1 2.5 2.5 1 4 2 C5 2.5 6 3.5 6 3.5 C6 3.5 7 2.5 8 2 C9.5 1 11 2.5 11 4 C11 6 9 8 6 10Z" stroke="currentColor" stroke-width="1" fill="none"/></svg> ' + item.likes;
}

// ─── ПОИСК ───────────────────────────────────────────────────────────────────

function renderSearch() {
  var q  = (document.getElementById('sinput') || { value: '' }).value.toLowerCase();
  var el = document.getElementById('search-list');
  var list = USERS.filter(function(u) {
    return u.id !== (S.user && S.user.id)
      && (!q || u.email.includes(q) || u.glyphs.some(function(g){ return g.includes(q); }));
  });
  if (!list.length) {
    el.innerHTML = '<div style="padding:24px 15px;text-align:center;font-size:12px;color:var(--tx3)">пока никого нет — позови друзей</div>';
    return;
  }
  el.innerHTML = list.map(function(u) {
    var glyphs = u.glyphs.length ? u.glyphs : ['пустота'];
    return '<div class="urow" onclick="showUserDetail(\'' + u.id + '\',\'' + glyphs.join(',') + '\')">'
      + '<div class="astrip">' + glyphs.slice(0,3).map(function(g){ return glyphEl(g,'ag'); }).join('') + '</div>'
      + '<div class="umeta"><div class="umatch">' + u.email + '</div><div class="usub">' + glyphs.join(' · ') + '</div></div>'
      + '<button class="cbtn" id="cbtn-' + u.id + '" onclick="event.stopPropagation();addC(\'' + u.id + '\',\'' + glyphs.join(',') + '\')">'
      + (isContact(u.id) ? '✓' : '+ связаться') + '</button></div>';
  }).join('');
}

function filterSearch() { renderSearch(); }

// ─── КОНТАКТЫ ────────────────────────────────────────────────────────────────

function isContact(id) {
  return S.contacts.some(function(c) { return c.id === id; });
}

function addC(id, glyphsStr) {
  if (isContact(id)) return;
  S.contacts.push({ id: id, glyphs: glyphsStr.split(',') });
  DB.s('contacts', S.contacts);
  var btn = document.getElementById('cbtn-' + id);
  if (btn) btn.textContent = '✓';
}

function addCfromDetail(id, glyphsStr) {
  addC(id, glyphsStr);
  var b = document.getElementById('d-add-btn');
  if (b) b.textContent = '✓ уже в контактах';
}

function addCfromNotif(gs, btn) {
  addC('notif_' + Date.now(), gs);
  btn.textContent = '✓ добавлено';
}

function showUserDetail(id, glyphsStr) {
  var glyphs = glyphsStr.split(',');
  S.prev = 'search';
  document.getElementById('dtitle').textContent = 'профиль';
  var isc = isContact(id);
  document.getElementById('dbody').innerHTML =
    '<div class="dsec"><div class="dsec-lbl">образы</div><div class="bgs">' + glyphs.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
    + '<button class="acbtn" id="d-add-btn" onclick="addCfromDetail(\'' + id + '\',\'' + glyphsStr + '\')">' + (isc ? '✓ уже в контактах' : '+ добавить в контакты') + '</button>'
    + '<button class="acbtn" style="margin-top:6px" onclick="openChat(\'' + glyphs[0] + '\',\'' + id + '\')">написать образами →</button>';
  switchScreen('detail');
}

function renderContacts() {
  USERS.forEach(function(u) {
    if (u.id !== (S.user && S.user.id) && !isContact(u.id)) {
      S.contacts.push({ id: u.id, glyphs: u.glyphs.length ? u.glyphs : ['пустота'], email: u.email });
    }
  });
  DB.s('contacts', S.contacts);
  var el = document.getElementById('contacts-list');
  if (!S.contacts.length) {
    el.innerHTML = '<div style="padding:24px 15px;text-align:center;font-size:12px;color:var(--tx3)">пока нет контактов</div>';
    return;
  }
  el.innerHTML = S.contacts.map(function(c) {
    var g = c.glyphs || ['пустота'];
    return '<div class="citem" onclick="openChat(\'' + g[0] + '\',\'' + c.id + '\')">'
      + '<div class="astrip">' + g.slice(0,3).map(function(k){ return glyphEl(k,'ag'); }).join('') + '</div>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="font-size:11px;color:var(--tx2);font-weight:500">' + g.join(' · ') + '</div>'
      + (c.email ? '<div style="font-size:10px;color:var(--tx3)">' + c.email + '</div>' : '')
      + '</div><span style="color:var(--tx3);font-size:16px">›</span></div>';
  }).join('');
}

// ─── УВЕДОМЛЕНИЯ ─────────────────────────────────────────────────────────────

function renderNotif() {
  var el = document.getElementById('notif-list');
  el.innerHTML = S.notifs.map(function(n) {
    var t = n.type === 'reply' ? 'ответили на образ'
          : n.type === 'match' ? 'похожий профиль'
          : 'добавили в контакты';
    return '<div class="nitem" onclick="showNotifDetail(' + n.id + ')">'
      + '<div class="ndot ' + (n.read ? 'r' : '') + '"></div>'
      + '<div style="flex:1"><div class="ntext">' + t + '</div>'
      + '<div class="nprev">' + n.glyphs.map(function(g){
          return '<div class="ng2">' + makeSVG(g, 11) + '</div>';
        }).join('') + '</div></div>'
      + '<span class="ntime">' + n.time + '</span></div>';
  }).join('');
}

function showNotifDetail(id) {
  var n = S.notifs.filter(function(x){ return x.id === id; })[0];
  if (!n) return;
  S.prev = 'notif';
  var html = '';
  if (n.type === 'reply') {
    document.getElementById('dtitle').textContent = 'ответ на образ';
    html = '<div class="dsec"><div class="dsec-lbl">твой образ</div><div class="bgs">' + n.glyphs.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
      + '<div class="dsec"><div class="dsec-lbl">ответили</div><div class="bgs">' + n.reply.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
      + '<button class="acbtn" onclick="openChat(\'' + n.glyphs[0] + '\',\'notif_' + n.id + '\')">ответить →</button>';
  } else if (n.type === 'match') {
    document.getElementById('dtitle').textContent = 'похожий профиль';
    html = '<div class="dsec"><div class="dsec-lbl">образы</div><div class="bgs">' + n.glyphs.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
      + '<div class="dsec"><div class="dsec-lbl">совпадение</div><div class="bgs">' + n.match.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
      + '<button class="acbtn" onclick="addCfromNotif(\'' + n.glyphs.join(',') + '\',this)">+ добавить в контакты</button>';
  } else {
    document.getElementById('dtitle').textContent = 'новый контакт';
    html = '<div class="dsec"><div class="dsec-lbl">добавил тебя</div><div class="bgs">' + n.glyphs.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
      + '<button class="acbtn" onclick="openChat(\'' + n.glyphs[0] + '\',\'notif_' + n.id + '\')">написать образами →</button>';
  }
  document.getElementById('dbody').innerHTML = html;
  switchScreen('detail');
}

// ─── ПРОФИЛЬ ─────────────────────────────────────────────────────────────────

function renderProfile() {
  if (!S.user) return;
  document.getElementById('p-email').textContent  = S.user.email;
  document.getElementById('p-email2').textContent = S.user.email;
  document.getElementById('p-glyphs').innerHTML   = S.myG.map(function(g){ return glyphEl(g,'pg'); }).join('');
  renderLibProfile();
}

function renderLibProfile() {
  var el = document.getElementById('lib-profile');
  el.innerHTML = GKEYS.map(function(k) {
    return '<div class="li" onclick="toggleG(\'' + k + '\')">'
      + '<div class="lg ' + (S.myG.indexOf(k) !== -1 ? 'sel' : '') + '" id="lg-' + k + '">' + makeSVG(k, 23) + '</div>'
      + '<div class="lname">' + k + '</div></div>';
  }).join('');
}

function toggleG(k) {
  var i = S.myG.indexOf(k);
  if (i !== -1) { S.myG.splice(i, 1); }
  else { if (S.myG.length >= 8) { alert('максимум 8 образов'); return; } S.myG.push(k); }
  DB.s('myG', S.myG);
  var el = document.getElementById('lg-' + k);
  if (el) el.className = 'lg' + (S.myG.indexOf(k) !== -1 ? ' sel' : '');
  document.getElementById('p-glyphs').innerHTML = S.myG.map(function(g){ return glyphEl(g,'pg'); }).join('');
  var u = USERS.filter(function(x){ return x.id === S.user.id; })[0];
  if (u) { u.glyphs = S.myG; DB.s('all_users', USERS); }
}

// ─── ЧАТ ─────────────────────────────────────────────────────────────────────

function openChat(glyph, uid) {
  S.chatWith = uid || glyph;
  S.prev = 'contacts';
  document.getElementById('chat-who').textContent = glyph + ' · диалог';
  if (!S.chats[S.chatWith]) {
    S.chats[S.chatWith] = [
      { from:'them', glyphs:['туман','корень'], time:'14:22' },
      { from:'me',   glyphs:['звезда'],         time:'14:28' },
    ];
  }
  S.pending = [];
  renderChat();
  renderCompose();
  switchScreen('chat');
  document.querySelectorAll('.nb').forEach(function(b){ b.classList.remove('active'); });
}

function renderChat() {
  var msgs = S.chats[S.chatWith] || [];
  var el   = document.getElementById('chat-body');
  el.innerHTML = msgs.map(function(m) {
    return '<div class="crow ' + (m.from === 'me' ? 'right' : '') + '">'
      + (m.from === 'them' ? '<div class="astrip">' + glyphEl(m.glyphs[0], 'ag') + '</div>' : '')
      + '<div class="bwrap"><div class="bubble">' + m.glyphs.map(function(g){ return makeSVG(g, 19); }).join('') + '</div>'
      + '<span class="btime">' + m.time + '</span></div></div>';
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function renderCompose() {
  var ci = document.getElementById('compose-input');
  var ph = document.getElementById('compose-ph');
  if (!ci) return;
  ci.querySelectorAll('.compose-glyph').forEach(function(e){ e.remove(); });
  if (S.pending.length === 0) {
    if (ph) ph.style.display = '';
  } else {
    if (ph) ph.style.display = 'none';
    S.pending.forEach(function(k, i) {
      var d = document.createElement('div');
      d.className = 'compose-glyph';
      d.innerHTML = makeSVG(k, 18) + '<div class="rm" onclick="removePending(' + i + ')">×</div>';
      ci.appendChild(d);
    });
  }
}

function removePending(i) {
  S.pending.splice(i, 1);
  renderCompose();
}

function openLib() {
  var el = document.getElementById('lib-chat');
  el.innerHTML = GKEYS.map(function(k) {
    return '<div class="li" onclick="pickGlyph(\'' + k + '\')">'
      + '<div class="lg">' + makeSVG(k, 23) + '</div>'
      + '<div class="lname">' + k + '</div></div>';
  }).join('');
  switchScreen('lib');
}

function closeLib() { switchScreen('chat'); }

function pickGlyph(k) {
  S.pending.push(k);
  closeLib();
  renderCompose();
}

function focusCompose() { openLib(); }

function sendMsg() {
  if (!S.pending.length) return;
  var now  = new Date();
  var t    = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
  if (!S.chats[S.chatWith]) S.chats[S.chatWith] = [];
  S.chats[S.chatWith].push({ from:'me', glyphs: S.pending.slice(), time: t });
  S.pending = [];
  DB.s('chats', S.chats);
  renderChat();
  renderCompose();
}

// ─── СТАРТ ───────────────────────────────────────────────────────────────────

init();
