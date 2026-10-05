/* Blue Hour — shared behaviour for all language versions */
(function () {
	'use strict';

	var body = document.body;
	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* ---------- Intro ---------- */
	function ready() { body.classList.add('is-ready'); }
	if (document.readyState === 'complete') ready();
	else { window.addEventListener('load', ready); setTimeout(ready, 1800); }

	/* ---------- Reveal on scroll ---------- */
	var revealEls = document.querySelectorAll('[data-reveal]');
	if ('IntersectionObserver' in window && !reduceMotion) {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
			});
		}, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
		revealEls.forEach(function (el) { io.observe(el); });
	} else {
		revealEls.forEach(function (el) { el.classList.add('is-in'); });
	}

	/* ---------- Header and background parallax ---------- */
	var header = document.getElementById('header');
	var hero = document.getElementById('top');
	var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));
	var floats = Array.prototype.slice.call(document.querySelectorAll('.float'));
	floats.forEach(function (f) { f._drift = parseFloat(f.getAttribute('data-drift')) || 0; });
	var lastY = window.scrollY, ticking = false;

	function onFrame() {
		ticking = false;
		var y = window.scrollY;
		var vh = window.innerHeight;

		// Transparent over the hero, solid cream once past it
		header.classList.toggle('is-solid', y > hero.offsetHeight - header.offsetHeight - 10);
		var menuOpen = body.classList.contains('menu-open');
		header.classList.toggle('is-hidden', !menuOpen && y > vh && y > lastY + 4);
		if (y < lastY - 4 || y <= vh) header.classList.remove('is-hidden');
		lastY = y;

		if (!reduceMotion) {
			// Collage: each photo rises at its own speed while the hero is on screen
			if (y < hero.offsetHeight) {
				floats.forEach(function (f) {
					f.style.transform = 'translate3d(0,' + (-y * f._drift).toFixed(1) + 'px,0)';
				});
			}
			parallaxEls.forEach(function (img) {
				var media = img.parentNode;
				var r = media.parentNode.getBoundingClientRect();
				if (r.bottom < -100 || r.top > vh + 100) return;
				// -1 when the band enters from below, +1 when it leaves at the top
				var t = Math.max(-1, Math.min(1, (vh / 2 - (r.top + r.height / 2)) / (vh / 2 + r.height / 2)));
				// never move further than the media's overscan, so no gaps appear
				var room = (media.offsetHeight - r.height) / 2;
				var shift = t * room * Math.min(1, parseFloat(img.dataset.parallax) * 5);
				img.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0)';
			});
		}
	}
	function requestFrame() { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } }
	window.addEventListener('scroll', requestFrame, { passive: true });
	window.addEventListener('resize', requestFrame);
	onFrame();

	/* ---------- Active nav link ---------- */
	var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav ul a'));
	var sectionMap = {};
	navLinks.forEach(function (a) { sectionMap[a.getAttribute('href').slice(1)] = a; });
	// Sections without their own nav entry highlight their parent
	var parentOf = { cases: 'workwithus', people: 'about' };
	if ('IntersectionObserver' in window) {
		var navIO = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (!e.isIntersecting) return;
				var id = parentOf[e.target.id] || e.target.id;
				navLinks.forEach(function (a) { a.classList.toggle('is-active', a === sectionMap[id]); });
			});
		}, { rootMargin: '-45% 0px -50% 0px' });
		document.querySelectorAll('main > section[id]').forEach(function (el) { navIO.observe(el); });
	}

	/* ---------- Mobile menu ---------- */
	var toggle = document.querySelector('.menu-toggle');
	function setMenu(open) {
		body.classList.toggle('menu-open', open);
		toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
		body.style.overflow = open ? 'hidden' : '';
	}
	toggle.addEventListener('click', function () { setMenu(!body.classList.contains('menu-open')); });
	navLinks.forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
	document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });


	/* ---------- Copy email ---------- */
	document.querySelectorAll('[data-copy]').forEach(function (btn) {
		var label = btn.textContent;
		btn.addEventListener('click', function () {
			var text = btn.getAttribute('data-copy');
			var done = function () {
				btn.textContent = btn.getAttribute('data-copied') || 'Copied';
				btn.classList.add('is-copied');
				setTimeout(function () { btn.textContent = label; btn.classList.remove('is-copied'); }, 1800);
			};
			if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
			else {
				var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select();
				try { document.execCommand('copy'); done(); } catch (e) {}
				document.body.removeChild(t);
			}
		});
	});

	/* ---------- Footer clocks ---------- */
	var clocks = document.querySelectorAll('[data-tz]');
	function tick() {
		var now = new Date();
		clocks.forEach(function (c) {
			try {
				c.textContent = now.toLocaleTimeString('en-GB', { timeZone: c.dataset.tz, hour: '2-digit', minute: '2-digit' });
			} catch (e) { c.parentNode.style.display = 'none'; }
		});
	}
	tick(); setInterval(tick, 15000);

	document.querySelector('.to-top').addEventListener('click', function () {
		window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
	});

	/* ---------- Contact form ----------
	   Set data-endpoint on the <form> to a Formspree URL (https://formspree.io/f/xxxxxxx)
	   to receive messages by email. While it is empty, submitting opens the visitor's
	   email app with the message filled in, so the form works on any host. */
	var form = document.getElementById('contact-form');
	var statusEl = form.querySelector('.form-status');
	var submitBtn = form.querySelector('.submit');
	var successEl = document.querySelector('.form-success');
	var endpoint = (form.getAttribute('data-endpoint') || '').trim();
	var to = form.getAttribute('data-mailto');
	var msg = function (k, fallback) { return form.getAttribute('data-msg-' + k) || fallback; };

	function setStatus(text, isError) {
		statusEl.textContent = text || '';
		statusEl.classList.toggle('is-error', !!isError);
	}
	function succeed() {
		form.reset();
		form.style.display = 'none';
		successEl.classList.add('is-shown');
	}
	function busy(on) {
		submitBtn.disabled = on;
		submitBtn.classList.toggle('is-waiting', on);
	}

	form.addEventListener('submit', function (e) {
		e.preventDefault();
		setStatus('');

		var fields = ['name', 'email', 'message'];
		for (var i = 0; i < fields.length; i++) {
			var f = form.elements[fields[i]];
			f.value = f.value.trim();
			if (!f.checkValidity()) {
				f.focus();
				setStatus(f.validity.typeMismatch ? msg('email', 'Please enter a valid email address.') : msg('required', 'Please fill in every field.'), true);
				return;
			}
		}
		// Honeypot: bots fill hidden fields, people don't
		if (form.elements._gotcha && form.elements._gotcha.value) { succeed(); return; }

		var name = form.elements.name.value, email = form.elements.email.value, message = form.elements.message.value;

		if (!endpoint) {
			var subject = msg('subject', 'Website enquiry') + ' — ' + name;
			var bodyText = message + '\n\n— ' + name + ' (' + email + ')';
			window.location.href = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyText);
			setStatus(msg('mailto', 'Your email app should open with your message ready to send.'));
			return;
		}

		busy(true);
		fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { 'Accept': 'application/json' } })
			.then(function (r) { return r.json().catch(function () { return {}; }).then(function (o) { return { ok: r.ok, o: o }; }); })
			.then(function (res) {
				busy(false);
				if (res.ok && res.o.ok !== false) succeed();
				else setStatus((res.o.errors && res.o.errors[0] && res.o.errors[0].message) || msg('error', 'Sorry, something went wrong.'), true);
			})
			.catch(function () { busy(false); setStatus(msg('error', 'Sorry, something went wrong.'), true); });
	});
})();
