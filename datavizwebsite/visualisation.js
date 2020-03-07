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

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// get data from csv file
function getPts(x) {
  //console.log(x)
  let unfiltered = [],
    lowPass = [],
    highPass = [];

  x.forEach(function(d, i) {
    // nochmal js functin anschauen (d, i)
    let line = d.split(","); //trennugn durch , in csv

    // spalte 2,3,4
    unfiltered[i] = {
      x: +line[2],
      y: +line[3],
      z: +line[4]
    };
    lowPass[i] = {
      x: +line[6],
      y: +line[7],
      z: +line[8]
    };
    highPass[i] = {
      x: +line[7],
      y: +line[8],
      z: +line[9]
    };
  });
  let xyzData = {
    unfiltered: unfiltered,
    lowPass: lowPass,
    highPass: highPass
  };
  return xyzData;
}

// UPLOAD DATA FILE
let uploader = document.getElementById("uploader");
let reader = new FileReader();
let data;

reader.onload = function(e) {
  let contents = e.target.result;
  let rawData = contents.split(/\n/);
  let tempData = rawData.slice(2, rawData.length);
  data = getPts(tempData);
  scatter(data);

  // remove button after loading file
  uploader.parentNode.removeChild(uploader);
};

uploader.addEventListener("change", handleFiles, false);

function handleFiles() {
  let file = this.files[0];
  reader.readAsText(file);
}

// THREE SETUP
let renderer = new THREE.WebGLRenderer({
  antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

let w = window.innerWidth * 0.9;
let h = window.innerHeight * 0.9;

renderer.setSize(w, h);
document.getElementById("container").appendChild(renderer.domElement);

let camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);
camera.position.z = 200;
camera.position.x = -100;
camera.position.y = 100;

let scene = new THREE.Scene();
scene.background = new THREE.Color("#131313");

// SCATTERPLOT
let scatterPlot = new THREE.Object3D();
scene.add(scatterPlot);

scatterPlot.rotation.y = 0; // start orientation of dataviz

function vec(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

let format = d3.format("+.3f");

function scatter(data) {
  let temp = data.unfiltered;

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
  let xScale = d3
    .scaleLinear()
    .domain(xExent)
    .range([-50, 50]);
  //array min & max of data set
  let yScale = d3
    .scaleLinear()
    .domain(yExent)
    .range([-50, 50]);
  let zScale = d3
    .scaleLinear()
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

  var cube1Geometry = new THREE.CubeGeometry(10, 10, 20);
  var cube1Material = new THREE.MeshLambertMaterial({ color: 0xffffff });
  var cube1 = new THREE.Mesh(cube1Geometry, cube1Material);
  cube1.position.z = 0;
  cube1.rotation.y = (Math.PI * 45) / 180;
  scene.add(cube1);

  // PARTICLE SIZE & COLOR
  let mat = new THREE.PointsMaterial({
    vertexColors: true, // ?
    size: getRandomFloat(0.5, 1) //size of particle
  });

  let pointCount = data.unfiltered.length; //amount of all data points
  let pointGeo = new THREE.Geometry();

  // CUBE
  let cubeGeometry = new THREE.CubeGeometry(2, 8, 3);
  let cube;

  let sphereGroup = new THREE.Object3D();
  let sphereGeometry = new THREE.SphereGeometry(3, 20, 20);
  let sphere;

  // going through all data points - draw point, with color
  for (let i = 1; i < pointCount; i++) {
    let timeFactor = 0; //.00003;
    let x = xScale(data.lowPass[i].x + i * timeFactor);
    let y = yScale(data.lowPass[i].y + i * timeFactor);
    let z = zScale(data.lowPass[i].z + i * timeFactor);

    // let u = xScale(data.unfiltered[i - 1].x);
    // let v = yScale(data.unfiltered[i - 1].y);
    // let w = zScale(data.unfiltered[i - 1].z);

    let colorMap = mapValues(i, 1, pointCount, 0, 150);

    let cubeMaterial = new THREE.MeshLambertMaterial();
    cubeMaterial.color.setRGB((180 - colorMap) / 255, 100 / 255, 150 / 255);
    cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.x = x;
    cube.position.y = y;
    cube.position.z = z;

    cube.rotation.x = (Math.PI / 2) * (i % 2);
    scene.add(cube);

    let sphereMaterial = new THREE.MeshBasicMaterial();
    sphereMaterial.color.setRGB((180 - colorMap) / 255, 100 / 255, 150 / 255);
    let sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.x = x;
    sphere.position.y = y;
    sphere.position.z = z;

    sphereGroup.add(cube);

    // pointGeo.vertices.push(new THREE.Vector3(x, y, z), new THREE.Vector3(u, y, z)); // connecting lines
    pointGeo.vertices.push(new THREE.Vector3(x, y, z));
    console.log(pointCount);
    pointGeo.colors.push(
      new THREE.Color().setRGB((170 - colorMap) / 255, 50 / 255, 67 / 255) //Gradient from red to blue
    );
  }

  scene.add(sphereGroup);
  let points = new THREE.ParticleSystem(pointGeo, mat);
  //   scatterPlot.add(points);

  // LINE VERSION
  let lineMaterial = new THREE.LineBasicMaterial({
    color: 0x820000,
    lineWidth: 1
  });
  let lineData = new THREE.Line(pointGeo, lineMaterial);
  lineData.type = THREE.Lines;
  //   scatterPlot.add(lineData);

  // PARTICLE SIZE & COLOR II
  let secondMat = new THREE.PointsMaterial({
    vertexColors: true, // ?
    size: 1 //size of particle
  });
  // let pointCount = data.unfiltered.length; //number of all data points
  let secondPointGeo = new THREE.Geometry();
  for (let i = 0; i < pointCount; i++) {
    let x = xScale(data.unfiltered[i].x);
    let y = yScale(data.unfiltered[i].y);
    let z = zScale(data.unfiltered[i].z);

    secondPointGeo.vertices.push(new THREE.Vector3(x, z, y));
    let colorMap = mapValues(i, 1, pointCount, 0, 70);
    secondPointGeo.colors.push(
      new THREE.Color().setRGB(215 / 255, (150 - colorMap) / 255, 22 / 255) //Gradient from yellow to orange
    );
  }

  let secondPoints = new THREE.ParticleSystem(secondPointGeo, secondMat);
  scatterPlot.add(secondPoints);

  let ambientLight = new THREE.AmbientLight(0x414141);
  scene.add(ambientLight);

  let pointLight1 = new THREE.PointLight(0xff7f00, 0.6);
  pointLight1.position.set(0, 0, 0);
  scene.add(pointLight1);

  var spotLight1 = createSpotlight(0xff7f00);
  var spotLight2 = createSpotlight(0x00ff7f);
  var spotLight3 = createSpotlight(0x7f00ff);
  spotLight1.position.set(200, -100, 100);
  spotLight2.position.set(-200, 100, 0);
  spotLight3.position.set(100, 100, 200);
  scene.add(spotLight1, spotLight2, spotLight3);

  function createSpotlight(color) {
    var newObj = new THREE.SpotLight(color, 2);

    newObj.castShadow = true;
    newObj.angle = 0.3;
    newObj.penumbra = 0.5;
    newObj.decay = 2;
    newObj.distance = 400;

    return newObj;
  }

  // INTERACTION
  renderer.render(scene, camera);
  let paused = false;
  let last = new Date().getTime();
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
      let dist = Math.sqrt(sq(camera.position.x) + sq(camera.position.y) + sq(camera.position.z));

      scatterPlot.rotation.y += dx * 0.01;
      scatterPlot.rotation.x += dy * 0.01;
      sphereGroup.rotation.y += dx * 0.01;
      sphereGroup.rotation.x += dy * 0.01;
      cube1.rotation.y += dx * 0.01;
      cube1.rotation.x += dy * 0.01;

      sx += dx;
      sy += dy;
    }
  };
  let animating = false;
  window.ondblclick = function() {
    animating = !animating;
  };

  // for cube rotation
  let clock = new THREE.Clock();

  function animate(t) {
    if (!paused) {
      last = t;
      renderer.clear();
      camera.lookAt(scene.position);
      cube1.rotation.y -= clock.getDelta();
      renderer.render(scene, camera);
    }
    window.requestAnimationFrame(animate, renderer.domElement);
  }
  animate(new Date().getTime());

  onmessage = function(ev) {
    paused = ev.data == "pause";
  };
}
