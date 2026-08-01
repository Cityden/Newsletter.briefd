import { Resend } from 'resend'
import { supabase } from '@/lib/supabase'
import { uitlegVakgebied } from '@/lib/generator'
import { logAgentRun, timer } from './logging'

// Onboarding-agent (automatiseringsplan domein 2 — marketing & groei).
//
// De bestaande bevestigingsmail bij aanmelding (app/api/subscribers/route.ts)
// is al mail 1 van de reeks. Deze agent is mail 2: een dag-3 vervolgmail met
// concrete context over het vakgebied, zodat abonnees niet pas bij de eerste
// nieuwsbrief zien wat ze kunnen verwachten. Dagelijkse cron, verstuurt alleen
// aan wie er klaar voor is (aangemeld_op <= 3 dagen geleden, stap nog niet gezet).

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function onboardingAgent(): Promise<{ verstuurd: number }> {
  const stop = timer()
  const drieDagenGeleden = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'brieft.online'

  const { data: subs, error } = await supabase
    .from('subscribers')
    .select('id, naam, email, vakgebied, token')
    .eq('actief', true)
    .eq('onboarding_stap', 0)
    .lte('aangemeld_op', drieDagenGeleden)
    .limit(50)

  if (error || !subs) {
    await logAgentRun({
      agent: 'onboarding',
      inputRef: 'day3-batch',
      status: 'mislukt',
      reden: error?.message,
      durationMs: stop(),
    })
    return { verstuurd: 0 }
  }

  let verstuurd = 0
  let fouten = 0

  for (const sub of subs) {
    try {
      const context = uitlegVakgebied(sub.vakgebied)
      const { error: mailFout } = await resend.emails.send({
        from: `Regelgeving Nieuwsbrief <newsletter@${emailDomein}>`,
        to: sub.email,
        subject: `Zo haal je het meeste uit je nieuwsbrief over ${sub.vakgebied}`,
        html: dag3Mail(sub.naam, sub.vakgebied, context),
      })
      if (mailFout) throw new Error(JSON.stringify(mailFout))

      await supabase.from('subscribers').update({ onboarding_stap: 1 }).eq('id', sub.id)
      verstuurd++
    } catch (err) {
      fouten++
      console.error(`[onboarding] mislukt voor ${sub.email}:`, err)
      // Bewust geen agent_runs-entry per subscriber — te fijnmazig voor een batch-mail;
      // het totaal (verstuurd/fouten) wordt hieronder in één run gelogd.
    }
  }

  await logAgentRun({
    agent: 'onboarding',
    inputRef: 'day3-batch',
    output: { kandidaten: subs.length, verstuurd, fouten },
    status: fouten > 0 ? 'geëscaleerd' : 'gelukt',
    reden: fouten > 0 ? `${fouten} van ${subs.length} dag-3 mails mislukt` : undefined,
    durationMs: stop(),
  })

  return { verstuurd }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function dag3Mail(naam: string, vakgebied: string, context: string): string {
  const veiligNaam = escapeHtml(naam)
  const veiligVakgebied = escapeHtml(vakgebied)

  return `<!DOCTYPE html>
<html lang="nl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f7f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:#fff;border:1px solid #eee;border-radius:16px;padding:32px">
      <h1 style="font-size:20px;font-weight:700;color:#1a1a1a;margin:0 0 12px">
        Hoi ${veiligNaam},
      </h1>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 20px">
        Je krijgt binnenkort je eerste volledige nieuwsbrief over <strong>${veiligVakgebied}</strong>.
        We volgen daarvoor onder meer: ${context}.
      </p>
      <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 20px">
        Elk item in je nieuwsbrief komt met een directe link naar de officiële bron, zodat je zelf
        kunt doorklikken naar de wet, uitspraak of beleidstekst waar het op gebaseerd is.
      </p>
      <p style="font-size:12px;color:#aaa;line-height:1.6;margin:0">
        Wil je je vakgebied of frequentie nog aanpassen? Dat kan altijd via de voorkeurenlink
        onderaan elke nieuwsbrief.
      </p>
    </div>
  </div>
</body>
</html>`
}
