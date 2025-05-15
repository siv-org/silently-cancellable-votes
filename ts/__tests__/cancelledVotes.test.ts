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
  padWithZeroes,
  chunkBigInt,
  modulus,
  type ChunkedPoint,
  type Chunk,
  extendedToAffine,
} from '../utils.ts'
import * as utils from '../../circuits/ed25519/utils-js.js'
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
      // const expected = base.add(base)

      const witness = await circuit.calculateWitness({
        P: chunk(P),
        Q: chunk(Q),
      })

      // Get all 12 output values of the chunked point
      const result = await getChunkedPointSignal(circuit, witness, 'R')

      // Reconstruct the coordinates from 85-bit chunks
      const dechunkedResult = dechunk(result)
      console.log('dechunkedResult from point Addition', dechunkedResult)
      // Compare with expected values directly
      // expect(dechunkedResult).to.deep.equal(xyztObjToArray(expected))

      // We'll also double with noble to check the results
      expect(base.multiply(2n).toAffine()).to.deep.equal(
        base.add(base).toAffine()
      )
    })
  })

  describe('Scalar multiplication', function () {
    this.timeout(100_000)

    it.skip('should multiply them correctly', async () => {
      const cir: WitnessTester<['P', 'scalar'], ['sP']> =
        await circomkit.WitnessTester('ScalarMul', {
          file: './ed25519/scalar-multiplication',
          template: 'ScalarMul',
          recompile: false, // See https://github.com/erhant/circomkit/issues/26#issuecomment-2849738230
        })
      // const cir = await wasmTester(
      //   path.join(__dirname, 'circuits', 'scalarmul.circom')
      // )
      const p = BigInt(2 ** 255) - BigInt(19)
      // const s =
      //   4869643893319708471955165214975585939793846505679808910535986866633137979160n
      const s = 2n
      const P = [
        15112221349535400772501151409588531511454012693041857206046113283949847762202n,
        46316835694926478169428394003475163141307993866256225615783033603165251855960n,
        1n,
        46827403850823179245072216630277197565144205554125654976674165829533817101731n,
      ]
      const buf = utils.bigIntToLEBuffer(s)
      const asBits = padWithZeroes(utils.buffer2bits(buf), 255)
      // asBits.pop()
      // console.log('asBits', asBits)
      // console.log('asBits length', asBits.length)
      const chunkP = []
      for (let i = 0; i < 4; i++) {
        chunkP.push(chunkBigInt(P[i]))
      }
      for (let i = 0; i < 4; i++) {
        padWithZeroes(chunkP[i], 3)
      }
      const witness = await cir.calculateWitness({ scalar: asBits, P: chunkP })
      const res = utils.point_mul(s, P)
      for (let i = 0; i < 4; i++) {
        res[i] = modulus(res[i], p)
      }
      // console.log('witness', witness)
      const wt = witness.slice(1, 13)
      // console.log('wt', wt)
      const chunkedWt: ChunkedPoint = new Array(4).fill([]) as ChunkedPoint
      for (let i = 0; i < 4; i++) {
        chunkedWt[i] = wt.slice(3 * i, 3 * i + 3) as Chunk
      }
      // const dechunkedWt = []
      // for (let i = 0; i < 4; i++) {
      //   dechunkedWt.push(dechunk(chunked[i], BigInt(2 ** 85)))
      // }
      const dechunkedWt = dechunk(chunkedWt)

      const base = ed.ExtendedPoint.BASE
      const PNoble = xyztObjToArray(base)
      // console.log('PNoble', PNoble)
      expect(PNoble).to.deep.equal(P)
      // const nobleExpected = base.multiply(s)
      // const nobleExpectedUnsafe = base.multiplyUnsafe(s)
      console.log('dechunkedWt', dechunkedWt)
      console.log('utils-js expected', res)

      expect(dechunkedWt).to.deep.equal(res)

      // assert.ok(utils.point_equal(res, dechunkedWt))
    })

    it('should multiply a point by a scalar', async () => {
      const circuit: WitnessTester<['P', 'scalar'], ['sP']> =
        await circomkit.WitnessTester('ScalarMul', {
          file: './ed25519/scalar-multiplication',
          template: 'ScalarMul',
          recompile: false, // See https://github.com/erhant/circomkit/issues/26#issuecomment-2849738230
        })

      const base = ed.ExtendedPoint.BASE
      const P = xyztObjToArray(base)
      // const scalar = BigInt(2) // Start with simple case: tripling a point
      const scalar =
        4869643893319708471955165214975585939793846505679808910535986866633137979160n

      // Get expected result using noble-ed25519
      const nobleExpected = base.multiply(scalar)

      // Convert point to array of bits
      const chunkedP = chunk(P)

      // const CALC_WIT = '     ⏱️  calculateWitness()'
      // console.time(CALC_WIT)
      const witness = await circuit.calculateWitness({
        scalar: bigintTo255Bits(scalar),
        P: chunkedP,
      })
      // console.timeEnd(CALC_WIT)

      // Get all 12 output values of the chunked point
      // const GET_CHUNKED = '     ⏱️  getSignals()'
      // console.time(GET_CHUNKED)
      const result = await getChunkedPointSignal(circuit, witness, 'sP')
      // console.timeEnd(GET_CHUNKED)

      // return

      // Reconstruct the coordinates from 85-bit chunks
      const dechunkedResult = dechunk(result)

      console.log('dechunkedResult', extendedToAffine(dechunkedResult))
      console.log('nobleExpected', nobleExpected.toAffine())

      // expect(dechunkedResult).to.deep.equal(xyztObjToArray(nobleExpected.toAffine()))
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
