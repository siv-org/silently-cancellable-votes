pragma circom 2.0.0;

// A simple circuit to demonstrate basic arithmetic assertions
template BasicArithmetic() {
    // Input signals
    signal input a;
    signal input b;

    // Output signals
    signal output sum;
    signal output product;

    // Basic arithmetic operations
    sum <== a + b;
    product <== a * b;

    // Assertions
    // 1. Assert that 1 + 1 = 2
    signal one_plus_one;
    one_plus_one <== 1 + 1;
    one_plus_one === 2;

    // 2. Assert that 2 + 2 != 5
    signal two_plus_two;
    two_plus_two <== 2 + 2;
    two_plus_two !== 5;
}

// Main component
component main = BasicArithmetic();