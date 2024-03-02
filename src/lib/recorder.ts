export type events = {
  e: any;
  time: number;
};

export type tape = {
  duration: number;
  repeater: number;
  events: Array<events>;
};
