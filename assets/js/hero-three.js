import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { SVGLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/SVGLoader.js";
import { RectAreaLightUniformsLib } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/environments/RoomEnvironment.js";
import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/shaders/FXAAShader.js";

const VERSION="0.158.0";
const SVG_URL="/assets/brand/7Z-LogoT.svg";
const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let svgTextPromise;
function loadSvg(){ return svgTextPromise ||= fetch(SVG_URL,{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("Logo SVG unavailable");return r.text()}); }

function buildExtrusion(svgText){
  const parsed=new SVGLoader().parse(svgText.replace(/currentColor/gi,"#ffffff"));
  const shapes=[];
  let curveCount=0, sourceSize=0, smallestHole=Infinity;
  for(const path of parsed.paths){
    if(path.userData?.style?.fill==="none") continue;
    const made=SVGLoader.createShapes(path);
    for(const shape of made){
      shapes.push(shape);
      curveCount+=shape.curves.length;
      const pts=shape.getPoints(16);
      if(pts.length){
        const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
        sourceSize=Math.max(sourceSize,Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
      }
      for(const hole of shape.holes){
        const hp=hole.getPoints(16);
        if(hp.length){
          const xs=hp.map(p=>p.x),ys=hp.map(p=>p.y);
          smallestHole=Math.min(smallestHole,Math.max(1e-5,Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys))));
        }
      }
    }
  }
  if(!shapes.length||!sourceSize) throw Error("SVG contains no filled logo paths");
  const scaleFactor=200/sourceSize;
  const complexity=curveCount;
  const bevelSegments=complexity>900?8:complexity>450?14:complexity>160?24:32;
  const curveSegments=complexity>900?8:complexity>450?12:complexity>160?16:20;
  const bevelSize=Math.max(.18/scaleFactor,Math.min(20/scaleFactor,Number.isFinite(smallestHole)?smallestHole*.38:20/scaleFactor));
  const geometry=new THREE.ExtrudeGeometry(shapes,{
    depth:15/scaleFactor,steps:complexity>900?1:2,curveSegments,bevelEnabled:true,
    bevelSegments,bevelSize,bevelThickness:bevelSize*(2.4/1.45),bevelOffset:-.2*bevelSize
  });
  geometry.center();
  geometry.scale(scaleFactor,-scaleFactor,scaleFactor);
  const index=geometry.index;
  if(index){for(let i=0;i<index.count;i+=3){const a=index.getX(i+1),b=index.getX(i+2);index.setX(i+1,b);index.setX(i+2,a);}index.needsUpdate=true;}
  geometry.computeVertexNormals();
  return geometry;
}
function addAreaLight(parent,color,intensity,width,height,position,target){
  const light=new THREE.RectAreaLight(color,intensity,width,height);
  light.position.set(...position); light.lookAt(...target); parent.add(light);
}
function mount(host,mode){
  if(host.dataset.threeMounted==="true") return;
  host.dataset.threeMounted="true";
  let alive=true, raf=0, last=0, visible=true;
  const scene=new THREE.Scene(); // Transparent scene: no boxed slab behind the mark.
  const camera=new THREE.PerspectiveCamera(36,1,1,5000);
  camera.position.set(0,0,420);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.setClearColor(0x07070a,0);
  renderer.domElement.className="hero-three-canvas";
  renderer.domElement.setAttribute("aria-hidden","true");
  host.appendChild(renderer.domElement);

  const pmrem=new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const room=new RoomEnvironment();
  const env=pmrem.fromScene(room,.04);
  scene.environment=env.texture;
  room.dispose(); pmrem.dispose();

  const objectGroup=new THREE.Group(); scene.add(objectGroup);
  const lightGroup=new THREE.Group(); scene.add(lightGroup);
  RectAreaLightUniformsLib.init();
  scene.add(new THREE.AmbientLight(0x8babff,.056));
  addAreaLight(lightGroup,0x868686,3.5,240,300,[-90,-40,170],[0,0,0]);
  addAreaLight(lightGroup,0xc5c5c5,16.8,72,520,[-165,20,-60],[-18,0,0]);
  addAreaLight(lightGroup,0xc5c5c5,15.4,72,520,[165,10,-58],[18,0,0]);
  addAreaLight(lightGroup,0xbfbfbf,7,150,300,[120,90,160],[0,0,0]);

  let geometry, caps, walls, controls, composer, bloom, fxaa;
  let pointerX=0,pointerY=0,targetX=0,targetY=0,scrollYaw=0;
  const hero=host.closest(".logo-hero");
  const interactionArea=hero||host;
  objectGroup.position.set(0,0,0);
  function fallback(error){
    if(!alive)return;
    console.warn("[7Z hero logo]",error);
    canvasObserver.disconnect();
    renderer.dispose(); renderer.domElement.remove(); scene.environment?.dispose();
    host.classList.remove("is-webgl-active"); delete host.dataset.threeMounted;

  }
  function resize(){
    if(!alive)return;
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),dpr=Math.min(devicePixelRatio||1,2);
    camera.aspect=w/h;
    const fit=Math.max(1,w/h);
    camera.position.z=Math.max(310,420/Math.sqrt(fit));
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);
    composer?.setPixelRatio(dpr);composer?.setSize(w,h);
    if(fxaa)fxaa.material.uniforms.resolution.value.set(1/(w*dpr),1/(h*dpr));
  }
  const canvasObserver=new ResizeObserver(resize);canvasObserver.observe(host);
  function pointerMove(e){
    const rect=interactionArea.getBoundingClientRect();
    if(e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom){
      targetX=((e.clientX-rect.left)/rect.width-.5)*.16;
      targetY=((e.clientY-rect.top)/rect.height-.5)*.12;
    }
  }
  function pointerLeave(){targetX=0;targetY=0;}
  function onScroll(){if(hero)scrollYaw=(window.scrollY/Math.max(1,innerHeight))*Math.PI*2;}
  window.addEventListener("pointermove",pointerMove,{passive:true});
  interactionArea.addEventListener("pointerleave",pointerLeave,{passive:true});
  if(mode==="scroll"){window.addEventListener("scroll",onScroll,{passive:true});onScroll();}
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)last=0;},{rootMargin:"100px"});
  observer.observe(host);
  const onVis=()=>{visible=!document.hidden;if(visible)last=0;};
  document.addEventListener("visibilitychange",onVis);

  function render(now){
    if(!alive)return;
    raf=requestAnimationFrame(render);
    if(!visible)return;
    const time=last?Math.min(.05,(now-last)/1000):0;last=now;
    if(geometry){
      if(mode==="loop"&&!reduceMotion)objectGroup.rotation.y+=.4*time;
      if(mode==="scroll")objectGroup.rotation.y=THREE.MathUtils.damp(objectGroup.rotation.y,scrollYaw,2.4,time);
      pointerX=THREE.MathUtils.damp(pointerX,targetX,3.2,time);
      pointerY=THREE.MathUtils.damp(pointerY,targetY,3.2,time);
      objectGroup.rotation.x=pointerY;
      objectGroup.rotation.z=pointerX;
      controls?.update();
      composer.render();
    } else renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(render);
  loadSvg().then(text=>{
    if(!alive)return;
    geometry=buildExtrusion(text);
    caps=new THREE.MeshPhysicalMaterial({side:THREE.FrontSide,color:0x505050,metalness:.94,roughness:.1,clearcoat:1,clearcoatRoughness:.08,transmission:0,ior:1.48,thickness:0,envMapIntensity:6.9});
    walls=new THREE.MeshPhysicalMaterial({side:THREE.FrontSide,color:0x7c7c7c,emissive:0x303030,emissiveIntensity:.11,metalness:.94,roughness:.16,clearcoat:1,envMapIntensity:6.15});
    const mesh=new THREE.Mesh(geometry,[caps,walls]);objectGroup.add(mesh);
    controls=new OrbitControls(camera,renderer.domElement);
    controls.enablePan=false;controls.enableDamping=true;controls.dampingFactor=.06;
    controls.minDistance=150;controls.maxDistance=900;
    controls.enableRotate=true;controls.rotateSpeed=.5;controls.enableZoom=false;
    composer=new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,camera));
    bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.2,.5,.86);
    bloom.strength=.2;bloom.radius=.5;bloom.threshold=.86;composer.addPass(bloom);
    composer.addPass(new OutputPass());
    fxaa=new ShaderPass(FXAAShader);composer.addPass(fxaa);
    resize();
    host.classList.add("is-webgl-active");
  }).catch(fallback);

  window.addEventListener("pagehide",()=>{
    alive=false;cancelAnimationFrame(raf);observer.disconnect();canvasObserver.disconnect();
    document.removeEventListener("visibilitychange",onVis);
    window.removeEventListener("pointermove",pointerMove);interactionArea.removeEventListener("pointerleave",pointerLeave);
    delete host.dataset.threeMounted;
    window.removeEventListener("scroll",onScroll);geometry?.dispose();caps?.dispose();walls?.dispose();
    controls?.dispose();composer?.dispose();scene.environment?.dispose();renderer.dispose();renderer.domElement.remove();host.classList.remove("is-webgl-active");
  },{once:true});
}
function start(){
  const home=document.querySelector(".logo-hero__logo3d");
  if(home)mount(home,matchMedia("(prefers-reduced-motion: reduce)").matches?"still":"scroll");
}
if(document.readyState==="complete")start();else addEventListener("load",start,{once:true});
addEventListener("pageshow",e=>{if(e.persisted)start();});
