import { Circomkit, type WitnessTester, type CircomkitConfig } from 'circomkit'

import fs from 'fs'
import path from 'path'
import { type ChunkedPoint } from '../circuits/ed25519/utils.ts'

const configFilePath = path.resolve('circomkit.json')
const config = JSON.parse(
  fs.readFileSync(configFilePath, 'utf-8')
) as CircomkitConfig

export const circomkit = new Circomkit({
  ...config,
  verbose: false,
})

/**
 * Convert a string to a bigint
 * @param s - the string to convert
 * @returns the bigint representation of the string
 */
export const str2BigInt = (s: string): bigint =>
  BigInt(parseInt(Buffer.from(s).toString('hex'), 16))

/**
 * Generate a random number within a certain threshold
 * @param upper - the upper bound
 * @returns the random index
 */
export const generateRandomIndex = (upper: number): number =>
  Math.floor(Math.random() * (upper - 1))

/** Get a signal from the circuit
 * @param circuit - the circuit object
 * @param witness - the witness
 * @param name - the name of the signal
 * @returns the signal value
 */
export const getSignal = async (
  tester: WitnessTester,
  witness: bigint[],
  name: string
): Promise<unknown> => {
  const prefix = 'main'
  // E.g. the full name of the signal "root" is "main.root"
  // You can look up the signal names using `circuit.getDecoratedOutput(witness))`
  const signalFullName = `${prefix}.${name}`

  const out = await tester.readWitness(witness, [signalFullName])
  return out[signalFullName]
}

/** Get a ChunkedPoint signal from the circuit
 * @param tester - the circuit tester
 * @param witness - the witness
 * @param name - the base name of the signal (e.g., 'R' for 'R[0][0]')
 * @returns the signal values as a ChunkedPoint (4 coordinates, each split into 3 85-bit chunks)
 */
export const getChunkedPointSignal = async (
  tester: WitnessTester,
  witness: bigint[],
  name: string
): Promise<ChunkedPoint> => {
  const [rows, cols] = [4, 3]
  const result: bigint[][] = Array(rows)
    .fill(null)
    .map(() => [])

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const signalName = `${name}[${i}][${j}]`
      const value = await getSignal(tester, witness, signalName)
      result[i][j] = BigInt(String(value))
    }
  }

  return result as ChunkedPoint
}
