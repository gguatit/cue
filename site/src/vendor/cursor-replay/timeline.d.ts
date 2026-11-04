export interface ReplayStep {
    index: number;
    cursor: number;
    moveStart: number;
    moveEnd: number;
    boxStart: number;
    textStart: number;
}
export declare const clamp: (value: number, min: number, max: number) => number;
export declare function buildSteps(count: number, duration: number, cursors: number): ReplayStep[];
export declare const easeOutCubic: (value: number) => number;
export declare const lerp: (from: number, to: number, progress: number) => number;
