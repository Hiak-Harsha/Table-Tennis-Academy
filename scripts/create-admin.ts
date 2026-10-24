import readline from 'readline'
import { PrismaClient } from '@prisma/client'
import { hashPassword, validatePasswordStrength } from '../src/lib/password'
import { normalizePhone, isValidPhone } from '../src/lib/phone'

const prisma = new PrismaClient()

function promptQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function parseArgs(): { phone?: string; loginId?: string; password?: string } {
  const args = process.argv.slice(2)
  const result: { phone?: string; loginId?: string; password?: string } = {}

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phone' && args[i + 1]) {
      result.phone = args[i + 1]
      i++
    } else if (args[i] === '--loginId' && args[i + 1]) {
      result.loginId = args[i + 1]
      i++
    } else if (args[i] === '--password' && args[i + 1]) {
      result.password = args[i + 1]
      i++
    }
  }

  return result
}

async function main() {
  console.log('--- TTA Academy: Create Administrator CLI ---')

  const parsed = parseArgs()
  let rawPhone = parsed.phone
  let loginId = parsed.loginId
  let password = parsed.password

  if (!rawPhone) {
    rawPhone = await promptQuestion('Enter admin phone number (10 digits e.g. 9876543210): ')
  }

  if (!isValidPhone(rawPhone)) {
    console.error('Error: Invalid phone number. Must be a valid Indian mobile number.')
    process.exit(1)
  }

  const phone = normalizePhone(rawPhone)

  if (!loginId) {
    loginId = await promptQuestion('Enter admin handle / login ID (optional, press Enter for default "admin"): ')
    if (!loginId) loginId = 'admin'
  }

  if (!password) {
    password = await promptQuestion('Enter admin password (min 8 characters): ')
  }

  const strengthCheck = validatePasswordStrength(password)
  if (!strengthCheck.valid) {
    console.error(`Error: Insecure password - ${strengthCheck.error}`)
    process.exit(1)
  }

  console.log(`Hashing password with bcrypt (cost 12)...`)
  const passwordHash = await hashPassword(password)

  console.log(`Connecting to database...`)
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ phone }, { loginId }],
    },
  })

  if (existing) {
    if (existing.role !== 'ADMIN') {
      console.warn(`User with identifier ${phone} exists with role "${existing.role}". Promoting to ADMIN...`)
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        phone,
        loginId,
        passwordHash,
        role: 'ADMIN',
      },
    })
    console.log(`✓ Admin user updated successfully: phone ${phone}, loginId "${loginId}", role ADMIN.`)
  } else {
    await prisma.user.create({
      data: {
        phone,
        loginId,
        passwordHash,
        role: 'ADMIN',
      },
    })
    console.log(`✓ New admin user created successfully: phone ${phone}, loginId "${loginId}".`)
  }
}

main()
  .catch((e) => {
    console.error('Failed to create admin user:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
