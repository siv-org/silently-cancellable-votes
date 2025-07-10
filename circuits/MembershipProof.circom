pragma circom 2.2.2;

include "./MerkleRoot.circom";
include "poseidon.circom";

// To hash a Ristretto Point, which is a 4x3 array of arrays:
// [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11, 12]]
// hash4( hash3([1,2,3]), hash3([4,5,6]), hash3([7,8,9]), hash3([10,11,12]) )
template HashPoint() {
    signal input point_to_hash[4][3];
    signal output hash;

    signal x_hash <== Poseidon(3)([point_to_hash[0][0], point_to_hash[0][1], point_to_hash[0][2]]);
    signal y_hash <== Poseidon(3)([point_to_hash[1][0], point_to_hash[1][1], point_to_hash[1][2]]);
    signal z_hash <== Poseidon(3)([point_to_hash[2][0], point_to_hash[2][1], point_to_hash[2][2]]);
    signal t_hash <== Poseidon(3)([point_to_hash[3][0], point_to_hash[3][1], point_to_hash[3][2]]);
    hash <== Poseidon(4)([x_hash, y_hash, z_hash, t_hash]);
}

template MembershipProof(TREE_DEPTH) {
    signal input encrypted_vote_to_cancel[4][3]; // poseidon_hash
    signal input actual_state_tree_depth; // integer
    signal input merkle_path_index; // integer
    signal input merkle_path_of_cancelled_vote[TREE_DEPTH]; // poseidon_hash[]
    signal input root_hash_of_all_encrypted_votes; // poseidon_hash

    signal hashed_encrypted_vote_to_cancel <== HashPoint()(encrypted_vote_to_cancel);

    // Recalculate the root with the encrypted vote and merkle proof
    signal computed_root <== BinaryMerkleRoot(TREE_DEPTH)(hashed_encrypted_vote_to_cancel, actual_state_tree_depth, merkle_path_index, merkle_path_of_cancelled_vote);

    // ensure it matches the public input
    computed_root === root_hash_of_all_encrypted_votes;
}

// npx snarkjs r1cs info build/MembershipProof.r1cs
// [INFO]  snarkJS: Curve: bn-128
// [INFO]  snarkJS: # of Wires: 11574
// [INFO]  snarkJS: # of Constraints: 11544
// [INFO]  snarkJS: # of Private Inputs: 46
// [INFO]  snarkJS: # of Public Inputs: 0
// [INFO]  snarkJS: # of Labels: 17510
// [INFO]  snarkJS: # of Outputs: 0