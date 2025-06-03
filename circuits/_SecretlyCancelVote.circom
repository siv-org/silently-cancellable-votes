pragma circom 2.2.2;

template SecretlyCancelVote() {
    var TREE_DEPTH = 16; // 2^16, up to 65k votes per root

    // Public inputs
    signal input root_hash_of_all_encrypted_votes; // poseidon_hash
    signal input election_public_key[32]; // RistrettoPoint.toBytes()

    // Private inputs
    signal encoded_vote_to_secretly_cancel[32]; // bytes[32]
    signal votes_secret_randomizer; // bigint
    signal index_of_vote_to_cancel; // integer
    signal merkle_path_of_cancelled_vote[TREE_DEPTH]; // poseidon_hash[]
    signal admin_secret_salt; // bigint

    // 1) Confirm encrypted vote is in the tree
    // 1a) First we need to encrypt our vote again
    signal encrypted_vote_to_cancel <== EncryptVote()(election_public_key, encoded_vote_to_secretly_cancel, votes_secret_randomizer);
    // Note: Because the above call depends on `votes_secret_randomizer`, it also helps prevent admin from cancelling unauthorized votes, since only voter knows the randomizer, not admin.
    // 1b) Then we use the merkle path to prove it's in the set of all encrypted votes
    assert(MembershipProof(TREE_DEPTH)(root_hash_of_all_encrypted_votes, encrypted_vote_to_cancel, index_of_vote_to_cancel, merkle_path_of_cancelled_vote) == 1);

    // Public outputs

    // 2) Prove the cancelled vote content
    var MAX_VOTE_CONTENT_LENGTH = 32 - 1 - 15; // 32 - length_byte - 15_bytes_for_verification_number
    signal output vote_selection_to_cancel[MAX_VOTE_CONTENT_LENGTH]; // integer[], eg. 'abca' -> [97, 98, 99, 97]
    vote_selection_to_cancel <== ExtractVoteSelectionFromPoint(MAX_VOTE_CONTENT_LENGTH)(encoded_vote_to_secretly_cancel);

    // 3) Prove the cancelled vote is unique
    signal output salted_hash_of_vote_to_cancel <== PoseidonHash(2)(admin_secret_salt, encoded_vote_to_secretly_cancel);

    // 4) Prove the admin's secret salt is consistent across all cancelled votes
    signal output hash_of_admin_secret_salt <== PoseidonHash(1)(admin_secret_salt);
}