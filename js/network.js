/* =========================================================================
   PolTrade — abstract trade-network background
   Points drift slowly, fade in and out over long lifetimes, connect to near
   neighbours, and a few particles travel along multi-hop "routes".
   Reduced motion → a single static frame of the same network.
   ========================================================================= */
(function () {
  'use strict';

  var THEMES = {
    light: { node: '21,20,15', line: '21,20,15', particle: '198,63,32', nodeA: 0.42, lineA: 0.14, routeA: 0.30 },
    dark:  { node: '243,239,230', line: '243,239,230', particle: '255,138,99', nodeA: 0.5, lineA: 0.12, routeA: 0.32 }
  };

  var reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var coarseQuery = window.matchMedia('(pointer: coarse), (max-width: 760px)');

  function rand(a, b) { return a + Math.random() * (b - a); }
  function smooth(t) { return t * t * (3 - 2 * t); }

  function Network(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.theme = THEMES[canvas.getAttribute('data-network')] || THEMES.light;
    this.density = parseFloat(canvas.getAttribute('data-network-density') || '1');
    this.nodes = [];
    this.routes = [];
    this.pointer = { x: -9999, y: -9999, active: false };
    this.visible = false;
    this.running = false;
    this.last = 0;
    this.time = 0;
    this._frame = this.frame.bind(this);
    this.resize();
    this.bind();
  }

  Network.prototype.isMobile = function () { return coarseQuery.matches; };

  Network.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var mobile = this.isMobile();
    var area = this.w * this.h;
    var per = mobile ? 26000 : 15500;
    var count = Math.round(Math.min(mobile ? 30 : 90, Math.max(14, area / per)) * this.density);
    this.linkDist = mobile ? 120 : Math.min(190, Math.max(140, this.w / 9));
    this.maxRoutes = mobile ? 2 : 5;
    this.speedScale = mobile ? 0.55 : 1;
    this.seed(count);
    if (!this.running) this.draw();
  };

  Network.prototype.makeNode = function (initial) {
    var life = rand(14, 34);
    return {
      bx: rand(-0.04, 1.04) * this.w,
      by: rand(-0.04, 1.04) * this.h,
      ax: rand(6, 22), ay: rand(6, 18),               // drift amplitude (px)
      fx: rand(0.018, 0.05), fy: rand(0.015, 0.045),  // drift frequency (Hz)
      px: rand(0, Math.PI * 2), py: rand(0, Math.PI * 2),
      life: life,
      age: initial ? rand(0, life) : 0,
      r: Math.random() < 0.1 ? rand(2, 2.6) : rand(1, 1.7),
      hub: false,
      ox: 0, oy: 0,                                   // pointer offset (eased)
      x: 0, y: 0, a: 0
    };
  };

  Network.prototype.seed = function (count) {
    this.nodes = [];
    for (var i = 0; i < count; i++) this.nodes.push(this.makeNode(true));
    // a handful of persistent "hubs" — markets — that never fade
    var hubs = Math.max(3, Math.round(count / 18));
    for (var h = 0; h < hubs && h < this.nodes.length; h++) {
      var n = this.nodes[h];
      n.hub = true; n.r = 2.6; n.ax *= 0.5; n.ay *= 0.5;
      n.bx = this.w * (0.35 + 0.6 * ((h + 0.5) / hubs)) + rand(-40, 40);
      n.by = this.h * rand(0.15, 0.85);
    }
    this.routes = [];
    this.update(0);
  };

  Network.prototype.alphaFor = function (n) {
    if (n.hub) return 1;
    var t = n.age / n.life;
    // fade in over first 20 %, out over last 25 %
    if (t < 0.2) return smooth(t / 0.2);
    if (t > 0.75) return smooth(Math.max(0, (1 - t) / 0.25));
    return 1;
  };

  Network.prototype.update = function (dt) {
    var t = this.time;
    var p = this.pointer;
    var R = 170;
    for (var i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i];
      n.age += dt;
      if (!n.hub && n.age >= n.life) {
        var fresh = this.makeNode(false);
        fresh.r = n.r; this.nodes[i] = n = fresh;
      }
      var x = n.bx + Math.sin(t * n.fx * 6.283 + n.px) * n.ax * this.speedScale;
      var y = n.by + Math.cos(t * n.fy * 6.283 + n.py) * n.ay * this.speedScale;

      // extremely restrained pointer response: nearby points ease away a few px
      var tx = 0, ty = 0;
      if (p.active) {
        var dx = x - p.x, dy = y - p.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < R && d > 0.001) {
          var f = (1 - d / R); f = f * f * 9;
          tx = (dx / d) * f; ty = (dy / d) * f;
        }
      }
      n.ox += (tx - n.ox) * Math.min(1, dt * 2.5);
      n.oy += (ty - n.oy) * Math.min(1, dt * 2.5);
      n.x = x + n.ox; n.y = y + n.oy;
      n.a = this.alphaFor(n);
    }

    // routes: particles travelling along a chain of neighbouring nodes
    for (var r = this.routes.length - 1; r >= 0; r--) {
      var route = this.routes[r];
      route.t += dt * route.speed;
      route.fade = route.t < 0.5 ? Math.min(1, route.fade + dt * 0.8) : route.fade;
      if (route.t >= route.path.length - 1) {
        route.fade -= dt * 0.6;
        if (route.fade <= 0) this.routes.splice(r, 1);
      }
    }
    this.spawnTimer = (this.spawnTimer || 0) - dt;
    if (this.routes.length < this.maxRoutes && this.spawnTimer <= 0) {
      this.spawnRoute();
      this.spawnTimer = rand(1.6, 3.8);
    }
  };

  Network.prototype.spawnRoute = function () {
    var nodes = this.nodes;
    if (nodes.length < 4) return;
    var start = nodes[Math.floor(Math.random() * nodes.length)];
    if (start.a < 0.6) return;
    var path = [start];
    var dir = Math.random() < 0.5 ? 1 : -1;          // general heading, east or west
    var hops = Math.floor(rand(3, 6));
    var maxD = this.linkDist * 1.05;
    for (var h = 0; h < hops; h++) {
      var cur = path[path.length - 1], best = null, bestScore = -Infinity;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (path.indexOf(n) !== -1 || n.a < 0.5) continue;
        var dx = n.x - cur.x, dy = n.y - cur.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d > maxD || d < 20) continue;
        var score = dx * dir - Math.abs(dy) * 0.35 + rand(0, 30);
        if (score > bestScore) { bestScore = score; best = n; }
      }
      if (!best) break;
      path.push(best);
    }
    if (path.length < 3) return;
    this.routes.push({ path: path, t: 0, speed: rand(0.16, 0.26) * this.speedScale, fade: 0 });
  };

  Network.prototype.draw = function () {
    var ctx = this.ctx, th = this.theme, nodes = this.nodes, L = this.linkDist, L2 = L * L;
    ctx.clearRect(0, 0, this.w, this.h);

    // connections
    ctx.lineWidth = 1;
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      if (a.a <= 0.01) continue;
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        if (b.a <= 0.01) continue;
        var dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 > L2) continue;
        var k = 1 - Math.sqrt(d2) / L;
        var alpha = th.lineA * k * k * Math.min(a.a, b.a);
        if (alpha < 0.004) continue;
        ctx.strokeStyle = 'rgba(' + th.line + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    // active routes: slightly stronger path + travelling particle
    for (var r = 0; r < this.routes.length; r++) {
      var route = this.routes[r], path = route.path, f = Math.max(0, route.fade);
      ctx.strokeStyle = 'rgba(' + th.line + ',' + (th.routeA * 0.55 * f).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
      for (var s = 1; s < path.length; s++) ctx.lineTo(path[s].x, path[s].y);
      ctx.stroke();
      ctx.setLineDash([]);

      var seg = Math.min(path.length - 2, Math.floor(route.t));
      var lt = Math.min(1, route.t - seg);
      var p0 = path[seg], p1 = path[seg + 1];
      var e = smooth(lt);
      var px = p0.x + (p1.x - p0.x) * e, py = p0.y + (p1.y - p0.y) * e;
      // short trail
      var tx = p0.x + (p1.x - p0.x) * Math.max(0, e - 0.18), ty = p0.y + (p1.y - p0.y) * Math.max(0, e - 0.18);
      var grad = ctx.createLinearGradient(tx, ty, px, py);
      grad.addColorStop(0, 'rgba(' + th.particle + ',0)');
      grad.addColorStop(1, 'rgba(' + th.particle + ',' + (0.55 * f).toFixed(3) + ')');
      ctx.strokeStyle = grad; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py); ctx.stroke();
      ctx.fillStyle = 'rgba(' + th.particle + ',' + (0.85 * f).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(px, py, 2.1, 0, Math.PI * 2); ctx.fill();
    }

    // points
    for (var n = 0; n < nodes.length; n++) {
      var node = nodes[n];
      if (node.a <= 0.01) continue;
      ctx.fillStyle = 'rgba(' + th.node + ',' + (th.nodeA * node.a).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2); ctx.fill();
      if (node.hub) {
        var pulse = reducedQuery.matches ? 0.5 : 0.5 + 0.5 * Math.sin(this.time * 0.5 + node.px);
        ctx.strokeStyle = 'rgba(' + th.node + ',' + (0.14 + 0.08 * pulse).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(node.x, node.y, 7 + pulse * 2, 0, Math.PI * 2); ctx.stroke();
      }
    }
  };

  Network.prototype.drawStatic = function () {
    // same network, frozen, with a few routes drawn as dashed paths
    this.time = 0;
    for (var i = 0; i < this.nodes.length; i++) {
      var n = this.nodes[i]; n.age = n.life * 0.5; n.ox = n.oy = 0;
    }
    this.pointer.active = false;
    this.update(0);
    this.routes = [];
    for (var r = 0; r < this.maxRoutes; r++) this.spawnRoute();
    for (var k = 0; k < this.routes.length; k++) { this.routes[k].fade = 0.8; this.routes[k].t = this.routes[k].path.length - 1.4; }
    this.draw();
  };

  Network.prototype.frame = function (now) {
    if (!this.running) return;
    var dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0.016;
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this._frame);
  };

  Network.prototype.start = function () {
    if (this.running || reducedQuery.matches || !this.visible || document.hidden) return;
    this.running = true; this.last = 0;
    this.raf = requestAnimationFrame(this._frame);
  };
  Network.prototype.stop = function () {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
  };
  Network.prototype.refreshMode = function () {
    if (reducedQuery.matches) { this.stop(); this.drawStatic(); }
    else this.start();
  };

  Network.prototype.bind = function () {
    var self = this;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        self.visible = entries[0].isIntersecting;
        if (self.visible) self.refreshMode(); else self.stop();
      }, { rootMargin: '80px' }).observe(this.canvas);
    } else { this.visible = true; this.refreshMode(); }

    if ('ResizeObserver' in window) {
      var pendingW = 0;
      new ResizeObserver(function () {
        var w = self.canvas.getBoundingClientRect().width;
        // ignore height-only changes (mobile URL bar) to avoid re-seeding while scrolling
        if (Math.abs(w - pendingW) < 2 && self.nodes.length) return;
        pendingW = w;
        self.resize();
        if (reducedQuery.matches) self.drawStatic();
      }).observe(this.canvas);
    }

    var host = this.canvas.parentElement;
    if (!coarseQuery.matches) {
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
    for (var i = 0; i < canvases.length; i++) instances.push(new Network(canvases[i]));
  }

  document.addEventListener('visibilitychange', function () {
    instances.forEach(function (n) { if (document.hidden) n.stop(); else n.refreshMode(); });
  });
  var onReduce = function () { instances.forEach(function (n) { n.refreshMode(); }); };
  if (reducedQuery.addEventListener) reducedQuery.addEventListener('change', onReduce);
  else if (reducedQuery.addListener) reducedQuery.addListener(onReduce);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
