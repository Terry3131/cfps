export default function ResponsiveGrid({
  children,
  columns = "auto",
  className = "",
}) {
  const columnClass =
    columns === 2
      ? "grid-cols-1 lg:grid-cols-2"
      : columns === 3
        ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        : columns === 4
          ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
          : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4";

  return (
    <div className={`grid min-w-0 max-w-full ${columnClass} gap-5 ${className}`}>
      {children}
    </div>
  );
}
