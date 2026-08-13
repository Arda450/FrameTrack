import type { ReactNode } from "react";

type OverviewChartViewButtonProps = {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
};

/** Umschaltknopf zwischen Zeitstatistik und Periodenberichten. */
export function OverviewChartViewButton({
  active,
  onClick,
  children,
}: OverviewChartViewButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`chartViewBtn${active ? " chartViewBtnActive" : ""}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
