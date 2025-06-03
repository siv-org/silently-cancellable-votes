pragma circom 2.2.2;

include "poseidon.circom";

template HashAdminSalt() {
    // Private input
    signal input admin_secret_salt; // bigint

    // Output
    // Hash the input using Poseidon w/ 1 input
    signal output hash_of_admin_secret_salt <== Poseidon(1)([admin_secret_salt]);
}

// npx snarkjs r1cs info build/HashAdminSalt.r1cs
// [INFO]  snarkJS: Curve: bn-128
// [INFO]  snarkJS: # of Wires: 417
// [INFO]  snarkJS: # of Constraints: 415
// [INFO]  snarkJS: # of Private Inputs: 1
// [INFO]  snarkJS: # of Public Inputs: 0
// [INFO]  snarkJS: # of Labels: 583
// [INFO]  snarkJS: # of Outputs: 1