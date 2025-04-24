function test_scalar_multiplication(ristretto_point, scalar_to_multiply, expected_result) {
    assert mult(ristretto_point, scalar_to_multiply) === expected_result
}


// Test in js:
// Generate Random test cases:
range(0,10).map(index => {
    const point = generate_random_ristretto_point()
    const scalar = generate_random_scalar()
    const expected = point.multiply(scalar)
    
    // Test cases that should work:
    expect(test_scalar_multiplication(point, scalar, expected) === true)

    // Test cases that should not work:
    const different_scalar = generate_random_scalar()
    expect(test_scalar_multiplication(point, different_scalar, expected) === false)
})
