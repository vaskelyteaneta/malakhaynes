// Only one video on a page may have sound at a time. A page can hold several
// players — some autoplaying silently on a loop, some waiting for a click —
// and without a referee, unmuting one while another is already playing leaves
// two tracks running over each other.
//
// Whoever takes the audio tells the previous owner to give it up. What
// "giving up" means is the player's own business: an autoplaying video goes
// back to silent and keeps running, a click-to-play video pauses.

type YieldAudio = () => void;

let owner: YieldAudio | null = null;

/** Take the page's audio, telling whoever had it to stand down. */
export function claimAudio(yieldAudio: YieldAudio): void {
  if (owner && owner !== yieldAudio) owner();
  owner = yieldAudio;
}

/** Give up the audio, if this player still holds it. */
export function releaseAudio(yieldAudio: YieldAudio): void {
  if (owner === yieldAudio) owner = null;
}
