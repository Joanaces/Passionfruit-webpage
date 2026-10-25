/*
 * 百香果 · CAT SUSPECT FILE — interaction logic
 * Screens: portrait → records → gallery
 */
(function () {
  'use strict';

  var C = window.CAT_CONFIG;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = function () { return reduceMotionQuery.matches; };

  /* ------------------------------------------------------------------ *
   * Screen switching
   * ------------------------------------------------------------------ */
  var screens = {
    portrait: $('#screen-portrait'),
    records: $('#screen-records'),
    gallery: $('#screen-gallery')
  };
  var current = 'portrait';

  function show(name) {
    Object.keys(screens).forEach(function (key) {
      var el = screens[key];
      var on = key === name;
      el.classList.toggle('active', on);
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
      if (on) el.removeAttribute('inert'); else el.setAttribute('inert', '');
    });
    current = name;
    screens[name].scrollTop = 0;

    // Idle meow belongs to screen 1 only.
    if (name === 'portrait') startIdle(); else stopIdle();
    if (name !== 'portrait') window.CatAudio.stop();

    // Move focus to the new screen's heading for keyboard / screen-reader users.
    var focusTarget = name === 'records' ? $('#records-title')
                    : name === 'gallery' ? $('#gallery-title')
                    : $('#pet-zone');
    if (focusTarget) setTimeout(function () { focusTarget.focus({ preventScroll: true }); }, 50);
  }

  /* ------------------------------------------------------------------ *
   * Static text from config
   * ------------------------------------------------------------------ */
  $('#cat-name').textContent = C.name;
  $('#cat-label').textContent = C.label;
  $('#portrait').src = C.portrait;

  /* ------------------------------------------------------------------ *
   * Sound button
   * ------------------------------------------------------------------ */
  var soundBtn = $('#sound-btn');
  function renderSound() {
    var muted = window.CatAudio.isMuted();
    soundBtn.classList.toggle('muted', muted);
    soundBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
    $('.sound-text', soundBtn).textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  }
  soundBtn.addEventListener('click', function () { window.CatAudio.toggle(); });
  window.CatAudio.onChange(renderSound);
  renderSound();

  /* ------------------------------------------------------------------ *
   * Idle meow (screen 1 only)
   * ------------------------------------------------------------------ */
  var idleTimer = null;
  var petLocked = false;

  function stopIdle() {
    if (idleTimer) { clearInterval(idleTimer); idleTimer = null; }
  }
  function startIdle() {
    stopIdle();
    idleTimer = setInterval(function () {
      if (current !== 'portrait' || petLocked || document.hidden) return;
      window.CatAudio.play();           // no-op while muted, locked or already playing
    }, C.idleMeowSeconds * 1000);
  }

  /* "tap to enable sound" hint disappears once audio is unlocked */
  var hint = $('#pet-hint');
  var hintDefault = hint.textContent;
  function renderHint() {
    hint.classList.toggle('need-sound', !window.CatAudio.isUnlocked());
  }
  renderHint();
  window.addEventListener('pointerdown', function () { setTimeout(renderHint, 0); }, { capture: true, passive: true });
  window.addEventListener('keydown', function () { setTimeout(renderHint, 0); }, { capture: true, passive: true });

  /* ------------------------------------------------------------------ *
   * Petting gesture: press, then drag left → right across the head
   * ------------------------------------------------------------------ */
  var wrap = $('#photo-wrap');
  var zone = $('#pet-zone');
  var pet = null;            // active gesture state
  var transitionTimer = null;

  var REQUIRED_TRAVEL = 0.55;   // fraction of the zone width to cover
  var VERTICAL_SLACK = 0.35;    // allowed drift above/below the zone (× zone height)

  function setPetVisual(progress, clientX) {
    var r = zone.getBoundingClientRect();
    var px = ((clientX - r.left) / r.width) * 100;
    zone.style.setProperty('--glow-x', Math.max(0, Math.min(100, px)) + '%');
    wrap.style.setProperty('--pet-p', Math.max(0, Math.min(1, progress)).toFixed(3));
  }

  function resetPetVisual() {
    zone.classList.remove('is-petting');
    wrap.style.setProperty('--pet-p', '0');
  }

  function cancelPet(e) {
    if (!pet) return;
    if (e && e.pointerId !== undefined && e.pointerId !== pet.id) return;
    try { zone.releasePointerCapture(pet.id); } catch (err) {}
    pet = null;
    resetPetVisual();
  }

  function completePet() {
    if (petLocked) return;
    petLocked = true;
    if (pet) { try { zone.releasePointerCapture(pet.id); } catch (err) {} }
    pet = null;
    resetPetVisual();

    window.CatAudio.play({ force: true });         // one quiet meow
    wrap.classList.add('petted');                   // subtle camera-flash reaction

    transitionTimer = setTimeout(function () {
      transitionTimer = null;
      show('records');
      // let the fade-out finish before resetting the portrait
      setTimeout(function () { wrap.classList.remove('petted'); petLocked = false; }, 700);
    }, reduceMotion() ? 200 : 950);
  }

  zone.addEventListener('pointerdown', function (e) {
    if (petLocked || pet) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    window.CatAudio.unlock();
    var r = zone.getBoundingClientRect();
    pet = { id: e.pointerId, startX: e.clientX, w: r.width };
    zone.classList.add('is-petting');
    try { zone.setPointerCapture(e.pointerId); } catch (err) {}
    setPetVisual(0, e.clientX);
    e.preventDefault();
  });

  zone.addEventListener('pointermove', function (e) {
    if (!pet || e.pointerId !== pet.id) return;
    var r = zone.getBoundingClientRect();
    var slack = r.height * VERTICAL_SLACK;
    if (e.clientY < r.top - slack || e.clientY > r.bottom + slack) { cancelPet(e); return; }

    var dx = e.clientX - pet.startX;
    if (dx < 0) { pet.startX = e.clientX; dx = 0; }   // dragging back restarts the stroke
    var progress = dx / (pet.w * REQUIRED_TRAVEL);
    setPetVisual(progress, e.clientX);
    if (progress >= 1) completePet();
  });

  zone.addEventListener('pointerup', cancelPet);
  zone.addEventListener('pointercancel', cancelPet);
  zone.addEventListener('lostpointercapture', cancelPet);

  // Keyboard alternative for accessibility.
  zone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.CatAudio.unlock(); completePet(); }
  });

  // Stop the browser's image drag-ghost / context menu on long-press.
  zone.addEventListener('dragstart', function (e) { e.preventDefault(); });
  zone.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  $('#back-to-portrait').addEventListener('click', function () { show('portrait'); });

  /* ------------------------------------------------------------------ *
   * Image helpers (placeholder handling)
   * ------------------------------------------------------------------ */
  function basename(path) { return String(path).split('/').pop(); }

  // Preload each configured photo once; report whether the file exists.
  var photoState = {};   // src -> 'loaded' | 'missing'
  var stateWatchers = [];
  function checkPhoto(src) {
    if (photoState[src]) return;
    var probe = new Image();
    probe.onload = function () { photoState[src] = 'loaded'; stateWatchers.forEach(function (fn) { fn(); }); };
    probe.onerror = function () { photoState[src] = 'missing'; stateWatchers.forEach(function (fn) { fn(); }); };
    probe.src = src;
  }
  C.ages.forEach(function (age) { age.photos.forEach(function (p) { checkPhoto(p.src); }); });

  function placeholderEl(src) {
    var ph = document.createElement('div');
    ph.className = 'ph';
    ph.innerHTML = '<span class="ph-a">PLACEHOLDER</span><span class="ph-b">占位图 · 待替换</span><span class="ph-c"></span>';
    $('.ph-c', ph).textContent = src;
    return ph;
  }

  // Builds <img> + placeholder; toggles .missing on `host` if the file is absent.
  function fillImage(host, photo, alt) {
    var img = document.createElement('img');
    img.alt = alt;
    img.decoding = 'async';
    img.draggable = false;
    img.addEventListener('error', function () { host.classList.add('missing'); });
    img.addEventListener('load', function () { host.classList.remove('missing'); });
    img.src = photo.src;
    host.appendChild(img);
    host.appendChild(placeholderEl(photo.src));
  }

  /* ------------------------------------------------------------------ *
   * Screen 2 — records
   * ------------------------------------------------------------------ */
  var recordsList = $('#records-list');
  var rotations = ['-2.2deg', '1.4deg', '-1deg'];

  function buildRecords() {
    C.ages.forEach(function (age, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'record';
      btn.style.setProperty('--rot', rotations[i % rotations.length]);
      btn.style.setProperty('--i', i);
      btn.setAttribute('aria-label', age.tag + '，' + age.title + '，打开照片档案');

      var thumb = document.createElement('div');
      thumb.className = 'record-photo';
      var first = age.photos[0];
      if (first) fillImage(thumb, first, '');
      else thumb.classList.add('missing');
      var stamp = document.createElement('span');
      stamp.className = 'stamp';
      stamp.textContent = 'OPEN FILE ▸';
      thumb.appendChild(stamp);

      var meta = document.createElement('div');
      meta.className = 'record-meta';
      meta.innerHTML =
        '<span class="record-tag mono"></span>' +
        '<span class="record-title"></span>' +
        '<span class="record-file mono"></span>';
      $('.record-tag', meta).textContent = age.tag;
      $('.record-title', meta).textContent = age.title;

      btn.appendChild(thumb);
      btn.appendChild(meta);
      btn.addEventListener('click', function () { openGallery(i); });
      recordsList.appendChild(btn);

      function renderMeta() {
        var loaded = age.photos.filter(function (p) { return photoState[p.src] === 'loaded'; }).length;
        $('.record-file', meta).textContent =
          'FILE NO. BXG-0' + age.id + ' · ' + loaded + '/' + age.photos.length + ' PHOTOS';
      }
      renderMeta();
      stateWatchers.push(renderMeta);
    });
  }

  /* ------------------------------------------------------------------ *
   * Screen 3 — gallery
   * ------------------------------------------------------------------ */
  var galleryEl = $('#gallery');
  var SLOTS = ['c', 'l1', 'r1', 'l2', 'r2'];     // center + supporting positions
  var order = [];                                 // order[slotIndex] = photo index
  var photoEls = [];
  var swapping = false;

  function applySlots() {
    order.forEach(function (photoIdx, slotIdx) {
      var el = photoEls[photoIdx];
      el.dataset.slot = SLOTS[slotIdx];
      var isCenter = slotIdx === 0;
      el.classList.toggle('is-center', isCenter);
      var btn = $('.photo-btn', el);
      btn.setAttribute('aria-pressed', isCenter ? String($('.photo-btn', el).dataset.open === '1') : 'false');
      btn.setAttribute('aria-label', isCenter
        ? '当前大图，点击查看记录'
        : '把这张照片移到中央');
    });
  }

  function closeCaptions() {
    photoEls.forEach(function (el) {
      el.classList.remove('open');
      var b = $('.photo-btn', el);
      b.dataset.open = '0';
      b.setAttribute('aria-pressed', 'false');
    });
  }

  function swapToCenter(photoIdx) {
    if (swapping || order[0] === photoIdx) return;
    closeCaptions();

    var first = photoEls.map(function (el) { return el.getBoundingClientRect(); });
    var slot = order.indexOf(photoIdx);
    var tmp = order[0]; order[0] = order[slot]; order[slot] = tmp;
    applySlots();

    if (reduceMotion() || !photoEls[0].animate) return;
    swapping = true;
    var pending = 0;
    photoEls.forEach(function (el, i) {
      var last = el.getBoundingClientRect();
      var dx = first[i].left - last.left;
      var dy = first[i].top - last.top;
      var s = first[i].width / last.width;
      if (!dx && !dy && s === 1) return;
      pending++;
      var anim = el.animate([
        { transformOrigin: 'top left', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')' },
        { transformOrigin: 'top left', transform: 'none' }
      ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' });
      var done = function () { if (--pending <= 0) swapping = false; };
      anim.onfinish = done;
      anim.oncancel = done;
    });
    if (pending === 0) swapping = false;
  }

  function toggleCaption(photoIdx) {
    var el = photoEls[photoIdx];
    var open = !el.classList.contains('open');
    el.classList.toggle('open', open);
    var b = $('.photo-btn', el);
    b.dataset.open = open ? '1' : '0';
    b.setAttribute('aria-pressed', open ? 'true' : 'false');
  }

  function openGallery(ageIdx) {
    var age = C.ages[ageIdx];
    $('#gallery-tag').textContent = age.tag;
    $('#gallery-title').textContent = age.title;
    $('#gallery-count').textContent = age.photos.length + ' PHOTOS';

    galleryEl.innerHTML = '';
    galleryEl.dataset.count = String(age.photos.length);
    galleryEl.style.setProperty('--thumbs', Math.max(1, age.photos.length - 1));
    photoEls = [];
    swapping = false;

    age.photos.slice(0, SLOTS.length).forEach(function (photo, i) {
      var fig = document.createElement('figure');
      fig.className = 'photo';

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'photo-btn';
      btn.dataset.open = '0';

      var frame = document.createElement('div');
      frame.className = 'frame';
      fillImage(frame, photo, age.tag + ' 照片 ' + (i + 1));
      var fname = document.createElement('span');
      fname.className = 'fname mono';
      fname.textContent = basename(photo.src).toUpperCase();
      frame.appendChild(fname);
      btn.appendChild(frame);

      var cap = document.createElement('figcaption');
      cap.className = 'caption';
      var capLabel = document.createElement('span');
      capLabel.className = 'cap-label mono';
      capLabel.textContent = 'RECORD NOTE · ' + age.tag + '-' + String(i + 1).padStart(2, '0');
      var capText = document.createElement('p');
      if (photo.caption && photo.caption.trim()) {
        capText.textContent = photo.caption;
      } else {
        capText.textContent = '（这张照片还没有记录。可以在 js/config.js 里为它写一句话。）';
        capText.className = 'empty';
      }
      cap.appendChild(capLabel);
      cap.appendChild(capText);

      btn.addEventListener('click', function () {
        if (order[0] === i) toggleCaption(i); else swapToCenter(i);
      });

      fig.appendChild(btn);
      fig.appendChild(cap);
      galleryEl.appendChild(fig);
      photoEls.push(fig);
    });

    order = photoEls.map(function (_, i) { return i; });
    applySlots();
    show('gallery');
  }

  $('#back-to-records').addEventListener('click', function () { show('records'); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (current === 'gallery') show('records');
      else if (current === 'records') show('portrait');
    }
  });

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  buildRecords();
  startIdle();

  // Clean up timers if the page is torn down / navigated away.
  window.addEventListener('pagehide', function () {
    stopIdle();
    if (transitionTimer) clearTimeout(transitionTimer);
    window.CatAudio.stop();
  });
})();
