/* ============================================================
   logo3d.js — interaktivní 3D logo (logo.glb) v Hero sekci
   - tažením myší / prstem otáčení doleva/doprava i nahoru/dolů
   - po puštění zůstává model v poslední pozici (žádný auto-reset)
   - jemné nasvícení + plynulá animace při načtení
   - pokud WebGL není dostupný nebo se model nenačte, potichu se
     použije záložní fotografie / placeholder, aby web fungoval vždy
============================================================ */

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
  } catch (e) {
    return false;
  }
}

function initLogo3D() {
  const mount = document.querySelector("[data-hero-photo]");
  if (!mount || !window.THREE || !THREE.GLTFLoader || !supportsWebGL()) return false;

  mount.innerHTML = `<div class="logo3d-loading"><span></span></div>`;
  const canvasWrap = document.createElement("div");
  canvasWrap.className = "logo3d-canvas";
  mount.appendChild(canvasWrap);

  const width = mount.clientWidth || 360;
  const height = mount.clientHeight || 400;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
  camera.position.set(0, 0, 4.5);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace || THREE.sRGBEncoding;
  canvasWrap.appendChild(renderer.domElement);

  // Jemné nasvícení: měkké okolní světlo + hlavní + doplňkové z druhé strany
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x7c5cff, 0.5);
  fill.position.set(-4, -2, -3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x2ee6c8, 0.6);
  rim.position.set(-2, 3, -4);
  scene.add(rim);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.rotateSpeed = 0.7;
  controls.minPolarAngle = Math.PI * 0.15;
  controls.maxPolarAngle = Math.PI * 0.85;

  let model = null;
  let destroyed = false;
  const loader = new THREE.GLTFLoader();

  const failSafeTimer = setTimeout(() => {
    if (!model) revertToFallback(mount);
  }, 15000);

  loader.load(
    "logo.glb",
    (gltf) => {
      if (destroyed) return;
      clearTimeout(failSafeTimer);
      model = gltf.scene;

      // vystředit a zvětšit na jednotnou velikost bez ohledu na export
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);
      model.position.sub(center);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 2.1 / maxDim;
      model.scale.setScalar(scale * 0.001);
      scene.add(model);

      mount.querySelector(".logo3d-loading")?.remove();

      // plynulá animace při načtení (fade + scale pomocí GSAP, pokud je k dispozici)
      if (window.gsap) {
        gsap.to(model.scale, { x: scale, y: scale, z: scale, duration: 1.1, ease: "power3.out" });
        gsap.from(canvasWrap, { opacity: 0, duration: 0.8, ease: "power2.out" });
      } else {
        model.scale.setScalar(scale);
      }
    },
    undefined,
    (err) => {
      console.error("logo.glb se nepodařilo načíst:", err);
      clearTimeout(failSafeTimer);
      revertToFallback(mount);
    }
  );

  function animate() {
    if (destroyed) return;
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    const w = mount.clientWidth || width;
    const h = mount.clientHeight || height;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  mount._destroy3D = () => {
    destroyed = true;
    window.removeEventListener("resize", onResize);
    controls.dispose();
    renderer.dispose();
  };

  return true;
}

function revertToFallback(mount) {
  if (!mount || mount._fallbackApplied) return;
  mount._fallbackApplied = true;
  mount._destroy3D?.();
  if (typeof renderHero === "function") renderHero();
}
