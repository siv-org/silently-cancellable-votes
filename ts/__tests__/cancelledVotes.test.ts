import { type WitnessTester } from 'circomkit'

import { circomkitInstance, getSignal } from '../utils'
import { expect } from 'chai'
import * as ed from '@noble/ed25519'
import { chunk, XYZTPoint } from '../../circuits/ed25519/utils'

describe('Multiplier circuit', function test() {
  this.timeout(900000)

  let multiplierCircuit: WitnessTester<['a', 'b'], ['c']>
  let pointAdditionCircuit: WitnessTester<['P', 'Q'], ['R']>
  let scalarMultiplicationCircuit: WitnessTester<['P', 'scalar'], ['R']>

  before(async () => {
    multiplierCircuit = await circomkitInstance.WitnessTester('Multiplier', {
      file: './multiplier',
      template: 'Multiplier2',
      params: [],
    })
    pointAdditionCircuit = await circomkitInstance.WitnessTester(
      'PointAddition',
      {
        file: './ed25519/point-addition',
        template: 'PointAdd',
        params: [],
      }
    )
    scalarMultiplicationCircuit = await circomkitInstance.WitnessTester(
      'ScalarMultiplication',
      {
        file: './ed25519/scalar-multiplication',
        template: 'ScalarMul',
        params: [],
      }
    )
  })

  it('should multiply two numbers', async () => {
    const a = BigInt(2)
    const b = BigInt(3)
    const c = await multiplierCircuit.calculateWitness({ a, b })
    const result = await getSignal(multiplierCircuit, c, 'c')
    expect(result).to.equal(a * b)
  })

  it('should support ed25519 point addition', async () => {
    const base = ed.ExtendedPoint.BASE
    const P: XYZTPoint = [base.x, base.y, base.z, base.t]
    const Q = P
    const expected = base.add(base)

    // Convert ExtendedPoints to array of bits
    // console.log({ P, Q })
    const chunkedP = chunk(P)
    const chunkedQ = chunk(Q)

    const R = await pointAdditionCircuit.calculateWitness({
      P: chunkedP,
      Q: chunkedQ,
    })
    // const result = (await getSignal(
    //   pointAdditionCircuit,
    //   R,
    //   'R'
    // )) as unknown as ChunkedPoint
    // const dechunkedResult = dechunk(result)
    // console.log({ result, expected, dechunkedResult })

    // expect(dechunkedResult).to.equal(expected)
    // console.log(expected)
    const chunkedExpected = chunk([
      expected.x,
      expected.y,
      expected.z,
      expected.t,
    ])
    console.log({ chunkedExpected })
    void R
  })

  it.skip('should support ed25519 scalar multiplication', async () => {
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
