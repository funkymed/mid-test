// @ts-check
import * as THREE from "three";
import { tape, events } from "../types/tape";

export default class Recorder {
  private timeFly: THREE.Clock = new THREE.Clock();
  private isRecording: boolean = false;
  private tapeOffset: number = 0;
  private magneto: Array<tape> = [];
  private isLoopActivated: boolean = true;
  private actionMidi: Function;

  constructor(actionMidi: Function) {
    this.actionMidi = actionMidi;
  }

  resetRecorder(note: any, attack: any, aftertouch: any) {
    if (!aftertouch) {
      // emitter.emit("saucisse", "resetPos");
      for (let man of this.magneto) {
        window.clearInterval(man.repeater);
      }
      this.magneto = [];
    }
  }

  recordAndPlay(note: any, attack: any, aftertouch: any) {
    if (aftertouch && !this.isRecording) {
      for (let r in this.magneto) {
        const man: tape = this.magneto[r];
        window.clearInterval(man.repeater);
        if (man.events.length === 0) {
          delete this.magneto[r];
        }
      }

      // start recording
      this.isRecording = true;
      this.timeFly = new THREE.Clock();
      this.timeFly.start();
      this.tapeOffset = this.magneto.length;
    } else if (this.isRecording) {
      // play
      this.isRecording = false;
      if (this.timeFly) {
        this.timeFly.stop();
        this.magneto[this.tapeOffset].duration = this.timeFly.elapsedTime;
      }

      // restart replay
      console.log("restart replay");
      for (let tape of this.magneto) {
        if (tape.events.length > 0) {
          this.playTape(tape);
        }
      }
    }
  }

  playTape(tape: tape) {
    window.clearInterval(tape.repeater);
    tape.repeater = window.setInterval(
      this.playEvents.bind(this),
      tape.duration * 1000,
      tape.events
    );
    this.playEvents(tape.events);
  }

  playEvents(events: any) {
    for (let data of events) {
      setTimeout(this.actionMidi, data.time * 1000, data.e);
    }
  }

  record(e: any) {
    if (this.isRecording) {
      if (!this.magneto[this.tapeOffset]) {
        this.magneto[this.tapeOffset] = {
          duration: 0,
          events: [],
          repeater: 0,
        };
      }
      this.magneto[this.tapeOffset].events.push({
        time: this.timeFly.getElapsedTime(),
        e,
      });
    }
  }
}
