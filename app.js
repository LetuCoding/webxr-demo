// app.js (module)
import * as THREE from 'https://unpkg.com/three@0.156.0/build/three.module.js';
import { ARButton } from 'https://unpkg.com/three@0.156.0/examples/jsm/webxr/ARButton.js';

let camera, scene, renderer;
let reticle, controller;
let placed = [];

init();
function init(){
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera();

  renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Light
  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  // Reticle for hit-test
  reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.12, 32).rotateX(-Math.PI/2),
    new THREE.MeshBasicMaterial({ color: 0x00ffff })
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  // Controller
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // ARButton
  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  // Start render loop
  renderer.setAnimationLoop(render);

  // Buttons
  document.getElementById('btn-add-cube').addEventListener('click', ()=> spawn('cube'));
  document.getElementById('btn-add-sphere').addEventListener('click', ()=> spawn('sphere'));
  document.getElementById('btn-clear').addEventListener('click', clearScene);

  window.addEventListener('resize', onWindowResize);
}

// Hit test setup and anchor storage
let xrHitTestSource = null;
let xrRefSpace = null;

renderer.xr.addEventListener('sessionstart', async () => {
  const session = renderer.xr.getSession();
  xrRefSpace = await session.requestReferenceSpace('viewer');
  xrHitTestSource = await session.requestHitTestSource({ space: xrRefSpace });

  session.addEventListener('end', () => {
    xrHitTestSource = null;
    xrRefSpace = null;
  });
});

function spawn(type){
  if(!reticle.visible) {
    showMessage('Busca una superficie válida primero.');
    return;
  }
  const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff, roughness:0.7, metalness:0.0 });
  let mesh;
  if(type === 'cube'){
    mesh = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.12), material);
  } else {
    mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 32, 32), material);
  }
  // position from reticle
  mesh.position.setFromMatrixPosition(reticle.matrix);
  mesh.quaternion.setFromRotationMatrix(reticle.matrix);
  mesh.userData.spawned = true;
  scene.add(mesh);
  placed.push(mesh);
}

function clearScene(){
  placed.forEach(o => scene.remove(o));
  placed = [];
  showMessage('Escena limpiada.');
}

function onSelect(){
  // select nearest spawned object and toggle scale as example
  if(placed.length === 0) return;
  // choose nearest to camera
  let nearest = null; let nd = Infinity;
  const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld);
  placed.forEach(o => {
    const d = camPos.distanceTo(o.position);
    if(d < nd){ nd = d; nearest = o; }
  });
  if(nearest){
    nearest.scale.multiplyScalar( nearest.scale.x > 1.4 ? 0.6 : 1.4 );
  }
}

function showMessage(txt){
  const m = document.getElementById('message');
  m.textContent = txt;
  m.style.opacity = '1';
  setTimeout(()=> m.style.opacity='0.9', 1200);
}

function onWindowResize(){
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render(timestamp, frame){
  if(frame){
    const session = renderer.xr.getSession();
    const referenceSpace = renderer.xr.getReferenceSpace();

    if(xrHitTestSource && referenceSpace){
      const hitTestResults = frame.getHitTestResults(xrHitTestSource);
      if(hitTestResults.length > 0){
        const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        reticle.visible = true;
        reticle.matrix.fromArray(pose.transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  renderer.render(scene, camera);
}
