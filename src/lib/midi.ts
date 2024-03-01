import { WebMidi } from "webmidi";

let _options: any;

export const actionMidi = (e: any) => {
  const options = _options;
  debug(e, options);
  switch (e.type) {
    case "noteon":
      noteCallback(options?.notes, e, true);
      break;
    case "noteoff":
      noteCallback(options?.notes, e, false);
      break;
    case "pitchbend":
      if (options.pitchbend && typeof options.pitchbend === "function") {
        options.pitchbend(e.value);
      }
      break;
    case "controlchange":
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
      break;
  }
};

const noteCallback = (notes: any, e: any, aftertouch: boolean) => {
  if (notes) {
    for (let note in notes) {
      if (
        e.note.identifier.toLowerCase() === note.toLowerCase() &&
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

  if (
    (e.type === "noteon" || e.type === "noteoff") &&
    e.note.identifier.toLowerCase() === options.recordNote.toLowerCase()
  ) {
    console.log("skip recording", e.note.identifier); // skip if it's the record note
  } else if (options.record && typeof options.record === "function") {
    options.record(e);
  }
};

const getInfo = (input: any, options: any) => {
  if (options.debug) {
    console.log("\t" + input.name);
  }
  input.addListener("noteon", (e: any) => {
    actionMidi(e);
  });

  // aftertouch
  input.addListener("noteoff", (e: any) => {
    actionMidi(e);
  });

  // // Listen to pitch bend message on channel 3
  input.addListener("pitchbend", function (e: any) {
    actionMidi(e);
  });

  // Listen to control change message on all channels
  input.addListener("controlchange", (e: any) => {
    actionMidi(e);
  });

  // Listen to control change message on all channels
  input.addListener("programchange", (e: any) => {
    actionMidi(e);
  });
};

export async function startMidi(options: any) {
  await WebMidi.enable();
  _options = options;

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
