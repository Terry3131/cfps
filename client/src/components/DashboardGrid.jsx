export default function DashboardGrid({
  children,
  variant = "cards",
  className = "",
}) {
  const variants = {
    cards: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
    charts: "grid-cols-1 xl:grid-cols-2",
    wide: "grid-cols-1",
    three: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  };

  return (
    <div className={`grid min-w-0 max-w-full ${variants[variant] || variants.cards} gap-5 ${className}`}>
      {children}
    </div>
  );
}
