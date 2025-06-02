pragma circom 2.2.2;

template EncryptVote() {
    signal input election_public_key[32]; // aka `recipient`, RistrettoPoint.toBytes()
    signal input encoded_vote_to_secretly_cancel[32]; // bytes[32]
    signal input votes_secret_randomizer; // bigint

    signal output encrypted_vote[32]; // bytes[32]

    // We recalculate the encrypted ciphertext using the Elliptic Curve ElGamal algorithm:
    // Encrypted = Encoded + (Recipient * randomizer)

    signal shared_secret <== ScalarMult(election_public_key, votes_secret_randomizer);
    signal output encrypted_vote <== PointAddition(encoded_vote_to_secretly_cancel, shared_secret);
}