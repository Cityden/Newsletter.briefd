import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { fetchArtikelen } from '@/lib/fetcher'
import { genereerNieuwsbrief } from '@/lib/generator'

const resend = new Resend(process.env.RESEND_API_KEY!)

function isEersteMaandagVanMaand(): boolean {
  const nu = new Date()
  return nu.getDay() === 1 && nu.getDate() <= 7
}

// ── Foutmail sturen naar beheerder ────────────────────────────────────────
async function stuurFoutmelding(onderwerp: string, regels: string[]) {
  const alertEmail = process.env.ALERT_EMAIL
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'resend.dev'
  if (!alertEmail) return

  const datum = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })
  const lijstHTML = regels.map(r => `<li style="margin-bottom:6px">${r}</li>`).join('')

  await resend.emails.send({
    from: `Nieuwsbrief Alerts <onboarding@${emailDomein}>`,
    to: alertEmail,
    subject: `⚠️ ${onderwerp}`,
    html: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border:1px solid #eee;border-radius:16px;padding:28px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <div style="background:#FCEBEB;border-radius:8px;padding:8px 12px;font-size:20px">⚠️</div>
        <div>
          <div style="font-size:11px;font-weight:500;color:#888;text-transform:uppercase;letter-spacing:0.05em">Regelgeving Nieuwsbrief</div>
          <div style="font-size:16px;font-weight:600;color:#1a1a1a">${onderwerp}</div>
        </div>
      </div>
      <div style="font-size:13px;color:#666;margin-bottom:16px">${datum}</div>
      <ul style="font-size:14px;color:#333;line-height:1.6;padding-left:20px;margin:0">
        ${lijstHTML}
      </ul>
    </div>
  </div>
</body>
</html>`,
  }).catch(e => console.error('[alert] Foutmail zelf mislukt:', e))
}

// ── Cron job ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET niet ingesteld' }, { status: 500 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const eersteWeek = isEersteMaandagVanMaand()

  // ── Subscribers ophalen ────────────────────────────────────────────────
  const { data: abonnees, error: dbFout } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, organisatie, frequentie, bronnen, token')
    .eq('actief', true)

  if (dbFout || !abonnees) {
    const melding = dbFout?.message ?? 'Geen data teruggekomen'
    console.error('[cron] Supabase fetch mislukt:', melding)
    await stuurFoutmelding('Cron job mislukt — database fout', [
      `De cron job kon geen subscribers ophalen uit Supabase.`,
      `Fout: <code>${melding}</code>`,
    ])
    return NextResponse.json({ error: 'Database fout' }, { status: 500 })
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? ''
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'resend.dev'
  const verzonden: string[] = []
  const overgeslagen: string[] = []
  const fouten: { email: string; reden: string }[] = []

  // ── Per abonnee verwerken ──────────────────────────────────────────────
  for (const abonnee of abonnees) {
    if (abonnee.frequentie === 'maandelijks' && !eersteWeek) {
      overgeslagen.push(abonnee.email)
      continue
    }

    const bronnen: { naam: string; url: string }[] = abonnee.bronnen ?? []
    if (bronnen.length === 0) {
      overgeslagen.push(abonnee.email)
      continue
    }

    try {
      const dagenTerug = abonnee.frequentie === 'maandelijks' ? 31 : 7
      const artikelen = await fetchArtikelen(bronnen, dagenTerug)
      const beheerUrl = `${baseUrl}/voorkeuren?token=${abonnee.token}`
      const resultaat = await genereerNieuwsbrief(
        artikelen,
        { naam: abonnee.naam, vakgebied: abonnee.vakgebied, organisatie: abonnee.organisatie },
        beheerUrl
      )

      if (!resultaat) {
        overgeslagen.push(abonnee.email)
        continue
      }

      const { error: mailFout } = await resend.emails.send({
        from: `Regelgeving Nieuwsbrief <onboarding@${emailDomein}>`,
        to: abonnee.email,
        subject: resultaat.onderwerp,
        html: resultaat.html,
      })

      if (mailFout) {
        throw new Error(`Resend fout: ${JSON.stringify(mailFout)}`)
      }

      await supabase.from('nieuwsbrief_log').insert({
        subscriber_id: abonnee.id,
        onderwerp: resultaat.onderwerp,
        status: 'verstuurd',
      })

      await supabase
        .from('subscribers')
        .update({ laatste_mail_op: new Date().toISOString() })
        .eq('id', abonnee.id)

      verzonden.push(abonnee.email)

    } catch (err) {
      const reden = err instanceof Error ? err.message : String(err)
      console.error(`[cron] Fout bij ${abonnee.email}:`, reden)
      fouten.push({ email: abonnee.email, reden })
    }
  }

  // ── Foutmelding sturen als er fouten zijn ──────────────────────────────
  if (fouten.length > 0) {
    const regels = [
      `${verzonden.length} van ${verzonden.length + fouten.length} nieuwsbrieven verstuurd.`,
      `<strong>Mislukt voor:</strong>`,
      ...fouten.map(f => `${f.email} — <code style="font-size:12px">${f.reden}</code>`),
    ]
    await stuurFoutmelding(
      `Cron job: ${fouten.length} fout${fouten.length !== 1 ? 'en' : ''} bij versturen`,
      regels
    )
  }

  return NextResponse.json({
    ok: true,
    verzonden: verzonden.length,
    overgeslagen: overgeslagen.length,
    fouten: fouten.length,
  })
}
