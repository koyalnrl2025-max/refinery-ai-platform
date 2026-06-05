const OLLAMA_URL    = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
const EMBED_MODEL   = 'nomic-embed-text';
const EMBED_DIM     = 768;

export async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/v1/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });

  if (!res.ok) throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);

  const data = await res.json();
  const embedding: number[] = data.data?.[0]?.embedding;
  if (!embedding || embedding.length !== EMBED_DIM) {
    throw new Error(`Unexpected embedding shape: got ${embedding?.length}, want ${EMBED_DIM}`);
  }
  return embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  // Ollama processes one at a time — run sequentially to avoid memory spikes
  const results: number[][] = [];
  for (const text of texts) {
    results.push(await embedText(text));
  }
  return results;
}
