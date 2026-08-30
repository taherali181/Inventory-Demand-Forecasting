import type { ReactNode } from 'react';
import { AssistantMessage, ConfirmActionCard, KPIStatGrid, UserBubble } from '../components/chat';
import type { KPIStat } from '../components/chat';
import type { Message } from '../components/shell';

/**
 * MessageLog — Layer 4. Renders a `ShellState.messages` array as alternating UserBubble/AssistantMessage
 * entries, switching each message's own `attachment` (see `lib/scriptedResponses.tsx`) to the matching
 * Layer 2 widget. Shared between the desktop wide-chat-home layout, the narrow ChatWithCanvas column, and
 * (in its `mobile` variant) the Mobile screen.
 *
 * The `kpi-grid` attachment's `data` is real, fetched stats (`useDashboardKpiStats`, wired in `App.tsx`'s
 * greeting-seeding effect) — not the mockup's hardcoded sample numbers. `FALLBACK_KPI_STATS` only covers
 * the brief window before that fetch resolves (or if it fails), so the grid never renders with no data at
 * all; every value in it is the same "—" a null KPI already renders as elsewhere in this app, never a
 * fabricated number.
 */

const FALLBACK_KPI_STATS: KPIStat[] = [
  { label: 'Turnover', value: '—' },
  { label: 'Stockout rate', value: '—' },
  { label: 'Open alerts', value: '—', emphasis: 'warn' },
];

export interface MessageLogProps {
  messages: Message[];
  variant?: 'desktop' | 'mobile';
  /** 'hero' for the wide home layout's opening line, 'body' for the narrow ChatWithCanvas column. */
  assistantSize?: 'hero' | 'body';
  /** Outer gap between messages. Default 22 (ChatWithCanvas); pass 28 for the wide home layout. */
  messageGap?: number;
  /** AssistantMessage's own internal (label-row-to-body) gap. Default 16. */
  assistantInnerGap?: number;
  onConfirmPrimary?: (messageId: string) => void;
  onConfirmSecondary?: (messageId: string) => void;
  className?: string;
}

export function MessageLog({
  messages,
  variant = 'desktop',
  assistantSize = 'body',
  messageGap = 22,
  assistantInnerGap = 16,
  onConfirmPrimary,
  onConfirmSecondary,
  className,
}: MessageLogProps) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: messageGap }}>
      {messages.map((message) => {
        if (message.role === 'user') {
          // User messages are always plain typed/clicked text by construction (see DesktopShell's
          // `appendMessages`) — `UserBubble.text` stays `string` since the mockups never show a user
          // bubble with inline emphasis, unlike assistant replies.
          return <UserBubble key={message.id} text={message.text as string} variant={variant} />;
        }

        return (
          <AssistantMessage
            key={message.id}
            text={message.text}
            timestamp={variant === 'mobile' ? undefined : message.timestamp}
            variant={variant}
            size={assistantSize}
            gap={assistantInnerGap}
          >
            {message.attachment?.type === 'kpi-grid' ? (
              <KPIStatGrid stats={(message.attachment.data as { stats?: KPIStat[] } | undefined)?.stats ?? FALLBACK_KPI_STATS} />
            ) : null}
            {message.attachment?.type === 'confirm-po' ? (
              <ConfirmActionCard
                title={(message.attachment.data as { title: string }).title}
                body={(message.attachment.data as { body: ReactNode }).body}
                primaryLabel={(message.attachment.data as { primaryLabel: string }).primaryLabel}
                secondaryLabel={(message.attachment.data as { secondaryLabel: string }).secondaryLabel}
                onPrimaryClick={() => onConfirmPrimary?.(message.id)}
                onSecondaryClick={() => onConfirmSecondary?.(message.id)}
              />
            ) : null}
          </AssistantMessage>
        );
      })}
    </div>
  );
}
