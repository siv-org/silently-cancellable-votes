pragma circom 2.0.0;

// This example circuit checks that `c` is the multiplication of `a` and `b`.

template MultiplierDemo () {
   // Declaration of signals
   signal input a;
   signal input b;

   // Constraints
   signal output c <== a * b;
}
