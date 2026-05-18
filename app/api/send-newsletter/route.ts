import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { fetchArtikelen } from '@/lib/fetcher'
import { genereerNieuwsbrief } from '@/lib/generator'
import { getBronnen } from '@/lib/sources'

const resend = new Resend(process.env.RESEND_API_KEY!)

function isEersteMaandagVanMaand(): boolean {
  const nu = new Date()
  return nu.getDay() === 1 && nu.getDate() <= 7
}

async function stuurFoutmelding(onderwerp: string, regels: string[]) {
  const alertEmail = process.env.ALERT_EMAIL
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'brieft.online'
  if (!alertEmail) return

  const datum = new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })
  const lijstHTML = regels.map(r => `<li style="margin-bottom:6px">${r}</li>`).join('')

  await resend.emails.send({
    from: `Nieuwsbrief Alerts <newsletter@${emailDomein}>`,
    to: alertEmail,
    subject: `⚠️ ${onderwerp}`,
    html: `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border:1px solid #eee;border-radius:16px;padding:28px">
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
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ error: 'ADMIN_EMAIL niet ingesteld' }, { status: 500 })
  }
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'brieft.online'
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const { data: abonnees, error: dbFout } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, branche, organisatie, frequentie, bronnen, bronnen_gegenereerd_op, token, voorkeuren, land')
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

  const verzonden: string[] = []
  const overgeslagen: string[] = []
  const fouten: { email: string; reden: string }[] = []

  for (const abonnee of abonnees) {
    // Maandelijkse subscribers alleen in eerste week van de maand
    if (abonnee.frequentie === 'maandelijks' && !eersteWeek) {
      overgeslagen.push(abonnee.email)
      continue
    }

    try {
      // Bronnen regenereren als leeg of ouder dan 7 dagen
      let bronnen: { naam: string; url: string }[] = abonnee.bronnen ?? []
      const gegenereerd = abonnee.bronnen_gegenereerd_op ? new Date(abonnee.bronnen_gegenereerd_op) : null
      const zeveDagenGeleden = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const bronnenVerouderd = !gegenereerd || gegenereerd < zeveDagenGeleden

      if (bronnen.length === 0 || bronnenVerouderd) {
        console.log(`[cron] Bronnen regenereren voor ${abonnee.email}`)
        bronnen = await getBronnen(abonnee.vakgebied, {
          branche: abonnee.branche ?? undefined,
          extraOnderwerpen: abonnee.voorkeuren?.extraOnderwerpen ?? undefined,
          land: abonnee.land ?? 'NL',
        })
        if (bronnen.length > 0) {
          await supabase.from('subscribers').update({
            bronnen,
            bronnen_gegenereerd_op: new Date().toISOString(),
          }).eq('id', abonnee.id)
        }
      }

      if (bronnen.length === 0) {
        overgeslagen.push(abonnee.email)
        continue
      }

      const dagenTerug = abonnee.frequentie === 'maandelijks' ? 31 : 7
      const artikelen = await fetchArtikelen(bronnen, dagenTerug)
      const beheerUrl = `${baseUrl}/voorkeuren?token=${abonnee.token}`

      const resultaat = await genereerNieuwsbrief(
        artikelen,
        {
          naam: abonnee.naam,
          vakgebied: abonnee.vakgebied,
          branche: abonnee.branche ?? undefined,
          organisatie: abonnee.organisatie,
          land: abonnee.land ?? 'NL',
          voorkeuren: abonnee.voorkeuren ?? undefined,
        },
        beheerUrl
      )

      if (!resultaat) {
        overgeslagen.push(abonnee.email)
        continue
      }

      // Verstuur naar subscriber
      const { error: mailFout } = await resend.emails.send({
        from: `Regelgeving Nieuwsbrief <newsletter@${emailDomein}>`,
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
      console.log(`[cron] Verstuurd naar ${abonnee.email}`)

    } catch (err) {
      const reden = err instanceof Error ? err.message : String(err)
      console.error(`[cron] Fout bij ${abonnee.email}:`, reden)
      fouten.push({ email: abonnee.email, reden })
    }
  }

  if (fouten.length > 0) {
    await stuurFoutmelding(
      `Cron job: ${fouten.length} fout${fouten.length !== 1 ? 'en' : ''} bij versturen`,
      [
        `${verzonden.length} van ${abonnees.length} abonnees verwerkt. ${overgeslagen.length} overgeslagen, ${fouten.length} mislukt.`,
        `<strong>Mislukt voor:</strong>`,
        ...fouten.map(f => `${f.email} — <code style="font-size:12px">${f.reden}</code>`),
      ]
    )
  }

  return NextResponse.json({
    ok: true,
    verzonden: verzonden.length,
    overgeslagen: overgeslagen.length,
    fouten: fouten.length,
  })
}
