let renderer, scene, camera;

let spotLight1, spotLight2, spotLight3, lightHelper1, lightHelper2, lightHelper3, shadowCameraHelper;

let gui;

let clock = new THREE.Clock();

function init() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  let w = window.innerWidth * 0.9;
  let h = window.innerHeight * 0.9;
  renderer.setSize(w, h);
  document.getElementById("container").appendChild(renderer.domElement);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;

  scene = new THREE.Scene();
  scene.background = new THREE.Color().setHSL(0.6, 0, 1);
  scene.fog = new THREE.FogExp2(scene.background, 0.006);

  camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.set(65, 8, -10);

  let controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.addEventListener("change", render);
  controls.minDistance = 20;
  controls.maxDistance = 500;
  controls.enablePan = false;

  // LIGHT

  let ambient = new THREE.AmbientLight(0xffffff, 0.05);
  scene.add(ambient);

  let pointLight1 = new THREE.PointLight(0xffffff, 0.5);
  pointLight1.position.set(-10, 10, -10);
  pointLight1.castShadow = true;
  pointLight1.shadow.mapSize.width = 1024;
  pointLight1.shadow.mapSize.height = 1024;
  pointLight1.shadow.camera.near = 1;
  pointLight1.shadow.camera.far = 400;
  //   scene.add(pointLight1);

  spotLight1 = new THREE.SpotLight(0xffffff, 0.1);
  spotLight1.position.set(0, 30, -18);
  spotLight1.angle = Math.PI / 4;
  spotLight1.penumbra = 0.05;
  spotLight1.decay = 2;
  spotLight1.distance = 200;
  spotLight1.castShadow = true;
  spotLight1.shadow.mapSize.width = 1024;
  spotLight1.shadow.mapSize.height = 1024;
  spotLight1.shadow.camera.near = 10;
  spotLight1.shadow.camera.far = 200;
  scene.add(spotLight1);

  spotLight2 = new THREE.SpotLight(0xf4148d, 0.3);
  spotLight2.position.set(-10, 10, -5);
  spotLight2.angle = Math.PI / 4;
  spotLight2.penumbra = 0.05;
  spotLight2.decay = 2;
  spotLight2.distance = 200;
  spotLight2.castShadow = true;
  spotLight2.shadow.mapSize.width = 1024;
  spotLight2.shadow.mapSize.height = 1024;
  spotLight2.shadow.camera.near = 10;
  spotLight2.shadow.camera.far = 200;
  scene.add(spotLight2);

  spotLight3 = new THREE.SpotLight(0x19fc, 0.3);
  spotLight3.position.set(10, 10, 5);
  spotLight3.angle = Math.PI / 4;
  spotLight3.penumbra = 0.05;
  spotLight3.decay = 2;
  spotLight3.distance = 200;
  spotLight3.castShadow = true;
  spotLight3.shadow.mapSize.width = 1024;
  spotLight3.shadow.mapSize.height = 1024;
  spotLight3.shadow.camera.near = 10;
  spotLight3.shadow.camera.far = 200;
  scene.add(spotLight3);

  // HELPER GRID FOR LIGHTS/CAMERA
  lightHelper1 = new THREE.SpotLightHelper(spotLight1);
  scene.add(lightHelper1);

  lightHelper2 = new THREE.SpotLightHelper(spotLight2);
  scene.add(lightHelper2);

  lightHelper3 = new THREE.SpotLightHelper(spotLight3);
  scene.add(lightHelper3);

  var sphereSize = 1;
  //   pointLightHelper = new THREE.PointLightHelper(pointLight1, sphereSize);
  //   scene.add(pointLightHelper);

  shadowCameraHelper = new THREE.CameraHelper(spotLight1.shadow.camera);
  //   scene.add(shadowCameraHelper);
  scene.add(new THREE.AxesHelper(10));

  //
  // ADD OBJECTS
  //
  var material = new THREE.MeshPhongMaterial({ color: 0xffffff, dithering: true });
  var geometry = new THREE.PlaneBufferGeometry(2000, 2000);

  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, -1, 0);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.receiveShadow = true;
  scene.add(mesh);

  var material = new THREE.MeshPhongMaterial({ color: 0x4080ff, dithering: true });

  var geometry = new THREE.BoxBufferGeometry(2, 1, 2);

  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 2, 0);
  mesh.castShadow = true;
  scene.add(mesh);

  controls.target.copy(mesh.position);
  controls.update();

  window.addEventListener("resize", onResize, false);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function render() {
  lightHelper1.update();
  lightHelper2.update();
  lightHelper3.update();

  shadowCameraHelper.update();

  renderer.render(scene, camera);
}

function buildGui() {
  gui = new dat.GUI();
  gui.domElement.id = "gui";

  var params = {
    "light color": spotLight1.color.getHex(),
    intensity: spotLight1.intensity,
    distance: spotLight1.distance,
    angle: spotLight1.angle,
    penumbra: spotLight1.penumbra,
    decay: spotLight1.decay
  };

  gui.addColor(params, "light color").onChange(function(val) {
    spotLight1.color.setHex(val);
    render();
  });

  gui.add(params, "intensity", 0, 2).onChange(function(val) {
    spotLight1.intensity = val;
    render();
  });

  gui.add(params, "distance", 50, 200).onChange(function(val) {
    spotLight1.distance = val;
    render();
  });

  gui.add(params, "angle", 0, Math.PI / 3).onChange(function(val) {
    spotLight1.angle = val;
    render();
  });

  gui.add(params, "penumbra", 0, 1).onChange(function(val) {
    spotLight1.penumbra = val;
    render();
  });

  gui.add(params, "decay", 1, 2).onChange(function(val) {
    spotLight1.decay = val;
    render();
  });

  gui.open();
}

init();

buildGui();

render();
