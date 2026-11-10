import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/addons/shaders/FXAAShader.js";

const fallback = document.querySelector(".logo-hero__mark");
if (fallback && !fallback.parentElement.classList.contains("z7-liquid-logo-host")) {
  const host = document.createElement("span");
  host.className = "z7-liquid-logo-host";
  fallback.before(host);
  host.append(fallback);
  if (host && !host.querySelector("canvas")) {
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.z7LiquidLogo = "";
  host.append(canvas);

  let renderer, composer, controls, raf = 0, observer, visibilityObserver, heroVisible = true, pointer = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const dispose = () => {
    if (raf) cancelAnimationFrame(raf);
    observer?.disconnect();
    visibilityObserver?.disconnect();
    controls?.dispose();
    composer?.dispose();
    renderer?.dispose();
  };
  const fail = error => { console.warn("7Z liquid logo unavailable; keeping the static brand mark.", error); dispose(); canvas.remove(); };

  async function build() {
    if (!window.WebGLRenderingContext || !host.isConnected) return fail(new Error("WebGL is unavailable"));
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

    const svgText = await fetch("/assets/brand/7Z-LogoT.svg", { cache: "force-cache" }).then(response => {
      if (!response.ok) throw new Error(`SVG request failed (${response.status})`);
      return response.text();
    });
    const parsed = new SVGLoader().parse(svgText);
    const materialCaps = new THREE.MeshPhysicalMaterial({ color: 0x505050, metalness: .94, roughness: .35, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 2.99, side: THREE.DoubleSide });
    const materialWalls = new THREE.MeshPhysicalMaterial({ color: 0x7c7c7c, emissive: 0x303030, emissiveIntensity: .11, metalness: .94, roughness: .41, envMapIntensity: 2.665, side: THREE.DoubleSide });
    const logo = new THREE.Group();
    const depth = 25;
    const bevelThickness = THREE.MathUtils.clamp(depth * .032, .45, 1.2);
    const bevelSize = THREE.MathUtils.clamp(depth * .018, .28, .72);
    parsed.paths.forEach(path => SVGLoader.createShapes(path).forEach(shape => {
      const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSegments: 3, bevelThickness, bevelSize, curveSegments: 8 });
      geometry.scale(1, -1, 1);
      geometry.computeVertexNormals();
      logo.add(new THREE.Mesh(geometry, [materialCaps, materialWalls]));
    }));
    if (!logo.children.length) throw new Error("No filled SVG shapes were found");
    const bounds = new THREE.Box3().setFromObject(logo);
    const center = bounds.getCenter(new THREE.Vector3());
    logo.position.sub(center);
    const size = bounds.getSize(new THREE.Vector3());
    const scale = 200 / Math.max(size.x, size.y, size.z);
    logo.scale.setScalar(scale);
    scene.add(logo);

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), .2, .5, .86));
    composer.addPass(new OutputPass());
    const fxaa = new ShaderPass(FXAAShader);
    composer.addPass(fxaa);
    controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = .055;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = .16;
    controls.minPolarAngle = Math.PI * .34;
    controls.maxPolarAngle = Math.PI * .66;
    controls.target.set(0, 0, 0);
    controls.update();

    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      const dpr = Math.min(devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(dpr); renderer.setSize(width, height, false);
      composer.setPixelRatio(dpr); composer.setSize(width, height);
      camera.aspect = width / height; camera.updateProjectionMatrix();
      fxaa.material.uniforms.resolution.value.set(1 / (width * dpr), 1 / (height * dpr));
    };
    const tick = now => {
      raf = 0;
      if (document.hidden || !heroVisible || reducedMotion.matches || !host.isConnected) return;
      const dt = Math.min(.05, (now - (tick.last || now)) / 1000); tick.last = now;
      logo.rotation.y += dt * .4;
      pointer.x += (target.x - pointer.x) * .035;
      pointer.y += (target.y - pointer.y) * .035;
      logo.rotation.x = pointer.y * .08;
      logo.rotation.z = pointer.x * .035;
      controls.update();
      composer.render();
      raf = requestAnimationFrame(tick);
    };
    observer = new ResizeObserver(resize); observer.observe(host);
    visibilityObserver = new IntersectionObserver(([entry]) => {
      heroVisible = entry.isIntersecting;
      if (!heroVisible && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (heroVisible && !raf && !document.hidden && !reducedMotion.matches) raf = requestAnimationFrame(tick);
    }, { threshold: 0 });
    visibilityObserver.observe(host);
    canvas.addEventListener("pointermove", event => {
      const rect = canvas.getBoundingClientRect();
      target.x = (event.clientX - rect.left) / rect.width - .5;
      target.y = (event.clientY - rect.top) / rect.height - .5;
    }, { passive: true });
    canvas.addEventListener("pointerleave", () => { target.x = 0; target.y = 0; }, { passive: true });
    document.addEventListener("visibilitychange", () => {
      if ((document.hidden || !heroVisible) && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (!document.hidden && heroVisible && !raf && !reducedMotion.matches) raf = requestAnimationFrame(tick);
    });
    reducedMotion.addEventListener?.("change", () => {
      if (reducedMotion.matches && raf) { cancelAnimationFrame(raf); raf = 0; }
      else if (!reducedMotion.matches && !raf && !document.hidden && heroVisible) raf = requestAnimationFrame(tick);
    });
    resize();
    host.classList.add("is-ready");
    if (fallback) fallback.setAttribute("aria-hidden", "true");
    if (!reducedMotion.matches) raf = requestAnimationFrame(tick);
    else composer.render();
  }

  build().catch(fail);
  }
}
