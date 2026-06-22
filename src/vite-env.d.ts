/// <reference types="vite/client" />

declare module "cubejs" {
  export default class Cube {
    constructor(state?: Cube | object);
    static initSolver(): void;
    static fromString(facelets: string): Cube;
    solve(maxDepth?: number): string;
    asString(): string;
    isSolved(): boolean;
  }
}

declare module "cubejs/lib/solve" {}
