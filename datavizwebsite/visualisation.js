function createTextCanvas(text, color, font, size) {
  size = size || 30;
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d"); // 2D rendering
  let fontStr = size + "px " + (font || "Arial");
  ctx.font = fontStr;
  let w = ctx.measureText(text).width;
  let h = Math.ceil(size);
  canvas.width = w;
  canvas.height = h;
  ctx.font = fontStr;
  ctx.fillStyle = color || "white";
  ctx.fillText(text, 0, Math.ceil(size * 0.8));
  return canvas;
}

function createText2D(text, color, font, size, segW, segH) {
  let canvas = createTextCanvas(text, color, font, size);
  let plane = new THREE.PlaneGeometry(canvas.width, canvas.height, segW, segH);
  let tex = new THREE.Texture(canvas);
  tex.needsUpdate = true;
  let planeMat = new THREE.MeshBasicMaterial({
    map: tex,
    color: 0xffffff,
    transparent: true
  });
  let mesh = new THREE.Mesh(plane, planeMat);
  mesh.scale.set(0.1, 0.1, 0.1);
  mesh.doubleSided = true;
  return mesh;
}

function sq(x) {
  let s = Math.pow(x, 2);
  return s;
}

function mapValues(num, in_min, in_max, out_min, out_max) {
  return ((num - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
}

// THREE SETUP

let stats;

let gui;

let ambientLight;

var loader = new THREE.TextureLoader();
loader.load("assets/stroke.png", function(texture) {
  strokeTexture = texture;
  //   init();
});

// info
let info = document.createElement("div");
info.setAttribute("style", "white-space: pre;");
info.style.position = "absolute";
info.style.bottom = "60px";
info.style.width = "100%";
info.style.textAlign = "center";
info.style.color = "#fff";
info.style.fontWeight = "bold";
info.style.backgroundColor = "transparent";
info.style.zIndex = "1";
info.style.fontFamily = "Arial";
info.innerHTML = "Drag mouse to rotate camera  \r\n move vertically to zoom";
document.body.appendChild(info);

// renderer
let renderer = new THREE.WebGLRenderer({
  antialias: true
});
let w = window.innerWidth * 0.8;
let h = window.innerHeight * 0.8;
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

// camera
let camera = new THREE.PerspectiveCamera(35, w / h, 1, 10000);
camera.position.set(0, 0, 200);

// stats (fps)
stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

// scene
let scene = new THREE.Scene();
scene.background = new THREE.Color("#131313");

// dataviz
let scatterPlot = new THREE.Object3D();
scene.add(scatterPlot);
scatterPlot.rotation.y = 0; // start orientation of dataviz

function vec(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

var acceleration = [],
  motionYawRollPitch = [],
  gravity = [],
  quaternationData = [];

var format = d3.format("+.3f");

d3.csv("data/testCSV.csv", function(data) {
  var dataValues = d3.values(data)[0]; // top row of columns = names
  var columnNum = Object.keys(dataValues); // putting names into array
  //   console.log(Object.keys(dataValues));

  data.forEach(function(mydata, i) {
    acceleration[i] = {
      //   x: +mydata[columnNum[11]],
      //   y: +mydata[columnNum[12]],
      //   z: +mydata[columnNum[13]]
      x: +mydata[columnNum[2]],
      y: +mydata[columnNum[3]],
      z: +mydata[columnNum[4]]
    };
    motionYawRollPitch[i] = {
      //   x: +mydata[columnNum[15]],
      //   y: +mydata[columnNum[16]],
      //   z: +mydata[columnNum[17]]
      x: +mydata[columnNum[6]],
      y: +mydata[columnNum[7]],
      z: +mydata[columnNum[8]]
    };
    gravity[i] = {
      //   x: +mydata[columnNum[29]],
      //   y: +mydata[columnNum[30]],
      //   z: +mydata[columnNum[31]]
      x: +mydata[columnNum[20]],
      y: +mydata[columnNum[21]],
      z: +mydata[columnNum[22]]
    };
    quaternationData[i] = {
      x: +mydata[columnNum[16]],
      y: +mydata[columnNum[17]],
      z: +mydata[columnNum[18]],
      w: +mydata[columnNum[19]]
    };
  });

  let temp = motionYawRollPitch;

  // find extent (min & max values) of either x, y or z to use for scaling
  // d3.extent returns a two element array of the minimum and maximum values from the array.
  // https://benclinkinbeard.com/d3tips/utility-methods-with-d3-array/?utm_content=buffer90c0a&utm_medium=social&utm_source=twitter.com&utm_campaign=buffer
  let xExent = d3.extent(temp, function(d) {
      return d.x;
    }),
    yExent = d3.extent(temp, function(d) {
      return d.y;
    }),
    zExent = d3.extent(temp, function(d) {
      return d.z;
    });

  // points for labels and grid overlay
  let orientPoint = {
    xMax: xExent[1],
    xCen: (xExent[1] + xExent[0]) / 2,
    xMin: xExent[0],
    yMax: yExent[1],
    yCen: (yExent[1] + yExent[0]) / 2,
    yMin: yExent[0],
    zMax: zExent[1],
    zCen: (zExent[1] + zExent[0]) / 2,
    zMin: zExent[0]
  };

  // SCALING IN d3 (distribution of points)
  // https://github.com/d3/d3-scale
  // http://www.jeromecukier.net/2011/08/11/d3-scales-and-color/
  // https://www.d3indepth.com/scales/
  // Simply put: scales transform a number in a certain interval (called the domain)
  // into a number in another interval (called the range).
  let xScale = d3.scale
    .linear()
    .domain(xExent)
    .range([-50, 50]);
  //array min & max of data set
  let yScale = d3.scale
    .linear()
    .domain(yExent)
    .range([-50, 50]);
  let zScale = d3.scale
    .linear()
    .domain(zExent)
    .range([-50, 50]);

  function labelOrientation() {
    // MESH around VIZ
    let lineGeo = new THREE.Geometry();
    lineGeo.vertices.push(
      // rectangle on one side (xMin)
      vec(xScale(orientPoint.xMin), yScale(orientPoint.yMin), zScale(orientPoint.zMin)),
      vec(xScale(orientPoint.xMin), yScale(orientPoint.yMin), zScale(orientPoint.zMax)),
      vec(xScale(orientPoint.xMin), yScale(orientPoint.yMax), zScale(orientPoint.zMax)),
      vec(xScale(orientPoint.xMin), yScale(orientPoint.yMax), zScale(orientPoint.zMin)),
      vec(xScale(orientPoint.xMin), yScale(orientPoint.yMin), zScale(orientPoint.zMin)),

      // rectangle on other side (xMax) + bridging lines
      vec(xScale(orientPoint.xMax), yScale(orientPoint.yMin), zScale(orientPoint.zMin)),

      vec(xScale(orientPoint.xMax), yScale(orientPoint.yMin), zScale(orientPoint.zMax)),
      vec(xScale(orientPoint.xMin), yScale(orientPoint.yMin), zScale(orientPoint.zMax)),
      vec(xScale(orientPoint.xMax), yScale(orientPoint.yMin), zScale(orientPoint.zMax)),

      vec(xScale(orientPoint.xMax), yScale(orientPoint.yMax), zScale(orientPoint.zMax)),
      vec(xScale(orientPoint.xMin), yScale(orientPoint.yMax), zScale(orientPoint.zMax)),
      vec(xScale(orientPoint.xMax), yScale(orientPoint.yMax), zScale(orientPoint.zMax)),

      vec(xScale(orientPoint.xMax), yScale(orientPoint.yMax), zScale(orientPoint.zMin)),
      vec(xScale(orientPoint.xMin), yScale(orientPoint.yMax), zScale(orientPoint.zMin)),
      vec(xScale(orientPoint.xMax), yScale(orientPoint.yMax), zScale(orientPoint.zMin)),

      vec(xScale(orientPoint.xMax), yScale(orientPoint.yMin), zScale(orientPoint.zMin))
    );

    let lineMat = new THREE.LineBasicMaterial({
      color: 0x3a3a3a,
      lineWidth: 1
    });
    let line = new THREE.Line(lineGeo, lineMat);
    line.type = THREE.Lines;
    scatterPlot.add(line); // add mesh around scatterplot

    // add coordinate system labels
    var titleX = createText2D("-X");
    (titleX.position.x = xScale(orientPoint.xMin) - 12), (titleX.position.y = 5);
    scatterPlot.add(titleX);

    var valueX = createText2D(format(xExent[0]));
    (valueX.position.x = xScale(orientPoint.xMin) - 12), (valueX.position.y = -5);
    scatterPlot.add(valueX);

    var titleX = createText2D("X");
    titleX.position.x = xScale(orientPoint.xMax) + 12;
    titleX.position.y = 5;
    scatterPlot.add(titleX);

    var valueX = createText2D(format(xExent[1]));
    (valueX.position.x = xScale(orientPoint.xMax) + 12), (valueX.position.y = -5);
    scatterPlot.add(valueX);

    var titleY = createText2D("-Y");
    titleY.position.y = yScale(orientPoint.yMin) - 5;
    scatterPlot.add(titleY);

    var valueY = createText2D(format(yExent[0]));
    (valueY.position.y = yScale(orientPoint.yMin) - 15), scatterPlot.add(valueY);

    var titleY = createText2D("Y");
    titleY.position.y = yScale(orientPoint.yMax) + 15;
    scatterPlot.add(titleY);

    var valueY = createText2D(format(yExent[1]));
    (valueY.position.y = yScale(orientPoint.yMax) + 5), scatterPlot.add(valueY);

    var titleZ = createText2D("-Z " + format(zExent[0]));
    titleZ.position.z = zScale(orientPoint.zMin) + 2;
    scatterPlot.add(titleZ);

    var titleZ = createText2D("Z " + format(zExent[1]));
    titleZ.position.z = zScale(orientPoint.zMax) + 2;
    scatterPlot.add(titleZ);
  }
  labelOrientation();

  //
  //  ---- ADDING VIZ ELEMENTS ----
  //
  // sphere noise
  var sphere_geometry = new THREE.SphereGeometry(15, 20, 20);
  var material = new THREE.MeshLambertMaterial();
  var sphereNoise = new THREE.Mesh(sphere_geometry, material);
  var updateNoise = function() {
    var time = performance.now() * 0.0005;
    var k = 5;
    for (var i = 0; i < sphereNoise.geometry.faces.length; i++) {
      var uv = sphereNoise.geometry.faceVertexUvs[0][i]; //faceVertexUvs is a huge arrayed stored inside of another array
      var f = sphereNoise.geometry.faces[i];
      var p = sphereNoise.geometry.vertices[f.a]; //take the first vertex from each face
      //   p.normalize().multiplyScalar(10 + 2.3 * noise.perlin3(uv[0].x * k, uv[0].y * k, time));
      p.normalize().multiplyScalar(15 + 10 * noise.perlin3(p.x * k + time, p.y * k, p.z * k + time));
    }
    sphereNoise.geometry.verticesNeedUpdate = true; //must be set or vertices will not update
    sphereNoise.geometry.computeVertexNormals();
    sphereNoise.geometry.normalsNeedUpdate = true;
  };

  //   scene.add(sphereNoise);

  // rotating cube
  let cube1Geometry = new THREE.BoxBufferGeometry(2, 4, 6);
  let cube1Material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  let cube1 = new THREE.Mesh(cube1Geometry, cube1Material);
  scene.add(cube1);

  // create a keyframe track (i.e. a timed sequence of keyframes) for each animated property
  // Note: the keyframe track type should correspond to the type of the property being animated

  let stepSize = Math.floor(quaternationData.length / 15);
  //   console.log("quaternationData length", Math.floor(quaternationData.length));
  //   console.log("quaternationData length /11", stepSize);
  // POSITION - VectorKeyframeTrack( name : String, times : Array, values : Array )
  let positionKF = new THREE.VectorKeyframeTrack(".position", [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  positionKF.values = [
    xScale(gravity[0 * stepSize].x),
    yScale(gravity[0 * stepSize].y),
    zScale(gravity[0 * stepSize].z),
    xScale(gravity[1 * stepSize].x),
    yScale(gravity[1 * stepSize].y),
    zScale(gravity[1 * stepSize].z),
    xScale(gravity[2 * stepSize].x),
    yScale(gravity[2 * stepSize].y),
    zScale(gravity[2 * stepSize].z),
    xScale(gravity[3 * stepSize].x),
    yScale(gravity[3 * stepSize].y),
    zScale(gravity[3 * stepSize].z),
    xScale(gravity[4 * stepSize].x),
    yScale(gravity[4 * stepSize].y),
    zScale(gravity[4 * stepSize].z),
    xScale(gravity[5 * stepSize].x),
    yScale(gravity[5 * stepSize].y),
    zScale(gravity[5 * stepSize].z),
    xScale(gravity[6 * stepSize].x),
    yScale(gravity[6 * stepSize].y),
    zScale(gravity[6 * stepSize].z),
    xScale(gravity[7 * stepSize].x),
    yScale(gravity[7 * stepSize].y),
    zScale(gravity[7 * stepSize].z),
    xScale(gravity[8 * stepSize].x),
    yScale(gravity[8 * stepSize].y),
    zScale(gravity[8 * stepSize].z),
    xScale(gravity[9 * stepSize].x),
    yScale(gravity[9 * stepSize].y),
    zScale(gravity[9 * stepSize].z),
    xScale(gravity[10 * stepSize].x),
    yScale(gravity[10 * stepSize].y),
    zScale(gravity[10 * stepSize].z),
    xScale(gravity[11 * stepSize].x),
    yScale(gravity[11 * stepSize].y),
    zScale(gravity[11 * stepSize].z),
    xScale(gravity[12 * stepSize].x),
    yScale(gravity[12 * stepSize].y),
    zScale(gravity[12 * stepSize].z),
    xScale(gravity[13 * stepSize].x),
    yScale(gravity[13 * stepSize].y),
    zScale(gravity[13 * stepSize].z),
    xScale(gravity[14 * stepSize].x),
    yScale(gravity[14 * stepSize].y),
    zScale(gravity[14 * stepSize].z),
    xScale(gravity[15 * stepSize].x),
    yScale(gravity[15 * stepSize].y),
    zScale(gravity[15 * stepSize].z)
  ];
  //   console.log("motionYawRollPitch array: ", positionKF.values);

  // ROTATION
  // Rotation should be performed using quaternions, using a THREE.QuaternionKeyframeTrack
  // Interpolating Euler angles (.rotation property) can be problematic and is currently not supported
  // set up rotation about x axis
  var xAxis = new THREE.Vector3(1, 0, 0);

  var qInitial = new THREE.Quaternion().setFromAxisAngle(xAxis, 0);
  var qFinal = new THREE.Quaternion().setFromAxisAngle(xAxis, Math.PI);
  var quaternionKF = new THREE.QuaternionKeyframeTrack(".quaternion", [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15
  ]);
  quaternionKF.values = [
    quaternationData[0 * stepSize].x,
    quaternationData[0 * stepSize].y,
    quaternationData[0 * stepSize].z,
    quaternationData[0 * stepSize].w,
    quaternationData[1 * stepSize].x,
    quaternationData[1 * stepSize].y,
    quaternationData[1 * stepSize].z,
    quaternationData[1 * stepSize].w,
    quaternationData[2 * stepSize].x,
    quaternationData[2 * stepSize].y,
    quaternationData[2 * stepSize].z,
    quaternationData[2 * stepSize].w,
    quaternationData[3 * stepSize].x,
    quaternationData[3 * stepSize].y,
    quaternationData[3 * stepSize].z,
    quaternationData[3 * stepSize].w,
    quaternationData[4 * stepSize].x,
    quaternationData[4 * stepSize].y,
    quaternationData[4 * stepSize].z,
    quaternationData[4 * stepSize].w,
    quaternationData[5 * stepSize].x,
    quaternationData[5 * stepSize].y,
    quaternationData[5 * stepSize].z,
    quaternationData[5 * stepSize].w,
    quaternationData[6 * stepSize].x,
    quaternationData[6 * stepSize].y,
    quaternationData[6 * stepSize].z,
    quaternationData[6 * stepSize].w,
    quaternationData[7 * stepSize].x,
    quaternationData[7 * stepSize].y,
    quaternationData[7 * stepSize].z,
    quaternationData[7 * stepSize].w,
    quaternationData[8 * stepSize].x,
    quaternationData[8 * stepSize].y,
    quaternationData[8 * stepSize].z,
    quaternationData[8 * stepSize].w,
    quaternationData[9 * stepSize].x,
    quaternationData[9 * stepSize].y,
    quaternationData[9 * stepSize].z,
    quaternationData[9 * stepSize].w,
    quaternationData[10 * stepSize].x,
    quaternationData[10 * stepSize].y,
    quaternationData[10 * stepSize].z,
    quaternationData[10 * stepSize].w,
    quaternationData[11 * stepSize].x,
    quaternationData[11 * stepSize].y,
    quaternationData[11 * stepSize].z,
    quaternationData[11 * stepSize].w,
    quaternationData[12 * stepSize].x,
    quaternationData[12 * stepSize].y,
    quaternationData[12 * stepSize].z,
    quaternationData[12 * stepSize].w,
    quaternationData[13 * stepSize].x,
    quaternationData[13 * stepSize].y,
    quaternationData[13 * stepSize].z,
    quaternationData[13 * stepSize].w,
    quaternationData[14 * stepSize].x,
    quaternationData[14 * stepSize].y,
    quaternationData[14 * stepSize].z,
    quaternationData[14 * stepSize].w,
    quaternationData[15 * stepSize].x,
    quaternationData[15 * stepSize].y,
    quaternationData[15 * stepSize].z,
    quaternationData[15 * stepSize].w
  ];

  // create an animation sequence with the tracks
  // If a negative time value is passed, the duration will be calculated from the times of the passed tracks array
  // AnimationClip( name : String, duration : Number, tracks : Array )
  let clip = new THREE.AnimationClip("Action", 11, [quaternionKF]);

  // setup the THREE.AnimationMixer
  mixer = new THREE.AnimationMixer(sphereNoise);

  // create a ClipAction and set it to play
  let clipAction = mixer.clipAction(clip);
  clipAction.play();

  // MESH LINE

  var lineGeometry = new THREE.Geometry();

  for (let i = 1; i < gravity.length; i++) {
    let x = xScale(gravity[i].x);
    let y = yScale(gravity[i].y);
    let z = zScale(gravity[i].z);

    var v = vec(x, y, z);
    lineGeometry.vertices.push(v);
  }

  let colors = [
    0xed6a5a,
    0xf4f1bb,
    0x9bc1bc,
    0x5ca4a9,
    0xe6ebe0,
    0xf0b67f,
    0xfe5f55,
    0xd6d1b1,
    0xc7efcf,
    0xeef5db,
    0x50514f,
    0xf25f5c,
    0xffe066,
    0x247ba0,
    0x70c1b3
  ];

  let line = new MeshLine();
  line.setGeometry(lineGeometry, function(p) {
    return 2 + Math.sin(50 * p);
  });

  let lineMat = new MeshLineMaterial({
    map: strokeTexture,
    useMap: 0,
    color: new THREE.Color("#E5AD24"),
    // color: new THREE.Color(colors[~~Maf.randomInRange(0, colors.length)]),
    lineWidth: 0.3,
    near: 1,
    far: 100000,
    opacity: 1,
    // dashArray: new THREE.Vector2(10, 5),
    blending: THREE.AdditiveBlending,
    transparent: true
  });

  let lineMesh = new THREE.Mesh(line.geometry, lineMat);
  scene.add(lineMesh);

  //
  // old stuff/ /

  //   let cubeGroup = new THREE.Object3D();

  //   for (let i = 0; i < acceleration.length; i++) {
  //     let x = xScale(acceleration[i].x);
  //     let y = yScale(acceleration[i].y);
  //     let z = zScale(acceleration[i].z);

  //     var cube1 = new THREE.Mesh(cube1Geometry, cube1Material);
  //     cube1.position.x = x;
  //     cube1.position.y = y;
  //     cube1.position.z = z;
  //     cubeGroup.add(cube1);
  //   }

  // PARTICLE SIZE & COLOR
  let mat = new THREE.PointsMaterial({
    vertexColors: true, // ?
    size: 1 //size of particle
  });

  let pointCount = motionYawRollPitch.length; //amount of all data points
  let pointGeo = new THREE.Geometry();

  // CUBE
  let cubeGeometry = new THREE.CubeGeometry(2, 4, 2);
  let cube;

  let sphereGroup = new THREE.Object3D();
  let sphereGeometry = new THREE.SphereBufferGeometry(1, 10, 10);

  // going through all data points - draw point, with color
  for (let i = 1; i < motionYawRollPitch.length; i++) {
    let timeFactor = 0; //.00003; // stretching data over time
    let x = xScale(motionYawRollPitch[i].x + i * timeFactor);
    let y = yScale(motionYawRollPitch[i].y + i * timeFactor);
    let z = zScale(motionYawRollPitch[i].z + i * timeFactor);

    // let u = xScale(motionYawRollPitch[i - 1].x);
    // let v = yScale(motionYawRollPitch[i - 1].y);
    // let w = zScale(motionYawRollPitch[i - 1].z);

    let colorMap = mapValues(i, 1, pointCount, 0, 150);

    // let cubeMaterial = new THREE.MeshLambertMaterial({ color: 0xd5d5d5 });
    // cubeMaterial.color.setRGB((180 - colorMap) / 255, 100 / 255, 150 / 255);
    // // cubeMaterial.color.setRGB(50, 50, 50);
    // cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    // cube.position.x = x;
    // cube.position.y = y;
    // cube.position.z = z;

    // cube.rotation.x = (Math.PI / 2) * (i % 2);
    // // scene.add(cube);

    // let sphereMaterial = new THREE.MeshLambertMaterial();
    // sphereMaterial.color.setRGB((180 - colorMap) / 255, 100 / 255, 150 / 255);
    // let sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    // sphere.position.x = x;
    // sphere.position.y = y;
    // sphere.position.z = z;
    // scene.add(sphere);
    // sphereGroup.add(sphere);

    // var sphereNoise = new THREE.Mesh(sphere_geometry, material);
    // sphereNoise.position.x = x;
    // sphereNoise.position.y = y;
    // sphereNoise.position.z = z;
    // sphereNoise.rotation.x = (Math.PI / 4) * (i % 4);
    // scene.add(sphereNoise);
    // sphereGroup.add(sphereNoise);

    // pointGeo.vertices.push(new THREE.Vector3(x, y, z), new THREE.Vector3(u, v, w)); // connecting lines
    pointGeo.vertices.push(new THREE.Vector3(x, y, z));
    // console.log(pointCount);
    pointGeo.colors.push(
      new THREE.Color().setRGB((170 - colorMap) / 255, 50 / 255, 67 / 255) //Gradient from red to blue
    );
  }

  //   scene.add(sphereGroup);
  let points = new THREE.Points(pointGeo, mat);
  scatterPlot.add(points);

  // PARTICLE SIZE & COLOR II
  let secondMat = new THREE.PointsMaterial({
    vertexColors: true, // ?
    size: 0.5
  });
  // let pointCount = data.acceleration.length; //number of all data points
  let secondPointGeo = new THREE.Geometry();
  for (let i = 0; i < acceleration.length; i++) {
    let timeFactor = 0.0003; // stretching data over time
    let x = xScale(acceleration[i].x + i * timeFactor);
    let y = yScale(acceleration[i].y + i * timeFactor);
    let z = zScale(acceleration[i].z + i * timeFactor);

    secondPointGeo.vertices.push(new THREE.Vector3(x, z, y));
    let colorMap = mapValues(i, 1, pointCount, 0, 70);
    secondPointGeo.colors.push(
      new THREE.Color().setRGB((255 - colorMap) / 255, (255 - colorMap) / 255, (255 - colorMap) / 255) //Gradient from yellow to orange
    );
  }

  let secondPoints = new THREE.Points(secondPointGeo, secondMat);
  scatterPlot.add(secondPoints);

  // LINE VERSION
  let lineMaterial = new THREE.LineBasicMaterial({
    color: 0x820000,
    lineWidth: 0.1
  });
  let lineData = new THREE.Line(secondPointGeo, lineMaterial);
  lineData.type = THREE.Lines;
  //   scatterPlot.add(lineData);

  // LIGHT
  function lighting() {
    ambientLight = new THREE.AmbientLight(0x9d9d9d, 0.4);
    scene.add(ambientLight);

    let pointLight1 = new THREE.PointLight(0xff7f00, 0.8);
    pointLight1.position.set(0, 0, 0);
    pointLight1.castShadow = true;
    pointLight1.shadow.mapSize.width = 1024;
    pointLight1.shadow.mapSize.height = 1024;
    pointLight1.shadow.camera.near = 1;
    pointLight1.shadow.camera.far = 400;
    scene.add(pointLight1);

    spotLight1 = new THREE.SpotLight(0xffffff, 1);
    spotLight1.position.set(-70, -100, 100);
    spotLight1.angle = Math.PI / 8;
    spotLight1.penumbra = 0.2;
    spotLight1.decay = 1.5;
    spotLight1.distance = 300;
    spotLight1.castShadow = true;
    spotLight1.shadow.mapSize.width = 1024;
    spotLight1.shadow.mapSize.height = 1024;
    spotLight1.shadow.camera.near = 10;
    spotLight1.shadow.camera.far = 200;
    scene.add(spotLight1);

    spotLight2 = new THREE.SpotLight(0xf4148d, 1);
    spotLight2.position.set(100, 100, 50);
    spotLight2.angle = Math.PI / 6;
    spotLight2.penumbra = 0.05;
    spotLight2.decay = 1.5;
    spotLight2.distance = 300;
    spotLight2.castShadow = true;
    spotLight2.shadow.mapSize.width = 1024;
    spotLight2.shadow.mapSize.height = 1024;
    spotLight2.shadow.camera.near = 10;
    spotLight2.shadow.camera.far = 200;
    scene.add(spotLight2);

    spotLight3 = new THREE.SpotLight(0x5dd1fb, 2);
    spotLight3.position.set(-100, 20, -80);
    spotLight3.angle = Math.PI / 6;
    spotLight3.penumbra = 0.05;
    spotLight3.decay = 1.5;
    spotLight3.distance = 300;
    spotLight3.castShadow = true;
    spotLight3.shadow.mapSize.width = 1024;
    spotLight3.shadow.mapSize.height = 1024;
    spotLight3.shadow.camera.near = 10;
    spotLight3.shadow.camera.far = 200;
    scene.add(spotLight3);

    //   // HELPER GRID FOR LIGHTS/CAMERA
    //   lightHelper1 = new THREE.SpotLightHelper(spotLight1);
    //   scene.add(lightHelper1);

    //   lightHelper2 = new THREE.SpotLightHelper(spotLight2);
    //   scene.add(lightHelper2);

    //   lightHelper3 = new THREE.SpotLightHelper(spotLight3);
    //   scene.add(lightHelper3);

    //   var spotLight1 = createSpotlight(0xff7f00);
    //   var spotLight2 = createSpotlight(0x00ff7f);
    //   var spotLight3 = createSpotlight(0x7f00ff);
    //   spotLight1.position.set(200, -100, 100);
    //   spotLight2.position.set(-200, 100, 0);
    //   spotLight3.position.set(100, 100, 200);
    //     scene.add(spotLight1, spotLight2, spotLight3);

    //   function createSpotlight(color) {
    //     var newObj = new THREE.SpotLight(color, 2);
    //     newObj.castShadow = true;
    //     newObj.angle = 0.3;
    //     newObj.penumbra = 0.5;
    //     newObj.decay = 2;
    //     newObj.distance = 400;
    //     return newObj;
    //   }
  }

  // INTERACTION
  renderer.render(scene, camera);
  //   let paused = false;
  //   let last = new Date().getTime();
  let down = false;
  let sx = 0,
    sy = 0;

  window.onmousedown = function(ev) {
    down = true;
    sx = ev.clientX;
    sy = ev.clientY;
  };
  window.onmouseup = function() {
    down = false;
  };
  window.onmousemove = function(ev) {
    if (down) {
      let dx = ev.clientX - sx;
      let dy = ev.clientY - sy;
      //   let dist = Math.sqrt(sq(camera.position.x) + sq(camera.position.y) + sq(camera.position.z));

      scene.children.forEach(el => {
        el.rotation.y += dx * 0.01;
        el.rotation.z += dy * 0.01;
      });
      //   scatterPlot.rotation.y += dx * 0.01;
      //   scatterPlot.rotation.x += dy * 0.01;
      //   cube1.rotation.y += dx * 0.01;
      //   cube1.rotation.x += dy * 0.01;
      //   sphereGroup.scale.y += dy * 0.01;
      //   sphereGroup.rotation.y += dx * 0.01;
      //   sphereGroup.rotation.x += dy * 0.01;
      camera.position.y += dy * 1.5; // zoom in out with mouse y change

      sx += dx;
      sy += dy;
    }
  };

  let animateVisibility = true;
  // for cube rotation
  let clock = new THREE.Clock();

  function animate(time) {
    // last = t;
    // renderer.clear();
    scene.children.forEach(el => {
      el.rotation.y += 0.001;
      el.rotation.z += 0.0005;
    });

    // cubeGroup.rotation.y -= clock.getDelta() * 0.3;
    // lightHelper1.update();
    // lightHelper2.update();
    // lightHelper3.update();
    window.requestAnimationFrame(animate, renderer.domElement);
    lineMesh.material.uniforms.visibility.value = animateVisibility ? (time / 100000) % 1.0 : 1.0;
    render();
  }

  function render() {
    var delta = clock.getDelta();

    if (mixer) {
      mixer.update(delta);
    }

    camera.lookAt(scene.position);
    renderer.render(scene, camera);
    updateNoise();
    stats.update();
  }
  //   animate(new Date().getTime());

  animate();

  function buildGui() {
    gui = new dat.GUI();
    gui.domElement.id = "gui";

    var params = {
      "light color": ambientLight.color.getHex()
    };

    gui.addColor(params, "light color").onChange(function(val) {
      ambientLight.color.setHex(val);
      //   animate();
    });

    gui.open();
  }
  lighting();
  buildGui();

  //   onmessage = function(ev) {
  //     paused = ev.data == "pause";
  //   };
});
