pragma circom 2.2.2;

include "poseidon.circom";

template HashAdminSalt() {
    // Private input
    signal input admin_secret_salt; // bigint

    // Output
    // Hash the input using Poseidon w/ 1 input
    signal output hash_of_admin_secret_salt <== Poseidon(1)([admin_secret_salt]);
}