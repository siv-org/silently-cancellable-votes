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
  poseidon,
} from '../utils.ts'
import { pointToString, stringToPoint } from '../curve.ts'
import { shouldRecompile } from '../watch-circuits.ts'

describe('Basic multiplier (example)', () => {
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

describe('Ed25519 circuits', () => {
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

  describe.skip('Scalar multiplication', () => {
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

describe('EnforcePrimeOrder()', () => {
  it.only('should enforce prime order', async () => {
    try {
      const circuit = await circomkit.WitnessTester('EnforcePrimeOrder', {
        file: './EnforcePrimeOrder',
        template: 'EnforcePrimeOrder',
        recompile: shouldRecompile('EnforcePrimeOrder.circom'),
      })

      // For a valid ristretto point, the circuit should pass
      const ristrettoPoint = stringToPoint('foobar')
      // @ts-expect-error Overriding .ep privatization
      const P_ep = ristrettoPoint.ep as ed.ExtendedPoint
      const P = chunk(xyztObjToArray(P_ep))

      const witness = await circuit.calculateWitness({ P })
      circuit.expectConstraintPass(witness)

      // And try to make it fail by adding the point to itself
      const P3 = P_ep.multiply(3n)

      // console.log(chunk(xyztObjToArray(P8.ep)))
      const witness2 = await circuit.calculateWitness({
        P: chunk(xyztObjToArray(P3)),
      })
      circuit.expectConstraintFail(witness2)
    } catch (e: any) {
      console.log(e.message)
    }
  })
})

describe('EncryptVote()', () => {
  it.skip('should get same results encrypting from JS or circuit', async () => {
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
      ['encrypted_vote']
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
  })

  it.todo(
    'should be resistant to subgroup-variant small cofactor attacks',
    () => {
      // I.e. produce different results from subgroup-variant encoded points
      // encoded point_1
      // derive encoded point_2 from encoded point_1
      // Should result in distinct ciphertexts
    }
  )
})

describe('MembershipProof()', () => {
  it('poseidon() should get the same results in JS and circuit', async () => {
    const circuit = await circomkit.WitnessTester('HashAdminSalt', {
      file: './HashAdminSalt',
      template: 'HashAdminSalt',
      recompile: shouldRecompile('HashAdminSalt.circom'),
    })

    const input = [1231455345345324n]
    const witness = await circuit.calculateWitness({ admin_secret_salt: input })
    const hash = await getSignal(circuit, witness, 'hash_of_admin_secret_salt')

    const hashInJS = poseidon(input)

    expect(hash).toBe(hashInJS)
  })

  it.todo('returns true iff items are present in the tree', async () => {
    try {
      // Init circuit
      const circuit = await circomkit.WitnessTester('MembershipProof', {
        file: './MembershipProof',
        template: 'MembershipProof',
        recompile: shouldRecompile('MembershipProof.circom'),
        params: [16],
      })

      // Build a tree of 16 leaves
      // @ts-expect-error Overriding .ep privatization
      const encrypted_vote_to_cancel = stringToPoint('foobar').ep
      const actual_state_tree_depth = 16
      const merkle_path_indices = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      ]
      const merkle_path_of_cancelled_vote = [
        0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
      ]
      const root_hash_of_all_encrypted_votes = poseidon(
        [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(BigInt)
      )

      // Calculate witness for good inputs
      const witness = await circuit.calculateWitness({
        encrypted_vote_to_cancel, // poseidon_hash[4][3]
        actual_state_tree_depth, // integer
        merkle_path_indices, // integer[TREE_DEPTH]
        merkle_path_of_cancelled_vote, // poseidon_hash[TREE_DEPTH]
        root_hash_of_all_encrypted_votes, // poseidon_hash
      })
      // Passes on good inputs
      circuit.expectConstraintPass(witness)

      // Calculate witness for bad inputs
      const witness2 = await circuit.calculateWitness({
        encrypted_vote_to_cancel, // poseidon_hash[4][3]
        actual_state_tree_depth, // integer
        merkle_path_indices, // integer[TREE_DEPTH]
        merkle_path_of_cancelled_vote, // poseidon_hash[TREE_DEPTH]
        root_hash_of_all_encrypted_votes, // poseidon_hash
      })
      // Fails on bad inputs
      circuit.expectConstraintFail(witness2)
    } catch (e: any) {
      console.log(e.message)
      throw new Error('Finish implementation')
    }
  })
})

describe('Encoding votes', () => {
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
})

describe('HashAdminSalt circuit', () => {
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
