# ASHİ Personel Planlama — Uygulama Tasarımı (v6)

Dayanaklar:
- `gumusorhan-wq/ashi-nobet-sayim` kodu (HUSER ASHİ Nöbet Sayım Raporu, sürüm 03.01)
- "2026 Ağustos Ayı Planlama Güncel.xlsx" (planlamanın bugün kullandığı Excel)
- Ekiplere dağıtılan istasyon görüntüsü (YUNUSEMRE 2 NOLU ASHİ örneği)

Netleşen kararlar: kapsam **tüm istasyonlar + Komuta Kontrol (KKM) + Başhekimlik + kurum dışı giden/gelen**; **memurlar 24 saat, işçiler yalnızca 12 saat** nöbet tutar; sonuç **çıktı (Excel/görüntü) olarak alınır**; uygulamayı **ekip birlikte kullanır**.

## 1. Mevcut planlamanın gerçek yapısı (Excel'den çıkarılan)

Planlama, günlük vardiya çizelgesi değil, **aylık personel dağılımı ve görevlendirme planıdır**. Her istasyonun sayfası şunları taşır:

| Sütun | Anlamı |
|---|---|
| AD SOYAD / ÜNVAN | Doktor, ATT / SRC ATT / 4/B ATT / sağlık memuru, sürekli işçi. Gruplar koyu mavi çizgiyle ayrılır: doktorlar, memurlar, işçiler |
| G.GÖREV DURUMU | Geçici görevde (gönderilen), geçici görevli (gelen), doğum öncesi/sonrası, analık hakkı, raporlu, gebe mesai, risk gebelik, ücretsiz izin, yarı zamanlı, sağlık mazereti, mesai usulü / nöbet usulü |
| İZİNLER | Gün sayısı + tür (çoğunlukla yıllık izin) |
| TAHMİNİ NÖBET | Kişinin ay içinde tutacağı tahmini nöbet sayısı (24 saatlik birim, işçide 0,5 adımlı) |
| GEÇİCİ GÖREV TARİHLERİ | Gittiği/geldiği yer (başka istasyon, KKM, Başhekimlik, İl Sağlık Müdürlüğü, hastane) ve tarih |
| YOLLUK DURUMU | Yolluklu / yolluksuz |
| Gerekçe (son sütun) | "X NOLU ASHİ PERSONEL İHTİYACI", "MESAİ TAMAMLAYAMAMA" gibi |

Renk kodu (hem Excel'de hem dağıtılan görüntüde): sarı yıllık izin, kırmızı geçici görevde, yeşil geçici görevli, mor doğum/analık, gri raporlu, mavi hem geçici görevli hem izinli.

Diğer sayfalar: **Personel Bilgileri** (analık hakkı ve süt izni takibi: 6+6 ay, başlangıç/bitiş tarihleri), **KKM** ve **BAŞHEKİMLİK** (birim/görev, nöbet sayısı), **Kurum Dışına Giden / Gelen**, **İstatistik** (toplamlar), gizli **Yollukli/Yolluksuz** ve **Tüm Liste** birleştirme sayfaları. Dosyada 65 civarı istasyon sayfası ve yaklaşık 970 personel var.

### Excel'den çıkarılan iş kuralları
1. **Her istasyon, ay boyunca günde 3 nöbet yuvası** tutar: ekip sorumlusu, yardımcı sağlık personeli, sürücü. 31 günlük ayda **3 × 31 = 93 nöbet** (24 saatlik birim). Her istasyon sayfasında tahmini nöbet toplamı 93'e eşit olmalıdır. Örnekler: yalnızca memurlu istasyonlar 93; doktorlu istasyonlar 31 (doktor) + 62 (memur); işçili istasyonlarda memur + işçi toplamı 62 ya da 93.
2. **Doktor** ekip sorumlusu yuvasını doldurur (doktor sayısı kadar kişi arasında 31 nöbet bölünür).
3. **İşçiler** yalnızca sürücü yuvasında ve 12 saatlik nöbetle çalışır; tahmini nöbetleri 0,5'in katıdır (6, 7,5, 9 gibi). Sürücü yuvasının işçinin kapatamadığı kısmını memur 24 saatle tamamlar.
4. **İzin etkisi**: izinli gün sayısı arttıkça tahmini nöbet düşer (10 gün izinde yaklaşık 5, 15 günde yaklaşık 3). Ağustos 2026 örneğinde izin yapısı: yıllık izin yaygın, ücretsiz izin ayrı.
5. **Aylık çalışma hedefi** (İstatistik sayfası): 657 sayılı (memur) için 160 saat ≈ 7 nöbet; 4/D'li (işçi) için 195 saat ≈ 18 nöbet. İşçinin 195 saati, ayın 26 çalışma günü × 7,5 saatten gelir (Ağustos 2026: 5 Pazar hariç).
6. **Geçici görev** kaydı iki sayfada tutulur: kaynak istasyonda "geçici görevde", hedef istasyonda "geçici görevli". Bugün bu eşleştirme elle yapılır.
7. **Yolluk**: görevlendirme yolluklu veya yolluksuz. Ağustos 2026: 43 yolluksuz, 15 yolluklu.
8. **Personel ihtiyacı / mesai tamamlayamama** gerekçeleri, hangi istasyonun açık verdiğini ve hangisinin fazla personeli olduğunu gösterir; geçici görevlendirmenin sebebidir.

### Bugünkü Excel'in sorunları (yeni uygulamanın çözeceği)
- Birleştirme sayfalarında yaygın `#REF!` hataları (Yolluklu/Yolluksuz, Tüm Liste).
- İstatistik sayfasında elle yazılmış sayılar ("Askerlik İzni", "Ücretsiz İzin: 12", 32, 11, 3, 973 gibi) ve dosya içinde yazım hataları ("AĞUTOS").
- Aynı kişi birden çok sayfada elle tekrar yazılıyor; tutarsızlık riski.
- Bazı istasyon sayfaları boş ya da eksik (tahmini nöbet toplamı 93 değil), bunu ancak elle toplayarak fark edebiliyorsunuz.
- Birden çok kişi aynı dosyayı kullanınca sürüm karışıklığı ve veri kaybı.
- Sağlık bilgisi içeren veri (gebelik, rapor, analık) herkese açık dosyada dolaşıyor.

## 2. Amaç

İstasyon, KKM ve Başhekimlik personel dağılımını **tek kayıttan** yönetmek:
- Kişi bir kez tanımlanır; izin, görevlendirme, tahmini nöbet bu kayıttan beslenir.
- Her istasyon için 93 nöbet (ay günü × 3) dengesi otomatik denetlenir.
- Geçici görevlendirme iki tarafta birden otomatik görünür.
- İstatistik ve toplamlar elle değil otomatik hesaplanır.
- Ekiplere dağıtılan görüntü/Excel tek tuşla üretilir.
- Ay sonunda gerçekleşen nöbetler (Nöbet Sayım uygulaması) planla karşılaştırılır.

## 3. Kullanıcılar ve yetkiler

Planlama verisini **yalnızca planlama birimi ve idareci** görür ve işlem yapar. **İstasyon sorumluları uygulamayı görmez.** Çıktılar (istasyon görüntüsü/Excel) onlara dışarıdan, bugünkü gibi dağıtılır.

| Rol | Yapabildiği |
|---|---|
| Yönetici (idareci) | Her şey: ay kilidi, kullanıcı ve parola yönetimi, kural ayarları, onay |
| Planlayıcı (planlama birimi) | Tüm istasyonlarda düzenleme, görevlendirme, personel yükleme, çıktı alma |
| Salt okur | Yalnızca modül modunda ve ileride: ana uygulamaya gömüldüğünde görüntüleme (ana uygulama tarafından verilir) |

Sağlık ve gebelik bilgileri (rapor, doğum, analık, gebe mesai) özel nitelikli veridir; yalnızca bu iki rol görür. Kişisel veri aktarımda ve saklamada şifrelidir.

## 4. Mimari

**Nöbet Sayım uygulamasıyla aynı model:** tek dosyalı HTML (Mac, Windows, iPhone, iPad tarayıcısı), IndexedDB yerel kayıt, şifreli ortak Drive arşivi (AES-GCM, PBKDF2 310.000 yineleme, gzip; ekip parolası + ayrı kimlik parolası), sürümlü dosya adı (`HUSER ASHİ PLANLAMA vXX.YY.html`), güncelleme manifesti, son 6 ay yerel arşiv, Excel okuma/yazma (SheetJS), depoda kişisel veri yok. Eşzamanlı düzenleme sorun olursa sunucu modeline geçilir; veri modeli ve modül sözleşmesi buna hazır tasarlanır.

**Ekip çalışması (Drive arşivi):** ay paketi tek dosya olarak yayınlanır. Aynı anda iki kişi aynı istasyonu düzenlerse çakışma kaydın "son kaydeden / zaman" imzasıyla yakalanır ve birleştirme önerilir. Çakışmayı azaltmak için **birim bazlı paketleme** (her istasyon ayrı kayıt) ve **birim kilidi** ("X şu an düzenliyor") kullanılır.

### Modül olarak gömülebilirlik
Uygulama sonradan başka bir uygulamanın içine eklenecek. Bunun için baştan:
- **Global değişken ve `window` bağımlılığı yok.** (Sayım uygulaması `window.__ci` gibi globaller kullanıyor; planlamada tüm durum modül içinde.) Tek giriş noktası: `AshiPlanlama.mount(kök, {depolama, kullanıcı, ayarlar, olaylar})`; `unmount()`, `getState()`.
- **Bağımlılık enjeksiyonu:** depolama (IndexedDB / Drive / ana uygulamanın veritabanı), kimlik ve rol (ana uygulamadan gelir; bağımsız çalışırken parola), tema, dil, günlük kaydı. Hepsi bir "adaptör" arayüzüdür; varsayılanları bağımsız sürümde hazır.
- **Ad alanı:** CSS önekli (`ashi-pl-`), Shadow DOM seçeneği; ana uygulamanın stilini bozmaz ve bozulmaz.
- **Olay arayüzü:** `plan:degisti`, `plan:onaylandi`, `personel:guncellendi`, `ay:kilitlendi`. Ana uygulama bunları dinler, planlama dışarıdan `personel` ve `izin` verisi alabilir.
- **Veri sözleşmesi:** ay paketi, personel, izin, görevlendirme için sürümlü JSON şeması (`schemaVersion`). İçe/dışa aktarma bu şemadan geçer.
- **Çekirdek ayrı paket:** tarih/kadro saati/özel gün/izin sınıflandırma/kural motoru ayrı dosya olarak yazılır; Nöbet Sayım uygulaması da ileride aynı çekirdeği kullanır. UI ince katmandır.
- **Bağımsız ve gömülü mod aynı kodla** çalışır, tek fark adaptörlerdir. Gömülü modda ana uygulama yalnızca **salt okur** görünüm verebilir (`salt_okur: true`); düzenleme yetkisi planlama birimi ve idarecide kalır.
- **Şimdilik tek dosyalı HTML** olarak geliştirilir; modül sözleşmesi baştan koda yerleştirilir, paketleme (ES modülü / web bileşeni) ana uygulama belli olunca seçilir.

Ortak özellikler her iki modda aynıdır: roller, değişiklik günlüğü, ay kilidi, güncelleme.

## 5. Veri modeli

```
Personel     tc, ad, soyad, unvan, istihdam (memur|işçi|doktor), kadroBirim, tel,
             kadroBrans, nöbetYetkisi (es|ysp|sur), sürücüMü, notlar
Birim        ad, tür (istasyon|KKM|başhekimlik|kurum dışı), ilçe, kod,
             ihtiyaç: günlük yuvalar [es, ysp, sur]
Aylık kayıt  ay (YYYY-AA), tc, birim (o ay çalıştığı), durum (görev durumu listesi),
             izinler[{tür, başlangıç, bitiş, gün}], tahminiNöbet, saatBirimi (24|12),
             renk/etiket (hesaplanır)
Görevlendirme tc, kaynakBirim, hedefBirim, başlangıç, bitiş, yolluk (var|yok),
             gerekçe (personel ihtiyacı | mesai tamamlayamama | sağlık mazereti | eğitim | diğer),
             tür (kurum içi | kurum dışı giden | kurum dışı gelen)
Analık/Süt   tc, doğum tarihi, analık hakkı başlangıç/bitiş, süt izni ilk 6 ay / son 6 ay, bitiş
Özel gün     tarih, tür (resmi tatil|bayram|arife|yarım gün)
Plan         ay, durum (taslak|onaylı|kilitli), sürüm, değişiklik günlüğü
```

Durum listesi (açılır liste), Excel'deki ifadelerle uyumlu: geçici görevde, geçici görevli, doğum öncesi izin, doğum sonrası izin, analık hakkı, analık mesai, gebe mesai, risk gebelik, raporlu, heyet raporlu, ücretsiz izin, askerlik izni, yarı zamanlı, sağlık mazereti (nöbet / mesai), mesai usulü, nöbet usulü, yıllık izin.

## 6. Hesaplama ve kurallar

### 6.1 İhtiyaç ve denge
- Birim ihtiyacı: ayın gün sayısı × yuva sayısı (ES + YSP + sürücü = 3). 31 gün → **93**, 30 gün → 90.
- Doktorlu istasyonda ES yuvası doktorlara, kalan yuvalar memur/işçiye ayrılır.
- Doğrulama: istasyonun tahmini nöbet toplamı = ihtiyaç. Fark kırmızı uyarı olur ("3,5 nöbet eksik" / "2 fazla").

### 6.2 Aylık mesai hedefi ve hedef nöbet (kesinleşen formül)

**Memur** (ATT, SRC ATT, 4/B ATT, sağlık memuru, AABT vb.) ve **doktor**:
- Aylık mesai = (ayın **hafta içi** günleri − hafta içine düşen **resmi tatiller**) × 8 saat. Cumartesi ve pazar sayılmaz.
- **Hedef nöbet = aylık mesai ÷ 24.**
- Örnek Ağustos 2026: 21 hafta içi gün × 8 = **168 saat → 7 nöbet**.

**İşçi** (sürekli işçi, 4/D):
- Aylık mesai = (ayın günleri − **pazarlar** − **resmi tatiller**) × 7,5 saat. Cumartesi çalışılır.
- Nöbet yazılırken 12 saat görünür, ancak sistemden **11 saat** düşülür. **Hedef nöbet = aylık mesai ÷ 11** (12 saatlik birim).
- Örnek Ağustos 2026: 31 − 5 pazar = 26 gün × 7,5 = **195 saat → 195 ÷ 11 = 17,7 → 18 nöbet**.

Not: Excel'deki sayılar **Ağustos** ayına aittir; planlama **Kasım** için yapılacak. Rakamlar örnektir, uygulama her ayı takvime göre hesaplar. Yuvarlama kuralıyla Ağustos işçi için 17, Kasım için (30 gün − 4 pazar − tatil) hesabı otomatik çıkar.

**Kişiye özel düzeltmeler** (izin ve durum kişinin hedefini düşürür):
- Yıllık izin, rapor, ücretsiz izin, **idari izin** ve diğer izin günleri, o güne düşen kadro saatini sıfırlar (tam gün) ya da saatlik ise düşer. Hafta sonuna ve tatile denk gelen izin hedefi etkilemez. Memurda izin günü × 8, işçide × 7,5 saat düşülür.
- Süt izni: günlük kadro saatinden 1,5 veya 3 saat düşer (Nöbet Sayım uygulamasındaki kural).
- Nöbet muafiyeti ve doğum, analık, gebe mesai, risk gebelik gibi durumlarda kişi nöbet dışıdır; hedef nöbet 0, **mesai** ise ayrıca izlenir.
- Yarım gün ve arife: özel gün ayarından gelir (bkz. §6.5).
- **Yuvarlama:** memur ve doktorda **yukarı**, 0,5 adımla (7,33 → 7,5); işçide **aşağı**, tam 12 saatlik nöbet adedine (17,7 → 17). Her ikisi ayardır.
- **Birim:** istasyon dengesi **24 saatlik eşdeğer** üzerinden tutulur. Memurda 24 saatlik nöbet = 1, 12 saatlik = 0,5 (12 saat yazılırsa 12 sayılır). İşçide her 12 saatlik nöbet = 0,5 (sistemden 11 saat düşülür). Bu yüzden Excel'deki işçi değerleri 6, 7,5, 9 gibi görünür.
- **Doktor** yalnızca **ekip şefi** nöbeti tutar; hedef formülü memurla aynıdır.

Her kişi için üç sayı gösterilir:
| Sayı | Anlamı |
|---|---|
| **Mesai (saat)** | Bu ay yapması gereken, izin ve tatile göre hesaplanan süre |
| **Hedef nöbet** | Mesaiyi nöbetle tamamlamak için gereken nöbet (yukarıdaki formül) |
| **Planlanan (tahmini) nöbet** | Excel'deki tahmini nöbet sütunu; istasyonun ihtiyacı dağıtılınca çıkan sayı |
| **Fark** | Planlanan − hedef. Pozitif: fazla mesai; negatif: mesai tamamlayamama |

### 6.2a Azami nöbet (hedefin üstü)
Hedef nöbet ayın mesaisini doldurur (Kasım 2026: memur 7), ancak memur ve doktora **hedefin üstünde azami 8 nöbet** yazılabilir. Ayar: *Memur/doktor azami nöbet* (varsayılan 8); işçi için *ek nöbet* (varsayılan 0, 12 saatlik adet).
- **Kişi azamisi** = en çok `azami`, izinli kişide hedef + aynı ek (ör. Kasım'da hedef 7 → azami 8; izinle hedefi 5 olan kişi azami 6).
- **Dağıtım:** havuz hedef toplamından azsa nöbetler hedefe orantılı azaltılır (mesai dolmaz); fazlaysa **önce herkese hedefi, kalanı en az ek alana azami sınırı aşmadan** verilir. Azamiyle de dolmayan kısım planlanmadan kalır ve "personel ihtiyacı" olur.
- **İstasyon durumu:** *Mesai tamamlayamama* (hedef kapasite ihtiyacı aşıyor) · *Dengede* · ***Fazla mesaiyle dolar*** (hedefle dolmuyor, azamiyle doluyor) · *Personel ihtiyacı* (azamiyle de dolmuyor). Rotasyonda hedef istasyon olarak yalnızca **azamiyle de dolmayan** istasyonlar sayılır.
- Kasım 2026 denemesi (iki ASOS listesiyle): hedefle 49 istasyon açık görünürken azamiyle 28'e iner; 21 istasyon fazla mesaiyle dolar, 16 istasyon mesaisini tamamlayamaz.

### 6.3 Görevlendirme kuralları
- Kaynak ve hedefte otomatik eşleşme: bir görevlendirme girilince kaynakta "geçici görevde" (kırmızı), hedefte "geçici görevli" (yeşil) görünür; ikisi tek kayıttan türer.
- Görevlendirmeli kişi kaynakta tahmini nöbete dahil edilmez, hedefte edilir (tarih aralığına oranla).
- Öneri motoru: açık veren istasyon ("personel ihtiyacı") için fazlası olan istasyonlardan aday listesi çıkarır. İlçe yakınlığı ve yolluk durumu (yolluksuz öncelikli) puanlanır.
- **4/B kuralı (sert):** 4/B'li personel, **memuriyet/görev başlangıç tarihinden itibaren 4 yılı doldurmadan başka istasyona görevlendirilemez.** Başlangıç olarak **ASOS atama başlayış tarihi** kullanılır (yoksa memuriyet başlangıç tarihi). Uygulama tarihi, plan ayının ilk gününe göre hesaplar. Dolmamışsa görevlendirme reddedilir, öneri listesine alınmaz, kişi satırında "4/B · 4 yıl dolumu: GG.AA.YYYY" etiketi görünür. Dolumuna 3 ay kalanlar "yakında uygun" olarak işaretlenir.
- Uyarılar: aynı kişi iki yerde aynı gün, izinli kişiye görevlendirme, süre aşımı (3 ay ve üzeri "uzun süreli görevlendirme" ayrı raporlanır), bitiş tarihi geçmiş görevlendirme.

### 6.4 Personel ihtiyacı değerlendirmesi
Excel'deki "PERSONEL İHTİYACI" ve "MESAİ TAMAMLAYAMAMA" gerekçeleri aşağıdaki ölçütle otomatik üretilir.
- **Hedefle açık:** ihtiyaç − etkin kapasite (kişiler hedef nöbetlerini tam tutsa bile kalan).
- **Personel öner (N kişi):** açık, gelen bir kişinin mesaisini bu istasyonda tamamlamasına yetiyorsa (açık ≥ tam ay hedefi, Kasım'da 7 nöbet). **N = açık ÷ hedef (aşağı yuvarlanır)**; kalan küçük kısım fazla nöbetle kapanır.
- **Fazla nöbetle kendi içinde döner:** açık bir kişiyi doldurmaya yetmiyor ve azami nöbetle kapanıyor → **personel önerilmez**.
- **Elle karar:** açık bir kişiye yetmiyor ve azamiyle de kapanmıyor → uygulama önermez, durumu **belirtir**; görevlendirme gerekip gerekmediğine planlayıcı karar verir (Görevlendirmeler bölümünden elle yapılır; 4/B ve doktor kısıtları denetlenir).
- **Mesai tamamlayamama:** hedef nöbetler ihtiyacı aşıyor; bu istasyon personel verebilir.
- Her istasyon için bu değerlendirme Pano kartlarında, Görevlendirme sayfasındaki "Personel ihtiyacı değerlendirmesi" tablosunda ve toplu Excel'in özet sayfasında yer alır.
- **Rotasyon önerileri** yalnızca "Personel öner" türündeki istasyonlara, gelen kişinin mesaisini orada tamamlayacağı kadar yapılır; varsayılan kaynak mesaisi dolmayan (fazla) istasyonlardır, "tüm istasyonlar" seçilebilir.
- **Ekip OF:** ekibin geçici görevdeki personeli olduğu yerde **devam eder**; sonraki aya kopyalanırken görevleri uzatılır. Ekipte henüz görevlendirilmemiş personel için rotasyon **uzun süreli (açık uçlu)** görev önerir. Ekip yeniden açılırken ya da "Personeli geri çağır" ile **personel geri çağrılır** (kurum içi görevler bitirilir; kurum dışı yerlerdeki görevler değiştirilmez).

Nöbet düzeni kuralları plan nöbete çevrildiğinde geçerlidir: 24 saatlik nöbette gün aşırı art arda 3 nöbet olmaz; 12 saatlik gece nöbetinde art arda 3 gece olmaz; nöbet öncesi ve sonrası gün dinlenme.

### 6.5 Özel gün ve idari izin
Nöbet Sayım uygulamasındaki **"Özel gün ekle"** bölümü aynen alınır; resmi tatil takvimi hazır gelir, kullanıcı ekleyip siler.
| Özel gün türü | Etkisi |
|---|---|
| Resmi tatil / bayram | Memur ve işçi mesai günü sayısı düşer |
| Arife | 5 saat (ayar) |
| Yarım gün | Memurda 4 saat, işçide 3,75 saat (ayar) |
| **İdari izin günü (toplu)** | Duyurulan idari izin: tüm personel ya da seçilen birimler için tam/yarım gün; hedefi toplu olarak düşürür |
| Kişiye özel idari izin | Ayrıca girilir (tek kişi, tarih/saat aralığı); kod **İİ**, hedefi düşürür |
Özel gün eklenince tüm istasyonların hedef ve dengesi anında yeniden hesaplanır; değişiklik günlüğüne işlenir.

### 6.6 Planlama takvimi (10-15'inde, sonraki ay için)
Planlama her ayın **10-15'i** arasında **bir sonraki ay** için yapılır. Bu yüzden:
- Plan ayı = bir sonraki ay (ör. Ekim 15'inde Kasım planı). Arayüz hep "Planlanan ay: Kasım 2026" gösterir.
- Bu tarihte sonraki ayın izinleri, raporları ve doğumları **kesin değildir**. Veriler **"tahmini / kesin"** işaretlidir; plan **taslak** olarak açılır, ay başına doğru güncellenir ve ayın 25'i civarında **kesinleştirilir**. Planlama sonrası eklenen izin/rapor "plan sonrası değişiklik" olarak ayrı listelenir.
- **Önceki aydan kopyala:** personel, birim, devam eden geçici görevler (bitiş tarihi sonraki aya sarkanlar), uzun süreli görevlendirmeler, süren analık/süt izni ve ücretsiz izinler otomatik taşınır; bitişi yaklaşan kayıtlar uyarı verir.
- **Bitiş tarihli durumlar** (ör. doğum sonrası izin bitişi, süt izni 6 ay, ücretsiz izin bitişi) sonraki ay başında otomatik geri döndürülmek üzere işaretlenir.
- Gerçekleşen veri geldikten sonra (ay sonu) plan, Nöbet Sayım çıktısıyla karşılaştırılır.

### 6.7 Güncel personel listesinin yüklenmesi
Personel her ay değişir (nakil, işe başlama, ayrılma, unvan değişikliği, görev yeri değişimi). Yükleme **sihirbazı** şöyle çalışır:

1. **Kaynak seç.** İki ASOS raporu yüklenebilir; sırası önemli değil, kişiler **TC ile birleştirilir**:
   | | **A: Başhekimlik/Komuta/İstasyon Personel Listesi Raporu (EKİP)** | **B: Personel Listesi Raporu** |
   |---|---|---|
   | Kapsam | 995 kişi, tümü Manisa kadrolu | 1.608 satır: 938 Manisa kadrolu + 670 dış kurum personeli |
   | Kimlik | TC, ad, soyad, sicil, telefon, UMKE | TC, ad, soyad |
   | Birim | Kadro birimi, geçici görev birimi, aktif birim | Atama (kadro) birimi, aktif görev yeri, aktif çalıştığı birim, geçici görev birimi |
   | Tarihler | Memuriyet başlangıç tarihi (4/B'lilerin çoğunda boş) | **Atama başlayış tarihi (4/B'lilerin tümünde dolu)**, geçici görev **başlangıç/bitiş**, geçici görev **nedeni** (ör. Personel İhtiyacı) |
   | İzin | Yıllık izin hakkı/kalan | **İzin tipi, başlangıç, bitiş, alınan gün** (yıllık, doğum öncesi/sonrası, hekim/heyet raporu, refakat) |
   | Muafiyet | — | **Nöbet muafiyeti** ve **süt izni (1,5 / 3 saat)** tarih aralıklarıyla |
   | Çalışma durumu | Geçici görevli, aile hekimliği, uzmanlık eğitimi, 663 KHK | — |
   **Kural çıkarımı:** B raporundaki plan ayını kapsayan izin/rapor/doğum, muafiyet ve süt izni otomatik hesaba girer. Uzun süreli doğum/rapor "durum" olur, kısa izinler tarihli izin olarak mesaiden düşer. B'de kadro ili olmayan **dış kurum personeli alınmaz** (sayısı gösterilir); İASB birimlerinde çalışıp kadrosu olmayanlar **kurum dışından gelen** olarak alınır. Kullanıcının elle yaptığı durum ve görevlendirme değişiklikleri ASOS yüklemesinde ezilmez.
   **Yalnızca bu iki rapor yüklenir** (Planlama Excel'i artık kullanılmaz). İki dosya birlikte seçilebilir veya sürüklenip bırakılabilir; yanlış/boş dosyada nedeni gösteren bir hata penceresi açılır.
2. **Sütun eşle.** Yukarıdaki ASOS başlıkları sabit tanınır; başka listelerde başlıklar otomatik eşlenir (Nöbet Sayım'daki başlık tanıma mantığı); eşleme kaydedilir, sonraki ay sorulmaz.
3. **Doğrula.** TCKN algoritması ve 11 hane; yinelenen TC; boş zorunlu alan; tanınmayan unvan (unvan → sınıf eşleme tablosu: ATT, SRC ATT, 4/B ATT, sağlık memuru, AABT → memur; doktor, DHY doktor, tabip → doktor; sürekli işçi, 4/D → işçi; tanınmayanlar için eşleme sorulur); tanınmayan birim adı.
4. **Farkı önizle.** Mevcut kayıtla karşılaştırılır ve dört grup gösterilir: **yeni** (listeye eklenecek), **değişen** (birim, unvan, istihdam; eski → yeni), **listede olmayan** (ayrılmış olabilir; silinmez, "pasif" işaretlenir ve onay istenir), **aynı**. Nakil ve unvan değişikliği ayrıca vurgulanır.
5. **Onayla ve uygula.** Plan ayına etkisi gösterilir (hangi istasyonların dengesi değişiyor). Tüm değişiklikler günlüğe yazılır. Uygulanan yükleme geri alınabilir (yükleme öncesi anlık yedek).
6. **Kişi bir kez tanımlanır** (anahtar TCKN; yoksa ad-soyad). Geçici görevlendirme, izin, tahmini nöbet kişiye bağlıdır; listede birim değişse bile geçmiş korunur.
7. **İlk kurulum:** Elinizdeki 2026 Ağustos planlama Excel'i bir kez içe aktarılır (istasyon sayfaları → birim, satırlar → personel, durum/izin/geçici görev/yolluk → aylık kayıt, KKM/Başhekimlik/Kurum dışı → ilgili birim).
8. **Modül modunda** personel, ana uygulamadan adaptör ile gelebilir; Excel yükleme yedek yöntem olarak kalır.

Kişisel veri yüklemesi yalnızca yerel tarayıcıda ve şifreli arşivde işlenir; GitHub'a ve herhangi bir sunucuya gönderilmez.

### 6.8 Aylık rotasyon (her istasyondan ayda bir kişi)
Kural: **bir istasyondan her ay bir kişi çıkar; sırayla gider, ancak kişi isterse birkaç ay üst üste çıkabilir.**
- **Kota:** varsayılan 1. İstasyonun **mesaisi dolmuyorsa** (kapasite ihtiyacı aşıyorsa) kota, fazlalığın kişi karşılığı kadar artar (**2-3**, en çok 3). Kota istasyon bazında elle değiştirilebilir; kutu boşsa otomatiktir.
- **Sıra:** önce **"gitmek istiyor"** diyenler; sonra **en uzun süredir çıkmayan**; eşitlikte **kıdemli en son** (atama başlayış tarihi daha eski olan sonra gider); sonra istasyonun elle sıralaması ve ad.
- **Kapsam:** doktor ve işçiler dahildir, kurallar değişmez (4/B 4 yıl, muafiyet, izin vb.).
- **Hedef istasyon:** personel ihtiyacı olan istasyonlar arasından **önce aynı ilçe, sonra yakından uzağa** (ilçe merkezlerine göre kuş uçuşu mesafe); eşitlikte ihtiyacı fazla olan. Öneri tablosunda uzaklık gösterilir.
- **Doktor kısıtı:** doktor yalnızca **doktorlu (A1 tipi) istasyonlara ve Komuta Kontrol Merkezi'ne** görevlendirilebilir; A2 ekiplere ve Başhekimlik'e gidemez. Kural hem öneride hem elle görevlendirmede uygulanır. İstasyon tipi (A1/A2) ASOS Personel Listesi Raporu'ndan alınır; yoksa istasyonda doktor olması esas alınır.
- **Birkaç ay üst üste:** dışarıdaki kişi için **"devam etsin"** seçilirse kota onunla dolar; sonraki aya kopyalanırken görevi bir ay uzatılır. "Dönsün" olanlar dönüşe işaretlenir.
- **Kaynak seçimi:** öneriler varsayılan olarak her istasyondan kota kadar çıkar; "yalnızca mesaisi dolmayan istasyonlar" seçeneğiyle açık veren istasyonlardan çıkış önerilmez.
- Görevlendirmeler plan ayını kapsar, gerekçe "Personel İhtiyacı" yazılır. KKM/Başhekimlik'teki uzun süreli görevler rotasyon kotasına sayılmaz.

### 6.9 Otomatik hesap
**Planlanan nöbet her değişiklikte otomatik yeniden hesaplanır** (izin, durum, görevlendirme, özel gün, personel yükleme, ay kopyalama, ayar değişikliği). **Elle girilen planlanan değer otomatik kilitlenir** ve hesapta değişmez; kilit açılınca yeniden hesaplanır. Otomatik hesap Ayarlar'dan kapatılabilir.

### 6.10 Kapasite, plan farkı ve Ekip OF
- **Etkin kapasite:** doktor yalnızca ekip şefi yuvasını (ay günü kadar), işçi yalnızca sürücü yuvasını (ay günü kadar) doldurabildiği için bu iki grubun fazlası kapasiteye sayılmaz.
- **Plan farkı:** planlanan toplam ile olması gereken (ihtiyaç ve azami kapasiteden küçüğü) arasındaki fark; yalnızca kilitli değerler gibi sapmalar varsa görünür. "Personel ihtiyacı" ise azami nöbetle bile dolmayan kısımdır.
- **Başka istasyona görevli kişi:** planlanan nöbeti hedef istasyonda hesaplanır; eski istasyonun hesabı bu değeri silmez.
- **Birim tanıma:** yalnızca "Acil Sağlık Hizmetleri İstasyonu / ASHİ" adlı birimler istasyon sayılır; aile hekimliği birimi, hastane ve sağlık müdürlüğü geçici görev yeri olarak kalır (ör. "TURGUTLU 16 NOLU AİLE HEKİMLİĞİ BİRİMİ" istasyon değildir).
- **Ekip OF (kapalı ekip):** istasyon sayfasından işaretlenir. İhtiyaç 0 olur, planlanan nöbet hesaplanmaz, kapalı ekibe görevlendirme yapılamaz; personeli rotasyonda tamamen dağıtılabilir olur. Pano, PNG ve Excel'de "EKİP OF" etiketi görünür.
- **Tema:** varsayılan açık; koyu ve sistem teması üst çubuktan seçilir.

### 6.11 Yuvalar, kadro tipi ve yuva yetenekleri
Her istasyonda üç yuva vardır: **ekip şefi (ES)**, **yardımcı sağlık personeli (YSP)**, **sürücü**; her biri ay günü kadar nöbet (Kasım: 30). Kim hangi yuvayı doldurabilir:
| Grup | Yuvalar | Not |
|---|---|---|
| **Doktor** | ES | Kendi içinde hesaplanır; fazlası başka yuvayı doldurmaz, açığını AABT kapatır. |
| **İşçi** | sürücü | Kendi içinde hesaplanır; 12 saatlik nöbet, hedefin üstü yok. |
| **AABT** (ASOS'ta *Sağlık Teknikeri*) | ES + YSP + sürücü | Her yuvaya girer. Ekip şefi nöbetlerini doktor ve AABT tutar. |
| **ATT** (ASOS'ta *Sağlık Memuru / Sağlık Teknisyeni*; Excel'de ATT / SRC ATT) | YSP + sürücü | **Ekip şefi yuvasına hiçbir koşulda girmez.** Sürücü olan ATT YSP'de de çalışır; nöbet kayıtlarında yalnızca YSP olarak çalışıyorsa yalnız YSP. |

**Doldurma sırası:** doktor (ES) → işçi (sürücü) → **AABT** (önce ES, sonra yalnızca AABT'nin girebildiği yuvalar, en son YSP) → ATT (kalan yuvalar). Böylece **AABT'nin hedef nöbetleri tam kullanılır ve fazlalık ATT'de görünür**. ES yuvası AABT hedefiyle dolmuyorsa AABT'lere azami sınıra kadar ek nöbet (ör. +1) yazılır; ATT ES'yi kapatmaz.

**Fazlalık ve rotasyon:** fazlalık ATT grubundaysa (ör. "ATT sürücü + YSP: 4 nöbet fazla") bir ATT mesaisini bu istasyonda tamamlayamıyordur; **rotasyonda dışarı çıkacak kişi o gruptan (ATT)** seçilir, AABT çıkarılmaz. Fazlalık yoksa sıra ATT → AABT → doktor/işçi olur.

**Kadro tipi eşleşmesi** planlama Excel'i ile ASOS listesi karşılaştırılarak çıkarıldı ve doğrulandı: AABT = *Sağlık Teknikeri*; ATT / SRC ATT = *Sağlık Memuru* veya *Sağlık Teknisyeni*. Unvan metninde açıkça AABT / ATT yazıyorsa o esas alınır.

**Sürücülük nasıl anlaşılır (ATT):** Tüm ATT'ler sürücü değildir; sürücülük **nöbet listelerinden teyit edilir.** "Nöbet Listesi / Nöbet İçi Hareket Raporu" yüklenince her kişinin ekip şefi, YSP ve sürücü nöbet saatleri **aya göre** saklanır (son 6 ay birlikte değerlendirilir; aynı ay tekrar yüklenirse o ayın verisi yenilenir, çift sayılmaz). Sürücü payı eşiğin (varsayılan %15) üstündeyse **sürücü + YSP**, altındaysa **sürücü değil (yalnız YSP)**. **Nöbet kaydı olmayan ATT "doğrulanmadı" sayılır ve sürücü kabul edilmez** (yalnız YSP). Pano'da doğrulanmayan ATT sayısı uyarı olarak gösterilir, Personel sayfasından süzülüp listelenebilir; istasyon sayfasında rol elle değiştirilebilir (Yalnız YSP / Sürücü + YSP). AABT için sürücülük kontrolü gerekmez (her yuvaya girer).

**Personel önerisi** kişinin yeteneklerine uyan yuvada açığı olan istasyona yapılır (sürücü açığına işçi / ATT sürücü, ES açığına AABT veya doktor, YSP açığına ATT / AABT). İstasyon sayfasındaki "Yuva dengesi" kartı her yuvanın dolumunu, katkı veren grupları, açığı ve fazlaları gösterir.

## 7. Ekranlar

1. **Ay seç**: yeni ay (önceki aydan kopyala: personel, kadro, tekrar eden görevlendirme), arşivden aç, ay kilitleme.
2. **Pano**: istasyon kartları (personel sayısı, izinli, geçici görevde/görevli, tahmini nöbet / ihtiyaç, uyarı sayısı). Eksik ve fazla istasyonlar üstte.
3. **İstasyon sayfası**: Excel'deki tablonun bire bir karşılığı (doktor / memur / işçi grupları, renk kodları, açılır durum listesi). Satır sürükle-bırak, tahmini nöbet otomatik, toplam çubuğu "93 / 93".
4. **Görevlendirme**: iki kolonlu ekran (kaynak ↔ hedef), öneri listesi, yolluk ve gerekçe seçimi, toplu görevlendirme.
5. **KKM ve Başhekimlik**: birim/görev (teknik birim, depo, eğitim, ASOS, kalite, mali işler...), nöbet sayıları, görevlendirmeli kişiler.
6. **Kurum dışı**: giden ve gelen personel, süre takibi.
7. **Analık ve süt izni**: tarih alanlarından otomatik süre/bitiş, yaklaşan bitişler için hatırlatma, süt izninin kadro saatine etkisi.
8. **İstatistik**: elle yazılan sayıların yerini alır (izin türüne göre, görevlendirme, yolluklu/yolluksuz, gebe/analık, toplam personel, KKM/Başhekimlik sayıları). Her sayı tıklanınca kişi listesine iner.
9. **Kontrol**: tüm uyarılar tek listede (93 dengesi, çakışma, izinli görevlendirme, süresi bitmiş görev, eksik veri).
10. **Çıktı**: istasyon görüntüsü, istasyon Excel'i, toplu Excel (bugünkü dosya biçiminde), PDF, yolluk listesi, istatistik raporu.
11. **Plan ↔ gerçekleşen**: ay sonunda ASOS nöbet raporu (Nöbet Sayım çıktısı) yüklenir; kişi başına tahmini nöbet ile fiili nöbet, istasyon başına ihtiyaç ile fiili doluluk karşılaştırılır.
12. **Personel yükleme** (§6.7): kaynak seç, sütun eşle, doğrula, fark önizle, onayla; yükleme geçmişi ve geri alma.
13. **Özel günler ve idari izin** (§6.5): resmi tatil, arife, yarım gün, toplu ve kişisel idari izin.
14. **Kullanıcılar ve ayarlar**: roller, parola, durum listesi, renk kodları, kadro saati ve yuvarlama kuralı, ortak arşiv, güncelleme, modül ayarları.

## 8. Çıktılar

| Çıktı | İçerik |
|---|---|
| İstasyon görüntüsü (PNG/PDF) | Dağıtılan ekran görüntüsünün aynısı: istasyon başlığı, ad soyad, ünvan, g.görev durumu, izin gün/tür, geçici görev tarihleri, yolluk; renkli satırlar. Tahmini nöbet sütunu seçimli (görüntüde yok) |
| İstasyon Excel'i | Aynı tablo, formüllü toplamlarla |
| Toplu Excel | Bugünkü dosyanın yapısı (istasyon sayfaları, KKM, Başhekimlik, Kurum Dışı, İstatistik); `#REF!` içermez |
| Yolluk listesi | Yolluklu / yolluksuz görevlendirmeler, kaynak ve hedef birim |
| Plan karşılaştırma raporu | Plan ↔ gerçekleşen |

## 9. Yol haritası

**Durum:** MVP v01.00 yazıldı ve gerçek ASOS listeleri ile denendi: iki ASOS raporu, planlama Excel'i, istasyon sayfası, mesai/hedef nöbet, 93 dengesi, özel gün, görevlendirme (4/B denetimi), aylık rotasyon, ay kopyalama, roller, ay kilidi, değişiklik günlüğü, PNG/Excel çıktı, JSON yedek. Henüz yok: şifreli Drive ortak arşivi, parola ile rol doğrulama, İzin/Rapor Excel'inin ayrıca yüklenmesi.

| Aşama | Kapsam |
|---|---|
| **MVP (v01.00)** | Modül sözleşmesi (mount/adaptör), çekirdek paket, personel yükleme sihirbazı, özel gün/idari izin, mesai ve hedef nöbet hesabı (§6.2), Excel'i içe aktar (istasyon sayfaları, KKM, Başhekimlik, kurum dışı, Personel Bilgileri), istasyon sayfası, durum listesi, renk kodları, 93 dengesi, istatistik otomatiği, istasyon görüntüsü/Excel çıktısı, yerel kayıt |
| v01.x | Görevlendirme ekranı (iki taraflı otomatik), yolluk, analık/süt izni takibi, kontrol listesi |
| v02.00 | Tahmini nöbet otomatik hesabı, öneri motoru, işçi 12 saat / memur 24 saat dağıtımı |
| v02.x | Ekip kullanımı: roller, ortak Drive arşivi, değişiklik günlüğü, ay kilidi, onay akışı |
| v03.00 | Plan ↔ gerçekleşen (Nöbet Sayım entegrasyonu), ortak çekirdek paket; gerekirse sunucu modeli |

## 10. Güvenlik ve gizlilik

- TC, ad, soyad, telefon ve sağlık durumu (gebelik, rapor, analık) özel/kişisel veridir. Yerelde ve arşivde şifreli saklanır; kimlik tablosu ayrı parolayla şifrelenir.
- Depoya Excel, personel listesi, parola veya erişim anahtarı yüklenmez.
- Çıktılarda yalnızca ihtiyaç duyulan alanlar yer alır; sağlık ayrıntısı olmayan "durum etiketi" kullanılır, rol bazında kapatılabilir.
- Her değişiklik kullanıcı ve zaman damgasıyla günlüğe yazılır. Kilitlenen ay salt okunur olur.

## 11. Netleşenler ve kalan noktalar

Netleşenler: formüller ve yuvarlama, memur 12 saat, doktor yalnızca ekip şefi, istasyon sorumluları uygulamayı görmez, HTML ile devam, iki ASOS raporu, 4/B (atama başlayış tarihi, dolum günü uygun), rotasyon kuralları (kota 1/otomatik 2-3, sıra, mesafe önceliği, doktor kısıtı, doktor ve işçi dahil), KKM/Başhekimlik görevleri rotasyon dışı, tahmini nöbet çıktıda görünür, her değişiklikte otomatik hesap.

Kalanlar:
1. **Kota otomatiği:** fazlalık / istasyondaki ortalama hedef nöbet ≈ kişi sayısı (1-3). Başka bir ölçüt (ör. mesaisini tamamlayamayan kişi sayısı) istenirse değiştirilir.
2. **Mesafe:** ilçe merkezleri arası kuş uçuşu mesafe kullanılıyor (ilçe koordinatları yaklaşık). Gerçek yol süresi veya sizin yakınlık sıralamanız varsa tablo olarak verilebilir.
3. **Doktor ve KKM:** doktor için ihtiyaç hesaplanan A1 istasyon yoksa öneri KKM'ye yöneliyor (KKM'nin doktor ihtiyacı hesaplanmıyor).
4. **Kullanıcı girişi ve Drive:** roller arayüzden seçiliyor; ekip ortak kullanıma geçerken parola ve şifreli Drive arşivi eklenecek. Ekip kaç kişi, aynı anda düzenleme olacak mı?

## Modül 1 / Modül 2 (v01.00)
- **Modül 1**: personel planlama + **Arşiv** (aylık istasyon özeti: ihtiyaç, planlanan, çıkan/gelen personel ve branşı, fazla nöbet) + **Arşiv istatistikleri** (seçilen aylar/istasyon; çıkan personel kaç ay, gelen branş matrisi, fazla nöbet kişileri; Excel).
- **Modül 2** (istasyon sorumluları yalnız bunu görür): İstek takvimi (kişi×gün, istenmeyen gün + izin aralığı) → Otomatik nöbet listesi (kurallar: 24 sa. nöbetler arası ≥1 gün boş, iki nöbet arası ≤5 gün, sürücüye gün aşırı 3 nöbet yok, işçiye art arda 3 gece yok, yıllık izin öncesi 3 gün boşluk) → Denetim ve öneriler (tek tıkla uygula) → Paket (TC/sağlık içermez) ve Excel çıktısı.
- Nöbet listeleri ASOS'a girilir; ASOS "Nöbet Listesi Raporu" Modül 1'de sürücülük tespitinde kullanılır. "Dönem İçi Hareket Raporu" için örnek dosya bekleniyor.
- Açık: iki nöbet arası kuralı ay sınırını aşmıyor (önceki ayın son nöbeti dikkate alınmıyor).
