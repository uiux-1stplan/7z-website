import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

for (const host of document.querySelectorAll(".z7-liquid-logo-host")) {
  const canvas = host.querySelector("canvas");
  if (!canvas) continue;
  const rotationMode = host.dataset.rotationMode || "scroll-mouse";
  const heroStage = rotationMode === "scroll-mouse" ? host.closest(".logo-hero") : null;
  let renderer, raf = 0, resizeObserver, visibilityObserver;
  let heroVisible = true;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  let scrollRotation = 0;
  let lastFrameTime = 0;
  const updateScrollRotation = () => {
    if (!heroStage || rotationMode !== "scroll-mouse") return;
    const rect = heroStage.getBoundingClientRect();
    const progress = THREE.MathUtils.clamp(-rect.top / Math.max(1, rect.height), 0, 1);
    scrollRotation = progress * Math.PI * 2;
  };
  if (heroStage) { addEventListener("scroll", updateScrollRotation, { passive: true }); updateScrollRotation(); }

  const cleanup = () => {
    if (raf) cancelAnimationFrame(raf);
    resizeObserver?.disconnect();
    visibilityObserver?.disconnect();
    renderer?.dispose();
  };
  const fail = error => {
    console.warn("7Z hero canvas could not initialize.", error);
    cleanup();
    host.classList.add("is-unavailable");
  };

  async function build() {
    if (!window.WebGLRenderingContext || !host.isConnected) throw new Error("WebGL is unavailable");
    THREE.ColorManagement.enabled = true;
    RectAreaLightUniformsLib.init();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, .1, 1200);
    camera.position.set(0, 0, 420);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.useLegacyLights = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = new RoomEnvironment();
    scene.environment = pmrem.fromScene(environment, .04).texture;
    environment.dispose?.();
    pmrem.dispose();
    scene.add(new THREE.AmbientLight(0x8babff, .16));
    const key = new THREE.RectAreaLight(0xbfbfbf, 20, 230, 115);
    key.position.set(-105, 120, 170); key.lookAt(0, 0, 0); scene.add(key);
    const fill = new THREE.RectAreaLight(0x868686, 2.4, 145, 250);
    fill.position.set(120, -40, 85); fill.lookAt(0, 0, 0); scene.add(fill);
    const rim = new THREE.PointLight(0x829cff, 21, 520, 2);
    rim.position.set(0, 70, -120); scene.add(rim);

    const response = await fetch("/assets/brand/7Z-LogoT.svg", { cache: "force-cache" });
    if (!response.ok) throw new Error("The hero SVG could not be loaded");
    const svg = new SVGLoader().parse(await response.text());
    const caps = new THREE.MeshPhysicalMaterial({ color: 0x505050, metalness: .94, roughness: .35, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 2.99, side: THREE.DoubleSide });
    const walls = new THREE.MeshPhysicalMaterial({ color: 0x7c7c7c, emissive: 0x303030, emissiveIntensity: .11, metalness: .94, roughness: .41, envMapIntensity: 2.665, side: THREE.DoubleSide });
    const geometryGroup = new THREE.Group(), depth = 25;
    const bevelThickness = THREE.MathUtils.clamp(depth * .032, .45, 1.2);
    const bevelSize = THREE.MathUtils.clamp(depth * .018, .28, .72);
    svg.paths.forEach(path => SVGLoader.createShapes(path).forEach(shape => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 3, bevelThickness, bevelSize, curveSegments: 8 });
      geometry.scale(1, -1, 1);
      geometry.computeBoundingBox();
      geometry.computeVertexNormals();
      geometryGroup.add(new THREE.Mesh(geometry, [caps, walls]));
    }));
    if (!geometryGroup.children.length) throw new Error("The SVG has no filled shapes");

    // Center the complete multi-path artwork as one composition, preserving spacing between SVG paths.
    const bounds = new THREE.Box3().setFromObject(geometryGroup);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const scaleFactor = 200 / Math.max(size.x, size.y, size.z);
    geometryGroup.children.forEach(mesh => {
      mesh.geometry.translate(-center.x, -center.y, -center.z);
      mesh.geometry.computeBoundingBox();
    });
    geometryGroup.scale.setScalar(scaleFactor);

    // This outer group is the strict world-space pivot for both scroll rotation and pointer tilt.
    const logoGroup = new THREE.Group();
    logoGroup.position.set(0, 0, 0);
    logoGroup.add(geometryGroup);
    scene.add(logoGroup);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(ratio); renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const render = now => {
      raf = 0;
      if (document.hidden || !heroVisible || !host.isConnected) return;
      const dt = lastFrameTime ? Math.min(50, now - lastFrameTime) : 0;
      lastFrameTime = now;
      if (rotationMode === "loop") {
        logoGroup.rotation.y += dt * .0002;
      } else {
        const targetRotationY = scrollRotation + (mouse.x / Math.max(1, innerWidth) - .5) * .5;
        const targetRotationX = (mouse.y / Math.max(1, innerHeight) - .5) * .3;
        logoGroup.rotation.y += (targetRotationY - logoGroup.rotation.y) * .05;
        logoGroup.rotation.x += (targetRotationX - logoGroup.rotation.x) * .05;
      }
      renderer.render(scene, camera);
      if (!reducedMotion.matches) raf = requestAnimationFrame(render);
    };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    visibilityObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (!heroVisible && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (heroVisible && !raf && !document.hidden) raf = requestAnimationFrame(render);
    }, { threshold: 0 });
    visibilityObserver.observe(host);
    if (finePointer.matches && rotationMode !== "loop") {
      window.addEventListener("pointermove", event => {
        if (!event.pointerType || event.pointerType === "mouse") { mouse.x = event.clientX; mouse.y = event.clientY; }
      }, { passive: true });
      window.addEventListener("blur", () => { mouse.x = innerWidth / 2; mouse.y = innerHeight / 2; });
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (!document.hidden && heroVisible && !raf) raf = requestAnimationFrame(render);
    });
    reducedMotion.addEventListener?.("change", () => {
      if (reducedMotion.matches && raf) { cancelAnimationFrame(raf); raf = 0; renderer.render(scene, camera); }
      else if (!reducedMotion.matches && !raf && !document.hidden && heroVisible) raf = requestAnimationFrame(render);
    });

    resize();
    host.classList.add("is-ready");
    if (!reducedMotion.matches) raf = requestAnimationFrame(render);
    else renderer.render(scene, camera);
  }
  build().catch(fail);
}