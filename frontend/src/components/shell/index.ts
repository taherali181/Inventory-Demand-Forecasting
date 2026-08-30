/**
 * Layer 1 shell. Everything here traces to an exact value in design-reference/mockups/*.dc.html — see
 * each file's header comment for the source lines it came from.
 */

export { IconRail } from './IconRail';
export type { IconRailProps, RailIconName } from './IconRail';

export { TopHeader } from './TopHeader';
export type { TopHeaderProps } from './TopHeader';

export { MobileTopBar } from './MobileTopBar';
export type { MobileTopBarProps } from './MobileTopBar';

export {
  ShellProvider,
  useShell,
  useShellDispatch,
  shellReducer,
  initialShellState,
} from './ShellContext';
export type {
  ShellState,
  ShellAction,
  ShellContextValue,
  ShellProviderProps,
  Message,
  MessageRole,
  MessageAttachment,
  CanvasState,
  CanvasTab,
} from './ShellContext';
