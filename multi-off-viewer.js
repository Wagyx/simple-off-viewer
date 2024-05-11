import * as THREE from 'three';
import {
    TrackballControls
} from './js/TrackballControls.js';
import {
    AntiprismOffLoader
} from './js/AntiprismOffLoader.js';

class PolyViewer {
    constructor() {
        this.elapsedTime = 0.0;
        this.clock = new THREE.Clock();
        this.scenes = [];
    }
    init() {
        this.clock.start();

        this.canvas = document.createElement("canvas");
        this.canvas.className = "threeJS-viewer-canvas";
        document.body.insertBefore(this.canvas, document.body.firstChild);

        const viewerDivs = document.getElementsByClassName('threeJS-viewer');
        for (let viewerDiv of viewerDivs) {
            this.addScene(viewerDiv);
        }

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setClearColor(0xffffff, 1);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        window.addEventListener('resize', this.updateSize);
    }
    
    addScene(element) {
        // SCENE
        const scene = new THREE.Scene();
        scene.userData.element = element;
        scene.userData.parameters = processAttributes(scene.userData.element);
        scene.background = scene.userData.parameters.backgroundColor;

        // CAMERA
        const width = window.innerWidth;
        const height = window.innerHeight;
        const viewAngle = 30;
        const near = 0.1;
        const far = 1000;
        const camera = new THREE.PerspectiveCamera(viewAngle, width/height, near, far);
        scene.userData.camera = camera;
        resetCamera(camera);
        scene.add(camera);

        // LIGHTS
        const light = new THREE.DirectionalLight(0xffffff, 0.5);
        camera.add(light);
        const light2 = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(light2);

        // 3D MODEL
        loadFileFromUrl(scene.userData.parameters.url, scene, scene.userData.parameters);

        // CONTROLS
        const controls = new TrackballControls(scene.userData.camera, scene.userData.element);
        controls.rotateSpeed = 2.0;
        controls.maxDistance = 100.0;
        controls.minDistance = 5.0;
        controls.enablePan = true;
        controls.enableZoom = true;
        scene.userData.controls = controls;

        this.scenes.push(scene)
    }

    updateSize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.renderer.setSize(width, height, false);
        }
    }


    render() {
        this.updateSize();

        this.canvas.style.transform = `translateY(${window.scrollY}px)`;

        //background color
        // this.renderer.setClearColor(0xcccccc); //backgroundColor
        this.renderer.setScissorTest(true);

        const delta = this.clock.getDelta();
        this.elapsedTime += delta;
        const self = this;
        this.scenes.forEach(function (scene) {
            if (scene.userData.parameters.rotationSpeed != 0 && scene.children[2]) {
                scene.children[2].quaternion.setFromAxisAngle(scene.userData.parameters.rotationDirection, self.elapsedTime * scene.userData.parameters.rotationSpeed);
            }
            // so something moves
            // scene.children[ 0 ].rotation.y = Date.now() * 0.001;

            // get the element that is a place holder for where we want to
            // draw the scene
            const element = scene.userData.element;

            // get its position relative to the page's viewport
            const rect = element.getBoundingClientRect();

            // check if it's offscreen. If so skip it
            if (rect.bottom < 0 || rect.top > self.renderer.domElement.clientHeight ||
                rect.right < 0 || rect.left > self.renderer.domElement.clientWidth) {
                return; // it's off screen
            }

            // set the viewport
            const bottom = self.renderer.domElement.clientHeight - rect.bottom;
            self.renderer.setViewport(rect.left, bottom, rect.width, rect.height);
            self.renderer.setScissor(rect.left, bottom, rect.width, rect.height);

            const camera = scene.userData.camera;
            camera.aspect = rect.width / rect.height; // not changing in this example
            camera.updateProjectionMatrix();

            scene.userData.controls.update();

            self.renderer.render(scene, camera);
        });
    }

}


function readAttributeOrDefault(element, key, defaultValue) {
    let val = element.getAttribute(key)
    if (!val) {
        val = defaultValue;
    }
    return val;
}
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}
function parseVec3(pString) {
    const arr = pString.split(",");
    arr.forEach(function (el, index, arr) {
        arr[index] = parseFloat(el);
    });
    const vec = new THREE.Vector3(arr[0], arr[1], arr[2]);
    return vec;
}
function processAttributes(element) {
    const parameters = {
        transparency: clamp(parseFloat(readAttributeOrDefault(element, "data-transparency", "0.0")), 0.0, 1.0),
        edgesActive: readAttributeOrDefault(element, "data-edges-active", "true") == "true",
        facesActive: readAttributeOrDefault(element, "data-faces-active", "true") == "true",
        verticesActive: readAttributeOrDefault(element, "data-vertices-active", "true") == "true",
        useBaseColor: readAttributeOrDefault(element, "data-use-basecolor", "true") == "true",
        url: readAttributeOrDefault(element, "src", "/off/U1.off"),
        backgroundColor: new THREE.Color("#" + readAttributeOrDefault(element, "data-background-color", "cccccc")),
        vertexRadius: clamp(parseFloat(readAttributeOrDefault(element, "data-vertex-radius", "0.03")), 0.0, 1.0),
        edgeRadius: clamp(parseFloat(readAttributeOrDefault(element, "data-edge-radius", "0.02")), 0.0, 1.0),
        rotationDirection: parseVec3(readAttributeOrDefault(element, "data-rotation-direction", "0,1,0")),
        rotationSpeed: parseFloat(readAttributeOrDefault(element, "data-rotation-speed", 0.0)),
    };
    parameters.rotationDirection.normalize();
    return parameters;
}


function createScene(filename, parameters) {
    // SCENE
    const scene = new THREE.Scene();

    // CAMERA
    const width = window.innerWidth;
    const height = window.innerHeight;
    const viewAngle = 30;
    const near = 0.1;
    const far = 1000;
    const camera = new THREE.PerspectiveCamera(viewAngle, 1, near, far);
    scene.userData.camera = camera;

    resetCamera(camera);
    scene.add(camera);

    // LIGHTS
    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    camera.add(light);
    const light2 = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(light2);

    // const geometry = new THREE.BoxGeometry( 1, 1, 1 ); 
    // const material = new THREE.MeshBasicMaterial( {color: 0x00ff00} ); 
    // const cube = new THREE.Mesh( geometry, material ); 
    // scene.add( cube );

    // 3D MODEL
    loadFileFromUrl(filename, scene, parameters);

    return scene;
}

function arraySum(arr) {
    return arr.reduce((partialSum, a) => partialSum + a, 0);
}

function arrayAverage(arr) {
    return arraySum(arr) / arr.length;
}

function quaternionFromDir(direction) {
    const quaternion = new THREE.Quaternion();
    if (direction.y > 0.999) {
        quaternion.set(0, 0, 0, 1);
    } else if (direction.y < -0.999) {
        quaternion.set(1, 0, 0, 0);
    } else {
        const axis = new THREE.Vector3();
        axis.set(direction.z, 0, -direction.x).normalize();
        const radians = Math.acos(direction.y);
        quaternion.setFromAxisAngle(axis, radians);
    }
    return quaternion;
}

function addMissingColors(obj) {
    const gDefaultColor = { vertex: [1.0, 0.5, 0.0], edge: [0.8, 0.6, 0.8], face: [0.8, 0.9, 0.9] };

    for (let i = 0, l = obj.verticesColor.length; i < l; ++i) {
        if (obj.verticesColor[i] === undefined) {
            obj.verticesColor[i] = gDefaultColor.vertex;
        }
    }
    for (let i = 0, l = obj.edgesColor.length; i < l; ++i) {
        if (obj.edgesColor[i] === undefined) {
            obj.edgesColor[i] = gDefaultColor.edge;
        }
    }
    for (let i = 0, l = obj.facesColor.length; i < l; ++i) {
        if (obj.facesColor[i] === undefined) {
            obj.facesColor[i] = gDefaultColor.face;
        }
    }
    return obj;
}

function addObjectToscene(data, scene, parameters) {
    const polyhedronMesh = new THREE.Object3D();
    scene.add(polyhedronMesh);

    // convert vertex data to THREE.js vectors
    const vertices = [];
    let cnt = new THREE.Vector3(0, 0, 0);
    for (let i = 0; i < data.vertices.length; i++) {
        const tpVec = new THREE.Vector3(data.vertices[i][0], data.vertices[i][1], data.vertices[i][2]);
        cnt.add(tpVec);
        vertices.push(tpVec);
    }
    cnt.divideScalar(data.vertices.length);
    //center in zero
    const edgesLength = [];
    for (let i = 0; i < data.vertices.length; i++) {
        vertices[i].sub(cnt);
        edgesLength.push(vertices[i].length());
    }
    const polyScaleFactor = 10 / Math.max.apply(Math, edgesLength);
    edgesLength.length = 0;
    // compute edges length to normalize edge length
    for (let i = 0; i < data.edges.length; i++) {
        const index0 = data.edges[i][0];
        const index1 = data.edges[i][1];
        edgesLength.push(vertices[index0].distanceTo(vertices[index1]));
    }
    const scaleFactor = arrayAverage(edgesLength);

    //MAKE VERTICES
    {
        const vertexMaterial = new THREE.MeshStandardMaterial({
            color: parameters.useBaseColor ? 0xffffff : 0x000000,
            roughness: 0.5,
            metalness: 0.,
            // envMap:gTextureEquirec,
            visible: parameters.verticesActive,
        });
        const vertexGeometry = new THREE.SphereGeometry(parameters.vertexRadius, 12 * 3, 6 * 3)
        const verticesMesh = new THREE.InstancedMesh(vertexGeometry, vertexMaterial, data.vertices.length);

        const S = new THREE.Matrix4().makeScale(scaleFactor, scaleFactor, scaleFactor);
        for (let i = 0, l = data.vertices.length; i < l; i++) {
            let position = vertices[i];
            if (data.verticesColor[i].length == 4 && data.verticesColor[i][3] == 0.0) {
                position = new THREE.Vector3(1e6, 1e6, 1e6);
            }
            const M = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);
            verticesMesh.setMatrixAt(i, M.multiply(S));
            verticesMesh.setColorAt(i, new THREE.Color(
                data.verticesColor[i][0],
                data.verticesColor[i][1],
                data.verticesColor[i][2]));
        }
        verticesMesh.instanceMatrix.needsUpdate = true;
        verticesMesh.instanceColor.needsUpdate = true;
        polyhedronMesh.add(verticesMesh);
    }

    //MAKE EDGES
    {
        const edgeMaterial = new THREE.MeshStandardMaterial({
            color: parameters.useBaseColor ? 0xffffff : 0x000000,
            roughness: 0.5,
            metalness: 0.,
            // envMap:gTextureEquirec,
            visible: parameters.edgesActive,
        });
        const edgeGeometry = new THREE.CylinderGeometry(parameters.edgeRadius, parameters.edgeRadius, 1, 8 * 2, 4 * 2);
        const edgesMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, data.edges.length);

        // convert edge data to cylinders
        for (let i = 0, l = data.edges.length; i < l; i++) {
            const point0 = vertices[data.edges[i][0]];
            const point1 = vertices[data.edges[i][1]];
            const direction = new THREE.Vector3().subVectors(point1, point0);
            const d = direction.length();
            let position = new THREE.Vector3().addVectors(point0, direction.multiplyScalar(0.5));
            if (data.edgesColor[i].length == 4 && data.edgesColor[i][3] == 0.0) {
                position = new THREE.Vector3(1e6, 1e6, 1e6);
            }
            direction.normalize();
            const scale = new THREE.Vector3(scaleFactor, d, scaleFactor);
            const quaternion = quaternionFromDir(direction);
            const M = new THREE.Matrix4().compose(position, quaternion, scale);
            edgesMesh.setMatrixAt(i, M);
            edgesMesh.setColorAt(i, new THREE.Color(
                data.edgesColor[i][0],
                data.edgesColor[i][1],
                data.edgesColor[i][2]));
        }
        edgesMesh.instanceMatrix.needsUpdate = true;
        edgesMesh.instanceColor.needsUpdate = true;
        polyhedronMesh.add(edgesMesh);
    }

    //MAKE FACES
    {
        // convert face data to a single (triangulated) geometry
        const faceMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.5,
            metalness: 0.0,
            vertexColors: THREE.FaceColors,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0 - parameters.transparency,
            // envMap:gTextureEquirec,
            visible: parameters.facesActive,
        });

        const points = [];
        const colors = [];
        for (let faceNum = 0; faceNum < data.faces.length; faceNum++) {
            if (data.facesColor[faceNum].length == 4 && data.facesColor[faceNum][3] == 0.0) {
                continue;
            }
            const col = new THREE.Color(
                data.facesColor[faceNum][0],
                data.facesColor[faceNum][1],
                data.facesColor[faceNum][2]);
            if (data.faces[faceNum].length == 3) {
                const v0 = vertices[data.faces[faceNum][0]];
                points.push(v0.x, v0.y, v0.z);
                colors.push(col.r, col.g, col.b);
                const v1 = vertices[data.faces[faceNum][1]];
                points.push(v1.x, v1.y, v1.z);
                colors.push(col.r, col.g, col.b);
                const v2 = vertices[data.faces[faceNum][2]];
                points.push(v2.x, v2.y, v2.z);
                colors.push(col.r, col.g, col.b);
            }
            else {
                const faceCenter = new THREE.Vector3(0, 0, 0);
                for (let i = 0, l = data.faces[faceNum].length; i < l; i++) {
                    faceCenter.add(vertices[data.faces[faceNum][i]]);
                }
                faceCenter.multiplyScalar(1 / data.faces[faceNum].length);

                for (let i = 0, l = data.faces[faceNum].length; i < l; i++) {
                    points.push(faceCenter.x, faceCenter.y, faceCenter.z);
                    colors.push(col.r, col.g, col.b);
                    const v1 = vertices[data.faces[faceNum][i]];
                    points.push(v1.x, v1.y, v1.z);
                    colors.push(col.r, col.g, col.b);
                    const v2 = vertices[data.faces[faceNum][(i + 1) % l]];
                    points.push(v2.x, v2.y, v2.z);
                    colors.push(col.r, col.g, col.b);
                }
            }
        }
        const geometry = new THREE.BufferGeometry();
        geometry.name = "trianglesSoup";
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();

        const facesMesh = new THREE.Mesh(geometry, faceMaterial);
        polyhedronMesh.add(facesMesh);
    }
    polyhedronMesh.scale.set(polyScaleFactor, polyScaleFactor, polyScaleFactor);
}


function parseOff(filename, text) {
    const loader = new AntiprismOffLoader();
    const obj = loader.parse(text);
    addMissingColors(obj);
    obj["filename"] = filename;
    obj["v"] = obj.vertices.length;
    obj["e"] = obj.edges.length;
    obj["f"] = obj.faces.length;
    obj["name"] = filename.substring(filename.lastIndexOf('/') + 1, filename.lastIndexOf('.'));
    obj["category"] = ["From User"];
    obj["ind"] = -1;
    obj["text"] = text;
    return obj;
}

function loadFileFromUrl(url, scene, parameters) {
    if (/\.off$/i.test(url)) {
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'blob';
        request.onload = function () {
            const reader = new FileReader();
            reader.onload = function (e) {
                const obj = parseOff(url, this.result);
                addObjectToscene(obj, scene, parameters);
            };
            reader.readAsText(request.response);
        };
        request.send();
    } else {
        console.log("The file extension is not correct, should be .off")
    }

}

function resetCamera(camera) {
    const gcCamZ = {
        pos: [0, 0, 45],
        up: [0, 1, 0],
        target: [0, 0, 0]
    };
    camera.position.set(...gcCamZ.pos);
    camera.up.set(...gcCamZ.up);
    camera.lookAt(...gcCamZ.target);
}

//////////////////////////////////////////////////////////////////////////////////////////////////

const pw = new PolyViewer();
pw.init();
animate();

function animate() {
    pw.render();
    requestAnimationFrame(animate);
}