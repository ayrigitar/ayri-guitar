/* The chord network's heavy loops for the browser, WebAssembly SIMD (no libc; the caller owns all memory).
   Same arithmetic as AYRI Studio Tools' native-core/src/chords/chordnet_conv.cpp. */
#define KO 8
#define KP 8

/* Output channels [o0, o1) and rows [row0, row1) of a 3x3 convolution over the bordered input xp (see ChordNet.kt).
   off (taps ints) and wpack (taps x KO floats) are scratch space. */
__attribute__((export_name("conv_group")))
void conv_group(const float *xp, int in_ch, int n, int wp, int plane, const float *w, const float *bias, int o0, int o1,
                float *y, int fo, int row0, int row1, int *off, float *wpack) {
    const int taps = in_ch * 9;
    for (int i = 0; i < in_ch; ++i)
        for (int kt = 0; kt < 3; ++kt)
            for (int kf = 0; kf < 3; ++kf) off[i * 9 + kt * 3 + kf] = i * plane + kt * wp + kf;
    const int first = row0 * wp, total = row1 * wp;
    for (int og = o0; og < o1; og += KO) {
        const int no = o1 - og < KO ? o1 - og : KO;
        for (int k = 0; k < taps; ++k)
            for (int o = 0; o < KO; ++o) wpack[k * KO + o] = o < no ? w[(og + o) * taps + k] : 0.0f;
        int q0 = first;
        for (; q0 + KP <= total; q0 += KP) {
            float acc[KO][KP];
            for (int o = 0; o < KO; ++o)
                for (int p = 0; p < KP; ++p) acc[o][p] = 0.0f;
            for (int k = 0; k < taps; ++k) {
                const float *xs = xp + off[k] + q0;
                const float *ws = wpack + k * KO;
                float xv[KP];
                for (int p = 0; p < KP; ++p) xv[p] = xs[p];
                for (int o = 0; o < KO; ++o) {
                    const float wv = ws[o];
                    for (int p = 0; p < KP; ++p) acc[o][p] += wv * xv[p];
                }
            }
            for (int p = 0; p < KP; ++p) {
                const int q = q0 + p, t = q / wp, col = q - t * wp;
                if (col >= fo) continue;
                for (int o = 0; o < no; ++o) y[(og + o) * n * fo + t * fo + col] = acc[o][p] + bias[og + o];
            }
        }
        for (; q0 < total; ++q0) {
            const int t = q0 / wp, col = q0 - t * wp;
            if (col >= fo) continue;
            for (int o = 0; o < no; ++o) {
                float s = 0.0f;
                for (int k = 0; k < taps; ++k) s += wpack[k * KO + o] * xp[off[k] + q0];
                y[(og + o) * n * fo + t * fo + col] = s + bias[og + o];
            }
        }
    }
}

/* Rows [r0, r1) of c = a * b^T + bias: a is rows x k, b is m x k (the LSTM's input gates). */
__attribute__((export_name("matmul_rows")))
void matmul_rows(const float *a, const float *b, const float *bias, int m, int k, int r0, int r1, float *c) {
    for (int r = r0; r < r1; ++r) {
        const float *ar = a + r * k;
        float *cr = c + r * m;
        for (int j = 0; j < m; ++j) {
            const float *bj = b + j * k;
            float s0 = 0, s1 = 0, s2 = 0, s3 = 0;
            int i = 0;
            for (; i + 4 <= k; i += 4) { s0 += ar[i] * bj[i]; s1 += ar[i + 1] * bj[i + 1]; s2 += ar[i + 2] * bj[i + 2]; s3 += ar[i + 3] * bj[i + 3]; }
            float s = (s0 + s1) + (s2 + s3);
            for (; i < k; ++i) s += ar[i] * bj[i];
            cr[j] = bias[j] + s;
        }
    }
}
