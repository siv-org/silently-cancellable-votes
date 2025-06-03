import { type WitnessTester } from 'circomkit'
import { describe, it, expect } from 'bun:test'
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
import { shouldRecompile } from '../watch-circuits.ts'

describe('Basic multiplier (example)', function test() {
  it('should multiply two numbers', async () => {
    const circuit: WitnessTester<['a', 'b'], ['c']> =
      await circomkit.WitnessTester('MultiplierDemo', {
        file: './MultiplierDemo',
        template: 'MultiplierDemo',
        recompile: shouldRecompile('MultiplierDemo.circom'),
      })

    const a = BigInt(2)
    const b = BigInt(3)
    const c = await circuit.calculateWitness({ a, b })
    const result = await getSignal(circuit, c, 'c')
    expect(result).toBe(a * b)
  })
})

describe('Ed25519 circuits', function test() {
  describe('Point addition', () => {
    it('should add a point to itself', async () => {
      const circuit: WitnessTester<['P', 'Q'], ['R']> =
        await circomkit.WitnessTester('PointAddition', {
          file: './ed25519/point-addition',
          template: 'PointAdd',
          recompile: false,
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
      expect(dechunkedResult).toEqual(xyztObjToArray(expected))

      // We'll also double with noble to check the results
      expect(base.multiply(2n).toAffine()).toEqual(base.add(base).toAffine())
    })
  })

  describe.skip('Scalar multiplication', function () {
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

      expect(extendedToAffine(dechunkedResult)).toEqual(
        nobleExpected.toAffine()
      )
    })
  })
})

describe.only('EncryptVote()', function () {
  it('should get same results encrypting from JS or circuit', async () => {
    // try {

    // Create example vote
    const election_public_key = ed.RistrettoPoint.BASE
    const plaintext = '4444-4444-4444:arnold'
    const encoded_vote_to_secretly_cancel = stringToPoint(plaintext)
    const votes_secret_randomizer = 123456789n

    // First, we'll try to encrypt from within the circuit

    // Init circuit
    const circuit = await circomkit.WitnessTester<
      [
        'election_public_key',
        'encoded_vote_to_secretly_cancel',
        'votes_secret_randomizer'
      ],
      ['shared_secret']
    >('EncryptVote', {
      file: './EncryptVote',
      template: 'EncryptVote',
      recompile: shouldRecompile('EncryptVote.circom'),
    })

    // Convert all the inputs to format circuit can accept

    // @ts-expect-error Overriding .ep privatization
    const election_public_key_ep = election_public_key.ep
    const chunkedElectionPublicKey = chunk(
      xyztObjToArray(election_public_key_ep)
    )

    // @ts-expect-error Overriding .ep privatization
    const encoded_ep = encoded_vote_to_secretly_cancel.ep
    const chunkedEncoded = chunk(xyztObjToArray(encoded_ep))

    // Calculate witness
    const witness = await circuit.calculateWitness({
      election_public_key: chunkedElectionPublicKey,
      encoded_vote_to_secretly_cancel: chunkedEncoded,
      votes_secret_randomizer: bigintTo255Bits(votes_secret_randomizer),
    })

    // Pull out the encrypted vote, from circuit's output
    const encrypted_vote = await getChunkedPointSignal(
      circuit,
      witness,
      'encrypted_vote'
    )
    const [x, y, z, t] = dechunk(encrypted_vote)
    const encrypted_ep = new ed.ExtendedPoint(x, y, z, t)

    // Finally, does it match encrypting from JS?
    const encryptedInJS = encoded_vote_to_secretly_cancel.add(
      election_public_key.multiply(votes_secret_randomizer)
    )

    expect(new ed.RistrettoPoint(encrypted_ep).equals(encryptedInJS)).toBeTrue

    // } catch (e: any) {
    //   console.log('\n❌', e.message)
    // }
  })
})

describe('Encoding votes', function () {
  it('can convert strings to scalars and back', async () => {
    const sampleVote = '4444-4444-4444:washington'
    const encoded = new TextEncoder().encode(sampleVote)
    // console.log('encoded', encoded)
    const decoded = new TextDecoder().decode(encoded)
    expect(decoded).toBe(sampleVote)
  })

  it('can encode votes to Ristretto points and extract back out, even from circuit', async () => {
    const votePlaintext = '4444-4444-4444:washington'
    const encoded = stringToPoint(votePlaintext)
    // console.log('encoded', encoded.toHex())
    expect(encoded.toHex()).toStartWith(
      '32343434342d343434342d343434343a77617368696e67746f6e'
    )

    // JS pointToString() returns original plaintext
    expect(pointToString(encoded)).toBe(votePlaintext)

    // We can also extract() the plaintext from within a circuit, and get the same results
    const pointAsBytes = [...encoded.toRawBytes()]
    // console.log({ pointAsBytes })

    const circuit = await circomkit.WitnessTester('ExtractStringFromPoint', {
      file: './ExtractStringFromPoint',
      template: 'ExtractStringFromPoint',
      recompile: shouldRecompile('ExtractStringFromPoint.circom'),
    })
    const witness = await circuit.calculateWitness({ pointAsBytes })
    const length = Number(await getSignal(circuit, witness, 'length'))
    // Was the circuit able to extract the string's bytes?
    const extracted = (
      await getVectorSignal(circuit, witness, 'stringAsBytes', 31)
    )
      .slice(0, length)
      .map((x) => Number(x))
    // Convert bytes back into ASCII, to compare to original input
    const extractedString = new TextDecoder().decode(Uint8Array.from(extracted))
    // console.log({ extractedString })

    expect(extractedString).toBe(votePlaintext)
  })

  it.skip('our circuit can RP.fromHex() and confirm the point is valid', async () => {})
})

describe('HashAdminSalt circuit', function () {
  it('should hash the admin_secret_salt correctly', async () => {
    const circuit = await circomkit.WitnessTester('HashAdminSalt', {
      file: './HashAdminSalt',
      template: 'HashAdminSalt',
      recompile: shouldRecompile('HashAdminSalt.circom'),
    })

    const admin_secret_salt = 123456789n
    const expectedHash =
      7110303097080024260800444665787206606103183587082596139871399733998958991511n
    const witness = await circuit.calculateWitness({ admin_secret_salt })
    const hash = await getSignal(circuit, witness, 'hash_of_admin_secret_salt')
    expect(hash).toBe(expectedHash)

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
    expect(hash2).toBe(expectedHash2)
    expect(hash2).not.toBe(hash)
  })
})
