const CHUNK_SIZE = 1400;  // characters (~350 tokens)
const OVERLAP    = 200;   // characters overlap between chunks

export function chunkText(text: string): string[] {
  // Normalise whitespace but keep paragraph breaks as split points
  const normalised = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (normalised.length === 0) return [];
  if (normalised.length <= CHUNK_SIZE) return [normalised];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalised.length) {
    const end = Math.min(start + CHUNK_SIZE, normalised.length);
    let splitAt = end;

    if (end < normalised.length) {
      // Prefer paragraph break
      const parBreak = normalised.lastIndexOf('\n\n', end);
      if (parBreak > start + CHUNK_SIZE / 2) {
        splitAt = parBreak + 2;
      } else {
        // Fall back to sentence boundary
        const sentBreak = normalised.lastIndexOf('. ', end);
        if (sentBreak > start + CHUNK_SIZE / 2) {
          splitAt = sentBreak + 2;
        }
      }
    }

    const chunk = normalised.slice(start, splitAt).trim();
    if (chunk.length > 60) chunks.push(chunk);

    start = splitAt - OVERLAP;
    if (start <= 0 || splitAt >= normalised.length) break;
  }

  return chunks;
}
