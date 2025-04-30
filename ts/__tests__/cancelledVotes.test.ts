import { type WitnessTester } from 'circomkit'

import { circomkitInstance, getSignal } from '../utils.js'
import { expect } from 'chai'
import * as ed from '@noble/ed25519'
import * as utils from '../../circuits/ed25519/utils.js'

type XYZTPoint = [bigint, bigint, bigint, bigint]
type Binary = 0 | 1
type ChunkedPoint = [Binary[], Binary[], Binary[], Binary[]]

describe('Multiplier circuit', function test() {
  this.timeout(900000)

  let multiplierCircuit: WitnessTester<['a', 'b'], ['c']>
  let pointAdditionCircuit: WitnessTester<['P', 'Q'], ['R']>

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
    const chunkedP = chunk(P)
    const chunkedQ = chunk(Q)

    const R = await pointAdditionCircuit.calculateWitness({
      P: chunkedP,
      Q: chunkedQ,
    })
    const result = (await getSignal(
      pointAdditionCircuit,
      R,
      'R'
    )) as unknown as ChunkedPoint
    const dechunkedResult = dechunk(result)
    console.log({ result, expected, dechunkedResult })

    expect(dechunkedResult).to.equal(expected)
  })
})

// [bigint, bigint, bigint, bigint] => [binary[], binary[], binary[], binary[]]
function chunk(xyztPoint: XYZTPoint): ChunkedPoint {
  const chunked = []
  for (let i = 0; i < 4; i++) {
    chunked.push(utils.chunkBigInt(xyztPoint[i], BigInt(2 ** 85)))
  }
  for (let i = 0; i < 4; i++) {
    utils.pad(chunked[i], 3)
  }
  return chunked as ChunkedPoint
}
function dechunk(chunked: ChunkedPoint): XYZTPoint {
  const result = []
  for (let i = 0; i < 4; i++) {
    result.push(utils.dechunkIntoBigInt(chunked[i]))
  }
  return result as XYZTPoint
}
