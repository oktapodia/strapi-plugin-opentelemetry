import { NormalizeConfig } from '../config/types';
export declare const normalizePath: (path: string, normalize: NormalizeConfig | undefined, context: {
    method: string;
}) => string;
export declare const shouldIgnorePath: (path: string, ignorePaths: string[]) => boolean;
