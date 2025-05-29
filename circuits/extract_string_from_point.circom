pragma circom 2.0.0;

include "bitify.circom";
include "comparators.circom";

template ExtractStringFromPoint() {
    var maxLength = 31; // 32 bytes - 1 byte for length

    // Input: serialized point as bytes
    signal input pointAsBytes[32];

    // Output: extracted string as bytes (integers)
    signal output stringAsIntegers[maxLength];

    // Extract length from first byte (right shift by 1)
    signal byte0;
    byte0 <-- pointAsBytes[0];

    component unpack = Num2Bits(8);
    unpack.in <== byte0;

    signal output length;
    signal partials[7];
    // shift right by 1, drop bit 0
    for (var i = 1; i < 8; i++) {
        partials[i - 1] <== unpack.out[i] * (1 << (i - 1));
    }
    length <== partials[0] + partials[1] + partials[2] + partials[3] + partials[4] + partials[5] + partials[6];

    // Emit string values
    component isLts[maxLength];
    for (var i = 0; i < maxLength; i++) {
        isLts[i] = LessThan(5);
        isLts[i].in[0] <== i;
        isLts[i].in[1] <== length;
        stringAsIntegers[i] <== isLts[i].out * pointAsBytes[i + 1];
    }
}
