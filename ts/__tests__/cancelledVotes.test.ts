import { type WitnessTester } from 'circomkit'

import { circomkitInstance, getSignal } from '../utils.js'
import { expect } from 'chai'

describe('Mulitplier circuit', function test() {
  this.timeout(900000)

  let circuit: WitnessTester<['a', 'b'], ['c']>

  before(async () => {
    circuit = await circomkitInstance.WitnessTester('Multiplier', {
      file: './multiplier',
      template: 'Multiplier2',
      params: [],
    })
  })

  it('should multiply two numbers', async () => {
    const a = BigInt(2)
    const b = BigInt(3)
    const c = await circuit.calculateWitness({ a, b })
    const result = await getSignal(circuit, c, 'c')
    expect(result).to.equal(a * b)
  })
})
