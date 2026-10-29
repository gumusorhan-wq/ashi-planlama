/* HUSER ASHİ PLANLAMA — hesap çekirdeği (DOM'dan bağımsız; modül olarak da kullanılabilir) */
const APCore = (() => {
  const TR = s => String(s ?? '').toLocaleUpperCase('tr-TR').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const gunSayisi = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const MESAI = {memur: 8, isci: 7.5};
  const ARIFE_SAAT = 5;
  const YUVA_VARSAYILAN = 3;
  const ISCI_NOBET_DUSULEN = 11;      // 12 saat yazılır, sistemden 11 saat düşülür
  const NOBET_SAAT = 24;
  const ADIM = 0.5;

  // Resmî tatil çarpanı: 0 = tam tatil, 'A' = arife (yarım). Nöbet Sayım uygulamasındaki tabloyla aynıdır.
  const RESMI = (() => {
    const t = {}, add = (l, w) => l.forEach(d => { t[d] = w; });
    for (let y = 2024; y <= 2032; y++) {
      add([`${y}-01-01`, `${y}-04-23`, `${y}-05-01`, `${y}-05-19`, `${y}-07-15`, `${y}-08-30`, `${y}-10-29`], 0);
      add([`${y}-10-28`], 'A');
    }
    const dini = {
      2024: [['2024-04-10','2024-04-12','2024-04-09'], ['2024-06-16','2024-06-19','2024-06-15']],
      2025: [['2025-03-30','2025-04-01','2025-03-29'], ['2025-06-06','2025-06-09','2025-06-05']],
      2026: [['2026-03-20','2026-03-22','2026-03-19'], ['2026-05-27','2026-05-30','2026-05-26']],
      2027: [['2027-03-09','2027-03-11','2027-03-08'], ['2027-05-16','2027-05-19','2027-05-15']],
      2028: [['2028-02-26','2028-02-28','2028-02-25'], ['2028-05-05','2028-05-08','2028-05-04']],
      2029: [['2029-02-14','2029-02-16','2029-02-13'], ['2029-04-24','2029-04-27','2029-04-23']],
      2030: [['2030-02-04','2030-02-06','2030-02-03'], ['2030-04-13','2030-04-16','2030-04-12']]
    };
    Object.values(dini).forEach(p => p.forEach(([a, b, ar]) => {
      for (let ms = Date.parse(a + 'T00:00:00Z'); ms <= Date.parse(b + 'T00:00:00Z'); ms += 864e5) t[new Date(ms).toISOString().slice(0, 10)] = 0;
      t[ar] = 'A';
    }));
    return t;
  })();
  const OZEL_TUR = {bayram: 'Bayram günü', resmi: 'Resmî tatil', idari: 'İdari izin günü', yarim: 'Yarım gün (5 saat)'};

  // Bir günün kadro saati. ozel = { 'YYYY-AA-GG': {tur} }
  function gunSaat(dateIso, isci, ozel) {
    const normal = isci ? MESAI.isci : MESAI.memur;
    const dow = new Date(dateIso + 'T00:00:00Z').getUTCDay();   // 0 pazar … 6 cumartesi
    if (dow === 0) return 0;
    if (dow === 6 && !isci) return 0;
    const og = ozel && ozel[dateIso];
    if (og) return og.tur === 'yarim' ? Math.min(normal, ARIFE_SAAT) : 0;
    const w = RESMI[dateIso];
    if (w === 'A') return Math.min(normal, ARIFE_SAAT);
    return w === undefined ? normal : normal * w;
  }
  function ayMesai(y, m, isci, ozel) {
    let t = 0; for (let d = 1; d <= gunSayisi(y, m); d++) t += gunSaat(iso(y, m, d), isci, ozel);
    return Math.round(t * 100) / 100;
  }

  // Durum tablosu (Ayarlar'dan değiştirilebilir). nobetYok: nöbet tutmaz, mesaiYok: o ay mesai yükümlülüğü yok (izinli), disarida: başka birimde görevli.
  const DURUM_VARSAYILAN = {
    'GEÇİCİ GÖREVDE':      {renk: '#C0504D', nobetYok: true,  mesaiYok: true,  disarida: true},
    'GEÇİCİ GÖREVLİ':      {renk: '#9BBB59', nobetYok: false, mesaiYok: false, gelen: true},
    'DOĞUM ÖNCESİ':        {renk: '#B1A0C7', nobetYok: true,  mesaiYok: true},
    'DOĞUM SONRASI':       {renk: '#B1A0C7', nobetYok: true,  mesaiYok: true},
    'ANALIK HAKKI':        {renk: '#B1A0C7', nobetYok: true,  mesaiYok: false},
    'ANALIK MESAİ':        {renk: '#B1A0C7', nobetYok: true,  mesaiYok: false},
    'GEBE MESAİ':          {renk: '#B1A0C7', nobetYok: true,  mesaiYok: false},
    'RİSKLİ GEBELİK':      {renk: '#B1A0C7', nobetYok: true,  mesaiYok: true},
    'RAPORLU':             {renk: '#A6A6A6', nobetYok: true,  mesaiYok: true},
    'HEYET RAPORLU':       {renk: '#A6A6A6', nobetYok: true,  mesaiYok: true},
    'ÜCRETSİZ İZİN':       {renk: '#D9D9D9', nobetYok: true,  mesaiYok: true},
    'ASKERLİK İZNİ':       {renk: '#D9D9D9', nobetYok: true,  mesaiYok: true},
    'YARI ZAMANLI':        {renk: '#FCD5B4', nobetYok: true,  mesaiYok: false},
    'SAĞLIK MAZERETİ MESAİ': {renk: '#FCD5B4', nobetYok: true, mesaiYok: false},
    'MESAİ USULÜ':         {renk: '#FCD5B4', nobetYok: true,  mesaiYok: false},
    'NÖBET USULÜ':         {renk: null,      nobetYok: false, mesaiYok: false},
    'AİLE HEKİMLİĞİNDE':   {renk: '#D9D9D9', nobetYok: true,  mesaiYok: true,  disarida: true, disKurum: true},
    'NÖBET MUAFİYETİ':     {renk: '#FCD5B4', nobetYok: true,  mesaiYok: false},
    'UZMANLIK EĞİTİMİ':    {renk: '#D9D9D9', nobetYok: true,  mesaiYok: true},
    'PASİF':               {renk: '#EEEEEE', nobetYok: true,  mesaiYok: true,  pasif: true}
  };
  // Excel'deki serbest yazılmış durum metnini listedeki anahtara çevirir
  function durumAnahtar(txt) {
    const t = TR(txt); if (!t) return '';
    const kural = [
      [/GECICI GOREVDE|G\.?GOREVDE/, 'GEÇİCİ GÖREVDE'], [/GECICI GOREVLI/, 'GEÇİCİ GÖREVLİ'],
      [/DOGUM ONCESI/, 'DOĞUM ÖNCESİ'], [/DOGUM SONRASI|DOGUM/, 'DOĞUM SONRASI'],
      [/ANALIK.*MESAI|ANALIK MESAI/, 'ANALIK MESAİ'], [/ANALIK/, 'ANALIK HAKKI'],
      [/RISKLI GEBE/, 'RİSKLİ GEBELİK'], [/GEBE/, 'GEBE MESAİ'],
      [/HEYET/, 'HEYET RAPORLU'], [/RAPOR/, 'RAPORLU'],
      [/AILE HEK/, 'AİLE HEKİMLİĞİNDE'], [/UZMANLIK/, 'UZMANLIK EĞİTİMİ'],
      [/UCRETSIZ/, 'ÜCRETSİZ İZİN'], [/ASKER/, 'ASKERLİK İZNİ'], [/YARI|YART/, 'YARI ZAMANLI'],
      [/SAGLIK MAZ.*MESAI|MAZERET.*MESAI|SAGLIK MAZ/, 'SAĞLIK MAZERETİ MESAİ'],
      [/NOBET MUAF/, 'NÖBET MUAFİYETİ'], [/MESAI USULU/, 'MESAİ USULÜ'], [/NOBET USULU/, 'NÖBET USULÜ']
    ];
    for (const [re, k] of kural) if (re.test(t)) return k;
    return '';
  }
  function sinifTespit(unvan) {
    const t = TR(unvan);
    if (!t) return '';
    if (/DOKTOR|TABIP|HEKIM/.test(t)) return 'doktor';
    if (/ISCI|4\/D|SOFOR|SURUCU/.test(t)) return 'isci';
    if (/^[\d.,\s]+$/.test(t) || t.startsWith('=')) return '';
    return 'memur';
  }

  // Kişinin ay mesaisi (saat). k: {sinif, durum, izin:[{gun, bas?, bit?}], sut}
  // ASOS'taki izin/görev bitiş tarihi dönüş gününü gösterir (nöbet 09:00'da biter): son izinli gün bir önceki gündür. Elle girilen tarihli izinlerde bitiş dahildir.
  function izinSon(iz) { if (!iz.asos || !iz.bit) return iz.bit; return new Date(Date.parse(iz.bit + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10); }
  function kisiMesai(k, y, m, ozel, durumlar) {
    const isci = k.sinif === 'isci', dt = durumlar[k.durum] || {};
    if (dt.mesaiYok) return 0;
    const tum = ayMesai(y, m, isci, ozel);
    let izinSaat = 0;
    const gunler = {};
    (k.izin || []).forEach(iz => {
      if (iz.bas && iz.bit) {
        for (let ms = Date.parse(iz.bas + 'T00:00:00Z'); ms <= Date.parse(izinSon(iz) + 'T00:00:00Z'); ms += 864e5) {
          const d = new Date(ms).toISOString().slice(0, 10);
          if (d.slice(0, 7) === `${y}-${pad(m)}`) gunler[d] = 1;
        }
      } else if (Number(iz.gun) > 0) izinSaat += Number(iz.gun) * (isci ? MESAI.isci : MESAI.memur);
    });
    Object.keys(gunler).forEach(d => { izinSaat += gunSaat(d, isci, ozel); });
    let mesai = Math.max(0, tum - izinSaat);
    if (k.sut) { // süt izni: çalışılan her gün için günlük saat düşülür
      const calisilan = Math.max(0, mesai) / (isci ? MESAI.isci : MESAI.memur);
      mesai = Math.max(0, mesai - calisilan * Number(k.sut));
    }
    return Math.round(mesai * 100) / 100;
  }
  // Hedef nöbet (24 saatlik eşdeğer). memur/doktor: mesai/24 yukarı 0,5 adım; işçi: mesai/11 aşağı tam 12 saatlik nöbet → ×0,5
  function hedefNobet(mesai, sinif, nobetYok, ayar) {
    if (nobetYok || !(mesai > 0)) return {adet: 0, birim: 0};
    const a = ayar || {};
    if (sinif === 'isci') {
      const n = Math.floor(mesai / (a.isciDusulen || ISCI_NOBET_DUSULEN) + 1e-9);
      return {adet: n, birim: n * ADIM, hamAdet: mesai / (a.isciDusulen || ISCI_NOBET_DUSULEN)};
    }
    const x = mesai / NOBET_SAAT;
    const u = Math.ceil(x / ADIM - 1e-9) * ADIM;
    return {adet: u, birim: u, hamAdet: x};
  }

  // En büyük kalan yöntemiyle havuzu 0,5 adımlarla ağırlıklara böler
  function dagit(havuz, agirliklar) {
    const n = agirliklar.length, out = new Array(n).fill(0);
    const top = agirliklar.reduce((a, b) => a + b, 0);
    let birim = Math.round(havuz / ADIM);
    if (!n || top <= 0 || birim <= 0) return out;
    const pay = agirliklar.map(w => birim * w / top);
    const taban = pay.map(Math.floor);
    let kalan = birim - taban.reduce((a, b) => a + b, 0);
    const sira = pay.map((p, i) => [p - Math.floor(p), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let i = 0; i < sira.length && kalan > 0; i++, kalan--) taban[sira[i][1]]++;
    return taban.map(u => u * ADIM);
  }

  // Hedefin üstüne azami sınıra kadar ek nöbet dağıtır: havuz hedef toplamından küçükse hedefe orantılı azaltır; büyükse herkese hedefi verip fazlayı (azami sınırı aşmadan) en az ek alana ekler
  function dagitSinirli(havuz, hedefler, azamiler) {
    const toplam = hedefler.reduce((a, b) => a + b, 0);
    if (havuz <= toplam + 1e-9) return dagit(havuz, hedefler);
    const out = hedefler.slice(); let kalan = Math.round((havuz - toplam) / ADIM);
    while (kalan > 0) {
      let en = -1;
      for (let i = 0; i < out.length; i++) {
        if (out[i] + ADIM > azamiler[i] + 1e-9) continue;
        if (en < 0 || (out[i] - hedefler[i]) < (out[en] - hedefler[en]) - 1e-9) en = i;
      }
      if (en < 0) break;
      out[en] += ADIM; kalan--;
    }
    return out;
  }

  // Bir istasyon için hesap. kisiler: o istasyonda çalışan (gelenler dahil, giden hariç) kayıtlar. 
  // Her kayıt için {mesai, hedef, nobetYok} üretir; ihtiyaç, kapasite ve öneri döner.
  function istasyonHesap(kisiler, y, m, ozel, durumlar, ayar, yuva) {
    const gun = gunSayisi(y, m), ihtiyac = (yuva == null ? YUVA_VARSAYILAN : yuva) * gun;
    const satir = kisiler.map(k => {
      const dt = durumlar[k.durum] || {};
      const mesai = kisiMesai(k, y, m, ozel, durumlar);
      const h = hedefNobet(mesai, k.sinif, !!dt.nobetYok || !!dt.disarida, ayar);
      return {k, mesai, hedef: h.birim, hedefAdet: h.adet, nobetYok: !!dt.nobetYok};
    });
    // Azami nöbet: memur/doktor tam ay hedefinin üstüne azamiMemur'a kadar (ör. Kasım: hedef 7, azami 8); izinli kişide hedef + aynı ek; işçi: hedef + isciEk × 0,5
    const a = ayar || {}, azamiMemur = a.azamiMemur || 0, tam = hedefNobet(ayMesai(y, m, false, ozel), 'memur', false).birim, ek = Math.max(0, azamiMemur - tam);
    satir.forEach(s => {
      s.azami = s.nobetYok || !(s.hedef > 0) ? 0 : (s.k.sinif === 'isci' ? s.hedef + (a.isciEk || 0) * ADIM : Math.min(Math.max(azamiMemur, s.hedef), s.hedef + ek));
    });
    // Yuva yetenekleri: doktor → ekip şefi; işçi → sürücü; AABT (sağlık teknikeri) → ekip şefi + YSP + sürücü; ATT (sağlık memuru / teknisyeni) → YSP + sürücü
    // (nöbet kayıtlarında ekip şefi olarak görev almışsa ekip şefi + YSP; yalnızca YSP olarak çalışıyorsa YSP).
    const esik = {sur: (a.surEsik == null ? 70 : a.surEsik) / 100, degil: (a.surDegilEsik == null ? 15 : a.surDegilEsik) / 100};
    satir.forEach(s => { s.kadroTip = kadroTip(s.k); s.rol = rolBelirle(s.k, esik); s.grup = grupBelirle(s.k, esik, a); });
    const gruplar = {dok: [], isci: [], ke: [], ka: [], ysp: [], sy: []};
    satir.forEach(s => { if (!s.nobetYok) gruplar[s.grup].push(s); });
    const D3 = ihtiyac / 3, dem = {es: D3, ysp: D3, sur: D3}, r2 = v => Math.round(v * 100) / 100, EPS = 1e-9;
    const topla = (f) => { const o = {}; GRUPLAR.forEach(g => { o[g] = gruplar[g].reduce((x, s) => x + s[f], 0); }); return o; };
    const supH = topla('hedef'), supA = topla('azami');
    const H = akis(supH, dem), A = akis(supA, dem);
    const toplam = o => Object.values(o).reduce((x, v) => x + v, 0), acikT = r => r2(r.es + r.ysp + r.sur);
    const kapasite = r2(toplam(supH)), azamiKap = r2(toplam(supA));
    const unmetH = acikT(H.rem), unmetA = acikT(A.rem), fazlaH = r2(toplam(H.fazla));
    // durum: fazla = yuvalar doluyor ama bazı kişiler mesailerini tamamlayamıyor; ihtiyac = azami nöbetle bile dolmuyor; fazlaMesai = ancak azami nöbete kadar yazılarak doluyor
    const durum = unmetH <= EPS ? (fazlaH > EPS ? 'fazla' : 'tam') : (unmetA <= EPS ? 'fazlaMesai' : 'ihtiyac');
    // Personel önerisi: hedef nöbetle tam mesai yapılınca kalan açık, yeni gelen kişinin mesaisini bu istasyonda tamamlamasına (tam ay hedefi) yetiyorsa görevlendirme önerilir.
    // Açık bir kişiyi doldurmaya yetmiyorsa istasyon fazla nöbetle kendi içinde döner (öneri yok); azamiyle de dolmuyorsa elle karar gerekir.
    // Mod 'fazla' (fazla mesaili): kişilere azami nöbete kadar fazla nöbet yazılacağı kabul edilir; personel yalnızca fazla nöbetle de kapanmayan açık bir kişiyi dolduruyorsa önerilir.
    // Mod verilmezse (ya da 'mesai'): açık, herkes yalnız hedef nöbetini tuttuğunda hesaplanır.
    const hedefAcik = unmetH, fazlaMod = a.mod === 'fazla', acikEf = fazlaMod ? unmetA : unmetH, ihtiyacKisi = tam > 0 ? Math.floor(acikEf / tam + EPS) : 0;
    const ihtiyacTur = hedefAcik <= EPS ? 'yok' : (fazlaMod && unmetA <= EPS) ? 'icerde' : ihtiyacKisi >= 1 ? 'oner' : unmetA <= EPS ? 'icerde' : 'elle';
    return {gun, ihtiyac, satir, gruplar, kapasite, azamiKap, fark: r2(fazlaH - unmetH), fazlaH, farkAzami: unmetA > EPS ? -unmetA : r2(azamiKap - ihtiyac), durum, tamHedef: tam, hedefAcik, acikEf: r2(acikEf), acikM: fazlaMod ? A.rem : H.rem, ihtiyacKisi, kalanAcik: r2(acikEf - ihtiyacKisi * tam), ihtiyacTur,
      slot: {dem, hedef: H, azami: A, supH, supA}, acik: H.rem};
  }
  // Grup yetenekleri ve yuva akışı. Nöbet branşları: es (ekip şefi), ysp (yardımcı sağlık personeli), sur (sürücü).
  // ATT hiçbir koşulda ekip şefi nöbet branşına girmez; ekip şefi nöbetlerini doktor ve AABT tutar.
  const GRUPLAR = ['dok', 'isci', 'ke', 'ka', 'ysp', 'sy'];
  const YETENEK = {dok: ['es'], isci: ['sur'], ke: ['es', 'ysp'], ka: ['es', 'sur', 'ysp'], ysp: ['ysp'], sy: ['sur', 'ysp']};   // sıra = doldurma önceliği
  const GRUP_AD = {dok: 'Doktor', isci: 'İşçi', ke: 'AABT (ekip şefi + YSP)', ka: 'AABT (sürücü dahil)', ysp: 'ATT (yalnız YSP)', sy: 'ATT (sürücü + YSP)'};
  // Önce doktor ve işçi, sonra AABT (önce ekip şefi, sonra ATT'nin giremediği yuvalar, en son YSP) nöbet branşları doldurur; ATT geri kalan nöbet branşları doldurur.
  // Böylece AABT'nin hedef nöbetleri tam kullanılır, fazlalık ATT'de görünür (bir ATT bir ay dışarı çıkabilir).
  function akis(sup, dem) {
    const rem = {...dem}, fill = {}, fazla = {};
    GRUPLAR.forEach(g => {
      let k = sup[g] || 0; fill[g] = {es: 0, ysp: 0, sur: 0};
      for (const s of YETENEK[g]) { if (k <= 1e-9) break; const u = Math.min(k, Math.max(0, rem[s])); fill[g][s] += u; rem[s] -= u; k -= u; }
      fazla[g] = Math.max(0, k);
    });
    ['es', 'ysp', 'sur'].forEach(s => { rem[s] = Math.round(rem[s] * 100) / 100; });
    return {fill, rem, fazla};
  }
  // Önerilen planlanan nöbet: önce hedef nöbetlerle yuvalar doldurulur (fazla gruplar orantılı azalır), açık kalırsa azami sınıra kadar ek nöbet yazılır
  function oneri(hesap, kilitli) {
    const {ihtiyac, gruplar: gr} = hesap, sonuc = new Map(), D3 = ihtiyac / 3;
    const ser = g => gr[g].filter(s => !kilitli || !kilitli.has(s.k.id));
    const kil = g => gr[g].filter(s => kilitli && kilitli.has(s.k.id)).reduce((x, s) => x + kilitli.get(s.k.id), 0);
    const top = (L, f) => L.reduce((x, s) => x + s[f], 0), kilitSup = {}, sup1 = {}, ek = {};
    GRUPLAR.forEach(g => { const L = ser(g); kilitSup[g] = kil(g); sup1[g] = top(L, 'hedef'); ek[g] = top(L, 'azami') - top(L, 'hedef'); });
    const f0 = akis(kilitSup, {es: D3, ysp: D3, sur: D3}), f1 = akis(sup1, f0.rem), f2 = akis(ek, f1.rem);
    GRUPLAR.forEach(g => {
      const L = ser(g), t = x => x.es + x.ysp + x.sur, total = t(f1.fill[g]) + t(f2.fill[g]);
      dagitSinirli(Math.max(0, total), L.map(s => s.hedef), L.map(s => s.azami)).forEach((v, i) => sonuc.set(L[i].k.id, v));
    });
    return sonuc;
  }
  // Kadro tipi: AABT (sağlık teknikeri) ve ATT (sağlık memuru / teknisyeni). Unvanda açıkça yazıyorsa o esas alınır.
  function kadroTip(k) {
    const u = TR((k.unvan || '') + ' ' + (k.kadroBrans || ''));
    if (/\bAABT\b|AMBULANS VE ACIL BAKIM/.test(u)) return 'AABT';
    if (/\bATT\b|ACIL TIP TEKNISYEN/.test(u)) return 'ATT';
    return /TEKNIKER/.test(u) ? 'AABT' : 'ATT';
  }
  function grupBelirle(k, esik, ayar) {
    if (k.sinif === 'doktor') return 'dok';
    if (k.sinif === 'isci') return 'isci';
    if (kadroTip(k) === 'AABT') return surucuDurumu(k, esik).tip === 'surucu' ? 'ka' : 'ke';    // AABT de her nöbet branşına girmez: sürücü nöbet branşı yalnızca nöbet listelerinde sürücü olarak nöbet tuttuğu doğrulananlara açılır
    return surucuDurumu(k, esik).tip === 'surucu' ? 'sy' : 'ysp';    // ATT: yalnızca nöbet listelerinde sürücü olarak nöbet tuttuğu doğrulanırsa sürücü + YSP; aksi halde yalnız YSP (ekip şefi olamaz)
  }
  // Nöbet rolü sınıflama: nöbet kayıtlarındaki ekip şefi / YSP / sürücü saatlerinden
  function rolSinifla(say, esik) {
    const e = say.es || 0, y = say.ysp || 0, s = say.sur || 0, t = e + y + s; if (!t) return '';
    const o = esik || {sur: 0.7, degil: 0.15}, pay = s / t;
    if (pay >= o.sur) return 'sur';
    if (pay <= o.degil) return e >= y ? 'es' : 'ysp';
    return 'karma';
  }
  // ATT'nin sürücülüğü nöbet listelerinden teyit edilir: sürücü payı eşiğin üstündeyse sürücü, altındaysa sürücü değil, kayıt yoksa doğrulanmadı (sürücü sayılmaz)
  function surucuDurumu(k, esik) {
    const o = esik || {degil: 0.15};
    if (k.rolManuel) return {tip: k.rolManuel === 'sur' || k.rolManuel === 'karma' ? 'surucu' : 'degil', kaynak: 'manuel'};
    const s = k.rolSay, t = s ? (s.es || 0) + (s.ysp || 0) + (s.sur || 0) : 0;
    if (!t) return {tip: 'dogrulanmadi', kaynak: 'yok'};
    const pay = (s.sur || 0) / t;
    return {tip: pay > o.degil ? 'surucu' : 'degil', kaynak: 'kayit', pay};
  }
  // Birden çok ayın nöbet kaydını (ay → {es, ysp, sur}) toplar; son 6 ay
  function rolToplam(ayMap) {
    const ks = Object.keys(ayMap || {}).sort().slice(-6), o = {es: 0, ysp: 0, sur: 0};
    ks.forEach(k => { o.es += ayMap[k].es || 0; o.ysp += ayMap[k].ysp || 0; o.sur += ayMap[k].sur || 0; });
    return o;
  }
  function rolBelirle(k, esik) {
    if (k.sinif === 'doktor') return 'es';
    if (k.sinif === 'isci') return 'sur';
    if (k.rolManuel) return k.rolManuel;
    return (k.rolSay && rolSinifla(k.rolSay, esik)) || 'karma';
  }

  // İstasyon adı anahtarı: "ŞEHZADELER 8 NOLU ASHİ" → "SEHZADELER 8"
  function istAnahtar(metin) {
    const t = TR(metin).replace(/\bNOLU\b|\bNO\b|\bASHI\b|\bACIL SAGLIK HIZMETLERI ISTASYONU\b|\bISTASYONU\b/g, ' ').replace(/\bMANISA\b/g, ' ').replace(/\s+/g, ' ').trim();
    const mm = t.match(/([A-Z]+)\s+(\d+)/);
    return mm ? `${mm[1]} ${mm[2]}` : '';
  }


  // Tarih ayrıştırma: Excel seri numarası, Date, "GG.AA.YYYY", "YYYY-AA-GG" → "YYYY-AA-GG"
  function tarihIso(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return isNaN(v) ? '' : iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
    if (typeof v === 'number') { if (v < 1000) return ''; const d = new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5); return d.toISOString().slice(0, 10); }
    const t = String(v).trim(); let mm;
    if ((mm = t.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/))) return iso(+mm[3], +mm[2], +mm[1]);
    if ((mm = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return iso(+mm[1], +mm[2], +mm[3]);
    return '';
  }
  const dortB = (...alanlar) => alanlar.some(a => /(^|[^0-9])4\s*\/?\s*B(?![A-Za-z])/i.test(String(a || '')));
  // 4/B personel: başlangıçtan 4 yıl dolmadan başka istasyona görevlendirilemez
  function dortYilDurum(memBasIso, refIso) {
    if (!memBasIso) return {bilinmiyor: true, uygun: true};
    const b = new Date(memBasIso + 'T00:00:00Z');
    const dolum = iso(b.getUTCFullYear() + 4, b.getUTCMonth() + 1, b.getUTCDate());
    const kalanGun = Math.ceil((Date.parse(dolum + 'T00:00:00Z') - Date.parse(refIso + 'T00:00:00Z')) / 864e5);
    return {dolum, uygun: kalanGun <= 0, kalanGun, yakinda: kalanGun > 0 && kalanGun <= 92};
  }
  function gorevlendirmeEngeli(k, refIso) {
    if (!k.dortB) return '';
    const d = dortYilDurum(k.memBas, refIso);
    if (d.bilinmiyor) return '';
    return d.uygun ? '' : `4/B personel 4 yılını doldurmadan görevlendirilemez (dolum: ${d.dolum.split('-').reverse().join('.')})`;
  }

  // YYYY-AA anahtarları: iki tarih arasındaki aylar (sinirIso'yu aşmaz)
  function aylariListele(basIso, bitIso, sinirIso) {
    if (!basIso) return [];
    let bit = bitIso && bitIso < sinirIso ? bitIso : sinirIso; if (bit < basIso) return [];
    const out = []; let y = +basIso.slice(0, 4), m = +basIso.slice(5, 7); const yb = +bit.slice(0, 4), mb = +bit.slice(5, 7);
    while (y < yb || (y === yb && m <= mb)) { out.push(`${y}-${pad(m)}`); if (++m > 12) { m = 1; y++; } }
    return out;
  }
  // ASOS muafiyet metni: "01.07.2026 00:00 / 01.01.2027 00:01 : Süt İzni 3 Saat, 12.02.2026 ... : Nöbet Muafiyeti"
  function muafiyetCoz(metin) {
    const out = [], re = /(\d{2}\.\d{2}\.\d{4})[^/]*\/\s*(\d{2}\.\d{2}\.\d{4})[^:]*:\s*(.+?)(?=,\s*\d{2}\.\d{2}\.\d{4}|$)/g;
    let m; const t = String(metin || '');
    while ((m = re.exec(t))) {
      const tur = TR(m[3]), bas = tarihIso(m[1]), bit = tarihIso(m[2]);
      if (/NOBET MUAF/.test(tur)) out.push({tur: 'nobet', bas, bit});
      else if (/SUT IZN/.test(tur)) { const s = tur.match(/(\d+(?:[.,]\d+)?)\s*SAAT/); out.push({tur: 'sut', bas, bit, saat: s ? parseFloat(s[1].replace(',', '.')) : 0}); }
      else out.push({tur: 'diger', bas, bit, ad: m[3].trim()});
    }
    return out;
  }

  // Manisa ilçeleri (yaklaşık merkez koordinatları): hedef istasyon önceliğinde yakınlık sıralaması için
  const ILCE_KONUM = {'AHMETLI': [38.5167, 27.9333], 'AKHISAR': [38.9231, 27.8444], 'ALASEHIR': [38.35, 28.5167], 'DEMIRCI': [39.0467, 28.6597], 'GOLMARMARA': [38.7139, 27.9061],
    'GORDES': [38.9333, 28.2833], 'KIRKAGAC': [39.1064, 27.6683], 'KOPRUBASI': [38.7517, 28.4003], 'KULA': [38.5469, 28.6481], 'SALIHLI': [38.4833, 28.1333], 'SARIGOL': [38.2333, 28.6931],
    'SARUHANLI': [38.7319, 27.5703], 'SELENDI': [38.75, 28.8667], 'SOMA': [39.1869, 27.6097], 'TURGUTLU': [38.5, 27.7], 'SEHZADELER': [38.6191, 27.4289], 'YUNUSEMRE': [38.6167, 27.4]};
  const ilceAdi = birimAd => TR(birimAd).replace(/\s+\d+.*$/, '').replace(/\s+(KOMUTA|BASHEKIM).*$/, '').trim();
  function mesafeKm(a, b) {
    const A = ILCE_KONUM[TR(a)], B = ILCE_KONUM[TR(b)];
    if (TR(a) === TR(b)) return 0;
    if (!A || !B) return 9999;
    const r = x => x * Math.PI / 180, dLat = r(B[0] - A[0]), dLon = r(B[1] - A[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(A[0])) * Math.cos(r(B[0])) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)));
  }

  const api = {izinSon, surucuDurumu, rolToplam, rolSinifla, rolBelirle, kadroTip, grupBelirle, akis, YETENEK, GRUP_AD, GRUPLAR, ilceAdi, mesafeKm, ILCE_KONUM, aylariListele, muafiyetCoz, tarihIso, dortB, dortYilDurum, gorevlendirmeEngeli, TR, iso, pad, gunSayisi, gunSaat, ayMesai, kisiMesai, hedefNobet, dagit, dagitSinirli, istasyonHesap, oneri, istAnahtar,
    durumAnahtar, sinifTespit, DURUM_VARSAYILAN, OZEL_TUR, RESMI, MESAI, YUVA_VARSAYILAN, ADIM};
  return api;
})();
if (typeof module !== 'undefined') module.exports = APCore;
