/* =========================================================================
   PolTrade — swirling galaxy background
   A dense, tilted spiral of tens of thousands of fine white particles with a
   green cloud near the core, turning once a minute.

   Performance: the particle field is rendered once into an off-screen
   texture (built lazily, the first time the canvas is visible) and rotated
   as a whole each frame. A small live layer of twinkling particles, whose
   core spins slightly faster, is drawn on top so the motion feels alive.
   Reduced motion → a single static frame.

   Canvas attributes:
     data-network-density="0.6"    particle count multiplier
     data-galaxy-dim="0.4"         strength once the hero has scrolled out of view
     data-galaxy-x / data-galaxy-y centre as a fraction of the canvas (desktop)
   ========================================================================= */
(function () {
  'use strict';

  var COLORS = {
    white: '218,225,232',
    green: '88,222,162',
    blue: '150,168,255'
  };

  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var mobileQuery = window.matchMedia('(pointer: coarse), (max-width: 760px)');

  var ARMS = 2;
  var PITCH = 3.6;                // log-spiral winding (higher = more turns)
  var OMEGA = Math.PI * 2 / 240;  // idle spin: one turn every four minutes
  // Scrolling adds spin on top of the idle speed, sized so the outer arms move at
  // roughly the scroll speed. The boost is never negative, so the galaxy never
  // stops or reverses; scrolling up also speeds it up, in the same direction.
  var SCROLL_RADIUS = 0.6;        // the boost matches scroll speed at this fraction of the radius
  var MAX_BOOST = 2;              // rad/s cap, so anchor jumps don't whip it round
  var BOOST_RISE = 0.12;          // s, how quickly it picks up speed
  var BOOST_FALL = 0.9;           // s, how gently it settles back to idle

  // page scroll speed in px/s, shared by every galaxy on the page
  var scrollSpeed = 0, lastScrollY = window.scrollY, lastScrollT = performance.now();
  function sampleScroll(now) {
    var dt = (now - lastScrollT) / 1000;
    if (dt <= 0) return scrollSpeed;
    var y = window.scrollY;
    scrollSpeed = Math.abs(y - lastScrollY) / dt;
    lastScrollY = y; lastScrollT = now;
    return scrollSpeed;
  }
  var TILT = 0.56;                // vertical squash: viewing the disc at an angle
  var INCLINE = -0.28;            // on-screen rotation of the disc, rad
  var GREEN_AT = { rn: 0.17, a: 2.4 };  // where the green cloud sits in the disc

  function rand(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() + Math.random() - 2) * 0.866; } // ~N(0,1)
  function armAngle(arm, rn) { return arm * (Math.PI * 2 / ARMS) + Math.log(Math.max(rn, 0.02) / 0.04) * PITCH; }

  // Places one particle in the disc's own plane: { rn: radius 0–1, a: angle }
  function sampleDisc() {
    var k = Math.random(), rn, a;
    if (k < 0.08) {                                   // bulge
      rn = Math.abs(gauss()) * 0.09;
      a = rand(0, Math.PI * 2);
    } else if (k < 0.14) {                            // inter-arm haze
      rn = 0.05 + Math.pow(Math.random(), 0.8) * 1.05;
      a = rand(0, Math.PI * 2);
    } else {                                          // arms: broad, fluffy bands
      rn = 0.05 + Math.pow(Math.random(), 0.75) * 1.0;
      a = armAngle(Math.floor(Math.random() * ARMS), rn) + gauss() * 0.5;
      rn *= Math.exp(gauss() * 0.05);
    }
    return { rn: rn, a: a };
  }

  // Colour mix: mostly white-grey, a green cloud near the core, rare blue specks
  function pickColor(rn, a) {
    var gx = Math.cos(a) * rn - Math.cos(GREEN_AT.a) * GREEN_AT.rn;
    var gy = Math.sin(a) * rn - Math.sin(GREEN_AT.a) * GREEN_AT.rn;
    var pGreen = 0.9 * Math.exp(-(gx * gx + gy * gy) / (2 * 0.15 * 0.15)) + 0.15 * Math.exp(-rn / 0.15);
    var r = Math.random();
    if (r < pGreen) return 'green';
    if (r > 0.955) return 'blue';
    return 'white';
  }

  function Galaxy(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.galaxy = this;                 // debugging handle: document.querySelector('canvas').galaxy
    this.density = parseFloat(canvas.getAttribute('data-network-density') || '1');
    this.fx = parseFloat(canvas.getAttribute('data-galaxy-x') || '0.66');
    this.fy = parseFloat(canvas.getAttribute('data-galaxy-y') || '0.5');
    this.dimTo = parseFloat(canvas.getAttribute('data-galaxy-dim') || '1');   // strength once the hero has scrolled away
    this.pointer = { x: 0, y: 0, active: false };
    this.shift = { x: 0, y: 0, tilt: 0 };
    this.time = rand(0, 60);
    this.angle = rand(0, Math.PI * 2);   // accumulated rotation
    this.boost = 0;                      // extra spin from scrolling, rad/s (never negative)
    this.fade = 0;
    this.running = false;
    this.visible = false;
    this.texture = null;
    this._frame = this.frame.bind(this);
    this.layout();
    this.bind();
  }

  Galaxy.prototype.layout = function () {
    var rect = this.canvas.getBoundingClientRect();
    var mobile = mobileQuery.matches;
    var dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.dpr = dpr;
    this.mobile = mobile;

    if (mobile) {
      // tucked into the top-right so the body copy stays clean
      this.cx = this.w * 0.82;
      this.cy = Math.min(this.h * 0.2, 190);
      this.R = Math.max(this.w * 1.25, 460);
      this.strength = 0.72;
    } else {
      this.cx = this.w * this.fx;
      this.cy = Math.min(this.h * this.fy, 560);
      this.R = Math.min(1500, Math.max(this.w * 0.88, Math.min(this.h, 1000) * 1.2));
      this.strength = 1;
    }
    this.texture = null;                 // rebuilt lazily on next draw
    this.seedLive();
    if (!this.running && this.visible) this.draw();
  };

  // Static particle field, rendered once into an off-screen canvas.
  Galaxy.prototype.buildTexture = function () {
    var maxTex = this.mobile ? 1400 : 2560;
    var size = Math.min(maxTex, Math.ceil(this.R * 2 * this.dpr));
    var k = size / (this.R * 2);           // texture px per css px
    var c = document.createElement('canvas');
    c.width = c.height = size;
    var g = c.getContext('2d');
    var mid = size / 2, Rt = this.R * k;

    // soft haze under the particles: faint white disc + green glow
    var haze = g.createRadialGradient(mid, mid, 0, mid, mid, Rt);
    haze.addColorStop(0, 'rgba(' + COLORS.white + ',0.10)');
    haze.addColorStop(0.4, 'rgba(' + COLORS.white + ',0.035)');
    haze.addColorStop(1, 'rgba(' + COLORS.white + ',0)');
    g.fillStyle = haze; g.fillRect(0, 0, size, size);
    var gxp = mid + Math.cos(GREEN_AT.a) * GREEN_AT.rn * Rt, gyp = mid + Math.sin(GREEN_AT.a) * GREEN_AT.rn * Rt;
    var gr = Rt * 0.3;
    var glow = g.createRadialGradient(gxp, gyp, 0, gxp, gyp, gr);
    glow.addColorStop(0, 'rgba(' + COLORS.green + ',0.22)');
    glow.addColorStop(1, 'rgba(' + COLORS.green + ',0)');
    g.fillStyle = glow; g.fillRect(gxp - gr, gyp - gr, gr * 2, gr * 2);

    // particles, batched into one path per colour/alpha bucket
    var count = Math.round((this.mobile ? 40000 : 140000) * this.density);
    var LEVELS = 6, buckets = {};
    for (var i = 0; i < count; i++) {
      var p = sampleDisc();
      if (p.rn > 1.12) continue;
      var col = pickColor(p.rn, p.a);
      var alpha = rand(0.45, 1) * (1 - 0.3 * Math.min(1, p.rn));
      var lvl = Math.min(LEVELS - 1, Math.floor(alpha * LEVELS));
      var key = col + lvl;
      var b = buckets[key] || (buckets[key] = { col: col, a: (lvl + 0.5) / LEVELS, pts: [] });
      var s = (Math.random() < 0.03 ? rand(2.4, 3.2) : rand(1, 2.1)) * k;
      b.pts.push(mid + Math.cos(p.a) * p.rn * Rt, mid + Math.sin(p.a) * p.rn * Rt, s);
    }
    Object.keys(buckets).forEach(function (key) {
      var b = buckets[key], pts = b.pts;
      g.fillStyle = 'rgba(' + COLORS[b.col] + ',' + (b.a * 0.95).toFixed(3) + ')';
      g.beginPath();
      for (var j = 0; j < pts.length; j += 3) g.rect(pts[j] - pts[j + 2] / 2, pts[j + 1] - pts[j + 2] / 2, pts[j + 2], pts[j + 2]);
      g.fill();
    });
    this.texture = c;
  };

  // Live layer: a few hundred particles drawn every frame with twinkle and a faster core.
  Galaxy.prototype.seedLive = function () {
    var n = Math.round((this.mobile ? 260 : 900) * this.density), live = [];
    for (var i = 0; i < n; i++) {
      var p = sampleDisc();
      live.push({
        rn: p.rn, r: p.rn * this.R, a0: p.a,
        col: 'rgb(' + COLORS[pickColor(p.rn, p.a)] + ')',
        size: rand(1.4, 2.6),
        alpha: rand(0.4, 1),
        tw: rand(0.6, 1.6), tp: rand(0, Math.PI * 2),
        wob: rand(0.01, 0.04), wf: rand(0.1, 0.25), wp: rand(0, Math.PI * 2)
      });
    }
    // group by colour so fillStyle changes rarely
    live.sort(function (x, y) { return x.col < y.col ? -1 : 1; });
    this.live = live;
  };

  Galaxy.prototype.update = function (dt) {
    var p = this.pointer, tx = 0, ty = 0, tt = 0;
    if (p.active) {
      // extremely restrained: the disc leans a touch towards the pointer
      tx = (p.x / this.w - 0.5) * 18;
      ty = (p.y / this.h - 0.5) * 12;
      tt = (p.y / this.h - 0.5) * 0.05;
    }
    var k = Math.min(1, dt * 1.2);
    this.shift.x += (tx - this.shift.x) * k;
    this.shift.y += (ty - this.shift.y) * k;
    this.shift.tilt += (tt - this.shift.tilt) * k;
    this.fade = Math.min(1, this.fade + dt * 0.7);
  };

  Galaxy.prototype.draw = function () {
    if (!this.texture) this.buildTexture();
    var ctx = this.ctx, t = this.time, R = this.R;
    var cx = this.cx + this.shift.x, cy = this.cy + this.shift.y;
    var tilt = TILT + this.shift.tilt;
    var rot = this.angle;
    var cosI = Math.cos(INCLINE), sinI = Math.sin(INCLINE);
    var master = this.fade * this.strength * this.scrollDim();

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    // static field: plane → rotate with the pattern → squash → incline → place
    ctx.globalAlpha = master;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(INCLINE);
    ctx.scale(1, tilt);
    ctx.rotate(rot);
    ctx.drawImage(this.texture, -R, -R, R * 2, R * 2);
    ctx.restore();

    // live layer
    var live = this.live, current = null;
    for (var i = 0; i < live.length; i++) {
      var s = live[i];
      var a = s.a0 + rot + Math.sin(t * s.wf + s.wp) * s.wob;
      if (s.rn < 0.12) a += rot * 0.6 * (1 - s.rn / 0.12);     // inner bulge turns a little faster
      var px = Math.cos(a) * s.r, py = Math.sin(a) * s.r * tilt;
      var x = cx + px * cosI - py * sinI;
      var y = cy + px * sinI + py * cosI;
      if (x < -4 || y < -4 || x > this.w + 4 || y > this.h + 4) continue;
      ctx.globalAlpha = master * s.alpha * (0.55 + 0.45 * Math.sin(t * s.tw + s.tp));
      if (s.col !== current) { ctx.fillStyle = s.col; current = s.col; }
      ctx.beginPath(); ctx.arc(x, y, s.size / 2, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Galaxy.prototype.frame = function (now) {
    if (!this.running) return;
    var dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    this.time += dt;
    // idle spin plus the eased scroll boost
    var speed = Math.min(sampleScroll(now), 6000);
    var target = Math.min(MAX_BOOST, speed / (this.R * SCROLL_RADIUS));
    var tau = target > this.boost ? BOOST_RISE : BOOST_FALL;
    this.boost += (target - this.boost) * (1 - Math.exp(-dt / tau));
    this.boost = Math.max(0, this.boost);
    this.angle += (OMEGA + this.boost) * dt;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this._frame);
  };

  Galaxy.prototype.start = function () {
    if (this.running || reducedQuery.matches || !this.visible || document.hidden) return;
    this.running = true; this.last = 0;
    this.raf = requestAnimationFrame(this._frame);
  };
  Galaxy.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  };
  Galaxy.prototype.refreshMode = function () {
    if (reducedQuery.matches) {
      this.stop();
      this.fade = 1; this.pointer.active = false; this.shift = { x: 0, y: 0, tilt: 0 };
      this.draw();
    } else this.start();
  };

  // Full strength while the hero is on screen, easing down to `dimTo` as it
  // scrolls away, so the galaxy stays visible but quiet behind the content.
  Galaxy.prototype.scrollDim = function () {
    if (this.dimTo >= 1) return 1;
    var hero = document.querySelector('.hero');
    var span = (hero ? hero.offsetHeight : this.h) * 0.85;
    var f = Math.min(1, Math.max(0, window.scrollY / span));
    f = f * f * (3 - 2 * f);
    return 1 - f * (1 - this.dimTo);
  };

  Galaxy.prototype.bind = function () {
    var self = this;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        if (self.visible) self.refreshMode(); else self.stop();
      }, { rootMargin: '120px' }).observe(this.canvas);
    } else { this.visible = true; this.refreshMode(); }

    if ('ResizeObserver' in window) {
      var lastW = this.w;
      new ResizeObserver(function () {
        var w = self.canvas.getBoundingClientRect().width;
        // ignore height-only changes (mobile URL bar) so nothing is rebuilt mid-scroll
        if (Math.abs(w - lastW) < 2) return;
        lastW = w;
        self.layout();
        if (reducedQuery.matches && self.visible) self.draw();
      }).observe(this.canvas);
    }

    // reduced motion: the frame is static, but still follow the scroll dimming
    var pending = false;
    window.addEventListener('scroll', function () {
      if (!reducedQuery.matches || pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; self.draw(); });
    }, { passive: true });

    var host = this.canvas.parentElement;
    if (!mobileQuery.matches) {
      host.addEventListener('pointermove', function (e) {
        var rect = self.canvas.getBoundingClientRect();
        self.pointer.x = e.clientX - rect.left; self.pointer.y = e.clientY - rect.top; self.pointer.active = true;
      }, { passive: true });
      host.addEventListener('pointerleave', function () { self.pointer.active = false; });
    }
  };

  var instances = [];
  function init() {
    if (!document.createElement('canvas').getContext) return;
    var canvases = document.querySelectorAll('canvas[data-network]');
    for (var i = 0; i < canvases.length; i++) instances.push(new Galaxy(canvases[i]));
  }

  document.addEventListener('visibilitychange', function () {
    instances.forEach(function (g) { if (document.hidden) g.stop(); else g.refreshMode(); });
  });
  var onReduce = function () { instances.forEach(function (g) { g.refreshMode(); }); };
  if (reducedQuery.addEventListener) reducedQuery.addEventListener('change', onReduce);
  else if (reducedQuery.addListener) reducedQuery.addListener(onReduce);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
