import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import TWEEN from "@tweenjs/tween.js";
import { GlitchMode } from "postprocessing"; // https://github.com/pmndrs/postprocessing
import Emittery from "emittery"; // https://www.npmjs.com/package/emittery
import Scene3D from "./Scene3D";
import "./App.css";
import { actionMidi, startMidi } from "./lib/midi";
import { getRandomItem } from "./lib/utils";
import Recorder from "./lib/Recorder";

Emittery.isDebugEnabled = true;
let emitter = new Emittery({ debug: { name: "myEmitter1" } });

emitter.on("saucisse", (data) => {
  console.log(data);
});

let tempoInterval = 0;
var BPM: any = require("bpm");
const getRandomOffset: any = (arr: Array<any>, current: any): any => {
  const off = Math.floor(Math.random() * arr.length);
  return off !== current ? off : getRandomOffset(arr, current);
};

let noteTweens: any = [];
let speed: number = 500;
let MyScene: Scene3D;

var b = new BPM();

const colors = [
  0xacb6e5, 0x74ebd5, 0xffbb00, 0x00bbff, 0xff00ff, 0xffff00, 0xff5555,
  0xff55ff, 0x00bbff, 0x55ff55, 0x5555ff,
];

const notes = ["C3", "D3", "E3", "F3", "G3", "A3", "B3"];
const keyboardnote = ["w", "x", "c", "v", "b", "n", ","];

function init() {
  MyScene = new Scene3D(notes, colors);
}

function App() {
  const [pos, setPos] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [bpm, setBpm] = useState(0);
  const requestRef = useRef<any>();
  const bpmTick = useRef<any>();

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
      MyScene.noteObjects[n].intensity = attack;
      callbackNote(n, attack, aftertouch);
    }
  };
  const callbackNote = (note: any, attack: any, aftertouch: any) => {
    const twn = noteTweens[note];
    if (twn) {
      TWEEN.remove(twn);
    }
    const msh: THREE.RectAreaLight = MyScene.noteObjects[note];
    if (msh) {
      if (aftertouch) {
        msh.intensity = attack;
        msh.height = attack * 50;
      } else {
        noteTweens[note] = new TWEEN.Tween(MyScene.noteObjects[note])
          .to({ intensity: 0, height: 0 }, 1000)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .end()
          .start();
      }
    }
  };

  const megaLightFlash = (value: any) => {
    MyScene.megaLight.intensity = 0.3;
    new TWEEN.Tween(MyScene.megaLight)
      .to({ intensity: 0 }, 1000)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .end()
      .start();
  };

  const backFlash = (note: any, attack: any, aftertouch: any) => {
    if (aftertouch) {
      const color = note === "C2" ? getRandomItem(colors) : 0xffffff;
      MyScene.scene.background = new THREE.Color(color);
      new TWEEN.Tween(MyScene.scene)
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
    TWEEN.update();

    MyScene.composer.render();

    MyScene.uniforms["time"].value = time / 500;

    if (MyScene.groupMsh) {
      MyScene.groupMsh.rotation.y -= 0.1;
    }
    MyScene.sceneObjects.forEach((object: THREE.Mesh, r: any) => {
      const delta = time / speed;
      object.rotation.x += (popos + 1 / 100) * 2;
      object.rotation.y += (popos / 2 + 1 / 200) * 2;
      object.position.y =
        (Math.sin(delta + r) * (yy * 30) * MyScene.nbCube) / 2;
      object.position.z =
        (Math.sin(delta + r) * (xx * 30) * MyScene.nbCube) / 2;
    });
    requestRef.current = requestAnimationFrame(animationLoop);
  };

  const tapeBPM = (note: any, attack: any, aftertouch: any) => {
    if (aftertouch) {
      let tap = b.tap();
      console.log(tap);
      if (tap.count > 7) {
        b.reset();
        tap = b.tap();
      }
      setBpm(tap.avg);
      window.clearInterval(tempoInterval);
      if (tap.ms && tap.ms > 100) {
        tempoInterval = window.setInterval(() => {
          bpmTick.current.style.opacity = 1;

          new TWEEN.Tween(bpmTick.current.style)
            .to({ opacity: 0 }, tap.ms)
            .easing(TWEEN.Easing.Sinusoidal.Out)
            .start();
        }, tap.ms);
      }
    }
  };

  const glitchNote = (note: any, attack: any, aftertouch: any) => {
    MyScene.glitch.mode = GlitchMode.CONSTANT_WILD;
    setTimeout(() => {
      MyScene.glitch.mode = GlitchMode.DISABLED;
    }, 300);
  };

  const ambiantCallback = (value: any) => {
    MyScene.ambientLight.intensity = value * 3;
  };

  const recorder = new Recorder(actionMidi);

  const pixelateNote = (note: any, attack: any, aftertouch: any) => {
    MyScene.pixelate.granularity = 64;
    noteTweens[note] = new TWEEN.Tween(MyScene.pixelate)
      .to({ granularity: 0 }, 300)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .start();
  };

  const bloomNote = (note: any, attack: any, aftertouch: any) => {
    MyScene.bloom.intensity = 20;
    noteTweens[note] = new TWEEN.Tween(MyScene.bloom)
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
        A4: tapeBPM,
        B4: recorder.resetRecorder.bind(recorder),
        C5: recorder.recordAndPlay.bind(recorder),
      },
      pitchbend: pitchbendCallback,
      debug: false,
      record: recorder.record.bind(recorder),
      recordNote: "C5",
    });

    // threejs
    init();

    document.addEventListener(
      "keydown",
      (event: any) => {
        const keyName = event.key;
        for (let k in keyboardnote) {
          if (keyName === keyboardnote[k]) {
            callbackNote(notes[k], 1, true);
          }
        }
      },
      false
    );
    document.addEventListener(
      "keydown",
      (event: any) => {
        const keyName = event.key;
        if (keyName === "t") {
          tapeBPM(false, false, true);
        }
        for (let k in keyboardnote) {
          if (keyName === keyboardnote[k]) {
            callbackNote(notes[k], 1, false);
          }
        }
      },
      false
    );

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
        <br />
        bpm : {bpm}
      </div>
      <span
        ref={bpmTick}
        style={{
          position: "absolute",
          top: 15,
          right: 15,
          background: "#FFBB00",
          height: 15,
          width: 15,
          borderRadius: 7,
          display: "block",
        }}
      />
      <div
        style={{ position: "absolute", bottom: 5, right: 5, color: "white" }}
      >
        <p>Tiny midi test by med/mandarine</p>
      </div>
    </>
  );
}

export default App;
