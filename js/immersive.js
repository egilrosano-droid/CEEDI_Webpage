/**
 * CEEDI — Lenis + efectos tipo AulaIQ (stagger blur, fade-up) + libros WebGL
 */
import * as THREE from "three";
import Lenis from "lenis";

const reduce =
  window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
const saveData = navigator.connection?.saveData === true;
const isCoarse = window.matchMedia?.("(pointer: coarse)")?.matches === true;

/* ——— Smooth scroll (Lenis) ——— */
let lenis = null;
if (!reduce) {
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.15,
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -72 });
    });
  });
}

/* ——— Split texto (efecto AulaIQ: blur → nítido, palabra a palabra) ——— */
function splitText(el, mode) {
  const text = el.textContent.trim();
  el.setAttribute("aria-label", text);
  el.textContent = "";
  const parts =
    mode === "chars"
      ? Array.from(text)
      : text.split(/(\s+)/).filter((p) => p.length);

  parts.forEach((part, i) => {
    if (mode === "words" && /^\s+$/.test(part)) {
      el.appendChild(document.createTextNode(part));
      return;
    }
    const span = document.createElement("span");
    span.className = "split-unit";
    span.textContent = part === " " ? "\u00A0" : part;
    span.style.setProperty("--i", String(i));
    el.appendChild(span);
  });
}

document.querySelectorAll("[data-split]").forEach((el) => {
  splitText(el, el.getAttribute("data-split") || "words");
});

/* ——— Hero ready: dispara stagger ——— */
const hero = document.getElementById("inicio");
if (hero) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => hero.classList.add("is-ready"));
  });
}

/* ——— Fade-up al scroll (AulaIQ animate-fade-up-in) ——— */
const fadeEls = [
  ...document.querySelectorAll("[data-reveal]"),
  ...document.querySelectorAll("[data-fade-up]"),
];
if (fadeEls.length && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-revealed");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  fadeEls.forEach((el) => {
    if (reduce) el.classList.add("is-revealed");
    else {
      if (el.closest("#inicio") && el.hasAttribute("data-fade-up")) return;
      io.observe(el);
    }
  });
} else {
  fadeEls.forEach((el) => el.classList.add("is-revealed"));
}

/* ——— Timeline ——— */
const timeline = document.querySelector(".trayectoria-rail, .trayectoria-timeline");
if (timeline) {
  if (reduce) timeline.classList.add("is-drawn");
  else if ("IntersectionObserver" in window) {
    const tio = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          timeline.classList.add("is-drawn");
          tio.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    tio.observe(timeline);
  }
}

/* ——— Pointer halo ——— */
const halo = document.querySelector(".pointer-halo");
const fineHover =
  window.matchMedia?.("(hover: hover) and (pointer: fine)")?.matches === true;
if (halo && fineHover && !reduce) {
  document.documentElement.classList.add("has-pointer-halo");
  let hx = 0;
  let hy = 0;
  let tx = 0;
  let ty = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
    },
    { passive: true }
  );
  (function loop() {
    hx += (tx - hx) * 0.1;
    hy += (ty - hy) * 0.1;
    halo.style.transform = `translate3d(${hx}px, ${hy}px, 0)`;
    requestAnimationFrame(loop);
  })();
}

/* ——— Scroll progress ——— */
const progress = document.querySelector(".scroll-progress");
function updateProgress(scroll, limit) {
  if (!progress) return;
  const p = limit > 0 ? Math.min(1, scroll / limit) : 0;
  progress.style.transform = `scaleX(${p})`;
}
if (lenis) {
  lenis.on("scroll", ({ scroll, limit }) => updateProgress(scroll, limit));
} else {
  window.addEventListener(
    "scroll",
    () => {
      const limit =
        document.documentElement.scrollHeight - window.innerHeight;
      updateProgress(window.scrollY, limit);
    },
    { passive: true }
  );
}

const media = hero?.querySelector(".hero-media");

function bindCssParallax() {
  if (!hero || !media || reduce) return;
  const onScroll = () => {
    const rect = hero.getBoundingClientRect();
    if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;
    const progressY = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)));
    media.style.transform = `scale(1.08) translate3d(0, ${progressY * 6}%, 0)`;
  };
  if (lenis) lenis.on("scroll", onScroll);
  else window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ——— WebGL libros ——— */
async function initHeroWebGL() {
  const canvas = document.getElementById("hero-canvas");
  if (!hero || !canvas || reduce || saveData) {
    bindCssParallax();
    return;
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isCoarse,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch {
    bindCssParallax();
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.05, 6.4);

  function makePageTexture(kind) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 320;
    const ctx = c.getContext("2d");
    ctx.fillStyle = kind === "notebook" ? "#f7f4ea" : "#f4f0e4";
    ctx.fillRect(0, 0, 256, 320);
    ctx.strokeStyle =
      kind === "notebook" ? "rgba(0,89,161,0.22)" : "rgba(20,32,51,0.12)";
    ctx.lineWidth = 2;
    for (let y = 36; y < 300; y += 18) {
      ctx.beginPath();
      ctx.moveTo(28, y);
      ctx.lineTo(230, y);
      ctx.stroke();
    }
    if (kind === "notebook") {
      ctx.strokeStyle = "rgba(220, 60, 60, 0.35)";
      ctx.beginPath();
      ctx.moveTo(52, 20);
      ctx.lineTo(52, 300);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(0,89,161,0.15)";
      ctx.fillRect(40, 48, 170, 14);
      ctx.fillRect(40, 78, 140, 10);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function createBook(coverColor, kind) {
    const group = new THREE.Group();
    const w = kind === "notebook" ? 0.72 : 0.85;
    const h = kind === "notebook" ? 0.95 : 1.1;
    const d = kind === "notebook" ? 0.08 : 0.14;

    const glass = {
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    };

    const coverMat = new THREE.MeshStandardMaterial({
      color: coverColor,
      roughness: 0.4,
      metalness: 0.08,
      ...glass,
      opacity: 0.42,
    });
    const pageMat = new THREE.MeshStandardMaterial({
      map: makePageTexture(kind),
      roughness: 0.85,
      metalness: 0,
      ...glass,
      opacity: 0.32,
    });
    const spineMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(coverColor).multiplyScalar(0.75),
      roughness: 0.5,
      ...glass,
      opacity: 0.4,
    });

    const pages = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.92, h * 0.94, d * 0.72),
      pageMat
    );
    pages.position.z = 0.01;
    const front = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), coverMat);
    front.position.z = d * 0.42;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), coverMat.clone());
    back.position.z = -d * 0.42;
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.045, h, d), spineMat);
    spine.position.x = -w * 0.48;

    if (kind === "notebook") {
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0xb8c0cc,
        metalness: 0.55,
        roughness: 0.3,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      });
      for (let i = 0; i < 5; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.035, 0.008, 8, 16),
          ringMat
        );
        ring.rotation.y = Math.PI / 2;
        ring.position.set(-w * 0.48, -h * 0.32 + i * 0.16, 0);
        group.add(ring);
      }
    }

    group.add(pages, front, back, spine);
    return group;
  }

  const covers = [0x0059a1, 0x0c9d4c, 0xffc72c, 0x1e4d7b, 0xe8b923, 0x148a45];
  const books = [];
  const count = isCoarse ? 5 : 8;
  const slots = [
    { x: -2.6, y: -0.85, z: 0.2, rot: 0.35 },
    { x: 2.55, y: -0.7, z: -0.1, rot: -0.4 },
    { x: -2.1, y: -1.45, z: 0.55, rot: 0.55 },
    { x: 2.15, y: -1.35, z: 0.4, rot: -0.5 },
    { x: -1.35, y: -1.7, z: -0.2, rot: 0.25 },
    { x: 1.4, y: -1.65, z: 0.15, rot: -0.3 },
    { x: -2.85, y: -0.15, z: -0.55, rot: 0.7 },
    { x: 2.9, y: -0.25, z: -0.45, rot: -0.65 },
  ];

  for (let i = 0; i < count; i++) {
    const kind = i % 3 === 1 ? "notebook" : "book";
    const book = createBook(covers[i % covers.length], kind);
    const slot = slots[i % slots.length];
    book.position.set(slot.x, slot.y, slot.z);
    book.rotation.set(0.15, slot.rot, 0.08 * (i % 2 === 0 ? 1 : -1));
    book.scale.setScalar(kind === "notebook" ? 0.92 : 1);
    book.userData = {
      base: book.position.clone(),
      baseRot: book.rotation.clone(),
      speed: 0.55 + (i % 4) * 0.12,
      amp: 0.08 + (i % 3) * 0.03,
      lean: 0.35 + (i % 3) * 0.08,
      phase: i * 0.7,
    };
    scene.add(book);
    books.push(book);
  }

  scene.add(
    new THREE.AmbientLight(0xffffff, 0.9),
    (() => {
      const key = new THREE.DirectionalLight(0xffffff, 1.15);
      key.position.set(3, 5, 6);
      return key;
    })(),
    (() => {
      const fill = new THREE.DirectionalLight(0x9ec9ff, 0.4);
      fill.position.set(-5, 0, 2);
      return fill;
    })()
  );

  const mouse = { x: 0, y: 0 };
  const targetCam = { x: 0, y: 0.05 };
  if (!isCoarse) {
    window.addEventListener(
      "pointermove",
      (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
      },
      { passive: true }
    );
  }

  function resize() {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, isCoarse ? 1.25 : 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize, { passive: true });

  let scrollFactor = 0;
  const syncScroll = () => {
    const rect = hero.getBoundingClientRect();
    scrollFactor = Math.min(1, Math.max(0, -rect.top / (rect.height || 1)));
    if (media) {
      media.style.transform = `scale(1.08) translate3d(0, ${scrollFactor * 6}%, 0)`;
    }
  };
  if (lenis) lenis.on("scroll", syncScroll);
  else window.addEventListener("scroll", syncScroll, { passive: true });
  syncScroll();

  const clock = new THREE.Clock();
  let running = true;
  const ioVis = new IntersectionObserver(
    (entries) => {
      running = entries.some((e) => e.isIntersecting);
    },
    { threshold: 0.02 }
  );
  ioVis.observe(hero);

  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    const t = clock.getElapsedTime();
    books.forEach((book, i) => {
      const { base, baseRot, speed, amp, lean, phase } = book.userData;
      book.position.x =
        base.x + Math.sin(t * speed + phase) * amp * 0.6 + mouse.x * lean * 0.22;
      book.position.y =
        base.y + Math.cos(t * speed * 0.85 + phase) * amp - scrollFactor * 0.25;
      book.position.z = base.z + mouse.y * lean * 0.12;

      const targetRotY = baseRot.y + mouse.x * lean * 0.85;
      const targetRotX =
        baseRot.x - mouse.y * lean * 0.55 + Math.sin(t * 0.6 + i) * 0.04;
      const targetRotZ = baseRot.z + mouse.x * 0.12;
      book.rotation.y += (targetRotY - book.rotation.y) * 0.08;
      book.rotation.x += (targetRotX - book.rotation.x) * 0.08;
      book.rotation.z += (targetRotZ - book.rotation.z) * 0.08;
    });
    targetCam.x += (mouse.x * 0.28 - targetCam.x) * 0.05;
    targetCam.y += (-mouse.y * 0.12 + 0.05 - targetCam.y) * 0.05;
    camera.position.x = targetCam.x;
    camera.position.y = targetCam.y - scrollFactor * 0.28;
    camera.lookAt(0, -0.35, 0);
    renderer.render(scene, camera);
  }
  animate();
  hero.classList.add("has-webgl");
}

initHeroWebGL();
