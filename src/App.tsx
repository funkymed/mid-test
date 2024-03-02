import * as THREE from "three";
import { useEffect, useRef, useState } from "react";
import TWEEN from "@tweenjs/tween.js";
import { GlitchMode } from "postprocessing"; // https://github.com/pmndrs/postprocessing
import Emittery from "emittery";
import Scene3D from "./Scene3D";
import "./App.css";
import { actionMidi, startMidi } from "./lib/midi";
import { getRandomItem } from "./lib/utils";
import { events, tape } from "./lib/recorder";

Emittery.isDebugEnabled = true;
let emitter = new Emittery({ debug: { name: "myEmitter1" } });

emitter.on("saucisse", (data) => {
  console.log(data);
});

var BPM: any = require("bpm");
const getRandomOffset: any = (arr: Array<any>, current: any): any => {
  const off = Math.floor(Math.random() * arr.length);
  return off !== current ? off : getRandomOffset(arr, current);
};

let noteTweens: any = [];
let timeFly: THREE.Clock;
let isRecording: boolean = false;
let tapeOffset: number = 0;
let magneto: Array<tape> = [];
let isLoopActivated: boolean = true;
let speed: number = 500;
let scene: Scene3D;

var b = new BPM();

const colors = [
  0xacb6e5, 0x74ebd5, 0xffbb00, 0x00bbff, 0xff00ff, 0xffff00, 0xff5555,
  0xff55ff, 0x00bbff, 0x55ff55, 0x5555ff,
];
const notes = ["C3", "D3", "E3", "F3", "G3", "A3", "B3"];

function init() {
  scene = new Scene3D(notes, colors);
}

function App() {
  const [pos, setPos] = useState(0);
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [bpm, setBpm] = useState(0);
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
      scene.noteObjects[n].intensity = attack;
      callbackNote(n, attack, aftertouch);
    }
  };
  const callbackNote = (note: any, attack: any, aftertouch: any) => {
    const twn = noteTweens[note];
    if (twn) {
      TWEEN.remove(twn);
    }
    const msh: THREE.RectAreaLight = scene.noteObjects[note];
    if (msh) {
      if (aftertouch) {
        msh.intensity = attack;
        msh.height = attack * 50;
      } else {
        noteTweens[note] = new TWEEN.Tween(scene.noteObjects[note])
          .to({ intensity: 0, height: 0 }, 1000)
          .easing(TWEEN.Easing.Sinusoidal.InOut)
          .end()
          .start();
      }
    }
  };

  const megaLightFlash = (value: any) => {
    scene.megaLight.intensity = 0.3;
    new TWEEN.Tween(scene.megaLight)
      .to({ intensity: 0 }, 1000)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .end()
      .start();
  };

  const backFlash = (note: any, attack: any, aftertouch: any) => {
    if (aftertouch) {
      const color = note === "C2" ? getRandomItem(colors) : 0xffffff;
      scene.scene.background = new THREE.Color(color);
      new TWEEN.Tween(scene.scene)
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

    scene.updateAnimation(time, speed);
    requestRef.current = requestAnimationFrame(animationLoop);
  };

  const tapeBPM = (note: any, attack: any, aftertouch: any) => {
    if (aftertouch) {
      setBpm(b.tap().avg);
    }
  };
  const glitchNote = (note: any, attack: any, aftertouch: any) => {
    scene.glitch.mode = GlitchMode.CONSTANT_WILD;
    setTimeout(() => {
      scene.glitch.mode = GlitchMode.DISABLED;
    }, 300);
  };

  const ambiantCallback = (value: any) => {
    scene.ambientLight.intensity = value * 3;
  };

  const resetRecorder = (note: any, attack: any, aftertouch: any) => {
    if (!aftertouch) {
      emitter.emit("saucisse", "resetPos");
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
      magneto[tapeOffset].events.push({
        time: timeFly.getElapsedTime(),
        e,
      });
    }
  };

  const pixelateNote = (note: any, attack: any, aftertouch: any) => {
    scene.pixelate.granularity = 64;
    noteTweens[note] = new TWEEN.Tween(scene.pixelate)
      .to({ granularity: 0 }, 300)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .start();
  };

  const bloomNote = (note: any, attack: any, aftertouch: any) => {
    scene.bloom.intensity = 20;
    noteTweens[note] = new TWEEN.Tween(scene.bloom)
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
        <br />
        bpm : {bpm}
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
