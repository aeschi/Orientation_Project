function createTextCanvas(text, color, font, size) {
  size = size || 16;
  let canvas = document.createElement("canvas");
  let ctx = canvas.getContext("2d"); // 2D rendering
  let fontStr = size + "px " + (font || "Arial");
  ctx.font = fontStr;
  let w = ctx.measureText(text).width;
  let h = Math.ceil(size);
  canvas.width = w;
  canvas.height = h;
  ctx.font = fontStr;
  ctx.fillStyle = color || "black";
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

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// FILTER DATA?
function getPts(x) {
  //console.log(x)
  let unfiltered = [],
    lowPass = [],
    highPass = [];

  x.forEach(function(d, i) {
    let line = d.split(",");

    unfiltered[i] = {
      x: +line[0],
      y: +line[1],
      z: +line[2]
    };
    lowPass[i] = {
      x: +line[4],
      y: +line[5],
      z: +line[6]
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
let w = window.innerWidth * 0.9;
let h = window.innerHeight * 0.9;

renderer.setSize(w, h);
document.getElementById("container").appendChild(renderer.domElement);

// renderer.setClearColorHex(0xeeeeee, 1.0);

let camera = new THREE.PerspectiveCamera(45, w / h, 1, 10000);
camera.position.z = 200;
camera.position.x = -100;
camera.position.y = 100;

let scene = new THREE.Scene();

// let controls = new THREE.OrbitControls(camera, renderer.domElement); s
// controls = new TrackballControls(camera, renderer.domElement);
// controls.rotateSpeed = 1.0;
// controls.zoomSpeed = 1.2;
// controls.panSpeed = 0.8;
// controls.noZoom = false;
// controls.noPan = false;
// controls.staticMoving = true;
// controls.dynamicDampingFactor = 0.3;

// SCATTERPLOT
let scatterPlot = new THREE.Object3D();
scene.add(scatterPlot);

scatterPlot.rotation.y = 0;

function v(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

let format = d3.format("+.3f");

function scatter(data) {
  let temp = data.unfiltered;

  let xExent = d3.extent(temp, function(d) {
      return d.x;
    }),
    yExent = d3.extent(data.unfiltered, function(d) {
      return d.y;
    }),
    zExent = d3.extent(data.unfiltered, function(d) {
      return d.z;
    });

  let vpts = {
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

  let xScale = d3.scale
    .linear()
    .domain(xExent)
    .range([-50, 50]);
  let yScale = d3.scale
    .linear()
    .domain(yExent)
    .range([-50, 50]);
  let zScale = d3.scale
    .linear()
    .domain(zExent)
    .range([-50, 50]);

  // MESH around VIZ
  let lineGeo = new THREE.Geometry();
  lineGeo.vertices.push(
    v(xScale(vpts.xMin), yScale(vpts.yCen), zScale(vpts.zCen)),
    v(xScale(vpts.xMax), yScale(vpts.yCen), zScale(vpts.zCen)),
    v(xScale(vpts.xCen), yScale(vpts.yMin), zScale(vpts.zCen)),
    v(xScale(vpts.xCen), yScale(vpts.yMax), zScale(vpts.zCen)),
    v(xScale(vpts.xCen), yScale(vpts.yCen), zScale(vpts.zMax)),
    v(xScale(vpts.xCen), yScale(vpts.yCen), zScale(vpts.zMin)),

    v(xScale(vpts.xMin), yScale(vpts.yMax), zScale(vpts.zMin)),
    v(xScale(vpts.xMax), yScale(vpts.yMax), zScale(vpts.zMin)),
    v(xScale(vpts.xMin), yScale(vpts.yMin), zScale(vpts.zMin)),
    v(xScale(vpts.xMax), yScale(vpts.yMin), zScale(vpts.zMin)),
    v(xScale(vpts.xMin), yScale(vpts.yMax), zScale(vpts.zMax)),
    v(xScale(vpts.xMax), yScale(vpts.yMax), zScale(vpts.zMax)),
    v(xScale(vpts.xMin), yScale(vpts.yMin), zScale(vpts.zMax)),
    v(xScale(vpts.xMax), yScale(vpts.yMin), zScale(vpts.zMax)),

    v(xScale(vpts.xMin), yScale(vpts.yCen), zScale(vpts.zMax)),
    v(xScale(vpts.xMax), yScale(vpts.yCen), zScale(vpts.zMax)),
    v(xScale(vpts.xMin), yScale(vpts.yCen), zScale(vpts.zMin)),
    v(xScale(vpts.xMax), yScale(vpts.yCen), zScale(vpts.zMin)),
    v(xScale(vpts.xMin), yScale(vpts.yMax), zScale(vpts.zCen)),
    v(xScale(vpts.xMax), yScale(vpts.yMax), zScale(vpts.zCen)),
    v(xScale(vpts.xMin), yScale(vpts.yMin), zScale(vpts.zCen)),
    v(xScale(vpts.xMax), yScale(vpts.yMin), zScale(vpts.zCen)),

    v(xScale(vpts.xMax), yScale(vpts.yMin), zScale(vpts.zMin)),
    v(xScale(vpts.xMax), yScale(vpts.yMax), zScale(vpts.zMin)),
    v(xScale(vpts.xMin), yScale(vpts.yMin), zScale(vpts.zMin)),
    v(xScale(vpts.xMin), yScale(vpts.yMax), zScale(vpts.zMin)),
    v(xScale(vpts.xMax), yScale(vpts.yMin), zScale(vpts.zMax)),
    v(xScale(vpts.xMax), yScale(vpts.yMax), zScale(vpts.zMax)),
    v(xScale(vpts.xMin), yScale(vpts.yMin), zScale(vpts.zMax)),
    v(xScale(vpts.xMin), yScale(vpts.yMax), zScale(vpts.zMax)),

    v(xScale(vpts.xCen), yScale(vpts.yMin), zScale(vpts.zMax)),
    v(xScale(vpts.xCen), yScale(vpts.yMax), zScale(vpts.zMax)),
    v(xScale(vpts.xCen), yScale(vpts.yMin), zScale(vpts.zMin)),
    v(xScale(vpts.xCen), yScale(vpts.yMax), zScale(vpts.zMin)),
    v(xScale(vpts.xMax), yScale(vpts.yMin), zScale(vpts.zCen)),
    v(xScale(vpts.xMax), yScale(vpts.yMax), zScale(vpts.zCen)),
    v(xScale(vpts.xMin), yScale(vpts.yMin), zScale(vpts.zCen)),
    v(xScale(vpts.xMin), yScale(vpts.yMax), zScale(vpts.zCen)),

    v(xScale(vpts.xMax), yScale(vpts.yMax), zScale(vpts.zMin)),
    v(xScale(vpts.xMax), yScale(vpts.yMax), zScale(vpts.zMax)),
    v(xScale(vpts.xMax), yScale(vpts.yMin), zScale(vpts.zMin)),
    v(xScale(vpts.xMax), yScale(vpts.yMin), zScale(vpts.zMax)),
    v(xScale(vpts.xMin), yScale(vpts.yMax), zScale(vpts.zMin)),
    v(xScale(vpts.xMin), yScale(vpts.yMax), zScale(vpts.zMax)),
    v(xScale(vpts.xMin), yScale(vpts.yMin), zScale(vpts.zMin)),
    v(xScale(vpts.xMin), yScale(vpts.yMin), zScale(vpts.zMax)),

    v(xScale(vpts.xMin), yScale(vpts.yCen), zScale(vpts.zMin)),
    v(xScale(vpts.xMin), yScale(vpts.yCen), zScale(vpts.zMax)),
    v(xScale(vpts.xMax), yScale(vpts.yCen), zScale(vpts.zMin)),
    v(xScale(vpts.xMax), yScale(vpts.yCen), zScale(vpts.zMax)),
    v(xScale(vpts.xCen), yScale(vpts.yMax), zScale(vpts.zMin)),
    v(xScale(vpts.xCen), yScale(vpts.yMax), zScale(vpts.zMin)),
    v(xScale(vpts.xCen), yScale(vpts.yMin), zScale(vpts.zMin)),
    v(xScale(vpts.xCen), yScale(vpts.yMin), zScale(vpts.zMax))
  );

  let lineMat = new THREE.LineBasicMaterial({
    color: 0x3a3a3a,
    lineWidth: 1
  });
  let line = new THREE.Line(lineGeo, lineMat);
  line.type = THREE.Lines;
  // scatterPlot.add(line); // ADD mesh around scatterplot

  // PARTICLE SIZE & COLOR
  let mat = new THREE.PointsMaterial({
    vertexColors: true, // ?
    size: getRandomFloat(0.5, 1) //size of particle
  });
  let pointCount = data.unfiltered.length; //number of all data points
  let pointGeo = new THREE.Geometry();
  for (let i = 0; i < pointCount; i++) {
    let x = xScale(data.unfiltered[i].x);
    let y = yScale(data.unfiltered[i].y);
    let z = zScale(data.unfiltered[i].z);

    pointGeo.vertices.push(new THREE.Vector3(x, y, z));

    pointGeo.colors.push(
      new THREE.Color().setRGB((170 - i / 70) / 255, 50 / 255, 67 / 255) //Gradient from red to blue
    );
  }

  let points = new THREE.ParticleSystem(pointGeo, mat);
  scatterPlot.add(points);

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

    secondPointGeo.colors.push(
      new THREE.Color().setRGB(225 / 255, (170 - i / 100) / 255, 22 / 255) //Gradient from yellow to orange
      // new THREE.Color().setRGB((150 - i / 90) / 255, 50 / 255, 67 / 255) //Gradient from red to blue
    );
  }

  let secondPoints = new THREE.ParticleSystem(secondPointGeo, secondMat);
  scatterPlot.add(secondPoints);

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

      sx += dx;
      sy += dy;
    }
  };
  let animating = false;
  window.ondblclick = function() {
    animating = !animating;
  };

  function animate(t) {
    if (!paused) {
      last = t;
      renderer.clear();
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    }
    window.requestAnimationFrame(animate, renderer.domElement);
  }
  animate(new Date().getTime());
  onmessage = function(ev) {
    paused = ev.data == "pause";
  };
}
