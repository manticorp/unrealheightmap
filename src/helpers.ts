export const format = (str : string, obj : Record<string, string|number>) : string => {
  for (let [key, value] of Object.entries(obj)) {
    str = str.replace(`{${key}}`, value.toString());
  }
  return str;
};