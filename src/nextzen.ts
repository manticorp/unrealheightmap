import {format} from "./helpers";

const KEY = 'FOkBTi_OQyaSFYGMo5x_-Q';

export default class NextZen {
  static baseUrl: string =  "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png?api_key={key}";
  static tileWidth: number = 256;
  static tileHeight: number = 256;
  static getUrl(args : {x : number, y : number, z : number}) : string {
    return format(this.baseUrl, {...args, key: KEY});
  }
  static getApiKeyedUrl() {
    return format(this.baseUrl, {key: KEY});
  }
}