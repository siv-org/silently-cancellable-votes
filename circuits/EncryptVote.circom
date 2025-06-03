pragma circom 2.2.2;

include "ed25519/point-addition.circom";
include "ed25519/scalar-multiplication.circom";

template EncryptVote() {
    signal input election_public_key[4][3]; // aka `recipient`, chunkedRistrettoPoint
    signal input encoded_vote_to_secretly_cancel[4][3]; // chunkedRistrettoPoint
    signal input votes_secret_randomizer[255]; // bitify(bigint)

    // We recalculate the encrypted ciphertext using the Elliptic Curve ElGamal algorithm:
    // Encrypted = Encoded + (Recipient * randomizer)

    // First we calc the shared secret: recipient * randomizer
    signal shared_secret[4][3];
    shared_secret <== ScalarMul()(votes_secret_randomizer, election_public_key);

    // Then we add the encoded vote to the shared secret
    signal output encrypted_vote[4][3];
    encrypted_vote <== PointAdd()(encoded_vote_to_secretly_cancel, shared_secret);
}