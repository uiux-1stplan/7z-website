import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.module.js";
import { SVGLoader } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/loaders/SVGLoader.js";
import { RectAreaLightUniformsLib } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { RoomEnvironment } from "https://cdn.jsdelivr.net/npm/three@0.158.0/examples/jsm/environments/RoomEnvironment.js";

const VERSION="0.158.0";
const SVG_URL="/assets/brand/7Z-LogoT.svg";
const reduceMotion=matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const MathUtilsSafeTan=(degrees)=>Math.tan(THREE.MathUtils.degToRad(degrees/2));
let svgTextPromise;
function loadSvg(){ return svgTextPromise ||= fetch(SVG_URL,{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error("Logo SVG unavailable");return r.text()}); }

function buildExtrusion(svgText){
  const parsed=new SVGLoader().parse(svgText.replace(/currentColor/gi,"#ffffff"));
  const shapes=[];
  let curveCount=0, sourceSize=0, smallestHole=Infinity;
  for(const path of parsed.paths){
    const fill=path.userData?.style?.fill||"";
    if(fill==="none") continue;
    // The supplied SVG is a raster trace with many gray shadow/edge contours.
    // Use only the clean near-white logo faces so the extrusion has no ghost layers.
    const hex=fill.match(/^#([0-9a-f]{6})$/i);
    if(hex){
      const color=Number.parseInt(hex[1],16);
      const r=(color>>16)&255,g=(color>>8)&255,b=color&255;
      if(Math.min(r,g,b)<251) continue;
    }
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
  // Increased depth by +25% (from 4.0 to 5.0) for luxurious solid architectural presence.
  const geometry=new THREE.ExtrudeGeometry(shapes,{
    depth:5.0/scaleFactor,steps:1,curveSegments,bevelEnabled:false
  });
  geometry.computeBoundingBox();
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
  renderer.domElement.style.background="transparent";
  renderer.domElement.className="hero-three-canvas";
  renderer.domElement.setAttribute("aria-hidden","true");
  host.appendChild(renderer.domElement);

  const pmrem=new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const room=new RoomEnvironment();
  const env=pmrem.fromScene(room,.04);
  scene.environment=env.texture;
  room.dispose(); pmrem.dispose();

  const logoGroup = new THREE.Group();
  logoGroup.position.set(0,0,0);
  scene.add(logoGroup);
  const lightGroup=new THREE.Group(); scene.add(lightGroup);
  RectAreaLightUniformsLib.init();
  scene.add(new THREE.AmbientLight(0x8babff,mode==="scroll"?.3:.056));
  addAreaLight(lightGroup,0x868686,3.5,240,300,[-90,-40,170],[0,0,0]);
  addAreaLight(lightGroup,0xc5c5c5,16.8,72,520,[-165,20,-60],[-18,0,0]);
  addAreaLight(lightGroup,0xc5c5c5,15.4,72,520,[165,10,-58],[18,0,0]);
  addAreaLight(lightGroup,0xbfbfbf,7,150,300,[120,90,160],[0,0,0]);

  let geometry, caps, walls;
  let pointerYaw=0,pointerPitch=0,pointerRoll=0;
  let targetYaw=0,targetPitch=0,targetRoll=0;
  let scrollYaw=0,baseYaw=0;
  const hero=host.closest(".logo-hero");
  const interactionArea=hero||host;
  function fallback(error){
    if(!alive)return;
    console.error("[7Z hero logo] Extrusion failed; keeping the logo visible in the same canvas.",error);
    canvasObserver.disconnect();
    geometry?.dispose(); geometry=undefined; caps?.dispose(); caps=undefined; walls?.dispose(); walls=undefined;
    logoGroup.clear();
    new THREE.TextureLoader().load(SVG_URL,texture=>{
      if(!alive){texture.dispose();return;}
      texture.colorSpace=THREE.SRGBColorSpace;
      const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide});
      const aspect=390/433;
      const mark=new THREE.Mesh(new THREE.PlaneGeometry(190*aspect,190),material);
      mark.position.set(0,0,0);
      logoGroup.add(mark);
      host.classList.add("is-webgl-active");
    },undefined,textureError=>console.error("[7Z hero logo] Fallback texture failed.",textureError));
  }
  function resize(){
    if(!alive)return;
    const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight),dpr=Math.min(devicePixelRatio||1,2);
    camera.aspect=w/h;
    camera.updateProjectionMatrix();
    const fov=MathUtilsSafeTan(camera.fov);
    if(geometry){
      const bounds=geometry.boundingBox||geometry.computeBoundingBox();
      const size=bounds.getSize(new THREE.Vector3());
      // Fit the full mark with room for its scroll spin and subtle pointer tilt.
      const halfWidth=Math.max(size.x,size.z)*.5+size.y*.08+size.z*.05;
      const halfHeight=size.y*.5+size.x*.08+size.z*.05;
      const safeDistance=Math.max(halfHeight/fov,halfWidth/(fov*camera.aspect))*1.25;
      camera.position.set(0,0,Math.max(390,safeDistance));
    } else camera.position.set(0,0,480);
    renderer.setPixelRatio(dpr);renderer.setSize(w,h,false);
  }
  const canvasObserver=new ResizeObserver(resize);canvasObserver.observe(host);
  function pointerMove(e){
    // Directional cursor tracking with smooth spatial parallax
    const rect=interactionArea.getBoundingClientRect();
    const centerX=rect.left+rect.width/2;
    const centerY=rect.top+rect.height/2;
    const nx=(e.clientX-centerX)/(window.innerWidth*0.5);
    const ny=(e.clientY-centerY)/(window.innerHeight*0.5);
    const cx=clamp(nx,-1.2,1.2);
    const cy=clamp(ny,-1.2,1.2);
    targetYaw=cx*0.38;     // Look left/right toward cursor (radians)
    targetPitch=-cy*0.28;  // Look up/down toward cursor (radians)
    targetRoll=-cx*0.06;   // Natural aerodynamic banking
  }
  function pointerLeave(){targetYaw=0;targetPitch=0;targetRoll=0;}
  function onScroll(){
    if(!hero)return;
    const heroStart=hero.getBoundingClientRect().top+window.scrollY;
    const progress=clamp((window.scrollY-heroStart)/Math.max(1,hero.offsetHeight),0,1);
    scrollYaw=progress*Math.PI*2;
  }
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
      // Smooth physical damp/lerp for natural, calm cursor tracking
      pointerYaw=THREE.MathUtils.damp(pointerYaw,targetYaw,3.8,time);
      pointerPitch=THREE.MathUtils.damp(pointerPitch,targetPitch,3.8,time);
      pointerRoll=THREE.MathUtils.damp(pointerRoll,targetRoll,3.8,time);

      if(mode==="loop"&&!reduceMotion){
        baseYaw+=0.48*time;
        logoGroup.rotation.y=baseYaw+pointerYaw;
      } else if(mode==="scroll"){
        logoGroup.rotation.y=THREE.MathUtils.damp(logoGroup.rotation.y,scrollYaw+pointerYaw,3.2,time);
      } else {
        logoGroup.rotation.y=pointerYaw;
      }
      logoGroup.rotation.x=pointerPitch;
      logoGroup.rotation.z=pointerRoll;
      renderer.render(scene,camera);
    } else renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(render);
  loadSvg().then(text=>{
    if(!alive)return;
    geometry=buildExtrusion(text);
    caps=new THREE.MeshPhysicalMaterial({side:THREE.FrontSide,color:mode==="scroll"?0xb8bec7:0x505050,metalness:mode==="scroll"?.72:.94,roughness:mode==="scroll"?.2:.1,emissive:mode==="scroll"?0x343a43:0x000000,emissiveIntensity:mode==="scroll"?.34:0,clearcoat:1,clearcoatRoughness:.08,transmission:0,ior:1.48,thickness:0,envMapIntensity:mode==="scroll"?3.2:6.9});
    walls=new THREE.MeshPhysicalMaterial({side:THREE.FrontSide,color:mode==="scroll"?0xaeb4bd:0x7c7c7c,emissive:mode==="scroll"?0x3d434c:0x303030,emissiveIntensity:mode==="scroll"?.22:.11,metalness:mode==="scroll"?.72:.94,roughness:mode==="scroll"?.24:.16,clearcoat:1,envMapIntensity:mode==="scroll"?3.1:6.15});
    const mesh=new THREE.Mesh(geometry,[caps,walls]);logoGroup.add(mesh);
    resize();
    host.classList.add("is-webgl-active");
  }).catch(fallback);

  window.addEventListener("pagehide",()=>{
    alive=false;cancelAnimationFrame(raf);observer.disconnect();canvasObserver.disconnect();
    document.removeEventListener("visibilitychange",onVis);
    window.removeEventListener("pointermove",pointerMove);interactionArea.removeEventListener("pointerleave",pointerLeave);
    delete host.dataset.threeMounted;
    window.removeEventListener("scroll",onScroll);geometry?.dispose();caps?.dispose();walls?.dispose();
    scene.environment?.dispose();renderer.dispose();renderer.domElement.remove();host.classList.remove("is-webgl-active");
  },{once:true});
}
function start(){
  const home=document.querySelector(".logo-hero__logo3d");
  const about=document.querySelector(".about-hero__logo-rotor");
  if(home)mount(home,matchMedia("(prefers-reduced-motion: reduce)").matches?"still":"scroll");
  if(about)mount(about,"loop");
}
if(document.readyState==="complete")start();else addEventListener("load",start,{once:true});
addEventListener("pageshow",e=>{if(e.persisted)start();});
