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
} from '../utils.ts'
import * as utils from '../../circuits/ed25519/utils-js.js'

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
    })
  })

  describe('Scalar multiplication', function () {
    this.timeout(100_000)

    it('should multiply them correctly', async () => {
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
      const s =
        4869643893319708471955165214975585939793846505679808910535986866633137979160n
      const P = [
        15112221349535400772501151409588531511454012693041857206046113283949847762202n,
        46316835694926478169428394003475163141307993866256225615783033603165251855960n,
        1n,
        46827403850823179245072216630277197565144205554125654976674165829533817101731n,
      ]
      const buf = utils.bigIntToLEBuffer(s)
      const asBits = padWithZeroes(utils.buffer2bits(buf), 255)
      asBits.pop()
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
      console.log('wt', wt)
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
      const nobleExpected = base.multiply(s)
      console.log('nobleExpected', nobleExpected)

      expect(dechunkedWt).to.deep.equal(res)

      // assert.ok(utils.point_equal(res, dechunkedWt))
    })

    it.skip('should multiply a point by a scalar', async () => {
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
      const expected = base.multiply(scalar)

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
