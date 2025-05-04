export {
  buffer2bits,
  convertToEvenLength,
  normalize,
  bigIntToLEBuffer,
  bitsToBigInt,
  point_add,
  point_mul,
  point_equal,
} from './utils-js.js'

function padWithZeroes(array: bigint[], targetLength: number) {
  const total = targetLength - array.length
  for (let i = 0; i < total; i++) {
    array.push(0n)
  }
  return array
}

export type XYZTPoint = [bigint, bigint, bigint, bigint]

/** A 255-bit bigint, split into 3 85-bit bigints (85 * 3 = 255) */
type Chunk = [bigint, bigint, bigint]

/** 4 chunks, corresponding to XYZT coordinates */
export type ChunkedPoint = [Chunk, Chunk, Chunk, Chunk]

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

/** Convert ExtendedPoints (XYZTPoint) to arrays of 85-bit chunks */
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
