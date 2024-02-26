import { WebMidi } from "webmidi";

const noteCallback = (notes: any, e: any, aftertouch: boolean) => {
  if (notes) {
    for (let note in notes) {
      if (
        `${e.note.identifier}-${e.note.octave}`.toLowerCase() ===
          note.toLowerCase() &&
        typeof notes[note] === "function"
      ) {
        notes[note](note, e.note.attack, aftertouch);
      }
    }
  }
};

const debug = (e: any, options: any) => {
  if (options.debug) {
    console.log(e);
  }
};

const getInfo = (input: any, options: any) => {
  if (options.debug) {
    console.log("\t" + input.name);
  }
  input.addListener("noteon", (e: any) => {
    noteCallback(options?.notes, e, true);
  });

  // aftertouch
  input.addListener("noteoff", (e: any) => {
    debug(e, options);
    noteCallback(options?.notes, e, false);
  });

  // // Listen to pitch bend message on channel 3
  input.addListener("pitchbend", function (e: any) {
    debug(e, options);
    if (options.pitchbend && typeof options.pitchbend === "function") {
      options.pitchbend(e.value);
    }
  });

  // Listen to control change message on all channels
  input.addListener("controlchange", (e: any) => {
    debug(e, options);
    if (options.controllers && options.controllers.channels) {
      for (let chan in options.controllers.channels) {
        if (
          e.controller.number === parseInt(chan) &&
          typeof options.controllers.channels[chan] === "function"
        ) {
          options.controllers.channels[chan](e.value);
        }
      }
    }
  });

  // Listen to control change message on all channels
  input.addListener("programchange", (e: any) => {
    debug(e, options);
  });
};

export async function startMidi(options: any) {
  await WebMidi.enable();

  if (options.debug) {
    console.log("Available inputs: ");
  }

  WebMidi.inputs.forEach((input) => {
    getInfo(input, options);
  });

  WebMidi.outputs.forEach((output) => {
    getInfo(output, options);
  });
}
