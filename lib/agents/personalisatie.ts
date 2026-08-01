import { Resend } from 'resend'
import type { RedactieItem } from './redactie'
import { buildHTML, bepaalTaal, type Profiel } from '@/lib/generator'
import { logAgentRun, timer } from './logging'

// Personalisatie & verzend-agent (automatiseringsplan domein 1, agent 5).
// Verwerkt alleen items die de kwaliteitscontrole-agent heeft goedgekeurd.

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function personalisatieEnVerzendAgent(
  goedgekeurdeItems: RedactieItem[],
  onderwerp: string,
  profiel: Profiel,
  beheerUrl: string,
  emailDomein: string,
  emailAdres: string,
  subscriberId: string,
  opties?: { dryRun?: boolean }
): Promise<{ verzonden: boolean; html?: string; reden?: string }> {
  const stop = timer()

  if (goedgekeurdeItems.length === 0) {
    await logAgentRun({
      agent: 'personalisatie',
      inputRef: subscriberId,
      status: 'mislukt',
      reden: 'geen goedgekeurde items na kwaliteitscontrole',
      durationMs: stop(),
    })
    return { verzonden: false, reden: 'geen goedgekeurde items' }
  }

  const impactVolgorde: Record<string, number> = { hoog: 0, gemiddeld: 1, laag: 2 }
  const gesorteerd = [...goedgekeurdeItems].sort(
    (a, b) => (impactVolgorde[a.impact] ?? 1) - (impactVolgorde[b.impact] ?? 1)
  )

  const taal = profiel.voorkeuren?.taal || bepaalTaal(profiel.land)
  const html = buildHTML({ onderwerp, items: gesorteerd }, profiel, beheerUrl, taal)

  if (opties?.dryRun) {
    await logAgentRun({
      agent: 'personalisatie',
      inputRef: subscriberId,
      output: { aantalItems: gesorteerd.length, dryRun: true },
      status: 'gelukt',
      durationMs: stop(),
    })
    return { verzonden: false, html }
  }

  try {
    const { error } = await resend.emails.send({
      from: `Regelgeving Nieuwsbrief <newsletter@${emailDomein}>`,
      to: emailAdres,
      subject: onderwerp,
      html,
    })
    if (error) throw new Error(JSON.stringify(error))

    await logAgentRun({
      agent: 'personalisatie',
      inputRef: subscriberId,
      output: { aantalItems: gesorteerd.length },
      status: 'gelukt',
      durationMs: stop(),
    })
    return { verzonden: true }
  } catch (err) {
    const reden = err instanceof Error ? err.message : String(err)
    await logAgentRun({
      agent: 'personalisatie',
      inputRef: subscriberId,
      status: 'mislukt',
      reden,
      durationMs: stop(),
    })
    return { verzonden: false, reden }
  }
}
