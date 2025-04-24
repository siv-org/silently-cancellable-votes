include "../node_modules/circomlib/poseidon.circom";
include "../node_modules/ed25519-circom/src/ed25519.circom";

component main {public [merkleRoot, voteHash, claimedSum]} = CancelProof();

// Config: set these to your fixed batch size
const VOTE_COUNT = 20;

// A single vote point proof
template CancelProof() {
    // Public Inputs
    signal input merkleRoot;               // Merkle root of all encrypted votes
    signal input voteHash;                 // Poseidon hash of candidate encrypted point
    signal input claimedSum;               // Public claimed sum (or hash of it)

    // Private Inputs
    signal input encoded_x[VOTE_COUNT];
    signal input encoded_y[VOTE_COUNT];
    signal input recipient_x;
    signal input recipient_y;
    signal input randomizers[VOTE_COUNT];
    signal input merkleProofs[VOTE_COUNT][TREE_DEPTH];
    signal input merklePositions[VOTE_COUNT][TREE_DEPTH];

    // Internal
    signal sumHashInputs[VOTE_COUNT];

    // Constants
    component edAdd[VOTE_COUNT];
    component edMul[VOTE_COUNT];
    component poseidonLeaf[VOTE_COUNT];
    component merkleCheck[VOTE_COUNT];

    for (var i = 0; i < VOTE_COUNT; i++) {
        // Prepare input points
        signal vote_x = encoded_x[i];
        signal vote_y = encoded_y[i];

        // EC operations
        edMul[i] = Ed25519ScalarMult();
        edMul[i].P[0] <== recipient_x;
        edMul[i].P[1] <== recipient_y;
        edMul[i].e <== randomizers[i];

        edAdd[i] = Ed25519Add();
        edAdd[i].A[0] <== vote_x;
        edAdd[i].A[1] <== vote_y;
        edAdd[i].B[0] <== edMul[i].out[0];
        edAdd[i].B[1] <== edMul[i].out[1];

        // Poseidon hash the resulting ciphertext
        poseidonLeaf[i] = Poseidon(2);
        poseidonLeaf[i].inputs[0] <== edAdd[i].out[0];
        poseidonLeaf[i].inputs[1] <== edAdd[i].out[1];

        // Inclusion proof
        merkleCheck[i] = MerkleProof(TREE_DEPTH);
        merkleCheck[i].leaf <== poseidonLeaf[i].out;
        merkleCheck[i].path <== merkleProofs[i];
        merkleCheck[i].positions <== merklePositions[i];
        merkleCheck[i].root === merkleRoot;

        // Sum placeholder — replace with actual plaintext-to-vote-value logic
        sumHashInputs[i] <== poseidonLeaf[i].out; // placeholder for sum logic
    }

    // Optional: hash all vote values for sum check
    component voteSumHash = Poseidon(VOTE_COUNT);
    for (var i = 0; i < VOTE_COUNT; i++) {
        voteSumHash.inputs[i] <== sumHashInputs[i];
    }
    voteSumHash.out === claimedSum;
}

// Note:
// - You need to preprocess each vote to extract x/y of encoded point.
// - TREE_DEPTH must be defined based on your Merkle tree height.
// - You'll want to replace sum logic with real vote-content parsing.
// - Could optimize using fixed-point or bits if needed.