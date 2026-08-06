import { Info } from "lucide-react";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AppIcon } from "./AppIcon";

type Props = {
  /** Kurzbeschreibung für Screenreader (z. B. Hilfe zum Zeitverlauf). */
  label: string;
  children: ReactNode;
  className?: string;
};

const VIEWPORT_MARGIN = {
  top: 12,
  right: 24,
  bottom: 12,
  left: 16,
};
const TRIGGER_GAP = 8;
const RIGHT_EDGE_BIAS = 0.72;

/**
 * Dezenter Info-Button mit Tooltip - für optionale Erklärungen statt langer Grautexte.
 * Der Tooltip wird per Portal positioniert und bleibt im sichtbaren Bereich.
 */
export function InfoHint({ label, children, className }: Props) {
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const rootClassName = ["infoHint", className].filter(Boolean).join(" ");

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) {
      setPosition(null);
      return;
    }

    const triggerRect = trigger.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();

    let top = triggerRect.top - bubbleRect.height - TRIGGER_GAP;
    let left =
      triggerRect.left + triggerRect.width / 2 - bubbleRect.width / 2 - 6;

    if (top < VIEWPORT_MARGIN.top) {
      top = triggerRect.bottom + TRIGGER_GAP;
    }

    const maxLeft =
      window.innerWidth - bubbleRect.width - VIEWPORT_MARGIN.right;
    if (triggerRect.left > window.innerWidth * RIGHT_EDGE_BIAS) {
      left = triggerRect.right - bubbleRect.width - 8;
    }

    left = Math.max(VIEWPORT_MARGIN.left, Math.min(left, maxLeft));
    top = Math.max(
      VIEWPORT_MARGIN.top,
      Math.min(
        top,
        window.innerHeight - bubbleRect.height - VIEWPORT_MARGIN.bottom,
      ),
    );

    setPosition({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition, children]);

  const tooltip =
    open &&
    createPortal(
      <span
        ref={bubbleRef}
        id={tooltipId}
        role="tooltip"
        className="infoHintBubble infoHintBubble--open"
        style={{
          left: position?.left ?? -9999,
          top: position?.top ?? -9999,
          visibility: position ? "visible" : "hidden",
        }}
      >
        {children}
      </span>,
      document.body,
    );

  return (
    <span className={rootClassName}>
      <button
        ref={triggerRef}
        type="button"
        className="infoHintTrigger"
        aria-label={label}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        <AppIcon icon={Info} size={14} />
      </button>
      {tooltip}
    </span>
  );
}
