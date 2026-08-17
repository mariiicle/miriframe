// Navbar sticky + scroll-up button
const navbar = document.getElementById('navbar');
const scrollBtn = document.getElementById('scrollUpBtn');

window.addEventListener('scroll', () => {
    if (window.scrollY > 20) navbar.classList.add('sticky');
    else navbar.classList.remove('sticky');

    if (window.scrollY > 500) scrollBtn.classList.add('show');
    else scrollBtn.classList.remove('show');
});

scrollBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const navMenu = document.getElementById('navMenu');

menuToggle.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    menuToggle.querySelector('i').classList.toggle('active');
});

// Portfolio filter
const filterBtns = document.querySelectorAll('.filter-btn');
const cards = document.querySelectorAll('.port-card');

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        const filter = btn.dataset.filter;
        cards.forEach(card => {
            if (filter === 'all' || card.dataset.category === filter) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    });
});

// ── Three.js 3D viewer (basic auto-rotate) ──────────────────────────────────
let three = {
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    model: null,
    animId: null,
    resizeHandler: null
};

function init3DViewer(modelSrc) {
    cleanup3DViewer();

    const OrbitControls = THREE.OrbitControls || window.OrbitControls;
    const GLTFLoader    = THREE.GLTFLoader    || window.GLTFLoader;
    const DRACOLoader   = THREE.DRACOLoader   || window.DRACOLoader;

    if (!OrbitControls || !GLTFLoader) {
        console.error('Three.js add-ons not found. Check your script tags.');
        return;
    }

    const container = document.getElementById('lb3DContainer');
    const canvas    = document.getElementById('lbCanvas3D');
    const errorBox  = document.getElementById('lb3DError');
    if (errorBox) {
        errorBox.textContent = '';
        errorBox.style.display = 'none';
    }

    void container.offsetWidth;
    const rect = container.getBoundingClientRect();
    const w = rect.width  || 640;
    const h = rect.height || 360;

    three.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    three.renderer.setSize(w, h, false);
    three.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (THREE.sRGBEncoding !== undefined) {
        three.renderer.outputEncoding = THREE.sRGBEncoding;
    }

    three.scene = new THREE.Scene();
    three.scene.background = new THREE.Color(0x20263a);

    three.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const hemi = new THREE.HemisphereLight(0xffffff, 0x445577, 0.85);
    three.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(8, 12, 6);
    three.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x8899ff, 0.35);
    fill.position.set(-6, 4, -8);
    three.scene.add(fill);

    three.camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);

    three.controls = new OrbitControls(three.camera, canvas);
    three.controls.enableDamping = true;
    three.controls.dampingFactor = 0.06;
    three.controls.enablePan = false;
    three.controls.enableZoom = true;
    three.controls.autoRotate = true;
    three.controls.autoRotateSpeed = 1.2;

    const loader = new GLTFLoader();
    if (DRACOLoader) {
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
        loader.setDRACOLoader(dracoLoader);
    }

    function onModelLoaded(gltf) {
            const model = gltf.scene;
            three.model = model;
            three.scene.add(model);

            // Use a world-space bounding sphere so the model always fits the popup.
            const bounds = new THREE.Box3().setFromObject(model);
            const sphere = bounds.getBoundingSphere(new THREE.Sphere());
            const center = sphere.center.clone();
            const radius = Math.max(sphere.radius || 0, 0.5);

            model.position.sub(center);
            const fittedRadius = 2.0;
            const uniformScale = fittedRadius / radius;
            model.scale.setScalar(uniformScale);

            model.updateMatrixWorld(true);
            const fittedBounds = new THREE.Box3().setFromObject(model);
            const fittedSphere = fittedBounds.getBoundingSphere(new THREE.Sphere());
            const r = Math.max(fittedSphere.radius || 0, 0.75);
            const c = fittedSphere.center.clone();

            const distance = r * 2.9;
            three.camera.position.set(c.x + distance, c.y + distance * 0.65, c.z + distance);
            three.camera.near = Math.max(0.01, distance / 200);
            three.camera.far = distance * 200;
            three.camera.updateProjectionMatrix();

            three.controls.target.copy(c);
            three.controls.minDistance = Math.max(r * 0.8, 0.6);
            three.controls.maxDistance = distance * 3.2;
            three.controls.update();
    }

    const modelSrcSafe = encodeURI(modelSrc);
    const srcCandidates = Array.from(new Set([
        modelSrc,
        modelSrcSafe,
        `./${modelSrc}`,
        `./${modelSrcSafe}`,
        `/${modelSrc}`,
        `/${modelSrcSafe}`
    ]));

    let srcIndex = 0;
    function tryLoadNextSource() {
        const currentSrc = srcCandidates[srcIndex++];

        // Preflight check ensures we only pass a reachable URL to GLTFLoader.
        fetch(currentSrc, { method: 'GET', cache: 'no-store' })
            .then(function (res) {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                loader.load(
                    currentSrc,
                    onModelLoaded,
                    undefined,
                    function (err) {
                        if (srcIndex < srcCandidates.length) {
                            tryLoadNextSource();
                            return;
                        }
                        console.error('GLB load error:', err);
                        if (errorBox) {
                            errorBox.textContent = `Unable to load 3D model: ${currentSrc}`;
                            errorBox.style.display = 'block';
                        }
                    }
                );
            })
            .catch(function () {
                if (srcIndex < srcCandidates.length) {
                    tryLoadNextSource();
                    return;
                }
                if (errorBox) {
                    errorBox.textContent = `GLB not reachable: ${currentSrc}`;
                    errorBox.style.display = 'block';
                }
            });
    }
    tryLoadNextSource();

    three.resizeHandler = function () {
        if (!three.renderer || !three.camera || !container) return;
        const nextRect = container.getBoundingClientRect();
        const nextW = nextRect.width || 640;
        const nextH = nextRect.height || 360;
        three.camera.aspect = nextW / nextH;
        three.camera.updateProjectionMatrix();
        three.renderer.setSize(nextW, nextH, false);
    };
    window.addEventListener('resize', three.resizeHandler);

    function animate() {
        three.animId = requestAnimationFrame(animate);
        three.controls.update();
        three.renderer.render(three.scene, three.camera);
    }
    animate();
}

function cleanup3DViewer() {
    if (three.animId) cancelAnimationFrame(three.animId);
    if (three.resizeHandler) window.removeEventListener('resize', three.resizeHandler);
    if (three.renderer) {
        three.renderer.dispose();
        three.renderer = null;
    }
    const errorBox = document.getElementById('lb3DError');
    if (errorBox) {
        errorBox.textContent = '';
        errorBox.style.display = 'none';
    }
    three.scene = three.camera = three.controls = three.model = three.animId = three.resizeHandler = null;
}

// ── Lightbox open ───────────────────────────────────────────────────────────
// Works with both call styles:
//   openLightbox(title, desc, event)
//   openLightbox(title, desc, 'fas fa-icon', event)
function openLightbox(title, desc, iconOrEvent, maybeEvent) {
    const event = (maybeEvent instanceof Event)  ? maybeEvent
                : (iconOrEvent instanceof Event) ? iconOrEvent
                : null;
    const icon  = (iconOrEvent instanceof Event || !iconOrEvent) ? null : iconOrEvent;
    const btn   = event ? event.currentTarget : null;

    const lbImage       = document.getElementById('lbImage');
    const lbFallback    = document.getElementById('lbFallbackIcon');
    const lbPlaceholder = document.getElementById('lbPlaceholder');
    const lb3DContainer = document.getElementById('lb3DContainer');
    const lbVideoContainer = document.getElementById('lbVideoContainer');
    const lbVideo = document.getElementById('lbVideo');

    const lbType   = btn ? btn.getAttribute('data-lightbox-type')  : null;
    const modelSrc = btn ? btn.getAttribute('data-lightbox-model') : null;
    const videoSrc = btn ? btn.getAttribute('data-lightbox-video') : null;

    document.getElementById('lbTitle').textContent = title;
    document.getElementById('lbDesc').textContent  = desc;

    const lbPostLink = document.getElementById('lbPostLink');
    const postUrl    = btn ? btn.getAttribute('data-lightbox-post') : null;
    if (postUrl) {
        lbPostLink.href = postUrl;
        lbPostLink.hidden = false;
    } else {
        lbPostLink.hidden = true;
        lbPostLink.removeAttribute('href');
    }

    if (lbType === '3d' && modelSrc) {
        // ── 3D mode ──
        lbPlaceholder.style.display = 'none';
        lbVideoContainer.style.display = 'none';
        lbVideo.pause();
        lbVideo.removeAttribute('src');
        lbVideo.load();
        lb3DContainer.style.display = 'block';
        // Double rAF: first frame lets the container paint, second reads real dimensions
        requestAnimationFrame(() => requestAnimationFrame(() => init3DViewer(modelSrc)));
    } else if (lbType === 'video' && videoSrc) {
        // ── Video mode ──
        cleanup3DViewer();
        lb3DContainer.style.display = 'none';
        lbPlaceholder.style.display = 'none';
        lbVideoContainer.style.display = 'block';
        lbVideo.src = videoSrc;
        lbVideo.load();
        const autoPlayPromise = lbVideo.play();
        if (autoPlayPromise && typeof autoPlayPromise.catch === 'function') {
            autoPlayPromise.catch(() => {
                // Ignore autoplay block; controls let user start playback.
            });
        }
    } else {
        // ── Image mode ──
        cleanup3DViewer();
        lb3DContainer.style.display = 'none';
        lbVideoContainer.style.display = 'none';
        lbVideo.pause();
        lbVideo.removeAttribute('src');
        lbVideo.load();
        lbPlaceholder.style.display = 'flex';

        const lightboxSrc = btn ? btn.getAttribute('data-lightbox-img') : null;
        const cardThumb   = btn ? btn.closest('.card-thumb') : null;
        const cardImg     = cardThumb ? cardThumb.querySelector('img') : null;
        const fallbackSrc = cardImg && cardImg.style.display !== 'none'
                          ? cardImg.getAttribute('src') : null;
        const imgSrc      = lightboxSrc || fallbackSrc;

        const showIcon = () => {
            lbImage.style.display    = 'none';
            lbFallback.className     = icon || 'fas fa-image';
            lbFallback.style.display = 'block';
            lbPlaceholder.style.background = '';
        };

        if (imgSrc) {
            lbImage.src              = imgSrc;
            lbImage.alt              = title;
            lbImage.style.display    = 'block';
            lbFallback.style.display = 'none';
            lbPlaceholder.style.background = '#111';
            lbImage.onerror = showIcon;
        } else {
            showIcon();
        }
    }

    document.getElementById('lightbox').classList.add('open');
}

// ── Lightbox close ──────────────────────────────────────────────────────────
function closeLightbox() {
    document.getElementById('lightbox').classList.remove('open');
    const lbImage = document.getElementById('lbImage');
    const lbVideo = document.getElementById('lbVideo');
    lbImage.src     = '';
    lbImage.onerror = null;
    lbVideo.pause();
    lbVideo.removeAttribute('src');
    lbVideo.load();
    cleanup3DViewer();
    document.getElementById('lb3DContainer').style.display = 'none';
    document.getElementById('lbVideoContainer').style.display = 'none';
    document.getElementById('lbPlaceholder').style.display = 'flex';
    document.getElementById('lbPostLink').hidden = true;
    document.getElementById('lbPostLink').removeAttribute('href');
}

// X button
document.getElementById('lightboxCloseBtn').addEventListener('click', function (e) {
    e.stopPropagation();
    closeLightbox();
});

// Close on backdrop click
document.getElementById('lightbox').addEventListener('click', function (e) {
    if (e.target === this) closeLightbox();
});

// Scroll-triggered surfaces (hero, filters, grid, stats, CTA)
(function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var nodes = document.querySelectorAll('.filter-bar, .portfolio-grid, .stats-bar, .cta-section');
    if (!nodes.length) return;
    var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) entry.target.classList.add('is-in-view');
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' });
    nodes.forEach(function (el) {
        el.classList.add('js-scroll-surface');
        io.observe(el);
    });
})();
