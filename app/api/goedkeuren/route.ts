// Goedkeur-endpoint — aangeroepen via de link in de vrijdag-conceptmail.
// Geen login vereist: de batch_token is het bewijs van identiteit.
// Geeft een HTML-pagina terug zodat het werkt bij direct klikken vanuit een mail.

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function html(titel: string, bericht: string, kleur: string): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${titel} — Brieft</title>
  <style>
    body { margin:0; padding:0; background:#0a0a0a; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; }
    .card { background:#111; border:1px solid #1e1e1e; border-radius:16px; padding:40px; max-width:420px; text-align:center; }
    .dot { width:48px; height:48px; border-radius:50%; background:${kleur}22; border:2px solid ${kleur}44; display:flex; align-items:center; justify-content:center; margin:0 auto 20px; font-size:22px; }
    h1 { font-size:20px; color:#f0f0ee; margin:0 0 12px; font-weight:600; }
    p { font-size:14px; color:#555; line-height:1.6; margin:0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="dot">${kleur === '#4ade80' ? '✓' : '✗'}</div>
    <h1>${titel}</h1>
    <p>${bericht}</p>
  </div>
</body>
</html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return html('Ongeldige link', 'Er ontbreekt een token in de URL.', '#f87171')

  const { data: concepten, error } = await supabase
    .from('concept_nieuwsbrieven')
    .select('id, status')
    .eq('batch_token', token)

  if (error || !concepten || concepten.length === 0) {
    return html('Niet gevonden', 'Deze goedkeurlink bestaat niet of is verlopen.', '#f87171')
  }

  const alleAlVerzonden = concepten.every(c => c.status === 'verzonden')
  if (alleAlVerzonden) {
    return html('Al verstuurd', 'Deze nieuwsbrieven zijn al maandag verstuurd.', '#4ade80')
  }

  const { error: updateFout } = await supabase
    .from('concept_nieuwsbrieven')
    .update({ status: 'goedgekeurd' })
    .eq('batch_token', token)
    .in('status', ['in_afwachting'])

  if (updateFout) {
    return html('Fout', `Kon de goedkeuring niet opslaan: ${updateFout.message}`, '#f87171')
  }

  const aantal = concepten.filter(c => c.status === 'in_afwachting').length
  return html(
    'Goedgekeurd',
    `${aantal} nieuwsbrief${aantal !== 1 ? 'ven zijn' : ' is'} goedgekeurd en wordt maandagochtend om 8:00 verstuurd.`,
    '#4ade80'
  )
}
