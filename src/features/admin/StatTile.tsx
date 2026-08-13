/** Small labelled counter used across the backoffice tools. */
export function StatTile({
  label,
  value,
  tone = "",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="truncate font-mono text-[10px] font-bold tracking-wider text-sub uppercase">
        {label}
      </p>
      {/* keyed by value so the number pops whenever the count changes */}
      <p
        key={value}
        className={`animate-lv-pop text-2xl font-extrabold tabular-nums ${tone}`}
      >
        {value}
      </p>
    </div>
  );
}
