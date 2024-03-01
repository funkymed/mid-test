import "./App.css";
import { actionMidi, startMidi } from "./lib/midi";
import * as THREE from "three";
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
  ScanlineEffect,
  GridEffect,
  SMAAEffect,
  SMAAPreset,
  ChromaticAberrationEffect,
} from "postprocessing"; // https://github.com/pmndrs/postprocessing
import { RectAreaLightHelper } from "./helpers/RectAreaLightHelper";
import { RectAreaLightUniformsLib } from "./helpers/RectAreaLightUniformsLib";
import { OrbitControls } from "./controls/OrbitControls";
import { isNullishCoalesce } from "typescript";
import { fragmentShader2, vertexShader2 } from "./lib/shader2";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const getRandomOffset: any = (arr: Array<any>, current: any): any => {
  const off = Math.floor(Math.random() * arr.length);
  return off !== current ? off : getRandomOffset(arr, current);
};

const getRandomItem: any = (arr: Array<any>): any => {
  return arr[getRandomOffset(arr, -1)];
};

type events = {
  e: any;
  time: number;
};

type tape = {
  duration: number;
  repeater: number;
  events: Array<events>;
};

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let composer: EffectComposer;
let sceneObjects: any = [];
let noteObjects: any = [];
let noteTweens: any = [];
let glitch: GlitchEffect;
let bloom: BloomEffect;
let pixelate: PixelationEffect;
let scanline: ScanlineEffect;
let grid: GridEffect;
let smaa: SMAAEffect;
let speed: number = 500;
let ambientLight: THREE.AmbientLight;
let uniforms: any;
let megaLight: THREE.RectAreaLight;
let chroma: ChromaticAberrationEffect;
let groupMsh: THREE.Group;
let timeFly: THREE.Clock;
let isRecording: boolean = false;
let tapeOffset: number = 0;
let magneto: Array<tape> = [];
let isLoopActivated: boolean = true;
const nbCube = 8;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );
  camera.position.set(0, 0, -7);

  renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: false,
    stencil: false,
    depth: false,
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); //set pixel ratio
  renderer.setSize(window.innerWidth, window.innerHeight); // make it full screen
  renderer.outputEncoding = THREE.LinearEncoding; // set color encoding
  renderer.toneMapping = THREE.LinearToneMapping; // set the toneMapping
  renderer.toneMappingExposure = 1.2; // set the exposure

  window.addEventListener("resize", () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); //set pixel ratio
    renderer.setSize(window.innerWidth, window.innerHeight); // make it full screen
  });

  composer = new EffectComposer(renderer);
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));

  chroma = new ChromaticAberrationEffect();
  chroma.radialModulation = true;
  chroma.modulationOffset = 5;
  composer.addPass(new EffectPass(camera, chroma));

  pixelate = new PixelationEffect();
  pixelate.granularity = 0;
  composer.addPass(new EffectPass(camera, pixelate));

  grid = new GridEffect({ scale: 1, lineWidth: 0.1 });
  composer.addPass(new EffectPass(camera, grid));

  glitch = new GlitchEffect();
  glitch.mode = GlitchMode.DISABLED;
  composer.addPass(new EffectPass(camera, glitch));

  bloom = new BloomEffect({
    intensity: 9,
    radius: 0.5,
    luminanceThreshold: 0.214,
    luminanceSmoothing: 0,
  });
  composer.addPass(new EffectPass(camera, bloom));

  smaa = new SMAAEffect({ preset: SMAAPreset.ULTRA });
  composer.addPass(new EffectPass(camera, smaa));

  document.body.appendChild(renderer.domElement);

  adjustLighting();
  addBasicCube();
  startShader();
  // loadObj();
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.update();
}

function loadObj() {
  const loader = new GLTFLoader();
  loader.load(
    // resource URL
    "WHDv-fish-tank.glb",
    function (glb) {
      groupMsh = glb.scene;
      // groupMsh.children.forEach((msh) => {
      //   const mesh = msh as THREE.Mesh;
      //   const material = mesh.material as THREE.MeshBasicMaterial;
      //   if (material.blending) {
      //     material.blending = THREE.MultiplyBlending;
      //   }
      // });

      scene.add(groupMsh);
    }
  );
}

function startShader() {
  const geometry = new THREE.PlaneGeometry(2, 2);

  uniforms = {
    time: { value: 1.0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: vertexShader2,
    fragmentShader: fragmentShader2,
    transparent: true,
    opacity: 0.025,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = -13;
  // scene.add(mesh);
}

function adjustLighting() {
  let pointLight: THREE.PointLight = new THREE.PointLight(0x333333);
  pointLight.position.set(-25, 13, -25);
  pointLight.intensity = 10;
  scene.add(pointLight);

  ambientLight = new THREE.AmbientLight(0x888888);
  scene.add(ambientLight);

  RectAreaLightUniformsLib.init();

  const w = 10;
  for (let r = 0; r < notes.length; r++) {
    const rectLight = new THREE.RectAreaLight(getRandomItem(colors), 2, w, 100);
    rectLight.power = 200;
    rectLight.intensity = 0;
    rectLight.height = 0;
    rectLight.position.x = (-notes.length * w) / 2 + (w + 2) * r;
    rectLight.position.z = 25;
    scene.add(rectLight);
    scene.add(new RectAreaLightHelper(rectLight));
    noteObjects[notes[r]] = rectLight;
  }

  megaLight = new THREE.RectAreaLight(0xffffff, 120, 120, 120);
  megaLight.power = 20;
  megaLight.intensity = 0;
  megaLight.position.z = -25;
  megaLight.rotation.x = 10;
  scene.add(megaLight);
  scene.add(new RectAreaLightHelper(megaLight));
}

const colors = [
  0xacb6e5, 0x74ebd5, 0xffbb00, 0x00bbff, 0xff00ff, 0xffff00, 0xff5555,
  0xff55ff, 0x00bbff, 0x55ff55, 0x5555ff,
];
const notes = ["C3", "D3", "E3", "F3", "G3", "A3", "B3"];

function addBasicCube() {
  // Cubes
  let geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
  for (let r = 0; r < nbCube; r++) {
    let uniforms = {
      colorB: { type: "vec3", value: new THREE.Color(getRandomItem(colors)) },
      colorA: { type: "vec3", value: new THREE.Color(getRandomItem(colors)) },
    };

    let material = new THREE.MeshStandardMaterial({
      color: getRandomItem(colors),
      roughness: 0,
      metalness: 0,
      flatShading: false,
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

  const resetPos = (note: any, attack: any, aftertouch: any) => {
    if (aftertouch) {
      callback20(0.5);
      callback19(0.5);
      callback18(0.5);
    }
  };

  const allNotes = (note: any, attack: any, aftertouch: any) => {
    for (let n of notes) {
      if (noteTweens[n]) {
        TWEEN.remove(noteTweens[n]);
      }
      noteObjects[n].intensity = attack;
      callbackNote(n, attack, aftertouch);
    }
  };
  const callbackNote = (note: any, attack: any, aftertouch: any) => {
    const twn = noteTweens[note];
    if (twn) {
      TWEEN.remove(twn);
    }
    const msh: THREE.RectAreaLight = noteObjects[note];
    if (msh) {
      if (aftertouch) {
        msh.intensity = attack;
        msh.height = attack * 50;
      } else {
        noteTweens[note] = new TWEEN.Tween(noteObjects[note])
          .to({ intensity: 0, height: 0 }, 1000)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .end()
          .start();
      }
    }
  };

  const megaLightFlash = (value: any) => {
    megaLight.intensity = 0.3;
    new TWEEN.Tween(megaLight)
      .to({ intensity: 0 }, 1000)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .end()
      .start();
  };

  const backFlash = (note: any, attack: any, aftertouch: any) => {
    if (aftertouch) {
      const color = note === "C2" ? getRandomItem(colors) : 0xffffff;
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

  const callbackSpeed = (value: any) => {
    speed = 1000 - value * 1000;
  };

  const animationLoop = (time: number) => {
    // renderer.render(scene, camera);
    composer.render();

    uniforms["time"].value = time / 500;

    TWEEN.update();

    if (groupMsh) {
      groupMsh.rotation.y -= 0.1;
    }
    sceneObjects.forEach((object: THREE.Mesh, r: any) => {
      const delta = time / speed;
      object.rotation.x += (popos + 1 / 100) * 2;
      object.rotation.y += (popos / 2 + 1 / 200) * 2;
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

  const ambiantCallback = (value: any) => {
    ambientLight.intensity = value * 3;
  };

  const resetRecorder = (note: any, attack: any, aftertouch: any) => {
    if (!aftertouch) {
      magneto.forEach((man) => {
        window.clearInterval(man.repeater);
      });
      magneto = [];
    }
  };
  const recordAndPlay = (note: any, attack: any, aftertouch: any) => {
    if (aftertouch && !isRecording) {
      magneto.forEach((man, o) => {
        window.clearInterval(man.repeater);
        if (man.events.length === 0) {
          delete magneto[o];
        }
      });
      // start recording
      isRecording = true;
      timeFly = new THREE.Clock();
      timeFly.start();
      tapeOffset = magneto.length;
      magneto[tapeOffset] = {
        duration: 0,
        events: [],
        repeater: 0,
      };
    } else if (isRecording) {
      // play
      isRecording = false;
      if (timeFly) {
        timeFly.stop();
        magneto[tapeOffset].duration = timeFly.elapsedTime;
      }

      // restart replay
      console.log("restart replay");
      magneto.forEach((tape, o) => {
        if (tape.events.length > 0) {
          playTape(tape);
        }
      });
    }
  };

  const playTape = (tape: tape) => {
    window.clearInterval(tape.repeater);
    tape.repeater = window.setInterval(
      playEvents,
      tape.duration * 1000,
      tape.events
    );
    playEvents(tape.events);
  };

  const playEvents = (events: any) => {
    events.forEach((data: events) => {
      setTimeout(actionMidi, data.time * 1000, data.e);
    });
  };

  const record = (e: any) => {
    if (isRecording) {
      console.log(e);
      magneto[tapeOffset].events.push({
        time: timeFly.getElapsedTime(),
        e,
      });
    }
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
          71: callbackSpeed,
          16: ambiantCallback,
        },
      },

      notes: {
        C2: backFlash,
        "C#2": backFlash,
        D2: allNotes,
        "D#2": glitchNote,
        E2: pixelateNote,
        "E#2": resetPos,
        F2: bloomNote,
        "F#2": megaLightFlash,
        G2: resetPos,
        C3: callbackNote,
        D3: callbackNote,
        E3: callbackNote,
        F3: callbackNote,
        G3: callbackNote,
        A3: callbackNote,
        B3: callbackNote,
        B4: resetRecorder,
        C5: recordAndPlay,
      },
      pitchbend: pitchbendCallback,
      debug: false,
      record: record,
      recordNote: "C5",
    });

    // threejs
    init();

    requestRef.current = requestAnimationFrame(animationLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return (
    <>
      <div style={{ position: "absolute", top: 5, left: 5, color: "white" }}>
        Knob 2 : {y} <br />
        Knob 10: {pos}
        <br />
        Knob 11 : {x}
      </div>
      <div
        style={{ position: "absolute", bottom: 5, right: 5, color: "white" }}
      >
        <p>Tiny midi test by med/mandarine</p>
      </div>
    </>
  );
}

export default App;
