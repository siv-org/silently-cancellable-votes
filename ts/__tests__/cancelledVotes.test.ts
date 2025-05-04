import { type WitnessTester } from 'circomkit'

import { circomkit, getSignal, getChunkedPointSignal } from '../utils.ts'
import { expect } from 'chai'
import * as ed from '@noble/ed25519'
import { chunk, dechunk, type XYZTPoint } from '../../circuits/ed25519/utils.ts'

describe('Basic multiplier (example)', function test() {
  it('should multiply two numbers', async () => {
    const multiplierCircuit: WitnessTester<['a', 'b'], ['c']> =
      await circomkit.WitnessTester('Multiplier', {
        file: './multiplier',
        template: 'Multiplier2',
        params: [],
      })

    const a = BigInt(2)
    const b = BigInt(3)
    const c = await multiplierCircuit.calculateWitness({ a, b })
    const result = await getSignal(multiplierCircuit, c, 'c')
    expect(result).to.equal(a * b)
  })
})

describe('Curve-25519 circuits', function test() {
  describe('Point addition', () => {
    it('should add a point to itself', async () => {
      const pointAdditionCircuit: WitnessTester<['P', 'Q'], ['R']> =
        await circomkit.WitnessTester('PointAddition', {
          file: './ed25519/point-addition',
          template: 'PointAdd',
          params: [],
        })

      // Try adding the base point to itself
      const base = ed.ExtendedPoint.BASE
      const P: XYZTPoint = [base.x, base.y, base.z, base.t]
      const Q = P
      const expected = base.add(base)

      const witness = await pointAdditionCircuit.calculateWitness({
        P: chunk(P),
        Q: chunk(Q),
      })

      // Get all 12 output values of the chunked point
      const result = await getChunkedPointSignal(
        pointAdditionCircuit,
        witness,
        'R'
      )

      // Reconstruct the coordinates from 85-bit chunks
      const dechunkedResult: XYZTPoint = dechunk(result)

      // Compare with expected values directly
      expect(dechunkedResult).to.deep.equal([
        expected.x,
        expected.y,
        expected.z,
        expected.t,
      ])
    })
  })

  describe('Scalar multiplication', () => {
    it.skip('should multiply a point by a scalar', async () => {
      const scalarMultiplicationCircuit: WitnessTester<['P', 'scalar'], ['R']> =
        await circomkit.WitnessTester('ScalarMultiplication', {
          file: './ed25519/scalar-multiplication',
          template: 'ScalarMul',
          params: [],
        })

      const base = ed.ExtendedPoint.BASE
      const P: XYZTPoint = [base.x, base.y, base.z, base.t]
      const scalar = BigInt(2) // Start with simple case: doubling a point

      // Get expected result using noble-ed25519
      const expected = base.multiply(scalar)

      // Convert point to array of bits
      const chunkedP = chunk(P)

      const witness = await scalarMultiplicationCircuit.calculateWitness({
        P: chunkedP,
        scalar: scalar,
      })

      const chunkedExpected = chunk([
        expected.x,
        expected.y,
        expected.z,
        expected.t,
      ])
      console.log({ chunkedExpected })
      void witness
    })
  })
})
