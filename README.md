# HUSER ASHİ PLANLAMA

Aylık personel dağılımı, görevlendirme ve nöbet ihtiyacı planlama uygulaması (tek dosyalı HTML). Nöbet Sayım uygulamasının kurallarını (kadro saati, 24 saat / 12 saat, özel günler) kullanır.

- **Çalıştırma:** `dist/HUSER ASHİ PLANLAMA v01.00.html` dosyasını tarayıcıda açın. Veriler yalnızca tarayıcıda (IndexedDB) tutulur.
- **Veri yükleme:** "Personel listelerini yükle" düğmesiyle (veya sürükle-bırak) ASOS'tan indirilen iki dosya birlikte yüklenir: "Personel Listesi Raporu" ve EKİP "Başhekimlik Komuta İstasyon Personel Listesi Raporu". Kişiler TC ile birleşir.
- **Derleme:** `python3 build.py` (kaynak: `src/`). **Test:** `node test/core.test.js`.
- **Modül sözleşmesi:** `AshiPlanlama.mount(kök, {depolama, kullanici:{rol}, ayarlar, olaylar})`.
- **Tasarım:** `docs/TASARIM.md`.

Bu depoya kişisel veri (Excel, personel listesi, TC) eklenmez.
