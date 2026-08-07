const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

// Use sqlite3 CLI or direct file manipulation via prisma
// Let's use the sqlite3 npm package via a temp script
const dbPath = path.join(__dirname, 'prisma', 'dev.db')

// Try with sqlite3 binary
try {
  const result = execSync(`sqlite3 "${dbPath}" "PRAGMA table_info(Student);"`, { encoding: 'utf8' })
  console.log('Current columns:', result)
  
  if (!result.includes('enrollmentStatus')) {
    execSync(`sqlite3 "${dbPath}" "ALTER TABLE Student ADD COLUMN enrollmentStatus TEXT NOT NULL DEFAULT 'ACTIVE';"`)
    console.log('✅ enrollmentStatus column added!')
  } else {
    console.log('Column already exists.')
  }
} catch (e) {
  console.log('sqlite3 not available:', e.message.substring(0, 100))
  
  // Try with better-sqlite3 if installed
  try {
    const Database = require('better-sqlite3')
    const db = new Database(dbPath)
    const cols = db.prepare("PRAGMA table_info(Student)").all()
    console.log('Columns:', cols.map(c => c.name).join(', '))
    
    if (!cols.find(c => c.name === 'enrollmentStatus')) {
      db.exec("ALTER TABLE Student ADD COLUMN enrollmentStatus TEXT NOT NULL DEFAULT 'ACTIVE'")
      console.log('✅ Column added!')
    } else {
      console.log('Column already exists.')
    }
    db.close()
  } catch (e2) {
    console.log('better-sqlite3 error:', e2.message.substring(0, 100))
  }
}
