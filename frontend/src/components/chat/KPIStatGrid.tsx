import { Card, cn } from '../ui';

/**
 * KPIStatGrid — Layer 2 chat surface primitive. Only appears in the very first assistant message of a
 * session (Main.dc.html) — that placement decision belongs to Layer 4/the scripted-response table, this
 * component just renders whatever `stats` it's given.
 *
 * Verbatim from Main.dc.html:
 *   grid   display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; margin-top:4px;
 *   .stat  background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md);
 *          padding:14px 16px; display:flex; flex-direction:column; gap:6px;
 *          NOTE: padding is asymmetric (14px 16px) — the design brief's own `p-3.5` paraphrase is rounded
 *          off from this; built to the literal source value via `style`, not `p-3.5`.
 *   label  `.label` convention (mono uppercase, --text-3), unless `emphasis: 'warn'`.
 *   value  font-size:22px; font-family:mono; color:var(--text); font-weight:500.
 *
 *   The one emphasized tile ("Open alerts" in the mockup) prefixes its label with a 4×4 warn-colored
 *   square dot (`display:flex;align-items:center;gap:6px`, dot `flex-shrink:0`), colors the label
 *   `var(--warn)`, and renders its value `color:var(--warn); font-weight:700` instead of the default
 *   500-weight `--text`. Exposed generically as `emphasis: 'warn'` per stat (rather than hardcoding which
 *   tile gets it) so this component never bakes in the mockup's specific "Turnover / Stockout rate / Open
 *   alerts" copy — callers pass that content themselves.
 */

export interface KPIStat {
  label: string;
  value: string;
  /** 'warn' reproduces the mockup's "Open alerts" treatment: warn dot + warn label + bold warn value. */
  emphasis?: 'default' | 'warn';
}

export interface KPIStatGridProps {
  stats: KPIStat[];
  className?: string;
}

export function KPIStatGrid({ stats, className }: KPIStatGridProps) {
  return (
    <div className={cn('grid grid-cols-3 gap-2.5', className)} style={{ marginTop: 4 }}>
      {stats.map((stat, index) => {
        const isWarn = stat.emphasis === 'warn';
        return (
          <Card
            key={`${stat.label}-${index}`}
            radius="md"
            border="hairline"
            className="flex flex-col gap-1.5"
            style={{ padding: '14px 16px' }}
          >
            {isWarn ? (
              <div className="flex items-center gap-1.5">
                <div
                  style={{
                    width: 4,
                    height: 4,
                    background: 'rgb(var(--warn))',
                    flexShrink: 0,
                  }}
                />
                <span className="label" style={{ color: 'rgb(var(--warn))' }}>
                  {stat.label}
                </span>
              </div>
            ) : (
              <span className="label">{stat.label}</span>
            )}
            <span
              className="font-mono"
              style={{
                fontSize: 22,
                fontWeight: isWarn ? 700 : 500,
                color: isWarn ? 'rgb(var(--warn))' : 'rgb(var(--text))',
              }}
            >
              {stat.value}
            </span>
          </Card>
        );
      })}
    </div>
  );
}
