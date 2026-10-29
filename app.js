/* ==========================================================================
   TAURO SERVICIO LAVADO | Comportamiento de la landing
   Capas: carga, scroll suave (Lenis), animacion por scroll (GSAP + ScrollTrigger),
   burbujas 3D del hero (Three.js), comparadores, formulario a WhatsApp.
   Principio: todo el contenido es visible sin JS ni librerias; la animacion
   es una mejora progresiva y respeta prefers-reduced-motion.
   ========================================================================== */
(() => {
    'use strict';

    /* ---------- Configuracion ---------- */
    const WA_NUMBER = '525632617305';
    const root = document.documentElement;
    const $ = (s, c = document) => c.querySelector(s);
    const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const waURL = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const rand = (a, b) => a + Math.random() * (b - a);

    let hasGSAP = false;
    let lenis = null;
    let introTL = null;
    let menuOpen = false;

    const safe = (name, fn) => {
        try { fn(); } catch (err) { console.error(`[Tauro] ${name}`, err); }
    };

    /* Ejecuta cb cuando el elemento entra/sale de pantalla */
    const watchVisible = (el, cb, margin = '0px') => {
        if (!('IntersectionObserver' in window)) { cb(true); return; }
        new IntersectionObserver((entries) => entries.forEach((e) => cb(e.isIntersecting)), { rootMargin: margin }).observe(el);
    };

    /* ---------- 1. Enlaces de WhatsApp ---------- */
    $$('[data-wa]').forEach((a) => { a.href = waURL(a.dataset.wa); });

    /* ---------- 2. Carga (spinner + progreso real) ---------- */
    const loader = $('#loader');
    let loaderFinished = false;

    const MESSAGES = [
        [0, 'Preparando espuma'],
        [30, 'Calibrando equipos de extracción'],
        [62, 'Puliendo los detalles'],
        [90, 'Todo listo']
    ];

    function runLoader() {
        if (!loader) return;
        document.body.classList.add('is-locked');
        const pctEl = $('#loaderPct');
        const statusEl = $('#loaderStatus');
        const MIN = reduced ? 300 : 2100;
        const t0 = performance.now();
        let lastT = t0;
        let ready = false;
        let progress = 0;

        const pageReady = new Promise((res) => {
            if (document.readyState === 'complete') res();
            else window.addEventListener('load', res, { once: true });
        });
        const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        Promise.all([pageReady, fontsReady]).then(() => { ready = true; });
        setTimeout(() => { ready = true; }, 7000);

        const paint = (p) => {
            loader.style.setProperty('--p', (p / 100).toFixed(4));
            pctEl.textContent = `${Math.round(p)}%`;
            let msg = MESSAGES[0][1];
            MESSAGES.forEach(([at, text]) => { if (p >= at) msg = text; });
            if (statusEl.textContent !== msg) statusEl.textContent = msg;
        };

        const tick = (now) => {
            const dt = Math.min((now - lastT) / 1000, 0.1);
            lastT = now;
            const timeP = clamp((now - t0) / MIN, 0, 1);
            const eased = 1 - Math.pow(1 - timeP, 3);
            const cap = ready ? 100 : 92;
            const target = Math.min(cap, eased * 100);
            progress += (target - progress) * (1 - Math.exp(-dt * 8));
            paint(progress);
            if (ready && timeP >= 1 && progress > 99.3) { paint(100); finishLoader(); return; }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        setTimeout(finishLoader, 10000);
    }

    function finishLoader() {
        if (loaderFinished || !loader) return;
        loaderFinished = true;
        const wait = reduced ? 60 : 380;
        setTimeout(() => {
            loader.classList.add('is-done');
            document.body.classList.remove('is-locked');
            if (lenis) lenis.start();
            if (introTL) setTimeout(() => introTL.play(), 420);
            setTimeout(() => {
                loader.classList.add('is-gone');
                if (hasGSAP) window.ScrollTrigger.refresh();
            }, reduced ? 150 : 1200);
        }, wait);
    }

    /* ---------- 3. Scroll suave + GSAP ---------- */
    function initScrollEngine() {
        if (!window.gsap || !window.ScrollTrigger) { root.classList.add('no-gsap'); return; }
        hasGSAP = true;
        gsap.registerPlugin(ScrollTrigger);

        if (window.Lenis && !reduced) {
            lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
            lenis.on('scroll', ScrollTrigger.update);
            gsap.ticker.add((time) => lenis.raf(time * 1000));
            gsap.ticker.lagSmoothing(0);
            lenis.stop();
        }
    }

    const scrollToTarget = (el) => {
        if (lenis) lenis.scrollTo(el, { offset: -70, duration: 1.7 });
        else el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    };

    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href');
        if (id.length < 2) return;
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (menuOpen) toggleMenu(false);
        setTimeout(() => scrollToTarget(target), menuOpen ? 350 : 0);
    });

    /* ---------- 4. Navegacion ---------- */
    const nav = $('#nav');
    const menu = $('#menu');
    const burger = $('#burger');

    function toggleMenu(force) {
        menuOpen = typeof force === 'boolean' ? force : !menuOpen;
        menu.classList.toggle('is-open', menuOpen);
        menu.setAttribute('aria-hidden', String(!menuOpen));
        burger.setAttribute('aria-expanded', String(menuOpen));
        burger.setAttribute('aria-label', menuOpen ? 'Cerrar menú' : 'Abrir menú');
        document.body.classList.toggle('is-locked', menuOpen);
        if (lenis) (menuOpen ? lenis.stop() : lenis.start());
        if (menuOpen) nav.classList.remove('is-hidden');
    }
    burger.addEventListener('click', () => toggleMenu());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) toggleMenu(false); });

    function initNav() {
        if (hasGSAP) {
            ScrollTrigger.create({
                start: 40, end: 'max',
                onToggle: (self) => nav.classList.toggle('is-scrolled', self.isActive)
            });
            ScrollTrigger.create({
                start: 0, end: 'max',
                onUpdate: (self) => {
                    if (menuOpen) return;
                    nav.classList.toggle('is-hidden', self.direction === 1 && self.scroll() > 520);
                }
            });
            gsap.to('.scroll-progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });
        } else {
            const sentinel = document.createElement('div');
            sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:60px;pointer-events:none';
            document.body.prepend(sentinel);
            new IntersectionObserver(([en]) => nav.classList.toggle('is-scrolled', !en.isIntersecting)).observe(sentinel);
        }

        const links = $$('.nav__links a');
        const map = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
        const io = new IntersectionObserver((entries) => {
            entries.forEach((en) => {
                const link = map.get(en.target.id);
                if (link) link.classList.toggle('is-active', en.isIntersecting);
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        map.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
        const colch = document.getElementById('colchones');
        if (colch) io.observe(colch);
    }

    /* ---------- 5. Texto: palabras enmascaradas ---------- */
    function splitWords(el) {
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        el.setAttribute('aria-label', text);
        el.textContent = '';
        const inner = [];
        text.split(' ').forEach((word, i, arr) => {
            const mask = document.createElement('span');
            mask.className = 'w';
            mask.setAttribute('aria-hidden', 'true');
            const span = document.createElement('span');
            span.textContent = word;
            mask.appendChild(span);
            el.appendChild(mask);
            if (i < arr.length - 1) el.appendChild(document.createTextNode(' '));
            inner.push(span);
        });
        return inner;
    }

    /* ---------- 6. Hero: entrada, tilt y burbujas 3D ---------- */
    function buildIntro() {
        if (!hasGSAP || reduced) return;
        introTL = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } });
        introTL
            .from('.hero__title .line__in', { yPercent: 125, duration: 1.4, stagger: 0.14 })
            .from('.hero__lead', { y: 30, opacity: 0, duration: 1.1 }, '-=1')
            .from('.hero__cta > *', { y: 30, opacity: 0, duration: 1, stagger: 0.1 }, '-=0.9')
            .from('.stage__main', { y: 70, opacity: 0, scale: 0.96, duration: 1.5 }, '-=1.4')
            .from('.stage__arch', { opacity: 0, scale: 0.7, duration: 1.3 }, '-=1.1')
            .from('.seal', { scale: 0, rotation: -120, duration: 1.3, ease: 'back.out(1.5)' }, '-=1.1');
    }

    function initTilt() {
        if (!hasGSAP || reduced || !finePointer) return;
        $$('[data-tilt]').forEach((el) => {
            const rx = gsap.quickTo(el, 'rotationX', { duration: 0.9, ease: 'power3' });
            const ry = gsap.quickTo(el, 'rotationY', { duration: 0.9, ease: 'power3' });
            gsap.set(el, { transformPerspective: 1100 });
            const zone = el.closest('.hero') || el;
            zone.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                const nx = clamp((e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1);
                const ny = clamp((e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2), -1, 1);
                ry(nx * 6);
                rx(-ny * 4);
            });
            zone.addEventListener('pointerleave', () => { rx(0); ry(0); });
        });
    }

    function initBubbles() {
        const canvas = $('#gl');
        const hero = $('#inicio');
        if (!canvas || !window.THREE || !hero) return;

        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
        } catch (err) { return; }
        renderer.setClearColor(0x000000, 0);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
        camera.position.z = 14;
        const FOV = 38 * Math.PI / 180;

        const uTime = { value: 0 };
        const vert = `
            uniform float uTime; uniform float uSeed;
            varying vec3 vN; varying vec3 vV;
            void main() {
                vec3 p = position;
                float w = sin(p.x * 3.0 + uTime * 1.6 + uSeed * 6.2831) * 0.035 + sin(p.y * 4.0 + uTime * 1.3 + uSeed * 3.0) * 0.03;
                p += normal * w;
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                vN = normalize(normalMatrix * normal);
                vV = normalize(-mv.xyz);
                gl_Position = projectionMatrix * mv;
            }`;
        const frag = `
            uniform float uTime; uniform float uSeed;
            varying vec3 vN; varying vec3 vV;
            vec3 pal(float t) { return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }
            void main() {
                vec3 N = normalize(vN); vec3 V = normalize(vV);
                float ndv = clamp(dot(N, V), 0.0, 1.0);
                float fres = pow(1.0 - ndv, 2.2);
                float film = fres * 1.4 + uSeed + uTime * 0.04;
                vec3 irid = pal(film);
                vec3 brand = mix(vec3(0.12, 0.28, 0.84), vec3(0.13, 0.65, 0.90), 0.5 + 0.5 * sin(film * 6.28318));
                vec3 col = mix(brand, irid, 0.55);
                vec3 L = normalize(vec3(-0.55, 0.75, 0.6));
                float spec = pow(max(dot(reflect(-L, N), V), 0.0), 48.0);
                float spec2 = pow(max(dot(reflect(-normalize(vec3(0.7, -0.5, 0.4)), N), V), 0.0), 30.0) * 0.35;
                float a = fres * 0.62 + 0.035 + spec * 0.9 + spec2;
                col += vec3(spec + spec2);
                gl_FragColor = vec4(col, clamp(a, 0.0, 0.92));
            }`;

        const geo = new THREE.SphereGeometry(1, 40, 40);
        const small = window.innerWidth < 700;
        const COUNT = small ? 12 : 24;
        const bubbles = [];
        const halfH = (z) => Math.tan(FOV / 2) * (camera.position.z - z);

        for (let i = 0; i < COUNT; i++) {
            const mat = new THREE.ShaderMaterial({
                vertexShader: vert, fragmentShader: frag, transparent: true, depthWrite: false,
                uniforms: { uTime, uSeed: { value: Math.random() } }
            });
            const mesh = new THREE.Mesh(geo, mat);
            const z = rand(-7, 4);
            const r = rand(0.22, 1.25) * (small ? 0.8 : 1);
            mesh.scale.setScalar(r);
            scene.add(mesh);
            bubbles.push({ mesh, z, r, x: 0, y: 0, speed: rand(0.18, 0.55) / (0.6 + r), sway: rand(0.35, 0.9), phase: rand(0, 6.28), depth: (z + 8) / 12 });
        }

        let aspect = 1;
        const resize = () => {
            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (!w || !h) return;
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
            renderer.setSize(w, h, false);
            aspect = w / h;
            camera.aspect = aspect;
            camera.updateProjectionMatrix();
        };
        resize();
        window.addEventListener('resize', resize);

        /* Sesgo hacia la derecha en pantallas anchas: el texto del hero queda mas limpio */
        const pickX = (hh) => {
            const half = hh * aspect;
            return aspect > 1.2 && Math.random() < 0.62 ? rand(0.05, 1) * half : rand(-1, 1) * half;
        };
        bubbles.forEach((b) => {
            const hh = halfH(b.z);
            b.x = pickX(hh);
            b.y = rand(-hh, hh);
        });

        const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
        hero.addEventListener('pointermove', (e) => {
            pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
            pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
        });
        hero.addEventListener('pointerleave', () => { pointer.tx = 0; pointer.ty = 0; });

        const scrollState = { p: 0 };
        if (hasGSAP) {
            ScrollTrigger.create({ trigger: hero, start: 'top top', end: 'bottom top', onUpdate: (s) => { scrollState.p = s.progress; } });
        }

        const step = (t, dt) => {
            uTime.value = t;
            pointer.x += (pointer.tx - pointer.x) * 0.05;
            pointer.y += (pointer.ty - pointer.y) * 0.05;
            camera.position.y = -scrollState.p * 3.2;
            bubbles.forEach((b) => {
                const hh = halfH(b.z);
                b.y += b.speed * dt * (1 + scrollState.p * 3);
                if (b.y > hh + b.r * 2) {
                    b.y = -hh - b.r * 2;
                    b.x = pickX(hh);
                }
                b.mesh.position.set(
                    b.x + Math.sin(t * b.sway + b.phase) * 0.35 + pointer.x * b.depth * 1.6,
                    b.y - pointer.y * b.depth * 1.0,
                    b.z
                );
            });
            renderer.render(scene, camera);
        };

        if (reduced) { step(0, 0); return; }

        let visible = true, last = performance.now(), running = false;
        const loop = (now) => {
            if (!visible || document.hidden) { running = false; return; }
            const dt = Math.min((now - last) / 1000, 0.05);
            last = now;
            step(now / 1000, dt);
            requestAnimationFrame(loop);
        };
        const start = () => { if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); } };
        watchVisible(hero, (v) => { visible = v; if (v) start(); });
        document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
        start();
    }

    /* ---------- 7. Comparadores antes / despues ---------- */
    const sliderApi = new Map();

    function initSliders() {
        $$('[data-ba]').forEach((ba) => {
            const range = $('.ba__range', ba);
            range.step = 'any';
            const st = { pos: 50 };
            let tween = null, resume = null;

            const apply = (v) => {
                st.pos = clamp(v, 0, 100);
                ba.style.setProperty('--pos', st.pos.toFixed(2) + '%');
                range.value = st.pos;
            };
            apply(50);

            const stopAuto = () => { if (tween) { tween.kill(); tween = null; } };
            const startAuto = () => {
                if (!hasGSAP || reduced || !ba.hasAttribute('data-autoplay')) return;
                stopAuto();
                tween = gsap.to(st, { pos: st.pos > 50 ? 14 : 86, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: () => apply(st.pos) });
            };
            const interact = () => {
                stopAuto();
                clearTimeout(resume);
                resume = setTimeout(startAuto, 5500);
            };
            range.addEventListener('input', () => { interact(); apply(parseFloat(range.value)); });
            range.addEventListener('pointerdown', interact);

            if (ba.hasAttribute('data-autoplay')) {
                apply(18);
                watchVisible(ba, (v) => { if (v) { if (!tween && !resume) startAuto(); else if (tween) tween.play(); } else if (tween) tween.pause(); });
            }

            sliderApi.set(ba, { apply, stopAuto, st });
        });
    }

    const CASES = [
        { title: 'Sala acanalada en tono crema', text: 'Manchas de uso en los asientos y tono opaco. Después de la extracción profunda, la tela recupera claridad y textura.', tags: ['Sala', 'Manchas de uso', 'Tela'],
          before: 'img/web/sala-crema-antes.webp', after: 'img/web/sala-crema-despues.webp', w: 860, h: 500, alts: ['Sala crema antes del lavado', 'Sala crema después del lavado'] },
        { title: 'Sillón beige de dos plazas', text: 'Asiento opaco y con marcas de humedad. El lavado devuelve el tono uniforme y la textura de la tela tejida.', tags: ['Sillón', 'Humedad', 'Tela tejida'],
          before: 'img/web/sillon-beige-antes.webp', after: 'img/web/sillon-beige-despues.webp', w: 860, h: 490, alts: ['Sillón beige antes del lavado', 'Sillón beige después del lavado'] },
        { title: 'Colchón con manchas amarillas', text: 'Manchas profundas de uso y derrames. La extracción llega al interior de la fibra y el colchón vuelve a verse limpio.', tags: ['Colchón', 'Manchas profundas', 'Ácaros'],
          before: 'img/web/colchon-antes.webp', after: 'img/web/colchon-despues.webp', w: 1100, h: 478, alts: ['Colchón con manchas antes del lavado', 'Colchón limpio después del lavado'] },
        { title: 'Alfombra de escalera', text: 'Zona de tránsito pesado con suciedad incrustada. Recupera color y fibra, escalón por escalón.', tags: ['Alfombra', 'Tránsito pesado', 'Escalera'],
          before: 'img/web/escalera-antes.webp', after: 'img/web/escalera-despues.webp', w: 580, h: 464, alts: ['Escalera alfombrada antes del lavado', 'Escalera alfombrada después del lavado'] }
    ];

    function initProofTabs() {
        const ba = $('#proofBa');
        if (!ba) return;
        const api = sliderApi.get(ba);
        const tabs = $$('.tab');
        const imgAfter = $('#proofAfter'), imgBefore = $('#proofBefore');
        let current = 0, token = 0;

        const preload = (src) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = res; i.src = src; });

        const show = (i) => {
            if (i === current) return;
            current = i;
            const c = CASES[i];
            const my = ++token;
            tabs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', String(k === i)); });
            ba.classList.add('is-swapping');
            Promise.all([preload(c.before), preload(c.after), new Promise((r) => setTimeout(r, 260))]).then(() => {
                if (my !== token) return;
                imgBefore.src = c.before; imgBefore.alt = c.alts[0]; imgBefore.width = c.w; imgBefore.height = c.h;
                imgAfter.src = c.after; imgAfter.alt = c.alts[1]; imgAfter.width = c.w; imgAfter.height = c.h;
                ba.style.setProperty('--ar', `${c.w} / ${c.h}`);
                $('#caseTitle').textContent = c.title;
                $('#caseText').textContent = c.text;
                $('#caseTags').innerHTML = c.tags.map((t) => `<li>${t}</li>`).join('');
                ba.classList.remove('is-swapping');
                if (hasGSAP && !reduced) {
                    const o = { v: 94 };
                    gsap.to(o, { v: 50, duration: 1.5, ease: 'power3.inOut', onUpdate: () => api.apply(o.v) });
                } else api.apply(50);
                if (hasGSAP) ScrollTrigger.refresh();
            });
        };
        tabs.forEach((t, i) => t.addEventListener('click', () => show(i)));
        tabs.forEach((t, i) => t.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); tabs[(i + 1) % tabs.length].focus(); show((i + 1) % tabs.length); }
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); const n = (i - 1 + tabs.length) % tabs.length; tabs[n].focus(); show(n); }
        }));

        if (hasGSAP && !reduced) {
            api.apply(94);
            ScrollTrigger.create({
                trigger: ba, start: 'top 72%', once: true,
                onEnter: () => { const o = { v: 94 }; gsap.to(o, { v: 50, duration: 2.4, ease: 'power3.inOut', onUpdate: () => api.apply(o.v) }); }
            });
        }
    }

    /* ---------- 8. Lupa de colchon ---------- */
    function initLens() {
        const lens = $('#lens');
        if (!lens) return;
        let w = 0, h = 0;
        const pos = { x: 0, y: 0 };
        let user = false, idleTimer = null, visible = false, raf = null;

        const measure = () => {
            const r = lens.getBoundingClientRect();
            w = r.width; h = r.height;
            lens.style.setProperty('--ld', clamp(w * 0.36, 112, 200).toFixed(0) + 'px');
            if (!pos.x) { pos.x = w * 0.3; pos.y = h * 0.5; }
        };
        const apply = () => {
            lens.style.setProperty('--lx', pos.x.toFixed(1) + 'px');
            lens.style.setProperty('--ly', pos.y.toFixed(1) + 'px');
        };
        measure(); apply();
        window.addEventListener('resize', () => { measure(); apply(); });

        const move = (e) => {
            const r = lens.getBoundingClientRect();
            const tx = clamp(e.clientX - r.left, 0, r.width);
            const ty = clamp(e.clientY - r.top, 0, r.height);
            user = true;
            clearTimeout(idleTimer);
            if (hasGSAP) gsap.to(pos, { x: tx, y: ty, duration: 0.45, ease: 'power3.out', overwrite: true, onUpdate: apply });
            else { pos.x = tx; pos.y = ty; apply(); }
        };
        const release = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => { user = false; }, 2200); };
        lens.addEventListener('pointermove', move);
        lens.addEventListener('pointerdown', move);
        lens.addEventListener('pointerleave', release);
        lens.addEventListener('pointerup', release);

        if (reduced) return;
        let t = 0, last = performance.now();
        const loop = (now) => {
            if (!visible) { raf = null; return; }
            const dt = Math.min((now - last) / 1000, 0.05); last = now;
            if (!user) {
                t += dt;
                pos.x += (w * (0.5 + 0.3 * Math.sin(t * 0.8)) - pos.x) * 0.06;
                pos.y += (h * (0.5 + 0.2 * Math.sin(t * 1.25 + 1)) - pos.y) * 0.06;
                apply();
            }
            raf = requestAnimationFrame(loop);
        };
        watchVisible(lens, (v) => { visible = v; if (v && !raf) { last = performance.now(); measure(); raf = requestAnimationFrame(loop); } });
    }

    /* ---------- 9. Imagen que se abre con el scroll ---------- */
    function initExpand() {
        const section = $('.expand');
        if (!section || !hasGSAP || reduced) return;
        const pin = $('.expand__pin', section);
        const frame = $('.expand__frame', section);
        const img = $('.expand__img', section);
        const title = $('.expand__title', section);
        const tags = $$('.expand__tag', section);
        const cap = $('.expand__caption', section);

        const mm = gsap.matchMedia();
        mm.add({ desk: '(min-width: 900px)', mob: '(max-width: 899px)' }, (ctx) => {
            const desk = ctx.conditions.desk;
            const from = desk ? 'inset(37% 27% 10% 27% round 36px)' : 'inset(40% 7% 12% 7% round 28px)';
            gsap.set(frame, { clipPath: from });
            const tl = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                    trigger: section, start: 'top top', end: '+=170%', pin, scrub: 0.8, anticipatePin: 1,
                    onUpdate: (self) => title.classList.toggle('is-light', self.progress > 0.42)
                }
            });
            tl.fromTo(frame, { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 1 }, 0)
              .fromTo(img, { scale: 1.16 }, { scale: 1, duration: 1.1 }, 0)
              .fromTo(tags, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.22, stagger: 0.1 }, 0.78)
              .fromTo(cap, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.25 }, 0.9);
            return () => title.classList.remove('is-light');
        });
    }

    /* ---------- 10. Galeria horizontal ---------- */
    function initReel() {
        const section = $('.reel');
        const track = $('#reelTrack');
        const bar = $('#reelBar');
        const viewport = $('.reel__viewport');
        if (!section || !track) return;

        const setBar = (p) => { bar.style.transform = `scaleX(${(0.1 + 0.9 * clamp(p, 0, 1)).toFixed(4)})`; };
        viewport.addEventListener('scroll', () => {
            const max = viewport.scrollWidth - viewport.clientWidth;
            if (max > 0) setBar(viewport.scrollLeft / max);
        }, { passive: true });

        if (!hasGSAP || reduced) return;
        const mm = gsap.matchMedia();
        mm.add('(min-width: 900px)', () => {
            const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth);
            gsap.to(track, {
                x: () => -dist(), ease: 'none',
                scrollTrigger: {
                    trigger: section, start: 'top top', end: () => '+=' + dist(), pin: $('.reel__pin', section),
                    scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1,
                    onUpdate: (self) => setBar(self.progress)
                }
            });
            return () => { gsap.set(track, { clearProps: 'transform' }); setBar(0); };
        });
    }

    /* ---------- 11. Proceso ---------- */
    function initProcess() {
        const steps = $('#steps');
        if (!steps) return;
        const items = $$('.step', steps);
        if (!hasGSAP || reduced) { items.forEach((s) => s.classList.add('is-active')); steps.style.setProperty('--p', 1); return; }
        gsap.to(steps, { '--p': 1, ease: 'none', scrollTrigger: { trigger: steps, start: 'top 72%', end: 'bottom 62%', scrub: true } });
        items.forEach((s) => ScrollTrigger.create({ trigger: s, start: 'top 64%', end: 'bottom 64%', toggleClass: { targets: s, className: 'is-active' } }));
    }

    /* ---------- 12. Pila de tarjetas (sticky stack) ---------- */
    function initStack() {
        const cards = $$('#stack .card');
        if (!cards.length || !hasGSAP || reduced) return;
        const navH = 64;
        cards.forEach((card, i) => {
            if (i === cards.length - 1) return;
            const nextTop = navH + 28 + (i + 1) * 16;
            gsap.to(card, {
                scale: 0.94, ease: 'none',
                scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: `top ${nextTop}px`, scrub: true }
            });
        });
    }

    /* ---------- 13. Revelados por scroll ---------- */
    function initReveals() {
        if (!hasGSAP || reduced) return;

        $$('[data-split]').forEach((el) => {
            const words = splitWords(el);
            gsap.from(words, {
                yPercent: 118, duration: 1.15, ease: 'power4.out', stagger: 0.055,
                scrollTrigger: { trigger: el, start: 'top 88%', once: true }
            });
        });

        $$('[data-reveal]').filter((el) => !el.classList.contains('tile')).forEach((el) => {
            gsap.from(el, {
                y: 56, opacity: 0, duration: 1.2, ease: 'power3.out',
                scrollTrigger: { trigger: el, start: 'top 90%', once: true }
            });
        });

        const tiles = $$('.bento .tile');
        gsap.set(tiles, { y: 70, opacity: 0, scale: 0.96 });
        ScrollTrigger.batch(tiles, {
            start: 'top 92%', once: true,
            onEnter: (batch) => gsap.to(batch, { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: 'power3.out', stagger: 0.12 })
        });

        $$('.tile__img').forEach((img) => {
            gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
        });
    }

    /* ---------- 14. Contadores ---------- */
    function initCounters() {
        $$('.count').forEach((el) => {
            const to = parseFloat(el.dataset.to);
            if (!hasGSAP || reduced) { el.textContent = to; return; }
            const o = { v: 0 };
            ScrollTrigger.create({
                trigger: el, start: 'top 92%', once: true,
                onEnter: () => gsap.to(o, { v: to, duration: 2.4, ease: 'power2.out', onUpdate: () => { el.textContent = Math.round(o.v); } })
            });
        });
    }

    /* ---------- 15. Preguntas frecuentes ---------- */
    function initFAQ() {
        const items = $$('.acc');
        items.forEach((item) => {
            const btn = $('.acc__btn', item);
            btn.addEventListener('click', () => {
                const open = !item.classList.contains('is-open');
                items.forEach((o) => { o.classList.remove('is-open'); $('.acc__btn', o).setAttribute('aria-expanded', 'false'); });
                item.classList.toggle('is-open', open);
                btn.setAttribute('aria-expanded', String(open));
                if (hasGSAP) setTimeout(() => ScrollTrigger.refresh(), 700);
            });
        });
    }

    /* ---------- 16. Efectos de puntero ---------- */
    function initPointerFx() {
        $$('[data-spot]').forEach((el) => {
            el.addEventListener('pointermove', (e) => {
                const r = el.getBoundingClientRect();
                el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                el.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });
        if (!hasGSAP || reduced || !finePointer) return;
        $$('.btn--magnetic').forEach((btn) => {
            const qx = gsap.quickTo(btn, 'x', { duration: 0.6, ease: 'power3' });
            const qy = gsap.quickTo(btn, 'y', { duration: 0.6, ease: 'power3' });
            btn.addEventListener('pointermove', (e) => {
                const r = btn.getBoundingClientRect();
                qx((e.clientX - (r.left + r.width / 2)) * 0.22);
                qy((e.clientY - (r.top + r.height / 2)) * 0.3);
            });
            btn.addEventListener('pointerleave', () => { qx(0); qy(0); });
        });
    }

    /* ---------- 17. Formulario a WhatsApp ---------- */
    function initForm() {
        const form = $('#waForm');
        if (!form) return;
        const note = $('#formNote');
        const label = $('#waSubmit span');
        const defaultLabel = label.textContent;
        const defaultNote = note.textContent;

        const setErr = (id, msg) => {
            const err = $('#e-' + id);
            const field = err.closest('.field');
            err.textContent = msg;
            field.classList.toggle('is-invalid', !!msg);
            const input = $('#f-' + id);
            if (input) input.setAttribute('aria-invalid', String(!!msg));
        };

        ['nombre', 'servicio'].forEach((id) => {
            $('#f-' + id).addEventListener('input', () => setErr(id, ''));
            $('#f-' + id).addEventListener('change', () => setErr(id, ''));
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const nombre = $('#f-nombre').value.trim();
            const servicio = $('#f-servicio').value;
            const piezas = $('#f-piezas').value;
            const zona = $('#f-zona').value.trim();
            const mensaje = $('#f-mensaje').value.trim();

            let ok = true;
            if (nombre.length < 2) { setErr('nombre', 'Escribe tu nombre para saludarte bien.'); ok = false; } else setErr('nombre', '');
            if (!servicio) { setErr('servicio', 'Elige qué quieres lavar.'); ok = false; } else setErr('servicio', '');
            if (!ok) { const bad = $('.is-invalid input, .is-invalid select', form); if (bad) bad.focus(); return; }

            const lines = [
                `Hola Tauro, soy ${nombre}.`,
                `Quiero cotizar: ${servicio} (${piezas} ${piezas === '1' ? 'pieza' : 'piezas'}).`
            ];
            if (zona) lines.push(`Zona: ${zona}.`);
            if (mensaje) lines.push(`Detalles: ${mensaje}`);
            lines.push('¿Me ayudan con una cotización?');

            form.classList.add('is-sending');
            label.textContent = 'Abriendo WhatsApp...';
            const win = window.open(waURL(lines.join('\n')), '_blank', 'noopener');
            if (!win) window.location.href = waURL(lines.join('\n'));
            note.textContent = 'Listo. Si WhatsApp no se abrió, usa el botón verde de la esquina.';
            setTimeout(() => {
                form.classList.remove('is-sending');
                label.textContent = defaultLabel;
                note.textContent = defaultNote;
            }, 4500);
        });
    }

    /* ---------- 18. Boton flotante ---------- */
    function initFloat() {
        const wa = $('.wa-float');
        if (!wa) return;
        setTimeout(() => {
            wa.classList.add('is-tip');
            setTimeout(() => wa.classList.remove('is-tip'), 4200);
        }, 8000);
    }

    /* ---------- Arranque ---------- */
    initScrollEngine();
    safe('loader', runLoader);
    safe('intro', buildIntro);
    safe('sliders', initSliders);
    safe('proof', initProofTabs);
    safe('lens', initLens);
    /* Los pines se crean primero y en orden de pagina para que los disparadores posteriores midan bien */
    safe('expand', initExpand);
    safe('reel', initReel);
    safe('nav', initNav);
    safe('process', initProcess);
    safe('stack', initStack);
    safe('reveals', initReveals);
    safe('counters', initCounters);
    safe('faq', initFAQ);
    safe('pointer', initPointerFx);
    safe('tilt', initTilt);
    safe('form', initForm);
    safe('float', initFloat);
    safe('bubbles', initBubbles);

    window.addEventListener('load', () => { if (hasGSAP) ScrollTrigger.refresh(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (hasGSAP) ScrollTrigger.refresh(); });
})();
