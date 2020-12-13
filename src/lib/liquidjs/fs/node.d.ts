export declare function exists(filepath: string): Promise<boolean>;
export declare function readFile(filepath: string): Promise<string>;
export declare function existsSync(filepath: string): boolean;
export declare function readFileSync(filepath: string): string;
export declare function resolve(root: string, file: string, ext: string): string;
export declare function fallback(file: string): string | undefined;
