import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)

// Gedeelde mail-shell voor alle proactieve meldingen vanuit de agent-architectuur.
// Voorheen zat dit alleen lokaal in send-newsletter/route.ts (stuurFoutmelding) —
// nu herbruikt door watchdog, herziening en groeirapport zodat er één plek is
// om de opmaak aan te passen.

function shell(datum: string, lijstHTML: string): string {
  return `<!DOCTYPE html>
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
</html>`
}

function nu(): string {
  return new Date().toLocaleString('nl-NL', { timeZone: 'Europe/Amsterdam' })
}

/** Voor problemen: watchdog-escalaties, mislukte cron-runs, herzieningsagent-rectificaties. */
export async function stuurAlertMail(onderwerp: string, regels: string[]): Promise<void> {
  const alertEmail = process.env.ALERT_EMAIL
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'brieft.online'
  if (!alertEmail) return

  const lijstHTML = regels.map(r => `<li style="margin-bottom:6px">${r}</li>`).join('')

  await resend.emails.send({
    from: `Nieuwsbrief Alerts <newsletter@${emailDomein}>`,
    to: alertEmail,
    subject: `⚠️ ${onderwerp}`,
    html: shell(nu(), lijstHTML),
  }).catch(e => console.error('[alert] Alertmail zelf mislukt:', e))
}

/** Voor periodieke rapportages die geen probleem zijn, bv. het maandelijkse groeirapport. */
export async function stuurRapportMail(onderwerp: string, regels: string[]): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  const emailDomein = process.env.EMAIL_DOMEIN ?? 'brieft.online'
  if (!adminEmail) return

  const lijstHTML = regels.map(r => `<li style="margin-bottom:6px">${r}</li>`).join('')

  await resend.emails.send({
    from: `Nieuwsbrief Rapportage <newsletter@${emailDomein}>`,
    to: adminEmail,
    subject: `📊 ${onderwerp}`,
    html: shell(nu(), lijstHTML),
  }).catch(e => console.error('[rapport] Rapportmail zelf mislukt:', e))
}
