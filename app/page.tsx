import Dashboard from "./components/Dashboard";

// Server Component (default). It only hands off to the Client island that
// owns all interactive state. This keeps the bundle for the shell minimal.
export default function Page() {
  return (
    <main className="relative isolate">
      {/* Decorative atmospheric layers */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 grid-drift opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(34,233,255,0.08), transparent 50%)",
        }}
      />

      <Dashboard />
    </main>
  );
}
