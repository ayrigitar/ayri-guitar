/* Partitur & tab semua instrumen (partitur.html) memakai alphaTab (vendor/alphatab, lisensi MPL-2.0).
   File Guitar Pro / MusicXML dibuka langsung di perangkat pengunjung, tidak diunggah ke mana pun.
   Alur: file/teks dibaca menjadi lagu "dasar"; transpose, kapo, dan pilihan tampilan diterapkan ke salinannya
   setiap kali digambar, jadi lagu dasar tidak pernah berubah. */
(function () {
    /* ================= lagu contoh: domain publik / lagu rakyat, aransemen Toko Gitar AYRI ================= */
    var CONTOH = {
            "sayange": {
                    "nama": "Rasa Sayange (band): melodi, gitar, bass, piano, drum",
                    "tex": "\\title \"Rasa Sayange\"\n\\subtitle \"Lagu daerah Maluku\"\n\\artist \"Aransemen Toko Gitar AYRI\"\n\\hideDynamics\n\\track \"Melodi\" { instrument 73 }\n  \\staff { score }\n  \\tuning none\n  \\lyrics \"Ra sa sa ya nge ra sa sa yang sa ya nge, li hat Am bon da ri ja uh, ra sa sa yang sa ya nge. Ka lau a da su mur di la dang, bo leh ki ta me num pang man di. Ka lau a da u mur ku pan jang, bo leh ki ta ber te mu la gi. Ra sa sa ya nge ra sa sa yang sa ya nge, li hat Am bon da ri ja uh, ra sa sa yang sa ya nge.\"\n  \\ts 4 4 \\tempo 112\n  \\ac E4.8 F4.8 | G4.8 G4.8 C5.4 B4.8 A4.8 G4.4 | G4.4 E4.8 F4.8 G4.4 C5.8 B4.8 | A4.4 A4.8 G4.8 F4.4 E4.8 F4.8 |\n  E4.8 C4.8 D4.4 D4.8 C4.8 B3.4 | C4.2 r.4 C4.8 C4.8 | E4.8 G4.8 G4.4 G4.8 G4.8 A4.4 | G4.2 r.4 G4.8 G4.8 |\n  F4.8 E4.8 C4.4 E4.8 C4.8 D4.4 | E4.2 r.4 C4.8 C4.8 | C4.8 F4.8 F4.4 F4.8 G4.8 F4.4 | E4.2 r.4 C4.8 B3.8 |\n  C4.8 D4.8 D4.4 D4.8 C4.8 B3.4 | C4.2 r.4 E4.8 F4.8 | G4.8 G4.8 C5.4 B4.8 A4.8 G4.4 | G4.4 E4.8 F4.8 G4.4 C5.8 B4.8 |\n  A4.4 A4.8 G4.8 F4.4 E4.8 F4.8 | E4.8 C4.8 D4.4 D4.8 C4.8 B3.4 | C4.1\n\\track \"Gitar\" { instrument 25 }\n  \\staff { score tabs }\n  \\tuning (E4 B3 G3 D3 A2 E2) { hide }\n  \\ac :4 r |\n  :4 (0.1 1.2 0.3 2.4 3.5) {ch \"C\"} (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) | :4 (1.1 0.2 0.3 0.4 2.5 3.6) {ch \"G7\"} (1.1 0.2 0.3 0.4 2.5 3.6) (0.1 1.2 0.3 2.4 3.5) {ch \"C\"} (0.1 1.2 0.3 2.4 3.5) |\n  :4 (1.1 1.2 2.3 3.4 3.5 1.6) {ch \"F\"} (1.1 1.2 2.3 3.4 3.5 1.6) (0.1 1.2 0.3 2.4 3.5) {ch \"C\"} (0.1 1.2 0.3 2.4 3.5) | :4 (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (1.1 0.2 0.3 0.4 2.5 3.6) {ch \"G7\"} (1.1 0.2 0.3 0.4 2.5 3.6) |\n  :4 (0.1 1.2 0.3 2.4 3.5) {ch \"C\"} (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) | :4 (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) |\n  :4 (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) | :4 (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (1.1 0.2 0.3 0.4 2.5 3.6) {ch \"G7\"} (1.1 0.2 0.3 0.4 2.5 3.6) |\n  :4 (0.1 1.2 0.3 2.4 3.5) {ch \"C\"} (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) | :4 (1.1 1.2 2.3 3.4 3.5 1.6) {ch \"F\"} (1.1 1.2 2.3 3.4 3.5 1.6) (1.1 1.2 2.3 3.4 3.5 1.6) (1.1 1.2 2.3 3.4 3.5 1.6) |\n  :4 (0.1 1.2 0.3 2.4 3.5) {ch \"C\"} (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) | :4 (1.1 0.2 0.3 0.4 2.5 3.6) {ch \"G7\"} (1.1 0.2 0.3 0.4 2.5 3.6) (1.1 0.2 0.3 0.4 2.5 3.6) (1.1 0.2 0.3 0.4 2.5 3.6) |\n  :4 (0.1 1.2 0.3 2.4 3.5) {ch \"C\"} (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) | :4 (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) |\n  :4 (1.1 0.2 0.3 0.4 2.5 3.6) {ch \"G7\"} (1.1 0.2 0.3 0.4 2.5 3.6) (0.1 1.2 0.3 2.4 3.5) {ch \"C\"} (0.1 1.2 0.3 2.4 3.5) | :4 (1.1 1.2 2.3 3.4 3.5 1.6) {ch \"F\"} (1.1 1.2 2.3 3.4 3.5 1.6) (0.1 1.2 0.3 2.4 3.5) {ch \"C\"} (0.1 1.2 0.3 2.4 3.5) |\n  :4 (0.1 1.2 0.3 2.4 3.5) (0.1 1.2 0.3 2.4 3.5) (1.1 0.2 0.3 0.4 2.5 3.6) {ch \"G7\"} (1.1 0.2 0.3 0.4 2.5 3.6) | :1 (0.1 1.2 0.3 2.4 3.5) {ch \"C\"}\n\\track \"Bass\" { instrument 33 }\n  \\staff { tabs }\n  \\tuning (G2 D2 A1 E1) { hide }\n  \\ac :4 r |\n  :4 3.3 3.3 0.1 0.1 | :4 3.4 0.2 3.3 0.1 | :4 1.4 3.3 3.3 0.1 | :4 3.3 0.1 3.4 0.2 |\n  :4 3.3 3.3 0.1 0.1 | :4 3.3 3.3 0.1 0.1 | :4 3.3 3.3 0.1 0.1 | :4 3.3 0.1 3.4 0.2 |\n  :4 3.3 3.3 0.1 0.1 | :4 1.4 1.4 3.3 3.3 | :4 3.3 3.3 0.1 0.1 | :4 3.4 3.4 0.2 0.2 |\n  :4 3.3 3.3 0.1 0.1 | :4 3.3 3.3 0.1 0.1 | :4 3.4 0.2 3.3 0.1 | :4 1.4 3.3 3.3 0.1 |\n  :4 3.3 0.1 3.4 0.2 | :1 3.3\n\\track \"Piano\" { instrument 0 }\n  \\staff { score }\n  \\tuning piano\n  \\ac :4 r |\n  :2 (C4 E4 G4) (C4 E4 G4) | :2 (B3 D4 F4 G4) (C4 E4 G4) | :2 (C4 F4 A4) (C4 E4 G4) | :2 (C4 E4 G4) (B3 D4 F4 G4) |\n  :2 (C4 E4 G4) (C4 E4 G4) | :2 (C4 E4 G4) (C4 E4 G4) | :2 (C4 E4 G4) (C4 E4 G4) | :2 (C4 E4 G4) (B3 D4 F4 G4) |\n  :2 (C4 E4 G4) (C4 E4 G4) | :2 (C4 F4 A4) (C4 F4 A4) | :2 (C4 E4 G4) (C4 E4 G4) | :2 (B3 D4 F4 G4) (B3 D4 F4 G4) |\n  :2 (C4 E4 G4) (C4 E4 G4) | :2 (C4 E4 G4) (C4 E4 G4) | :2 (B3 D4 F4 G4) (C4 E4 G4) | :2 (C4 F4 A4) (C4 E4 G4) |\n  :2 (C4 E4 G4) (B3 D4 F4 G4) | :1 (C4 E4 G4)\n\\track \"Drum\"\n  \\instrument percussion\n  \\clef neutral\n  \\articulation defaults\n  \\ac :4 r |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (KickHit HiHatClosed) (SnareHit HiHatClosed) HiHatClosed | :1 (KickHit CrashMediumHit)"
            },
            "ultah": {
                    "nama": "Happy Birthday: melodi + gitar pengiring + lirik",
                    "tex": "\\title \"Happy Birthday to You\"\n\\artist \"Mildred & Patty Hill\"\n\\hideDynamics\n\\track \"Melodi\" { instrument 73 }\n  \\staff { score }\n  \\tuning none\n  \\lyrics \"Hap py birth day to you, hap py birth day to you, hap py birth day dear friend,  hap py birth day to you!\"\n  \\ts 3 4 \\tempo 100\n  \\ac G4.8 {d} G4.16 | A4.4 G4.4 C5.4 | B4.2 G4.8 {d} G4.16 |\n  A4.4 G4.4 D5.4 | C5.2 G4.8 {d} G4.16 | G5.4 E5.4 C5.4 |\n  B4.4 A4.4 F5.8 {d} F5.16 | E5.4 C5.4 D5.4 | C5.2 {d}\n\\track \"Gitar\" { instrument 25 }\n  \\staff { score tabs }\n  \\tuning (E4 B3 G3 D3 A2 E2) { hide }\n  \\ac :4 r |\n  :4 3.5 {ch \"C\"} (0.1 1.2 0.3 2.4) (0.1 1.2 0.3 2.4) | :4 3.6 {ch \"G7\"} (1.1 0.2 0.3 0.4) (1.1 0.2 0.3 0.4) |\n  :4 3.6 (1.1 0.2 0.3 0.4) (1.1 0.2 0.3 0.4) | :4 3.5 {ch \"C\"} (0.1 1.2 0.3 2.4) (0.1 1.2 0.3 2.4) |\n  :4 3.5 {ch \"C7\"} (0.1 1.2 3.3 2.4) (0.1 1.2 3.3 2.4) | :4 1.6 {ch \"F\"} (1.1 1.2 2.3 3.4) (1.1 1.2 2.3 3.4) |\n  :4 3.5 {ch \"C\"} (0.1 1.2 0.3 2.4) (1.1 0.2 0.3 0.4) {ch \"G7\"} | :2 (0.1 1.2 0.3 2.4 3.5) {ch \"C\"} (0.1 1.2 0.3 2.4).4"
            },
            "canon": {
                    "nama": "Canon in D (Pachelbel): piano + gitar petik",
                    "tex": "\\title \"Canon in D\"\n\\artist \"Johann Pachelbel\"\n\\hideDynamics\n\\track \"Piano\" { instrument 0 }\n  \\staff { score }\n  \\tuning piano\n  \\ts 4 4 \\tempo 66\n  :2 F#5 E5 | :2 D5 C#5 | :2 B4 A4 | :2 B4 C#5 |\n  :2 D5 C#5 | :2 B4 A4 | :2 G4 F#4 | :2 G4 E4 |\n  :1 D5\n  \\staff { score }\n  \\tuning piano\n  \\clef F4\n  :2 D3 A2 | :2 B2 F#2 | :2 G2 D3 | :2 G2 A2 |\n  :2 D3 A2 | :2 B2 F#2 | :2 G2 D3 | :2 G2 A2 |\n  :1 D2\n\\track \"Gitar\" { instrument 24 }\n  \\staff { score tabs }\n  \\tuning (E4 B3 G3 D3 A2 E2) { hide }\n  0.4.8 {ch \"D\"} 2.3 3.2 2.1 0.5.8 {ch \"A\"} 2.4 2.3 2.2 | 2.5.8 {ch \"Bm\"} 4.4 4.3 3.2 2.6.8 {ch \"F#m\"} 4.5 4.4 2.3 |\n  3.6.8 {ch \"G\"} 2.5 0.4 0.3 0.4.8 {ch \"D\"} 2.3 3.2 2.1 | 3.6.8 {ch \"G\"} 2.5 0.4 0.3 0.5.8 {ch \"A\"} 2.4 2.3 2.2 |\n  0.4.8 {ch \"D\"} 2.3 3.2 2.1 0.5.8 {ch \"A\"} 2.4 2.3 2.2 | 2.5.8 {ch \"Bm\"} 4.4 4.3 3.2 2.6.8 {ch \"F#m\"} 4.5 4.4 2.3 |\n  3.6.8 {ch \"G\"} 2.5 0.4 0.3 0.4.8 {ch \"D\"} 2.3 3.2 2.1 | 3.6.8 {ch \"G\"} 2.5 0.4 0.3 0.5.8 {ch \"A\"} 2.4 2.3 2.2 |\n  (2.1 3.2 2.3 0.4).1 {ch \"D\"}"
            },
            "lirilir": {
                    "nama": "Lir-ilir: gitar fingerstyle + lirik",
                    "tex": "\\title \"Lir-ilir\"\n\\subtitle \"Lagu daerah Jawa Tengah\"\n\\artist \"Aransemen Toko Gitar AYRI\"\n\\hideDynamics\n\\track \"Gitar klasik\" { instrument 24 }\n  \\staff { score tabs }\n  \\tuning (E4 B3 G3 D3 A2 E2) { hide }\n  \\lyrics \"Lir i lir  lir i lir,  tan du re wis su mi lir. Tak i jo ro yo ro yo tak seng guh te man ten a nyar. Cah a ngon,  cah a ngon,  pe nek no blim bing ku wi. Lu nyu lu nyu pe nek no kang go mba suh do dot i ro. Do dot i ro,  do dot i ro  ku mi tir be dah ing ping gir. Dom do ma na jlu ma ta na kang go se ba meng ko so re. Mum pung pa dang rem bu la ne, mum pung jem bar ka la nga ne. Yo su ra ko,   su   rak  i     yo.\"\n  \\ts 2 4 \\tempo 96\n  r.4 1.2.8 1.2.8 | (3.2 0.6).8 {ch \"C\"} 0.1.8 1.2.8 1.2.8 | (3.2 0.6).8 0.1.8 1.2.8 1.2.8 | (0.3 0.6).8 0.3.8 1.2.8 1.2.8 |\n  (2.3 1.6).4 {ch \"F\"} 0.3.8 0.3.8 | (0.3 0.6).8 {ch \"C\"} 0.3.8 1.2.8 1.2.8 | (2.3 1.6).8 {ch \"F\"} 2.3.8 2.4.8 2.3.8 | (0.3 3.6).8 {ch \"G\"} 2.4.8 0.4.8 2.4.8 |\n  (3.5 0.6).4 {ch \"C\"} 1.2.8 1.2.8 | (3.2 0.6).8 0.1.8 1.2.8 1.2.8 | (3.2 0.6).8 0.1.8 1.2.8 1.2.8 | (0.3 0.6).8 0.3.8 1.2.8 1.2.8 |\n  (2.3 1.6).4 {ch \"F\"} 0.3.8 0.3.8 | (0.3 0.6).8 {ch \"C\"} 0.3.8 1.2.8 1.2.8 | (2.3 1.6).8 {ch \"F\"} 2.3.8 2.4.8 2.3.8 | (0.3 3.6).8 {ch \"G\"} 2.4.8 0.4.8 2.4.8 |\n  (3.5 0.6).4 {ch \"C\"} 1.2.8 1.2.16 1.2.16 | (3.2 0.6).8 0.1.8 1.2.8 1.2.16 1.2.16 | (3.2 0.6).8 0.1.8 1.2.8 1.2.16 1.2.16 | (0.3 0.6).8 0.3.8 1.2.8 1.2.8 |\n  (2.3 1.6).4 {ch \"F\"} 0.3.8 0.3.16 0.3.16 | (0.3 0.6).8 {ch \"C\"} 0.3.8 1.2.8 1.2.8 | (2.3 1.6).8 {ch \"F\"} 2.3.8 2.4.8 2.3.8 | (0.3 3.6).8 {ch \"G\"} 2.4.8 0.4.8 2.4.8 |\n  (3.5 0.6).8 {ch \"C\"} 3.5.8 0.4.8 2.4.8 | (0.3 3.6).8 {ch \"G\"} 2.4.8 0.4.8 2.4.8 | (3.5 0.6).8 {ch \"C\"} 3.5.8 0.4.8 2.4.8 | (0.3 3.6).8 {ch \"G\"} 2.4.8 0.4.8 2.4.8 |\n  (3.5 0.6).4 {ch \"C\"} 1.2.4 | (1.2 0.6).4 0.3.4 | (2.3 1.6).4 {ch \"F\"} 0.3.8 2.3.8 | (1.2 0.6).4 {ch \"C\"} 2.4.8 2.3.8 |\n  (0.3 3.6).4 {d ch \"G\"} 2.4.8 | (0.4 3.6).4 2.4.16 0.4.16 2.4.16 0.4.16 | (3.5 0.6).2 {ch \"C\"}"
            },
            "elise": {
                    "nama": "Für Elise (Beethoven): piano",
                    "tex": "\\title \"F\\u00fcr Elise\"\n\\artist \"Ludwig van Beethoven\"\n\\hideDynamics\n\\track \"Piano\" { instrument 0 }\n  \\staff { score }\n  \\tuning piano\n  \\ts 3 8 \\tempo 72\n  \\ac :16 E5 D#5 | E5 D#5 E5 B4 D5 C5 | A4.8 r.16 C4 E4 A4 |\n  B4.8 r.16 E4 G#4 B4 | C5.8 r.16 E4 E5 D#5 | E5 D#5 E5 B4 D5 C5 |\n  A4.8 r.16 C4 E4 A4 | B4.8 r.16 E4 C5 B4 | A4.4 {d}\n  \\staff { score }\n  \\tuning piano\n  \\clef F4\n  \\ac r.8 | r.4 {d} | A2.16 E3 A3 r.8 {d} |\n  E2.16 E3 G#3 r.8 {d} | A2.16 E3 A3 r.8 {d} | r.4 {d} |\n  A2.16 E3 A3 r.8 {d} | E2.16 E3 G#3 r.8 {d} | A2.16 E3 A3 r.8 {d}"
            },
            "kakatua": {
                    "nama": "Burung Kakatua: melodi, ukulele, bass, drum",
                    "tex": "\\title \"Burung Kakatua\"\n\\subtitle \"Lagu daerah Maluku\"\n\\artist \"Aransemen Toko Gitar AYRI\"\n\\hideDynamics\n\\track \"Melodi\" { instrument 73 }\n  \\staff { score }\n  \\tuning none\n  \\lyrics \"Bu rung ka ka tu a  hing gap di jen de la.  Ne nek su dah tu a,  gi gi+nya ting gal du a. Tre dung tre dung tre dung tra la la, tre dung tre dung tre dung tra la la, tre dung tre dung tre dung tra la  la, bu rung ka ka tu a.\"\n  \\ts 3 4 \\tempo 132\n  \\ac G4.4 | G4.2 E4.4 | C5.2 E4.4 | D4.2 {d} |\n  D4 {t}.2 r.8 E4.8 | F4.2 A4.4 | G4.2 F4.4 | E4.2 {d} |\n  E4 {t}.2 G4.4 | G4.2 E4.4 | C5.2 E4.4 | D4.2 {d} |\n  D4 {t}.2 A4.4 | G4.2 G4.4 | A4.2 B4.4 | C5.2 {d} |\n  r.2 G4.4 | E4.2 G4.4 | E4.2 G4.4 | A4.8 r.8 A4.8 r.8 A4.8 r.8 |\n  A4.2 G4.4 | D4.2 F4.4 | D4.2 F4.4 | G4.8 r.8 G4.8 r.8 G4.8 r.8 |\n  G4.2 G4.4 | E4.2 G4.4 | E4.2 G4.4 | A4.4 A4.8 A4.8 A4.4 |\n  D5.2 C5.4 | B4.2 G4.4 | A4.2 B4.4 | C5.2 {d}\n\\track \"Ukulele\" { instrument 24 }\n  \\staff { score tabs }\n  \\tuning (A4 E4 C4 G4) { hide }\n  \\ac :4 r |\n  :4 (3.1 0.2 0.3 0.4) {ch \"C\"} (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) | :4 (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) | :4 (2.1 3.2 2.3 0.4) {ch \"G\"} (2.1 3.2 2.3 0.4) (2.1 3.2 2.3 0.4) | :4 (2.1 3.2 2.3 0.4) (2.1 3.2 2.3 0.4) (2.1 3.2 2.3 0.4) |\n  :4 (0.1 1.2 0.3 2.4) {ch \"F\"} (0.1 1.2 0.3 2.4) (0.1 1.2 0.3 2.4) | :4 (2.1 1.2 2.3 0.4) {ch \"G7\"} (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) | :4 (3.1 0.2 0.3 0.4) {ch \"C\"} (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) | :4 (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) |\n  :4 (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) | :4 (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) | :4 (2.1 3.2 2.3 0.4) {ch \"G\"} (2.1 3.2 2.3 0.4) (2.1 3.2 2.3 0.4) | :4 (2.1 3.2 2.3 0.4) (2.1 3.2 2.3 0.4) (2.1 3.2 2.3 0.4) |\n  :4 (2.1 3.2 2.3 0.4) (2.1 3.2 2.3 0.4) (2.1 3.2 2.3 0.4) | :4 (2.1 1.2 2.3 0.4) {ch \"G7\"} (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) | :4 (3.1 0.2 0.3 0.4) {ch \"C\"} (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) | :4 (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) |\n  :4 (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) | :4 (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) | :4 (0.1 1.2 0.3 2.4) {ch \"F\"} (0.1 1.2 0.3 2.4) (0.1 1.2 0.3 2.4) | :4 (0.1 1.2 0.3 2.4) (0.1 1.2 0.3 2.4) (0.1 1.2 0.3 2.4) |\n  :4 (2.1 1.2 2.3 0.4) {ch \"G7\"} (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) | :4 (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) | :4 (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) | :4 (3.1 0.2 0.3 0.4) {ch \"C\"} (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) |\n  :4 (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) | :4 (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) (3.1 0.2 0.3 0.4) | :4 (0.1 1.2 0.3 2.4) {ch \"F\"} (0.1 1.2 0.3 2.4) (0.1 1.2 0.3 2.4) | :4 (2.1 1.2 2.3 0.4) {ch \"G7\"} (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) |\n  :4 (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) | :4 (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) (2.1 1.2 2.3 0.4) | :2 (3.1 0.2 0.3 0.4) {d ch \"C\"}\n\\track \"Bass\" { instrument 33 }\n  \\staff { tabs }\n  \\tuning (G2 D2 A1 E1) { hide }\n  \\ac :4 r |\n  :4 3.3 0.1 0.1 | :4 3.3 0.1 0.1 | :4 3.4 0.2 0.2 | :4 3.4 0.2 0.2 |\n  :4 1.4 3.3 3.3 | :4 3.4 0.2 0.2 | :4 3.3 0.1 0.1 | :4 3.3 0.1 0.1 |\n  :4 3.3 0.1 0.1 | :4 3.3 0.1 0.1 | :4 3.4 0.2 0.2 | :4 3.4 0.2 0.2 |\n  :4 3.4 0.2 0.2 | :4 3.4 0.2 0.2 | :4 3.3 0.1 0.1 | :4 3.3 0.1 0.1 |\n  :4 3.3 0.1 0.1 | :4 3.3 0.1 0.1 | :4 1.4 3.3 3.3 | :4 1.4 3.3 3.3 |\n  :4 3.4 0.2 0.2 | :4 3.4 0.2 0.2 | :4 3.4 0.2 0.2 | :4 3.3 0.1 0.1 |\n  :4 3.3 0.1 0.1 | :4 3.3 0.1 0.1 | :4 1.4 3.3 3.3 | :4 3.4 0.2 0.2 |\n  :4 3.4 0.2 0.2 | :4 3.4 0.2 0.2 | :2 3.3 {d}\n\\track \"Drum\"\n  \\instrument percussion\n  \\clef neutral\n  \\articulation defaults\n  \\ac :4 r |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) | :8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) (SnareHit HiHatClosed) |\n  :2 (KickHit CrashMediumHit) {d}"
            }
    };

    /* templat "mulai baru" per instrumen (diagram chord dibuat otomatis dari nama chord) */
    var GITAR = '\\tuning (E4 B3 G3 D3 A2 E2) { hide }', RAPI = '\\hideDynamics';
    var DRUM_BAR = ':8 (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed (KickHit HiHatClosed) HiHatClosed (SnareHit HiHatClosed) HiHatClosed';
    var TEMPLAT = {
        gitar: ['\\title "Lagu saya"', RAPI, '\\track "Gitar" { instrument 25 }', '  ' + GITAR, '  \\ts 4 4 \\tempo 90',
            '  :4 0.3 2.3 0.2 1.2 | (0.1 1.2 0.3 2.4 3.5).2 {ch "C"} (3.1 0.2 0.3 0.4 2.5 3.6).2 {ch "G"}'],
        bass: ['\\title "Lagu saya"', RAPI, '\\track "Bass" { instrument 33 }', '  \\tuning (G2 D2 A1 E1)', '  \\ts 4 4 \\tempo 90',
            '  :4 3.3 3.3 0.1 0.1 | 1.4 1.4 3.3 3.3'],
        ukulele: ['\\title "Lagu saya"', RAPI, '\\track "Ukulele" { instrument 24 }', '  \\tuning (A4 E4 C4 G4)', '  \\ts 4 4 \\tempo 90',
            '  :4 (3.1 0.2 0.3 0.4) {ch "C"} 0.4 0.3 0.2 | (0.1 1.2 0.3 2.4).2 {ch "F"} r.2'],
        piano: ['\\title "Lagu saya"', RAPI, '\\track "Piano" { instrument 0 }', '  \\staff { score }', '  \\tuning piano', '  \\ts 4 4 \\tempo 90',
            '  :4 C4 {ch "C"} D4 E4 F4 | (C4 E4 G4).2 (B3 D4 G4).2 {ch "G"}'],
        drum: ['\\title "Lagu saya"', RAPI, '\\track "Drum"', '  \\instrument percussion', '  \\clef neutral', '  \\articulation defaults', '  \\ts 4 4 \\tempo 90',
            '  ' + DRUM_BAR + ' | ' + DRUM_BAR],
        vokal: ['\\title "Lagu saya"', RAPI, '\\track "Vokal" { instrument 53 }', '  \\staff { score }', '  \\tuning voice', '  \\lyrics "Do re mi fa sol la si do"', '  \\ts 4 4 \\tempo 90',
            '  :4 C4 D4 E4 F4 | G4 A4 B4 C5']
    };

    /* ================= elemen & alphaTab ================= */
    function $(s) { return document.querySelector(s); }
    function $$(s) { return [].slice.call(document.querySelectorAll(s)); }
    var main = $('#konten'), msg = $('#msg'), tex = $('#tex'), texErr = $('#texerr'), btnPlay = $('#play'), waktu = $('#waktu');
    if (!window.alphaTab) { msg.textContent = 'Penampil partitur gagal dimuat. Muat ulang halaman.'; return; }
    var JSONC = alphaTab.model.JsonConverter;
    var judulFile = 'partitur', ketik = 0, detikTerakhir = -1;
    /* keadaan lagu yang tampil */
    var dasar = null, nada = 0, kapo = 0, tampilan = 'semua', tampilTrack = [], bisu = {}, solo = {};
    /* chord lagu: garis waktu (nama asli) untuk panel & main bersama; ab = titik ulang A/B (tick) */
    var garisChord = [], adaKapo = false, alat = 'gtr', kidal = false, bentukKe = {}, ikut = false, ab = { a: null, b: null };
    /* latihan: kecepatan putar, hitung masuk suara, naik tempo otomatis */
    /* mode edit (partitur-edit.js): instrumen yang sedang diedit, tab selalu tampil */
    var editTrack = null, tampilSebelumEdit = null;
    var kecepatan = 1, hitungOn = false, ikutAwal = false, latih = { on: false, mulai: 0.6, naik: 0.05, setiap: 1, sampai: 1, putaran: 0 };

    function pesan(t, salah) { msg.textContent = t || ''; msg.hidden = !t; msg.classList.toggle('err', !!salah); }
    function jam(ms) { var s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); }
    var esc = AYRI_UTIL.esc;

    var hp = window.innerWidth < 600;
    var at = new alphaTab.AlphaTabApi($('#at'), {
        core: { fontDirectory: 'vendor/alphatab/font/', includeNoteBounds: true },
        display: { scale: hp ? 0.8 : 1, padding: hp ? [8, 8, 8, 8] : [20, 20, 20, 20] },
        notation: { elements: { scoreWordsAndMusic: false } },
        /* gulir hanya bila kursor keluar layar, supaya judul & chord tidak tersembunyi saat lagu dibuka */
        player: { playerMode: 'EnabledSynthesizer', soundFont: 'vendor/alphatab/soundfont/sonivox.sf2', scrollElement: main, scrollMode: 'OffScreen', scrollOffsetY: -180 }
    });

    /* ================= transpose, kapo, tampilan ================= */
    function setiapNot(staff, fn) { staff.bars.forEach(function (b) { b.voices.forEach(function (v) { v.beats.forEach(function (bt) { fn(bt); }); }); }); }
    /* gitar & ukulele boleh pakai kapo; bass (senar rendah) dan instrumen 7 senar tidak */
    function bisaKapo(st) { return st.isStringed && !st.isPercussion && st.tuning.length && Math.min.apply(null, st.tuning) >= 40; }
    var KRES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    /* nama hasil geser memakai ejaan yang lazim dibaca pemain: Db Eb F# Ab Bb */
    var LAZIM = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    function geserNama(nama, d) {
        if (!d) return nama;
        return String(nama).replace(/(^|\/)([A-G])([#b]?)/g, function (m, awal, h, a) {
            return awal + LAZIM[(KRES.indexOf(h) + (a === '#' ? 1 : a === 'b' ? -1 : 0) + d + 120) % 12];
        });
    }
    /* ---------- bentuk chord dari mesin chord (chord-engine.js, sama dengan halaman Chord) ---------- */
    var ADA_MESIN = typeof voicings === 'function' && typeof SUFK === 'object';
    var HURUF = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function bacaChord(nama) {
        var m = /^([A-G])([#b\u266F\u266D]?)([^\/]*)(?:\/([A-G][#b]?))?$/.exec(String(nama || '').trim());
        if (!m || !ADA_MESIN) return null;
        var akhiran = m[3].replace(/\u266F/g, '#').replace(/\u266D/g, 'b');
        if (!Object.prototype.hasOwnProperty.call(SUFK, akhiran)) return null;
        return { root: (HURUF[m[1]] + (/[#\u266F]/.test(m[2]) ? 1 : m[2] ? -1 : 0) + 12) % 12, ti: tIdx(SUFK[akhiran]) };
    }
    function bentukMesin(nama, alat, ke) {
        var c = bacaChord(nama); if (!c) return null;
        var vs = voicings(c.root, c.ti, INSTS[alat]);
        return vs.length ? vs[(ke || 0) % vs.length] : null;
    }
    var ALAT_TUNING = { '64,59,55,50,45,40': 'gtr', '69,64,60,67': 'uke' };
    /* bentuk mesin (senar rendah -> tinggi) ke diagram alphaTab (senar 1 = paling atas) */
    function isiDiagram(c, v) {
        var f = v.f.slice().reverse(), tekan = f.filter(function (x) { return x > 0; }), bf = 0, nb = 0;
        v.f.forEach(function (x, i) { if (x > 0 && v.g && v.g[i] === 1) { if (!bf) bf = x; if (x === bf) nb++; } });
        c.strings = f; c.barreFrets = nb >= 2 ? [bf] : []; c.showDiagram = true;
        c.firstFret = tekan.length && Math.max.apply(null, tekan) > 4 ? Math.min.apply(null, tekan) : 1;
    }
    /* nama chord ikut transpose/kapo; diagram digeser bila bisa, kalau tidak (atau belum ada) diambil dari mesin chord */
    function geserChord(st, dNama, dFret) {
        if (!st.chords) return;
        var alat = ALAT_TUNING[st.tuning.join(',')];
        st.chords.forEach(function (c) {
            c.name = geserNama(c.name, dNama);
            if (!st.isStringed) return;
            var ada = c.strings && c.strings.some(function (f) { return f >= 0; });
            if (ada && dFret) {
                var geser = c.strings.map(function (f) { return f >= 0 ? f + dFret : f; });
                if (geser.every(function (f, i) { return c.strings[i] < 0 || (f >= 0 && f <= 24); })) {
                    c.strings = geser;
                    c.barreFrets = (c.barreFrets || []).map(function (f) { return f + dFret; }).filter(function (f) { return f > 0; });
                    var tekan = geser.filter(function (f) { return f > 0; });
                    c.firstFret = tekan.length && Math.max.apply(null, tekan) > 4 ? Math.min.apply(null, tekan) : 1;
                    return;
                }
                ada = false;
            }
            if (!ada) { var v = alat && bentukMesin(c.name, alat); if (v) isiDiagram(c, v); else c.showDiagram = false; }
        });
    }
    /* instrumen bersenar: nada baru dicari pada senar yang sama, atau pindah ke senar lain bila fretnya di luar 0-24 */
    function geserSenar(st, d, kapoBaru) {
        var tun = st.tuning, n = tun.length, kapoLama = st.capo || 0;
        function senar(s) { return tun[n - s]; } /* Note.string 1 = senar paling rendah, tuning[0] = paling atas */
        setiapNot(st, function (bt) {
            var dipakai = {};
            bt.notes.forEach(function (nt) {
                var target = senar(nt.string) + kapoLama + nt.fret + d, f = target - senar(nt.string) - kapoBaru;
                if (f >= 0 && f <= 24 && !dipakai[nt.string]) { nt.fret = f; dipakai[nt.string] = 1; return; }
                var pilih = null;
                for (var s = 1; s <= n; s++) {
                    var g = target - senar(s) - kapoBaru;
                    if (!dipakai[s] && g >= 0 && g <= 24 && (!pilih || g < pilih.f)) pilih = { s: s, f: g };
                }
                if (pilih) { nt.string = pilih.s; nt.fret = pilih.f; dipakai[pilih.s] = 1; }
                else { nt.fret = Math.max(0, Math.min(24, f)); dipakai[nt.string] = 1; }
            });
        });
        st.capo = kapoBaru;
    }
    function aturTampilan(st) {
        if (tampilan === 'semua' || st.isPercussion) return;
        var senar = st.isStringed;
        st.showSlash = tampilan === 'slash';
        st.showNumbered = tampilan === 'angka';
        st.showTablature = tampilan === 'tab' && senar;
        st.showStandardNotation = tampilan === 'balok' || (tampilan === 'tab' && !senar);
    }
    /* salinan lagu dasar + transpose, kapo, tampilan, bisu/solo */
    /* urutan chord lagu (nama asli + posisi tick) dari staf yang paling banyak chord-nya */
    function kumpulChord(s) {
        var terbaik = [];
        s.tracks.forEach(function (t) {
            t.staves.forEach(function (st) {
                var g = [];
                st.bars.forEach(function (b) {
                    b.voices[0].beats.forEach(function (bt) {
                        var c = bt.chordId && st.chords && st.chords.get(bt.chordId);
                        if (c && c.name && (!g.length || g[g.length - 1].n !== c.name)) g.push({ t: bt.absolutePlaybackStart, n: c.name });
                    });
                });
                if (g.length > terbaik.length) terbaik = g;
            });
        });
        return terbaik;
    }
    function bangun() {
        var s = JSONC.jsObjectToScore(dasar, at.settings), geserPitch = [];
        garisChord = kumpulChord(s);
        adaKapo = s.tracks.some(function (t) { return t.staves.some(bisaKapo); });
        s.tracks.forEach(function (t) {
            var bersenar = false;
            t.staves.forEach(function (st) {
                if (st.isPercussion) return;
                if (st.isStringed && st.tuning.length) {
                    bersenar = true;
                    /* dengan kapo, nama & diagram chord menunjukkan bentuk yang dimainkan (bukan nada yang terdengar) */
                    var kapoIni = bisaKapo(st) ? kapo : 0;
                    if (nada || kapoIni) geserSenar(st, nada, (st.capo || 0) + kapoIni);
                    geserChord(st, nada - kapoIni, nada - kapoIni);
                } else geserChord(st, nada, 0);
                aturTampilan(st);
                if (editTrack === t.index && st.isStringed) st.showTablature = true;
            });
            if (t.staves[0] && t.staves[0].isPercussion) bersenar = true;
            geserPitch[t.index] = bersenar ? 0 : nada;
            t.playbackInfo.isMute = !!bisu[t.index]; t.playbackInfo.isSolo = !!solo[t.index];
        });
        at.settings.notation.transpositionPitches = geserPitch;
        return s;
    }
    function gambar() {
        if (!dasar) return;
        var s = bangun(), idx = tampilTrack.filter(function (i) { return i < s.tracks.length; });
        at.updateSettings();
        at.renderScore(s, idx.length ? idx : [0]);
        gambarPanel(); ikutChord(at.tickPosition || 0, true);
    }

    /* ================= memuat lagu ================= */
    var dariTeks = false;
    /* sampai 3 instrumen tampil semua; file band yang lebih besar dimulai dari instrumen gitar (yang lain bisa dipilih) */
    function trackAwal(score) {
        if (score.tracks.length <= 3) return score.tracks.map(function (t) { return t.index; });
        var gitar = score.tracks.filter(function (t) { var st = t.staves[0]; return st && st.isStringed && !st.isPercussion && st.tuning.length >= 6; })[0];
        return [(gitar || score.tracks[0]).index];
    }
    /* o.semua: tampilkan semua instrumen; o.baru: lagu lain (atur ulang nada, kapo, bisu/solo) */
    function muatScore(score, o) {
        if (editTrack !== null) { editTrack = null; if (window.PartiturEdit) window.PartiturEdit.tutup(true); }
        dasar = JSONC.scoreToJsObject(score);
        if (o.baru) { nada = 0; kapo = 0; bisu = {}; solo = {}; bentukKe = {}; hapusAB(); main.scrollTop = 0; }
        tampilTrack = o.semua ? score.tracks.map(function (t) { return t.index; }) : trackAwal(score);
        if (score.title) judulFile = score.title;
        $('#kapo-w').hidden = !score.tracks.some(function (t) { return t.staves.some(bisaKapo); });
        kontrolNada();
        gambar();
    }
    function bukaFile(file) {
        if (!file) return;
        judulFile = file.name.replace(/\.[^.]+$/, '') || 'partitur';
        pesan('Membuka ' + file.name + '…');
        file.arrayBuffer().then(function (buf) {
            var score;
            try { score = alphaTab.importer.ScoreLoader.loadScoreFromBytes(new Uint8Array(buf), at.settings); }
            catch (e) { return pesan('Format file tidak dikenali. Gunakan Guitar Pro (.gp, .gp3–.gp5, .gpx) atau MusicXML (.musicxml, .xml, .mxl).', true); }
            dariTeks = false; pesan('');
            muatScore(score, { baru: true });
        }).catch(function () { pesan('File tidak bisa dibaca.', true); });
    }
    function muatTeks(t, baru) {
        texErr.hidden = true;
        var score;
        try { var imp = new alphaTab.importer.AlphaTexImporter(); imp.initFromString(t, at.settings); score = imp.readScore(); }
        catch (e) { return tampilErrTeks(e); }
        dariTeks = true;
        muatScore(score, { semua: true, baru: baru });
    }
    /* pesan pembaca alphaTex (bahasa Inggris) diterjemahkan untuk yang paling sering muncul */
    var TERJEMAH = [
        [/^Unrecognized property '(.*)'\.?$/, 'properti {$1} tidak dikenal'],
        [/^Unrecognized metadata '(.*)'\.?$/, 'perintah \\$1 tidak dikenal'],
        [/^.*Group not closed.*$/, 'kurung belum ditutup'],
        [/^Unexpected '(.*)' token.*$/, function (m, t) { return 'tanda "' + ({ LParen: '(', RParen: ')', LBrace: '{', RBrace: '}', Pipe: '|', Dot: '.', Colon: ':', Asterisk: '*' }[t] || t) + '" tidak pada tempatnya'; }],
        [/^Unexpected end of file.*$/, 'tulisan berakhir sebelum selesai']
    ];
    function terjemah(m) { for (var i = 0; i < TERJEMAH.length; i++) if (TERJEMAH[i][0].test(m)) return m.replace(TERJEMAH[i][0], TERJEMAH[i][1]); return m; }
    function tampilErrTeks(e) {
        var c = e && (e.lexerDiagnostics ? e : e.cause) || e || {}, d = [];
        ['lexerDiagnostics', 'parserDiagnostics', 'semanticDiagnostics'].forEach(function (k) { if (c[k]) d = d.concat(Array.from(c[k])); });
        var salah = d.filter(function (x) { return x.severity >= 2; });
        if (!salah.length) salah = d;
        texErr.dataset.pos = salah[0] && salah[0].start ? salah[0].start.offset + ',' + salah[0].end.offset : '';
        texErr.textContent = salah.length ? salah.slice(0, 3).map(function (x) { return 'Baris ' + x.start.line + ', kolom ' + x.start.col + ': ' + terjemah(x.message); }).join('\n') + '\n(ketuk pesan ini untuk menuju bagian yang salah)'
            : 'Ada yang belum benar: ' + (e && e.message || e);
        texErr.hidden = false;
    }
    texErr.addEventListener('click', function () {
        var p = (texErr.dataset.pos || '').split(','); if (p.length < 2) return;
        tex.focus(); tex.setSelectionRange(+p[0], Math.max(+p[1], +p[0] + 1));
    });

    at.scoreLoaded.on(function (score) {
        $('#n-track').textContent = score.tracks.length;
        $('#judul-lagu').textContent = score.title || judulFile;
        $('#sub-lagu').textContent = [score.subTitle, score.artist].filter(Boolean).join(' \u00b7 ');
        gambarTrack(); tampilBpm();
    });
    at.renderStarted.on(function () { if (!msg.classList.contains('err')) pesan('Menggambar partitur…'); });
    at.renderFinished.on(function () { if (!msg.classList.contains('err')) pesan(''); });
    at.error.on(function (e) {
        if (dariTeks) tampilErrTeks(e);
        else pesan('File tidak bisa dibuka. Pastikan formatnya Guitar Pro (.gp, .gp3–.gp5, .gpx) atau MusicXML.', true);
    });

    /* ================= chord lagu ini, main bersama ================= */
    /* nama chord untuk alat yang dipilih: gitar/ukulele memakai bentuk dengan kapo, piano memakai nada yang terdengar */
    function namaUntuk(asli) {
        var bunyi = geserNama(asli, nada);
        return alat !== 'pno' && adaKapo && kapo ? geserNama(bunyi, -kapo) : bunyi;
    }
    function gambarDiagram(nama, kecil) {
        var v = bentukMesin(nama, alat, bentukKe[alat + nama]);
        if (!v) return '<span class="sc-nod">bentuk belum tersedia</span>';
        I = INSTS[alat]; /* chord-engine memakai I untuk nama senar */
        return diagram(v, { mini: !!kecil, left: kidal, alt: 'Diagram ' + nama });
    }
    function daftarChord() {
        var u = [];
        garisChord.forEach(function (g) { var n = namaUntuk(g.n); if (u.indexOf(n) < 0) u.push(n); });
        return u;
    }
    function gambarPanel() {
        var u = ADA_MESIN ? daftarChord() : [];
        $('#sc-chord').hidden = !u.length; $('#tanpa-chord').hidden = !!u.length;
        $('#ikut-btn').hidden = !u.length;
        if (!u.length) { if (ikut) aturIkut(false); $('#saran').hidden = true; return; }
        if (ikutAwal) { ikutAwal = false; aturIkut(true); }
        tampilSaran();
        $('#n-chord').textContent = u.length;
        $('#chords').classList.toggle('pk', alat === 'pno');
        $('#chords').innerHTML = u.map(function (n) {
            return '<div class="sc-cb"><div class="sc-cb-h"><b>' + esc(disp(n)) + '</b><button type="button" class="sc-cb-x" data-ganti="' + esc(n) + '" aria-label="Bentuk lain ' + esc(n) + '" title="Bentuk lain">\u21bb</button></div>' +
                '<button type="button" class="sc-cb-d" data-bunyi="' + esc(n) + '" aria-label="Bunyikan ' + esc(n) + '">' + gambarDiagram(n) + '</button></div>';
        }).join('');
    }
    $('#chords').addEventListener('click', function (e) {
        var g = e.target.closest('[data-ganti]'), b = e.target.closest('[data-bunyi]');
        if (g) { var k = alat + g.dataset.ganti; bentukKe[k] = (bentukKe[k] || 0) + 1; gambarPanel(); ikutChord(at.tickPosition || 0, true); }
        else if (b) bunyikan(b.dataset.bunyi);
    });
    $('#alat').addEventListener('change', function () { alat = this.value; $('#kidal-w').hidden = alat === 'pno'; gambarPanel(); ikutChord(at.tickPosition || 0, true); simpan(); });
    $('#kidal').addEventListener('change', function () { kidal = this.checked; gambarPanel(); ikutChord(at.tickPosition || 0, true); simpan(); });

    /* saran kapo (seperti halaman Transkrip): posisi kapo yang membuat chord paling banyak berbentuk terbuka */
    var MUDAH = { maj: [0, 2, 4, 7, 9], m: [2, 4, 9] }, MINOR = { m: 1, m7: 1, m6: 1, m9: 1, madd9: 1, mmaj7: 1, m7b5: 1, dim: 1, dim7: 1 };
    function saranKapo() {
        if (!garisChord.length || !adaKapo || (alat !== 'gtr' && alat !== 'gll') || !at.score) return null;
        var mb = at.score.masterBars, akhir = mb[mb.length - 1].start + mb[mb.length - 1].calculateDuration();
        function skor(k) {
            var sc = 0, tot = 0;
            garisChord.forEach(function (g, i) {
                var dur = (i + 1 < garisChord.length ? garisChord[i + 1].t : akhir) - g.t, c = bacaChord(geserNama(geserNama(g.n, nada), -k));
                tot += dur;
                if (c && (MINOR[TYPES[c.ti].k] ? MUDAH.m : MUDAH.maj).indexOf(c.root) > -1) sc += dur;
            });
            return tot ? sc / tot : 0;
        }
        var best = 0, bs = -1;
        for (var k = 0; k <= 7; k++) { var p = skor(k); if (p > bs + 0.001) { bs = p; best = k; } }
        return { k: best, p: bs, kini: skor(kapo) };
    }
    function tampilSaran() {
        var el = $('#saran'), s = saranKapo();
        if (!s) { el.hidden = true; return; }
        el.hidden = false;
        if (s.k === kapo || s.p <= s.kini + 0.001) { el.textContent = (kapo ? 'Kapo ' + kapo : 'Tanpa kapo') + ' sudah paling mudah untuk lagu ini.'; return; }
        var u = [];
        garisChord.forEach(function (g) { var n = disp(geserNama(geserNama(g.n, nada), -s.k)); if (u.indexOf(n) < 0 && u.length < 4) u.push(n); });
        el.innerHTML = 'Saran: <b>' + (s.k ? 'kapo ' + s.k : 'tanpa kapo') + '</b>, chord jadi ' + esc(u.join(' \u2013 ')) + ' (' + Math.round(s.p * 100) + '% bentuk terbuka). ' +
            '<button type="button" class="chip" data-kapo="' + s.k + '">Pakai</button>';
    }
    $('#saran').addEventListener('click', function (e) {
        var b = e.target.closest('[data-kapo]'); if (!b) return;
        kapo = +b.dataset.kapo; kontrolNada(); gambar();
    });

    /* bunyi chord sederhana (petikan / piano) seperti di halaman Chord */
    var ac = null, comp = null, gel = null;
    function audio() {
        if (!ac) {
            var AC = window.AudioContext || window.webkitAudioContext; ac = new AC();
            comp = ac.createDynamicsCompressor(); comp.connect(ac.destination);
            var re = new Float32Array(14), im = new Float32Array(14); for (var k = 1; k < 14; k++) im[k] = 1 / Math.pow(k, 1.15);
            gel = ac.createPeriodicWave(re, im);
        }
        if (ac.state === 'suspended') ac.resume();
        return ac;
    }
    function nadaBunyi(m, t, vol, piano) {
        var c = audio(), f = 440 * Math.pow(2, (m - 69) / 12), o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
        if (piano) o.type = 'triangle'; else o.setPeriodicWave(gel);
        o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.setValueAtTime(Math.min(7000, f * (piano ? 8 : 14)), t); lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 2.2), t + 1.4);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(vol * 0.35, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        o.connect(lp); lp.connect(g); g.connect(comp); o.start(t); o.stop(t + 2.5);
    }
    function bunyikan(nama) {
        var v = bentukMesin(nama, alat, bentukKe[alat + nama]); if (!v) return;
        var c = audio(), t0 = c.currentTime + 0.03;
        if (v.kb) { v.notes.forEach(function (m, k) { nadaBunyi(m, t0 + k * 0.012, 0.2, true); }); return; }
        var md = INSTS[alat].md, k = 0;
        v.f.forEach(function (f, s) { if (f >= 0) nadaBunyi(md[s] + f, t0 + (k++) * 0.04, 0.2); });
    }

    /* main bersama: chord yang sedang berbunyi besar + chord berikutnya */
    var ikutKe = -2;
    function aturIkut(on) {
        ikut = on && garisChord.length > 0;
        $('#ikut-btn').setAttribute('aria-pressed', ikut);
        $('#ikut').hidden = !ikut;
        main.classList.toggle('ikut-on', ikut);
        at.settings.player.scrollOffsetY = -($('#kepala').offsetHeight + 80);
        at.updateSettings();
        ikutKe = -2; ikutChord(at.tickPosition || 0, true);
    }
    function ikutChord(tick, paksa) {
        if (!ikut || !garisChord.length) return;
        var lo = 0, hi = garisChord.length - 1, i = -1;
        while (lo <= hi) { var m = (lo + hi) >> 1; if (garisChord[m].t <= tick) { i = m; lo = m + 1; } else hi = m - 1; }
        if (i === ikutKe && !paksa) return;
        ikutKe = i;
        var kini = garisChord[Math.max(0, i)], lanjut = garisChord[i + 1];
        var nKini = i < 0 ? '\u2013' : namaUntuk(kini.n), nLanjut = lanjut ? namaUntuk(lanjut.n) : (i < 0 ? namaUntuk(kini.n) : '');
        $('#ik-now').textContent = i < 0 ? '\u2013' : disp(nKini);
        $('#ik-now-d').innerHTML = i < 0 ? '' : gambarDiagram(nKini);
        $('#ik-next').textContent = nLanjut ? disp(nLanjut) : 'selesai';
        $('#ik-next-d').innerHTML = nLanjut ? gambarDiagram(nLanjut, true) : '';
    }
    $('#ikut-btn').addEventListener('click', function () { aturIkut(!ikut); simpan(); });

    /* ================= ulang bagian: titik A & B (per birama) ================= */
    function birama(tick) {
        var mb = at.score.masterBars, pilih = mb[0];
        for (var i = 0; i < mb.length; i++) { if (mb[i].start <= tick) pilih = mb[i]; else break; }
        return pilih;
    }
    function tandaiAB() {
        try { at.clearPlaybackRangeHighlight(); } catch (e) {}
        if (ab.a === null || ab.b === null || !at.tracks.length) return;
        var bars = at.tracks[0].staves[0].bars, a = bars[ab.ia], b = bars[ab.ib];
        if (a && b) try { at.highlightPlaybackRange(a.voices[0].beats[0], b.voices[0].beats[b.voices[0].beats.length - 1]); } catch (e) {}
    }
    function hapusAB() {
        ab = { a: null, b: null }; try { at.playbackRange = null; at.clearPlaybackRangeHighlight(); } catch (e) {}
        var t = $('#ab'); if (t) { $('#ab-label').textContent = 'A\u2013B'; t.setAttribute('aria-pressed', 'false'); }
    }
    $('#ab').addEventListener('click', function () {
        if (!at.score) return;
        var mb = birama(at.tickPosition || 0);
        if (ab.a === null) { ab.a = mb.start; ab.ia = mb.index; $('#ab-label').textContent = 'Titik B'; this.setAttribute('aria-pressed', 'true'); return; }
        if (ab.b === null) {
            var awal = Math.min(ab.ia, mb.index), akhir = Math.max(ab.ia, mb.index), m = at.score.masterBars;
            ab.ia = awal; ab.ib = akhir; ab.a = m[awal].start; ab.b = m[akhir].start + m[akhir].calculateDuration();
            at.playbackRange = { startTick: ab.a, endTick: ab.b };
            at.isLooping = true; $('#loop').setAttribute('aria-pressed', 'true');
            $('#ab-label').textContent = 'A\u2013B \u2715'; tandaiAB();
            if (at.playerState !== alphaTab.synth.PlayerState.Playing) at.tickPosition = ab.a;
            return;
        }
        hapusAB();
    });
    at.renderFinished.on(function () { if (ab.b !== null) tandaiAB(); });

    /* ================= kontrol ================= */
    function kontrolNada() {
        $('#tb-nada').textContent = (nada > 0 ? '+' + nada : nada < 0 ? '\u2212' + -nada : '\u00b10') + (kapo ? ' \u00b7 K' + kapo : '');
        $('#nada').textContent = 'Nada ' + (nada > 0 ? '+' + nada : nada < 0 ? '−' + -nada : '0');
        $('#kapo').value = String(kapo);
    }
    $('#nada-turun').addEventListener('click', function () { if (nada > -12) { nada--; kontrolNada(); gambar(); } });
    $('#nada-naik').addEventListener('click', function () { if (nada < 12) { nada++; kontrolNada(); gambar(); } });
    $('#kapo').innerHTML = '<option value="0">Tanpa kapo</option>' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (k) { return '<option value="' + k + '">Kapo ' + k + '</option>'; }).join('');
    $('#kapo').addEventListener('change', function () { kapo = +this.value; gambar(); });
    $('#profil').addEventListener('change', function () { tampilan = this.value; gambar(); simpan(); });

    at.soundFontLoad.on(function (e) { if (e.total) btnPlay.textContent = 'Memuat suara ' + Math.round(e.loaded / e.total * 100) + '%'; });
    at.playerReady.on(function () { btnPlay.disabled = false; btnPlay.textContent = 'Putar'; });
    at.playerStateChanged.on(function (e) {
        var main1 = e.state === alphaTab.synth.PlayerState.Playing;
        btnPlay.textContent = main1 ? 'Jeda' : 'Putar'; btnPlay.classList.toggle('on', main1);
    });
    at.playerPositionChanged.on(function (e) {
        var d = Math.floor(e.currentTime / 1000);
        if (d === detikTerakhir) return; detikTerakhir = d;
        waktu.textContent = jam(e.currentTime) + ' / ' + jam(e.endTime);
    });
    at.playerPositionChanged.on(function (e) { ikutChord(e.currentTick); });
    /* bilah posisi: ikut lagu, bisa digeser untuk pindah */
    var posisi = $('#posisi'), geserPosisi = false;
    at.playerPositionChanged.on(function (e) { if (!geserPosisi) { posisi.max = Math.max(1, Math.round(e.endTime)); posisi.value = Math.round(e.currentTime); } });
    posisi.addEventListener('input', function () { geserPosisi = true; waktu.textContent = jam(+this.value) + ' / ' + jam(+this.max); });
    posisi.addEventListener('change', function () { at.timePosition = +this.value; geserPosisi = false; });
    /* hitung masuk "one, two, three, four" (rekaman yang sama dengan metronom) sebelum lagu mulai */
    var SUARA = {}, suaraSiap = null, sedangHitung = false;
    function muatSuara() {
        if (suaraSiap) return suaraSiap;
        var c = audio();
        suaraSiap = Promise.all(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map(function (n) {
            return fetch('audio/hitung/' + n + '.wav').then(function (r) { return r.ok ? r.arrayBuffer() : null; })
                .then(function (b) { return b && new Promise(function (ok) { c.decodeAudioData(b, function (buf) { SUARA[n] = buf; ok(); }, function () { ok(); }); }); })
                .catch(function () {});
        }));
        return suaraSiap;
    }
    function hitungMasuk() {
        var mb = birama(at.tickPosition || 0), bpm = tempoPada(mb) * kecepatan, n = mb.timeSignatureNumerator, iv = 60 / bpm * 4 / mb.timeSignatureDenominator;
        if (n > 12 || iv < 0.12) n = Math.min(n, 4);
        return muatSuara().then(function () {
            if (!SUARA['1']) return false;
            var c = audio(), t0 = c.currentTime + 0.12;
            for (var i = 0; i < n; i++) {
                var src = c.createBufferSource(); src.buffer = SUARA[String(i + 1)]; src.connect(comp); src.start(t0 + i * iv);
                (function (k) { setTimeout(function () { btnPlay.textContent = String(k + 1) + '\u2026'; }, (0.12 + k * iv) * 1000); })(i);
            }
            return new Promise(function (ok) { setTimeout(function () { ok(true); }, (0.12 + n * iv) * 1000 - 40); });
        });
    }
    btnPlay.addEventListener('click', function () {
        if (sedangHitung) return;
        if (!hitungOn || at.playerState === alphaTab.synth.PlayerState.Playing) { at.playPause(); return; }
        sedangHitung = true;
        hitungMasuk().then(function (ok) { sedangHitung = false; if (!ok) btnPlay.textContent = 'Putar'; at.play(); });
    });
    $('#stop').addEventListener('click', function () { at.stop(); });
    /* kecepatan putar, ditampilkan juga sebagai BPM; tap tempo menyamakan dengan ketukan yang diketuk */
    function tempoPada(mb) {
        var bpm = at.score ? at.score.tempo || 120 : 120;
        if (at.score) at.score.masterBars.forEach(function (m) { if (m.index <= mb.index && m.tempoAutomations && m.tempoAutomations.length) bpm = m.tempoAutomations[m.tempoAutomations.length - 1].value; });
        return bpm;
    }
    function tampilBpm() { $('#bpm').textContent = '\u2669 = ' + Math.round((at.score ? at.score.tempo || 120 : 120) * kecepatan); }
    function aturKecepatan(v, tanpaSimpan) {
        v = Math.max(0.25, Math.min(2, Math.round(v * 100) / 100)); kecepatan = v; at.playbackSpeed = v;
        var sel = $('#speed');
        [].slice.call(sel.querySelectorAll('[data-sendiri]')).forEach(function (o) { o.remove(); });
        if (![].some.call(sel.options, function (o) { return +o.value === v; })) {
            var o = document.createElement('option'); o.value = String(v); o.textContent = Math.round(v * 100) + '%'; o.dataset.sendiri = '1'; sel.appendChild(o);
        }
        sel.value = String(v); $('#tb-kec').textContent = Math.round(v * 100) + '%'; tampilBpm(); labelLatih();
        if (!tanpaSimpan) simpan();
    }
    $('#speed').addEventListener('change', function () { aturKecepatan(+this.value); });
    var ketukTap = [], tapJeda = 0;
    $('#tap').addEventListener('click', function () {
        var t = performance.now(), b = this;
        if (ketukTap.length && t - ketukTap[ketukTap.length - 1] > 2000) ketukTap = [];
        ketukTap.push(t); if (ketukTap.length > 6) ketukTap.shift();
        clearTimeout(tapJeda); tapJeda = setTimeout(function () { b.textContent = 'Tap'; ketukTap = []; }, 2500);
        if (ketukTap.length < 3) { b.textContent = 'Tap ' + ketukTap.length; return; }
        b.textContent = 'Tap \u2713';
        aturKecepatan(60000 / ((ketukTap[ketukTap.length - 1] - ketukTap[0]) / (ketukTap.length - 1)) / (at.score ? at.score.tempo || 120 : 120));
    });

    /* naik tempo otomatis: setiap beberapa putaran ulang, kecepatan bertambah sampai target */
    var tickLalu = 0;
    function labelLatih() {
        var b = $('#latih'); if (!b) return;
        b.hidden = !latih.on; b.textContent = 'Hentikan (' + Math.round(kecepatan * 100) + '\u2192' + Math.round(latih.sampai * 100) + '%)';
        $('[data-lembar="latihan"]').classList.toggle('aktif', latih.on);
    }
    $('#latih').addEventListener('click', function () { latih.on = false; labelLatih(); });
    $('#lt-go').addEventListener('click', function () {
        latih.mulai = +$('#lt-mulai').value; latih.naik = +$('#lt-naik').value; latih.setiap = +$('#lt-setiap').value; latih.sampai = +$('#lt-sampai').value;
        latih.putaran = 0; latih.on = true;
        at.isLooping = true; $('#loop').setAttribute('aria-pressed', 'true');
        aturKecepatan(latih.mulai); tutupLembar();
    });
    at.playerPositionChanged.on(function (e) {
        /* posisi melompat mundur saat sedang main = satu putaran ulang selesai */
        if (latih.on && e.currentTick + 480 < tickLalu && at.playerState === alphaTab.synth.PlayerState.Playing) {
            latih.putaran++;
            if (latih.putaran % latih.setiap === 0 && kecepatan < latih.sampai) aturKecepatan(Math.min(latih.sampai, kecepatan + latih.naik));
        }
        tickLalu = e.currentTick;
    });
    function saklar(id, fn) {
        var b = $(id);
        b.addEventListener('click', function () { var on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); fn(on); });
    }
    saklar('#loop', function (on) { at.isLooping = on; });
    saklar('#metro', function (on) { at.metronomeVolume = on ? 1 : 0; simpan(); });
    saklar('#countin', function (on) { hitungOn = on; if (on) muatSuara(); simpan(); });

    /* pengaturan terakhir diingat di perangkat ini */
    var KUNCI = 'ayri-partitur';
    function simpan() {
        try {
            localStorage.setItem(KUNCI, JSON.stringify({ kecepatan: kecepatan, tampilan: tampilan, alat: alat, kidal: kidal, ikut: ikut, hitung: hitungOn,
                metro: $('#metro').getAttribute('aria-pressed') === 'true', latih: { mulai: latih.mulai, naik: latih.naik, setiap: latih.setiap, sampai: latih.sampai } }));
        } catch (e) {}
    }
    function pulihkan() {
        var p = null; try { p = JSON.parse(localStorage.getItem(KUNCI) || 'null'); } catch (e) {}
        if (!p) return;
        if (p.kecepatan) aturKecepatan(p.kecepatan, true);
        if (/^(semua|balok|tab|angka|slash)$/.test(p.tampilan)) { tampilan = p.tampilan; $('#profil').value = tampilan; }
        if (typeof INSTS === 'object' && INSTS[p.alat]) { alat = p.alat; $('#alat').value = alat; $('#kidal-w').hidden = alat === 'pno'; }
        kidal = !!p.kidal; $('#kidal').checked = kidal;
        ikutAwal = !!p.ikut;
        hitungOn = !!p.hitung; $('#countin').setAttribute('aria-pressed', hitungOn);
        if (p.metro) { at.metronomeVolume = 1; $('#metro').setAttribute('aria-pressed', 'true'); }
        if (p.latih) ['mulai', 'naik', 'setiap', 'sampai'].forEach(function (k) { if (p.latih[k]) { latih[k] = p.latih[k]; $('#lt-' + k).value = String(p.latih[k]); } });
    }

    /* ---------- instrumen (track) ---------- */
    function gambarTrack() {
        var score = at.score; if (!score) return;
        $('#chips').innerHTML = score.tracks.length < 2 ? '' : score.tracks.map(function (t) {
            var i = t.index;
            return '<button type="button" class="chip' + (bisu[i] ? ' bisu' : '') + '" data-chip="' + i + '" aria-pressed="' + (tampilTrack.indexOf(i) > -1) + '">' + esc(t.name || 'Instrumen ' + (i + 1)) + '</button>';
        }).join('') + '<button type="button" class="chip" data-lembar="instrumen">Bisu / solo</button>';
        $('#tracks').innerHTML = score.tracks.map(function (t) {
            var i = t.index;
            return '<div class="sc-trk" data-i="' + i + '"><b>' + esc(t.name || 'Instrumen ' + (i + 1)) + '</b>' +
                '<label class="tgl"><input type="checkbox" data-tampil' + (tampilTrack.indexOf(i) > -1 ? ' checked' : '') + '> Tampil</label>' +
                '<button type="button" class="chip" data-mute aria-pressed="' + !!bisu[i] + '">Bisu</button>' +
                '<button type="button" class="chip" data-solo aria-pressed="' + !!solo[i] + '">Solo</button></div>';
        }).join('');
    }
    $('#tracks').addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        var i = +b.closest('[data-i]').dataset.i, t = at.score.tracks[i], on = b.getAttribute('aria-pressed') !== 'true';
        b.setAttribute('aria-pressed', on);
        if (b.hasAttribute('data-mute')) { bisu[i] = on; at.changeTrackMute([t], on); } else { solo[i] = on; at.changeTrackSolo([t], on); }
        var c = $('[data-chip="' + i + '"]'); if (c) c.classList.toggle('bisu', !!bisu[i]);
    });
    function aturTampilTrack(pilih) {
        tampilTrack = pilih;
        $$('#tracks [data-tampil]').forEach(function (c) { c.checked = pilih.indexOf(+c.closest('[data-i]').dataset.i) > -1; });
        $$('[data-chip]').forEach(function (c) { c.setAttribute('aria-pressed', pilih.indexOf(+c.dataset.chip) > -1); });
        at.renderTracks(pilih.map(function (i) { return at.score.tracks[i]; }));
    }
    $('#chips').addEventListener('click', function (e) {
        var c = e.target.closest('[data-chip]'); if (!c) return;
        var i = +c.dataset.chip, pilih = tampilTrack.slice(), k = pilih.indexOf(i);
        if (k > -1) { if (pilih.length === 1) return; pilih.splice(k, 1); } else pilih.push(i);
        aturTampilTrack(pilih.sort(function (a, b) { return a - b; }));
    });
    $('#tracks').addEventListener('change', function (e) {
        if (!e.target.hasAttribute('data-tampil')) return;
        var pilih = $$('#tracks [data-tampil]').filter(function (c) { return c.checked; }).map(function (c) { return +c.closest('[data-i]').dataset.i; });
        if (!pilih.length) { e.target.checked = true; return; }
        aturTampilTrack(pilih);
    });

    /* ---------- unduh & cetak (sesuai yang tampil: sudah ditranspose / pakai kapo) ---------- */
    function simpanBlob(data, nama, tipe) {
        var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type: tipe })); a.download = nama;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }
    function namaAman() { return (judulFile || 'partitur').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'partitur'; }
    $('#dl-gp').addEventListener('click', function () { simpanBlob(new alphaTab.exporter.Gp7Exporter().export(at.score, at.settings), namaAman() + '.gp', 'application/octet-stream'); });
    $('#dl-midi').addEventListener('click', function () { at.downloadMidi(); });
    $('#dl-tex').addEventListener('click', function () { simpanBlob(new alphaTab.exporter.AlphaTexExporter().exportToString(at.score, at.settings), namaAman() + '.txt', 'text/plain'); });
    $('#cetak').addEventListener('click', function () { at.print(); });

    /* ---------- tulis sendiri (mode teks di lembar Lagu) ---------- */
    $('#teks-w').addEventListener('toggle', function () { if (this.open && !tex.value.trim()) { tex.value = TEMPLAT.gitar.join('\n'); muatTeks(tex.value, true); } });
    tex.addEventListener('input', function () { clearTimeout(ketik); ketik = setTimeout(function () { muatTeks(tex.value, false); }, 600); });
    $('#templat').addEventListener('change', function () {
        var v = this.value, t = TEMPLAT[v]; this.value = ''; if (!t) return;
        /* lagu kosong langsung dibuka di editor ketuk-ketik */
        if (window.PartiturEdit) { tutupLembar(); window.PartiturEdit.baru(v); return; }
        tex.value = t.join('\n'); $('#teks-w').open = true; muatTeks(tex.value, true); tandaiLagu(''); tex.focus();
    });
    $('#tex-ini').addEventListener('click', function () {
        if (!at.score) return;
        try { tex.value = new alphaTab.exporter.AlphaTexExporter().exportToString(at.score, at.settings); muatTeks(tex.value, true); } catch (e) { tampilErrTeks(e); }
    });

    $('#file').addEventListener('change', function () { tandaiLagu(''); bukaFile(this.files[0]); this.value = ''; tutupLembar(); });
    function tandaiLagu(k) { $$('#daftar-lagu [data-lagu]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.lagu === k); }); }
    $('#daftar-lagu').innerHTML = Object.keys(CONTOH).map(function (k) {
        var n = CONTOH[k].nama.split(':');
        return '<button type="button" data-lagu="' + k + '" aria-pressed="false"><b>' + esc(n[0].replace(/\s*\(.*\)$/, '')) + '</b><small>' + esc((n[1] || '').trim()) + '</small></button>';
    }).join('');
    function muatContoh(k) {
        var c = CONTOH[k]; if (!c) return;
        tex.value = c.tex; muatTeks(c.tex, true); tandaiLagu(k);
    }
    $('#daftar-lagu').addEventListener('click', function (e) { var b = e.target.closest('[data-lagu]'); if (b) { muatContoh(b.dataset.lagu); tutupLembar(); } });
    /* tarik & lepas file ke halaman */
    main.addEventListener('dragover', function (e) { e.preventDefault(); main.classList.add('drop'); });
    main.addEventListener('dragleave', function (e) { if (e.target === main) main.classList.remove('drop'); });
    main.addEventListener('drop', function (e) { e.preventDefault(); main.classList.remove('drop'); if (e.dataTransfer.files[0]) { tandaiLagu(''); bukaFile(e.dataTransfer.files[0]); } });

    /* lembar pengaturan: dari bawah di HP; di layar lebar semua bagian tampil di panel samping */
    var samping = $('#samping');
    function bukaLembar(n) {
        var isi = $('[data-lembar-isi="' + n + '"]'); if (!isi) return;
        $$('[data-lembar-isi]').forEach(function (x) { x.classList.toggle('aktif', x === isi); });
        $('#lembar-judul').textContent = isi.dataset.judul;
        samping.setAttribute('data-buka', n); samping.scrollTop = 0;
        document.body.classList.add('lembar-on');
        if (window.matchMedia('(min-width: 900px) and (min-height: 520px)').matches) isi.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    function tutupLembar() { samping.removeAttribute('data-buka'); document.body.classList.remove('lembar-on'); }
    document.addEventListener('click', function (e) {
        var b = e.target.closest('[data-lembar]');
        if (b) { if (samping.getAttribute('data-buka') === b.dataset.lembar) tutupLembar(); else bukaLembar(b.dataset.lembar); return; }
        if (e.target.closest('[data-tutup-lembar]')) tutupLembar();
    });

    /* laci (drawer) Info dan Cara menulis */
    $$('[data-open]').forEach(function (b) { b.addEventListener('click', function () { $('#' + b.dataset.open).hidden = false; }); });
    $$('.drawer').forEach(function (d) { d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.hidden = true; }); });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { $$('.drawer').forEach(function (d) { d.hidden = true; }); tutupLembar(); }
        if (e.key === ' ' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName) && !btnPlay.disabled) { e.preventDefault(); at.playPause(); }
    });

    /* lagu awal: band lengkap, supaya terlihat semua instrumen bisa */
    /* jembatan untuk editor ketuk-ketik (partitur-edit.js) */
    window.Partitur = {
        at: at, main: main, $: $, $$: $$, esc: esc, pesan: pesan, tutupLembar: tutupLembar, bukaLembar: bukaLembar,
        skor: function () { return dasar; },
        pakai: function (obj) { dasar = obj; gambar(); },
        mulaiEdit: function (ti, obj) {
            nada = 0; kapo = 0; kontrolNada(); hapusAB();
            if (/^(balok|angka|slash)$/.test(tampilan)) { tampilan = 'semua'; $('#profil').value = 'semua'; }
            if (editTrack === null) tampilSebelumEdit = tampilTrack;
            editTrack = ti; tampilTrack = [ti]; dasar = obj; gambar();
        },
        selesaiEdit: function () {
            editTrack = null;
            tampilTrack = tampilSebelumEdit && tampilSebelumEdit.length ? tampilSebelumEdit : [0];
            if (at.score) tampilTrack = tampilTrack.filter(function (i) { return i < at.score.tracks.length; });
            gambar();
        },
        muatTeksBaru: function (t) { tex.value = t; muatTeks(t, true); tandaiLagu(''); },
        muatJson: function (obj) { tandaiLagu(''); muatScore(JSONC.jsObjectToScore(obj, at.settings), { semua: true, baru: true }); },
        aturJudul: function (j) { judulFile = j; $('#judul-lagu').textContent = j; },
        /* bunyi tuts piano langsung saat diketuk (tanpa menunggu partitur digambar ulang) */
        bunyiNada: function (m) { try { nadaBunyi(m, audio().currentTime + 0.01, 0.22, true); } catch (e) {} }
    };
    pulihkan();
    muatContoh('sayange');
})();
