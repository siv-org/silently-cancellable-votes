include "./MerkleRoot.circom";
include "poseidon.circom";

template MembershipProof(TREE_DEPTH) {
    signal input encrypted_vote_to_cancel[4][3]; // poseidon_hash
    signal input actual_state_tree_depth; // integer
    signal input merkle_path_indices[TREE_DEPTH]; // integer[]
    signal input merkle_path_of_cancelled_vote[TREE_DEPTH]; // poseidon_hash[]
    signal input root_hash_of_all_encrypted_votes; // poseidon_hash

    // hash the encrypted vote
    // [4][3]
    // [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]]
    // hash4(hash3([1,2,3]), hash3([4,5,6]), hash3([7,8,9]), hash3([10,11,12]))
    var tmpHash1 = PoseidonHash(3)(encrypted_vote_to_cancel[0][0], encrypted_vote_to_cancel[0][1], encrypted_vote_to_cancel[0][2]);
    var tmpHash2 = PoseidonHash(3)(encrypted_vote_to_cancel[1][0], encrypted_vote_to_cancel[1][1], encrypted_vote_to_cancel[1][2]);
    var tmpHash3 = PoseidonHash(3)(encrypted_vote_to_cancel[2][0], encrypted_vote_to_cancel[2][1], encrypted_vote_to_cancel[2][2]);
    var tmpHash4 = PoseidonHash(3)(encrypted_vote_to_cancel[3][0], encrypted_vote_to_cancel[3][1], encrypted_vote_to_cancel[3][2]);
    signal hashed_encrypted_vote_to_cancel <== PoseidonHash(4)(tmpHash1, tmpHash2, tmpHash3, tmpHash4);

    // recalculate the root with the encrypted vote and merkle proof
    var computed_root = BinaryMerkleTree(TREE_DEPTH)(hashed_encrypted_vote_to_cancel, actual_state_tree_depth, merkle_path_indices, merkle_path_of_cancelled_vote);

    // ensure it matches the public input
    computed_root === root_hash_of_all_encrypted_votes;
}