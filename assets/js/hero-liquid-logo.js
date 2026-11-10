import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const host = document.querySelector(".logo-hero__mark.z7-liquid-logo-host");
const canvas = host?.querySelector("canvas");
if (host && canvas) {
  let renderer, raf = 0, resizeObserver, visibilityObserver;
  let heroVisible = true;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };

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
    const logo = new THREE.Group(), depth = 25;
    const bevelThickness = THREE.MathUtils.clamp(depth * .032, .45, 1.2);
    const bevelSize = THREE.MathUtils.clamp(depth * .018, .28, .72);
    svg.paths.forEach(path => SVGLoader.createShapes(path).forEach(shape => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 3, bevelThickness, bevelSize, curveSegments: 8 });
      geometry.scale(1, -1, 1);
      geometry.computeVertexNormals();
      logo.add(new THREE.Mesh(geometry, [caps, walls]));
    }));
    if (!logo.children.length) throw new Error("The SVG has no filled shapes");
    const bounds = new THREE.Box3().setFromObject(logo);
    logo.position.sub(bounds.getCenter(new THREE.Vector3()));
    const size = bounds.getSize(new THREE.Vector3());
    logo.scale.setScalar(200 / Math.max(size.x, size.y, size.z));
    scene.add(logo);

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(ratio); renderer.setSize(width, height, false);
      camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const render = () => {
      raf = 0;
      if (document.hidden || !heroVisible || !host.isConnected) return;
      const targetRotationY = (mouse.x / Math.max(1, innerWidth) - .5) * .5;
      const targetRotationX = (mouse.y / Math.max(1, innerHeight) - .5) * .3;
      logo.rotation.y += (targetRotationY - logo.rotation.y) * .05;
      logo.rotation.x += (targetRotationX - logo.rotation.x) * .05;
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
    if (finePointer.matches) {
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