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
) {
    let recalculated_sum = {}

    // Prep for elliptic curve math
    let recipient = RP.fromHex(election_public_key.recipient)


    // For each item in votes_to_secretly_sum,
    for (vote in votes_to_secretly_sum) {

        // First, the admin proves each private vote
        // corresponds to one of the public encrypted votes

        // Confirm the provided encoded point
        // does in fact map to the plaintext
        let encoded = RP.fromHex(vote.encoded)
        assert decode(encoded) === vote.plaintext

        // Then we recalculate the encrypted ciphertext using the Elliptic Curve ElGamal algorithm:
        // Encrypted = Encoded + (Recipient * randomizer)
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

    // TODO: Also prove that each of the private votes are unique
}
```

### Functions we still need in Circom:

(RP = Ristretto Point. Our current js implementation is coming from https://github.com/paulmillr/noble-ed25519 v1)

- [ ] RP.fromHex()
- [ ] decode()
- [ ] RP.add()
- [ ] RP.multiply()
- [ ] assert ... in
