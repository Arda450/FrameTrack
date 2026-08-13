import type { LucideIcon } from "lucide-react";
import type { ComponentProps } from "react";

type AppIconProps = {
  icon: LucideIcon;
  size?: number;
} & Omit<ComponentProps<LucideIcon>, "ref">;

/** Einheitliches Lucide Icon mit App Standardgrösse. */
export function AppIcon({
  icon: Icon,
  size = 16,
  className,
  ...props
}: AppIconProps) {
  return (
    <Icon
      size={size}
      strokeWidth={2}
      aria-hidden
      className={["appIcon", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
