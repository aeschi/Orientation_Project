// ---- HELPER FUNCTIONS ----
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

function vec(x, y, z) {
    return new THREE.Vector3(x, y, z);
}

// ---- VARIABLES ----
// GUI VAR
let gui;
let sound_vis = false;
let info_vis = false;
let gravity_vis = true;
let acc_vis = true;
let animateVisibility = false;
let params;
let dataSource;
let changedInput = false;
let changedVisibility = false;

// SPHERE VAR
let sphereGroup;
let sphereMaterial;
let sphereTexture = [];

// AUDIO VAR
let audioFile = [];

// MESHLNE VAR
let strokeTexture;
let swimLineMat;
let swimLineColors;
let skateLineMat;
let skateLineColors;
let boulderLineMat;
let boulderLineColors;

// ---- LOAD TEXTURES ----
var loader = new THREE.TextureLoader();
loader.load('data/textures/stroke.png', function (texture) {
    strokeTexture = texture;
});
loader.load('data/textures/water.jpg', function (texture) {
    sphereTexture[0] = texture;
});
loader.load('data/textures/griptape_polar.png', function (texture) {
    sphereTexture[1] = texture;
});
loader.load('data/textures/boulder_bw_small_sat.png', function (texture) {
    sphereTexture[2] = texture;
});

// ---- RENDERER ----
let renderer = new THREE.WebGLRenderer({
    preserveDrawingBuffer: true,
    antialias: true,
});
let w = window.innerWidth;
let h = window.innerHeight;
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap

// ---- CAMERA ----
let camera = new THREE.PerspectiveCamera(35, w / h, 1, 10000);
camera.position.set(0, 50, 250);

// ---- ORBIT CONTROLS ----
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.minDistance = 10;
controls.maxDistance = 450;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;
controls.enableDamping = true;
controls.dampingFactor = 0.15;
controls.maxPolarAngle = (2 * Math.PI) / 3.5;
controls.zoomSpeed = 0.5;

// ---- STATS (fps) ----
let stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
document.body.appendChild(stats.dom);

// ---- SCENE ----
let scene = new THREE.Scene();
scene.background = new THREE.Color('#131313'); // dunkel
// scene.background = new THREE.Color(0xe0e0e0); //hell
scene.fog = new THREE.FogExp2(scene.background, 0.002);

// ---- DATA ----
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

var format = d3.format('+.3f');

d3.csv('data/skate_boulder_swim_labeled.csv', function (data) {
    var dataValues = d3.values(data)[0]; // top row of columns = names
    var columnNum = Object.keys(dataValues); // putting names into array
    // console.log(Object.keys(dataValues));

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

    var tempSkate = boulderGravity;
    var tempSwim = swimGravity;
    var tempBoulder = boulderGravity;

    // find extent (min & max values) of either x, y or z to use for scaling
    // d3.extent returns a two element array of the minimum and maximum values from the array.
    // https://benclinkinbeard.com/d3tips/utility-methods-with-d3-array/?utm_content=buffer90c0a&utm_medium=social&utm_source=twitter.com&utm_campaign=buffer

    var xExentSkate = d3.extent(tempSkate, function (d) {
            return d.x;
        }),
        yExentSkate = d3.extent(tempSkate, function (d) {
            return d.y;
        }),
        zExentSkate = d3.extent(tempSkate, function (d) {
            return d.z;
        });

    var xExentSwim = d3.extent(tempSwim, function (d) {
            return d.x;
        }),
        yExentSwim = d3.extent(tempSwim, function (d) {
            return d.y;
        }),
        zExentSwim = d3.extent(tempSwim, function (d) {
            return d.z;
        });

    var xExentBoulder = d3.extent(tempBoulder, function (d) {
            return d.x;
        }),
        yExentBoulder = d3.extent(tempBoulder, function (d) {
            return d.y;
        }),
        zExentBoulder = d3.extent(tempBoulder, function (d) {
            return d.z;
        });

    // SCALING IN d3 (distribution of points)
    // https://github.com/d3/d3-scale
    // https://www.d3indepth.com/scales/
    // scales transform a number in a certain interval (called the domain)
    // into a number in another interval (called the range).

    // min & max numbers of data set
    var xScaleSkate = d3.scale.linear().domain(xExentSkate).range([-50, 50]);
    var yScaleSkate = d3.scale.linear().domain(yExentSkate).range([-50, 50]);
    var zScaleSkate = d3.scale.linear().domain(zExentSkate).range([-50, 50]);

    var xScaleSwim = d3.scale.linear().domain(xExentSwim).range([-50, 50]);
    var yScaleSwim = d3.scale.linear().domain(yExentSwim).range([-50, 50]);
    var zScaleSwim = d3.scale.linear().domain(zExentSwim).range([-50, 50]);

    var xScaleBoulder = d3.scale.linear().domain(xExentBoulder).range([-50, 50]);
    var yScaleBoulder = d3.scale.linear().domain(yExentBoulder).range([-50, 50]);
    var zScaleBoulder = d3.scale.linear().domain(zExentBoulder).range([-50, 50]);

    //  ---- ADDING VIZ ELEMENTS ----

    // ---- FLOOR PLANE ----
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

    // ---- AUDIO ANLAYSER ----
    // based on https://medium.com/@mag_ops/music-visualiser-with-three-js-web-audio-api-b30175e7b5ba
    // and https://codepen.io/EllenProbst/pen/RQQmJK?editors=0010

    let analyser;
    let dataArray;
    audioFile[0] = 'data/skaten/ROMAN_03_edit_garage.mp3';
    audioFile[1] = 'data/swimming/GRANULAR_TEST3.wav';
    audioFile[2] = 'data/bouldern/VIVI_04_edit_louder.mp3';
    let stream = audioFile[0];

    // AUDIO file
    var fftSize = 512;
    var audioLoader = new THREE.AudioLoader();
    var listener = new THREE.AudioListener();
    var audio = new THREE.Audio(listener);
    audio.crossOrigin = 'anonymous';
    let context;

    window.onload = function () {
        context = listener.context;
    };
    // One-liner to resume playback when user interacted with the page.
    document.querySelector('button').addEventListener(
        'click',
        function () {
            context.resume().then(() => {
                console.log('Playback resumed successfully');
            });
        },
        false
    );

    function loadAudio() {
        audioLoader.load(stream, function (buffer) {
            audio.setBuffer(buffer);
            audio.setLoop(true);
            audio.play();
        });
    }
    loadAudio();

    analyser = new THREE.AudioAnalyser(audio, fftSize);
    analyser.analyser.maxDecibels = 0;
    analyser.analyser.minDecibels = -140;
    dataArray = analyser.data;

    function soundAnimation() {
        var lowerHalfArray = dataArray.slice(0, dataArray.length / 2 - 1);
        var upperHalfArray = dataArray.slice(dataArray.length / 2 - 1, dataArray.length - 1);

        var overallAvg = avg(dataArray);
        var lowerMax = max(lowerHalfArray);
        var lowerAvg = avg(lowerHalfArray);
        var upperMax = max(upperHalfArray);
        var upperAvg = avg(upperHalfArray);

        var lowerMaxFr = lowerMax / lowerHalfArray.length;
        var lowerAvgFr = lowerAvg / lowerHalfArray.length;
        var upperMaxFr = upperMax / upperHalfArray.length;
        var upperAvgFr = upperAvg / upperHalfArray.length;

        makeRoughBall(ball, modulate(Math.pow(lowerMaxFr, 0.8), 0, 1, 0, 4), modulate(upperAvgFr, 0, 1, 0, 8));

        // function modulate(val, minVal, maxVal, outMin, outMax) {
        //     var fr = fractionate(val, minVal, maxVal);
        //     var delta = outMax - outMin;
        //     return outMin + fr * delta;
        // }
    }

    // ---- AUDIO VISUALS ----

    // Distort Mesh Ball
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

    // creating Mesh Ball
    let icosahedronGeometry = new THREE.IcosahedronGeometry(10, 4);
    let lambertMaterial = new THREE.MeshLambertMaterial({
        color: 0xffffff,
        wireframe: true,
    });

    let ball = new THREE.Mesh(icosahedronGeometry, lambertMaterial);
    ball.position.set(0, 0, 0);
    ball.castShadow = true;
    scene.add(ball);

    // ---- SWIM VISUALS ----
    let swimLineMesh;
    let swimPointCloud;
    let swimSphereGroup = new THREE.Object3D();
    let swimScatterPlot = new THREE.Object3D();
    function swimVisuals() {
        function createSwimSphereNoise() {
            let swimSphereGeometry = new THREE.SphereGeometry(1, 50, 50);

            swimSphereMaterial = new THREE.MeshPhongMaterial({
                map: sphereTexture[0],
                specular: 0xc0c0c,
                shininess: 70,
            });

            let updateNoise = function () {
                let time = 0;
                let k = 2;
                for (let i = 0; i < swimSphereNoise.geometry.faces.length; i++) {
                    let uv = swimSphereNoise.geometry.faceVertexUvs[0][i]; //faceVertexUvs is a huge arrayed stored inside of another array
                    let f = swimSphereNoise.geometry.faces[i];
                    let p = swimSphereNoise.geometry.vertices[f.a]; //take the first vertex from each face
                    p.normalize().multiplyScalar(1 + 0.3 * noise.perlin3(p.x * k + time, p.y * k, p.z * k + time));
                }
                swimSphereNoise.geometry.verticesNeedUpdate = true; //must be set or vertices will not update
                swimSphereNoise.geometry.computeVertexNormals();
                swimSphereNoise.geometry.normalsNeedUpdate = true;
            };

            let swimCounter = 0;
            // console.log('swim length: ', swimGravity.length);

            for (let i = 1; i < swimGravity.length; i += 1) {
                let swimPos = vec(swimGravity[i].x, swimGravity[i].y, swimGravity[i].z);
                let previousSwimPos = vec(swimGravity[i - 1].x, swimGravity[i - 1].y, swimGravity[i - 1].z);

                // console.log(swimPos.distanceTo(previousSwimPos));
                if (swimPos.distanceTo(previousSwimPos) > 0.003) {
                    let scaling = 1.3;
                    let x = xScaleSwim(swimGravity[i].x) / scaling;
                    let y = yScaleSwim(swimGravity[i].y) / scaling;
                    let z = zScaleSwim(swimGravity[i].z) / scaling;

                    var swimSphereNoise = new THREE.Mesh(swimSphereGeometry, swimSphereMaterial);
                    swimSphereNoise.position.x = -x; // UNTERSCHIEDLICHE SPHERE GRÖßEN!!!
                    swimSphereNoise.position.y = y;
                    swimSphereNoise.position.z = z;
                    swimSphereNoise.rotation.x = (Math.PI / 6) * (i % 4);
                    swimSphereNoise.castShadow = true;
                    // scene.add(swimSphereNoise);
                    swimSphereGroup.add(swimSphereNoise);
                    swimCounter++;
                }
            }
            // console.log('swimcounter: ', swimCounter);
            updateNoise();
            scene.add(swimSphereGroup);
        }

        function createSwimMeshline() {
            let swimLineGeometry = new THREE.Geometry();

            for (let i = 1; i < swimAcceleration.length; i += 15) {
                const scaling = 2.5;
                let x = xScaleSwim(swimAcceleration[i].x) / scaling;
                let y = yScaleSwim(swimAcceleration[i].y) / scaling - 20;
                let z = zScaleSwim(swimAcceleration[i].z) / scaling;
                var v = vec(x, y, z);

                swimLineGeometry.vertices.push(v);
            }

            let swimLine = new MeshLine();
            swimLine.setGeometry(swimLineGeometry, function (p) {
                return 2 + Math.sin(50 * p);
            });

            swimLineMat = new MeshLineMaterial({
                map: strokeTexture,
                useMap: 1,
                color: new THREE.Color(0x45818e),
                lineWidth: 0.4,
                near: 1,
                far: 100000,
                opacity: 0.9,
                // dashArray: new THREE.Vector2(10, 5),
                blending: THREE.NormalBlending,
                transparent: true,
            });

            swimLineMesh = new THREE.Mesh(swimLine.geometry, swimLineMat);
            scene.add(swimLineMesh);
        }

        function createSwimPointCloud() {
            let swimPointCloudMat = new THREE.PointsMaterial({
                color: 0xffffff,
                // vertexColors: true,
                size: 0.5,
            });

            let swimPointCloudGeo = new THREE.Geometry();
            for (let i = 0; i < swimAcceleration.length; i++) {
                let x = xScaleSwim(swimAcceleration[i].x);
                let y = yScaleSwim(swimAcceleration[i].y);
                let z = zScaleSwim(swimAcceleration[i].z);
                swimPointCloudGeo.vertices.push(new THREE.Vector3(x, z, y));
            }
            swimPointCloud = new THREE.Points(swimPointCloudGeo, swimPointCloudMat);
            swimScatterPlot.add(swimPointCloud);
            scene.add(swimScatterPlot);
        }

        function createSwimKFA() {
            // SCALE
            let swimScaleKF = new THREE.VectorKeyframeTrack(
                '.scale',
                [0, 1, 2, 3],
                [0, 0, 0, 0.7, 0.7, 0.7, 1, 1, 1, 0, 0, 0],
                THREE.InterpolateSmooth
            );
            swimScaleKF.scale(5);

            let swimClip = new THREE.AnimationClip('Action', 17, [swimScaleKF]); // AnimationClip( name : String, duration : Number, tracks : Array )
            mixer = new THREE.AnimationMixer(swimPointCloud); // setup the THREE.AnimationMixer
            let clipAction = mixer.clipAction(swimClip); // create a ClipAction and set it to play
            clipAction.play();
        }

        createSwimMeshline();
        createSwimPointCloud();
        createSwimKFA();
        createSwimSphereNoise();
    }

    // ---- SKATE VISUALS ----
    let skateLineMesh;
    let skatePointCloud;
    let skateSphereGroup = new THREE.Object3D();
    let skateScatterPlot = new THREE.Object3D();
    function skateVisuals() {
        function createSkateSphereNoise() {
            let skateSphereGeometry = new THREE.SphereGeometry(1.5, 50, 50);

            skateSphereMaterial = new THREE.MeshPhongMaterial({
                map: sphereTexture[1],
                specular: 0xc0c0c,
                shininess: 70,
            });

            let updateNoise = function () {
                let time = 0;
                let k = 2;
                for (let i = 0; i < skateSphereNoise.geometry.faces.length; i++) {
                    let uv = skateSphereNoise.geometry.faceVertexUvs[0][i]; //faceVertexUvs is a huge arrayed stored inside of another array
                    let f = skateSphereNoise.geometry.faces[i];
                    let p = skateSphereNoise.geometry.vertices[f.a]; //take the first vertex from each face
                    p.normalize().multiplyScalar(1.5 + 0.8 * noise.perlin3(p.x * k + time, p.y * k, p.z * k + time));
                }
                skateSphereNoise.geometry.verticesNeedUpdate = true; //must be set or vertices will not update
                skateSphereNoise.geometry.computeVertexNormals();
                skateSphereNoise.geometry.normalsNeedUpdate = true;
            };

            let counterSkateBalls = 0;
            for (let i = 1; i < skateGravity.length; i += 1) {
                let skatePos = vec(skateGravity[i].x, skateGravity[i].y, skateGravity[i].z);
                let previousSkatePos = vec(skateGravity[i - 1].x, skateGravity[i - 1].y, skateGravity[i - 1].z);

                if (skatePos.distanceTo(previousSkatePos) > 0.1) {
                    let scaling = 1.3;
                    let x = xScaleSkate(skateGravity[i].x) / scaling;
                    let y = yScaleSkate(skateGravity[i].y) / scaling;
                    let z = zScaleSkate(skateGravity[i].z) / scaling;

                    var skateSphereNoise = new THREE.Mesh(skateSphereGeometry, skateSphereMaterial);
                    skateSphereNoise.position.x = -x; // UNTERSCHIEDLICHE SPHERE GRÖßEN!!!
                    skateSphereNoise.position.y = y;
                    skateSphereNoise.position.z = z;
                    skateSphereNoise.rotation.x = (Math.PI / 6) * (i % 4);
                    skateSphereNoise.castShadow = true;
                    // scene.add(skateSphereNoise);
                    skateSphereGroup.add(skateSphereNoise);
                    counterSkateBalls++;
                }
            }
            // console.log('counterSkateBalls: ', counterSkateBalls);
            updateNoise();
            scene.add(skateSphereGroup);
        }

        function createSkateMeshline() {
            let skateLineGeometry = new THREE.Geometry();

            for (let i = 1; i < skateAcceleration.length; i += 5) {
                let x = xScaleSkate(skateAcceleration[i].x) / 2.5;
                let y = yScaleSkate(skateAcceleration[i].y) / 2.5;
                let z = zScaleSkate(skateAcceleration[i].z) / 2.5;
                var v = vec(x, y, z);

                skateLineGeometry.vertices.push(v);
            }

            let skateLine = new MeshLine();
            skateLine.setGeometry(skateLineGeometry, function (p) {
                return 2 + Math.sin(50 * p);
            });

            skateLineMat = new MeshLineMaterial({
                map: strokeTexture,
                useMap: 1,
                color: new THREE.Color(0xff8336),
                lineWidth: 0.4,
                near: 1,
                far: 100000,
                opacity: 0.9,
                // dashArray: new THREE.Vector2(10, 5),
                blending: THREE.NormalBlending,
                transparent: true,
            });

            skateLineMesh = new THREE.Mesh(skateLine.geometry, skateLineMat);
            scene.add(skateLineMesh);
        }

        function createSkatePointCloud() {
            let skatePointCloudMat = new THREE.PointsMaterial({
                color: 0xffffff,
                // vertexColors: true,
                size: 0.5,
            });

            let skatePointCloudGeo = new THREE.Geometry();
            for (let i = 0; i < skateAcceleration.length; i++) {
                let x = xScaleSkate(skateAcceleration[i].x);
                let y = yScaleSkate(skateAcceleration[i].y);
                let z = zScaleSkate(skateAcceleration[i].z);
                skatePointCloudGeo.vertices.push(new THREE.Vector3(x, z, y));
            }
            skatePointCloud = new THREE.Points(skatePointCloudGeo, skatePointCloudMat);
            skateScatterPlot.add(skatePointCloud);
            scene.add(skateScatterPlot);
        }

        function createSkateKFA() {
            // SCALE
            let skateScaleKF = new THREE.VectorKeyframeTrack(
                '.scale',
                [0, 1, 2, 3],
                [0, 0, 0, 0.7, 0.7, 0.7, 1, 1, 1, 0, 0, 0],
                THREE.InterpolateSmooth
            );
            skateScaleKF.scale(5);

            let skateClip = new THREE.AnimationClip('Action', 17, [skateScaleKF]); // AnimationClip( name : String, duration : Number, tracks : Array )
            mixer = new THREE.AnimationMixer(skatePointCloud); // setup the THREE.AnimationMixer
            let clipAction = mixer.clipAction(skateClip); // create a ClipAction and set it to play
            clipAction.play();
        }

        createSkateMeshline();
        createSkatePointCloud();
        createSkateKFA();
        createSkateSphereNoise();
    }

    // ---- BOULDER VISUALS ----
    let boulderLineMesh;
    let boulderPointCloud;
    let boulderSphereGroup = new THREE.Object3D();
    let boulderScatterPlot = new THREE.Object3D();
    function boulderVisuals() {
        function createBoulderSphereNoise() {
            let boulderSphereGeometry = new THREE.SphereGeometry(1, 50, 50);

            boulderSphereMaterial = new THREE.MeshPhongMaterial({
                map: sphereTexture[2],
                specular: 0xc0c0c,
                shininess: 70,
            });

            let updateNoise = function () {
                let time = 0;
                let k = 2;
                for (let i = 0; i < boulderSphereNoise.geometry.faces.length; i++) {
                    let uv = boulderSphereNoise.geometry.faceVertexUvs[0][i]; //faceVertexUvs is a huge arrayed stored inside of another array
                    let f = boulderSphereNoise.geometry.faces[i];
                    let p = boulderSphereNoise.geometry.vertices[f.a]; //take the first vertex from each face
                    p.normalize().multiplyScalar(1 + 0.3 * noise.perlin3(p.x * k + time, p.y * k, p.z * k + time));
                }
                boulderSphereNoise.geometry.verticesNeedUpdate = true; //must be set or vertices will not update
                boulderSphereNoise.geometry.computeVertexNormals();
                boulderSphereNoise.geometry.normalsNeedUpdate = true;
            };

            let boulderCounter = 0;
            // console.log('boulder length: ', boulderGravity.length);
            for (let i = 1; i < boulderGravity.length; i += 1) {
                let boulderPos = vec(boulderGravity[i].x, boulderGravity[i].y, boulderGravity[i].z);
                let previousBoulderPos = vec(boulderGravity[i - 1].x, boulderGravity[i - 1].y, boulderGravity[i - 1].z);

                // console.log(boulderPos.distanceTo(previousBoulderPos));
                if (boulderPos.distanceTo(previousBoulderPos) > 0.025) {
                    let scaling = 1.3;
                    let x = xScaleBoulder(boulderGravity[i].x) / scaling;
                    let y = yScaleBoulder(boulderGravity[i].y) / scaling;
                    let z = zScaleBoulder(boulderGravity[i].z) / scaling;

                    var boulderSphereNoise = new THREE.Mesh(boulderSphereGeometry, boulderSphereMaterial);
                    boulderSphereNoise.position.x = -x; // UNTERSCHIEDLICHE SPHERE GRÖßEN!!!
                    boulderSphereNoise.position.y = y;
                    boulderSphereNoise.position.z = z;
                    boulderSphereNoise.rotation.x = (Math.PI / 6) * (i % 4);
                    boulderSphereNoise.castShadow = true;
                    // scene.add(boulderSphereNoise);
                    boulderSphereGroup.add(boulderSphereNoise);
                    boulderCounter++;
                }
            }
            // console.log('boulderCounter: ', boulderCounter);
            updateNoise();
            scene.add(boulderSphereGroup);
        }

        function createBoulderMeshline() {
            let boulderLineGeometry = new THREE.Geometry();

            for (let i = 1; i < boulderAcceleration.length; i += 8) {
                let x = xScaleBoulder(boulderAcceleration[i].x) / 2.5;
                let y = yScaleBoulder(boulderAcceleration[i].y) / 2.5;
                let z = zScaleBoulder(boulderAcceleration[i].z) / 2.5;
                var v = vec(x, y, z);

                boulderLineGeometry.vertices.push(v);
            }

            let boulderLine = new MeshLine();
            boulderLine.setGeometry(boulderLineGeometry, function (p) {
                return 2 + Math.sin(50 * p);
            });

            boulderLineMat = new MeshLineMaterial({
                map: strokeTexture,
                useMap: 1,
                color: new THREE.Color(0x6aa84f),
                lineWidth: 0.4,
                near: 1,
                far: 100000,
                opacity: 0.9,
                // dashArray: new THREE.Vector2(10, 5),
                blending: THREE.NormalBlending,
                transparent: true,
            });

            boulderLineMesh = new THREE.Mesh(boulderLine.geometry, boulderLineMat);
            scene.add(boulderLineMesh);
        }

        function createBoulderPointCloud() {
            let boulderPointCloudMat = new THREE.PointsMaterial({
                color: 0xffffff,
                // vertexColors: true,
                size: 0.5,
            });

            let boulderPointCloudGeo = new THREE.Geometry();
            for (let i = 0; i < boulderAcceleration.length; i++) {
                let x = xScaleBoulder(boulderAcceleration[i].x);
                let y = yScaleBoulder(boulderAcceleration[i].y);
                let z = zScaleBoulder(boulderAcceleration[i].z);
                boulderPointCloudGeo.vertices.push(new THREE.Vector3(x, z, y));
            }
            boulderPointCloud = new THREE.Points(boulderPointCloudGeo, boulderPointCloudMat);
            boulderScatterPlot.add(boulderPointCloud);
            scene.add(boulderScatterPlot);
        }

        function createBoulderKFA() {
            // SCALE
            let boulderScaleKF = new THREE.VectorKeyframeTrack(
                '.scale',
                [0, 1, 2, 3],
                [0, 0, 0, 0.7, 0.7, 0.7, 1, 1, 1, 0, 0, 0],
                THREE.InterpolateSmooth
            );
            boulderScaleKF.scale(5);

            let boulderClip = new THREE.AnimationClip('Action', 17, [boulderScaleKF]); // AnimationClip( name : String, duration : Number, tracks : Array )
            mixer = new THREE.AnimationMixer(boulderPointCloud); // setup the THREE.AnimationMixer
            let clipAction = mixer.clipAction(boulderClip); // create a ClipAction and set it to play
            clipAction.play();
        }

        createBoulderMeshline();
        createBoulderPointCloud();
        createBoulderKFA();
        createBoulderSphereNoise();
    }

    // ---- LIGHTING ----
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

        let spotLight1 = new THREE.SpotLight(0xffffff, 1.3);
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

        let spotLight2 = new THREE.SpotLight(0x5dd1fb, 0.8);
        spotLight2.position.set(-100, 10, -20);
        spotLight2.angle = Math.PI / 5;
        spotLight2.penumbra = 0.05;
        spotLight2.decay = 1.5;
        spotLight2.distance = 500;
        spotLight2.castShadow = true;
        spotLight2.shadow.mapSize.width = 1024;
        spotLight2.shadow.mapSize.height = 1024;
        spotLight2.shadow.camera.near = 10;
        spotLight2.shadow.camera.far = 200;
        scene.add(spotLight2);

        let pointLight2 = new THREE.PointLight(0xff8336, 1);
        pointLight2.position.set(0, 0, 0);
        // pointLight2.angle = Math.PI / 3;
        pointLight2.penumbra = 0.05;
        pointLight2.decay = 1.5;
        pointLight2.distance = 300;
        pointLight2.castShadow = true;
        pointLight2.shadow.mapSize.width = 1024;
        pointLight2.shadow.mapSize.height = 1024;
        pointLight2.shadow.camera.near = 10;
        pointLight2.shadow.camera.far = 400;
        scene.add(pointLight2);

        //  HELPER GRID FOR LIGHTS/CAMERA
        // lightHelper1 = new THREE.SpotLightHelper(spotLight1);
        // scene.add(lightHelper1);

        // lightHelper2 = new THREE.SpotLightHelper(spotLight2);
        // scene.add(lightHelper2);

        // lightHelper3 = new THREE.PointLightHelper(pointLight1);
        // scene.add(lightHelper3);

        // lightHelper4 = new THREE.PointLightHelper(pointLight2);
        // scene.add(lightHelper4);
    }

    // ---- RENDER ----
    function onWindowResize() {
        let newWidth = window.innerWidth;
        let newHeight = window.innerHeight;
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
    }
    window.addEventListener('resize', onWindowResize, false);

    function animate() {
        renderer.clear();

        // get audio data
        analyser.getFrequencyData(dataArray);
        soundAnimation();

        renderer.clear();
        window.requestAnimationFrame(animate, renderer.domElement);
        controls.update();
        // lightHelper1.update();
        // lightHelper2.update();
        // lightHelper3.update();
        // lightHelper4.update();

        render();
    }

    let clock = new THREE.Clock();
    function render() {
        // SHOW/HIDE SPECIFIC DATA
        if (changedVisibility) {
            if (sound_vis) {
                ball.visible = true;
                audio.stop();
                audio.play();
            } else if (sound_vis == false) {
                ball.visible = false;
                audio.stop();
            }

            if (params.dataSource == 'swimming') {
                if (acc_vis) {
                    scene.add(swimScatterPlot);
                    scene.add(swimLineMesh);
                } else if (acc_vis == false) {
                    scene.remove(swimScatterPlot);
                    scene.remove(swimLineMesh);
                }
                if (gravity_vis) {
                    scene.add(swimSphereGroup);
                } else if (gravity_vis == false) {
                    scene.remove(swimSphereGroup);
                }
            }

            if (params.dataSource == 'skating') {
                if (acc_vis) {
                    scene.add(skateScatterPlot);
                    scene.add(skateLineMesh);
                } else if (acc_vis == false) {
                    scene.remove(skateScatterPlot);
                    scene.remove(skateLineMesh);
                }
                if (gravity_vis) {
                    scene.add(skateSphereGroup);
                } else if (gravity_vis == false) {
                    scene.remove(skateSphereGroup);
                }
            }

            if (params.dataSource == 'bouldering') {
                if (acc_vis) {
                    scene.add(boulderScatterPlot);
                    scene.add(boulderLineMesh);
                } else if (acc_vis == false) {
                    scene.remove(boulderScatterPlot);
                    scene.remove(boulderLineMesh);
                }
                if (gravity_vis) {
                    scene.add(boulderSphereGroup);
                } else if (gravity_vis == false) {
                    scene.remove(boulderSphereGroup);
                }
            }
            changedVisibility = false;
        }

        // SWITCH BETWEEN SPORTS
        if (changedInput) {
            if (params.dataSource == 'swimming') {
                scene.remove(skateSphereGroup);
                scene.remove(skateLineMesh);
                scene.remove(skateScatterPlot);
                scene.remove(boulderSphereGroup);
                scene.remove(boulderLineMesh);
                scene.remove(boulderScatterPlot);
                swimVisuals();
                audio.stop();
                stream = audioFile[1];
                loadAudio();
                changedInput = false;
            } else if (params.dataSource == 'skating') {
                scene.remove(swimSphereGroup);
                scene.remove(swimLineMesh);
                scene.remove(swimScatterPlot);
                scene.remove(boulderSphereGroup);
                scene.remove(boulderLineMesh);
                scene.remove(boulderScatterPlot);
                skateVisuals();
                audio.stop();
                stream = audioFile[0];
                loadAudio();
                changedInput = false;
            } else if (params.dataSource == 'bouldering') {
                scene.remove(swimSphereGroup);
                scene.remove(swimLineMesh);
                scene.remove(swimScatterPlot);
                scene.remove(skateSphereGroup);
                scene.remove(skateLineMesh);
                scene.remove(skateScatterPlot);
                boulderVisuals();
                audio.stop();
                stream = audioFile[2];
                loadAudio();
                changedInput = false;
            }
        }

        // ANIMATE ACCELERATION with changing MESHLINE visibility and THREE.AnimationMixer for PointCloud
        function animateAcc() {
            let delta = clock.getDelta();

            if (params.dataSource == 'swimming') {
                swimLineMesh.material.uniforms.visibility.value = animateVisibility ? (clock.elapsedTime / 50) % 1.0 : 1.0;
            } else if (params.dataSource == 'skating') {
                skateLineMesh.material.uniforms.visibility.value = animateVisibility ? (clock.elapsedTime / 50) % 1.0 : 1.0;
            } else if (params.dataSource == 'bouldering') {
                boulderLineMesh.material.uniforms.visibility.value = animateVisibility ? (clock.elapsedTime / 50) % 1.0 : 1.0;
            }
            if (mixer && animateVisibility) {
                mixer.update(delta);
            }
        }
        animateAcc();

        camera.lookAt(scene.position);
        renderer.render(scene, camera);
        stats.update();
    }

    // ---- GUI ----
    function buildGui() {
        gui = new dat.GUI();
        gui.domElement.id = 'gui';

        params = new Params();
        gui.add(params, 'dataSource', ['bouldering', 'skating', 'swimming']).onChange(changeInput).name('Choose sport');

        let dataSrc = gui.addFolder('Data Sources');
        dataSrc.add(params, 'gravity').onChange(changeVis);
        dataSrc.add(params, 'sound').onChange(changeVis);
        dataSrc.add(params, 'acceleration').onChange(changeVis);
        dataSrc.add(params, 'animate_acc').onChange(changeVis).name('animate acc');
        dataSrc.open();

        gui.add(params, 'datainfo');

        let saveImg = gui.addFolder('Take a screenshot');
        saveImg.add(params, 'download');
        saveImg.open();

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
                // skatelineMesh.material.uniforms.visibility.value = 0;
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
        this.download = function () {
            saveAsImage();
        };

        this.datainfo = function () {
            let dataInfoText = document.getElementById('dataInfoText');
            if (dataInfoText.style.visibility === 'visible') {
                dataInfoText.style.visibility = 'hidden';
            } else {
                dataInfoText.style.visibility = 'visible';
            }
        };
    }

    function changeInput() {
        changedInput = true;
    }

    function changeVis() {
        changedVisibility = true;
    }

    function saveAsImage() {
        renderer.render(scene, camera);
        renderer.domElement.toBlob(
            function (blob) {
                var a = document.createElement('a');
                var url = URL.createObjectURL(blob);
                a.href = url;
                a.download = 'screenshot.png';
                a.click();
            },
            'image/png',
            1.0
        );
    }

    buildGui();
    skateVisuals();
    lighting();
    animate();
});
