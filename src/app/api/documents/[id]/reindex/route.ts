import { createClient }   from '@/lib/supabase/server';
import { indexDocument }   from '@/lib/indexDocument';
import { NextResponse }    from 'next/server';

export function generateStaticParams() { return []; }

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['admin', 'mgr'].includes(profile.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // Fetch document record
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select('id, name, dept, storage_path, status')
    .eq('id', params.id)
    .single();

  if (docErr || !doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  if (!doc.storage_path) return NextResponse.json({ error: 'No storage path — file was never uploaded' }, { status: 400 });

  // Mark as processing
  await supabase.from('documents').update({ status: 'processing', chunks: 0 }).eq('id', doc.id);

  // Download file from storage
  const { data: fileData, error: dlErr } = await supabase.storage
    .from('documents')
    .download(doc.storage_path);

  if (dlErr || !fileData)
    return NextResponse.json({ error: `Storage download failed: ${dlErr?.message}` }, { status: 500 });

  const buffer = Buffer.from(await fileData.arrayBuffer());

  try {
    const { chunks } = await indexDocument(doc.id, doc.dept, buffer, doc.name, supabase);

    await supabase.from('audit_logs').insert({
      user_id: user.id, user_name: user.email,
      action: 'Document re-indexed', resource: doc.name,
      metadata: { chunks, dept: doc.dept },
    });

    return NextResponse.json({ success: true, chunks });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
