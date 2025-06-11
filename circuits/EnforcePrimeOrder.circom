pragma circom 2.2.2;

include "ed25519/point-addition.circom";
include "comparators.circom";

template EnforcePrimeOrder() {
    signal input P[4][3];

    // Multiply by 8, by doubling 3 times
    signal P2[4][3];
    signal P4[4][3];
    signal P8[4][3];

    P2 <== DoublePt()(P);
    P4 <== DoublePt()(P2);
    P8 <== DoublePt()(P4);

    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 3; j++) {
            // log(P[i][j]);
            // log(P2[i][j]);
            // log(P4[i][j]);
            // log(P8[i][j]);
        }
    }


    // Enforce P8 == identity
    IsNotIdentityPoint()(P2);
    IsNotIdentityPoint()(P4);
    IsNotIdentityPoint()(P8);
}

template IsNotIdentityPoint() {
    signal input P[4][3];

    // Typical identity: (X=0, Y=1, Z=1, T=0)

    // X == 0
    var x1 = IsEqual()([P[0][0], 0]);
    var x2 = IsEqual()([P[0][1], 0]);
    var x3 = IsEqual()([P[0][2], 0]);
    x1 + x2 + x3 === 0;


    // Y == 1
    var y1 = IsEqual()([P[1][0], 1]);
    var y2 = IsEqual()([P[1][1], 0]);
    var y3 = IsEqual()([P[1][2], 0]);
    y1 + y2 + y3 === 0;

    // Z == 1
    var z1 = IsEqual()([P[2][0], 1]);
    var z2 = IsEqual()([P[2][1], 0]);
    var z3 = IsEqual()([P[2][2], 0]);
    z1 + z2 + z3 === 0;

    // T == 0
    var t1 = IsEqual()([P[3][0], 0]);
    var t2 = IsEqual()([P[3][1], 0]);
    var t3 = IsEqual()([P[3][2], 0]);
    t1 + t2 + t3 === 0;
}