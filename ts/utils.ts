import { poseidonPerm } from '@zk-kit/poseidon-cipher'
import { Circomkit, type WitnessTester, type CircomkitConfig } from 'circomkit'
import fs from 'fs'
import path from 'path'

type XYZTPoint = [bigint, bigint, bigint, bigint]

/** A 255-bit bigint, split into 3 85-bit bigints (85 * 3 = 255) */
export type Chunk = [bigint, bigint, bigint]

/** 4 chunks, corresponding to XYZT coordinates */
export type ChunkedPoint = [Chunk, Chunk, Chunk, Chunk]

// Instantiate Circomkit
const configFilePath = path.resolve('circomkit.json')
const config = JSON.parse(
  fs.readFileSync(configFilePath, 'utf-8')
) as CircomkitConfig
export const circomkit = new Circomkit({
  ...config,
  verbose: false,
})

// Helper functions to extract signals from witnesses

/** Get a signal from the circuit */
export const getSignal = async (
  tester: WitnessTester,
  witness: bigint[],
  outputSignalName: string
): Promise<unknown> => {
  const prefix = 'main'
  // E.g. the full name of the signal "root" is "main.root"
  // You can look up the signal names using `circuit.getDecoratedOutput(witness))`
  const signalFullName = `${prefix}.${outputSignalName}`

  const out = await tester.readWitness(witness, [signalFullName])
  return out[signalFullName]
}

/** Get a ChunkedPoint signal from the circuit
 * @param tester - the circuit tester
 * @param witness - the witness
 * @param outputSignalName - the base name of the signal (e.g., 'R' for 'R[0][0]')
 * @returns the signal values as a ChunkedPoint (4 coordinates, each split into 3 85-bit chunks)
 */
export const getChunkedPointSignal = async (
  tester: WitnessTester,
  witness: bigint[],
  outputSignalName: string
): Promise<ChunkedPoint> => {
  const [rows, cols] = [4, 3]

  // Build array of all signal names
  const signalNames = []
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      signalNames.push(`main.${outputSignalName}[${i}][${j}]`)
    }
  }

  // Read all signals in one call
  const values = await tester.readWitness(witness, signalNames)

  // Process results back into 2d array
  const result: bigint[][] = []
  for (let i = 0; i < rows; i++) {
    result[i] = []
    for (let j = 0; j < cols; j++) {
      const signalName = `main.${outputSignalName}[${i}][${j}]`
      result[i][j] = BigInt(String(values[signalName]))
    }
  }

  return result as ChunkedPoint
}

export const getVectorSignal = async (
  tester: WitnessTester,
  witness: bigint[],
  outputSignalName: string,
  length: number
): Promise<bigint[]> => {
  // Build array of all signal names
  const signalNames = []
  for (let i = 0; i < length; i++) {
    signalNames.push(`main.${outputSignalName}[${i}]`)
  }

  // Read all signals in one call
  const values = await tester.readWitness(witness, signalNames)

  // Process results back into 2d array
  const result: bigint[] = []
  for (let i = 0; i < length; i++) {
    const signalName = `main.${outputSignalName}[${i}]`
    result[i] = BigInt(String(values[signalName]))
  }

  return result
}

// Helper functions to convert between XYZTPoints and ChunkedPoints

export function padWithZeroes(array: bigint[], targetLength: number) {
  const total = targetLength - array.length
  for (let i = 0; i < total; i++) {
    array.push(0n)
  }
  return array
}

const P = BigInt(
  '0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffed'
) // 2^255 - 19

/** Give the right modulus as expected */
export function modulus(num: bigint, p = P) {
  const result = num % p
  return result >= 0n ? result : result + p
}
const mod = modulus

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

/** Convert an ExtendedPoint object to an XYZTPoint array */
export const xyztObjToArray = (xyztObj: {
  x: bigint
  y: bigint
  z: bigint
  t: bigint
}): XYZTPoint => [xyztObj.x, xyztObj.y, xyztObj.z, xyztObj.t]

/** Convert a bigint into an array of 255 bits */
export const bigintTo255Bits = (n: bigint): bigint[] => {
  const bits: bigint[] = []
  for (let i = 0; i < 255; i++) {
    bits.push((n >> BigInt(i)) & 1n)
  }
  return bits
}

function modInv(a: bigint, m = P): bigint {
  // Fermat's little theorem: a^(p-2) mod p
  return modExp(a, m - 2n, m)
}

function modExp(base: bigint, exponent: bigint, modulus: bigint): bigint {
  let result = 1n
  base = mod(base, modulus)
  while (exponent > 0n) {
    if (exponent % 2n === 1n) result = mod(result * base, modulus)
    base = mod(base * base, modulus)
    exponent /= 2n
  }
  return result
}

export function extendedToAffine([X, Y, Z]: XYZTPoint) {
  const zInv = modInv(Z)
  const x = mod(X * zInv)
  const y = mod(Y * zInv)
  return { x, y }
}

/**
 * Generate the poseidon hash of the inputs provided
 * @param inputs The inputs to hash
 * @returns the hash of the inputs
 */
export const poseidon = (inputs: bigint[]): bigint =>
  poseidonPerm([BigInt(0), ...inputs.map((x) => BigInt(x))])[0]
