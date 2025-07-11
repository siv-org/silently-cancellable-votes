import { LeanIMT, LeanIMTHashFunction } from '@zk-kit/lean-imt'

import { poseidon } from './utils'

// ranked choice example
const endpoint = 'https://siv.org/api/election/1752077246319/accepted-votes'
// normal vote
const normalVoteEndpoint =
  'https://siv.org/api/election/1752095348369/accepted-votes'
/**
 * 1. Get votes from an endpoint as a JSON array
 * 2. Extract encrypted votes for each option (ranked choice)
 * 3. For each vote, chunk the encrypted field
 */
export const genMerkleTree = () => {
  const votes: string[] = []

  // RP.fromHex(encrypted)

  /**
     *     // To hash the encrypted_vote, which is a 4x3 array of arrays:
    // [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]]
    // hash4( hash3([1,2,3]), hash3([4,5,6]), hash3([7,8,9]), hash3([10,11,12]) )
    signal x_hash <== Poseidon(3)([encrypted_vote_to_cancel[0][0], encrypted_vote_to_cancel[0][1], encrypted_vote_to_cancel[0][2]]);
    signal y_hash <== Poseidon(3)([encrypted_vote_to_cancel[1][0], encrypted_vote_to_cancel[1][1], encrypted_vote_to_cancel[1][2]]);
    signal z_hash <== Poseidon(3)([encrypted_vote_to_cancel[2][0], encrypted_vote_to_cancel[2][1], encrypted_vote_to_cancel[2][2]]);
    signal t_hash <== Poseidon(3)([encrypted_vote_to_cancel[3][0], encrypted_vote_to_cancel[3][1], encrypted_vote_to_cancel[3][2]]);
    signal hashed_encrypted_vote_to_cancel <== Poseidon(4)([x_hash, y_hash, z_hash, t_hash]);
     */

  // create a merkle tree
  const merkleTree = new LeanIMT(
    poseidon as unknown as LeanIMTHashFunction,
    votes.map((vote) => poseidon([BigInt(`0x${vote}`)]))
  )

  const root = merkleTree.root

  console.log({ root })
}
