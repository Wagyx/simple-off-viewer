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
        this.delta = 0;
        this.scenes = [];
        this.currentTarget = undefined;
        this.timer;
        this.clicks = 0;
        this.timeout = 350;
        this.indFullScreen = -1;
    }

    init() {
        this.clock.start();

        this.canvas = document.createElement("canvas");
        this.canvas.className = "threeJS-viewer-canvas";
        // document.body.appendChild(this.canvas);
        document.body.insertBefore(this.canvas, document.body.firstChild);

        const rootStyle = getComputedStyle(document.querySelector('.threeJS-viewer-canvas'));
        console.log(rootStyle)
        const defaultParameters = processRootAttributes(rootStyle);

        const viewerDivs = document.getElementsByClassName('threeJS-viewer');
        for (let viewerDiv of viewerDivs) {
            this.addScene(viewerDiv, defaultParameters);
        }

        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setClearAlpha(0);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        const self = this;
        //EVENTS
        document.addEventListener("click", function (event) {
            self.currentTarget = event.target;
        });

        function toggleFullscreen() {
            if (self.indFullScreen < 0) {
                self.indFullScreen = self.scenes.findIndex(function (scene) {
                    return scene.userData.element.isSameNode(self.currentTarget);
                });
                if (self.indFullScreen < 0) { return; }

                self.canvas.style["z-index"] = "0"; //to be above text

                const scene = self.scenes[self.indFullScreen];
                scene.userData.element.style["position"] = "fixed"; //to fill the browser window
                scene.userData.element.style["left"] = "0";
                scene.userData.element.style["top"] = "0";
                document.body.style["overflow"] = "hidden";

                scene.background = null;
                if (scene.userData.parameters.backgroundFullScreenColor){
                    scene.background = new THREE.Color(...scene.userData.parameters.backgroundFullScreenColor.slice(0,3));
                }
            }
            else {
                self.canvas.style["z-index"] = "";
                const scene = self.scenes[self.indFullScreen];
                scene.userData.element.style["position"] = "";
                scene.userData.element.style["left"] = "";
                scene.userData.element.style["top"] = "";
                scene.userData.element.style["width"] = "";
                scene.userData.element.style["height"] = "";
                document.body.style["overflow"] = "";

                scene.background = null;
                if (scene.userData.parameters.backgroundColor){
                    scene.background = new THREE.Color(...scene.userData.parameters.backgroundColor.slice(0,3));
                }

                self.indFullScreen = -1;
            }
        }

        function toggleRotation(){
            const ind = self.scenes.findIndex(function (scene) {
                return scene.userData.element.isSameNode(self.currentTarget);
            });
            if (ind < 0) { return; }
            const scene = self.scenes[ind];
            scene.userData.parameters.rotationActive = ! scene.userData.parameters.rotationActive;
        }
        
        document.addEventListener("keydown", function (event) {
            const keyCode = event.key;
            if (keyCode == "5" || keyCode == "R" || keyCode == "r") {
                self.scenes.forEach(function (scene) {
                    if (scene.userData.element.isSameNode(self.currentTarget)) {
                        resetCamera(scene.userData.camera, scene.userData.controls);
                        return;
                    }
                });
            }
            else if (keyCode == "f" || keyCode == "F" || (keyCode == "Escape" && self.indFullScreen >= 0)) {
                toggleFullscreen();
                }
            else if (keyCode == "s" || keyCode == "S") {
                toggleRotation();
            }
        });
        
        // document.addEventListener("dblclick", toggleFullscreen);
        document.addEventListener('click', function (evt) {
            clearTimeout(self.timer);
            self.clicks++;
            self.timer = setTimeout(function () {
                if (self.clicks == 2) {
                    toggleFullscreen();
                }
                if (self.clicks == 3) {
                    self.scenes.forEach(function (scene) {
                        if (scene.userData.element.isSameNode(self.currentTarget)) {
                            resetCamera(scene.userData.camera, scene.userData.controls);
                            return;
                        }
                    });
                }
                self.clicks = 0;
            }, self.timeout);
        });

        window.addEventListener('resize', this.updateSize);
    }

    addScene(element, defaultParameters) {
        // SCENE
        const scene = new THREE.Scene();
        scene.userData.elapsedTime = 0;
        scene.userData.element = element;
        scene.userData.parameters = processAttributes(scene.userData.element, defaultParameters);
        if (scene.userData.parameters.backgroundColor){
            scene.background = new THREE.Color(...scene.userData.parameters.backgroundColor.slice(0,3));
        }

        // CAMERA
        const width = window.innerWidth;
        const height = window.innerHeight;
        const viewAngle = 30;
        const near = 0.1;
        const far = 1000;
        const camera = new THREE.PerspectiveCamera(viewAngle, width / height, near, far);
        scene.userData.camera = camera;
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
        controls.noPan = false;
        controls.noZoom = false;
        controls.noRotate = false;
        scene.userData.controls = controls;
        resetCamera(camera, controls);

        this.scenes.push(scene)
    }

    updateSize() {
        if (this.canvas) {
            const width = this.canvas.clientWidth;
            const height = this.canvas.clientHeight;
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.renderer.setSize(width, height, false);
                if (this.indFullScreen >= 0) {
                    const scene = this.scenes[this.indFullScreen];
                    scene.userData.element.style["width"] = "" + width + "px";
                    scene.userData.element.style["height"] = "" + height + "px";
                }
            }
        }
    }


    _renderScene(scene) {
        // get the element that is a place holder for where we want to draw the scene
        const element = scene.userData.element;
        // get its position relative to the page's viewport
        const rect = element.getBoundingClientRect();
        // check if it's offscreen. If so skip it
        if (rect.bottom < 0 || rect.top > this.renderer.domElement.clientHeight ||
            rect.right < 0 || rect.left > this.renderer.domElement.clientWidth) {
            return; // it's off screen
        }
        
        if (scene.userData.parameters.rotationActive && scene.userData.parameters.rotationSpeed != 0 && scene.children[2]) {
            scene.userData.elapsedTime+= this.delta;
            scene.children[2].quaternion.setFromAxisAngle(scene.userData.parameters.rotationAxis, scene.userData.elapsedTime * scene.userData.parameters.rotationSpeed);
        }


        // set the viewport
        const bottom = this.renderer.domElement.clientHeight - rect.bottom;
        this.renderer.setViewport(rect.left, bottom, rect.width, rect.height);
        this.renderer.setScissor(rect.left, bottom, rect.width, rect.height);

        const camera = scene.userData.camera;
        camera.aspect = rect.width / rect.height; // not changing in this example
        camera.updateProjectionMatrix();

        scene.userData.controls.update();

        this.renderer.render(scene, camera);
    }

    render() {
        this.updateSize();

        this.canvas.style.transform = `translateY(${window.scrollY}px)`;

        //background color
        // this.renderer.setClearColor(0xcccccc); //backgroundColor
        this.renderer.setScissorTest(true);
        this.delta = this.clock.getDelta();

        if (this.indFullScreen < 0) {
            this.scenes.forEach(scene=>this._renderScene(scene));
        }
        else {
            this._renderScene(this.scenes[this.indFullScreen]);
        }
    }
}


function readAttribute(element, key, defaultValue) {
    let val = element.getAttribute(key)
    if (!val) { val = defaultValue; }
    return val;
}
function readRootAttribute(element, key, defaultValue) {
    let val = element.getPropertyValue(key)
    if (!val) { val = defaultValue; }
    return val;
}
function clamp(num, min, max) {
    return Math.min(Math.max(num, min), max);
}
function parseVec3(pString) {
    const arr = pString.split(",").map(x => parseFloat(x));
    const vec = new THREE.Vector3(arr[0], arr[1], arr[2]);
    return vec;
}
function parseColor(pString) {
    if (!pString || pString[0] !== "#") {
        return undefined;
    }
    const res = [
        parseInt(pString.slice(1, 3), 16) / 255.0,
        parseInt(pString.slice(3, 5), 16) / 255.0,
        parseInt(pString.slice(5, 7), 16) / 255.0,
        (pString.length > 7) ? parseInt(pString.slice(7, 9), 16) / 255.0 : 1.0
    ];
    return res;
}
function processAttributes(element, defaultParameters) {
    const parameters = {
        url: readAttribute(element, "src", "/off/U1.off"),
        vertexRadius: clamp(parseFloat(readAttribute(element, "data-vertex-radius", defaultParameters.vertexRadius)), 0.0, 1.0),
        edgeRadius: clamp(parseFloat(readAttribute(element, "data-edge-radius", defaultParameters.edgeRadius)), 0.0, 1.0),
        backgroundColor: parseColor(readAttribute(element, "data-background-color", defaultParameters.backgroundColor)),
        backgroundFullScreenColor: parseColor(readAttribute(element, "data-fullscreen-background-color", defaultParameters.backgroundFullScreenColor)),
        verticesActive: readAttribute(element, "data-vertices-active", defaultParameters.verticesActive) == "true",
        edgesActive: readAttribute(element, "data-edges-active", defaultParameters.edgesActive) == "true",
        facesActive: readAttribute(element, "data-faces-active", defaultParameters.facesActive) == "true",
        rotationAxis: parseVec3(readAttribute(element, "data-rotation-axis", defaultParameters.rotationAxis)),
        rotationSpeed: parseFloat(readAttribute(element, "data-rotation-speed", defaultParameters.rotationSpeed)),
        rotationActive: readAttribute(element, "data-rotation-active", "true") == "true",
        vertexColor: parseColor(readAttribute(element, "data-vertex-color", defaultParameters.vertexColor)),
        edgeColor: parseColor(readAttribute(element, "data-edge-color", defaultParameters.edgeColor)),
        faceColor: parseColor(readAttribute(element, "data-face-color", defaultParameters.faceColor)),
    };

    parameters["facesColors"] = { ...defaultParameters["facesColors"] };
    for (let i = 0, atts = element.attributes, n = atts.length; i < n; i++) {
        if (atts[i].nodeName.match("data-face[0-9]+-color")) {
            const key = parseInt(atts[i].nodeName.slice(9, -6), 10)
            parameters["facesColors"][key] = parseColor(atts[i].nodeValue);
        }
    }

    parameters.rotationAxis.normalize();
    return parameters;
}

function processRootAttributes(rootStyle) {
    const defaultParameters = {
        vertexRadius: "0.03",
        edgeRadius: "0.02",
        backgroundColor: "#cccccc",
        backgroundFullScreenColor: "#cccccc",
        verticesActive: "true",
        edgesActive: "true",
        facesActive: "true",
        rotationAxis: "0,1,0",
        rotationSpeed: 0.0,
        rotationActive: "true",
        vertexColor: undefined,
        edgeColor: undefined,
        faceColor: undefined,
    }
    const parameters = {
        vertexRadius: readRootAttribute(rootStyle, "--data-vertex-radius", defaultParameters.vertexRadius),
        edgeRadius: readRootAttribute(rootStyle, "--data-edge-radius", defaultParameters.edgeRadius),
        backgroundColor: readRootAttribute(rootStyle, '--data-background-color', defaultParameters.backgroundColor),
        backgroundFullScreenColor: readRootAttribute(rootStyle, '--data-fullscreen-background-color', defaultParameters.backgroundFullScreenColor),
        verticesActive: readRootAttribute(rootStyle, "--data-vertices-active", defaultParameters.verticesActive),
        edgesActive: readRootAttribute(rootStyle, "--data-edges-active", defaultParameters.edgesActive),
        facesActive: readRootAttribute(rootStyle, "--data-faces-active", defaultParameters.facesActive),
        rotationAxis: readRootAttribute(rootStyle, "--data-rotation-axis", defaultParameters.rotationAxis),
        rotationSpeed: readRootAttribute(rootStyle, "--data-rotation-speed", defaultParameters.rotationSpeed),
        rotationActive: readRootAttribute(rootStyle, "--data-rotation-active", defaultParameters.rotationActive),
        vertexColor: readRootAttribute(rootStyle, "--data-vertex-color", defaultParameters.vertexColor),
        edgeColor: readRootAttribute(rootStyle, "--data-edge-color", defaultParameters.edgeColor),
        faceColor: readRootAttribute(rootStyle, "--data-face-color", defaultParameters.faceColor),
        displayPolyInfo: readRootAttribute(rootStyle, "--data-display-info", defaultParameters.displayPolyInfo),
    };
    parameters["facesColors"] = {};
    for (let i = 0; i < rootStyle.length; i++) {
        const propertyName = rootStyle[i];
        if (propertyName.match("--data-face[0-9]+-color")) {
            const key = parseInt(propertyName.slice(11, -6), 10);
            parameters["facesColors"][key] = parseColor(readRootAttribute(rootStyle, propertyName, undefined));
        }
    }
    return parameters;
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
        if (obj.verticesColor[i].length == 3) {
            obj.verticesColor[i].push(1.0);
        }
    }
    for (let i = 0, l = obj.edgesColor.length; i < l; ++i) {
        if (obj.edgesColor[i] === undefined) {
            obj.edgesColor[i] = gDefaultColor.edge;
        }
        if (obj.edgesColor[i].length == 3) {
            obj.edgesColor[i].push(1.0);
        }
    }
    for (let i = 0, l = obj.facesColor.length; i < l; ++i) {
        if (obj.facesColor[i] === undefined) {
            obj.facesColor[i] = gDefaultColor.face;
        }
        if (obj.facesColor[i].length == 3) {
            obj.facesColor[i].push(1.0);
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
        if (parameters.vertexColor) {
            for (let i = 0; i < data.verticesColor.length; i++) {
                data.verticesColor[i] = parameters.vertexColor;
            }
        }
        const facesPerAlpha = {}
        for (let i = 0; i < data.verticesColor.length; i++) {
            const t = data.verticesColor[i][3];
            if (!(Object.hasOwn(facesPerAlpha, t))) {
                facesPerAlpha[t] = [];
            }
            facesPerAlpha[t].push(i);
        }
        for (let t in facesPerAlpha) {
            if (t == 0)
                continue;
            const vertexMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.,
                transparent: true,
                opacity: t,
                // envMap:gTextureEquirec,
                visible: parameters.verticesActive,
            });
            const vertexGeometry = new THREE.SphereGeometry(parameters.vertexRadius, 12 * 3, 6 * 3)
            const verticesMesh = new THREE.InstancedMesh(vertexGeometry, vertexMaterial, facesPerAlpha[t].length);

            const S = new THREE.Matrix4().makeScale(scaleFactor, scaleFactor, scaleFactor);
            for (let i in facesPerAlpha[t]) {
                const ind = facesPerAlpha[t][i];
                const position = vertices[ind];
                const M = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);
                verticesMesh.setMatrixAt(i, M.multiply(S));
                verticesMesh.setColorAt(i, new THREE.Color(
                    data.verticesColor[ind][0],
                    data.verticesColor[ind][1],
                    data.verticesColor[ind][2]));
            }
            verticesMesh.instanceMatrix.needsUpdate = true;
            verticesMesh.instanceColor.needsUpdate = true;
            polyhedronMesh.add(verticesMesh);
        }
    }

    //MAKE EDGES
    {
        if (parameters.edgeColor) {
            for (let i = 0; i < data.edgesColor.length; i++) {
                data.edgesColor[i] = parameters.edgeColor;
            }
        }
        const facesPerAlpha = {}
        for (let i = 0; i < data.edgesColor.length; i++) {
            const t = data.edgesColor[i][3];
            if (!(Object.hasOwn(facesPerAlpha, t))) {
                facesPerAlpha[t] = [];
            }
            facesPerAlpha[t].push(i);
        }
        for (let t in facesPerAlpha) {
            if (t == 0)
                continue;
            const edgeMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.,
                transparent: true,
                opacity: t,
                // envMap:gTextureEquirec,
                visible: parameters.edgesActive,
            });
            const edgeGeometry = new THREE.CylinderGeometry(parameters.edgeRadius, parameters.edgeRadius, 1, 8 * 2, 4 * 2);
            const edgesMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, facesPerAlpha[t].length);

            // convert edge data to cylinders
            for (let i in facesPerAlpha[t]) {
                const ind = facesPerAlpha[t][i];
                const point0 = vertices[data.edges[ind][0]];
                const point1 = vertices[data.edges[ind][1]];
                const direction = new THREE.Vector3().subVectors(point1, point0);
                const d = direction.length();
                let position = new THREE.Vector3().addVectors(point0, direction.multiplyScalar(0.5));
                direction.normalize();
                const scale = new THREE.Vector3(scaleFactor, d, scaleFactor);
                const quaternion = quaternionFromDir(direction);
                const M = new THREE.Matrix4().compose(position, quaternion, scale);
                edgesMesh.setMatrixAt(i, M);
                edgesMesh.setColorAt(i, new THREE.Color(
                    data.edgesColor[ind][0],
                    data.edgesColor[ind][1],
                    data.edgesColor[ind][2]));
            }
            edgesMesh.instanceMatrix.needsUpdate = true;
            edgesMesh.instanceColor.needsUpdate = true;
            polyhedronMesh.add(edgesMesh);
        }
    }

    //MAKE FACES
    {
        if (parameters.faceColor) {
            for (let i = 0; i < data.facesColor.length; i++) {
                data.facesColor[i] = parameters.faceColor;
            }
        }
        const facesPerAlpha = {}
        for (let faceNum = 0; faceNum < data.facesColor.length; faceNum++) {
            const t = data.facesColor[faceNum][3];
            if (!(Object.hasOwn(facesPerAlpha, t))) {
                facesPerAlpha[t] = [];
            }
            facesPerAlpha[t].push(faceNum);
        }
        for (let t in facesPerAlpha) {
            // convert face data to a single (triangulated) geometry
            const faceMaterial = new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.5,
                metalness: 0.0,
                vertexColors: THREE.FaceColors,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: t,
                // envMap:gTextureEquirec,
                visible: parameters.facesActive,
            });

            const points = [];
            const colors = [];
            for (let faceNum of facesPerAlpha[t]) {
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

function resetCamera(camera, controls) {
    const gcCamZ = {
        pos: [0, 0, 45],
        up: [0, 1, 0],
        target: [0, 0, 0]
    };
    camera.position.set(...gcCamZ.pos);
    camera.up.set(...gcCamZ.up);
    camera.lookAt(...gcCamZ.target);
    controls.target = new THREE.Vector3(0, 0, 0);
}

//////////////////////////////////////////////////////////////////////////////////////////////////

const pw = new PolyViewer();
pw.init();
animate();

function animate() {
    pw.render();
    requestAnimationFrame(animate);
}