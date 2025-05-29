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
  getVectorSignal,
} from '../utils.ts'
import { pointToString, stringToPoint } from '../curve.ts'

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

describe('Ed25519 circuits', function test() {
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

  describe.skip('Scalar multiplication', function () {
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
  it('can convert strings to scalars and back', async () => {
    const sampleVote = '4444-4444-4444:washington'
    const encoded = new TextEncoder().encode(sampleVote)
    // console.log('encoded', encoded)
    const decoded = new TextDecoder().decode(encoded)
    expect(decoded).to.equal(sampleVote)
  })

  it('can encode votes to Ristretto points and extract back out, even from circuit', async () => {
    const votePlaintext = '4444-4444-4444:washington'
    const encoded = stringToPoint(votePlaintext)
    // console.log('encoded', encoded.toHex())
    expect(
      encoded
        .toHex()
        .startsWith('32343434342d343434342d343434343a77617368696e67746f6e')
    ).to.be.true

    // JS pointToString() returns original plaintext
    expect(pointToString(encoded)).to.equal(votePlaintext)

    // We can also extract() the plaintext from within a circuit, and get the same results
    const pointAsBytes = [...encoded.toRawBytes()]
    // console.log({ pointAsBytes })

    const circuit = await circomkit.WitnessTester('ExtractStringFromPoint', {
      file: './extract_string_from_point',
      template: 'ExtractStringFromPoint',
      recompile: false,
    })
    const witness = await circuit.calculateWitness({ pointAsBytes })
    const length = Number(await getSignal(circuit, witness, 'length'))
    // Was the circuit able to extract the string's bytes?
    const extracted = (
      await getVectorSignal(circuit, witness, 'stringAsIntegers', 31)
    )
      .slice(0, length)
      .map((x) => Number(x))
    // Convert bytes back into ASCII, to compare to original input
    const extractedString = new TextDecoder().decode(Uint8Array.from(extracted))
    // console.log({ extractedString })

    expect(extractedString).to.equal(votePlaintext)
  })

  it.skip('our circuit can RP.fromHex() and confirm the point is valid', async () => {})
})

describe('HashAdminSalt circuit', function () {
  it('should hash the admin_secret_salt correctly', async () => {
    const circuit = await circomkit.WitnessTester('HashAdminSalt', {
      file: './hash_admin_salt',
      template: 'HashAdminSalt',
      recompile: false,
    })

    const admin_secret_salt = 123456789n
    const expectedHash =
      7110303097080024260800444665787206606103183587082596139871399733998958991511n
    const witness = await circuit.calculateWitness({ admin_secret_salt })
    const hash = await getSignal(circuit, witness, 'hash_of_admin_secret_salt')
    expect(hash).to.equal(expectedHash)

    // A different salt should produce a different hash
    const salt2 = 987654321n
    const expectedHash2 =
      8358125608916792199567624990380031336399968764944869913697508384993845680707n
    const witness2 = await circuit.calculateWitness({
      admin_secret_salt: salt2,
    })
    const hash2 = await getSignal(
      circuit,
      witness2,
      'hash_of_admin_secret_salt'
    )
    expect(hash2).to.equal(expectedHash2)
    expect(hash2).to.not.equal(hash)
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
