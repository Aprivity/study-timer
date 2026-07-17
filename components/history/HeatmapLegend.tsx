export function HeatmapLegend() {
  return (
    <div className="heatmap-legend" aria-label="热力等级：0 分钟至 120 分钟及以上">
      <span>少</span>
      {[0, 1, 2, 3, 4].map((level) => (
        <i key={level} className={`heatmap-swatch level-${level}`} aria-hidden="true" />
      ))}
      <span>多</span>
      <small>0 · 1–29 · 30–59 · 60–119 · 120+ 分钟</small>
    </div>
  );
}
