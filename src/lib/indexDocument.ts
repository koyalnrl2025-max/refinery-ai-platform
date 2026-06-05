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
    // pdf2json: pure-JS PDF parser, no workers, no canvas — works in any Node.js context
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const PDFParser = require('pdf2json');
    return new Promise<string>((resolve, reject) => {
      const parser = new PDFParser(null, 1); // 1 = raw text content mode
      parser.on('pdfParser_dataReady', () => {
        try {
          // getRawTextContent() returns decoded text with form-feed page breaks
          const raw: string = parser.getRawTextContent();
          // Clean up: remove page-break markers and normalise whitespace
          const text = raw
            .replace(/\f/g, '\n\n')            // form feed → paragraph break
            .replace(/\r\n/g, '\n')
            .replace(/[ \t]{2,}/g, ' ')
            .trim();
          resolve(text);
        } catch (e) {
          reject(e);
        }
      });
      parser.on('pdfParser_dataError', (err: unknown) => {
        const msg = typeof err === 'object' && err !== null && 'parserError' in err
          ? String((err as { parserError: unknown }).parserError)
          : String(err);
        reject(new Error(`PDF parse failed: ${msg}`));
      });
      parser.parseBuffer(buffer);
    });
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
