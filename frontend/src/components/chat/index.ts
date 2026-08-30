/**
 * Layer 2 chat surface. Everything here traces to an exact value in design-reference/mockups/*.dc.html —
 * see each file's header comment for the source lines it came from.
 */

export { UserBubble } from './UserBubble';
export type { UserBubbleProps } from './UserBubble';

export { AssistantMessage } from './AssistantMessage';
export type { AssistantMessageProps } from './AssistantMessage';

export { KPIStatGrid } from './KPIStatGrid';
export type { KPIStat, KPIStatGridProps } from './KPIStatGrid';

export { QuickPromptChips } from './QuickPromptChips';
export type { QuickPromptChipsProps } from './QuickPromptChips';

export { ChatInputDock } from './ChatInputDock';
export type {
  ChatInputDockProps,
  ChatInputDockHomeProps,
  ChatInputDockFollowupProps,
} from './ChatInputDock';

export { ConfirmActionCard } from './ConfirmActionCard';
export type { ConfirmActionCardProps } from './ConfirmActionCard';
