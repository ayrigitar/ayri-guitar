# Deteksi chord AI untuk transkrip.html

Halaman Transkrip mengenali chord dengan jaringan saraf **Chord-CNN-LSTM**. Semuanya dihitung di perangkat pengunjung; file lagu tidak dikirim ke mana pun.

## Sumber dan lisensi

- **Model:** Junyan Jiang, Ke Chen, Wei Li, Gus Xia, "Large-vocabulary chord transcription via chord structure decomposition", ISMIR 2019.
  - Kode dan bobot: [music-x-lab/ISMIR2019-Large-Vocabulary-Chord-Recognition](https://github.com/music-x-lab/ISMIR2019-Large-Vocabulary-Chord-Recognition), commit `481f4ce`.
  - Lisensi MIT: [LICENSE-chord-cnn-lstm.txt](LICENSE-chord-cnn-lstm.txt).
  - `cnnlstm.bin` berisi bobot kelima model asli, diubah ke float16 oleh `tools/cnnlstm/export.py` di repositori AYRI Studio Tools.
  - `chords.json` adalah daftar chord dekoder "submission" dari repositori yang sama.
- **CQT dan perkiraan stem** (`cqt.js`): ditulis ulang langkah demi langkah dari librosa 0.9.2 (lisensi ISC: [LICENSE-librosa.txt](LICENSE-librosa.txt)).
- **Penyaring resampling**: mengikuti resampy 0.4.2 (lisensi ISC: [LICENSE-resampy.txt](LICENSE-resampy.txt)).
- **`chordnet.js`**: jaringan dan dekoder XHMM ditulis ulang untuk inference. Sama dengan `ChordNet.kt` di aplikasi Android AYRI Studio Tools.

## File

| File | Isi |
|---|---|
| `nn.js` | Dipanggil halaman. Membagi pekerjaan ke beberapa Worker, merata-rata kelima model, lalu menyusun chord. |
| `worker.js` | Mengubah suara ke 22.050 Hz, menghitung CQT, dan menjalankan model. |
| `chordnet.js` | Jaringan, dekoder, dan aturan nama chord. |
| `cqt.js` | Resampling, perkiraan stem, dan CQT 288 bin. |
| `chordnet.wasm` | Konvolusi dan perkalian matriks dalam WebAssembly SIMD (sekitar 6× lebih cepat dari JavaScript). |
| `chordnet_wasm.c` | Sumber `chordnet.wasm`. |
| `cnnlstm.bin`, `chords.json` | Bobot model dan daftar chord. Baru diunduh saat analisis pertama. |

Membuat ulang `chordnet.wasm` dengan clang dari Android NDK (atau clang lain yang punya target wasm32):

```
clang --target=wasm32 -O3 -msimd128 -nostdlib -ffreestanding -fno-builtin -Wl,--no-entry -Wl,--import-memory -Wl,--export-dynamic -fuse-ld=wasm-ld -o chordnet.wasm chordnet_wasm.c
```

Browser tanpa WebAssembly SIMD tetap bisa jalan memakai JavaScript biasa, hanya lebih lambat. Browser tanpa Worker memakai deteksi lama di `transkrip.html`.

## Akurasi

Diukur per 10 ms dengan aturan MIREX majmin (akar dan mayor/minor), pada chord yang ditampilkan halaman:

| | GuitarSet (180 rekaman gitar) | AAM (20 lagu utuh) |
|---|---|---|
| deteksi lama (sebelum ini) | 61,1 % | 81,0 % |
| Chord-CNN-LSTM, 5 model (halaman ini) | **81,3 %** | **96,3 %** |

Data uji GuitarSet dan AAM berlisensi CC BY 4.0. Data ini hanya dipakai untuk mengukur dan tidak disimpan di situs.
