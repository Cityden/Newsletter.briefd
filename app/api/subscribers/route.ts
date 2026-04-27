import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { getBronnen } from '@/lib/sources'

const resend = new Resend(process.env.RESEND_API_KEY!)

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { naam, email, vakgebied, organisatie, frequentie } = body

  if (!naam || !email || !vakgebied || !organisatie || !frequentie) {
    return NextResponse.json({ error: 'Verplichte velden ontbreken' }, { status: 400 })
  }

  // Lengtelimieten — voorkomt oversized Claude-prompts en database-misbruik
  if (naam.length > 100) return NextResponse.json({ error: 'Naam te lang (max 100 tekens)' }, { status: 400 })
  if (vakgebied.length > 100) return NextResponse.json({ error: 'Vakgebied te lang (max 100 tekens)' }, { status: 400 })
  if (email.length > 254) return NextResponse.json({ error: 'E-mailadres te lang' }, { status: 400 })

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Ongeldig e-mailadres' }, { status: 400 })
  }

  if (!['zzp', 'mkb', 'groot', 'overheid'].includes(organisatie)) {
    return NextResponse.json({ error: 'Ongeldig organisatietype' }, { status: 400 })
  }

  if (!['wekelijks', 'maandelijks'].includes(frequentie)) {
    return NextResponse.json({ error: 'Ongeldige frequentie' }, { status: 400 })
  }

  // Haal bronnen op — als Claude API down is, gaan we door met lege lijst
  let bronnen: { naam: string; url: string }[] = []
  try {
    bronnen = await getBronnen(vakgebied)
  } catch (err) {
    console.error('getBronnen mislukt:', err)
    // Aanmelding gaat door; bronnen worden bij volgende cron regenereerd
  }

  const { data, error } = await supabase
    .from('subscribers')
    .upsert({
      naam,
      email,
      vakgebied,
      organisatie,
      frequentie,
      actief: true,
      bronnen,
      bronnen_gegenereerd_op: new Date().toISOString(),
    }, { onConflict: 'email' })
    .select('token')
    .single()

  if (error || !data) {
    console.error('Supabase upsert error:', error)
    return NextResponse.json({ error: 'Aanmelden mislukt' }, { status: 500 })
  }

  // Stuur bevestigingsmail — fout hier mag aanmelding niet blokkeren
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'resend.dev'
  const beheerUrl = `${baseUrl}/voorkeuren?token=${data.token}`

  const { error: mailFout } = await resend.emails.send({
    from: `Regelgeving Nieuwsbrief <onboarding@${emailDomein}>`,
    to: email,
    subject: `Welkom ${escapeHtml(naam)} — je aanmelding is bevestigd`,
    html: bevestigingsmail({ naam, vakgebied, frequentie, beheerUrl }),
  })

  if (mailFout) {
    // Aanmelding is gelukt, maar bevestigingsmail niet verstuurd — log het
    console.error('Bevestigingsmail mislukt:', mailFout)
  }

  return NextResponse.json({ ok: true })
}

function bevestigingsmail({ naam, vakgebied, frequentie, beheerUrl }: {
  naam: string
  vakgebied: string
  frequentie: string
  beheerUrl: string
}): string {
  const veiligNaam = escapeHtml(naam)
  const veiligVakgebied = escapeHtml(vakgebied)
  const frequentieTekst = frequentie === 'wekelijks'
    ? 'elke maandag om 08:00'
    : 'aan het begin van elke maand'

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">

    <div style="margin-bottom:24px">
      <div style="font-size:13px;font-weight:500;color:#534AB7;margin-bottom:4px">Regelgeving nieuwsbrief</div>
    </div>

    <div style="background:#fff;border:1px solid #eee;border-radius:16px;padding:32px">

      <div style="font-size:28px;margin-bottom:16px">✓</div>
      <h1 style="font-size:22px;font-weight:700;color:#1a1a1a;margin:0 0 8px">
        Welkom, ${veiligNaam}!
      </h1>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px">
        Je aanmelding voor de regelgeving nieuwsbrief is bevestigd.
        Je ontvangt voortaan een persoonlijke samenvatting van relevante
        wetswijzigingen, uitspraken en beleidsupdates op het gebied van
        <strong>${veiligVakgebied}</strong>.
      </p>

      <div style="background:#f7f7f5;border-radius:10px;padding:16px 20px;margin-bottom:24px">
        <div style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px">Wat je kunt verwachten</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="font-size:14px;color:#333;line-height:1.5">
            📅 <strong>Wanneer:</strong> ${frequentieTekst}
          </div>
          <div style="font-size:14px;color:#333;line-height:1.5">
            🎯 <strong>Inhoud:</strong> alleen updates die relevant zijn voor jouw vakgebied en organisatie
          </div>
          <div style="font-size:14px;color:#333;line-height:1.5">
            🔗 <strong>Bronnen:</strong> uitsluitend officiële overheids- en EU-publicaties
          </div>
          <div style="font-size:14px;color:#333;line-height:1.5">
            ✍️ <strong>Samengesteld door:</strong> AI op basis van actuele bronnen, elke editie opnieuw
          </div>
        </div>
      </div>

      <a href="${beheerUrl}" style="display:block;text-align:center;background:#534AB7;color:#fff;font-size:14px;font-weight:500;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:16px">
        Voorkeuren bekijken of wijzigen
      </a>

      <p style="font-size:12px;color:#aaa;text-align:center;line-height:1.6;margin:0">
        Via de knop hierboven kun je je vakgebied, organisatietype en frequentie
        altijd aanpassen.<br>
        <a href="${beheerUrl}?uitschrijven=1" style="color:#aaa">Uitschrijven</a>
      </p>

    </div>

    <div style="text-align:center;margin-top:20px">
      <div style="font-size:11px;color:#bbb">Regelgeving Nieuwsbrief · Persoonlijke juridische updates</div>
    </div>

  </div>
</body>
</html>`
}
