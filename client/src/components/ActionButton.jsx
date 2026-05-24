import { Link } from "react-router-dom";

const variants = {
  primary: "border-transparent bg-gradient-to-r from-[#071f3f] to-[#0b3a68] text-white shadow-sm shadow-slate-900/15 hover:from-[#08284f] hover:to-[#0e477e]",
  success: "border-transparent bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-sm shadow-emerald-900/15 hover:from-emerald-800 hover:to-teal-800",
  blue: "border-transparent bg-gradient-to-r from-blue-700 to-sky-700 text-white shadow-sm shadow-blue-900/15 hover:from-blue-800 hover:to-sky-800",
  emerald: "border-transparent bg-gradient-to-r from-emerald-700 to-green-700 text-white shadow-sm shadow-emerald-900/15 hover:from-emerald-800 hover:to-green-800",
  purple: "border-transparent bg-gradient-to-r from-indigo-700 to-violet-700 text-white shadow-sm shadow-indigo-900/15 hover:from-indigo-800 hover:to-violet-800",
  orange: "border-transparent bg-gradient-to-r from-amber-600 to-orange-700 text-white shadow-sm shadow-amber-900/15 hover:from-amber-700 hover:to-orange-800",
  slate: "border-transparent bg-slate-800 text-white shadow-sm shadow-slate-900/15 hover:bg-slate-900",
  dark: "border-transparent bg-zinc-900 text-white shadow-sm shadow-zinc-900/15 hover:bg-black",
  danger: "border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100",
  ghost: "border-slate-200/80 bg-white/90 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
  link: "bg-transparent text-[#0b3a68] hover:text-[#071f3f] px-0 py-0",
};

export default function ActionButton({
  to,
  href,
  state,
  type = "button",
  variant = "primary",
  disabled = false,
  onClick,
  children,
  className = "",
  title,
}) {
  const baseClass =
    variant === "link"
      ? `inline-flex items-center text-sm font-extrabold transition ${variants.link} ${className}`
      : `inline-flex min-h-10 items-center justify-center rounded-xl border px-4 py-2 text-sm font-extrabold tracking-tight transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
          variants[variant] || variants.primary
        } ${disabled ? "pointer-events-none cursor-not-allowed opacity-55 saturate-50" : "hover:-translate-y-0.5 hover:shadow-md"} ${className}`;

  if (to) {
    if (disabled) {
      return (
        <span className={baseClass} title={title} aria-disabled="true">
          {children}
        </span>
      );
    }

    return (
      <Link to={to} state={state} onClick={onClick} className={baseClass} title={title}>
        {children}
      </Link>
    );
  }

  if (href) {
    if (disabled) {
      return (
        <span className={baseClass} title={title} aria-disabled="true">
          {children}
        </span>
      );
    }

    return (
      <a href={href} onClick={onClick} className={baseClass} title={title}>
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={baseClass}
      title={title}
    >
      {children}
    </button>
  );
}
