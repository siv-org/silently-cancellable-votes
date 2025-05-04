import { type WitnessTester } from 'circomkit'
import { expect } from 'chai'
import * as ed from '@noble/ed25519'
import {
  circomkit,
  getSignal,
  getChunkedPointSignal,
  chunk,
  dechunk,
  xyztObjToArray,
  bigintTo255Bits,
} from '../utils.ts'

describe('Basic multiplier (example)', function test() {
  it('should multiply two numbers', async () => {
    const circuit: WitnessTester<['a', 'b'], ['c']> =
      await circomkit.WitnessTester('MultiplierDemo', {
        file: './multiplier-demo',
        template: 'MultiplierDemo',
        params: [],
      })

    const a = BigInt(2)
    const b = BigInt(3)
    const c = await circuit.calculateWitness({ a, b })
    const result = await getSignal(circuit, c, 'c')
    expect(result).to.equal(a * b)
  })
})

describe('Curve-25519 circuits', function test() {
  describe('Point addition', () => {
    it('should add a point to itself', async () => {
      const circuit: WitnessTester<['P', 'Q'], ['R']> =
        await circomkit.WitnessTester('PointAddition', {
          file: './ed25519/point-addition',
          template: 'PointAdd',
          params: [],
        })

      // Try adding the base point to itself
      const base = ed.ExtendedPoint.BASE
      const P = xyztObjToArray(base)
      const Q = P
      const expected = base.add(base)

      const witness = await circuit.calculateWitness({
        P: chunk(P),
        Q: chunk(Q),
      })

      // Get all 12 output values of the chunked point
      const result = await getChunkedPointSignal(circuit, witness, 'R')

      // Reconstruct the coordinates from 85-bit chunks
      const dechunkedResult = dechunk(result)

      // Compare with expected values directly
      expect(dechunkedResult).to.deep.equal(xyztObjToArray(expected))
    })
  })

  describe('Scalar multiplication', function () {
    this.timeout(100_000)
    it('should multiply a point by a scalar', async () => {
      const circuit: WitnessTester<['P', 'scalar'], ['sP']> =
        await circomkit.WitnessTester('ScalarMultiplication', {
          file: './ed25519/scalar-multiplication',
          template: 'ScalarMul',
          params: [],
        })

      const base = ed.ExtendedPoint.BASE
      const P = xyztObjToArray(base)
      const scalar = BigInt(3) // Start with simple case: tripling a point

      // Get expected result using noble-ed25519
      const expected = base.multiply(scalar)

      // Convert point to array of bits
      const chunkedP = chunk(P)

      const witness = await circuit.calculateWitness({
        scalar: bigintTo255Bits(scalar),
        P: chunkedP,
      })

      // Get all 12 output values of the chunked point
      const result = await getChunkedPointSignal(circuit, witness, 'sP')

      // Reconstruct the coordinates from 85-bit chunks
      const dechunkedResult = dechunk(result)

      expect(dechunkedResult).to.deep.equal(xyztObjToArray(expected))
    })
  })
})

/* More tests TODO:
// Generate Random test cases:
range(0,10).map(index => {
    const point = generate_random_ristretto_point()
    const scalar = generate_random_scalar()
    const expected = point.multiply(scalar)

    // Test cases that should work:
    expect(test_scalar_multiplication(point, scalar, expected) === true)

    // Test cases that should not work:
    const different_scalar = generate_random_scalar()
    expect(test_scalar_multiplication(point, different_scalar, expected) === false)
})
*/
