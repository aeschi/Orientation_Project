// HELPER
function createTextCanvas(text, color, font, size) {
    size = size || 30;
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d'); // 2D rendering
    let fontStr = size + 'px ' + (font || 'Arial');
    ctx.font = fontStr;
    let w = ctx.measureText(text).width;
    let h = Math.ceil(size);
    canvas.width = w;
    canvas.height = h;
    ctx.font = fontStr;
    ctx.fillStyle = color || 'white';
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
        transparent: true,
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

function fractionate(val, minVal, maxVal) {
    return (val - minVal) / (maxVal - minVal);
}

function modulate(val, minVal, maxVal, outMin, outMax) {
    var fr = fractionate(val, minVal, maxVal);
    var delta = outMax - outMin;
    return outMin + fr * delta;
}

function avg(arr) {
    var total = arr.reduce(function (sum, b) {
        return sum + b;
    }, 0);
    return total / arr.length;
}

function max(arr) {
    return arr.reduce(function (a, b) {
        return Math.max(a, b);
    }, 0);
}

// THREE SETUP

let stats;
let gui;

// gui variables
let sound_vis = true;
let gravity_vis = true;
let acc_vis = true;
let sphereGroup;
let animateVisibility = false;
let params;
let dataSource;

let sphereMaterial;
let sphereTexture = [];

// Meshline
let strokeTexture;
let lineMat;
let lineColors;

var loader = new THREE.TextureLoader();
loader.load('assets/stroke.png', function (texture) {
    strokeTexture = texture;
});
loader.load('assets/water.jpg', function (texture) {
    sphereTexture[0] = texture;
});
loader.load('assets/griptape_polar.png', function (texture) {
    sphereTexture[1] = texture;
});
loader.load('assets/boulder_bw_small_sat.png', function (texture) {
    sphereTexture[2] = texture;
});

// INFO
// let info = document.createElement('div');
// info.setAttribute('style', 'white-space: pre;');
// info.style.position = 'absolute';
// info.style.bottom = '60px';
// info.style.width = '100%';
// info.style.textAlign = 'center';
// info.style.color = '#fff';
// info.style.fontWeight = 'bold';
// info.style.backgroundColor = 'transparent';
// info.style.zIndex = '1';
// info.style.fontFamily = 'Arial';
// info.innerHTML = 'Drag mouse to rotate camera';
// document.body.appendChild(info);

// renderer
let renderer = new THREE.WebGLRenderer({
    antialias: true,
});
let w = window.innerWidth;
let h = window.innerHeight;
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

// camera
let camera = new THREE.PerspectiveCamera(35, w / h, 1, 10000);
camera.position.set(0, 50, 250);

// orbit controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.minDistance = 10;
controls.maxDistance = 450;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.enableDamping = true;
controls.dampingFactor = 0.15;
controls.maxPolarAngle = (2 * Math.PI) / 3.5;
controls.zoomSpeed = 0.5;

// stats (fps)
stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

// scene
let scene = new THREE.Scene();
scene.background = new THREE.Color('#131313');
// scene.background = new THREE.Color( 0xe0e0e0 );
scene.fog = new THREE.FogExp2(scene.background, 0.002);

// dataviz
let scatterPlot = new THREE.Object3D();
scene.add(scatterPlot);

function vec(x, y, z) {
    return new THREE.Vector3(x, y, z);
}

var acceleration = [],
    motionYawRollPitch = [],
    gravity = [],
    quaternationData = [],
    skateAcceleration = [],
    skateMotionYawRollPitch = [],
    skateGravity = [],
    skateQuaternationData = [],
    boulderAcceleration = [],
    boulderMotionYawRollPitch = [],
    boulderGravity = [],
    boulderQuaternationData = [],
    swimAcceleration = [],
    swimMotionYawRollPitch = [],
    swimGravity = [],
    swimQuaternationData = [];

var temp;

var xExent, yExent, zExent;

var format = d3.format('+.3f');

d3.csv('data/skate_boulder_swim_labeled.csv', function (data) {
    var dataValues = d3.values(data)[0]; // top row of columns = names
    var columnNum = Object.keys(dataValues); // putting names into array
    console.log(Object.keys(dataValues));

    data.forEach(function (mydata, i) {
        // SKATE
        skateAcceleration[i] = {
            x: +mydata[columnNum[0]],
            y: +mydata[columnNum[1]],
            z: +mydata[columnNum[2]],
        };
        skateMotionYawRollPitch[i] = {
            x: +mydata[columnNum[3]],
            y: +mydata[columnNum[4]],
            z: +mydata[columnNum[5]],
        };
        skateGravity[i] = {
            x: +mydata[columnNum[10]],
            y: +mydata[columnNum[11]],
            z: +mydata[columnNum[12]],
        };
        skateQuaternationData[i] = {
            x: +mydata[columnNum[6]],
            y: +mydata[columnNum[7]],
            z: +mydata[columnNum[8]],
            w: +mydata[columnNum[9]],
        };
        // BOULDER
        boulderAcceleration[i] = {
            x: +mydata[columnNum[14]],
            y: +mydata[columnNum[15]],
            z: +mydata[columnNum[16]],
        };
        boulderMotionYawRollPitch[i] = {
            x: +mydata[columnNum[17]],
            y: +mydata[columnNum[18]],
            z: +mydata[columnNum[19]],
        };
        boulderGravity[i] = {
            x: +mydata[columnNum[24]],
            y: +mydata[columnNum[25]],
            z: +mydata[columnNum[26]],
        };
        boulderQuaternationData[i] = {
            x: +mydata[columnNum[20]],
            y: +mydata[columnNum[21]],
            z: +mydata[columnNum[22]],
            w: +mydata[columnNum[23]],
        };
        //SWIM
        swimAcceleration[i] = {
            x: +mydata[columnNum[28]],
            y: +mydata[columnNum[29]],
            z: +mydata[columnNum[30]],
        };
        swimMotionYawRollPitch[i] = {
            x: +mydata[columnNum[31]],
            y: +mydata[columnNum[32]],
            z: +mydata[columnNum[33]],
        };
        swimGravity[i] = {
            x: +mydata[columnNum[38]],
            y: +mydata[columnNum[39]],
            z: +mydata[columnNum[40]],
        };
        swimQuaternationData[i] = {
            x: +mydata[columnNum[34]],
            y: +mydata[columnNum[35]],
            z: +mydata[columnNum[36]],
            w: +mydata[columnNum[37]],
        };
    });
    temp = skateGravity;

    acceleration = skateAcceleration;
    motionYawRollPitch = skateMotionYawRollPitch;
    gravity = skateGravity;
    quaternationData = skateQuaternationData;

    // find extent (min & max values) of either x, y or z to use for scaling
    // d3.extent returns a two element array of the minimum and maximum values from the array.
    // https://benclinkinbeard.com/d3tips/utility-methods-with-d3-array/?utm_content=buffer90c0a&utm_medium=social&utm_source=twitter.com&utm_campaign=buffer

    var xExent = d3.extent(temp, function (d) {
            return d.x;
        }),
        yExent = d3.extent(temp, function (d) {
            return d.y;
        }),
        zExent = d3.extent(temp, function (d) {
            return d.z;
        });

    // console.log('Inside: ', gravity);
    // exportOutside(gravity);

    // SCALING IN d3 (distribution of points)
    // https://github.com/d3/d3-scale
    // http://www.jeromecukier.net/2011/08/11/d3-scales-and-color/
    // https://www.d3indepth.com/scales/
    // Simply put: scales transform a number in a certain interval (called the domain)
    // into a number in another interval (called the range).

    var xScale = d3.scale.linear().domain(xExent).range([-50, 50]);
    //array min & max of data set
    var yScale = d3.scale.linear().domain(yExent).range([-50, 50]);
    var zScale = d3.scale.linear().domain(zExent).range([-50, 50]);

    //  ---- ADDING VIZ ELEMENTS ----

    // FLOOR PLANE
    function createFloor() {
        let mesh = new THREE.Mesh(
            new THREE.PlaneBufferGeometry(2000, 2000),
            new THREE.MeshPhongMaterial({ color: '#656565', depthWrite: false })
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = -100;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }
    createFloor();

    // AUDIO
    let analyser;
    let dataArrayOld;
    let audioData = [];
    let stream = 'data/skaten/ROMAN_03_edit_garage.mp3';
    //https://codepen.io/EllenProbst/pen/RQQmJK?editors=0010 //code source

    // AUDIO file
    window.onload = function () {
        let context = listener.context;
    };
    // One-liner to resume playback when user interacted with the page.
    document.querySelector('button').addEventListener('click', function () {
        context.resume().then(() => {
            console.log('Playback resumed successfully');
        });
    });

    var fftSize = 512;
    var audioLoader = new THREE.AudioLoader();
    var listener = new THREE.AudioListener();
    var audio = new THREE.Audio(listener);
    audio.crossOrigin = 'anonymous';
    audioLoader.load(stream, function (buffer) {
        audio.setBuffer(buffer);
        audio.setLoop(true);
        audio.play();
    });

    analyser = new THREE.AudioAnalyser(audio, fftSize);

    analyser.analyser.maxDecibels = -3;
    analyser.analyser.minDecibels = -100;
    dataArrayOld = analyser.data;
    var bufferLength = analyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);

    function getAudioData(data) {
        // Split array into 3
        var frequencyArray = splitFrenquencyArray(data, 3);

        // Make average of frenquency array entries
        for (var i = 0; i < frequencyArray.length; i++) {
            var average = 0;

            for (var j = 0; j < frequencyArray[i].length; j++) {
                average += frequencyArray[i][j];
            }
            audioData[i] = average / frequencyArray[i].length;
        }
        return audioData;
    }

    function splitFrenquencyArray(arr, n) {
        var tab = Object.keys(arr).map(function (key) {
            return arr[key];
        });
        var len = tab.length,
            result = [],
            i = 0;

        while (i < len) {
            var size = Math.ceil((len - i) / n--);
            result.push(tab.slice(i, i + size));
            i += size;
        }

        return result;
    }

    // AUDIO VIZ
    let simplexNoise = new SimplexNoise();
    function makeRoughBall(mesh, bassFr, treFr) {
        mesh.geometry.vertices.forEach(function (vertex, i) {
            var offset = mesh.geometry.parameters.radius;
            var amp = 7;
            var time = window.performance.now();
            vertex.normalize();
            var distance =
                offset +
                bassFr +
                simplexNoise.noise3D(vertex.x + time * 0.00007, vertex.y + time * 0.00008, vertex.z + time * 0.00009) * amp * treFr;
            vertex.multiplyScalar(distance);
        });
        mesh.geometry.verticesNeedUpdate = true;
        mesh.geometry.normalsNeedUpdate = true;
        mesh.geometry.computeVertexNormals();
        mesh.geometry.computeFaceNormals();
    }

    let icosahedronGeometry = new THREE.IcosahedronGeometry(10, 4);
    let lambertMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        wireframe: true,
    });

    let ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    ball.position.set(0, 0, 0);
    ball.castShadow = true;

    scene.add(ball);

    // SPHERE NOISE SHAPE
    function createSphereNoise() {
        let sphere_geometry = new THREE.SphereGeometry(1, 50, 50);
        // let material = new THREE.MeshLambertMaterial({ color: '#FFB742' });

        sphereMaterial = new THREE.MeshPhongMaterial({
            map: sphereTexture[2],
            specular: 0xc0c0c,
            shininess: 70,
        });
        let updateNoise = function () {
            let time = 0; //performance.now() * 0.0005;
            let k = 2;
            for (let i = 0; i < sphereNoise.geometry.faces.length; i++) {
                let uv = sphereNoise.geometry.faceVertexUvs[0][i]; //faceVertexUvs is a huge arrayed stored inside of another array
                let f = sphereNoise.geometry.faces[i];
                let p = sphereNoise.geometry.vertices[f.a]; //take the first vertex from each face
                p.normalize().multiplyScalar(1 + 0.3 * noise.perlin3(p.x * k + time, p.y * k, p.z * k + time));
            }
            sphereNoise.geometry.verticesNeedUpdate = true; //must be set or vertices will not update
            sphereNoise.geometry.computeVertexNormals();
            sphereNoise.geometry.normalsNeedUpdate = true;
        };

        let sphereGroup = new THREE.Object3D();
        for (let i = 1; i < gravity.length; i += 3) {
            let scaling = 1.5;
            let x = xScale(gravity[i].x) / scaling;
            let y = yScale(gravity[i].y) / scaling;
            let z = zScale(gravity[i].z) / scaling;

            var sphereNoise = new THREE.Mesh(sphere_geometry, sphereMaterial);
            sphereNoise.position.x = -x; // UNTERSCHIEDLICHE SPHERE GRÖßEN!!!
            sphereNoise.position.y = y;
            sphereNoise.position.z = z;
            sphereNoise.rotation.x = (Math.PI / 6) * (i % 4);
            sphereNoise.castShadow = true;
            scene.add(sphereNoise);
            sphereGroup.add(sphereNoise);
        }
        updateNoise();
        scene.add(sphereGroup);
    }

    // POINTCLOUD WHITE
    let pointCloud;
    function createPointCloud() {
        let pointCloudMat = new THREE.PointsMaterial({
            color: 0xffffff,
            // vertexColors: true,
            size: 0.5,
        });

        let pointCloudGeo = new THREE.Geometry();
        for (let i = 0; i < acceleration.length; i++) {
            let x = xScale(acceleration[i].x);
            let y = yScale(acceleration[i].y);
            let z = zScale(acceleration[i].z);
            pointCloudGeo.vertices.push(new THREE.Vector3(x, z, y));

            // Colormap Pointcloud
            // let colorMap = mapValues(i, 1, acceleration.length, 0, 70);
            // pointCloudGeo.colors.push(new THREE.Color().setRGB((170 - colorMap) / 255, 50 / 255, 67 / 255));
        }
        pointCloud = new THREE.Points(pointCloudGeo, pointCloudMat);
        scatterPlot.add(pointCloud);
    }

    // KEYFRAME ANIMATION
    function createKFA() {
        // create a keyframe track (i.e. a timed sequence of keyframes) for each animated property
        // Note: the keyframe track type should correspond to the type of the property being animated
        let stepSize = Math.floor(quaternationData.length / 15);

        // POSITION - VectorKeyframeTrack( name : String, times : Array, values : Array )
        let positionKF = new THREE.VectorKeyframeTrack('.position', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
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
        ];

        // SCALE
        let scaleKF = new THREE.VectorKeyframeTrack(
            '.scale',
            [0, 1, 2, 3],
            [0, 0, 0, 0.7, 0.7, 0.7, 1, 1, 1, 0, 0, 0],
            THREE.InterpolateSmooth
        );
        scaleKF.scale(5);
        // ROTATION
        // Rotation should be performed using quaternions, using a THREE.QuaternionKeyframeTrack
        // Interpolating Euler angles (.rotation property) can be problematic and is currently not supported
        // set up rotation about x axis
        let xAxis = new THREE.Vector3(1, 0, 0);

        let qInitial = new THREE.Quaternion().setFromAxisAngle(xAxis, 0);
        let qFinal = new THREE.Quaternion().setFromAxisAngle(xAxis, Math.PI);
        let quaternionKF = new THREE.QuaternionKeyframeTrack('.quaternion', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
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
        ];

        // create an animation sequence with the tracks
        let clip = new THREE.AnimationClip('Action', 17, [scaleKF]); // AnimationClip( name : String, duration : Number, tracks : Array )
        mixer = new THREE.AnimationMixer(pointCloud); // setup the THREE.AnimationMixer
        let clipAction = mixer.clipAction(clip); // create a ClipAction and set it to play

        clipAction.play();
    }

    // MESH LINE
    let lineMesh;
    function createMeshline() {
        let lineGeometry = new THREE.Geometry();

        for (let i = 1; i < acceleration.length; i += 5) {
            // if (i % 11 == 0) {
            //     let x = 0;
            //     let y = 0;
            //     let z = 0;
            //     var v = vec(x, y, z);
            // } else {
            let x = xScale(acceleration[i].x) / 2.5;
            let y = yScale(acceleration[i].y) / 2.5;
            let z = zScale(acceleration[i].z) / 2.5;
            var v = vec(x, y, z);
            // }
            lineGeometry.vertices.push(v);
        }

        lineColors = [0x45818e, 0xff8336, 0x6aa84f];

        let line = new MeshLine();
        line.setGeometry(lineGeometry, function (p) {
            return 2 + Math.sin(50 * p);
        });

        lineMat = new MeshLineMaterial({
            map: strokeTexture,
            useMap: 1,
            color: new THREE.Color(lineColors[1]),
            lineWidth: 0.4,
            near: 1,
            far: 100000,
            opacity: 0.9,
            // dashArray: new THREE.Vector2(10, 5),
            blending: THREE.NormalBlending,
            transparent: true,
        });

        lineMesh = new THREE.Mesh(line.geometry, lineMat);

        // lineMesh.castShadow = true;
        // lineMesh.customDepthMaterial = lineMat;
        scene.add(lineMesh);
    }

    // LIGHT
    function lighting() {
        let ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        let pointLight1 = new THREE.PointLight(0xff7f00, 0.8);
        pointLight1.position.set(0, 0, 0);
        pointLight1.castShadow = true;
        pointLight1.shadow.mapSize.width = 1024;
        pointLight1.shadow.mapSize.height = 1024;
        pointLight1.shadow.camera.near = 1;
        pointLight1.shadow.camera.far = 400;
        // scene.add(pointLight1);

        spotLight1 = new THREE.SpotLight(0xffffff, 1.3);
        spotLight1.position.set(50, 100, 80);
        spotLight1.angle = Math.PI / 8;
        spotLight1.penumbra = 0.2;
        spotLight1.decay = 1.5;
        spotLight1.distance = 500;
        spotLight1.castShadow = true;
        spotLight1.shadow.mapSize.width = 1024;
        spotLight1.shadow.mapSize.height = 1024;
        spotLight1.shadow.camera.near = 10;
        spotLight1.shadow.camera.far = 200;
        scene.add(spotLight1);

        spotLight2 = new THREE.SpotLight(0x5dd1fb, 0.8);
        spotLight2.position.set(-50, 10, 0);
        spotLight2.angle = Math.PI / 4;
        spotLight2.penumbra = 0.05;
        spotLight2.decay = 1.5;
        spotLight2.distance = 300;
        spotLight2.castShadow = true;
        spotLight2.shadow.mapSize.width = 1024;
        spotLight2.shadow.mapSize.height = 1024;
        spotLight2.shadow.camera.near = 10;
        spotLight2.shadow.camera.far = 200;
        scene.add(spotLight2);

        spotLight3 = new THREE.PointLight(0xff8336, 1);
        spotLight3.position.set(0, 0, 0);
        // spotLight3.angle = Math.PI / 3;
        spotLight3.penumbra = 0.05;
        spotLight3.decay = 1.5;
        spotLight3.distance = 300;
        spotLight3.castShadow = true;
        spotLight3.shadow.mapSize.width = 1024;
        spotLight3.shadow.mapSize.height = 1024;
        spotLight3.shadow.camera.near = 10;
        spotLight3.shadow.camera.far = 400;
        scene.add(spotLight3);

        //   // HELPER GRID FOR LIGHTS/CAMERA
        // lightHelper1 = new THREE.SpotLightHelper(spotLight1);
        // scene.add(lightHelper1);

        // lightHelper2 = new THREE.SpotLightHelper(spotLight2);
        // scene.add(lightHelper2);

        // lightHelper3 = new THREE.SpotLightHelper(spotLight3);
        // scene.add(lightHelper3);
    }

    function onWindowResize() {
        let newWidth = window.innerWidth;
        let newHeight = window.innerHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    }
    window.addEventListener('resize', onWindowResize, false);

    function animate(time) {
        // get audio data
        // analyser.getFrequencyData(dataArrayOld);
        // analyser.getFrequencyData(dataArray);
        getAudioData(dataArrayOld);

        if (audioData[0] >= 1) {
            //     planetBig.rotation.z += 0.005;
            //     planetSmall.scale.y = planetSmall.scale.x = planetSmall.scale.z = 5 + audioData[0] / 20;
            //     planetMedium.scale.y = planetMedium.scale.x = planetMedium.scale.z = 5 + audioData[0] / 20;
            makeRoughBall(ball, (0.5 * audioData[0]) / 40, (0.7 * audioData[0]) / 40);
            // ball.scale.y = ball.scale.x = ball.scale.z = audioData[0] / 40;
        }
        renderer.clear();
        window.requestAnimationFrame(animate, renderer.domElement);
        // controls.update();
        lineMesh.material.uniforms.visibility.value = animateVisibility ? (time / 25000) % 1.0 : 1.0;
        render();
    }

    let clock = new THREE.Clock();
    function render() {
        analyser.getFrequencyData();

        // scatterplot & line animation
        let delta = clock.getDelta();
        if (mixer && animateVisibility) {
            mixer.update(delta);
        }
        if (acc_vis) {
            pointCloud.visible = true;
        } else if (acc_vis == false) {
            pointCloud.visible = false;
            lineMesh.material.uniforms.visibility.value = 0;
        }

        if (sound_vis) {
            ball.visible = true;
        } else if (sound_vis == false) {
            ball.visible = false;
        }

        if (gravity_vis) {
            // sphereGroup.visible = true;
        } else if (gravity_vis == false) {
            sphereGroup.children.forEach((child) => (child.visible = false));
        }

        // change LineColor & sphereTexture with sport
        if (params.dataSource == 'swimming') {
            lineMat.color = new THREE.Color(lineColors[0]);
            sphereMaterial.map = sphereTexture[0];
            acceleration = swimAcceleration;
            motionYawRollPitch = swimMotionYawRollPitch;
            gravity = swimGravity;
            quaternationData = swimQuaternationData;
            // drawVisuals();
        } else if (params.dataSource == 'skating') {
            lineMat.color = new THREE.Color(lineColors[1]);
            sphereMaterial.map = sphereTexture[1];
            acceleration = skateAcceleration;
            motionYawRollPitch = skateMotionYawRollPitch;
            gravity = skateGravity;
            quaternationData = skateQuaternationData;
            // drawVisuals();
        } else if (params.dataSource == 'bouldering') {
            lineMat.color = new THREE.Color(lineColors[2]);
            sphereMaterial.map = sphereTexture[2];
            acceleration = boulderAcceleration;
            motionYawRollPitch = boulderMotionYawRollPitch;
            gravity = boulderGravity;
            quaternationData = boulderQuaternationData;
            // drawVisuals();
        }

        // camera.lookAt(scene.position);
        renderer.render(scene, camera);
        stats.update();
    }

    function buildGui() {
        gui = new dat.GUI();
        gui.domElement.id = 'gui';

        params = new Params();

        let dataInput = gui.addFolder('Choose Sport');
        dataInput.add(params, 'dataSource', ['bouldering', 'skating', 'swimming']);

        dataInput.open();

        let dataSrc = gui.addFolder('Data Sources');
        dataSrc.add(params, 'gravity');
        dataSrc.add(params, 'sound');
        dataSrc.add(params, 'acceleration');
        dataSrc.add(params, 'animate_acc').name('animate acceleration');
        dataSrc.open();

        gui.open();
    }

    function Params() {
        this.dataSource = 'skating';
        this.acceleration = function () {
            if (acc_vis) {
                acc_vis = false;
            } else {
                acc_vis = true;
            }
        };
        this.animate_acc = function () {
            if (animateVisibility) {
                animateVisibility = false;
            } else {
                lineMesh.material.uniforms.visibility.value = 0;
                animateVisibility = true;
            }
        };
        this.gravity = function () {
            if (gravity_vis) {
                gravity_vis = false;
            } else {
                gravity_vis = true;
            }
        };
        this.sound = function () {
            if (sound_vis) {
                sound_vis = false;
            } else {
                sound_vis = true;
            }
        };
    }

    lighting();
    buildGui();
    // function drawVisuals() {
    createMeshline();
    createSphereNoise();
    createPointCloud();
    createKFA();
    // }
    // drawVisuals();
    animate();
});
