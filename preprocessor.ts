import { RistrettoPoint, utils } from '@noble/ed25519'
import { poseidon } from '@noble/hashes/poseidon'
import { bytesToNumberLE } from '@noble/hashes/utils'

// --- CONFIG ---
const TREE_DEPTH = 20 // match your Merkle tree height

// --- HELPERS ---

function toAffineCoords(point: RistrettoPoint) {
  const edPoint = point.toRawBytes(true) // 32-byte compressed
  const decompressed = RistrettoPoint.fromHex(edPoint)
  const { x, y } = decompressed.toAffine()
  return {
    x: BigInt(x.toString()),
    y: BigInt(y.toString()),
  }
}

function poseidonHash(...args: bigint[]) {
  return poseidon(args.map((x) => BigInt(x)))
}

// --- MAIN ---

export function prepareVoteInputs({
  votesToCancel, // [{ plaintext, encoded, randomizer }]
  recipientHex, // election pubkey as hex
  merkleTree, // Poseidon tree object from circomlibjs or similar
}) {
  const recipient = RistrettoPoint.fromHex(recipientHex)

  const encoded_x = []
  const encoded_y = []
  const randomizers = []
  const merkleProofs = []
  const merklePositions = []
  const sumHashInputs = []

  for (const vote of votesToCancel) {
    const encodedPoint = RistrettoPoint.fromHex(vote.encoded)
    const rand = BigInt(vote.randomizer)
    const { x, y } = toAffineCoords(encodedPoint)

    encoded_x.push(x)
    encoded_y.push(y)
    randomizers.push(rand)

    const ciphertext = encodedPoint.add(recipient.multiply(rand))
    const { x: cx, y: cy } = toAffineCoords(ciphertext)
    const leaf = poseidonHash(cx, cy)

    const proof = merkleTree.getProof(leaf, TREE_DEPTH)
    merkleProofs.push(proof.siblings)
    merklePositions.push(proof.pathIndices)
    sumHashInputs.push(leaf) // placeholder — replace if needed
  }

  const claimedSum = poseidonHash(...sumHashInputs)

  return {
    public: {
      merkleRoot: merkleTree.root,
      voteHash: poseidonHash(...sumHashInputs), // optional
      claimedSum,
    },
    private: {
      encoded_x,
      encoded_y,
      randomizers,
      merkleProofs,
      merklePositions,
    },
  }
}
