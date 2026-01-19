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

declare module '@wordpress/block-editor' {
  import { ComponentType, ReactNode } from 'react';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const BlockEditorProvider: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const BlockList: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const BlockTools: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const WritingFlow: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const ObserveTyping: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const BlockInspector: ComponentType<any>;
}

declare module '@wordpress/components' {
  import { ComponentType, ReactNode } from 'react';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Popover: ComponentType<any> & { Slot: ComponentType<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const SlotFillProvider: ComponentType<{ children?: ReactNode }>;
}
