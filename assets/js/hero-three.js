import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function makeEnvironment() {
  const canvases = Array.from({ length: 6 }, (_, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    const gradient = context.createLinearGradient(0, 0, 128, 128);
    gradient.addColorStop(0, index % 2 ? "#141820" : "#eef1f6");
    gradient.addColorStop(.28, "#67707d");
    gradient.addColorStop(.44, "#fbfcff");
    gradient.addColorStop(.58, "#303743");
    gradient.addColorStop(.78, "#c9ced8");
    gradient.addColorStop(1, "#171b22");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    context.globalAlpha = .9;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 34 + index % 3 * 10, 128, 7);
    context.fillStyle = "#080a0f";
    context.fillRect(0, 52 + index % 2 * 8, 128, 11);
    return canvas;
  });
  const environment = new THREE.CubeTexture(canvases);
  environment.colorSpace = THREE.SRGBColorSpace;
  environment.needsUpdate = true;
  return environment;
}

function mountLogo({ host, image, hero, mode }) {
  if (!host || !image || !image.complete || !image.naturalWidth) return;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  } catch {
    return;
  }

  const canvas = renderer.domElement;
  canvas.className = "hero-three-canvas";
  canvas.setAttribute("aria-hidden", "true");
  host.append(canvas);

  const scene = new THREE.Scene();
  scene.environment = makeEnvironment();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 30);
  camera.position.z = 3.35;
  const group = new THREE.Group();
  scene.add(group);

  const texture = new THREE.Texture(image);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  const ratio = image.naturalWidth / image.naturalHeight;
  const width = clamp(ratio, .55, 1.4);
  const height = width / ratio;
  const geometry = new THREE.PlaneGeometry(width, height);
  geometry.computeBoundingBox();
  geometry.center();

  const faceMaterial = new THREE.MeshPhysicalMaterial({
    map: texture, transparent: true, alphaTest: .035,
    metalness: .88, roughness: .19, envMapIntensity: 1.65,
    side: THREE.DoubleSide, depthWrite: true
  });
  const edgeMaterial = new THREE.MeshPhysicalMaterial({
    map: texture, color: 0x727985, transparent: true, alphaTest: .06,
    metalness: .92, roughness: .24, envMapIntensity: 1.1,
    side: THREE.DoubleSide, depthWrite: true
  });

  // Layered centered meshes give the raster mark visible edge thickness while retaining its exact silhouette.
  for (let layer = 8; layer > 0; layer--) {
    const edge = new THREE.Mesh(geometry.clone(), edgeMaterial);
    edge.geometry.computeBoundingBox();
    edge.geometry.center();
    edge.position.z = -layer * .009;
    group.add(edge);
  }
  const face = new THREE.Mesh(geometry, faceMaterial);
  group.add(face);
  group.rotation.y = mode === "loop" && !reducedMotion ? Math.PI * .06 : 0;

  const resize = () => {
    const rect = host.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  host.classList.add("is-webgl-active");
  let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0, scrollYaw = 0;
  let previous = performance.now(), frame = 0, raf = 0, loopYaw = 0, inView = true;

  const onMove = event => {
    if (reducedMotion || matchMedia("(pointer: coarse)").matches) return;
    const rect = hero.getBoundingClientRect();
    targetX = clamp((event.clientX - rect.left) / Math.max(1, rect.width) - .5, -.5, .5);
    targetY = clamp((event.clientY - rect.top) / Math.max(1, rect.height) - .5, -.5, .5);
  };
  const onLeave = () => { targetX = 0; targetY = 0; };
  const onScroll = () => {
    if (mode !== "scroll" || reducedMotion) return;
    const rect = hero.getBoundingClientRect();
    const progress = clamp(-rect.top / Math.max(1, rect.height), 0, 1);
    scrollYaw = progress * Math.PI * 2;
  };
  if (mode === "scroll") {
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }

  const animate = now => {
    raf = requestAnimationFrame(animate);
    const delta = Math.min(.05, Math.max(0, (now - previous) / 1000));
    previous = now;
    if (!reducedMotion && mode === "loop") loopYaw += delta * Math.PI * 2 / 34;
    pointerX += (targetX - pointerX) * .06;
    pointerY += (targetY - pointerY) * .06;
    const targetYaw = scrollYaw + pointerX * .28 + loopYaw + (mode === "loop" ? Math.PI * .06 : 0);
    group.rotation.y += (targetYaw - group.rotation.y) * .06;
    group.rotation.x += (pointerY * -.14 - group.rotation.x) * .06;
    renderer.render(scene, camera);
  };
  const pauseAnimation = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };
  const resumeAnimation = () => {
    if (inView && !document.hidden && !raf) {
      previous = performance.now();
      raf = requestAnimationFrame(animate);
    }
  };
  const visibilityObserver = "IntersectionObserver" in window
    ? new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) resumeAnimation();
        else pauseAnimation();
      }, { rootMargin: "120px" })
    : null;
  visibilityObserver?.observe(hero || host);
  const onVisibility = () => {
    if (document.hidden) pauseAnimation();
    else resumeAnimation();
  };
  document.addEventListener("visibilitychange", onVisibility);
  resumeAnimation();

  window.addEventListener("pagehide", () => {
    if (raf) cancelAnimationFrame(raf);
    observer.disconnect();
    visibilityObserver?.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    if (mode === "scroll") {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    }
    geometry.dispose();
    texture.dispose();
    faceMaterial.dispose();
    edgeMaterial.dispose();
    scene.environment?.dispose();
    renderer.dispose();
  }, { once: true });
}

function start() {
  const homeImage = document.querySelector(".logo-hero__mark");
  if (homeImage) mountLogo({ host: homeImage.closest(".logo-hero__logo3d"), image: homeImage, hero: document.querySelector(".logo-hero"), mode: "scroll" });
  const aboutImage = document.querySelector(".about-hero__logo-rotor img");
  if (aboutImage) mountLogo({ host: aboutImage.closest(".about-hero__logo-rotor"), image: aboutImage, hero: aboutImage.closest(".about-hero"), mode: "loop" });
}

if (document.readyState === "complete") start();
else window.addEventListener("load", start, { once: true });
