import { WebMidi } from "webmidi";

const getInfo = (input: any, options: any) => {
  console.log("\t" + input.name);
  input.addListener("noteon", (e: any) => {
    console.log("===========");
    console.log("attack", e.note.attack);
    console.log("note", `${e.note.identifier}-${e.note.octave}`);
  });

  // aftertouch
  input.addListener("noteoff", (e: any) => {
    console.log("===========");
    console.log("attack", e.note.attack);
    console.log("note", `${e.note.identifier}-${e.note.octave}`);
  });

  // // Listen to pitch bend message on channel 3
  input.addListener("pitchbend", function (e: any) {
    // console.log(e);
  });

  // Listen to control change message on all channels
  input.addListener("controlchange", (e: any) => {
    if (options.controllers && options.controllers.channels) {
      for (let chan in options.controllers.channels) {
        if (e.controller.number === parseInt(chan)) {
          options.controllers.channels[chan](e.value);
        }
      }
    }
  });

  // Listen to control change message on all channels
  input.addListener("programchange", (e: any) => {
    // console.log(e);
  });
};

export async function startMidi(options: any) {
  await WebMidi.enable();

  // List available inputs
  console.log("Available inputs: ");

  WebMidi.inputs.forEach((input) => {
    getInfo(input, options);
  });

  WebMidi.outputs.forEach((output) => {
    getInfo(output, options);
  });
}
