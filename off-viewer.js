/*
Copyright (c) 2023 Wagyx Xygaw
Under MIT License
*/
import * as THREE from 'three';
import {
    TrackballControls
} from './js/TrackballControls.js';
import {
    AntiprismOffLoader
} from './js/AntiprismOffLoader.js';


// MAIN

// standard global variables
let gContainer, gScene, gCamera, gRenderer, gControls;
let gCurrInd = -1;
const POLYHEDRA=[];
let gNumMaxVertices = 1;
let gNumMaxEdges = 1;
let gElapsedTime = 0;
const gDefaultColor = [1., 1., 1.];
// custom global variables
let gPolyhedronMesh, gVerticesMesh, gEdgesMesh, gFacesMesh, gTextureEquirec;
const gcCamZ = {
    pos: [0, 0, 45],
    up: [0, 1, 0],
    target: [0, 0, 0]
};
const clamp = (num, min, max) => Math.min(Math.max(num, min), max);
const gParameters = {
    transparency: clamp(parseFloat(getURLParameter("transparency", 0.0)), 0.0, 1.0),
    edgesActive: getURLParameter("edgesActive", "true") == "true",
    facesActive: getURLParameter("facesActive", "true") == "true",
    verticesActive: getURLParameter("verticesActive", "true") == "true",
    useBaseColor: getURLParameter("useBaseColor", "true") == "true",
    url: decodeURIComponent(getURLParameter("url", "")),
    backgroundColor: "#"+getURLParameter("backgroundColor", "cccccc"),
    vertexRadius: clamp(parseFloat(getURLParameter("vertexRadius", 0.03)), 0.0, 1.0),
    edgeRadius: clamp(parseFloat(getURLParameter("edgeRadius", 0.02)), 0.0, 1.0),
    rotationDirection : parseVec3(getURLParameter("rotationDirection", "0,1,0")),
    rotationSpeed: parseFloat(getURLParameter("rotationSpeed", 0.0)),
};
gParameters.rotationDirection.normalize();

const gClock = new THREE.Clock();
gClock.start();
init();
animate();

// FUNCTIONS 		
function init() {
    // SCENE
    gScene = new THREE.Scene();
    // CAMERA
    const width = window.innerWidth;
    const height = window.innerHeight;
    const viewAngle = 30;
    const near = 0.1;
    const far = 1000;
    gCamera = new THREE.PerspectiveCamera(viewAngle, width / height, near, far);
    gScene.add(gCamera);
    resetCamera();

    const light = new THREE.DirectionalLight(0xffffff, 0.5);
    gCamera.add(light);
    const light2 = new THREE.AmbientLight(0xffffff, 0.4);
    gScene.add(light2);

    // RENDERER
    gRenderer = new THREE.WebGLRenderer({
        antialias: true
    });
    gRenderer.setPixelRatio(window.devicePixelRatio);
    gRenderer.setSize(window.innerWidth, window.innerHeight);

    gContainer = document.getElementById('ThreeJS');
    gContainer.appendChild(gRenderer.domElement);

    // CONTROLS
    gControls = new TrackballControls(gCamera, gRenderer.domElement);
    gControls.noPan = true;
    gControls.rotateSpeed = 2.0;
    gControls.maxDistance = 100.0;
    gControls.minDistance = 5.0;

    ////////////
    // CUSTOM //
    ////////////
    gPolyhedronMesh = new THREE.Object3D();
    gScene.add(gPolyhedronMesh);

    for (let obj of POLYHEDRA) {
        gNumMaxEdges = Math.max(gNumMaxEdges, obj.e);
        gNumMaxVertices = Math.max(gNumMaxVertices, obj.v);
    }

    // const textureLoader = new THREE.TextureLoader();
    // const texturePath = '/images/geometry/brown_photostudio_02_1k.jpg';
    // gTextureEquirec = textureLoader.load( texturePath );
    // gTextureEquirec.mapping = THREE.EquirectangularReflectionMapping;
    // gTextureEquirec.encoding = THREE.sRGBEncoding;


    gVerticesMesh = makeVerticesMesh(gNumMaxVertices);
    gPolyhedronMesh.add(gVerticesMesh);

    gEdgesMesh = makeEdgesMesh(gNumMaxEdges);
    gPolyhedronMesh.add(gEdgesMesh);

    /////////
    // GUI //
    /////////

    if(gParameters.url){
        loadFileFromUrl(gParameters.url);
    }
    else {
        const obj={filename:"off/U1.off"};
        loadOffPoly(obj)
    }

    // EVENTS
    document.addEventListener("keydown", onDocumentKeyDown, false);
    // document.addEventListener("touchcancel", onDocumentTouchCancel, false);
    window.addEventListener('resize', onWindowResize);

} // end of function init()


function parseVec3(pString){
    const arr = pString.split(",");
    arr.forEach(function(el, index, arr) {
        arr[index] = parseFloat(el);
      });
    const vec = new THREE.Vector3(arr[0],arr[1],arr[2]);
    return vec;
}

function makeEdgesMesh(nbMaxEdges) {
    const defaultColor = new THREE.Color(...gDefaultColor);
    const edgeMaterial = new THREE.MeshStandardMaterial({
        color: gParameters.useBaseColor ? 0xffffff : 0x000000,
        roughness: 0.5,
        metalness: 0.,
        // envMap:gTextureEquirec,
        visible: gParameters.edgesActive,
    });
    const edgeGeometry = new THREE.CylinderGeometry(gParameters.edgeRadius, gParameters.edgeRadius, 1, 8 * 2, 4 * 2);
    const edgesMesh = new THREE.InstancedMesh(edgeGeometry, edgeMaterial, nbMaxEdges);
    for (let i = 0; i < nbMaxEdges; ++i) {
        edgesMesh.setColorAt(i, defaultColor);
    }
    return edgesMesh;
}

function makeVerticesMesh(nbMaxVertices) {
    const defaultColor = new THREE.Color(...gDefaultColor);
    const vertexMaterial = new THREE.MeshStandardMaterial({
        color: gParameters.useBaseColor ? 0xffffff : 0x000000,
        roughness: 0.5,
        metalness: 0.5,
        // envMap:gTextureEquirec,
        visible: gParameters.verticesActive,
    });
    const vertexGeometry = new THREE.SphereGeometry(gParameters.vertexRadius, 12 * 3, 6 * 3)
    const verticesMesh = new THREE.InstancedMesh(vertexGeometry, vertexMaterial, nbMaxVertices);
    for (let i = 0; i < nbMaxVertices; ++i) {
        verticesMesh.setColorAt(i, defaultColor);
    }
    return verticesMesh
}

function getURLParameter(sParam, defaultVal) {
    const sPageURL = window.location.search.substring(1);
    const sURLVariables = sPageURL.split('&');
    for (let i = 0; i < sURLVariables.length; i++) {
        const sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
    return defaultVal;
}

function setUrlParameters(parameters) {
    const arr = [];
    if (parameters.url != "" && parameters.url !== undefined) {
        arr.push("url=" + encodeURIComponent(parameters.url));
    }
    const keys = ["transparency", "edgesActive", "facesActive", "verticesActive", "useBaseColor","vertexRadius","edgeRadius","backgroundColor", "rotationSpeed"];
    for (let arg of keys) {
        arr.push("" + arg + "=" + parameters[arg]);
    }
    arr.push("rotationDirection=" + parameters.rotationDirection.x+","+ parameters.rotationDirection.y+","+ parameters.rotationDirection.z);
    const newAdditionalURL = arr.join("&").replace("#","");
    const baseURL = window.location.href.split("?")[0];
    const newUrl = baseURL + "?" + newAdditionalURL;
    window.history.replaceState('', '', newUrl);
}

function arrayAverage(arr) {
    //Find the sum
    let sum = 0;
    for (let i in arr) {
        sum += arr[i];
    }
    //Get the length of the array
    const numbersCnt = arr.length;
    //Return the average / mean.
    return (sum / numbersCnt);
}

function displayPolyhedron(data) {
    function disposeArray() {
        this.array = null;
    }

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
        const S = new THREE.Matrix4().makeScale(scaleFactor, scaleFactor, scaleFactor);
        gVerticesMesh.count = data.vertices.length;
        for (let i = 0; i < data.vertices.length; i++) {
            let position = vertices[i];
            if (data.edgesColor[i].length == 4 && data.edgesColor[i][3] == 0) {
                position = new THREE.Vector3(1e6, 1e6, 1e6);
            }
            const M = new THREE.Matrix4().makeTranslation(position.x, position.y, position.z);
            gVerticesMesh.setMatrixAt(i, M.multiply(S));
            gVerticesMesh.setColorAt(i, new THREE.Color(
                data.verticesColor[i][0],
                data.verticesColor[i][1],
                data.verticesColor[i][2]));
        }
        gVerticesMesh.instanceMatrix.needsUpdate = true;
        gVerticesMesh.instanceColor.needsUpdate = true;
    }

    //MAKE EDGES
    {
        gEdgesMesh.count = data.edges.length;
        // convert edge data to cylinders
        for (let i = 0; i < data.edges.length; i++) {
            const point0 = vertices[data.edges[i][0]];
            const point1 = vertices[data.edges[i][1]];
            const direction = new THREE.Vector3().subVectors(point1, point0);
            const d = direction.length();
            let position = new THREE.Vector3().addVectors(point0, direction.multiplyScalar(0.5));
            if (data.edgesColor[i].length == 4 && data.edgesColor[i][3] == 0) {
                position = new THREE.Vector3(1e6, 1e6, 1e6);
            }
            direction.normalize();
            const scale = new THREE.Vector3(scaleFactor, d, scaleFactor);
            const quaternion = quaternionFromDir(direction);
            const M = new THREE.Matrix4().compose(position, quaternion, scale);
            gEdgesMesh.setMatrixAt(i, M);
            gEdgesMesh.setColorAt(i, new THREE.Color(
                data.edgesColor[i][0],
                data.edgesColor[i][1],
                data.edgesColor[i][2]));
        }
        gEdgesMesh.instanceMatrix.needsUpdate = true;
        gEdgesMesh.instanceColor.needsUpdate = true;
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
            opacity: 1.0 - gParameters.transparency,
            // envMap:gTextureEquirec,
            visible: gParameters.facesActive,
        });

        const points = [];
        const colors = [];
        for (let faceNum = 0; faceNum < data.faces.length; faceNum++) {
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

        if (gFacesMesh !== undefined) {
            gPolyhedronMesh.remove(gFacesMesh);
            doDispose(gFacesMesh);
        }
        gFacesMesh = new THREE.Mesh(geometry, faceMaterial);
        gPolyhedronMesh.add(gFacesMesh);
    }
    gPolyhedronMesh.scale.set(polyScaleFactor, polyScaleFactor, polyScaleFactor);
}

function doDispose(obj) {
    if (obj !== null) {
        for (let i = 0, l = obj.children.length; i < l; i++) {
            doDispose(obj.children[i]);
        }
        if (obj.geometry) {
            obj.geometry.dispose();
        }
        if (obj.material) {
            if (obj.material.map) {
                obj.material.map.dispose();
            }
            obj.material.dispose();
        }
    }
};

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

function animate() {
    requestAnimationFrame(animate);
    const delta = gClock.getDelta();
    gElapsedTime += delta;
    if (gParameters.rotationSpeed != 0){
        gPolyhedronMesh.quaternion.setFromAxisAngle( gParameters.rotationDirection,  gElapsedTime * gParameters.rotationSpeed);
    }
    render();
    update();
}

function update() {
    gControls.update();
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    gCamera.aspect = width / height;
    gCamera.updateProjectionMatrix();
    gRenderer.setSize(width, height);
}

function render() {
    gRenderer.setClearColor(gParameters.backgroundColor);
    gRenderer.render(gScene, gCamera);
}


function updatePolyhedron(ind) {
    const obj = POLYHEDRA[ind];
    setUrlParameters(gParameters);
    if (obj.vertices === undefined) {
        loadOffPoly(obj);
    } else {
        displayPolyhedron(obj);
    }
}


function loadOffPoly(obj) {
    const loader = new AntiprismOffLoader();
    // load a resource
    loader.load(
        // resource URL
        obj.filename,
        // called when resource is loaded
        function (object) {
            obj["vertices"] = object.vertices;
            obj["faces"] = object.faces;
            obj["edges"] = object.edges;
            obj["verticesColor"] = object.verticesColor;
            obj["facesColor"] = object.facesColor;
            obj["edgesColor"] = object.edgesColor;
            obj["v"] = obj.vertices.length;
            obj["e"] = obj.edges.length;
            obj["f"] = obj.faces.length;

            obj = addMissingColors(obj);

            obj.ind = POLYHEDRA.length;
            POLYHEDRA.push(obj);
            reinstantiateMeshes(obj);
            gCurrInd = obj.ind;
            updatePolyhedron(gCurrInd);
        },
        // called when loading is in progresses
        function (xhr) {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // called when loading has errors
        function (error) {
            console.log('An error happened when loading', obj.filename);
            console.log(error);
        }
    );
}

function addMissingColors(obj) {
    if (obj.verticesColor.length < obj.vertices.length) {
        const l = obj.vertices.length - obj.verticesColor.length;
        for (let i = 0; i < l; ++i) {
            obj.verticesColor.push(gDefaultColor);
        }
    }
    if (obj.facesColor.length < obj.faces.length) {
        const l = obj.faces.length - obj.facesColor.length;
        for (let i = 0; i < l; ++i) {
            obj.facesColor.push(gDefaultColor);
        }
    }
    if (obj.edgesColor.length < obj.edges.length) {
        const l = obj.edges.length - obj.edgesColor.length;
        for (let i = 0; i < l; ++i) {
            obj.edgesColor.push(gDefaultColor);
        }
    }
    return obj
}

function reinstantiateMeshes(obj) {
    if (obj.v > gNumMaxVertices) {
        gNumMaxVertices = obj.v;
        gPolyhedronMesh.remove(gVerticesMesh);
        doDispose(gVerticesMesh);
        gVerticesMesh = makeVerticesMesh(gNumMaxVertices);
        gPolyhedronMesh.add(gVerticesMesh);
    }
    if (obj.e > gNumMaxEdges) {
        gNumMaxEdges = obj.e;
        gPolyhedronMesh.remove(gEdgesMesh);
        doDispose(gEdgesMesh);
        gEdgesMesh = makeEdgesMesh(gNumMaxEdges);
        gPolyhedronMesh.add(gEdgesMesh);
    }
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


function loadFileFromUrl(url) {
    if (/\.off$/i.test(url)) {
        gParameters.url = url;
        setUrlParameters(gParameters);
        const request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'blob';
        request.onload = function () {
            const reader = new FileReader();
            reader.onload = function (e) {
                const obj = parseOff(url, this.result);
                obj.ind = POLYHEDRA.length;
                POLYHEDRA.push(obj);

                reinstantiateMeshes(obj);

                gCurrInd = obj.ind;
                updatePolyhedron(gCurrInd);
            };
            reader.readAsText(request.response);
        };
        request.send();
    } else {
        console.log("The file extension is not correct, should be .off")
    }

}

function loadFileFromLocal(file) {
    if (/\.off$/i.test(file.name)) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const obj = parseOff(file.name, this.result);
            obj.ind = POLYHEDRA.length;
            POLYHEDRA.push(obj);

            reinstantiateMeshes(obj);

            gCurrInd = obj.ind;
            updatePolyhedron(gCurrInd);
        }
        reader.readAsText(file);
    } else {
        console.log("The file extension is not correct, should be .off")
    }
}

function resetCamera(){
    gCamera.position.set(...gcCamZ.pos);
    gCamera.up.set(...gcCamZ.up);
    gCamera.lookAt(...gcCamZ.target);
}

function onDocumentKeyDown(event) {
    //https://www.freecodecamp.org/news/javascript-keycode-list-keypress-event-key-codes/
    const keyCode = event.which;
    if (keyCode == 53) {
        //mambo number 5
        resetCamera();
        gElapsedTime = 0;
    }
};

// function onDocumentTouchCancel(event) {
//     const keyCode = event.which;
//         gCamera.position.set(...defaultCamPos);
// };

