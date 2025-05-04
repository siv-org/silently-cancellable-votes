import { Circomkit, type WitnessTester, type CircomkitConfig } from 'circomkit'
import fs from 'fs'
import path from 'path'

const configFilePath = path.resolve('circomkit.json')
const config = JSON.parse(
  fs.readFileSync(configFilePath, 'utf-8')
) as CircomkitConfig

export const circomkit = new Circomkit({
  ...config,
  verbose: false,
})

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

export type XYZTPoint = [bigint, bigint, bigint, bigint]

/** A 255-bit bigint, split into 3 85-bit bigints (85 * 3 = 255) */
type Chunk = [bigint, bigint, bigint]

/** 4 chunks, corresponding to XYZT coordinates */
export type ChunkedPoint = [Chunk, Chunk, Chunk, Chunk]

function padWithZeroes(array: bigint[], targetLength: number) {
  const total = targetLength - array.length
  for (let i = 0; i < total; i++) {
    array.push(0n)
  }
  return array
}

/** Give the right modulus as expected */
export function modulus(num: bigint, p: bigint) {
  return ((num % p) + p) % p
}

/** Convert a bigInt into the chucks of Integers */
export function chunkBigInt(n: bigint): bigint[] {
  const mod = BigInt(2 ** 85)
  if (!n) return [0n]
  const arr = []
  while (n) {
    arr.push(BigInt(modulus(n, mod)))
    n /= mod
  }
  return arr
}

/** Convert ExtendedPoints (XYZTPoint) to arrays of 85-bit chunks
 *
 * [bigint, bigint, bigint, bigint] => [bigint[3], bigint[3], bigint[3], bigint[3]] */
export function chunk(xyztPoint: XYZTPoint): ChunkedPoint {
  const chunked = new Array(4)
  for (let i = 0; i < 4; i++) {
    chunked[i] = chunkBigInt(xyztPoint[i])
  }
  for (let i = 0; i < 4; i++) {
    padWithZeroes(chunked[i], 3)
  }
  return chunked as ChunkedPoint
}

/** Convert 85-bit chunks back to XYZTPoint */
export const dechunk = (chunked: ChunkedPoint): XYZTPoint =>
  chunked.map(
    (coord) => coord[0] + (coord[1] << 85n) + (coord[2] << 170n)
  ) as XYZTPoint

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
