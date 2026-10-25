/*
 * Meow playback. One shared player so sounds never overlap.
 *
 * Autoplay rules: browsers only allow audio after a user gesture. We "unlock"
 * on the first pointer/key/touch event; until then nothing plays (the idle
 * timer simply skips its tick).
 *
 * If audio/meow.mp3 is missing, a short synthesized placeholder meow is used.
 */
(function () {
  'use strict';
  var cfg = window.CAT_CONFIG;
  var MUTE_KEY = 'bxg-muted';

  var muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch (e) {}

  var unlocked = false;
  var audioEl = null;
  var audioBroken = false;   // true once the mp3 failed to load
  var ctx = null;            // WebAudio context (fallback only)
  var playing = false;
  var stopFallback = null;
  var listeners = [];

  function emit() { listeners.forEach(function (fn) { fn(muted); }); }

  function getEl() {
    if (audioEl) return audioEl;
    audioEl = new Audio();
    audioEl.preload = 'auto';
    audioEl.volume = cfg.meowVolume;
    audioEl.addEventListener('ended', function () { playing = false; });
    audioEl.addEventListener('pause', function () { playing = false; });
    audioEl.addEventListener('error', function () { audioBroken = true; playing = false; });
    audioEl.src = cfg.meow;
    return audioEl;
  }

  function getCtx() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ctx = new AC();
    }
    return ctx;
  }

  // Short, soft synthesized "mew" — placeholder until a real meow.mp3 is added.
  function playFallback() {
    var ac = getCtx();
    if (!ac) return false;
    if (ac.state === 'suspended') ac.resume();
    var t = ac.currentTime, dur = 0.75;
    var osc = ac.createOscillator();
    var filt = ac.createBiquadFilter();
    var gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t);
    osc.frequency.exponentialRampToValueAtTime(820, t + 0.18);
    osc.frequency.exponentialRampToValueAtTime(560, t + dur);
    filt.type = 'bandpass';
    filt.Q.value = 3;
    filt.frequency.setValueAtTime(900, t);
    filt.frequency.exponentialRampToValueAtTime(1800, t + 0.25);
    filt.frequency.exponentialRampToValueAtTime(1100, t + dur);
    var peak = 0.5 * cfg.meowVolume;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(peak, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filt); filt.connect(gain); gain.connect(ac.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
    playing = true;
    osc.onended = function () { playing = false; stopFallback = null; };
    stopFallback = function () { try { osc.stop(); } catch (e) {} playing = false; stopFallback = null; };
    return true;
  }

  function stop() {
    if (stopFallback) stopFallback();
    if (audioEl && !audioEl.paused) { audioEl.pause(); }
    if (audioEl) { try { audioEl.currentTime = 0; } catch (e) {} }
    playing = false;
  }

  // opts.force: interrupt whatever is playing (used for the petting meow)
  function play(opts) {
    opts = opts || {};
    if (muted || !unlocked) return false;
    if (playing) {
      if (!opts.force) return false;   // never overlap idle meows
      stop();
    }
    if (!audioBroken) {
      var el = getEl();
      try {
        el.currentTime = 0;
        playing = true;
        var p = el.play();
        if (p && p.catch) {
          p.catch(function () {
            playing = false;
            audioBroken = true;     // e.g. file missing / unsupported
            playFallback();
          });
        }
        return true;
      } catch (e) { playing = false; audioBroken = true; }
    }
    return playFallback();
  }

  // Called from a real user gesture. Safe to call repeatedly.
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    var ac = getCtx();
    if (ac && ac.state === 'suspended') ac.resume();
    // Prime the <audio> element silently so later programmatic play() is allowed.
    var el = getEl();
    el.muted = true;
    var p = el.play();
    var done = function () { el.pause(); try { el.currentTime = 0; } catch (e) {} el.muted = false; playing = false; };
    if (p && p.then) { p.then(done).catch(function () { el.muted = false; audioBroken = true; }); }
    else done();
    document.documentElement.classList.add('audio-unlocked');
  }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch (e) {}
    if (muted) stop();
    emit();
  }

  ['pointerdown', 'keydown', 'touchstart'].forEach(function (evt) {
    window.addEventListener(evt, unlock, { once: false, passive: true, capture: true });
  });

  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); });

  window.CatAudio = {
    play: play,
    stop: stop,
    unlock: unlock,
    isUnlocked: function () { return unlocked; },
    isMuted: function () { return muted; },
    setMuted: setMuted,
    toggle: function () { setMuted(!muted); },
    onChange: function (fn) { listeners.push(fn); }
  };
})();
