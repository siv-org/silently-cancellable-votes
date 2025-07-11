pragma circom 2.2.2;

include "bitify.circom";
include "ed25519/chunkedadd.circom";
include "ed25519/chunkedsub.circom";
include "ed25519/chunkedmul.circom";
include "ChunkedSqrt.circom";

template RistrettoToBytes() {
    // Input: x, y, z, t in chunked form
    signal input P[4][3];

    // Output compressed s in bytes
    signal output s_bytes[32];

    var base = 85;

    // Step 1: u1 = (z + y)*(z - y)
    component add_z_y = ChunkedAdd(3, 3, base);
    component sub_z_y = ChunkedSub(3, base);
    for (var i = 0; i < 3; i++) {
        add_z_y.a[i] <== P[2][i]; // z
        add_z_y.b[i] <== P[1][i]; // y
        sub_z_y.a[i] <== P[2][i];
        sub_z_y.b[i] <== P[1][i];
    }

    component mul_u1 = ChunkedMul(3, 3, base);
    for (var i = 0; i < 3; i++) {
        mul_u1.a[i] <== add_z_y.out[i];
        mul_u1.b[i] <== sub_z_y.out[i];
    }

    // Step 2: u2 = x * y
    component mul_u2 = ChunkedMul(3, 3, base);
    for (var i = 0; i < 3; i++) {
        mul_u2.a[i] <== P[0][i]; // x
        mul_u2.b[i] <== P[1][i]; // y
    }

    // Step 3: invsqrt = invertSqrt(u1 * u2^2)
    component sq_u2 = ChunkedSquare(3, base);
    for (var i = 0; i < 3; i++) {
        sq_u2.a[i] <== mul_u2.out[i];
    }

    component mul_sqrt = ChunkedMul(3, 3, base);
    for (var i = 0; i < 3; i++) {
        mul_sqrt.a[i] <== mul_u1.out[i];
        mul_sqrt.b[i] <== sq_u2.out[i];
    }

    component invsqrt = ChunkedInvertSqrt(3, 3, base);
    for (var i = 0; i < 3; i++) {
        invsqrt.a[i] <== mul_sqrt.out[i];
    }

    // Step 4: D1 = invsqrt * u1
    component mul_D1 = ChunkedMul(3, 3, base);
    for (var i = 0; i < 3; i++) {
        mul_D1.a[i] <== invsqrt.out[i];
        mul_D1.b[i] <== mul_u1.out[i];
    }

    // Step 5: D2 = invsqrt * u2
    component mul_D2 = ChunkedMul(3, 3, base);
    for (var i = 0; i < 3; i++) {
        mul_D2.a[i] <== invsqrt.out[i];
        mul_D2.b[i] <== mul_u2.out[i];
    }

    // Continue with:
    // - zInv = D1 * D2 * t
    // - sign checks: IsNegativeChunked(t * zInv) and IsNegativeChunked(x * zInv)
    // - conditional swaps (via Multiplexor2 on chunks)
    // - compute final s = (z - adjusted_y) * D
    // - final IsNegativeChunked(s) to ensure positive

    // Example: final assign
    for (var i = 0; i < 3; i++) {
        s[i] <== final_s_value[i]; // from your last step after sign fix
    }

    component sToBytes = ChunkedToBytes(3, base);
    for (var i = 0; i < 3; i++) {
        sToBytes.in[i] <== s[i];
    }

    for (var i = 0; i < 32; i++) {
        s_bytes[i] <== sToBytes.out[i];
    }
}


template ChunkedToBytes(chunks, chunkbits) {
    signal input in[chunks];
    signal output out[32];

    var totalbits = chunks * chunkbits;
    component bits = Num2Bits(totalbits);
    var i;
    for (i = 0; i < chunks; i++) {
        bits.in += in[i] * (2**(i * chunkbits));
    }

    for (var j = 0; j < 32; j++) {
        out[j] = 0;
        for (var k = 0; k < 8; k++) {
            out[j] += bits.out[j*8 + k] * (1 << k);
        }
    }
}