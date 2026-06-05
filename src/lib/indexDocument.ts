/**
 * Shared pipeline: extract text → chunk → embed → store in document_chunks.
 * Used by both the upload route and the re-index route.
 */
import { chunkText }   from './chunker';
import { embedBatch }  from './embeddings';

type SupabaseClient = Awaited<ReturnType<typeof import('./supabase/server').createClient>>;

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    // pdfjs-dist v3 — CommonJS legacy build, works reliably in Node.js
    // serverExternalPackages keeps webpack from bundling this
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    // Point worker to the real file on disk so pdfjs-dist can spawn it
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve(
      'pdfjs-dist/legacy/build/pdf.worker.js'
    );

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const doc  = await loadingTask.promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page    = await doc.getPage(i);
      const content = await page.getTextContent();
      const text    = (content.items as { str: string }[])
        .map(item => item.str)
        .join(' ');
      pages.push(text);
    }
    return pages.join('\n\n');
  }

  if (ext === 'docx' || ext === 'doc') {
    const mammoth = await import('mammoth');
    const result  = await mammoth.extractRawText({ buffer });
    return result.value ?? '';
  }

  if (ext === 'txt') return buffer.toString('utf-8');

  return '';
}

export async function indexDocument(
  docId:    string,
  dept:     string,
  buffer:   Buffer,
  filename: string,
  supabase: SupabaseClient
): Promise<{ chunks: number }> {
  const rawText = await extractText(buffer, filename);

  if (!rawText.trim()) {
    await supabase.from('documents').update({ status: 'error', chunks: 0 }).eq('id', docId);
    throw new Error(`No extractable text in "${filename}". File may be image-based or corrupted.`);
  }

  const chunks = chunkText(rawText);
  if (!chunks.length) {
    await supabase.from('documents').update({ status: 'error', chunks: 0 }).eq('id', docId);
    throw new Error('Text extracted but produced zero chunks.');
  }

  const embeddings = await embedBatch(chunks);

  // Delete any previous chunks for this document (safe for re-index)
  await supabase.from('document_chunks').delete().eq('document_id', docId);

  const rows = chunks.map((content, i) => ({
    document_id: docId,
    dept,
    chunk_index: i,
    content,
    embedding: JSON.stringify(embeddings[i]),
  }));

  for (let i = 0; i < rows.length; i += 20) {
    const { error } = await supabase.from('document_chunks').insert(rows.slice(i, i + 20));
    if (error) throw new Error(`Chunk insert failed: ${error.message}`);
  }

  await supabase.from('documents')
    .update({ status: 'indexed', chunks: chunks.length })
    .eq('id', docId);

  return { chunks: chunks.length };
}
