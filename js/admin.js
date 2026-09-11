/* InMark Studio — edits content.json through the site server */
let C = null;
let dirty = false;

const body = document.getElementById('stBody');
const crumb = document.getElementById('stCrumb');
const statusEl = document.getElementById('stStatus');
const toast = document.getElementById('stToast');
let current = 'overview';

const TITLES = {
  hero: ['Hero', 'Headline, subline, CTA, the five photos, and the media inside the headline (image or .mp4).'],
  features: ['Core Features', 'The black bento grid — card copy and the invite panel.'],
  cta: ['Download CTA', 'The app section: headline, checklist, buttons, illustration.'],
  footer: ['Footer & Promo', 'Footer tagline and the two promo cards.'],
  posts: ['Blog Posts', 'Pin posts as Featured — pinned show on the home page, the first three power the blog hero.'],
  audiences: ['Audiences', 'The four dark cards. Add an image to replace a card\'s phone mockup.'],
  workflow: ['Workflow', 'The seven conveyor steps — image optional per step.'],
  agents: ['AI Agents', 'The four capability cards — upload media to replace a card\'s mock UI.'],
  faq: ['FAQ', 'Questions per audience tab.'],
  overview: ['Program overview', 'The launch at a glance — guests, confirmations, seats, Face ID, and the latest registrations.'],
  guestlist: ['Guest list', 'Everyone you are inviting. Search by name, tick guests off as handled, add people one by one or in bulk.'],
  qrlinks: ['QR codes & links', 'Every guest\'s unique link and print-ready QR. Download the CSV for the invitation cards.'],
  confirmations: ['Confirmations', 'Everyone who has registered — invited guests and walk-ins, seats, and Face ID status.'],
  eventcontent: ['Event content', 'The launch page\'s facts and copy: date, venue, map, video, and headline text. Publish to update the live page.'],
  settings: ['Site Settings', 'Store links and the QR destination.']
};

const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
function sessionToken() {
  try { return localStorage.getItem('inmark-studio-key'); } catch (e) { return null; }
}
function sessionValid() {
  const t = sessionToken();
  if (!t) return false;
  const exp = Number(t.split('.')[0]);
  return Number.isFinite(exp) && exp > Date.now();
}
function authHeaders() {
  if (IS_LOCAL) return {};
  const t = sessionToken();
  return t ? { Authorization: 'Bearer ' + t } : {};
}
function clearAuth() {
  try { localStorage.removeItem('inmark-studio-key'); } catch (e) {}
  document.cookie = 'inmark_session=; Path=/; Max-Age=0';
}
function toLogin() {
  clearAuth();
  location.href = 'login.html';
}
if (!IS_LOCAL && !sessionValid()) toLogin();
function markDirty() {
  dirty = true;
  statusEl.textContent = 'Unsaved changes';
  statusEl.classList.add('is-dirty');
}
function markSaved() {
  dirty = false;
  statusEl.textContent = 'All changes saved';
  statusEl.classList.remove('is-dirty');
}
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('is-on');
  setTimeout(() => toast.classList.remove('is-on'), 2200);
}
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}
function imgField(label, path, value) {
  return '<div class="f"><label>' + label + '</label><div class="imgf">' +
    '<div class="imgf__prev" data-prev="' + path + '" style="background-image:url(&quot;' + esc(value) + '&quot;)"></div>' +
    '<div class="imgf__ctl"><div class="imgf__row">' +
    '<input type="text" data-path="' + path + '" value="' + esc(value) + '" placeholder="Image URL or upload →" />' +
    '<label class="btn-ghost imgf__up">Upload<input type="file" accept="image/*,video/mp4,video/webm" data-upload="' + path + '" /></label>' +
    '</div></div></div></div>';
}
function field(label, path, value, kind) {
  const tag = kind === 'area'
    ? '<textarea data-path="' + path + '">' + esc(value) + '</textarea>'
    : '<input type="text" data-path="' + path + '" value="' + esc(value) + '" />';
  return '<div class="f"><label>' + label + '</label>' + tag + '</div>';
}
function richField(label, path, html) {
  // html is admin-authored content, injected as-is so Quill picks it up
  return '<div class="f f--rich"><label>' + label + '</label><div class="rich" data-rich="' + path + '">' + (html || '') + '</div></div>';
}
function mountEditors() {
  if (!window.Quill) return;
  body.querySelectorAll('[data-rich]').forEach((el) => {
    const path = el.dataset.rich;
    const q = new Quill(el, {
      theme: 'snow',
      placeholder: 'Write the article…',
      modules: {
        toolbar: [
          [{ header: [2, 3, false] }],
          ['bold', 'italic', 'underline', 'link'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          ['blockquote', 'image'],
          ['clean']
        ]
      }
    });
    // the toolbar's image button routes through the Studio upload pipeline
    q.getModule('toolbar').addHandler('image', () => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      inp.onchange = async () => {
        const f = inp.files[0];
        if (!f) return;
        showToast('Uploading ' + f.name + '…');
        try {
          const r = await fetch('/api/upload?name=' + encodeURIComponent(f.name), { method: 'POST', headers: authHeaders(), body: f });
          if (r.status === 401) { toLogin(); return; }
          const data = await r.json();
          if (!data.ok) throw new Error();
          const range = q.getSelection(true);
          q.insertEmbed(range.index, 'image', data.url, 'user');
          q.setSelection(range.index + 1);
        } catch (err) {
          showToast('Upload failed');
        }
      };
      inp.click();
    });
    q.on('text-change', (d, o, source) => {
      if (source !== 'user') return;
      setPath(path, q.root.innerHTML);
      markDirty();
    });
  });
}
function card(title, chips, formHtml, open) {
  return '<div class="card' + (open ? ' is-open' : '') + '">' +
    '<div class="card__head"><span class="card__title">' + esc(title) + '</span>' + (chips || '') + '<span class="card__arrow">›</span></div>' +
    '<div class="card__form">' + formHtml + '</div></div>';
}

const IMG_LABELS = ['Top left photo', 'Bottom left photo', 'Top right photo', 'Bottom right photo', 'Bottom center photo'];
const RENDER = {
  hero() {
    return card('Headline & CTA', '<span class="chip">Copy</span>',
      '<div class="f__row3">' +
      field('Line 1 — before media', 'hero.line1Pre', C.hero.line1Pre) +
      field('Line 1 — after media', 'hero.line1Post', C.hero.line1Post) +
      field('CTA label', 'hero.cta', C.hero.cta) +
      '</div>' +
      field('Line 2', 'hero.line2', C.hero.line2) +
      field('Subline', 'hero.sub', C.hero.sub, 'area'), true) +
    card('Headline media (chip + expanding pill)', '<span class="chip">Image / Video</span>',
      imgField('Image URL or .mp4 — used in the headline chip and the big morphing pill', 'hero.media', C.hero.media)) +
    card('Floating photos', '<span class="chip">5 images</span>',
      (C.hero.images || []).map((u, i) => imgField(IMG_LABELS[i] || 'Photo ' + (i + 1), 'hero.images.' + i, u)).join(''));
  },
  features() {
    return C.features.map((f, i) =>
      card(f.title, '<span class="chip">Card ' + (i + 1) + '</span>',
        field('Title', 'features.' + i + '.title', f.title) +
        field('Body', 'features.' + i + '.body', f.body, 'area')
      )).join('') +
      card('Invite panel (inside "Find the right creators")', '<span class="chip">Mock UI</span>',
        field('Panel title', 'invitePanel.title', C.invitePanel.title) +
        '<div class="f__row3">' +
        field('Creator name', 'invitePanel.name', C.invitePanel.name) +
        field('Handle', 'invitePanel.handle', C.invitePanel.handle) +
        field('Followers', 'invitePanel.followers', C.invitePanel.followers) +
        '</div>' +
        imgField('Avatar', 'invitePanel.avatar', C.invitePanel.avatar) +
        imgField('Thumbnail 1', 'invitePanel.thumb1', C.invitePanel.thumb1) +
        imgField('Thumbnail 2', 'invitePanel.thumb2', C.invitePanel.thumb2) +
        imgField('Thumbnail 3', 'invitePanel.thumb3', C.invitePanel.thumb3));
  },
  cta() {
    return card('Download section', '<span class="chip">Singleton</span>',
      '<div class="f__row">' +
      field('Title line 1', 'cta.titleA', C.cta.titleA) +
      field('Title line 2', 'cta.titleB', C.cta.titleB) +
      '</div>' +
      field('Subline', 'cta.sub', C.cta.sub, 'area') +
      field('Try line', 'cta.tryLine', C.cta.tryLine) +
      '<div class="f__row3">' +
      field('Check 1', 'cta.check1', C.cta.check1) +
      field('Check 2', 'cta.check2', C.cta.check2) +
      field('Check 3', 'cta.check3', C.cta.check3) +
      '</div>' +
      '<div class="f__row">' +
      field('Primary button', 'cta.btnPrimary', C.cta.btnPrimary) +
      field('Secondary button', 'cta.btnSecondary', C.cta.btnSecondary) +
      '</div>' +
      imgField('Illustration', 'cta.illustration', C.cta.illustration), true);
  },
  footer() {
    return card('Footer', '<span class="chip">Singleton</span>',
      field('Tagline', 'footer.tagline', C.footer.tagline) +
      field('Copyright line', 'footer.copyright', C.footer.copyright), true) +
      C.promo.map((p, i) =>
        card('Promo card ' + (i + 1) + ' — ' + p.title, '',
          '<div class="f__row">' +
          field('Title', 'promo.' + i + '.title', p.title) +
          field('Button label', 'promo.' + i + '.cta', p.cta) +
          '</div>'
        )).join('');
  },
  posts() {
    return C.posts.map((p, i) =>
      card(p.title, '<span class="chip">' + esc(p.category || 'Post') + '</span>' +
        '<span class="tgl' + (p.featured ? ' is-on' : '') + '" data-feat="' + i + '"><i></i>Featured</span>',
        field('Title', 'posts.' + i + '.title', p.title) +
        '<div class="f__row3">' +
        field('Slug', 'posts.' + i + '.slug', p.slug) +
        field('Category', 'posts.' + i + '.category', p.category || '') +
        field('Read time', 'posts.' + i + '.read', p.read) +
        '</div>' +
        field('Date', 'posts.' + i + '.date', p.date) +
        imgField('Cover image', 'posts.' + i + '.img', p.img) +
        field('Excerpt', 'posts.' + i + '.excerpt', p.excerpt, 'area') +
        richField('Article body', 'posts.' + i + '.body', p.body) +
        '<div class="rowbtns"><button class="btn-ghost btn-danger" data-del-post="' + i + '">Delete post</button></div>'
      )).join('') +
      '<button class="btn-ghost st__add" id="addPost">+ New post</button>';
  },
  overview() {
    return '<div class="ov-tiles">' +
      '<div class="ov-tile"><div class="ov-tile__k">Guests invited</div><div class="ov-tile__v" id="ovGuests">—</div><span class="ov-tile__d is-flat" id="ovChecked">— checked</span></div>' +
      '<div class="ov-tile"><div class="ov-tile__k">Confirmed</div><div class="ov-tile__v" id="ovRsvps">—</div><span class="ov-tile__d" id="ovRate">—</span></div>' +
      '<div class="ov-tile"><div class="ov-tile__k">Seats reserved</div><div class="ov-tile__v" id="ovSeats">—</div><span class="ov-tile__d is-flat" id="ovWalkins">— walk-ins</span></div>' +
      '<div class="ov-tile"><div class="ov-tile__k">Face ID</div><div class="ov-tile__v" id="ovFace">—</div><span class="ov-tile__d is-flat" id="ovFaceNote">opted in</span></div>' +
      '<div class="ov-tile"><div class="ov-tile__k">Days to launch</div><div class="ov-tile__v" id="ovDays">—</div><span class="ov-tile__d is-warn">Sep 23, 2026 · 17:25</span></div>' +
      '</div>' +
      '<div class="ov-grid">' +
      card('Recent registrations', '<span class="chip" id="ovActCount">…</span>', '<div class="ov-act" id="ovAct"><p class="st__sub">Loading…</p></div>', true) +
      card('Confirmation progress', '<span class="chip">Live</span>',
        '<p class="st__sub" id="ovProgNote">—</p><div class="ov-bar"><i id="ovBar" style="width:0%"></i></div>' +
        '<div class="ov-quick">' +
        '<button class="btn-ghost" data-goto="guestlist">Open guest list</button>' +
        '<button class="btn-ghost" data-goto="qrlinks">QR codes & links</button>' +
        '<button class="btn-ghost" data-goto="confirmations">Confirmations</button>' +
        '<button class="btn-ghost" data-goto="eventcontent">Edit event content</button>' +
        '</div>', true) +
      '</div>';
  },
  guestlist() {
    return '<div class="gadd">' +
      '<input type="text" id="evName" placeholder="Full name" />' +
      '<input type="text" id="evOrg" placeholder="Organization (optional)" />' +
      '<input type="text" id="evRole" placeholder="Role (optional)" />' +
      '<button class="btn-solid" id="evAdd">+ Add guest</button>' +
      '</div>' +
      '<div class="gtool">' +
      '<input type="search" class="evt__search" id="evSearch" placeholder="Search a guest by name, organization, or code…" style="margin:0;flex:1;min-width:220px" />' +
      '<button class="btn-ghost" id="evQrPack">Download QRs (.zip)</button>' +
      '<button class="btn-ghost" id="evExport">Download CSV + links</button>' +
      '</div>' +
      '<div class="chipbar" id="evChips"></div>' +
      '<div class="gwrap"><table class="gtable"><thead><tr>' +
      '<th>Guest</th><th>Unique link</th><th>Status</th><th style="text-align:right">Actions</th>' +
      '</tr></thead><tbody id="evGuests"><tr><td colspan="4" class="st__sub" style="padding:18px">Loading…</td></tr></tbody></table></div>' +
      card('Bulk import — the full guest list', '<span class="chip">CSV / XLSX</span>',
      '<label class="updrop" id="evDrop"><strong>Upload the guest list</strong>Drop a .csv or .xlsx here, or click to choose — columns: Name, Organization, Role' +
      '<input type="file" id="evFile" accept=".csv,.xlsx,.xls" /></label>' +
      '<div class="f" style="margin-top:14px"><label>Or paste — one guest per line: Name, Organization, Role</label>' +
      '<textarea id="evBulk" rows="8" placeholder="Abhishek Thapa, Bigbrackets, Creative designer\nSmita Tiwari, Prixa Digital\nSamip Poudel"></textarea></div>' +
      '<div class="f__row3">' +
      '<div class="f"><label>Code prefix</label><input type="text" id="evPrefix" value="px-iml-usr" /></div>' +
      '<div class="f"><label>Start number</label><input type="text" id="evStart" value="1" /></div>' +
      '<div class="f"><label style="display:flex;gap:8px;align-items:center;margin-top:26px;"><input type="checkbox" id="evTail" checked style="width:auto" /> Random tail (recommended)</label></div>' +
      '</div>' +
      '<p class="st__sub">Codes become px-iml-usr-001-x9f2 … Without the tail they are guessable: anyone could open other guests\' links and overwrite their RSVPs.</p>' +
      '<div class="rowbtns"><button class="btn-ghost" id="evBulkGo">Create all invites</button></div>');
  },
  qrlinks() {
    return card('QR codes & links', '<span class="chip" id="evGuestCount">…</span>',
      '<div class="rowbtns" style="margin-bottom:14px">' +
      '<button class="btn-ghost" id="evQrPack">Download all QR cards (.zip)</button>' +
      '<button class="btn-ghost" id="evExport">Download CSV (links + print QRs)</button></div>' +
      '<div id="evQr" class="qrgrid"><p class="st__sub">Loading…</p></div>', true);
  },
  confirmations() {
    return card('Registrations', '<span class="chip" id="evRsvpCount">…</span>',
      '<div id="evRsvps" class="evt"><p class="st__sub">Loading…</p></div>', true);
  },
  eventcontent() {
    ensureEventContent();
    return card('Event facts', '<span class="chip">Live page</span>',
      '<div class="f__row3">' +
      field('Date — long (When bar)', 'event.dateLabel', C.event.dateLabel) +
      field('Date — short (hero meta)', 'event.dateShort', C.event.dateShort) +
      field('Doors / start time', 'event.doors', C.event.doors) +
      '</div>' +
      field('Venue', 'event.venue', C.event.venue) +
      field('Google Maps link', 'event.mapUrl', C.event.mapUrl) +
      '<div class="f__row">' +
      field('Countdown target (ISO, +05:45)', 'event.start', C.event.start) +
      field('Event end (ISO, +05:45)', 'event.end', C.event.end) +
      '</div>' +
      field('Teaser video URL (.mp4 — enables Play Video)', 'event.videoUrl', C.event.videoUrl), true) +
    card('Copy', '<span class="chip">Text</span>',
      field('Eyebrow (personalized greeting)', 'event.eyebrow', C.event.eyebrow) +
      field('Generic headline', 'event.genericTitle', C.event.genericTitle) +
      field('Seat note', 'event.seatNote', C.event.seatNote, 'area'), true);
  },
  audiences() {
    return C.audiences.map((a, i) =>
      card(a.name, '<span class="chip">Card ' + (i + 1) + '</span>',
        '<div class="f__row">' +
        field('Audience name', 'audiences.' + i + '.name', a.name) +
        field('Card title', 'audiences.' + i + '.title', a.title) +
        '</div>' +
        field('Body', 'audiences.' + i + '.body', a.body, 'area') +
        imgField('Card image (optional — replaces the phone mockup)', 'audiences.' + i + '.img', a.img || '')
      )).join('');
  },
  workflow() {
    return C.workflow.map((s, i) =>
      card(String(i + 1).padStart(2, '0') + ' — ' + s.title, '',
        '<div class="f__row">' +
        field('Step title', 'workflow.' + i + '.title', s.title) +
        field('Caption', 'workflow.' + i + '.caption', s.caption) +
        '</div>' +
        imgField('Step image (optional — replaces the illustration)', 'workflow.' + i + '.img', s.img || '')
      )).join('');
  },
  agents() {
    return C.agents.map((a, i) =>
      card(a.title, a.media ? '<span class="chip chip--lime">Custom media</span>' : '<span class="chip">Mock UI</span>',
        field('Title', 'agents.' + i + '.title', a.title) +
        field('Body', 'agents.' + i + '.body', a.body, 'area') +
        imgField('Card media (optional — image, GIF, or .mp4/.webm — replaces the mock UI)', 'agents.' + i + '.media', a.media || '')
      )).join('');
  },
  faq() {
    const groups = [['brands', 'Brands'], ['influencers', 'Influencers'], ['agency', 'Agency'], ['ugc', 'UGC Creators']];
    return groups.map(([key, label]) =>
      card(label, '<span class="chip">' + C.faq[key].length + ' questions</span>',
        C.faq[key].map((qa, i) =>
          '<div class="qa"><div class="qa__top"><button class="qa__del" data-del-faq="' + key + ':' + i + '">Remove</button></div>' +
          field('Question', 'faq.' + key + '.' + i + '.0', qa[0]) +
          field('Answer', 'faq.' + key + '.' + i + '.1', qa[1], 'area') +
          '</div>'
        ).join('') +
        '<div class="rowbtns"><button class="btn-ghost" data-add-faq="' + key + '">+ Add question</button></div>'
      )).join('');
  },
  settings() {
    return card('App distribution', '<span class="chip">Singleton</span>',
      field('App Store URL', 'settings.appStoreUrl', C.settings.appStoreUrl) +
      field('Play Store URL', 'settings.playStoreUrl', C.settings.playStoreUrl) +
      field('QR link (encoded in the download QR)', 'settings.qrLink', C.settings.qrLink), true);
  }
};

function render() {
  const [t, sub] = TITLES[current];
  crumb.textContent = t;
  body.innerHTML = '<h1 class="st__h1">' + t + '</h1><p class="st__sub">' + sub + '</p>' + RENDER[current]();
  mountEditors();
  if (['guestlist', 'qrlinks', 'confirmations'].indexOf(current) >= 0) loadEventData();
  if (current === 'overview') loadOverview();
}

/* ---------- Launch Event: data + views ---------- */
function ensureEventContent() {
  if (!C.event) C.event = {};
  const d = {
    dateLabel: 'Wednesday, 23 Sep 2026', dateShort: 'Sep 23, 2026', doors: '17:25',
    venue: 'The Plaza, Pulchowk (Ballrooms 2 & 3)', mapUrl: 'https://maps.google.com/?q=The+Plaza+Pulchowk+Lalitpur',
    start: '2026-09-23T17:25:00+05:45', end: '2026-09-23T21:25:00+05:45', videoUrl: '',
    eyebrow: 'You are invited to experience the launch of our premium product',
    genericTitle: 'Launch Night',
    seatNote: 'Guests are kindly requested to be seated by 18:40 in the event Ballrooms 2 & 3.'
  };
  Object.keys(d).forEach((k) => { if (C.event[k] == null) C.event[k] = d[k]; });
}
const GSTATUSES = ['listed', 'invited', "rsvp'd", 'checkin', 'no-show', 'cancelled'];
const GLABELS = { listed: 'Listed', invited: 'Invited', "rsvp'd": "RSVP'd", checkin: 'Checked in', 'no-show': 'No-show', cancelled: 'Cancelled' };
function guestStatus(g, hasRsvp) {
  if (g.status === 'checkin' || g.status === 'no-show' || g.status === 'cancelled') return g.status;
  if (hasRsvp) return "rsvp'd";
  if (g.status === 'invited' || g.checked) return 'invited';
  return g.status || 'listed';
}
let _guests = [];
let _byCode = {};
let _statusFilter = 'all';
function renderGuestTable() {
  const tb = document.getElementById('evGuests');
  if (!tb) return;
  const q = (document.getElementById('evSearch') || {}).value || '';
  const needle = q.trim().toLowerCase();
  const rows = _guests.filter((g) => {
    const st = guestStatus(g, !!_byCode[g.code]);
    if (_statusFilter !== 'all' && st !== _statusFilter) return false;
    if (needle && !((g.name + ' ' + (g.org || '') + ' ' + g.code).toLowerCase().includes(needle))) return false;
    return true;
  });
  tb.innerHTML = rows.length ? rows.map((g) => {
    const st = guestStatus(g, !!_byCode[g.code]);
    return '<tr>' +
      '<td class="gt-who"><strong>' + esc(g.name) + '</strong><span>' + esc([g.role, g.org].filter(Boolean).join(' · ') || '—') + '</span></td>' +
      '<td class="gt-code"><span>' + esc(g.code) + '</span><button class="btn-ghost btn-mini" data-copy-link="' + esc(g.link) + '">Copy link</button></td>' +
      '<td><span class="badge badge--' + st.replace(/[^a-z]/g, '') + '">' + GLABELS[st] + '</span></td>' +
      '<td class="gt-acts">' +
      (st === 'checkin'
        ? '<span class="badge badge--checkin">✓ In</span>'
        : '<button class="btn-solid btn-mini" data-checkin="' + esc(g.code) + '">Check in</button>') +
      '<select class="gt-status" data-setstatus="' + esc(g.code) + '">' +
      '<option value="">Set status…</option>' +
      GSTATUSES.map((s) => '<option value="' + s + '"' + (g.status === s ? ' selected' : '') + '>' + GLABELS[s] + '</option>').join('') +
      '</select>' +
      '<button class="btn-ghost btn-mini btn-danger" data-del-guest="' + esc(g.code) + '">✕</button>' +
      '</td></tr>';
  }).join('') : '<tr><td colspan="4" class="st__sub" style="padding:18px">' + (_guests.length ? 'No guests match.' : 'No guests yet — add one above, or use Bulk import below.') + '</td></tr>';
  const chips = document.getElementById('evChips');
  if (chips) {
    const counts = { all: _guests.length };
    GSTATUSES.forEach((s) => { counts[s] = 0; });
    _guests.forEach((g) => { counts[guestStatus(g, !!_byCode[g.code])]++; });
    chips.innerHTML = ['all'].concat(GSTATUSES).map((s) =>
      '<button class="fchip' + (_statusFilter === s ? ' is-on' : '') + '" data-filter="' + s + '">' +
      (s === 'all' ? 'All' : GLABELS[s]) + ' <em>' + (counts[s] || 0) + '</em></button>'
    ).join('');
  }
}
async function fetchEventData() {
  const [gj, rj] = await Promise.all([
    fetch('/api/guests', { headers: authHeaders() }).then((r) => { if (r.status === 401) toLogin(); return r.json(); }),
    fetch('/api/rsvp', { headers: authHeaders() }).then((r) => r.json())
  ]);
  return { guests: (gj && gj.guests) || [], rsvps: (rj && rj.rsvps) || [], seats: (rj && rj.seats) || 0 };
}
async function loadOverview() {
  try {
    const { guests, rsvps, seats } = await fetchEventData();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const invitedConfirmed = rsvps.filter((r) => r.code).length;
    const walkins = rsvps.length - invitedConfirmed;
    const faceOpt = rsvps.filter((r) => r.faceOptIn || r.face).length;
    const faceDone = rsvps.filter((r) => r.face === 'enrolled' || r.face === 'captured').length;
    set('ovGuests', guests.length);
    set('ovChecked', guests.filter((g) => g.checked).length + ' checked');
    set('ovRsvps', rsvps.length);
    set('ovRate', guests.length ? Math.round((invitedConfirmed / guests.length) * 100) + '% of invited' : '—');
    set('ovSeats', seats || rsvps.length);
    set('ovWalkins', walkins + ' walk-in' + (walkins === 1 ? '' : 's'));
    set('ovFace', faceOpt);
    set('ovFaceNote', faceDone + ' captured');
    set('ovDays', Math.max(0, Math.ceil((new Date('2026-09-23T17:25:00+05:45') - Date.now()) / 864e5)));
    set('ovActCount', rsvps.length + ' total');
    const pct = guests.length ? Math.min(100, Math.round((invitedConfirmed / guests.length) * 100)) : 0;
    const bar = document.getElementById('ovBar');
    if (bar) bar.style.width = pct + '%';
    set('ovProgNote', invitedConfirmed + ' of ' + guests.length + ' invited guests confirmed (' + pct + '%). Walk-ins excluded.');
    const act = document.getElementById('ovAct');
    if (act) {
      const recent = rsvps.slice().reverse().slice(0, 10);
      act.innerHTML = recent.length ? recent.map((r) =>
        '<div class="ov-act__row"><span class="ov-act__dot"></span><span><strong>' + esc(r.name) + '</strong> registered' +
        (r.org ? ' · ' + esc(r.org) : '') + ((r.seats || 1) > 1 ? ' · ' + r.seats + ' seats' : '') +
        (r.faceOptIn ? ' · Face ID' : '') + '</span><time>' + esc(String(r.at || '').slice(0, 10)) + '</time></div>'
      ).join('') : '<p class="st__sub">No registrations yet — they appear here the moment guests confirm.</p>';
    }
  } catch (e) {}
}
async function loadEventData() {
  const gEl = document.getElementById('evGuests');
  const qEl = document.getElementById('evQr');
  const rEl = document.getElementById('evRsvps');
  try {
    const [gj, rj] = await Promise.all([
      fetch('/api/guests', { headers: authHeaders() }).then((r) => { if (r.status === 401) toLogin(); return r.json(); }),
      fetch('/api/rsvp', { headers: authHeaders() }).then((r) => r.json())
    ]);
    const guests = (gj && gj.guests) || [];
    const rsvps = (rj && rj.rsvps) || [];
    const byCode = {};
    rsvps.forEach((r) => { if (r.code) byCode[r.code] = r; });
    const gc = document.getElementById('evGuestCount');
    if (gc) gc.textContent = guests.length + ' guests';
    const rc = document.getElementById('evRsvpCount');
    if (rc) rc.textContent = rsvps.length + ' registered · ' + (rj.seats || rsvps.length) + ' seats';
    if (gEl) {
      _guests = guests;
      _byCode = byCode;
      renderGuestTable();
      const q = document.getElementById('evSearch');
      if (q && !q.dataset.wired) {
        q.dataset.wired = '1';
        q.addEventListener('input', renderGuestTable);
      }
    }
    if (qEl) {
      qEl.innerHTML = guests.length ? guests.map((g) =>
        '<div class="qrcard">' +
        '<img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=2&data=' + encodeURIComponent(g.link) + '" alt="QR for ' + esc(g.name) + '" loading="lazy" />' +
        '<strong>' + esc(g.name) + '</strong><span>' + esc(g.code) + '</span>' +
        '<button class="btn-ghost" data-copy-link="' + esc(g.link) + '">Copy link</button></div>'
      ).join('') : '<p class="st__sub">No guests yet — create them in Guest list first.</p>';
    }
    if (rEl) {
      rEl.innerHTML = rsvps.length ? rsvps.map((r) =>
        '<div class="evt__row evt__row--slim"><div class="evt__who"><strong>' + esc(r.name) + '</strong><span>' + esc(r.org || '—') + (r.contact ? ' · ' + esc(r.contact) : '') + '</span></div>' +
        '<div class="evt__acts">' +
        (r.face === 'enrolled' ? '<span class="chip chip--ok">Face ID ✓</span>' : r.face === 'captured' ? '<span class="chip">Face captured</span>' : r.faceOptIn ? '<span class="chip">Face opt-in</span>' : '') +
        '<span class="chip">' + (r.seats || 1) + ' seat' + ((r.seats || 1) > 1 ? 's' : '') + '</span>' +
        '<span class="chip">' + (r.code ? 'Invited guest' : 'Walk-in') + '</span></div></div>'
      ).join('') : '<p class="st__sub">No registrations yet.</p>';
    }
  } catch (e) {
    if (gEl) gEl.innerHTML = '<p class="st__sub">Could not load — check your connection and refresh.</p>';
    if (qEl) qEl.innerHTML = '';
    if (rEl) rEl.innerHTML = '';
  }
}

function setPath(path, value) {
  const keys = path.split('.');
  let o = C;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
  o[keys[keys.length - 1]] = value;
}

/* pages -> sections */
const PAGES = {
  home: [['hero', '◇', 'Hero'], ['audiences', '◎', 'Audiences'], ['features', '▦', 'Core Features'], ['workflow', '≡', 'Workflow'], ['agents', '✦', 'AI Agents'], ['cta', '▢', 'Download CTA']],
  blog: [['posts', '✎', 'Posts']],
  site: [['faq', '?', 'FAQ'], ['footer', '▁', 'Footer & Promo'], ['settings', '⚙', 'Settings']]
};
const stPage = document.getElementById('stPage');
function renderNav(page, active) {
  document.getElementById('stNav').innerHTML = PAGES[page].map(([col, icon, label], i) =>
    '<button' + ((active ? col === active : i === 0) ? ' class="is-active"' : '') + ' data-col="' + col + '"><i>' + icon + '</i>' + label + '</button>'
  ).join('');
}
stPage.addEventListener('change', () => {
  current = PAGES[stPage.value][0][0];
  renderNav(stPage.value, current);
  render();
});
renderNav('home');

/* events */
document.getElementById('stNav').parentElement.addEventListener('click', (e) => {
  const b = e.target.closest('[data-col]');
  if (!b) return;
  document.querySelectorAll('.st__nav button').forEach((x) => x.classList.toggle('is-active', x === b));
  current = b.dataset.col;
  render();
});
body.addEventListener('input', (e) => {
  const p = e.target.dataset.path;
  if (!p) return;
  setPath(p, e.target.value);
  const prev = body.querySelector('[data-prev="' + p + '"]');
  if (prev) prev.style.backgroundImage = 'url("' + e.target.value + '")';
  markDirty();
});
body.addEventListener('change', async (e) => {
  const ss = e.target.dataset.setstatus;
  if (ss) {
    const v = e.target.value;
    if (!v) return;
    fetch('/api/guests', { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify({ code: ss, status: v }) })
      .then((r) => r.json()).then((j) => {
        if (!j.ok) throw new Error();
        const g = _guests.find((x) => x.code === ss);
        if (g) g.status = v;
        renderGuestTable();
      }).catch(() => showToast('Could not save status'));
    return;
  }
  const cg = e.target.dataset.checkGuest;
  if (cg) {
    const on = e.target.checked;
    e.target.closest('.evt__row').classList.toggle('is-checked', on);
    fetch('/api/guests', { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify({ code: cg, checked: on }) })
      .then((r) => r.json()).then((j) => { if (!j.ok) throw new Error(); })
      .catch(() => { showToast('Could not save the check'); e.target.checked = !on; e.target.closest('.evt__row').classList.toggle('is-checked', !on); });
    return;
  }
  const up = e.target.dataset.upload;
  if (!up || !e.target.files || !e.target.files[0]) return;
  const f = e.target.files[0];
  const wrap = e.target.closest('.imgf__up');
  wrap.classList.add('is-busy');
  try {
    const r = await fetch('/api/upload?name=' + encodeURIComponent(f.name), { method: 'POST', headers: authHeaders(), body: f });
    if (r.status === 401) { toLogin(); return; }
    const data = await r.json();
    if (!data.ok) throw new Error();
    setPath(up, data.url);
    const inp = body.querySelector('input[data-path="' + up + '"]');
    if (inp) inp.value = data.url;
    const prev = body.querySelector('[data-prev="' + up + '"]');
    if (prev) prev.style.backgroundImage = 'url("' + data.url + '")';
    markDirty();
    showToast('Uploaded ' + f.name);
  } catch (err) {
    showToast('Upload failed');
  }
  wrap.classList.remove('is-busy');
});
body.addEventListener('click', (e) => {
  const tgl = e.target.closest('[data-feat]');
  if (tgl) {
    const i = Number(tgl.dataset.feat);
    C.posts[i].featured = !C.posts[i].featured;
    tgl.classList.toggle('is-on', C.posts[i].featured);
    markDirty();
    return;
  }
  const head = e.target.closest('.card__head');
  if (head) { head.parentElement.classList.toggle('is-open'); return; }
  if (e.target.id === 'addPost') {
    C.posts.push({ slug: 'new-post-' + Date.now().toString(36), title: 'Untitled post', category: 'Guides', date: 'Sep 2026', read: '4 Min Read', img: C.posts[0] ? C.posts[0].img : '', excerpt: '', body: '', featured: false });
    markDirty(); render(); return;
  }
  if (e.target.dataset.delPost !== undefined) {
    C.posts.splice(Number(e.target.dataset.delPost), 1);
    markDirty(); render(); return;
  }
  if (e.target.id === 'evAdd') {
    const name = document.getElementById('evName').value.trim();
    const org = document.getElementById('evOrg').value.trim();
    const role = document.getElementById('evRole').value.trim();
    if (!name) { showToast('Guest name required'); return; }
    e.target.disabled = true;
    fetch('/api/guests', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify({ name, org, role }) })
      .then((r) => r.json()).then((j) => {
        if (!j.ok) throw new Error();
        showToast('Invite created for ' + name);
        loadEventData();
        document.getElementById('evName').value = '';
        document.getElementById('evOrg').value = '';
      }).catch(() => showToast('Could not create invite'))
      .finally(() => { e.target.disabled = false; });
    return;
  }
  const go = e.target.closest('[data-goto]');
  if (go) {
    current = go.dataset.goto;
    document.querySelectorAll('.st__nav button').forEach((x) => x.classList.toggle('is-active', x.dataset.col === current));
    render();
    return;
  }
  const fc = e.target.closest('[data-filter]');
  if (fc) {
    _statusFilter = fc.dataset.filter;
    renderGuestTable();
    return;
  }
  const ci = e.target.closest('[data-checkin]');
  if (ci) {
    const code = ci.dataset.checkin;
    ci.disabled = true;
    fetch('/api/guests', { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify({ code, status: 'checkin' }) })
      .then((r) => r.json()).then((j) => {
        if (!j.ok) throw new Error();
        const g = _guests.find((x) => x.code === code);
        if (g) g.status = 'checkin';
        showToast((g ? g.name : 'Guest') + ' checked in ✓');
        renderGuestTable();
      }).catch(() => { showToast('Could not check in'); ci.disabled = false; });
    return;
  }
  if (e.target.id === 'evQrPack') {
    buildQrPack(e.target);
    return;
  }
  if (e.target.id === 'evBulkGo') {
    const lines = document.getElementById('evBulk').value.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) { showToast('Paste the guest list first'); return; }
    const bulk = lines.map((l) => {
      const [name, org, role] = l.split(',').map((x) => (x || '').trim());
      return { name, org, role };
    });
    e.target.disabled = true;
    e.target.textContent = 'Creating ' + bulk.length + '…';
    fetch('/api/guests', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()),
      body: JSON.stringify({
        bulk,
        prefix: document.getElementById('evPrefix').value.trim(),
        start: parseInt(document.getElementById('evStart').value, 10) || 1,
        randomTail: document.getElementById('evTail').checked
      })
    }).then((r) => r.json()).then((j) => {
      if (!j.ok) throw new Error();
      showToast('Created ' + j.created + ' invites');
      document.getElementById('evBulk').value = '';
      loadEventData();
    }).catch(() => showToast('Bulk import failed'))
      .finally(() => { e.target.disabled = false; e.target.textContent = 'Create all invites'; });
    return;
  }
  if (e.target.id === 'evExport') {
    fetch('/api/guests', { headers: authHeaders() }).then((r) => r.json()).then((j) => {
      const rows = [['name', 'organization', 'role', 'status', 'code', 'link', 'qr_print_url']];
      (j.guests || []).forEach((g) => rows.push([
        g.name, g.org || '', g.role || '', g.status || (g.checked ? 'invited' : 'listed'), g.code, g.link,
        'https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&margin=2&data=' + encodeURIComponent(g.link)
      ]));
      const csv = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'inmark-launch-guests.csv';
      a.click();
      URL.revokeObjectURL(a.href);
    });
    return;
  }
  const cp = e.target.closest('[data-copy-link]');
  if (cp) {
    navigator.clipboard.writeText(cp.dataset.copyLink).then(() => showToast('Link copied'));
    return;
  }
  const dg = e.target.closest('[data-del-guest]');
  if (dg) {
    if (!confirm('Remove this guest and their invite link?')) return;
    fetch('/api/guests?c=' + encodeURIComponent(dg.dataset.delGuest), { method: 'DELETE', headers: authHeaders() })
      .then(() => { showToast('Guest removed'); loadEventData(); });
    return;
  }
  if (e.target.dataset.addFaq) {
    C.faq[e.target.dataset.addFaq].push(['New question?', '']);
    markDirty(); render(); return;
  }
  if (e.target.dataset.delFaq) {
    const [k, i] = e.target.dataset.delFaq.split(':');
    C.faq[k].splice(Number(i), 1);
    markDirty(); render(); return;
  }
});
document.getElementById('stPublish').addEventListener('click', async () => {
  const btn = document.getElementById('stPublish');
  btn.disabled = true;
  try {
    const r = await fetch('/api/content', { method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, authHeaders()), body: JSON.stringify(C) });
    if (r.status === 401) { toLogin(); return; }
    if (r.status === 501) { showToast('Connect a Blob store to the Vercel project first'); btn.disabled = false; return; }
    if (!r.ok) throw new Error('save failed');
    markSaved();
    showToast('Published — the live site is updated');
  } catch (e) {
    showToast('Could not publish — is the InMark server running?');
  }
  btn.disabled = false;
});
addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });

/* boot */
fetch('/api/content').then((r) => r.json()).then((data) => { C = data; render(); markSaved(); })
  .catch(() => { body.innerHTML = '<p class="st__sub">Could not load content — run the site through <code>node server.js</code> (the "inmark" preview), not a plain static server.</p>'; });

const so = document.getElementById('stSignout');
if (so) so.addEventListener('click', (e) => { e.preventDefault(); toLogin(); });


/* ---------- sidebar search -> guest list ---------- */
document.getElementById('stSearch').addEventListener('input', (e) => {
  const v = e.target.value;
  if (current !== 'guestlist') {
    current = 'guestlist';
    document.querySelectorAll('.st__nav button').forEach((x) => x.classList.toggle('is-active', x.dataset.col === 'guestlist'));
    render();
  }
  const apply = () => {
    const q = document.getElementById('evSearch');
    if (!q) { setTimeout(apply, 250); return; }
    q.value = v;
    q.dispatchEvent(new Event('input'));
  };
  apply();
});

/* ---------- CSV / XLSX guest-list upload -> fills the bulk box ---------- */
body.addEventListener('change', (e) => {
  if (e.target.id !== 'evFile' || !e.target.files || !e.target.files[0]) return;
  const f = e.target.files[0];
  const done = (rows) => {
    // drop a header row if it looks like one
    if (rows.length && /name/i.test(String(rows[0][0] || ''))) rows = rows.slice(1);
    const lines = rows
      .filter((r) => String(r[0] || '').trim())
      .map((r) => [r[0], r[1], r[2]].map((x) => String(x == null ? '' : x).trim()).filter((x, i) => i === 0 || x).join(', '));
    const box = document.getElementById('evBulk');
    box.value = lines.join('\n');
    showToast('Loaded ' + lines.length + ' guests from ' + f.name + ' — review, then press Create all invites');
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  if (/\.(xlsx|xls)$/i.test(f.name)) {
    if (!window.XLSX) { showToast('Spreadsheet reader still loading — try again'); return; }
    const rd = new FileReader();
    rd.onload = () => {
      const wb = XLSX.read(rd.result, { type: 'array' });
      done(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }));
    };
    rd.readAsArrayBuffer(f);
  } else {
    const rd = new FileReader();
    rd.onload = () => {
      const rows = String(rd.result).split(/\r?\n/).map((line) => {
        const cells = [];
        let cur = '', inQ = false;
        for (const ch of line) {
          if (ch === '"') inQ = !inQ;
          else if (ch === ',' && !inQ) { cells.push(cur); cur = ''; }
          else cur += ch;
        }
        cells.push(cur);
        return cells;
      });
      done(rows);
    };
    rd.readAsText(f);
  }
  e.target.value = '';
});
['dragover', 'dragleave', 'drop'].forEach((ev) => body.addEventListener(ev, (e) => {
  const drop = e.target.closest && e.target.closest('#evDrop');
  if (!drop) return;
  e.preventDefault();
  drop.classList.toggle('is-over', ev === 'dragover');
  if (ev === 'drop' && e.dataTransfer.files[0]) {
    const inp = document.getElementById('evFile');
    inp.files = e.dataTransfer.files;
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }
}));

/* ---------- QR card pack: one PNG per guest (QR + name + organization) ---------- */
async function buildQrPack(btn) {
  if (!window.JSZip || !window.qrcode) { showToast('QR tools still loading — try again in a moment'); return; }
  btn.disabled = true;
  try {
    const { guests } = await fetchEventData();
    if (!guests.length) { showToast('No guests yet'); return; }
    const zip = new JSZip();
    for (let i = 0; i < guests.length; i++) {
      const g = guests[i];
      btn.textContent = 'Building ' + (i + 1) + '/' + guests.length + '…';
      const q = window.qrcode(0, 'M');
      q.addData(g.link);
      q.make();
      const img = new Image();
      await new Promise((res) => { img.onload = res; img.src = q.createDataURL(16, 4); });
      const c = document.createElement('canvas');
      c.width = 1000; c.height = 1240;
      const x = c.getContext('2d');
      x.fillStyle = '#ffffff';
      x.fillRect(0, 0, 1000, 1240);
      x.imageSmoothingEnabled = false;
      x.drawImage(img, 120, 80, 760, 760);
      x.fillStyle = '#141415';
      x.textAlign = 'center';
      let fs = 56;
      x.font = '700 ' + fs + 'px Inter, sans-serif';
      while (x.measureText(g.name).width > 860 && fs > 26) { fs -= 2; x.font = '700 ' + fs + 'px Inter, sans-serif'; }
      x.fillText(g.name, 500, 950);
      x.fillStyle = '#6a6a72';
      x.font = '400 38px Inter, sans-serif';
      const orgLine = [g.role, g.org].filter(Boolean).join(' · ');
      if (orgLine) x.fillText(orgLine.length > 46 ? orgLine.slice(0, 45) + '…' : orgLine, 500, 1010);
      x.font = '500 26px ui-monospace, monospace';
      x.fillStyle = '#9a9aa2';
      x.fillText(g.code, 500, 1080);
      x.fillStyle = '#141415';
      x.font = '600 30px Inter, sans-serif';
      x.fillText('Inmark Launch Night · Sep 23, 2026', 500, 1160);
      const blob = await new Promise((res) => c.toBlob(res, 'image/png'));
      const safe = (g.name || 'guest').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      zip.file(g.code + '--' + safe + '.png', blob);
    }
    btn.textContent = 'Zipping…';
    const out = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(out);
    a.download = 'inmark-launch-qr-cards.zip';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('QR pack downloaded — one card per guest');
  } catch (e) {
    showToast('Could not build the QR pack');
  }
  btn.disabled = false;
  btn.textContent = 'Download all QR cards (.zip)';
}
