import { createHash } from 'crypto'

export function sessionToken(adminPassword: string): string {
  return createHash('sha256').update(adminPassword + 'session').digest('hex')
}
