pragma circom 2.0.0;

include "poseidon.circom";

template HashAdminSalt() {
    // Private input
    signal input admin_secret_salt; // bigint

    // Output
    signal output hash_of_admin_secret_salt;

    // Hash the input using Poseidon w/ 1 input
    component hasher = Poseidon(1);
    hasher.inputs[0] <== admin_secret_salt;

    hash_of_admin_secret_salt <== hasher.out;
}