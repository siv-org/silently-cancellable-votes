import { type WitnessTester } from 'circomkit'

import { circomkitInstance, getSignal, get2DArraySignal } from '../utils.ts'
import { expect } from 'chai'
import * as ed from '@noble/ed25519'
import { chunk, type XYZTPoint } from '../../circuits/ed25519/utils.ts'

describe('Multiplier circuit', function test() {
  this.timeout(900000)

  it.skip('should multiply two numbers', async () => {
    const multiplierCircuit: WitnessTester<['a', 'b'], ['c']> =
      await circomkitInstance.WitnessTester('Multiplier', {
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

  it('should support ed25519 point addition', async () => {
    const pointAdditionCircuit: WitnessTester<['P', 'Q'], ['R']> =
      await circomkitInstance.WitnessTester('PointAddition', {
        file: './ed25519/point-addition',
        template: 'PointAdd',
        params: [],
      })

    // Try adding the base point to itself
    const base = ed.ExtendedPoint.BASE
    const P: XYZTPoint = [base.x, base.y, base.z, base.t]
    const Q = P
    const expected = base.add(base)

    // Convert ExtendedPoints to array of bits
    const chunkedP = chunk(P)
    const chunkedQ = chunk(Q)

    const R = await pointAdditionCircuit.calculateWitness({
      P: chunkedP,
      Q: chunkedQ,
    })

    // Get all 12 output values (4 coordinates × 3 chunks each)
    const result = await get2DArraySignal(pointAdditionCircuit, R, 'R', [4, 3])

    // Reconstruct the coordinates from 85-bit chunks
    const dechunkedResult: XYZTPoint = result.map(
      (coord) => coord[0] + (coord[1] << 85n) + (coord[2] << 170n)
    ) as XYZTPoint

    // Compare with expected values directly
    expect(dechunkedResult[0]).to.equal(expected.x)
    expect(dechunkedResult[1]).to.equal(expected.y)
    expect(dechunkedResult[2]).to.equal(expected.z)
    expect(dechunkedResult[3]).to.equal(expected.t)
  })

  it.skip('should support ed25519 scalar multiplication', async () => {
    const scalarMultiplicationCircuit: WitnessTester<['P', 'scalar'], ['R']> =
      await circomkitInstance.WitnessTester('ScalarMultiplication', {
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

    const R = await scalarMultiplicationCircuit.calculateWitness({
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
    void R
  })
})
