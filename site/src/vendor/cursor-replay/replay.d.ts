export interface ReplayTarget {
    kind: 'rect' | 'text' | 'image';
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    src?: string;
    svg?: string;
    font?: string;
    fontSize?: number;
    fontWeight?: string;
    lineHeight?: string;
    letterSpacing?: string;
    textAlign?: string;
    fill?: string;
    border?: string;
    color?: string;
    radius?: string;
}
export interface ReplayOptions {
    duration?: number;
    cursors?: number;
    maxTargets?: number;
    colors?: string[];
    ink?: string;
    surface?: string;
    fullscreen?: boolean;
    reducedMotion?: 'auto' | 'skip' | 'play';
    onStart?: () => void;
    onComplete?: () => void;
}
export interface ReplayController {
    readonly playing: boolean;
    play(): Promise<void>;
    cancel(): void;
    destroy(): void;
}
export declare function collectTargets(root: HTMLElement, maxTargets?: number, fullscreen?: boolean): ReplayTarget[];
export declare function createCursorReplay(root?: HTMLElement, options?: ReplayOptions): ReplayController;
