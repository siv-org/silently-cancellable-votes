pragma circom 2.2.2;

template CancelVote() {
    // Public inputs
    signal input root_hash_of_all_encrypted_votes; // poseidon hash
    signal input election_public_key; // hex_string.toBytes()

    // Private inputs
    signal encoded_vote_to_secretly_cancel; // bytes[32]
    signal secret_randomizer; // bigint
    signal index_of_vote_to_cancel; // integer
    signal merkle_path_of_cancelled_vote; // hash[]
    signal admin_secret_salt; // bigint

    // Public outputs
    signal output vote_selection_to_cancel; // array of digits like toDigits('washington') -> [119, 97, 115, 104, 105, 110, 103, 116, 111, 110]
    signal output salted_hash_of_vote_to_cancel; // poseidon_hash
    signal output hash_of_admin_secret_salt; // poseidon_hash

    // 1) Confirm encrypted vote is in the tree
    // 1a) First we need to encrypt our vote again
    signal encrypted_vote_to_cancel <== EncryptVote(election_public_key, encoded_vote_to_secretly_cancel, secret_randomizer);
    // 1b) Then we use the merkle path to prove it's in the set of all encrypted votes
    assert(MembershipProof(root_hash_of_all_encrypted_votes, encrypted_vote_to_cancel, index_of_vote_to_cancel, merkle_path_of_cancelled_vote) == 1);

    // 2) Prove the cancelled vote content
    vote_selection_to_cancel <== ExtractVoteSelectionFromPoint(encoded_vote_to_secretly_cancel);

    // 3) Prove the cancelled vote is unique
    salted_hash_of_vote_to_cancel <== PoseidonHash(admin_secret_salt, encoded_vote_to_secretly_cancel);

    // 4) Prove the admin's secret salt is consistent across all cancelled votes
    hash_of_admin_secret_salt <== PoseidonHash(admin_secret_salt);
}