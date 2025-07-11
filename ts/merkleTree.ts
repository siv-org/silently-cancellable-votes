import { LeanIMT, LeanIMTHashFunction } from '@zk-kit/lean-imt'

import { poseidon } from './utils'

// Example JSON array of votes
// const endpoint = 'https://siv.org/api/election/1752095348369/accepted-votes'

/** 1. Get array of all votes, eg from a JSON endpoint
 *  2. Extract `encrypted` field from each vote
 *  3. Chunk the encrypted field */
export const genMerkleTree = () => {
  const votes: string[] = []

  // RP.fromHex(encrypted)

  // To hash a Ristretto Point, which is a 4x3 array of arrays:
  // [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]]
  // hash4( hash3([1,2,3]), hash3([4,5,6]), hash3([7,8,9]), hash3([10,11,12]) )

  // Create a merkle tree
  const merkleTree = new LeanIMT(
    poseidon as unknown as LeanIMTHashFunction,
    votes.map((vote) => poseidon([BigInt(`0x${vote}`)]))
  )

  const root = merkleTree.root

  console.log({ root })
}
