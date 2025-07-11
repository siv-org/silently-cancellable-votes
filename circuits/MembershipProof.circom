pragma circom 2.2.2;

include "./MerkleRoot.circom";
include "HashPoint.circom";

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