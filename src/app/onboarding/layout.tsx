export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--bg-root)" }}
    >
      {/* Ambient glow — gold radial gradients for premium feel */}
      <div className="ambient-glow-top" />
      <div className="ambient-glow-bottom" />

      {/* Content layer — above ambient glow */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
