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

function pad(array: bigint[], targetLength: number) {
  const total = targetLength - array.length
  for (let i = 0; i < total; i++) {
    array.push(0n)
  }
  return array
}

export type XYZTPoint = [bigint, bigint, bigint, bigint]
type Binary = 0n | 1n
type ChunkedPoint = [Binary[], Binary[], Binary[], Binary[]]

/** Give the right modulus as expected */
export function modulus(num: bigint, p: bigint) {
  return ((num % p) + p) % p
}

/** Convert a bigInt into the chucks of Integers */
export function chunkBigInt(n: bigint, mod = BigInt(2 ** 51)): bigint[] {
  if (!n) return [0n]
  let arr = []
  while (n) {
    arr.push(BigInt(modulus(n, mod)))
    n /= mod
  }
  return arr
}

export function dechunkIntoBigInt(x: Binary[], mod = BigInt(2 ** 51)) {
  let sum = 0n
  for (let i = 0; i < x.length; i++) {
    sum += mod ** BigInt(i) * x[i]
  }
  return sum
}

/** Convert ExtendedPoints (XYZTPoint) to arrays of bits
 *
 * [bigint, bigint, bigint, bigint] => [binary[], binary[], binary[], binary[]] */
export function chunk(xyztPoint: XYZTPoint): ChunkedPoint {
  const chunked = new Array(4)
  for (let i = 0; i < 4; i++) {
    chunked[i] = chunkBigInt(xyztPoint[i], BigInt(2 ** 85))
  }
  for (let i = 0; i < 4; i++) {
    pad(chunked[i], 3)
  }
  return chunked as ChunkedPoint
}

/** [binary[], binary[], binary[], binary[]] => [bigint, bigint, bigint, bigint] */
export function dechunk(chunked: ChunkedPoint): XYZTPoint {
  const result = []
  for (let i = 0; i < 4; i++) {
    result.push(dechunkIntoBigInt(chunked[i] as Binary[]))
  }
  return result as XYZTPoint
}
