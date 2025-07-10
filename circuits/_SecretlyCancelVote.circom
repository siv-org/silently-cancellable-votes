pragma circom 2.2.2;

include "EncryptVote.circom";
include "ExtractStringFromPoint.circom";
include "MembershipProof.circom";
include "MerkleRoot.circom";
include "poseidon.circom";
include "HashAdminSalt.circom";

template SecretlyCancelVote(TREE_DEPTH) {
    // var TREE_DEPTH = 16; // 2^16, up to 65k votes per root

    // Public inputs
    signal input root_hash_of_all_encrypted_votes; // poseidon_hash
    signal input election_public_key[4][3]; // RistrettoPoint.toBytes()
    signal input actual_state_tree_depth;

    // Private inputs
    signal input encoded_vote_to_secretly_cancel[4][3]; // bytes[32]
    signal input votes_secret_randomizer; // bigint
    // signal input index_of_vote_to_cancel; // integer
    signal input merkle_path_of_cancelled_vote[TREE_DEPTH]; // poseidon_hash[]
    signal input merkle_path_index; // integer
    signal input admin_secret_salt; // bigint

    // 1) Confirm encrypted vote is in the tree
    // 1a) First we need to encrypt our vote again
    signal encrypted_vote_to_cancel[4][3];
    encrypted_vote_to_cancel <== EncryptVote()(election_public_key, encoded_vote_to_secretly_cancel, votes_secret_randomizer);

    // Note: Because the above call depends on `votes_secret_randomizer`, it also helps prevent admin from cancelling unauthorized votes, since only voter knows the randomizer, not admin.

    // 1b) Then we use the merkle path to prove it's in the set of all encrypted votes
    MembershipProof(TREE_DEPTH)(encrypted_vote_to_cancel, actual_state_tree_depth, merkle_path_index, merkle_path_of_cancelled_vote, root_hash_of_all_encrypted_votes);

    // Public outputs

    // 2) Prove the cancelled vote content
    var MAX_VOTE_CONTENT_LENGTH = 32 - 1 - 15; // 32 - length_byte - 15_bytes_for_verification_number
    signal output vote_selection_to_cancel[MAX_VOTE_CONTENT_LENGTH]; // integer[], eg. 'abca' -> [97, 98, 99, 97]
    vote_selection_to_cancel <== ExtractVoteSelectionFromVote(31)(encoded_vote_to_secretly_cancel);

    // 3) Prove the cancelled vote is unique
    // @todo not sure we need this?
    signal output salted_hash_of_vote_to_cancel <== Poseidon(2)([admin_secret_salt, encoded_vote_to_secretly_cancel]);

    // 3b) Prove the admin's secret salt is consistent across all cancelled votes
    signal output hash_of_admin_secret_salt <== HashAdminSalt()(admin_secret_salt);
}