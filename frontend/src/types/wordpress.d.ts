declare module '@wordpress/blocks' {
  export function registerBlockType(name: string, settings: object): void;
  export function createBlock(name: string, attributes?: object): object;
  export function serialize(blocks: object[]): string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function parse(content: string): any[];
}

declare module '@wordpress/block-library' {
  export function registerCoreBlocks(): void;
}
