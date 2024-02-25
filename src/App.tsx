import "./App.css";
import { startMidi } from "./lib/midi";
import * as THREE from "three";
import { fragmentShader, vertexShader } from "./lib/shader";
import { useEffect, useRef, useState } from "react";

const getRandomOffset: any = (arr: Array<any>, current: any): any => {
  const off = Math.floor(Math.random() * arr.length);
  return off !== current ? off : getRandomOffset(arr, current);
};

const getRandomItem: any = (arr: Array<any>): any => {
  return arr[getRandomOffset(arr, -1)];
};

// 3D

let scene: THREE.Scene;
let camera: THREE.Camera;
let renderer: THREE.Renderer;
let sceneObjects: any = [];
let clock: THREE.Clock;
const nbCube = 6;

function init() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = nbCube;

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(renderer.domElement);
  adjustLighting();
  addBasicCube();
}

function adjustLighting() {
  let pointLight = new THREE.PointLight(0xdddddd);
  pointLight.position.set(-5, -3, 3);
  scene.add(pointLight);

  let ambientLight = new THREE.AmbientLight(0xff5050);
  scene.add(ambientLight);
}

const colors = [
  0xacb6e5, 0x74ebd5, 0xffbb00, 0x00bbff, 0xff00ff, 0xffff00, 0xff5555,
];

function addBasicCube() {
  let geometry = new THREE.BoxGeometry(1, 1, 1);
  for (let r = 0; r < nbCube; r++) {
    let uniforms = {
      colorB: { type: "vec3", value: new THREE.Color(getRandomItem(colors)) },
      colorA: { type: "vec3", value: new THREE.Color(getRandomItem(colors)) },
    };

    let material = new THREE.ShaderMaterial({
      uniforms: uniforms,
      fragmentShader: fragmentShader(),
      vertexShader: vertexShader(),
    });

    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.x = -nbCube + r * 2;
    scene.add(mesh);
    sceneObjects.push(mesh);
  }
}

function App() {
  const [pos, setPos] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const requestRef = useRef<any>();

  let xx = 0;
  let yy = 0;
  let popos = 0;

  const callback20 = (value: any) => {
    yy = (-1 / 2 + value) / 10;
    setY(yy);
  };
  const callback19 = (value: any) => {
    xx = (-1 / 2 + value) / 10;
    setX(xx);
  };
  const callback18 = (value: any) => {
    popos = (-1 / 2 + value) / 10;
    setPos(popos);
  };

  const animationLoop = () => {
    renderer.render(scene, camera);

    console.log(popos, xx, yy);
    sceneObjects.forEach((object: THREE.Mesh, r: any) => {
      const delta = clock.getElapsedTime() * 2;

      object.rotation.x += popos + r / 100;
      object.rotation.y += popos / 2 + r / 200;
      object.position.y = (Math.sin(delta + r) * (yy * 30) * nbCube) / 2;
      object.position.z = (Math.sin(delta + r) * (xx * 30) * nbCube) / 2;
    });

    requestRef.current = requestAnimationFrame(animationLoop);
  };

  useEffect(() => {
    // MIDI
    startMidi({
      controllers: {
        channels: {
          18: callback18,
          19: callback19,
          74: callback20,
        },
      },
    });

    // threejs
    init();

    requestRef.current = requestAnimationFrame(animationLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <>
      <div>
        {x} - {y} - {pos}
      </div>
    </>
  );
}

export default App;
