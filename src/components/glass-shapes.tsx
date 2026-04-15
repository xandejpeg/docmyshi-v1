export function GlassShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="glass-shape glass-shape-1" style={{ top: "-80px", left: "-60px" }} />
      <div className="glass-shape glass-shape-2" style={{ top: "20%", right: "-30px" }} />
      <div className="glass-shape glass-shape-3" style={{ left: "60%", top: "10%" }} />
      <div className="glass-shape glass-shape-4" style={{ left: "35%", top: "0" }} />
      <div className="glass-shape glass-shape-5" style={{ left: "12%", bottom: "0" }} />
      <div className="glass-shape glass-shape-6" style={{ left: "75%", top: "55%" }} />
    </div>
  );
}
