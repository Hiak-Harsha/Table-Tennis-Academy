import { env } from '../env'

export interface SmsProvider {
  name: string
  sendOtp(phone: string, code: string): Promise<boolean>
}

/**
 * Development & testing provider that logs the OTP securely to the server console.
 * Strictly forbidden in production.
 */
export class ConsoleProvider implements SmsProvider {
  name = 'console'

  async sendOtp(phone: string, code: string): Promise<boolean> {
    if (env.NODE_ENV === 'production') {
      throw new Error('[SMS] ConsoleProvider is strictly forbidden in production. Configure a real SMS gateway.')
    }

    console.log(`\n======================================================`)
    console.log(`📲 [SMS CONSOLE DISPATCH]`)
    console.log(`Recipient: ${phone}`)
    console.log(`Security Code: ${code}`)
    console.log(`Valid for: 5 minutes`)
    console.log(`======================================================\n`)
    return true
  }
}

/**
 * MSG91 SMS Provider (India DLT Compliant)
 * Requirements for India:
 * - DLT Registration with Indian Telecom (TRAI)
 * - Approved Entity ID & Header (Sender ID, e.g., TTACAD)
 * - Approved Content Template with variable {#var#} for OTP
 */
export class Msg91Provider implements SmsProvider {
  name = 'msg91'
  private authKey: string
  private templateId: string

  constructor(authKey?: string, templateId?: string) {
    this.authKey = authKey || process.env.MSG91_AUTH_KEY || ''
    this.templateId = templateId || process.env.MSG91_TEMPLATE_ID || ''
  }

  async sendOtp(phone: string, code: string): Promise<boolean> {
    if (!this.authKey || !this.templateId) {
      console.error('[SMS MSG91] Missing MSG91_AUTH_KEY or MSG91_TEMPLATE_ID.')
      return false
    }

    // MSG91 expects mobile number without leading '+'
    const mobile = phone.replace(/^\+/, '')

    try {
      const response = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: this.authKey,
        },
        body: JSON.stringify({
          template_id: this.templateId,
          mobile: mobile,
          otp: code,
        }),
      })

      const data = await response.json()
      if (response.ok && data.type === 'success') {
        return true
      }
      console.error('[SMS MSG91] Gateway error response:', data)
      return false
    } catch (err) {
      console.error('[SMS MSG91] Failed to dispatch OTP:', err)
      return false
    }
  }
}

/**
 * Twilio Verify API Provider
 */
export class TwilioVerifyProvider implements SmsProvider {
  name = 'twilio'
  private accountSid: string
  private authToken: string
  private serviceSid: string

  constructor(accountSid?: string, authToken?: string, serviceSid?: string) {
    this.accountSid = accountSid || process.env.TWILIO_ACCOUNT_SID || ''
    this.authToken = authToken || process.env.TWILIO_AUTH_TOKEN || ''
    this.serviceSid = serviceSid || process.env.TWILIO_VERIFY_SERVICE_SID || ''
  }

  async sendOtp(phone: string, code: string): Promise<boolean> {
    if (!this.accountSid || !this.authToken || !this.serviceSid) {
      console.error('[SMS Twilio] Missing Twilio credentials.')
      return false
    }

    try {
      const endpoint = `https://verify.twilio.com/v2/Services/${this.serviceSid}/Verifications`
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')

      const body = new URLSearchParams()
      body.append('To', phone)
      body.append('Channel', 'sms')
      body.append('CustomCode', code)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      })

      return response.ok
    } catch (err) {
      console.error('[SMS Twilio] Failed to dispatch OTP:', err)
      return false
    }
  }
}

/**
 * Factory to return the configured SMS Provider
 */
export function getSmsProvider(): SmsProvider {
  const providerType = env.SMS_PROVIDER

  switch (providerType) {
    case 'msg91':
      return new Msg91Provider()
    case 'twilio':
      return new TwilioVerifyProvider()
    case 'console':
    default:
      return new ConsoleProvider()
  }
}
