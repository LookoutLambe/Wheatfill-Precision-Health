import crypto from 'node:crypto'

function requireKey() {
  const raw = (process.env.APP_ENCRYPTION_KEY || '').trim()
  if (!raw) throw new Error('APP_ENCRYPTION_KEY is required to store secrets.')
  const buf = Buffer.from(raw, raw.length >= 43 ? 'base64' : 'utf8')
  if (buf.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be 32 bytes (or base64 for 32 bytes).')
  return buf
}

export function encryptSecret(plaintext: string): { enc: string; iv: string; tag: string } {
  const key = requireKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const enc = Buffer.concat([cipher.update(Buffer.from(plaintext, 'utf8')), cipher.final()])
  const tag = cipher.getAuthTag()
  return { enc: enc.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64') }
}

export function decryptSecret(input: { enc: string; iv: string; tag: string }): string {
  const key = requireKey()
  const iv = Buffer.from(input.iv, 'base64')
  const tag = Buffer.from(input.tag, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(Buffer.from(input.enc, 'base64')), decipher.final()])
  return pt.toString('utf8')
}

