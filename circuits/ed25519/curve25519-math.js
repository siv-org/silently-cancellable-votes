let p = BigInt(2 ** 255) - BigInt(19)
let d =
  37095705934669439343138083508754565189542113879843219016388785533085940283555n

/** This function will perform point addition on elliptic curve 25519 to check point addition circom */
export function point_add(P, Q) {
  let A = modulus((P[1] - P[0]) * (Q[1] - Q[0]), p)
  let B = modulus((P[1] + P[0]) * (Q[1] + Q[0]), p)
  let C = modulus(BigInt(2) * P[3] * Q[3] * d, p)
  let D = modulus(BigInt(2) * P[2] * Q[2], p)

  let E = B - A
  let F = D - C
  let G = D + C
  let H = B + A

  return [E * F, G * H, F * G, E * H]
}

/** This function will give the point multiplication on EC 25519 */
export function point_mul(s, P) {
  let Q = [0n, 1n, 1n, 0n]
  while (s > 0) {
    if (s & 1n) {
      Q = point_add(Q, P)
    }
    P = point_add(P, P)
    s >>= 1n
  }
  return Q
}

export function point_equal(P, Q) {
  //  x1 / z1 == x2 / z2  <==>  x1 * z2 == x2 * z1
  if (modulus(P[0] * Q[2] - Q[0] * P[2], p) != 0n) {
    return false
  }
  if (modulus(P[1] * Q[2] - Q[1] * P[2], p) != 0n) {
    return false
  }
  return true
}
