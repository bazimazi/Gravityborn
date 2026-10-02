import type { RegionDefinition } from '../content/regions';

/** Static, low-contrast environmental storytelling. It never adds collision geometry. */
export function drawScenery(
  context: CanvasRenderingContext2D,
  region: RegionDefinition,
  lowQuality: boolean,
  highContrast: boolean,
): void {
  const scenery = region.scenery;
  if (!scenery) return;
  context.save();
  context.beginPath();
  context.rect(50, 50, 1100, 700);
  context.clip();
  context.strokeStyle = region.accent;
  context.fillStyle = region.accent;
  context.globalAlpha = highContrast ? 0.035 : 0.12;
  context.lineWidth = 2;
  for (const mark of scenery.marks.slice(0, lowQuality ? 6 : 24)) {
    context.beginPath();
    if (mark.kind === 'line')
      mark.points.forEach((point, index) =>
        index ? context.lineTo(point.x, point.y) : context.moveTo(point.x, point.y),
      );
    else if (mark.kind === 'arc') context.arc(mark.x, mark.y, mark.radius, mark.start, mark.end);
    else context.ellipse(mark.x, mark.y, mark.rx, mark.ry, mark.rotation, 0, Math.PI * 2);
    context.stroke();
  }
  context.globalAlpha = highContrast ? 0.025 : 0.045;
  context.font = '600 44px ui-monospace, monospace';
  context.textAlign = 'center';
  context.fillText(scenery.watermark, 600, 416);
  context.restore();
}
