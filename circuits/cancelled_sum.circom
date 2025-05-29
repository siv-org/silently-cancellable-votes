pragma circom 2.0.0;

template CancelledSum() {
    // Public inputs
    signal input root_hash_of_all_encrypted_votes; // poseidon hash
    signal input claimed_sum_of_cancelled_votes_subset; // integer
    signal input election_public_key; // hex_string.toBytes()
    signal input salted_hashes_of_votes_to_cancel; // poseidon_hashes[]
    signal input hash_of_admin_secret_salt; // poseidon_hash
    signal input vote_selection_for_this_batch: // array of digits like toDigits('washington') -> [119, 97, 115, 104, 105, 110, 103, 116, 111, 110]

    // Private inputs
    signal input votes_to_secretly_cancel; // { encoded: hex_string.toBytes(), randomizer: bigint }[]
    signal input merkle_path_of_votes_to_cancel; 
    signal input admin_secret_salt; // bigint
}