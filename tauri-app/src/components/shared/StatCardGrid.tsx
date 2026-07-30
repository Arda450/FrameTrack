export type StatCardItem = {
  label: string;
  value: string;
};

type StatCardGridProps = {
  items: StatCardItem[];
  ariaLabel: string;
};

export function StatCardGrid({ items, ariaLabel }: StatCardGridProps) {
  return (
    <div className="overviewStatCards" aria-label={ariaLabel}>
      {items.map((item) => (
        <article key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </article>
      ))}
    </div>
  );
}
