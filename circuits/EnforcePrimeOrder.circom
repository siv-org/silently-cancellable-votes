template EnforcePrimeOrder() {
    signal input P[4][3]

    // Triple doubling
    signal P2[4][3]
    signal P4[4][3]
    signal P8[4][3]

    P2 <== PointDouble()(P)
    P4 <== PointDouble()(P2)
    P8 <== PointDouble()(P4)

    // Enforce P8 == identity
    component isIdentity = IsIdentityPoint()
    isIdentity.P <== P8
}

template IsIdentityPoint() {
    signal input P[4][3]

    // Typical identity: (X=0, Y=1, Z=1, T=0)

    // X == 0
    P[0][0] === 0
    P[0][1] === 0
    P[0][2] === 0

    // Y == 1
    P[1][0] === 1
    P[1][1] === 0
    P[1][2] === 0

    // Z == 1
    P[2][0] === 1
    P[2][1] === 0
    P[2][2] === 0

    // T == 0
    P[3][0] === 0
    P[3][1] === 0
    P[3][2] === 0
}