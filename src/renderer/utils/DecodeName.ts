export const decodeName = (name: string): string => {
  let res = name;
  let changed = false;
  do {
    try {
      const decodedName = decodeURIComponent(res);
      changed = res !== decodedName;
      res = decodedName;
    } catch (e) {
      break;
    }
  } while (changed);

  return res;
};
