const getRandomOffset: any = (arr: Array<any>, current: any): any => {
  const off = Math.floor(Math.random() * arr.length);
  return off !== current ? off : getRandomOffset(arr, current);
};
export const getRandomItem: any = (arr: Array<any>): any => {
  return arr[getRandomOffset(arr, -1)];
};
