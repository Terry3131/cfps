export default function SearchBox({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
}) {
  return (
    <div className={`relative w-full md:w-[30rem] ${className}`}>
      <label htmlFor="search-box" className="sr-only">
        Search
      </label>
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
        SRCH
      </span>

      <input
        id="search-box"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-16 pr-4 text-sm font-semibold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#071f3f] focus:ring-4 focus:ring-blue-950/10"
      />
    </div>
  );
}
