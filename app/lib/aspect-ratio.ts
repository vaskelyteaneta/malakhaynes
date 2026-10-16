// Prismic stores an embed's dimensions as the oEmbed thumbnail size, which is
// rounded to whole pixels at about 426 wide — so a 1920x960 film comes back as
// 426x214, a ratio of 1.9907 rather than 2.0000. The player box is shaped from
// those numbers, so it ends up a hair taller than the film and Vimeo fills the
// difference with black bars.
//
// Snap to a standard ratio when the stored one is within 1% of it. Anything
// genuinely unusual is left exactly as supplied.
const STANDARD_RATIOS = [1, 4 / 3, 3 / 2, 16 / 9, 1.85, 2, 2.35, 2.39, 3 / 4, 2 / 3, 9 / 16];

export function snapAspectRatio(width: number, height: number): number {
  const wOverH = width / height;
  const match = STANDARD_RATIOS.find((r) => Math.abs(wOverH - r) / r < 0.01);
  // Returned as height/width, which is how the players size their boxes.
  return match ? 1 / match : height / width;
}
