# Silently Cancellable Votes — Core Function

**Voters** — who wish to secretly cancel their (coerced) votes, so they can cast new paper replacements — provide their private vote data in-person to the election admin.

The original published SIV vote totals remain unchanged. This new sum of secretly-cancelled votes is also published, and its numbers can be subtracted from the SIV total, for the "uncorrupted" total.

**Admin** can then create a zero-knowledge proof of the sum of all cancelled votes, to prove each cancellation was authorized by the individual voters' themselves, but without revealing to 3rd-party coercers or bribers which votes were cancelled.

Fundamentally, the admin is proving in zero-knowledge that:

1. the private vote data they were given correspond to unique public encrypted votes
2. and that they add up to the claimed sum

```ts
circom function generate_proof_of_secret_sum(
    public all_encrypted_votes, // { encrypted: hex_string, lock: hex_string }[]
    public claimed_sum_of_cancelled_votes_subset, // grouped sum, like { washington: integer, arnold: integer }
    public election_public_key, // { recipient: hex_string }
    private votes_to_secretly_cancel, // { plaintext: string like '4444-4444-4444:washington', encoded: hex_string, randomizer: bigint_string }[]
    public hashes_of_votes_to_cancel, // hash_string[]
    private admin_key, // bigint
    public hash_of_admin_key // string
) {
    let recalculated_sum = {}

    // Prep for elliptic curve math
    let recipient = RP.fromHex(election_public_key.recipient)

    // Prove admin secret key still hashes to a consistent value across batches
    // To prevent re-using votes multiple times
    assert hash(admin_key) === hash_of_admin_key

    // For each item in votes_to_secretly_sum,
    for (vote in votes_to_secretly_sum) {

        // First, the admin proves each private vote
        // corresponds to one of the public encrypted votes

        // Confirm the provided encoded point
        // does in fact map to the plaintext
        let encoded = RP.fromHex(vote.encoded)
        assert decode(encoded) === vote.plaintext

        // Confirm it does in fact hash into the input_hash
        // These hashes can be confirmed unique outside the circuit
        assert hashes_of_votes_to_cancel[i] === hash(vote.randomizer, vote.encoded, admin_private_key)

        // Then we recalculate the encrypted ciphertext using the Elliptic Curve ElGamal algorithm:
        // Encrypted = Encoded + (private * randomizer)

        let encrypted = encoded.add(recipient.multiply(vote.randomizer))
        // We can skip "lock", because we're not decrypting,
        // just confirming the encoded value is present in the full set.

        assert encrypted in all_encrypted_votes
        // If we've made it this far, we've successfully proved
        // this private vote was in the set of public all_encrypted_votes

        // Now, we check if the vote adds up to the claimed sum
        let vote_content = vote.plaintext.slice(15) // First 15 chars are verification number
        recalculated_sum[vote_content] += 1
    }

    assert recalculated_sum === claimed_sum_of_cancelled_votes_subset
}
```

### Functions we still need in Circom:

(RP = Ristretto Point. Our current js implementation is coming from https://github.com/paulmillr/noble-ed25519 v1)

- [ ] RP.fromHex()
- [ ] decode()
- [ ] RP.add()
- [ ] RP.multiply()
- [x] assert ... in
  - Use Poseidon hash— ZK Friendly hash.
  - For inclusion proof.
  - Build merkle tree outside of circuit.
  - in circuit:
    - pass merkle root,
    - pass message, hash within circuit. that's a leaf.
    - hash up a level with it's neighbors, to get hash one level up.
      - repeat again until you get to root.
      - QED the message is present in the root.

### More notes from recent sessions:

#### For Ristretto in Circom, see:

- https://github.com/Electron-Labs/ed25519-circom
- https://medium.com/electron-labs/zk-ed25519-underlying-mathematics-8d4f64d9431b

#### for loops:

- can't use runtime parameterized lengths. Circuit needs pre-defined lengths, known at compile time.
- Solution: Run in batches, eg 20 at time. Then pad last batch. One ZK Sum for each batch. Sum-of-sums outside of circuit.

#### To test performance at compile time:

`snarkjs r1cs info`

- https://github.com/erhant/circomkit good framework for testing and performance

#### Useful circom overview (circom101) and common recipes (merkle tree, proving array distinct, sorted, poseidon hashing):

- https://circom.erhant.me/index.html
