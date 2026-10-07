/* Blue Hour — concept homepage behaviour (runs after site.js) */
(function () {
	'use strict';

	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var toArray = function (list) { return Array.prototype.slice.call(list); };
	var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
	var lerp = function (a, b, t) { return a + (b - a) * t; };
	var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
	var pad = function (n) { return (n < 10 ? '0' : '') + n; };

	/* ---------- Hero reel ----------
	   Cycles through the shots; the slate shows which stage of the method is on screen. */
	var reel = document.getElementById('top');
	var shots = toArray(reel.querySelectorAll('.shot'));
	var slate = reel.querySelector('.slate');
	var slateNum = slate.querySelector('.slate-num');
	var slateStage = slate.querySelector('.slate-stage');
	var slateNote = slate.querySelector('.slate-note');
	var bars = toArray(slate.querySelectorAll('.slate-bars li'));
	var HOLD = 4200;
	var current = 0, timer = null, reelVisible = true;
	slate.style.setProperty('--hold', HOLD + 'ms');

	function media(el) { return el.querySelector('video'); }

	function show(n) {
		var prev = shots[current], next = shots[n];
		if (prev !== next) {
			prev.classList.remove('is-on');
			prev.classList.add('is-out');
			setTimeout(function () {
				prev.classList.remove('is-out');
				if (media(prev)) media(prev).pause();
			}, 2000);
		}
		next.classList.remove('is-out');
		next.classList.add('is-on');
		if (media(next)) { media(next).currentTime = 0; media(next).play().catch(function () {}); }
		current = n;

		slate.classList.add('is-switching');
		setTimeout(function () {
			slateNum.textContent = pad(n + 1);
			slateStage.textContent = next.dataset.stage;
			slateNote.textContent = next.dataset.note;
			slate.classList.remove('is-switching');
		}, 350);
		bars.forEach(function (b, i) {
			b.classList.toggle('is-done', i < n);
			b.classList.remove('is-on');
		});
		// Restart the progress fill on the next frame so the transition runs from zero
		requestAnimationFrame(function () { requestAnimationFrame(function () { bars[n].classList.add('is-on'); }); });
	}
	function play() {
		if (timer || reduceMotion || !reelVisible || document.hidden) return;
		timer = setInterval(function () { show((current + 1) % shots.length); }, HOLD);
	}
	function pause() { clearInterval(timer); timer = null; }

	show(0);
	play();
	if ('IntersectionObserver' in window) {
		new IntersectionObserver(function (entries) {
			reelVisible = entries[0].isIntersecting;
			if (reelVisible) play(); else pause();
		}).observe(reel);
	}
	document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(); });

	/* ---------- Method film ----------
	   Scroll position through the tall .film section drives everything: the viewfinder rectangle,
	   which layer shows inside it, the chapter text and the timecode. Each chapter holds its frame for
	   the first part of its scroll range, then travels to the next. */
	var film = document.querySelector('.film');
	var stick = film.querySelector('.film-stick');
	var layersEl = film.querySelector('.film-layers');
	var layers = toArray(film.querySelectorAll('.film-layer'));
	var layerMedia = layers.map(function (l) { return l.querySelector('img, video'); });
	var finder = film.querySelector('.viewfinder');
	var timecode = film.querySelector('.timecode');
	var chapters = toArray(film.querySelectorAll('.ch'));
	var rail = toArray(film.querySelectorAll('.film-rail li'));
	var N = chapters.length;
	var HOLD_FRACTION = .55;
	var FILM_SECONDS = 20, FPS = 24;

	// Viewfinder position per chapter, as fractions of the screen. The last one is the case-study frame.
	var FRAMES = {
		wide: [
			{ x: .62, y: .32, w: .22, h: .3 },   // signal: a glimpse
			{ x: .5, y: .2, w: .38, h: .6 },     // observation: closer
			{ x: .44, y: .3, w: .5, h: .42 },    // interpretation: wide, letterboxed
			{ x: .55, y: .16, w: .32, h: .72 },  // intervention: tall
			{ x: .48, y: .24, w: .44, h: .54 },  // response
			{ x: .42, y: 0, w: .58, h: 1 }       // case: bleeds off the edge
		],
		narrow: [
			{ x: .3, y: .2, w: .4, h: .2 },
			{ x: .08, y: .17, w: .84, h: .3 },
			{ x: .04, y: .2, w: .92, h: .24 },
			{ x: .2, y: .15, w: .6, h: .36 },
			{ x: .1, y: .18, w: .8, h: .3 },
			{ x: 0, y: 0, w: 1, h: .55 }
		]
	};
	var lastActive = -1;

	function updateFilm() {
		var r = film.getBoundingClientRect();
		var vw = stick.clientWidth, vh = stick.clientHeight;
		if (r.bottom < 0 || r.top > window.innerHeight) return;

		var p = clamp(-r.top / (r.height - vh), 0, 1);
		var f = p * N;
		var i = Math.min(Math.floor(f), N - 1);
		var local = f - i;
		var t = i < N - 1 ? ease(clamp((local - HOLD_FRACTION) / (1 - HOLD_FRACTION), 0, 1)) : 0;

		var set = vw <= 736 ? FRAMES.narrow : FRAMES.wide;
		var a = set[i], b = set[Math.min(i + 1, N - 1)];
		var x = lerp(a.x, b.x, t) * vw, y = lerp(a.y, b.y, t) * vh;
		var w = lerp(a.w, b.w, t) * vw, h = lerp(a.h, b.h, t) * vh;

		layersEl.style.clipPath = 'inset(' + y.toFixed(1) + 'px ' + (vw - x - w).toFixed(1) + 'px ' + (vh - y - h).toFixed(1) + 'px ' + x.toFixed(1) + 'px)';
		finder.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
		finder.style.width = w.toFixed(1) + 'px';
		finder.style.height = h.toFixed(1) + 'px';

		layers.forEach(function (layer, k) {
			var o = k === i ? 1 - t : k === i + 1 ? t : 0;
			layer.style.opacity = o.toFixed(3);
			if (o <= 0) return;
			// How far through its own chapter this layer is (0 → 1), used for drift and video scrubbing
			var own = clamp((f - k + (1 - HOLD_FRACTION)) / (2 - HOLD_FRACTION), 0, 1);
			var m = layerMedia[k];
			if (!reduceMotion) m.style.transform = 'scale(' + (1.14 - .1 * own).toFixed(4) + ')';
			if (m.tagName === 'VIDEO' && m.duration) m.currentTime = own * (m.duration - .05);
		});

		var active = t > .5 ? i + 1 : i;
		if (active !== lastActive) {
			chapters.forEach(function (c, k) { c.classList.toggle('is-on', k === active); });
			rail.forEach(function (li, k) {
				li.classList.toggle('is-on', k === active);
				li.classList.toggle('is-past', k < active);
			});
			film.classList.toggle('is-case', active === N - 1);
			lastActive = active;
		}

		var secs = p * FILM_SECONDS;
		timecode.textContent = '00:00:' + pad(Math.floor(secs)) + ':' + pad(Math.floor(secs * FPS) % FPS) + '  ' + (rail[active] ? rail[active].textContent : '');
	}

	var ticking = false;
	function requestFilm() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; updateFilm(); }); } }
	window.addEventListener('scroll', requestFilm, { passive: true });
	window.addEventListener('resize', requestFilm);
	updateFilm();
	if (lastActive === -1) chapters[0].classList.add('is-on');

	/* ---------- Reactive project index ----------
	   Each project names a world; hovering or focusing a project fades the whole section into it.
	   On touch screens the project crossing the middle of the screen takes over instead. */
	var index = document.getElementById('work');
	var worlds = toArray(index.querySelectorAll('.world'));
	var projects = toArray(index.querySelectorAll('.proj'));
	var DEFAULT_WORLD = 'dusk';

	function setWorld(name, project) {
		worlds.forEach(function (w) { w.classList.toggle('is-on', w.dataset.world === name); });
		projects.forEach(function (p) { p.classList.toggle('is-active', p === project); });
	}

	if (window.matchMedia('(hover: hover)').matches) {
		projects.forEach(function (p) {
			p.addEventListener('mouseenter', function () { setWorld(p.dataset.world, p); });
		});
		index.querySelector('.projects').addEventListener('mouseleave', function () { setWorld(DEFAULT_WORLD, null); });
	} else if ('IntersectionObserver' in window) {
		var projIO = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) { if (e.isIntersecting) setWorld(e.target.dataset.world, e.target); });
		}, { rootMargin: '-45% 0px -45% 0px' });
		projects.forEach(function (p) { projIO.observe(p); });
	}
	projects.forEach(function (p) {
		p.addEventListener('focus', function () { setWorld(p.dataset.world, p); });
	});
})();
