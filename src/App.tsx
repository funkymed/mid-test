import "./App.css";
import { startMidi } from "./lib/midi";
import * as THREE from "three";
import { fragmentShader, vertexShader } from "./lib/shader";
import { useEffect, useRef, useState } from "react";
import TWEEN from "@tweenjs/tween.js";
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  GlitchEffect,
  GlitchMode,
  PixelationEffect,
} from "postprocessing"; // https://github.com/pmndrs/postprocessing

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
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;
let sceneObjects: any = [];
let noteObjects: any = [];
let noteTweens: any = [];
let clock: THREE.Clock;
let glitch: GlitchEffect;
let bloom: BloomEffect;
let pixelate: PixelationEffect;
const nbCube = 6;

function init() {
  clock = new THREE.Clock();
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = nbCube;

  renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: false,
    stencil: false,
    depth: false,
  });

  renderer.setSize(window.innerWidth, window.innerHeight);

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  pixelate = new PixelationEffect();
  pixelate.granularity = 0;
  composer.addPass(new EffectPass(camera, pixelate));

  glitch = new GlitchEffect();
  glitch.mode = GlitchMode.DISABLED;
  composer.addPass(new EffectPass(camera, glitch));

  bloom = new BloomEffect({
    intensity: 4,
    radius: 0.4,
    luminanceThreshold: 0.214,
    luminanceSmoothing: 0,
  });

  composer.addPass(new EffectPass(camera, bloom));
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
  0xff55ff, 0x00bbff, 0x55ff55, 0x5555ff,
];
const notes = ["C3", "D3", "E3", "F3", "G3", "A3", "B3"];

function addBasicCube() {
  // Rectangles notes
  let geometry1 = new THREE.BoxGeometry(2, 15, 0);

  for (let r = 0; r < notes.length; r++) {
    const material = new THREE.MeshBasicMaterial();
    material.color = new THREE.Color(getRandomItem(colors));
    material.transparent = true;
    material.opacity = 0;

    let mesh = new THREE.Mesh(geometry1, material);
    mesh.position.x = -notes.length + r * 2.2 + 0.25;
    mesh.position.z = -1;
    scene.add(mesh);
    noteObjects[notes[r]] = mesh;
  }
  console.log(noteObjects);
  // Cubes
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
    mesh.position.x = -nbCube + r * 2 + 0.5;
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

  const allNotes = (note: any, attack: any, aftertouch: any) => {
    if (aftertouch) {
      for (let n of notes) {
        if (noteTweens[n]) {
          TWEEN.remove(noteTweens[n]);
        }
        const material = noteObjects[n].material;
        material.opacity = attack;
        callbackNote(n, 1, false);
      }
    }
  };
  const callbackNote = (note: any, attack: any, aftertouch: any) => {
    if (noteTweens[note]) {
      TWEEN.remove(noteTweens[note]);
    }

    if (noteObjects[note]) {
      const material = noteObjects[note].material;
      if (aftertouch) {
        material.opacity = 1;
      } else {
        noteTweens[note] = new TWEEN.Tween(material)
          .to({ opacity: 0 }, 1000)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .start();
      }
    }
  };
  const backFlash = (note: any, attack: any, aftertouch: any) => {
    if (aftertouch) {
      const color = note === "C2" ? getRandomItem(colors) : "0xFFFFFF";
      scene.background = new THREE.Color(color);
      new TWEEN.Tween(scene)
        .to({ background: new THREE.Color(0x000000) }, 200)
        .easing(TWEEN.Easing.Sinusoidal.InOut)
        .start();
    }
  };

  const pitchbendCallback = (value: any) => {
    yy = value / 50;
    setY(yy);
  };

  const animationLoop = () => {
    // renderer.render(scene, camera);
    composer.render();

    TWEEN.update();
    sceneObjects.forEach((object: THREE.Mesh, r: any) => {
      const delta = clock.getElapsedTime() * 2;

      object.rotation.x += popos + r / 100;
      object.rotation.y += popos / 2 + r / 200;
      object.position.y = (Math.sin(delta + r) * (yy * 30) * nbCube) / 2;
      object.position.z = (Math.sin(delta + r) * (xx * 30) * nbCube) / 2;
    });

    requestRef.current = requestAnimationFrame(animationLoop);
  };

  const glitchNote = (note: any, attack: any, aftertouch: any) => {
    glitch.mode = GlitchMode.CONSTANT_WILD;
    setTimeout(() => {
      glitch.mode = GlitchMode.DISABLED;
    }, 300);
  };

  const pixelateNote = (note: any, attack: any, aftertouch: any) => {
    pixelate.granularity = 64;
    noteTweens[note] = new TWEEN.Tween(pixelate)
      .to({ granularity: 0 }, 300)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .start();
  };

  const bloomNote = (note: any, attack: any, aftertouch: any) => {
    bloom.intensity = 20;
    noteTweens[note] = new TWEEN.Tween(bloom)
      .to({ intensity: 4 }, 300)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .start();
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

      notes: {
        C2: backFlash,
        "C#2": backFlash,
        D2: allNotes,
        "D#2": glitchNote,
        E2: pixelateNote,
        F2: bloomNote,
        C3: callbackNote,
        D3: callbackNote,
        E3: callbackNote,
        F3: callbackNote,
        G3: callbackNote,
        A3: callbackNote,
        B3: callbackNote,
      },
      pitchbend: pitchbendCallback,
      debug: false,
    });

    // threejs
    init();

    requestRef.current = requestAnimationFrame(animationLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <>
      <div style={{ position: "absolute", top: 5, left: 5, color: "white" }}>
        {x}
        <br /> {y} <br /> {pos}
      </div>
    </>
  );
}

export default App;
