// To run: `npm run watch-circuits`
//
// This script watches our .circom files, and checks when their contents change.
// By importing the resulting circuit-hashes.json file into our tests, watch mode will trigger auto re-runs from updated circuits.
// (Unfortunately, we can't just watch the .circom files directly, because the test files actually touch them too (during compile), which triggers an infinite loop. See https://github.com/erhant/circomkit/issues/120)

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import prevHashes from './circuit-hashes.json'
const prev = prevHashes as Record<string, string>

// ANSI color codes
const RESET = '\x1b[0m'
const YELLOW = '\x1b[33m'
const GRAY = '\x1b[90m'

export function hashFile(path: string): string {
  const data = readFileSync(path)
  const hash = createHash('sha256')
  hash.update(data)
  return hash.digest('hex').slice(0, 10)
}

let changed = []

// Build map of hashes
const hashes: Record<string, string> = {}
const files = readdirSync('./circuits').filter((f) => f.endsWith('.circom'))
for (const file of files) {
  const hash = hashFile('./circuits/' + file)
  if (hash !== prev[file]) changed.push(file)
  hashes[file] = hash
}

// Only write to the file if the hashes have changed
if (changed.length > 0) {
  console.log(
    `${
      GRAY +
      new Date().toLocaleTimeString().replace(' AM', 'a').replace(' PM', 'p') +
      YELLOW
    } ${changed.join(', ') + RESET}`
  )
  writeFileSync('./ts/circuit-hashes.json', JSON.stringify(hashes, null, 2))
}
