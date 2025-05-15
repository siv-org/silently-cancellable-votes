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
  extendedToAffine,
} from '../utils.ts'
import { stringToPoint } from '../curve.ts'

describe('Basic multiplier (example)', function test() {
  it('should multiply two numbers', async () => {
    const circuit: WitnessTester<['a', 'b'], ['c']> =
      await circomkit.WitnessTester('MultiplierDemo', {
        file: './multiplier-demo',
        template: 'MultiplierDemo',
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

      // We'll also double with noble to check the results
      expect(base.multiply(2n).toAffine()).to.deep.equal(
        base.add(base).toAffine()
      )
    })
  })

  describe('Scalar multiplication', function () {
    this.timeout(100_000)

    it('should multiply a point by a scalar', async () => {
      const circuit: WitnessTester<['P', 'scalar'], ['sP']> =
        await circomkit.WitnessTester('ScalarMul', {
          file: './ed25519/scalar-multiplication',
          template: 'ScalarMul',
          recompile: false, // See https://github.com/erhant/circomkit/issues/26#issuecomment-2849738230
        })

      const base = ed.ExtendedPoint.BASE
      const P = xyztObjToArray(base)
      const scalar = 48696438933105679808910535986866633137979160n // random test case

      // Test against expected result from noble-ed25519
      const nobleExpected = base.multiply(scalar)

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

      expect(extendedToAffine(dechunkedResult)).to.deep.equal(
        nobleExpected.toAffine()
      )
    })
  })
})

describe('Encoding votes', function () {
  it('we can convert strings to scalars and back', async () => {
    const sampleVote = '4444-4444-4444:washington'
    const encoded = new TextEncoder().encode(sampleVote)
    // console.log('encoded', encoded)
    const decoded = new TextDecoder().decode(encoded)
    expect(decoded).to.equal(sampleVote)

    // TODO: we can do this in a circuit as well and get the same results.
  })

  it('should encode votes to Ristretto points and extract back out', async () => {
    const votePlaintext = '4444-4444-4444:washington'
    const encoded = stringToPoint(votePlaintext)
    // console.log('encoded', encoded.toHex())
    expect(
      encoded
        .toHex()
        .startsWith('32343434342d343434342d343434343a77617368696e67746f6e')
    ).to.be.true

    // TODO: test extract() returns original plaintext

    // TODO: we can replicate extract() within a circuit, and get the same results
    // (we only need extract(), not stringToPoint() within a circuit, which would be very hard any way, since it's non-deterministic)
  })

  it.skip('our circuit can RP.fromHex() and confirm the point is valid', async () => {})
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
