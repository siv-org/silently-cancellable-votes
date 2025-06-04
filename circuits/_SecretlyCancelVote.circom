pragma circom 2.2.2;

include "./MerkleRoot.circom";
include "poseidon.circom";

template MemebershipProof(TREE_DEPTH) {
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

template SecretlyCancelVote(TREE_DEPTH) {
    // var TREE_DEPTH = 16; // 2^16, up to 65k votes per root

    // Public inputs
    signal input root_hash_of_all_encrypted_votes; // poseidon_hash
    signal input election_public_key[32]; // RistrettoPoint.toBytes()
    signal input actual_state_tree_depth;

    // Private inputs
    signal input encoded_vote_to_secretly_cancel[32]; // bytes[32]
    signal input votes_secret_randomizer; // bigint
    // signal input index_of_vote_to_cancel; // integer
    signal input merkle_path_of_cancelled_vote[TREE_DEPTH]; // poseidon_hash[]
    signal input merkle_path_indices[TREE_DEPTH]; // integer[]
    signal input admin_secret_salt; // bigint

    // 1) Confirm encrypted vote is in the tree
    // 1a) First we need to encrypt our vote again
    signal encrypted_vote_to_cancel <== EncryptVote()(election_public_key, encoded_vote_to_secretly_cancel, votes_secret_randomizer);

    // Note: Because the above call depends on `votes_secret_randomizer`, it also helps prevent admin from cancelling unauthorized votes, since only voter knows the randomizer, not admin.
    MemebershipProof(TREE_DEPTH)(root_hash_of_all_encrypted_votes, encrypted_vote_to_cancel, actual_state_tree_depth, merkle_path_indices, merkle_path_of_cancelled_vote);

    // Public outputs

    // 2) Prove the cancelled vote content
    var MAX_VOTE_CONTENT_LENGTH = 32 - 1 - 15; // 32 - length_byte - 15_bytes_for_verification_number
    signal output vote_selection_to_cancel[MAX_VOTE_CONTENT_LENGTH]; // integer[], eg. 'abca' -> [97, 98, 99, 97]
    vote_selection_to_cancel <== ExtractVoteSelectionFromPoint(MAX_VOTE_CONTENT_LENGTH)(encoded_vote_to_secretly_cancel);

    // 3) Prove the cancelled vote is unique
    signal output salted_hash_of_vote_to_cancel <== PoseidonHash(2)(admin_secret_salt, encoded_vote_to_secretly_cancel);

    // 3b) Prove the admin's secret salt is consistent across all cancelled votes
    signal output hash_of_admin_secret_salt <== PoseidonHash(1)(admin_secret_salt);
}