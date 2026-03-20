// ─── ХРАНИЛИЩЕ (localStorage) ───────────────────────────────────────────────

var DB = {
  save: function(k, v) {
    try { localStorage.setItem('glyph_' + k, JSON.stringify(v)); } catch(e) {}
  },
  load: function(k, def) {
    try {
      var v = localStorage.getItem('glyph_' + k);
      return v !== null ? JSON.parse(v) : def;
    } catch(e) { return def; }
  }
};

// ─── СОСТОЯНИЕ ───────────────────────────────────────────────────────────────

var state = {
  user:      DB.load('user', null),
  myGlyphs:  DB.load('myGlyphs', []),
  contacts:  DB.load('contacts', []),
  chats:     DB.load('chats', {}),
  feed:      DB.load('feed', [
    { id:1, who:['гора','глаз','земля'],  time:'сегодня 14:32', glyphs:['звезда','земля','огонь'], likes:5  },
    { id:2, who:['вода','звезда'],        time:'вчера 22:07',   glyphs:['луна','путь','вода'],     likes:12 },
    { id:3, who:['спираль','тень'],       time:'вчера 18:15',   glyphs:['эхо','граница'],          likes:3  },
  ]),
  notifications: DB.load('notifications', [
    { id:1, type:'reply',  read:false, time:'2 мин',  glyphs:['огонь'],           replyGlyphs:['луна','волк'] },
    { id:2, type:'match',  read:false, time:'1 ч',    glyphs:['гора','глаз'],     match:['глаз']              },
    { id:3, type:'added',  read:true,  time:'вчера',  glyphs:['волна','спираль','тень']                       },
  ]),
  prevScreen:        'feed',
  chatWith:          null,
  chatGlyphPending:  [],
  isLoginMode:       false,
};

// ─── ИНИЦИАЛИЗАЦИЯ ───────────────────────────────────────────────────────────

function initApp() {
  if (state.user) {
    showMain();
  } else {
    switchScreen('reg');
  }
}

function showMain() {
  document.getElementById('bottom-nav').style.display = 'flex';
  switchTab('feed');
  updateBadges();
}

// ─── РЕГИСТРАЦИЯ / ВХОД ──────────────────────────────────────────────────────

function toggleMode() {
  state.isLoginMode = !state.isLoginMode;
  document.getElementById('r-name-field').style.display = state.isLoginMode ? 'none' : '';
  document.getElementById('r-submit').textContent = state.isLoginMode ? 'войти' : 'создать аккаунт';
  document.getElementById('r-switch').innerHTML = state.isLoginMode
    ? 'нет аккаунта? <span onclick="toggleMode()">зарегистрироваться</span>'
    : 'уже есть аккаунт? <span onclick="toggleMode()">войти</span>';
  document.getElementById('r-err').textContent = '';
}

function doReg() {
  var email = document.getElementById('r-email').value.trim();
  var pass  = document.getElementById('r-pass').value;
  var name  = document.getElementById('r-name').value.trim();
  var err   = document.getElementById('r-err');

  if (!email || !pass)         { err.textContent = 'заполни почту и пароль'; return; }
  if (!email.includes('@'))    { err.textContent = 'неверный формат почты';  return; }
  if (pass.length < 6)         { err.textContent = 'пароль минимум 6 символов'; return; }

  err.textContent = '';
  state.user = { email: email, name: name || email.split('@')[0], id: Date.now() };
  DB.save('user', state.user);
  document.getElementById('prof-email').textContent     = email;
  document.getElementById('prof-email-top').textContent = email;
  showMain();
}

function doLogout() {
  state.user = null;
  DB.save('user', null);
  document.getElementById('bottom-nav').style.display = 'none';
  switchScreen('reg');
}

// ─── НАВИГАЦИЯ ───────────────────────────────────────────────────────────────

function switchScreen(name) {
  document.querySelectorAll('.screen').forEach(function(s) { s.classList.remove('active'); });
  var s = document.getElementById('s-' + name);
  if (s) s.classList.add('active');
}

function switchTab(name) {
  state.prevScreen = name;
  switchScreen(name);
  document.querySelectorAll('.nb').forEach(function(b) { b.classList.remove('active'); });
  var nb = document.getElementById('nb-' + name);
  if (nb) nb.classList.add('active');
  if (name === 'feed')     renderFeed();
  if (name === 'search')   renderSearch();
  if (name === 'notif')    { renderNotif(); markAllRead(); }
  if (name === 'contacts') renderContacts();
  if (name === 'profile')  renderProfile();
}

function goBack() {
  switchTab(state.prevScreen || 'feed');
}

// ─── БЕЙДЖИ ──────────────────────────────────────────────────────────────────

function updateBadges() {
  var unread = state.notifications.filter(function(n) { return !n.read; }).length;
  var badge  = document.getElementById('badge-notif');
  if (unread > 0) { badge.style.display = 'flex'; badge.textContent = unread; }
  else              badge.style.display = 'none';
}

function markAllRead() {
  state.notifications.forEach(function(n) { n.read = true; });
  DB.save('notifications', state.notifications);
  updateBadges();
}

// ─── ЛЕНТА ───────────────────────────────────────────────────────────────────

function renderFeed() {
  var el = document.getElementById('feed-list');
  el.innerHTML = state.feed.map(function(item) {
    return '<div class="feed-item">'
      + '<div class="astrip">' + item.who.slice(0,3).map(function(g){ return glyphEl(g,'ag'); }).join('') + '</div>'
      + '<div class="fbody">'
      + '<div class="fmeta"><span class="fwho">' + item.who.join(' · ') + '</span><span class="ftime">' + item.time + '</span></div>'
      + '<div class="mstrip">' + item.glyphs.map(function(g){ return glyphEl(g,'mg'); }).join('') + '</div>'
      + '<div class="factions">'
      + '<div class="abtn"><svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M6 10 C3 8 1 6 1 4 C1 2.5 2.5 1 4 2 C5 2.5 6 3.5 6 3.5 C6 3.5 7 2.5 8 2 C9.5 1 11 2.5 11 4 C11 6 9 8 6 10Z" stroke="currentColor" stroke-width="1" fill="none"/></svg> ' + item.likes + '</div>'
      + '<div class="abtn" onclick="openChat(\'' + item.who[0] + '\')"><svg viewBox="0 0 12 12" fill="none" width="10" height="10"><path d="M2 9 L2 5 L5 2 L10 2 L10 7 L7 7 L5 9 Z" stroke="currentColor" stroke-width="1" fill="none"/></svg> ответить</div>'
      + '</div></div></div>';
  }).join('');
}

// ─── ПОИСК ───────────────────────────────────────────────────────────────────

var MOCK_USERS = [
  { id:'u1', glyphs:['гора','глаз','земля'],     match:['глаз','земля'] },
  { id:'u2', glyphs:['огонь','путь','волк'],      match:['огонь']        },
  { id:'u3', glyphs:['луна','волна','спираль'],   match:['луна','спираль'] },
  { id:'u4', glyphs:['рыба','туман','эхо'],       match:['туман']        },
  { id:'u5', glyphs:['птица','стрела','звезда'],  match:['звезда']       },
  { id:'u6', glyphs:['медведь','корень','пещера'],match:['корень']       },
  { id:'u7', glyphs:['змея','разлом','граница'],  match:['граница']      },
];

function renderSearch() {
  var q  = (document.getElementById('search-input') || { value:'' }).value.toLowerCase();
  var el = document.getElementById('search-list');
  el.innerHTML = MOCK_USERS
    .filter(function(u) { return !q || u.glyphs.some(function(g){ return g.includes(q); }); })
    .map(function(u) {
      var isContact = state.contacts.some(function(c){ return c.id === u.id; });
      return '<div class="urow" onclick="showUserDetail(\'' + u.id + '\',\'' + u.glyphs.join(',') + '\',\'' + u.match.join(',') + '\')">'
        + '<div class="astrip">' + u.glyphs.slice(0,3).map(function(g){ return glyphEl(g,'ag'); }).join('') + '</div>'
        + '<div class="umeta"><div class="umatch">' + u.glyphs.join(' · ') + '</div><div class="usub">совпадение: ' + u.match.join(', ') + '</div></div>'
        + '<button class="cbtn" id="cbtn-' + u.id + '" onclick="event.stopPropagation();addContact(\'' + u.id + '\',\'' + u.glyphs.join(',') + '\')">'
        + (isContact ? '✓' : '+ связаться') + '</button></div>';
    }).join('');
}

function filterSearch() { renderSearch(); }

function showUserDetail(id, glyphsStr, matchStr) {
  var glyphs = glyphsStr.split(',');
  var match  = matchStr.split(',');
  state.prevScreen = 'search';
  document.getElementById('detail-title').textContent = 'профиль';
  var isContact = state.contacts.some(function(c){ return c.id === id; });
  document.getElementById('detail-body').innerHTML =
    '<div class="dsec"><div class="dsec-lbl">образы</div><div class="bgs">' + glyphs.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
    + '<div class="dsec"><div class="dsec-lbl">совпадение с тобой</div><div class="bgs">' + match.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
    + '<button class="add-contact-btn" id="detail-add-btn" onclick="addContactFromDetail(\'' + id + '\',\'' + glyphsStr + '\')">' + (isContact ? '✓ уже в контактах' : '+ добавить в контакты') + '</button>'
    + '<button class="add-contact-btn" style="margin-top:6px" onclick="openChat(\'' + glyphs[0] + '\')">написать образами →</button>';
  switchScreen('detail');
}

// ─── КОНТАКТЫ ────────────────────────────────────────────────────────────────

function addContact(id, glyphsStr) {
  if (state.contacts.some(function(c){ return c.id === id; })) return;
  state.contacts.push({ id: id, glyphs: glyphsStr.split(',') });
  DB.save('contacts', state.contacts);
  var btn = document.getElementById('cbtn-' + id);
  if (btn) btn.textContent = '✓';
}

function addContactFromDetail(id, glyphsStr) {
  addContact(id, glyphsStr);
  var btn = document.getElementById('detail-add-btn');
  if (btn) btn.textContent = '✓ уже в контактах';
}

function addContactFromNotif(glyphsStr, btn) {
  var id = 'notif_' + Date.now();
  addContact(id, glyphsStr);
  btn.textContent = '✓ добавлено';
}

function renderContacts() {
  var el = document.getElementById('contacts-list');
  if (!state.contacts.length) {
    el.innerHTML = '<div style="padding:24px 15px;text-align:center;font-size:12px;color:var(--tx3)">пока нет контактов — найди людей в поиске</div>';
    return;
  }
  el.innerHTML = state.contacts.map(function(c) {
    return '<div class="citem" onclick="openChat(\'' + c.glyphs[0] + '\',\'' + c.id + '\')">'
      + '<div class="astrip">' + c.glyphs.slice(0,3).map(function(g){ return glyphEl(g,'ag'); }).join('') + '</div>'
      + '<div style="flex:1;font-size:11px;color:var(--tx2)">' + c.glyphs.join(' · ') + '</div>'
      + '<span style="color:var(--tx3);font-size:16px">›</span></div>';
  }).join('');
}

// ─── УВЕДОМЛЕНИЯ ─────────────────────────────────────────────────────────────

function renderNotif() {
  var el = document.getElementById('notif-list');
  el.innerHTML = state.notifications.map(function(n) {
    var text = n.type === 'reply' ? 'ответили на твой образ'
             : n.type === 'match' ? 'новый похожий профиль'
             : 'тебя добавили в контакты';
    return '<div class="nitem" onclick="showNotifDetail(' + n.id + ')">'
      + '<div class="ndot ' + (n.read ? 'r' : '') + '"></div>'
      + '<div style="flex:1"><div class="ntext">' + text + '</div>'
      + '<div class="nprev">' + n.glyphs.map(function(g){
          return '<div class="ng2">' + makeSVG(g, 11) + '</div>';
        }).join('') + '</div></div>'
      + '<span class="ntime">' + n.time + '</span></div>';
  }).join('');
}

function showNotifDetail(id) {
  var n = state.notifications.filter(function(x){ return x.id === id; })[0];
  if (!n) return;
  state.prevScreen = 'notif';
  var html = '';
  if (n.type === 'reply') {
    document.getElementById('detail-title').textContent = 'ответ на образ';
    html = '<div class="dsec"><div class="dsec-lbl">твой образ</div><div class="bgs">' + n.glyphs.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
      + '<div class="dsec"><div class="dsec-lbl">ответили</div><div class="bgs">' + n.replyGlyphs.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
      + '<button class="add-contact-btn" onclick="switchTab(\'chat\')">ответить →</button>';
  } else if (n.type === 'match') {
    document.getElementById('detail-title').textContent = 'похожий профиль';
    html = '<div class="dsec"><div class="dsec-lbl">образы</div><div class="bgs">' + n.glyphs.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
      + '<div class="dsec"><div class="dsec-lbl">совпадение</div><div class="bgs">' + n.match.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
      + '<button class="add-contact-btn" onclick="addContactFromNotif(\'' + n.glyphs.join(',') + '\',this)">+ добавить в контакты</button>';
  } else {
    document.getElementById('detail-title').textContent = 'новый контакт';
    html = '<div class="dsec"><div class="dsec-lbl">добавил тебя</div><div class="bgs">' + n.glyphs.map(function(g){ return glyphEl(g,'bgg'); }).join('') + '</div></div>'
      + '<button class="add-contact-btn" onclick="openChat(\'' + n.glyphs[0] + '\')">написать образами →</button>';
  }
  document.getElementById('detail-body').innerHTML = html;
  switchScreen('detail');
}

// ─── ПРОФИЛЬ ─────────────────────────────────────────────────────────────────

function renderProfile() {
  if (!state.user) return;
  document.getElementById('prof-email').textContent     = state.user.email;
  document.getElementById('prof-email-top').textContent = state.user.email;
  var pg = document.getElementById('prof-glyphs');
  pg.innerHTML = state.myGlyphs.map(function(g){ return glyphEl(g,'pg'); }).join('')
    + '<div class="pg pg-add" title="добавить образ"><svg viewBox="0 0 18 18" width="18" height="18"><line x1="9" y1="4" x2="9" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="4" y1="9" x2="14" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></div>';
  renderLibProfile();
}

function renderLibProfile() {
  var el = document.getElementById('lib-profile');
  el.innerHTML = GKEYS.map(function(k) {
    return '<div class="li" onclick="toggleMyGlyph(\'' + k + '\')">'
      + '<div class="lg ' + (state.myGlyphs.indexOf(k) !== -1 ? 'sel' : '') + '" id="lg-' + k + '">' + makeSVG(k, 23) + '</div>'
      + '<div class="lname">' + k + '</div></div>';
  }).join('');
}

function toggleMyGlyph(k) {
  var idx = state.myGlyphs.indexOf(k);
  if (idx !== -1) {
    state.myGlyphs.splice(idx, 1);
  } else {
    if (state.myGlyphs.length >= 8) { alert('максимум 8 образов в профиле'); return; }
    state.myGlyphs.push(k);
  }
  DB.save('myGlyphs', state.myGlyphs);
  var el = document.getElementById('lg-' + k);
  if (el) el.className = 'lg' + (state.myGlyphs.indexOf(k) !== -1 ? ' sel' : '');
  renderProfile();
}

// ─── ЧАТ ─────────────────────────────────────────────────────────────────────

function openChat(glyphId, userId) {
  state.chatWith = userId || glyphId;
  state.prevScreen = 'feed';
  document.getElementById('chat-with-label').textContent = 'диалог · ' + glyphId;
  if (!state.chats[state.chatWith]) {
    state.chats[state.chatWith] = [
      { from:'them', glyphs:['туман','корень'], time:'14:22' },
      { from:'me',   glyphs:['звезда','земля'], time:'14:28' },
    ];
  }
  renderChat();
  switchScreen('chat');
  document.querySelectorAll('.nb').forEach(function(b){ b.classList.remove('active'); });
}

function renderChat() {
  var msgs = state.chats[state.chatWith] || [];
  var el   = document.getElementById('chat-body');
  el.innerHTML = msgs.map(function(m) {
    return '<div class="crow ' + (m.from === 'me' ? 'right' : '') + '">'
      + (m.from === 'them' ? '<div class="astrip">' + glyphEl(m.glyphs[0],'ag') + '</div>' : '')
      + '<div class="bwrap"><div class="bubble">'
      + m.glyphs.map(function(g){ return makeSVG(g, 19); }).join('')
      + '</div><span class="btime">' + m.time + '</span></div></div>';
  }).join('');
  el.scrollTop = el.scrollHeight;
}

function openLibraryForChat() {
  state.prevScreen = 'chat';
  var el = document.getElementById('lib-chat');
  el.innerHTML = GKEYS.map(function(k) {
    return '<div class="li" onclick="selectChatGlyph(\'' + k + '\')">'
      + '<div class="lg" id="lcg-' + k + '">' + makeSVG(k, 23) + '</div>'
      + '<div class="lname">' + k + '</div></div>';
  }).join('');
  switchScreen('library');
}

function selectChatGlyph(k) {
  state.chatGlyphPending.push(k);
  var el = document.getElementById('lcg-' + k);
  if (el) el.classList.add('sel');
  setTimeout(function() {
    switchScreen('chat');
    sendChatMsg();
  }, 250);
}

function sendChatMsg() {
  if (!state.chatGlyphPending.length) return;
  var now  = new Date();
  var time = now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
  if (!state.chats[state.chatWith]) state.chats[state.chatWith] = [];
  state.chats[state.chatWith].push({ from:'me', glyphs: state.chatGlyphPending.slice(), time: time });
  state.chatGlyphPending = [];
  DB.save('chats', state.chats);
  renderChat();
}

// ─── СТАРТ ───────────────────────────────────────────────────────────────────

initApp();
