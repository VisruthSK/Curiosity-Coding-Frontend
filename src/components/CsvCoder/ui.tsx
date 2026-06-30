import type { ComponentChildren, JSX } from "preact";

export const styles = {
  brand: "text-sm font-medium text-blue-700 dark:text-blue-300",
  card:
    "rounded-lg border border-stone-200 bg-white shadow-soft dark:border-neutral-800 dark:bg-neutral-900",
  field:
    "w-full rounded-lg border border-stone-300 bg-white text-neutral-950 shadow-sm transition focus:border-blue-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-blue-500",
  interactiveSurface:
    "transition hover:border-blue-600 hover:bg-blue-50 dark:hover:border-blue-500 dark:hover:bg-blue-950/30",
  link:
    "text-blue-700 underline decoration-blue-600/45 underline-offset-4 transition hover:text-blue-800 hover:decoration-blue-800 dark:text-blue-300 dark:decoration-blue-500/70 dark:hover:text-blue-200 dark:hover:decoration-blue-300",
  mutedLink:
    "text-sm text-neutral-600 underline decoration-stone-300 underline-offset-4 transition hover:text-blue-700 hover:decoration-blue-600 dark:text-neutral-400 dark:decoration-neutral-700 dark:hover:text-blue-200 dark:hover:decoration-blue-500",
  primaryButton:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-950 bg-neutral-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-md active:translate-y-0 dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-950 dark:hover:border-blue-100 dark:hover:bg-blue-100",
  secondaryButton:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-3 text-sm font-semibold text-neutral-800 transition hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-50 hover:shadow-sm active:translate-y-0 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800",
  smallSecondaryButton:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-neutral-800 transition hover:-translate-y-0.5 hover:border-stone-400 hover:bg-stone-50 hover:shadow-sm active:translate-y-0 dark:border-neutral-700 dark:text-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-800",
  statusActive:
    "inline-flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200",
  statusInactive:
    "inline-flex items-center gap-1 rounded border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400",
};

const iconClassNames = {
  checkCircle: "check-circle",
  chevronLeft: "chevron-left",
  chevronRight: "chevron-right",
  chevronDown: "chevron-down",
  circle: "circle",
  copy: "copy",
  download: "download",
  fileText: "file-text",
  externalLink: "external-link",
  flag: "flag",
  listChecks: "list-checks",
  rotateCcw: "rotate-ccw",
  upload: "upload",
  keyboard: "keyboard",
  ellipsis: "ellipsis",
  lightbulb: "lightbulb",
  minus: "minus",
  moon: "moon",
  sun: "sun",
  square: "square",
  x: "x",
} as const;

const iconPaths = {
  checkCircle: [
    ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335" }],
    ["path", { d: "m9 11 3 3L22 4" }],
  ],
  chevronLeft: [["path", { d: "m15 18-6-6 6-6" }]],
  chevronRight: [["path", { d: "m9 18 6-6-6-6" }]],
  chevronDown: [["path", { d: "m6 9 6 6 6-6" }]],
  circle: [["circle", { cx: "12", cy: "12", r: "10" }]],
  copy: [
    ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2" }],
    ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" }],
  ],
  download: [
    ["path", { d: "M12 15V3" }],
    ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
    ["path", { d: "m7 10 5 5 5-5" }],
  ],
  fileText: [
    ["path", { d: "M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z" }],
    ["path", { d: "M14 2v5a1 1 0 0 0 1 1h5" }],
    ["path", { d: "M10 9H8" }],
    ["path", { d: "M16 13H8" }],
    ["path", { d: "M16 17H8" }],
  ],
  externalLink: [
    ["path", { d: "M15 3h6v6" }],
    ["path", { d: "M10 14 21 3" }],
    ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }],
  ],
  flag: [
    ["path", { d: "M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528" }],
  ],
  listChecks: [
    ["path", { d: "M13 5h8" }],
    ["path", { d: "M13 12h8" }],
    ["path", { d: "M13 19h8" }],
    ["path", { d: "m3 17 2 2 4-4" }],
    ["path", { d: "m3 7 2 2 4-4" }],
  ],
  rotateCcw: [
    ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }],
    ["path", { d: "M3 3v5h5" }],
  ],
  upload: [
    ["path", { d: "M12 3v12" }],
    ["path", { d: "m17 8-5-5-5 5" }],
    ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }],
  ],
  keyboard: [
    ["path", { d: "M10 8h.01" }],
    ["path", { d: "M12 12h.01" }],
    ["path", { d: "M14 8h.01" }],
    ["path", { d: "M16 12h.01" }],
    ["path", { d: "M18 8h.01" }],
    ["path", { d: "M6 8h.01" }],
    ["path", { d: "M7 16h10" }],
    ["path", { d: "M8 12h.01" }],
    ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }],
  ],
  ellipsis: [
    ["circle", { cx: "12", cy: "12", r: "1" }],
    ["circle", { cx: "19", cy: "12", r: "1" }],
    ["circle", { cx: "5", cy: "12", r: "1" }],
  ],
  lightbulb: [
    ["path", { d: "M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" }],
    ["path", { d: "M9 18h6" }],
    ["path", { d: "M10 22h4" }],
  ],
  minus: [["path", { d: "M5 12h14" }]],
  moon: [["path", { d: "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" }]],
  sun: [
    ["circle", { cx: "12", cy: "12", r: "4" }],
    ["path", { d: "M12 2v2" }],
    ["path", { d: "M12 20v2" }],
    ["path", { d: "m4.93 4.93 1.41 1.41" }],
    ["path", { d: "m17.66 17.66 1.41 1.41" }],
    ["path", { d: "M2 12h2" }],
    ["path", { d: "M20 12h2" }],
    ["path", { d: "m6.34 17.66-1.41 1.41" }],
    ["path", { d: "m19.07 4.93-1.41 1.41" }],
  ],
  square: [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }]],
  x: [
    ["path", { d: "M18 6 6 18" }],
    ["path", { d: "m6 6 12 12" }],
  ],
} as const;

export type IconName = keyof typeof iconPaths;

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Icon({ className, name, size = 18 }: { className?: string; name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className={cx("lucide", `lucide-${iconClassNames[name]}`, className)}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
    >
      {iconPaths[name].map(([tagName, attributes], index) => {
        const Element = tagName;

        return <Element key={`${name}-${index}`} {...attributes} />;
      })}
    </svg>
  );
}

type ButtonVariant = "primary" | "secondary" | "secondarySmall";

type ButtonProps = Omit<JSX.IntrinsicElements["button"], "className"> & {
  className?: string;
  children: ComponentChildren;
  variant?: ButtonVariant;
};

export function Button({ children, className, type = "button", variant = "secondary", ...props }: ButtonProps) {
  const variantClass =
    variant === "primary"
      ? styles.primaryButton
      : variant === "secondarySmall"
        ? styles.smallSecondaryButton
        : styles.secondaryButton;

  return (
    <button className={cx(variantClass, className)} type={type} {...props}>
      {children}
    </button>
  );
}

export function BrandLabel({ label = "Curiosity Coding Interface" }: { label?: string }) {
  return <p className={styles.brand}>{label}</p>;
}

export function FieldLabel({ children, htmlFor }: { children: ComponentChildren; htmlFor: string }) {
  return (
    <label className="block text-sm font-medium text-neutral-800 dark:text-neutral-200" htmlFor={htmlFor}>
      {children}
    </label>
  );
}

export function StatusPill({ active, activeText, inactiveText }: { active: boolean; activeText: string; inactiveText: string }) {
  return (
    <span className={active ? styles.statusActive : styles.statusInactive}>
      <Icon name={active ? "checkCircle" : "circle"} size={14} />
      {active ? activeText : inactiveText}
    </span>
  );
}
