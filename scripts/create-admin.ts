import readline from 'readline'
import { PrismaClient } from '@prisma/client'
import { hashPassword, validatePasswordStrength } from '../src/lib/password'

const prisma = new PrismaClient()

function promptQuestion(query: string, hidden = false): Promise<string> {
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

function parseArgs(): { phone?: string; password?: string } {
  const args = process.argv.slice(2)
  const result: { phone?: string; password?: string } = {}

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--phone' && args[i + 1]) {
      result.phone = args[i + 1]
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
  let phone = parsed.phone
  let password = parsed.password

  if (!phone) {
    phone = await promptQuestion('Enter admin phone number (10 digits): ')
  }

  if (!phone || !/^\d{10}$/.test(phone)) {
    console.error('Error: Invalid phone number. Must be exactly 10 digits.')
    process.exit(1)
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
  const existing = await prisma.user.findUnique({
    where: { phone },
  })

  if (existing) {
    if (existing.role !== 'ADMIN') {
      console.warn(`User with phone ${phone} exists with role "${existing.role}". Promoting to ADMIN...`)
    }
    await prisma.user.update({
      where: { phone },
      data: {
        passwordHash,
        role: 'ADMIN',
      },
    })
    console.log(`✓ Admin user for ${phone} updated successfully with new password and ADMIN role.`)
  } else {
    await prisma.user.create({
      data: {
        phone,
        passwordHash,
        role: 'ADMIN',
      },
    })
    console.log(`✓ New admin user created successfully for phone ${phone}.`)
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
