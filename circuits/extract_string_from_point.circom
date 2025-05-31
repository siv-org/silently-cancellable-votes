pragma circom 2.0.0;

include "comparators.circom";

// This circuit is the circom equivalent of our `extract()` function from `curve.ts`.
// It extracts an embedded string from a Ristretto point, and returns the string as individual bytes.
// Since circom doesn't support strings, we represent the string as a series of bytes.

template ExtractStringFromPoint() {
    var maxLength = 31; // 32 bytes - 1 byte for length

    // Input: serialized point as bytes
    signal input pointAsBytes[32];

    // Output: extracted string as individual bytes
    signal output stringAsIntegers[maxLength];

    // Extract length from first byte (right shifted by 1)
    signal shiftedFirstByte <-- (pointAsBytes[0] >> 1);
    signal output length <== shiftedFirstByte;

    // Extract the embedded string bytes:
    // For each possible string byte, output the value if `i < length`, else output 0.
    // Since the 1st byte was reserved for the length, we use `pointAsBytes[i + 1]`.
    component isLts[maxLength];
    for (var i = 0; i < maxLength; i++) {
        isLts[i] = LessThan(5);
        // if (i < length)
        isLts[i].in[0] <== i;
        isLts[i].in[1] <== length;
        // then { emit byte[i + 1] } else { emit 0 }
        stringAsIntegers[i] <== isLts[i].out * pointAsBytes[i + 1];
        // `i + 1` because the first byte is reserved for `length`
    }
}
