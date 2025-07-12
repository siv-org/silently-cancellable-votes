pragma circom 2.0.0;

include "binsub.circom";
include "binadd.circom";
include "chunkedmul.circom";
include "./mux1.circom";
include "chunkedadd.circom";
include "chunkedsub.circom";
include "lt.circom";
include "utils.circom";

/*
                              ╔══════════~s255══════════╗                 
                              ║                         ║                 
                              ║                         ║                 
                              ║                         ║                 
                              ║                         ▼                 
  ┌────────┐              ┌───╩────┐               ┌──────────┐           
  │        │              │        │               │          │           
  │        ╠═════p0══════▶│        ╠═════s0═══════▶│          │           
  │        │      ◦       │        │      ◦        │          ╠══out0════▶
  │        │      ◦       │   b    │      ◦        │          ╠══out1════▶
  │        ╠════p254═════▶│        ╠════s254══════▶│          │    ◦
  │2^255-19│    ══0══════▶│        │               │   Mux2   │    ◦
  │        │              │sub(a-b)│               │          │    ◦
  │        │    ┌────────▶│        │      ┌───────▶│          ╠═out254═══▶
  │        │    │      ◦  │        │      │    ◦   │          │           
  │        │    │      ◦  │   a    │      │    ◦   │          │           
  │        │    │ ┌──────▶│        │      │  ┌────▶│          │           
  │        │    │ │  ┌───▶│        │      │  │     │          │           
  └────────┘    │ │  │    └────────┘      │  │     └──────────┘           
                │ │  │                    │  │                            
                │ │  │                    │  │                            
in0─────────────┴─┼──┼────────────────────┘  │                            
                  │  │                       │                            
in254─────────────┴──┼───────────────────────┘                            
in255────────────────┘ 
*/

template ModulusAgainst2P() {
  signal input in[256];
  signal output out[255];

  /* Binary representation for 2^255 − 19 from LSB to MSB format */
  var p[255] = [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
                1, 1, 1, 1, 1];
  var i;

  component sub = BinSub(256);

  for (i = 0; i < 255; i++) {
    sub.in[0][i] <== in[i];
    sub.in[1][i] <== p[i];
  }

  sub.in[0][255] <== in[255];
  sub.in[1][255] <== 0;

  component mux = MultiMux1(255);

  for (i = 0; i < 255; i++) {
    mux.c[i][0] <== in[i];
    mux.c[i][1] <== sub.out[i];
  }

  mux.s <== 1 - sub.out[255];

  for (i = 0; i < 255; i++) {
    out[i] <== mux.out[i];
  }
}

template ModulusWith252c(n) {
  signal input in[n];
  signal output out[253];

  var c[125] = [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1,
                1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0,
                0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1,
                1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1,
                0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1,
                1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1];
  var q[253] = [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1,
                1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0,
                0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1,
                1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1,
                0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1,
                1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
  var i;

  component mul;
  component mod;
  component sub;
  component adder;
  component mod2pfinal;

  if (n < 253) {
    for (i = 0; i < n; i++) {
      out[i] <== in[i];
    }

    for (i = n; i < 253; i++) {
      out[i] <== 0;
    }
  } else {
    mul = BinMulFast(n-252, 125);
    for(i = 0; i < n-252; i++) {
      mul.in1[i] <== in[252+i];
    }

    for(i = 0; i < 125; i++) {
      mul.in2[i] <== c[i];
    }

    mod = ModulusWith252c(n-252+125);
    for (i = 0; i < n-252+125; i++) {
      mod.in[i] <== mul.out[i];
    }

    sub = BinSub(253);
    for (i = 0; i < 253; i++) {
      sub.in[0][i] <== q[i];
      sub.in[1][i] <== mod.out[i];
    }

    adder = BinAdd(253);
    for (i = 0; i < 252; i++) {
      adder.in[0][i] <== in[i];
      adder.in[1][i] <== sub.out[i];
    }

    adder.in[0][i] <== 0;
    adder.in[1][252] <== sub.out[i];

    mod2pfinal = ModulusAgainst2Q();
    for (i = 0; i < 254; i++) {
      mod2pfinal.in[i] <== adder.out[i];
    }

    for (i = 0; i < 253; i++) {
      out[i] <== mod2pfinal.out[i];
    }
  }
}

template ModulusAgainst2Q() {
  signal input in[254];
  signal output out[253];

  var i;
  var q[253] = [1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1,
                1, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0,
                0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1,
                1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1,
                0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1,
                1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];

  component sub = BinSub(254);
  for (i = 0; i < 253; i++) {
    sub.in[0][i] <== in[i];
    sub.in[1][i] <== q[i];
  }

  sub.in[0][253] <== in[253];
  sub.in[1][253] <== 0;

  component mux = MultiMux1(253);
  for (i = 0; i < 253; i++) {
    mux.c[i][0] <== in[i];
    mux.c[i][1] <== sub.out[i];
  }

  mux.s <== 1 + sub.out[253] - 2*sub.out[253];
  for (i = 0; i < 253; i++) {
    out[i] <== mux.out[i];
  }
}

template ModulusWith25519Chunked51(n) {
  signal input in[n];
  signal output out[3];

  var i;
  var base=85;

  component mod2p;
  component mul;
  component mod;
  component adder;
  component mod2pfinal;

  if (n < 3) {
    for (i = 0; i < n; i++) {
      out[i] <== in[i];
    }

    for (i = n; i < 3; i++) {
      out[i] <== 0;
    }
  } else {
    mod2p = ModulusAgainst2PChunked51();
    for (i = 0; i < 3; i++) {
      mod2p.in[i] <== in[i];
    }

    mod2p.in[3] <== 0;

    mul = ChunkedMul(n-3, 1, base);
    for(i = 0; i < n-3; i++) {
      mul.in1[i] <== in[3+i];
    }

    mul.in2[0] <== 19;

    mod = ModulusWith25519Chunked51(n-3+1);
    for (i = 0; i < n-3+1; i++) {
      mod.in[i] <== mul.out[i];
    }

    adder = ChunkedAdd(3, 2, base);
    for (i = 0; i < 3; i++) {
      adder.in[0][i] <== mod2p.out[i];
      adder.in[1][i] <== mod.out[i];
    }

    mod2pfinal = ModulusAgainst2PChunked51();
    for (i = 0; i < 4; i++) {
      mod2pfinal.in[i] <== adder.out[i];
    }

    for (i = 0; i < 3; i++) {
      out[i] <== mod2pfinal.out[i];
    }
  }
}

template ModulusAgainst2PChunked51() {
  signal input in[4];
  signal output out[3];
  var i;
  var p[4] = [38685626227668133590597613, 38685626227668133590597631, 38685626227668133590597631, 0];
  var base = 85;

  component sub = ChunkedSub(4, base);

  in[3] * (in[3] - 1) === 0;
  for (i = 0; i < 4; i++) {
    sub.a[i] <== in[i];
    sub.b[i] <== p[i];
  }

  component mux = MultiMux1(4);
  for (i = 0; i < 4; i++) {
    mux.c[i][0] <== in[i];
    mux.c[i][1] <== sub.out[i];
  }

  mux.s <== 1 + sub.underflow - 2*sub.underflow;
  for (i = 0; i < 3; i++) {
    out[i] <== mux.out[i];
  }
}
