/* ==========================================================================
   CEEDI - 3D GEOGRAPHIC GLOBE SPHERE ONLY (PERFECT SPACING & NO TEXT OVERLAP)
   ========================================================================== */

// 0. Disable automatic browser scroll restoration on refresh (prevents jumping to old #hashes on Mac/iPhone)
if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
}

// Clean hash and scroll to top on reload/refresh
if (window.performance && window.performance.getEntriesByType('navigation')[0]?.type === 'reload') {
    if (window.location.hash) {
        window.history.replaceState(null, null, window.location.pathname);
    }
    window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // 2. WebGL Ambient Background Scene
    init3DGeometricScene();

    // 3. 3D Globe Sphere Only
    initPureGlobeSphere();

    // 4. Institutional Plan Simulator Logic
    initSimulator();

    // 5. Navbar Scroll Background Change
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 40) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Ensure page starts at top on initial load
    if (!window.location.hash) {
        window.scrollTo(0, 0);
    }
});

/* ==========================================================================
   PURE 3D GEOGRAPHIC GLOBE SPHERE (SLIGHTLY REDUCED FOR PERFECT FIT)
   ========================================================================== */
function initPureGlobeSphere() {
    const canvas = document.getElementById('hero-globe-canvas');
    if (!canvas || !window.THREE) return;

    const container = canvas.parentElement;
    const getWidth = () => container.clientWidth || 360;
    const getHeight = () => container.clientHeight || 450;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, getWidth() / getHeight(), 0.1, 100);
    camera.position.set(0, 0, 8.5);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(getWidth(), getHeight());
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    // Root Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Earth Axial Tilt (23.5° tilted)
    const axialTilt = 23.5 * (Math.PI / 180);

    // --- 1. EQUIRECTANGULAR GEOGRAPHIC MAP TEXTURE ---
    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = 2048;
    mapCanvas.height = 1024;
    const ctx = mapCanvas.getContext('2d');

    // Light Sky Blue Ocean Fill
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    oceanGrad.addColorStop(0, '#bae6fd');
    oceanGrad.addColorStop(0.3, '#7dd3fc');
    oceanGrad.addColorStop(0.7, '#38bdf8');
    oceanGrad.addColorStop(1, '#0284c7');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Ocean Currents lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.0;
    for (let y = 50; y < 1024; y += 50) {
        ctx.beginPath();
        ctx.arc(1024, y, 650, 0, Math.PI);
        ctx.stroke();
    }

    // Render 180 GeoJSON Real Country Polygons
    if (window.GEO_COUNTRIES && window.GEO_COUNTRIES.length > 0) {
        const pastelPalette = [
            '#eab308', // Mustard Yellow
            '#10b981', // Emerald Green
            '#f43f5e', // Terracotta Pink
            '#a855f7', // Lavender
            '#f97316', // Warm Orange
            '#06b6d4', // Cyan
            '#fbbf24'  // Amber
        ];

        window.GEO_COUNTRIES.forEach((item, idx) => {
            ctx.fillStyle = pastelPalette[idx % pastelPalette.length];
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            item.p.forEach((pt, i) => {
                const x = (pt[0] / 360.0 + 0.5) * 2048;
                const y = (0.5 - pt[1] / 180.0) * 1024;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });
    }

    // Lat / Lon Graticule Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.0;
    for (let lat = -80; lat <= 80; lat += 20) {
        const y = (0.5 - lat / 180.0) * 1024;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(2048, y);
        ctx.stroke();
    }

    for (let lon = -180; lon <= 180; lon += 30) {
        const x = (lon / 360.0 + 0.5) * 2048;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1024);
        ctx.stroke();
    }

    // PROMINENT BLUE EQUATOR LINE
    const eqY = 512;
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, eqY);
    ctx.lineTo(2048, eqY);
    ctx.stroke();

    const worldTexture = new THREE.CanvasTexture(mapCanvas);

    // --- 2. PURE 3D GLOBE SPHERE ---
    const globeAssembly = new THREE.Group();
    globeAssembly.rotation.z = axialTilt;
    rootGroup.add(globeAssembly);

    const sphereRadius = 2.25;
    const sphereGeo = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const sphereMat = new THREE.MeshStandardMaterial({
        map: worldTexture,
        roughness: 0.35,
        metalness: 0.05
    });
    const globeSphere = new THREE.Mesh(sphereGeo, sphereMat);
    globeAssembly.add(globeSphere);

    // --- 3. LIGHTING SETUP ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(8, 10, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(-8, -4, 5);
    scene.add(dirLight2);

    // Drag Interaction
    let isDragging = false;
    let previousX = 0;

    canvas.parentElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousX = e.clientX;
    });

    window.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const deltaX = e.clientX - previousX;
            previousX = e.clientX;
            globeSphere.rotation.y += deltaX * 0.008;
        }
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    // Resize Handler
    window.addEventListener('resize', () => {
        const w = getWidth();
        const h = getHeight();
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    // Animation Loop
    function animateGlobe() {
        requestAnimationFrame(animateGlobe);

        if (!isDragging) {
            globeSphere.rotation.y += 0.007;
        }

        renderer.render(scene, camera);
    }
    animateGlobe();
}

/* ==========================================================================
   WEBGL 3D GEOMETRIC CRYSTAL NODE SCENE (SUBTLE AMBIENT)
   ========================================================================== */
function init3DGeometricScene() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas || !window.THREE) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 35;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const group = new THREE.Group();
    scene.add(group);

    // Subtle Node Mesh
    const count = 35;
    const geometry = new THREE.IcosahedronGeometry(0.7, 0);

    const nodes = [];

    for (let i = 0; i < count; i++) {
        const mat = new THREE.MeshStandardMaterial({
            color: (i % 3 === 0) ? 0xd97706 : 0x0f172a,
            roughness: 0.3,
            metalness: 0.7,
            transparent: true,
            opacity: 0.25
        });

        const mesh = new THREE.Mesh(geometry, mat);
        mesh.position.x = (Math.random() - 0.5) * 50;
        mesh.position.y = (Math.random() - 0.5) * 50;
        mesh.position.z = (Math.random() - 0.5) * 30;

        const scale = Math.random() * 0.6 + 0.3;
        mesh.scale.set(scale, scale, scale);

        group.add(mesh);
        nodes.push({
            mesh,
            speedX: (Math.random() - 0.5) * 0.003,
            speedY: (Math.random() - 0.5) * 0.003
        });
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xd97706, 1.0);
    dirLight.position.set(20, 20, 20);
    scene.add(dirLight);

    let mouseX = 0, mouseY = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 1.5;
        mouseY = -(e.clientY / window.innerHeight - 0.5) * 1.5;
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    function animate() {
        requestAnimationFrame(animate);

        nodes.forEach(n => {
            n.mesh.rotation.x += 0.002;
            n.mesh.rotation.y += 0.002;
            n.mesh.position.x += n.speedX;
            n.mesh.position.y += n.speedY;

            if (Math.abs(n.mesh.position.x) > 30) n.speedX *= -1;
            if (Math.abs(n.mesh.position.y) > 30) n.speedY *= -1;
        });

        group.rotation.y += (mouseX * 0.15 - group.rotation.y) * 0.02;
        group.rotation.x += (-mouseY * 0.15 - group.rotation.x) * 0.02;

        renderer.render(scene, camera);
    }
    animate();
}

/* ==========================================================================
   INSTITUTIONAL PLAN SIMULATOR
   ========================================================================== */
function initSimulator() {
    const tabs = document.querySelectorAll('.seg-tab');
    const select = document.getElementById('plan-select');
    const chkFood = document.getElementById('chk-food');
    const chkTransport = document.getElementById('chk-transport');
    const priceNum = document.getElementById('calc-price-num');
    const priceNote = document.getElementById('calc-plan-desc');
    const waBtn = document.getElementById('calc-wa-btn');

    let currentAge = 'primary';

    // Strictly monthly plans in the simulator
    const plansData = {
        primary: [
            { id: 'full', name: 'Club Completo (Tareas + Regularización + Alimentos + Traslado)', basePrice: 3000, desc: 'Programa integral post-escuela con alimentos balanceados y atención diaria.' },
            { id: 'food', name: 'Club con Alimentos (Tareas + Comida)', basePrice: 2500, desc: 'Apoyo diario en labores escolares con alimentos incluidos.' },
            { id: 'reg', name: 'Regularización Académica (2 hrs/día, Lun-Jue)', basePrice: 1800, desc: 'Nivelación intensiva orientada a retos específicos de aprendizaje.' },
            { id: 'hourly', name: 'Sesiones Individuales por Hora ($95/hr)', basePrice: 95, desc: 'Sesiones de apoyo puntual psicopedagógico.' }
        ],
        toddler: [
            { id: 'extended', name: 'Jornada Extendida (7:45 - 18:00 hrs)', basePrice: 3100, desc: 'Acompañamiento en horario amplio con desayuno y comida incluidos.' },
            { id: 'morning', name: 'Jornada Matutina (9:00 - 13:00 hrs)', basePrice: 2350, desc: 'Estimulación temprana y psicomotricidad en horario matutino.' }
        ]
    };

    function populateSelect() {
        select.innerHTML = '';
        plansData[currentAge].forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
        updatePrice();
    }

    function updatePrice() {
        const selectedId = select.value;
        const currentList = plansData[currentAge];
        const planObj = currentList.find(p => p.id === selectedId) || currentList[0];

        let totalPrice = planObj.basePrice;

        if (chkFood.checked && !planObj.name.includes('Alimentos') && !planObj.name.includes('Extendida')) {
            totalPrice += 500;
        }
        if (chkTransport.checked && !planObj.name.includes('Completo')) {
            totalPrice += 500;
        }

        // Animate counter
        const duration = 400;
        const startTime = performance.now();

        function animateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const val = Math.floor(progress * totalPrice);

            priceNum.textContent = val.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(animateNumber);
            }
        }
        requestAnimationFrame(animateNumber);

        priceNote.textContent = planObj.desc;

        const msg = encodeURIComponent(`Hola CEEDI, me gustaría solicitar informes y agendar entrevista sobre el plan "${planObj.name}" cotizado en $${totalPrice.toLocaleString()} MXN/mes.`);
        waBtn.href = `https://wa.me/525666661250?text=${msg}`;
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentAge = tab.getAttribute('data-age');
            populateSelect();
        });
    });

    select.addEventListener('change', updatePrice);
    chkFood.addEventListener('change', updatePrice);
    chkTransport.addEventListener('change', updatePrice);

    // Initial setup
    populateSelect();
}
