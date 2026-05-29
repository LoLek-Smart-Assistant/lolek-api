declare module 'fuse.js' {
  export interface FuseResult<T> {
    item: T;
    refIndex: number;
    score?: number;
  }

  export interface FuseOptions<T> {
    keys?: Array<keyof T | string>;
    includeScore?: boolean;
    threshold?: number;
    ignoreLocation?: boolean;
    minMatchCharLength?: number;
  }

  export default class Fuse<T> {
    constructor(list: readonly T[], options?: FuseOptions<T>);
    search(pattern: string): Array<FuseResult<T>>;
  }
}

