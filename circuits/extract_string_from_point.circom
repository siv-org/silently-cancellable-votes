pragma circom 2.0.0;

include "comparators.circom";

template ExtractStringFromPoint() {
    var maxLength = 31; // 32 bytes - 1 byte for length

    // Input: serialized point as bytes
    signal input pointAsBytes[32];

    // Output: extracted string as bytes (integers)
    signal output stringAsIntegers[maxLength];

    // Extract length from first byte (right shift by 1)
    signal shiftedFirstByte <-- (pointAsBytes[0] >> 1);
    signal output length <== shiftedFirstByte;

    // Emit string values
    component isLts[maxLength];
    for (var i = 0; i < maxLength; i++) {
        isLts[i] = LessThan(5);
        isLts[i].in[0] <== i;
        isLts[i].in[1] <== length;
        stringAsIntegers[i] <== isLts[i].out * pointAsBytes[i + 1];
    }
}
