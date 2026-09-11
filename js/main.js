/* InMark website interactions */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (REDUCED) document.documentElement.classList.add('reduced-motion');

/* ---------- CMS hydration (window.INMARK_CONTENT injected by server.js) ---------- */
const CMS = window.INMARK_CONTENT || null;
(function hydrateCMS() {
  if (!CMS) return;
  const set = (sel, txt) => { const el = document.querySelector(sel); if (el && txt != null) el.textContent = txt; };
  if (CMS.hero) {
    const line1 = document.querySelectorAll('.hero__line')[0];
    if (line1) {
      const nodes = Array.from(line1.childNodes);
      const texts = nodes.filter((n) => n.nodeType === 3);
      if (texts[0] && CMS.hero.line1Pre) texts[0].textContent = CMS.hero.line1Pre + ' ';
      if (texts[1] && CMS.hero.line1Post) texts[1].textContent = ' ' + CMS.hero.line1Post;
    }
    set('.hero__line:nth-child(2)', CMS.hero.line2);
    set('.hero__sub', CMS.hero.sub);
    set('.hero__cta .btn-go__label', CMS.hero.cta);
  }
  (CMS.audiences || []).forEach((a, i) => {
    const cardEl = document.querySelectorAll('.aud-card')[i];
    if (!cardEl) return;
    const eyebrow = cardEl.querySelector('.aud-card__eyebrow');
    if (eyebrow) eyebrow.innerHTML = '<span class="aud-num">' + (i + 1) + '</span> ' + a.name;
    const t = cardEl.querySelector('.aud-card__title');
    if (t) t.textContent = a.title;
    const b = cardEl.querySelector('.aud-card__body');
    if (b) b.textContent = a.body;
  });
  const audTabsEls = document.querySelectorAll('.audiences .tab');
  (CMS.workflow || []).forEach((s, i) => {
    const cardEl = document.querySelectorAll('.wf-card')[i];
    if (!cardEl) return;
    const t = cardEl.querySelector('.h4');
    if (t) t.textContent = s.title;
    const c = cardEl.querySelector('.wf-card__caption');
    if (c) c.textContent = s.caption;
  });
  (CMS.agents || []).forEach((a, i) => {
    const cardEl = document.querySelectorAll('.agent-card')[i];
    if (!cardEl) return;
    const t = cardEl.querySelector('.agent-card__title');
    if (t) t.textContent = a.title;
    const b = cardEl.querySelector('.body-sm');
    if (b) b.textContent = a.body;
    if (a.media) {
      const art = cardEl.querySelector('.agent-card__art');
      if (art) {
        art.classList.add('agent-card__art--media');
        art.innerHTML = /\.(mp4|webm)(\?|$)/i.test(a.media)
          ? '<video src="' + a.media + '" autoplay muted loop playsinline></video>'
          : '<img src="' + a.media + '" alt="" loading="lazy" />';
      }
    }
  });
  if (CMS.posts && CMS.posts.length) {
    const track = document.getElementById('blogTrack');
    if (track) {
      const pinned = CMS.posts.filter((p) => p.featured);
      track.innerHTML = (pinned.length ? pinned : CMS.posts).slice(0, 4).map((p) =>
        '<a class="blog-card" href="blog-post.html?p=' + p.slug + '">' +
        '<figure><img src="' + p.img + '" alt="" loading="lazy" /></figure>' +
        '<h3>' + p.title + '</h3>' +
        '<p class="blog-card__meta">' + p.date + ' &nbsp;\u2022&nbsp; ' + p.read + '</p></a>'
      ).join('');
    }
  }
  // hero media: photos, and the chip/pill media (image or video)
  if (CMS.hero && CMS.hero.images) {
    ['--tl', '--bl', '--tr', '--br', '--bottom'].forEach((mod, i) => {
      const im = document.querySelector('.hero__card' + mod + ' img');
      if (im && CMS.hero.images[i]) im.src = CMS.hero.images[i];
    });
  }
  if (CMS.hero && CMS.hero.media) {
    const isVideo = /\.(mp4|webm)(\?|$)/i.test(CMS.hero.media);
    const chipImg = document.querySelector('#heroChip img');
    const bandImg = document.getElementById('bandImg');
    if (isVideo) {
      [['#heroChip img', 'chip'], ['#bandImg', 'band']].forEach(([sel]) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const v = document.createElement('video');
        v.src = CMS.hero.media;
        v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
        v.setAttribute('playsinline', '');
        if (el.id) v.id = el.id;
        v.className = el.className;
        el.replaceWith(v);
      });
    } else {
      if (chipImg) chipImg.src = CMS.hero.media.replace('w=1800', 'w=300');
      if (bandImg) bandImg.src = CMS.hero.media;
    }
  }
  // audiences: optional image replaces the phone mockup
  (CMS.audiences || []).forEach((a, i) => {
    if (!a.img) return;
    const phone = document.querySelectorAll('.aud-card')[i]?.querySelector('.aud-card__phone');
    if (phone) phone.innerHTML = '<img class="aud-card__img" src="' + a.img + '" alt="" loading="lazy" />';
  });
  // workflow: optional image replaces the illustration
  (CMS.workflow || []).forEach((s, i) => {
    const cardEl = document.querySelectorAll('.wf-card')[i];
    if (!cardEl || !s.img) return;
    const im = cardEl.querySelector('img');
    if (im) im.src = s.img;
    else {
      const illo = cardEl.querySelector('.wf-card__illo');
      if (illo) illo.outerHTML = '<img src="' + s.img + '" alt="" loading="lazy" />';
    }
  });
  // core features + invite panel
  (CMS.features || []).forEach((f, i) => {
    const cardEl = document.querySelectorAll('.fcard')[i];
    if (!cardEl) return;
    const t = cardEl.querySelector('.title-md');
    if (t) t.textContent = f.title;
    const b = cardEl.querySelector('.fcard__body p');
    if (b) b.textContent = f.body;
  });
  if (CMS.invitePanel) {
    const ip = CMS.invitePanel;
    const set2 = (sel, v) => { const el = document.querySelector(sel); if (el && v != null) el.textContent = v; };
    set2('.invite-panel__title', ip.title);
    set2('.invite-panel__who strong', ip.name);
    set2('.invite-panel__who span', ip.handle);
    set2('.invite-panel__meta strong', ip.followers);
    const av = document.querySelector('.invite-panel__avatar');
    if (av && ip.avatar) av.src = ip.avatar;
    const thumbs = document.querySelectorAll('.invite-panel__thumbs img');
    [ip.thumb1, ip.thumb2, ip.thumb3].forEach((u, i) => { if (thumbs[i] && u) thumbs[i].src = u; });
  }
  // download CTA
  if (CMS.cta) {
    const c2 = CMS.cta;
    const h2 = document.querySelector('.cta__copy .h2');
    if (h2 && c2.titleA) h2.innerHTML = c2.titleA + '<br />' + c2.titleB;
    const sub2 = document.querySelector('.cta__copy .body-md');
    if (sub2 && c2.sub) sub2.textContent = c2.sub;
    const tryEl = document.querySelector('.cta__try');
    if (tryEl && c2.tryLine) tryEl.textContent = c2.tryLine;
    const checks = document.querySelectorAll('.cta .checks--dark li');
    [c2.check1, c2.check2, c2.check3].forEach((t, i) => { if (checks[i] && t) checks[i].textContent = t; });
    const btns = document.querySelectorAll('.cta__buttons .btn');
    if (btns[0] && c2.btnPrimary) btns[0].textContent = c2.btnPrimary;
    if (btns[1] && c2.btnSecondary) btns[1].textContent = c2.btnSecondary;
    const illo = document.querySelector('.cta__illo-img');
    if (illo && c2.illustration) illo.src = c2.illustration;
  }
  // promo cards + footer lines
  (CMS.promo || []).forEach((p, i) => {
    const cardEl = document.querySelectorAll('.promo-card')[i];
    if (!cardEl) return;
    const t = cardEl.querySelector('.h5');
    if (t) t.textContent = p.title;
    const l = cardEl.querySelector('.btn-go__label');
    if (l) l.textContent = p.cta;
  });
  if (CMS.footer) {
    const tg = document.querySelector('.footer__tagline');
    if (tg && CMS.footer.tagline) tg.textContent = CMS.footer.tagline;
    const cp = document.querySelector('.footer__copyright');
    if (cp && CMS.footer.copyright) cp.textContent = CMS.footer.copyright;
  }
  if (CMS.settings && CMS.settings.qrLink) {
    const qr = document.querySelector('.cta__qr');
    if (qr) {
      qr.href = CMS.settings.qrLink;
      const img = qr.querySelector('img');
      if (img) img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=' + encodeURIComponent(CMS.settings.qrLink);
    }
  }
})();

/* ---------- Preloader: the brand line draws as a wave, then the curtain lifts ---------- */
(function preloader() {
  const loader = document.getElementById('loader');
  if (!loader) return;
  const countEl = document.getElementById('loaderCount');
  if (REDUCED) {
    loader.remove();
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready', 'is-settled');
    document.querySelector('.hero')?.classList.add('sq-draw');
    return;
  }
  // repeat visits within the session skip the full loading ceremony
  let returning = false;
  try { returning = sessionStorage.getItem('inmark-loaded') === '1'; } catch (e) {}
  if (returning) {
    loader.remove();
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    setTimeout(() => document.querySelector('.hero')?.classList.add('sq-draw'), 400);
    setTimeout(() => document.body.classList.add('is-settled'), 2300);
    return;
  }
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    try { sessionStorage.setItem('inmark-loaded', '1'); } catch (e) {}
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    // hand the line over: the hero squiggle starts drawing as the curtain clears
    setTimeout(() => document.querySelector('.hero')?.classList.add('sq-draw'), 300);
    setTimeout(() => loader.remove(), 1100);
    // once the entrance choreography lands, drop the delays so hovers feel immediate
    setTimeout(() => document.body.classList.add('is-settled'), 2600);
  };
  const MIN = 2300;
  const start = performance.now();
  let loaded = document.readyState === 'complete';
  if (!loaded) window.addEventListener('load', () => { loaded = true; }, { once: true });
  setTimeout(() => { loaded = true; }, 5000); // never trap the visitor behind a slow asset
  let shown = 0;
  const step = (now) => {
    const elapsed = now - start;
    const target = loaded && elapsed >= MIN ? 100 : Math.min(93, (elapsed / MIN) * 93);
    shown += (target - shown) * 0.09;
    if (countEl) countEl.textContent = String(Math.round(shown));
    if (shown >= 99.4) {
      if (countEl) countEl.textContent = '100';
      done();
      return;
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
})();

/* ---------- Mobile nav ---------- */
const burger = document.getElementById('navBurger');
const mobileMenu = document.getElementById('navMobile');
burger.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('is-open');
  burger.setAttribute('aria-expanded', String(open));
});
mobileMenu.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  })
);

/* ---------- Audience tabs <-> horizontal scroll-jack ---------- */
const audTabs = Array.from(document.querySelectorAll('.audiences .tab'));
audTabs.forEach((tab) =>
  tab.addEventListener('click', () => {
    const i = Number(tab.dataset.index);
    audTabs.forEach((t, j) => {
      t.classList.toggle('is-active', i === j);
      t.setAttribute('aria-selected', String(i === j));
    });
    const sec = document.getElementById('audiences');
    const row = document.getElementById('audRow');
    if (!sec || !row) return;
    const jacked = sec.offsetHeight > innerHeight * 1.5;
    if (jacked) {
      const n = audTabs.length;
      window.scrollTo({ top: sec.offsetTop + ((sec.offsetHeight - innerHeight) * i) / (n - 1) + 2, behavior: 'smooth' });
    } else {
      const card = row.children[i];
      row.scrollTo({ left: card.offsetLeft - 16, behavior: 'smooth' });
    }
  })
);

/* ---------- Button labels roll on hover ---------- */
document.querySelectorAll('.btn, .btn-go__label').forEach((b) => {
  const t = b.textContent.trim();
  if (!t || b.querySelector('.btn__t')) return;
  b.innerHTML = '<span class="btn__t"><span>' + t + '</span><span aria-hidden="true">' + t + '</span></span>';
});

/* ---------- Carousels start flush with the section title ---------- */
['agentTrack', 'blogTrack'].forEach((id) => {
  const t = document.getElementById(id);
  if (t) t.scrollLeft = 0;
});

/* ---------- Generic carousel arrows ---------- */
document.querySelectorAll('[data-carousel-prev], [data-carousel-next]').forEach((btn) => {
  const id = btn.dataset.carouselPrev || btn.dataset.carouselNext;
  const track = document.getElementById(id);
  const dir = btn.dataset.carouselPrev ? -1 : 1;
  btn.addEventListener('click', () => {
    const card = track.firstElementChild;
    const gap = parseFloat(getComputedStyle(track).gap) || 24;
    track.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: 'smooth' });
  });
});

/* mouse drag-to-scroll on the horizontal card tracks (touch already pans natively) */
document.querySelectorAll('.agent__track, .blogs__track').forEach((tr) => {
  let down = false, moved = false, startX = 0, startL = 0;
  tr.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = false; startX = e.clientX; startL = tr.scrollLeft;
  });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > 5) { moved = true; tr.classList.add('is-dragging'); }
    if (moved) tr.scrollLeft = startL - dx;
  });
  addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    tr.classList.remove('is-dragging');
  });
  // a drag should never trigger the card's link
  tr.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
});

/* ---------- Variable-proximity headline (reactbits-style) ----------
   Bricolage Grotesque is a variable font; letters near the cursor swell
   along the wght/opsz axes and relax with a smoothed falloff. */
(function variableProximity() {
  if (REDUCED || !matchMedia('(hover: hover)').matches) return;
  const title = document.querySelector('.hero__title');
  const hero = document.querySelector('.hero');
  if (!title || !hero) return;
  title.querySelectorAll('.hero__line').forEach((line) => {
    Array.from(line.childNodes).forEach((node) => {
      if (node.nodeType !== 3 || !node.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      for (const ch of node.textContent) {
        if (/\s/.test(ch)) frag.appendChild(document.createTextNode(ch));
        else {
          const s = document.createElement('span');
          s.className = 'vp-char';
          s.textContent = ch;
          frag.appendChild(s);
        }
      }
      node.replaceWith(frag);
    });
  });
  const chars = Array.from(title.querySelectorAll('.vp-char'));
  const RADIUS = 150;
  let px = 0, py = 0, active = false;
  hero.addEventListener('mousemove', (e) => { px = e.clientX; py = e.clientY; active = true; }, { passive: true });
  hero.addEventListener('mouseleave', () => { active = false; }, { passive: true });
  const tick = () => {
    if (!document.hidden) {
      const tr = title.getBoundingClientRect();
      if (tr.bottom > 0 && tr.top < innerHeight) {
        chars.forEach((c) => {
          let t = 0;
          if (active) {
            const r = c.getBoundingClientRect();
            t = Math.max(0, 1 - Math.hypot(px - (r.left + r.width / 2), py - (r.top + r.height / 2)) / RADIUS);
          }
          const cur = parseFloat(c.dataset.t) || 0;
          const nt = cur + (t - cur) * 0.15;
          if (Math.abs(nt - cur) < 0.001 && nt < 0.002) { if (c.style.fontVariationSettings) c.style.fontVariationSettings = ''; c.dataset.t = 0; return; }
          c.dataset.t = nt.toFixed(3);
          c.style.fontVariationSettings =
            '"opsz" ' + (36 + 60 * nt).toFixed(0) + ', "wdth" 75, "wght" ' + (600 + 200 * nt).toFixed(0);
        });
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* ---------- Scrollspy: active nav item follows the section in view ---------- */
(function scrollSpy() {
  const links = Array.from(document.querySelectorAll('.nav__pill a')).filter((a) => a.getAttribute('href').startsWith('#'));
  const map = links.map((a) => ({ a, el: document.querySelector(a.getAttribute('href')) })).filter((x) => x.el);
  if (!map.length) return;
  let raf = false;
  addEventListener('scroll', () => {
    if (raf) return;
    raf = true;
    requestAnimationFrame(() => {
      raf = false;
      let cur = null;
      map.forEach(({ a, el }) => {
        const r = el.getBoundingClientRect();
        if (r.top <= innerHeight * 0.42 && r.bottom > innerHeight * 0.28) cur = a;
      });
      links.forEach((l) => l.classList.toggle('is-active', l === cur));
    });
  }, { passive: true });
})();

/* ---------- Nav: hide on scroll down, return on scroll up ---------- */
(function smartNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;
  let lastY = scrollY;
  addEventListener('scroll', () => {
    const y = scrollY;
    nav.classList.toggle('nav--solid', y > 130);
    if (y > 160 && y > lastY + 4) nav.classList.add('nav--hidden');
    else if (y < lastY - 4 || y <= 160) nav.classList.remove('nav--hidden');
    lastY = y;
  }, { passive: true });
})();

/* ---------- Blog cards: 3D tilt toward the cursor ---------- */
if (!REDUCED) {
  document.querySelectorAll('.blog-card').forEach((card) => {
    const img = card.querySelector('img');
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        'perspective(700px) rotateY(' + (px * 7).toFixed(2) + 'deg) rotateX(' + (-py * 6).toFixed(2) + 'deg) translateY(-4px)';
      if (img) img.style.transform = 'scale(1.08) translate(' + (px * -8).toFixed(1) + 'px,' + (py * -8).toFixed(1) + 'px)';
    }, { passive: true });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      if (img) img.style.transform = '';
    }, { passive: true });
  });
}

/* ---------- Device-aware store links ---------- */
(function storeLinks() {
  const ua = navigator.userAgent;
  const play = (CMS && CMS.settings && CMS.settings.playStoreUrl) || 'https://play.google.com/store/apps/details?id=app.inmark';
  const apple = (CMS && CMS.settings && CMS.settings.appStoreUrl) || 'https://apps.apple.com/app/inmark/id0000000000';
  const store = /android/i.test(ua) ? play : /iphone|ipad|ipod|macintosh/i.test(ua) ? apple : null;
  if (store) document.querySelectorAll('[data-store-link]').forEach((a) => (a.href = store));
})();

/* ---------- FAQ ---------- */
const FAQ = (CMS && CMS.faq) || {
  brands: [
    ['What is Inmark?', 'InMark connects your brand with the right creators, influencers and UGC producers, and runs the whole campaign in one place, from discovery and briefing through approvals, payment, and performance reporting.'],
    ['How do I get started?', 'Create a free account, set up your brand profile, and launch your first campaign with the guided setup. Our AI agent drafts the brief, deliverables, and budget for you to review.'],
    ['Is my money protected when I fund a campaign?', 'Yes. Campaign budgets are held in escrow and only released to creators when you approve their deliverables — never before.'],
    ['What does InMark charge?', 'InMark charges a flat platform fee per funded campaign. There are no hidden markups on creator rates, and you can review the full cost breakdown before you fund.'],
    ['How do I set a campaign budget?', 'Set a total budget during campaign setup, or answer a few questions and let inmark.ai propose one based on deliverables, platforms, and audience size. You can adjust it any time before funding.'],
    ['How does InMark decide which creators to recommend?', 'Recommendations combine audience overlap, past campaign performance, content quality signals, and your brief — not follower count alone.'],
    ["What if I need changes to a creator's content?", 'Request revisions directly in the shared workbench. Each revision round is recorded, and payment is only released once you explicitly approve the final deliverable.'],
  ],
  influencers: [
    ['How do I join InMark as an influencer?', 'Apply with your social profiles. Once verified, you appear in the roster and start receiving campaign invitations that match your audience.'],
    ['When do I get paid?', 'Payouts are released from escrow as soon as the brand approves your deliverables — typically within days, not months.'],
    ['Can I negotiate my rate?', 'Yes. Every invitation shows the proposed rate, and you can counter-offer before accepting a campaign.'],
    ['Who owns the content I create?', 'Usage rights are defined per campaign in the brief, so you always know exactly what a brand is licensing before you accept.'],
  ],
  agency: [
    ['Can I manage multiple brands under one account?', 'Yes. Agency accounts have a multi-brand dashboard with separate campaigns, rosters, and reporting per client.'],
    ['How does client reporting work?', 'Every campaign produces a structured, exportable report — reach, engagement, deliverable status, and spend — ready to share with your client.'],
    ['Can my whole team collaborate?', 'Invite unlimited team members with role-based permissions. Everyone works in the same campaign workbenches.'],
    ['Does InMark replace my existing tools?', 'InMark replaces the spreadsheet-and-DM workflow: discovery, briefing, approvals, payment, and reporting all live in one place.'],
  ],
  ugc: [
    ['What makes UGC campaigns different on InMark?', 'UGC campaigns skip the public roster. You deliver content directly to the brand — send video only, post to social, or post by tagging, as the brief defines.'],
    ['Do I need a large following?', 'No. UGC creators are selected for content quality and fit, not audience size.'],
    ['How do briefs work?', 'Each campaign comes with a structured brief — deliverables, format, tone, and deadline — so you always know exactly what to make.'],
    ['When am I paid for UGC work?', 'Funds are escrowed when the campaign starts and released to you as soon as the brand approves your uploads.'],
  ],
};

const faqList = document.getElementById('faqList');
const faqTabs = Array.from(document.querySelectorAll('[data-faq]'));

let faqRevealed = false;
function renderFaq(key) {
  faqList.classList.remove('is-anim');
  faqList.innerHTML = '';
  FAQ[key].forEach(([q, a], i) => {
    const item = document.createElement('div');
    item.className = 'faq-item' + (i === 0 ? ' is-open' : '');
    item.innerHTML =
      '<button class="faq-item__q" aria-expanded="' + (i === 0) + '"><span>' + q + '</span><span class="faq-item__icon" aria-hidden="true"></span></button>' +
      '<div class="faq-item__a"><div class="faq-item__a-inner"><p>' + a + '</p></div></div>';
    faqList.appendChild(item);
  });
  if (faqRevealed) {
    void faqList.offsetHeight; // restart the cascade from the hidden state
    faqList.classList.add('is-anim');
  }
}
faqList.addEventListener('click', (e) => {
  const q = e.target.closest('.faq-item__q');
  if (!q) return;
  const item = q.parentElement;
  const wasOpen = item.classList.contains('is-open');
  faqList.querySelectorAll('.faq-item').forEach((it) => it.classList.remove('is-open'));
  if (!wasOpen) item.classList.add('is-open');
  faqList.querySelectorAll('.faq-item__q').forEach((btn) =>
    btn.setAttribute('aria-expanded', String(btn.parentElement.classList.contains('is-open')))
  );
});
faqTabs.forEach((tab) =>
  tab.addEventListener('click', () => {
    faqTabs.forEach((t) => {
      t.classList.toggle('is-active', t === tab);
      t.setAttribute('aria-selected', String(t === tab));
    });
    renderFaq(tab.dataset.faq);
  })
);
renderFaq('brands');

/* dev hook: ?scroll=N jumps there after the loader finishes (headless visual checks) */
const devScroll = new URLSearchParams(location.search).get('scroll');
if (devScroll) {
  addEventListener('load', () =>
    setTimeout(() => {
      document.documentElement.style.scrollBehavior = 'auto';
      window.scrollTo(0, +devScroll);
    }, 1900)
  );
}

/* ---------- Reveal on scroll ---------- */
const revealEls = document.querySelectorAll('.reveal, .reveal-head, .reveal-pill, [data-stagger], .footer');
const pendingReveals = new Set(revealEls);
function revealNow(el) {
  el.classList.add('is-in');
  // once the entrance choreography lands, drop its transition delays so
  // hover interactions on the card art respond instantly
  setTimeout(() => el.classList.add('is-settled'), 1700);
  io.unobserve(el);
  pendingReveals.delete(el);
}
const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((en) => {
      // reveal when entering the viewport — or when already scrolled past
      if (en.isIntersecting || en.boundingClientRect.top < 0) revealNow(en.target);
    }),
  { threshold: 0.05 }
);
revealEls.forEach((el) => io.observe(el));
// sweep fallback: runtime layout shifts (the band margin) can slip past the
// observer, so anything sitting inside the viewport on scroll is revealed too
let revealRaf = false;
addEventListener('scroll', () => {
  if (revealRaf || !pendingReveals.size) return;
  revealRaf = true;
  requestAnimationFrame(() => {
    revealRaf = false;
    pendingReveals.forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight * 0.92) revealNow(el);
    });
  });
}, { passive: true });

/* (section squiggles retired — the hero line draws via the preloader hand-off) */
const audLineIo = new IntersectionObserver(
  (entries) =>
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const p = document.getElementById('audBgPath');
      if (p) {
        p.style.transition = 'stroke-dashoffset 1.9s cubic-bezier(0.5, 0, 0.2, 1) 0.2s';
        p.style.strokeDashoffset = '0';
        p.dataset.drawn = '1';
      }
      audLineIo.disconnect();
    }),
  { threshold: 0.2 }
);
const audSectionEl = document.getElementById('audiences');
if (audSectionEl) audLineIo.observe(audSectionEl);
if (REDUCED) document.querySelector('.hero')?.classList.add('sq-draw');

/* FAQ list cascades the first time it scrolls into view */
const faqListIo = new IntersectionObserver(
  (entries) =>
    entries.forEach((en) => {
      if (en.isIntersecting || en.boundingClientRect.top < 0) {
        faqRevealed = true;
        faqList.classList.add('is-anim');
        faqListIo.unobserve(en.target);
      }
    }),
  { threshold: 0.1 }
);
faqListIo.observe(faqList);

/* ---------- Scroll-driven media: chip-to-pill morph + border line + parallax ---------- */
(function scrollMedia() {
  if (REDUCED) return;
  const plxEls = Array.from(document.querySelectorAll('[data-plx]'));
  const heroEl = document.querySelector('.hero');
  let mTX = 0, mTY = 0, mX = 0, mY = 0; // cursor pull target / smoothed
  if (heroEl) {
    heroEl.addEventListener('mousemove', (e) => {
      const r = heroEl.getBoundingClientRect();
      mTX = e.clientX - r.left - r.width / 2;
      mTY = e.clientY - r.top - r.height / 2;
    }, { passive: true });
    heroEl.addEventListener('mouseleave', () => { mTX = 0; mTY = 0; }, { passive: true });
  }
  const band = document.querySelector('.band');
  const frame = document.getElementById('bandFrame');
  const bandWin = document.getElementById('bandWin');
  const bandImg = document.getElementById('bandImg');
  const bandBlob = document.getElementById('bandBlob');
  const chip = document.getElementById('heroChip');
  const lineSvg = document.getElementById('bandLine');
  const wrapPath = document.getElementById('bandWrap');
  const tailPath = document.getElementById('bandTail');
  const grad = document.getElementById('bl-grad');
  const wfSection = document.querySelector('.workflow');
  const wfCards = Array.from(document.querySelectorAll('.wf-card'));
  const audSection = document.getElementById('audiences');
  const audRow = document.getElementById('audRow');
  const agentSection = document.querySelector('.agent');
  const agentJackTrack = document.getElementById('agentTrack');
  let agentP = 0;
  const audBgPath = document.getElementById('audBgPath');
  const audGrad = document.getElementById('aud-grad');
  let audLen = 0;
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  let bandP = 0; // smoothed morph progress
  let audP = 0;
  let wfP = 0;
  let pill = null; // {cx, cy, fw, fh, r} in viewport coords
  let wrapLen = 0;
  let tailLen = 0;

  // the pill geometry + the border/tail paths depend only on the viewport
  function buildGeometry() {
    const vw = innerWidth;
    const vh = innerHeight;
    // place the band so its sticky engages while the chip is still on screen:
    // overlap is computed from real layout, not a viewport guess
    const hero = document.querySelector('.hero');
    if (band && hero && chip) {
      const naturalTop = hero.offsetTop + hero.offsetHeight;
      const chipDocTop = chip.getBoundingClientRect().top + scrollY;
      const desiredTop = Math.max(40, Math.round(chipDocTop * 0.55));
      band.style.marginTop = desiredTop - naturalTop + 'px';
    }
    const fw = Math.min(1360, vw - 48);
    const fh = Math.min(560, Math.max(240, Math.min(Math.round(vh * 0.62), Math.round(fw * 0.55))));
    const cx = vw / 2;
    const cy = vh / 2;
    const r = Math.min(fw, fh) / 2;
    pill = { cx, cy, fw, fh, r };
    if (!lineSvg) return;
    lineSvg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);
    const xL = cx - fw / 2 + r;
    const xR = cx + fw / 2 - r;
    const top = cy - fh / 2;
    const bot = cy + fh / 2;
    // enter from the right edge at pill middle, wrap the pill clockwise-down,
    // finish the loop back at the entry point
    wrapPath.setAttribute(
      'd',
      'M ' + (vw + 30) + ' ' + cy +
      ' L ' + (cx + fw / 2) + ' ' + cy +
      ' A ' + r + ' ' + r + ' 0 0 1 ' + xR + ' ' + bot +
      ' L ' + xL + ' ' + bot +
      ' A ' + r + ' ' + r + ' 0 0 1 ' + xL + ' ' + top +
      ' L ' + xR + ' ' + top +
      ' A ' + r + ' ' + r + ' 0 0 1 ' + (cx + fw / 2) + ' ' + cy
    );
    // then the tail springs from the pill's lower-left and runs out the bottom
    tailPath.setAttribute(
      'd',
      'M ' + xL + ' ' + bot +
      ' C ' + (xL - r * 1.1) + ' ' + (bot + 40) + ', ' + 0.17 * vw + ' ' + (bot + 110) + ', ' + 0.14 * vw + ' ' + (bot + 190) +
      ' C ' + 0.11 * vw + ' ' + (bot + 270) + ', ' + 0.05 * vw + ' ' + (vh + 20) + ', -40 ' + (vh + 80)
    );
    wrapLen = wrapPath.getTotalLength();
    tailLen = tailPath.getTotalLength();
    wrapPath.style.strokeDasharray = wrapLen;
    tailPath.style.strokeDasharray = tailLen;
    grad.setAttribute('x1', String(cx - fw / 2));
    grad.setAttribute('y1', String(bot));
    grad.setAttribute('x2', String(cx + fw / 2));
    grad.setAttribute('y2', String(top));
  }
  function buildAudLine() {
    if (!audSection || !audBgPath) return;
    const w = innerWidth;
    const h = innerHeight;
    const svg = document.getElementById('audBgLine');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    const d =
      'M -40 ' + 0.3 * h +
      ' C ' + 0.22 * w + ' ' + 0.14 * h + ', ' + 0.34 * w + ' ' + 0.62 * h + ', ' + 0.55 * w + ' ' + 0.52 * h +
      ' C ' + 0.72 * w + ' ' + 0.44 * h + ', ' + 0.8 * w + ' ' + 0.7 * h + ', ' + (w + 40) + ' ' + 0.62 * h;
    audBgPath.setAttribute('d', d);
    audLen = audBgPath.getTotalLength();
    audBgPath.style.strokeDasharray = audLen;
    audBgPath.style.strokeDashoffset = audBgPath.dataset.drawn ? '0' : audLen;
    audGrad.setAttribute('x1', '0');
    audGrad.setAttribute('y1', String(0.2 * h));
    audGrad.setAttribute('x2', String(w));
    audGrad.setAttribute('y2', String(0.6 * h));
  }
  buildGeometry();
  buildAudLine();
  addEventListener('resize', () => { buildGeometry(); buildAudLine(); }, { passive: true });
  addEventListener('load', () => { buildGeometry(); buildAudLine(); }, { once: true });

  const tick = () => {
    if (!document.hidden) {
      const vh = innerHeight;

      // parallax: img drifts with scroll inside the frame; the FRAME itself is
      // pulled toward the cursor (per-card depth) so nothing crops at the edges
      mX += (mTX - mX) * 0.07;
      mY += (mTY - mY) * 0.07;
      plxEls.forEach((img) => {
        const fig = img.parentElement;
        const r = fig.getBoundingClientRect();
        if (r.bottom < -80 || r.top > vh + 80) return;
        const c = (r.top + r.height / 2 - vh / 2) / vh;
        const amp = parseFloat(img.dataset.plx) || 0;
        img.style.transform = 'translateY(' + (c * amp).toFixed(1) + 'px) scale(1.15)';
        const d = innerWidth > 760 ? parseFloat(fig.dataset.mdepth) || 0 : 0;
        if (d) {
          fig.style.setProperty('--mx', (mX * d).toFixed(1) + 'px');
          fig.style.setProperty('--my', (mY * d).toFixed(1) + 'px');
        }
      });

      // morph: the window div travels from the chip's live rect to the centered pill.
      // Sequencing: image finishes forming by 55% of the band scroll, the border
      // line draws 58%..92%, then everything is frozen in frame-local coords so
      // the pill and its line border scroll away together.
      if (band && frame && bandWin && bandImg && chip && pill) {
        const rb = band.getBoundingClientRect();
        const total = Math.max(1, rb.height - vh);
        const target = clamp01(-rb.top / total);
        const frozen = target >= 1;
        if (frozen) bandP = 1;
        else {
          bandP += (target - bandP) * 0.1;
          if (Math.abs(target - bandP) < 0.001) bandP = target;
        }
        // ease-in-out over the first 60% of the runway: gentle engage, gentle landing
        const mp = clamp01(bandP / 0.6);
        const morphE = mp < 0.5 ? 4 * mp * mp * mp : 1 - Math.pow(-2 * mp + 2, 3) / 2;

        const fr = frame.getBoundingClientRect();
        let winL, winT, winW, winH;
        if (frozen) {
          // frame-local pill constants (frame top sits at -20vh while pinned)
          winL = pill.cx - pill.fw / 2;
          winT = pill.cy - pill.fh / 2 + vh * 0.2;
          winW = pill.fw;
          winH = pill.fh;
        } else {
          const cr = chip.getBoundingClientRect();
          const lerp = (a, b) => a + (b - a) * morphE;
          winL = lerp(cr.left, pill.cx - pill.fw / 2) - fr.left;
          winT = lerp(cr.top, pill.cy - pill.fh / 2) - fr.top;
          winW = lerp(cr.width, pill.fw);
          winH = lerp(cr.height, pill.fh);
        }
        const rad = 12 + (pill.r - 12) * morphE;
        bandWin.style.left = winL.toFixed(1) + 'px';
        bandWin.style.top = winT.toFixed(1) + 'px';
        bandWin.style.width = winW.toFixed(1) + 'px';
        bandWin.style.height = winH.toFixed(1) + 'px';
        bandWin.style.borderRadius = rad.toFixed(1) + 'px';

        // default cover view in the chip, zooming further in as it expands;
        // the crop focus slides up so the subject's face stays centered in the wide pill
        bandImg.style.transform = 'scale(' + (1 + 0.25 * morphE).toFixed(3) + ')';
        bandImg.style.objectPosition = '50% ' + (35 - 21 * morphE).toFixed(1) + '%';

        // border line draws after the image has arrived
        const phase = frozen ? 1 : clamp01((bandP - 0.64) / 0.3);
        lineSvg.style.opacity = Math.min(1, phase * 6).toFixed(2);
        const drawn = phase * (wrapLen + tailLen);
        wrapPath.style.strokeDashoffset = Math.max(0, wrapLen - drawn).toFixed(1);
        tailPath.style.strokeDashoffset = Math.max(0, tailLen - Math.max(0, drawn - wrapLen)).toFixed(1);
        if (bandBlob) {
          bandBlob.style.opacity = phase.toFixed(2);
          bandBlob.style.transform = 'translateY(' + (30 * (1 - phase)).toFixed(1) + '%)';
        }
      }

      // audiences: cards slide in from the right as the user scrolls; the
      // background line draws along, and the active tab follows
      if (audSection && audRow && innerWidth > 760) {
        const ar = audSection.getBoundingClientRect();
        if (ar.bottom > -100 && ar.top < vh + 100) {
          // finish the ride at ~88% of the pinned range so the last card settles
          // fully in view before the section unpins
          const apT = clamp01(-ar.top / Math.max(1, (ar.height - vh) * 0.88));
          audP += (apT - audP) * 0.11;
          const ap = Math.abs(apT - audP) < 0.0005 ? (audP = apT) : audP;
          // scrollWidth drops the row's trailing padding, so add the leading
          // gutter back to land the last card a full gutter inside the frame
          const audPadL = parseFloat(getComputedStyle(audRow).paddingLeft) || 0;
          const maxX = Math.max(0, audRow.scrollWidth - innerWidth + audPadL);
          audRow.style.transform = 'translate3d(' + (-ap * maxX).toFixed(1) + 'px,0,0)';
          const n = audRow.children.length;
          const idx = Math.min(n - 1, Math.round(ap * (n - 1)));
          const tabs = document.querySelectorAll('.audiences .tab');
          if (tabs[idx] && !tabs[idx].classList.contains('is-active')) {
            tabs.forEach((t, j) => {
              t.classList.toggle('is-active', j === idx);
              t.setAttribute('aria-selected', String(j === idx));
            });
          }
        }
      }

      // AI-agent cards: same horizontal ride while the section is pinned
      if (agentSection && agentJackTrack && innerWidth > 760 && agentSection.offsetHeight > vh * 1.5) {
        const gr = agentSection.getBoundingClientRect();
        if (gr.bottom > -100 && gr.top < vh + 100) {
          const gpT = clamp01(-gr.top / Math.max(1, (gr.height - vh) * 0.88));
          agentP += (gpT - agentP) * 0.11;
          if (Math.abs(gpT - agentP) < 0.0005) agentP = gpT;
          // width:max-content keeps the trailing padding in scrollWidth here,
          // so no gutter compensation is needed (unlike the audiences row)
          const agMaxX = Math.max(0, agentJackTrack.scrollWidth - innerWidth);
          agentJackTrack.style.transform = 'translate3d(' + (-agentP * agMaxX).toFixed(1) + 'px,0,0)';
        }
      } else if (agentJackTrack && agentJackTrack.style.transform) {
        agentJackTrack.style.transform = '';
      }

      // workflow conveyor (wisprflow-style): the step cards travel as a train
      // along a rising ramp from bottom-left to top-right; each card enters
      // tilted back (rotateX +50), flattens at the featured spot, then tips
      // forward (-50) as it exits. Decoded from wisprflow.ai's testiv2 cards.
      if (wfSection && wfCards.length && innerWidth > 760) {
        const wr = wfSection.getBoundingClientRect();
        if (wr.bottom > -100 && wr.top < vh + 100) {
          const gpT = clamp01(-wr.top / Math.max(1, wr.height - vh));
          wfP += (gpT - wfP) * 0.11;
          const gp = Math.abs(gpT - wfP) < 0.0005 ? (wfP = gpT) : wfP;
          wfSection.classList.toggle('workflow--end', gp > 0.82);
          const wfLine = document.getElementById('wfLinePath');
          if (wfLine) wfLine.style.strokeDashoffset = (1 - Math.min(1, gp * 1.12)).toFixed(3);
          const sp = 0.22; // spacing between cards on the ramp
          const T = 0.65 + (wfCards.length - 1) * sp; // last card exits at gp = 1
          const vw = innerWidth;
          wfCards.forEach((card, i) => {
            const u = 0.35 + gp * T - i * sp;
            if (u < -0.2 || u > 1.25) { card.style.visibility = 'hidden'; return; }
            card.style.visibility = '';
            const uc = Math.min(1, Math.max(0, u));
            const x = (50 + (u - 0.5) * 170) / 100 * vw - card.offsetWidth / 2;
            const y = (2 + 95 * Math.pow(1 - uc, 1.6)) / 100 * vh;
            const rx = Math.min(50, Math.max(-50, (50 * (0.5 - u)) / 0.28));
            card.style.transform =
              'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) rotateX(' + rx.toFixed(1) + 'deg)';
            card.style.zIndex = String(100 - Math.round(Math.abs(u - 0.5) * 90));
          });
        }
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* ---------- Footer creator loop: the brand line carries the message ----------
   Vanilla port of react-bits <TextLoop />: two textPaths slide along the wave,
   offset by one path-length, for a seamless marquee. */
(function creatorLoop() {
  const root = document.getElementById('creatorLoop');
  const pathEl = document.getElementById('loopPath');
  const head = document.getElementById('loopHead');
  const tail = document.getElementById('loopTail');
  const measure = document.getElementById('loopMeasure');
  if (!root || !pathEl || !head || !measure) return;
  if (tail) tail.remove(); // single run at natural tracking; loop period = one unit width

  const unit = 'CREATORS FIRST\u00A0\u00A0\u2726\u00A0\u00A0AN OS FOR EVERY PARTNERSHIP\u00A0\u00A0\u2726\u00A0\u00A0';
  measure.textContent = unit;
  let unitW = 0;

  function build() {
    const length = pathEl.getTotalLength();
    try { unitW = measure.getComputedTextLength(); } catch (e) { unitW = 0; }
    if (!unitW) return;
    const reps = Math.ceil(length / unitW) + 2;
    head.textContent = unit.repeat(reps);
    head.removeAttribute('textLength');
  }
  build();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(build).catch(function () {});

  if (REDUCED) { head.setAttribute('startOffset', 0); return; }

  const SPEED = 115; // path units per second
  let t = 0;
  let last = performance.now();
  function frame(now) {
    if (!root.isConnected) return; // loader removed — stop for good
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (unitW && !document.hidden) {
      t = (t + SPEED * dt) % unitW;
      head.setAttribute('startOffset', (-t).toFixed(2));
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
