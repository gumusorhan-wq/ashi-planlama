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
    'YARI ZAMANLI':        {renk: '#FCD5B4', nobetYok: false, mesaiYok: false, mesaiOran: 0.5, fazlaYok: true},      // istasyonda kalan yarı zamanlı mesaisinin yarısı kadar nöbet tutar
    'SAĞLIK MAZERETİ MESAİ': {renk: '#FCD5B4', nobetYok: true, mesaiYok: false},
    'MESAİ USULÜ':         {renk: '#FCD5B4', nobetYok: true,  mesaiYok: false},
    'NÖBET USULÜ':         {renk: null,      nobetYok: false, mesaiYok: false},
    'AİLE HEKİMLİĞİNDE':   {renk: '#D9D9D9', nobetYok: true,  mesaiYok: true,  disarida: true, disKurum: true},
    'SÖZLEŞMELİ ÇALIŞIYOR': {renk: '#D9D9D9', nobetYok: true, mesaiYok: true, disarida: true, disKurum: true},      // 663 sayılı KHK vb. sözleşmeyle başka kurumda: nöbet tutmaz
    'NÖBET MUAFİYETİ':     {renk: '#FCD5B4', nobetYok: true,  mesaiYok: false},
    // Sürüm 13.57: gündüz 8 saat (09:00–17:00) çalışan muafiyetli; saatleri nöbetin 8 saatlik parçası sayılır (hedef = mesai / 24). Elle seçilir.
    'NÖBET MUAFİYETİ MESAİ': {renk: '#FCD5B4', nobetYok: true, mesaiYok: false, gunduz8: true},
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
      [/AILE HEK/, 'AİLE HEKİMLİĞİNDE'], [/UZMANLIK/, 'UZMANLIK EĞİTİMİ'], [/SOZLESMELI CALIS|663 SAYILI/, 'SÖZLEŞMELİ ÇALIŞIYOR'],
      [/UCRETSIZ/, 'ÜCRETSİZ İZİN'], [/ASKER/, 'ASKERLİK İZNİ'], [/YARI|YART/, 'YARI ZAMANLI'],
      [/SAGLIK MAZ.*MESAI|MAZERET.*MESAI|SAGLIK MAZ/, 'SAĞLIK MAZERETİ MESAİ'],
      [/NOBET MUAF.*MESAI/, 'NÖBET MUAFİYETİ MESAİ'], [/NOBET MUAF/, 'NÖBET MUAFİYETİ'], [/MESAI USULU/, 'MESAİ USULÜ'], [/NOBET USULU/, 'NÖBET USULÜ']
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
      } else if (Number(iz.gun) > 0) {
        // Sürüm 13.56 (09.11.2026): tarihsiz izin takvim günüdür; her 7 günde bir hafta sonu sayılır (5 → 5, 10 → 8, 15 → 11 iş günü). İşçi: yalnız pazar düşülmez (10 → 9)
        const g = Number(iz.gun), hs = Math.floor(g / 7);
        izinSaat += Math.max(0, g - (isci ? hs : 2 * hs)) * (isci ? MESAI.isci : MESAI.memur);
      }
    });
    Object.keys(gunler).forEach(d => { izinSaat += gunSaat(d, isci, ozel); });
    let mesai = Math.max(0, tum - izinSaat);
    // Yarı zamanlı çalışma: aylık mesainin yarısı (izinler düşüldükten sonra); durum ayarında mesaiOran ile değiştirilebilir
    const oran = dt.mesaiOran != null ? Number(dt.mesaiOran) : k.durum === 'YARI ZAMANLI' ? 0.5 : 1;
    if (oran >= 0 && oran < 1) mesai *= oran;
    if (k.sut) { // süt izni: çalışılan her gün için günlük saat düşülür
      const calisilan = Math.max(0, mesai) / (isci ? MESAI.isci : MESAI.memur);
      mesai = Math.max(0, mesai - calisilan * Number(k.sut));
    }
    return Math.round(mesai * 100) / 100;
  }
  // Hedef nöbet (24 saatlik eşdeğer). memur/doktor: mesai/24 tam oran (ayar.hedefYuvarla: yukarı 0,5 adım); işçi: mesai/11 aşağı tam 12 saatlik nöbet → ×0,5
  function hedefNobet(mesai, sinif, nobetYok, ayar) {
    if (nobetYok || !(mesai > 0)) return {adet: 0, birim: 0};
    const a = ayar || {};
    if (sinif === 'isci') {
      const n = Math.floor(mesai / (a.isciDusulen || ISCI_NOBET_DUSULEN) + 1e-9);
      return {adet: n, birim: n * ADIM, hamAdet: mesai / (a.isciDusulen || ISCI_NOBET_DUSULEN)};
    }
    const x = mesai / NOBET_SAAT;      // memur/doktor: tam oran (ör. 160 saat = 6,67 nöbet); ayar.hedefYuvarla ile eski yöntem (0,5 adıma yukarı) açılır
    const u = a.hedefYuvarla ? Math.ceil(x / ADIM - 1e-9) * ADIM : x;
    return {adet: u, birim: u, hamAdet: x};
  }

  // En büyük kalan yöntemiyle havuzu 0,5 adımlarla ağırlıklara böler
  function dagit(havuz, agirliklar, adim) {
    adim = adim || ADIM;
    const n = agirliklar.length, out = new Array(n).fill(0);
    const top = agirliklar.reduce((a, b) => a + b, 0);
    let birim = Math.round(havuz / adim);
    if (!n || top <= 0 || birim <= 0) return out;
    const pay = agirliklar.map(w => birim * w / top);
    const taban = pay.map(Math.floor);
    let kalan = birim - taban.reduce((a, b) => a + b, 0);
    const sira = pay.map((p, i) => [p - Math.floor(p), i]).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
    for (let i = 0; i < sira.length && kalan > 0; i++, kalan--) taban[sira[i][1]]++;
    return taban.map(u => Math.round(u * adim * 1e6) / 1e6);
  }
  // adim: dağıtım kesinliği. İşçi 0,5 (12 saatlik nöbet); memur/doktor 0,01 (tam oran; yuvarlamayı kullanıcı yapar)
  // Sürüm 13.71: nöbet sayısını 8 saatlik parçaya (1/3) oturtur; 7,67 / 7,66 / 7,666… → 7⅔
  const ucte = v => (Math.abs(v * 3 - Math.round(v * 3)) < 0.06 ? Math.round(v * 3) / 3 : Math.round(v * 6) / 6);      // üçte bir (8 sa); yarım (12 sa) korunur
  function dagitSinirli(havuz, hedefler, azamiler, adim) {
    adim = adim || ADIM;
    const toplam = hedefler.reduce((a, b) => a + b, 0);
    if (havuz <= toplam + 1e-9) return dagit(havuz, hedefler, adim);
    const out = dagit(toplam, hedefler, adim); let kalan = Math.round((havuz - out.reduce((a, b) => a + b, 0)) / adim);
    while (kalan > 0) {
      let en = -1;
      for (let i = 0; i < out.length; i++) {
        if (out[i] + adim > azamiler[i] + 1e-9) continue;
        if (en < 0 || (out[i] - hedefler[i]) < (out[en] - hedefler[en]) - 1e-9) en = i;
      }
      if (en < 0) break;
      out[en] = Math.round((out[en] + adim) * 1e6) / 1e6; kalan--;
    }
    return out;
  }

  // Hedefin üstündeki fazla nöbetin dağıtımı: hedefler olduğu gibi kalır. Önce tam sayıya tamamlama (7,67 → 8, sonra 9…), her turda fazlası en az olana;
  // sonra kalan küsurat (8 saatlik 1/3 ya da 12 saatlik 1/2 parça) geçerli bir değere (x,33 / x,5 / x,67 / tam) oturacak biçimde verilir
  function fazlaDagit(E, H, A) {
    const V = H.slice(), fark = i => V[i] - H[i], gec = v => Math.abs(v * 3 - Math.round(v * 3)) < 1e-6 || Math.abs(v * 2 - Math.round(v * 2)) < 1e-6;
    let r = Math.floor(E * 6 + 1e-6) / 6;
    for (let t = 0; t < 10000 && r > 1e-6; t++) {
      let en = -1, c = 0;
      for (let i = 0; i < V.length; i++) { const ust = Math.floor(V[i] + 1e-6) + 1, cost = ust - V[i]; if (ust > A[i] + 1e-6 || cost > r + 1e-6) continue; if (en < 0 || fark(i) < fark(en) - 1e-9) { en = i; c = cost; } }
      if (en < 0) break; V[en] = Math.floor(V[en] + 1e-6) + 1; r -= c;
    }
    for (let t = 0; t < 50 && r > 1e-6; t++) {
      let en = -1, es = 0;
      for (let i = 0; i < V.length; i++) for (let k = Math.round(r * 6); k >= 1; k--) {
        const st = k / 6; if (V[i] + st > A[i] + 1e-6 || !gec(V[i] + st)) continue;
        if (en < 0 || st > es + 1e-9 || (Math.abs(st - es) < 1e-9 && fark(i) < fark(en) - 1e-9)) { en = i; es = st; } break;
      }
      if (en < 0) break; V[en] += es; r -= es;
    }
    return V;
  }
  // Bir istasyon için hesap. kisiler: o istasyonda çalışan (gelenler dahil, giden hariç) kayıtlar. 
  // Her kayıt için {mesai, hedef, nobetYok} üretir; ihtiyaç, kapasite ve öneri döner.
  function istasyonHesap(kisiler, y, m, ozel, durumlar, ayar, yuva) {
    const gun = gunSayisi(y, m), ihtiyac = (yuva == null ? YUVA_VARSAYILAN : yuva) * gun;
    const satir = kisiler.map(k => {
      const dt = durumlar[k.durum] || {};
      const mesai = kisiMesai(k, y, m, ozel, durumlar);
      // işçi: 3 aylık dönemde önceki aylardan devreden saat (eksik çalışılan +, fazla −) bu ayın mesaisine eklenir; vardiya sayısı yine aşağı yuvarlanır
      const devir = k.sinif === 'isci' && ayar && ayar.isciDevir && ayar.isciDevir[k.id] ? ayar.isciDevir[k.id].devir || 0 : 0;
      // Sürüm 13.57: nöbet muafiyetli personel gündüz 8 saat çalışır; bu saatler nöbetin 8 saatlik parçası sayılır (hedef = mesai / 24, azami = hedef)
      const gunduz = !dt.disarida && (k.durum === 'NÖBET MUAFİYETİ MESAİ' || !!dt.gunduz8) && k.sinif !== 'isci';
      const h = hedefNobet(Math.max(0, mesai + devir), gunduz ? 'memur' : k.sinif, (!!dt.nobetYok && !gunduz) || !!dt.disarida, ayar);
      return {k, mesai, devir, hedef: h.birim, hedefAdet: h.adet, nobetYok: !!dt.nobetYok && !gunduz, gunduz};
    });
    // Azami nöbet: memur/doktor tam ay hedefinin üstüne azamiMemur'a kadar (ör. Kasım: hedef 7, azami 8); izinli kişide hedef + aynı ek; işçi: hedef (mesaisinin üstüne yazılmaz)
    const a = ayar || {}, azamiMemur = a.azamiMemur || 0, tam = hedefNobet(ayMesai(y, m, false, ozel), 'memur', false, a).birim, ek = Math.max(0, azamiMemur - tam);
    satir.forEach(s => {
      const dz = (durumlar || {})[s.k.durum] || {}, fazlaYok = dz.fazlaYok != null ? !!dz.fazlaYok : s.k.durum === 'YARI ZAMANLI';      // yarı zamanlı yalnız kendi mesaisi kadar, fazla nöbet yazılmaz
      s.azami = s.nobetYok || !(s.hedef > 0) ? 0 : fazlaYok ? s.hedef : (s.k.sinif === 'isci' || s.gunduz ? s.hedef : Math.min(Math.max(azamiMemur, s.hedef), s.hedef + ek));
    });
    // Yuva yetenekleri: doktor → ekip şefi; işçi → sürücü (12 saat); AABT (sağlık teknikeri) → ekip şefi + YSP (sürücülüğü nöbet kayıtlarından doğrulanmışsa + sürücü); ATT (sağlık memuru / teknisyeni) → YSP (sürücülüğü doğrulanmışsa + sürücü)
    // (nöbet kayıtlarında ekip şefi olarak görev almışsa ekip şefi + YSP; yalnızca YSP olarak çalışıyorsa YSP).
    const esik = {sur: (a.surEsik == null ? 70 : a.surEsik) / 100, degil: (a.surDegilEsik == null ? 0 : a.surDegilEsik) / 100};
    satir.forEach(s => { s.kadroTip = kadroTip(s.k); s.rol = rolBelirle(s.k, esik); s.grup = grupBelirle(s.k, esik, a); });
    const gruplar = {dok: [], isci: [], ms: [], ke: [], ka: [], ysp: [], sy: []};
    satir.forEach(s => { if (!s.nobetYok) gruplar[s.grup].push(s); });
    const D3 = ihtiyac / 3, dem = {es: D3, ysp: D3, sur: D3}, r2 = v => Math.round(v * 100) / 100, EPS = 1e-9;
    const topla = (f) => { const o = {}; GRUPLAR.forEach(g => { o[g] = gruplar[g].reduce((x, s) => x + s[f], 0); }); return o; };
    const supH = topla('hedef'), supA = topla('azami');
    // Doktorlu olmayan ekipte (istasyon tipi A1 değil ve kadroda nöbet tutan doktor yok) ATT ekip şefi nöbet branşına takviye verebilir (en son öncelik)
    const attEs = !!a.attEsIzin && !gruplar.dok.length;
    const H = akis(supH, dem, attEs), A = akis(supA, dem, attEs);
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
    // fazla: herkes yalnız mesaisi kadar (hedef) tutsa bile nöbet branşlarına sığmayan nöbet → bu kişiler mesaisini tamamlayamaz (657: doktor / AABT / ATT eksik mesaide kalamaz).
    // Azami ile hesaplanan "fazla" (fazla mesaiden artan) mesai eksiği değildir, sayılmaz. İşçi eksik mesaide kalabilir: memur fazlası ayrıca verilir.
    const fazlaEf = fazlaH, fazlaMemur = r2(fazlaH - (H.fazla.isci || 0));
    const ihtiyacTur = hedefAcik <= EPS ? 'yok' : (fazlaMod && unmetA <= EPS) ? 'icerde' : ihtiyacKisi >= 1 ? 'oner' : unmetA <= EPS ? 'icerde' : 'elle';
    return {gun, ihtiyac, satir, gruplar, kapasite, azamiKap, fark: r2(fazlaH - unmetH), fazlaH, farkAzami: unmetA > EPS ? -unmetA : r2(azamiKap - ihtiyac), durum, tamHedef: tam, hedefAcik, acikEf: r2(acikEf), fazlaEf, fazlaMemur, fazlaGrupEf: H.fazla, fazlaVar: fazlaEf > EPS, acikM: fazlaMod ? A.rem : H.rem, ihtiyacKisi, kalanAcik: r2(acikEf - ihtiyacKisi * tam), ihtiyacTur,
      slot: {dem, hedef: H, azami: A, supH, supA}, acik: H.rem, attEs};
  }
  // Grup yetenekleri ve yuva akışı. Nöbet branşları: es (ekip şefi), ysp (yardımcı sağlık personeli), sur (sürücü).
  // Ekip şefi nöbetlerini doktor ve AABT tutar; doktorlu olmayan ekipte ATT ekip şefi nöbet branşına en son takviye verebilir (attEs).
  const GRUPLAR = ['dok', 'isci', 'ms', 'ke', 'ka', 'ysp', 'sy'];      // ms: 657'ye tabi memur sürücü (şoför) — yalnız sürücü, 24 saat
  const YETENEK = {dok: ['es'], isci: ['sur'], ms: ['sur'], ke: ['es', 'ysp'], ka: ['es', 'sur', 'ysp'], ysp: ['ysp'], sy: ['sur', 'ysp']};   // sıra = doldurma önceliği
  const YETENEK_ES = {...YETENEK, ysp: ['ysp', 'es'], sy: ['sur', 'ysp', 'es']};      // doktorsuz ekip: ATT ekip şefine takviye
  const GRUP_AD = {dok: 'Doktor', isci: 'İşçi', ms: 'Sürücü (657 memur)', ke: 'AABT (ekip şefi + YSP)', ka: 'AABT (ekip şefi + YSP + sürücü)', ysp: 'ATT (yalnız YSP)', sy: 'ATT (sürücü + YSP)'};
  // Önce doktor ve işçi, sonra AABT (önce ekip şefi, sonra ATT'nin giremediği yuvalar, en son YSP) nöbet branşları doldurur; ATT geri kalan nöbet branşları doldurur.
  // Böylece AABT'nin hedef nöbetleri tam kullanılır, fazlalık ATT'de görünür (bir ATT bir ay dışarı çıkabilir).
  // Nöbet branşlarına dağıtım en iyi akışla yapılır (boş kalan en az olur; basit sıra bir branşı yanlışlıkla açık, öbürünü fazla gösteriyordu — Sürüm 13.56).
  // Öncelik nöbet listesiyle aynı: önce sürücü, sonra ekip şefi (doktor / AABT), ATT ekip şefine yalnız doktorsuz ekipte ve onlar yetmezse, en son YSP.
  // Gruplar sırayla kullanılır (doktor, işçi, AABT, sonra ATT): fazlalık önce ATT'de kalır.
  function akis(sup, dem, attEs) {
    const B = ['es', 'ysp', 'sur'], n = 2 + GRUPLAR.length + 3, gi = g => 2 + GRUPLAR.indexOf(g), bi = s => 2 + GRUPLAR.length + B.indexOf(s), EPS = 1e-9;
    const C = Array.from({length: n}, () => new Array(n).fill(0)), F = Array.from({length: n}, () => new Array(n).fill(0));
    GRUPLAR.forEach(g => { C[0][gi(g)] = Math.max(0, sup[g] || 0); YETENEK[g].forEach(s => { C[gi(g)][bi(s)] = 1e9; }); });
    const yol = bas => {      // bas grubundan başlayan artırma yolu (diğer grupların ataması yeniden yönlenebilir)
      for (;;) {
        const par = new Array(n).fill(-1); par[0] = 0; par[gi(bas)] = 0; const q = [gi(bas)];
        if (C[0][gi(bas)] - F[0][gi(bas)] <= EPS) return;
        while (q.length && par[1] < 0) { const u = q.shift(); for (let v = 1; v < n; v++) if (par[v] < 0 && C[u][v] - F[u][v] > EPS) { par[v] = u; q.push(v); } }
        if (par[1] < 0) return;
        let f = C[0][gi(bas)] - F[0][gi(bas)]; for (let v = 1; v !== gi(bas); v = par[v]) f = Math.min(f, C[par[v]][v] - F[par[v]][v]);
        for (let v = 1; v !== gi(bas); v = par[v]) { F[par[v]][v] += f; F[v][par[v]] -= f; }
        F[0][gi(bas)] += f; F[gi(bas)][0] -= f;
      }
    };
    for (const faz of [['sur'], ['es'], ['attEs'], ['ysp']]) {
      faz.forEach(s => { if (s === 'attEs') { if (attEs) ['ysp', 'sy'].forEach(g => { C[gi(g)][bi('es')] = 1e9; }); } else C[bi(s)][1] = Math.max(0, dem[s] || 0); });
      GRUPLAR.forEach(yol);
    }
    const fill = {}, fazla = {}, rem = {};
    GRUPLAR.forEach(g => { fill[g] = {es: 0, ysp: 0, sur: 0}; B.forEach(s => { fill[g][s] = Math.max(0, F[gi(g)][bi(s)]); }); fazla[g] = Math.max(0, (sup[g] || 0) - F[0][gi(g)]); });
    B.forEach(s => { rem[s] = Math.round(((dem[s] || 0) - Math.max(0, F[bi(s)][1])) * 100) / 100; });
    return {fill, rem, fazla};
  }
  // Önerilen planlanan nöbet: önce hedef nöbetlerle yuvalar doldurulur (fazla gruplar orantılı azalır), açık kalırsa azami sınıra kadar ek nöbet yazılır
  // Fazlalık (hedefin üstüne yazılan) nöbetlerin dağıtımı: sırayla 1 nöbet ATT sürücülere (sy), 1 nöbet AABT sürücülere (ka); ikisinin de payı bitince kalan açık yuvalar diğer branşlar arasında eşit paylaştırılır (tur tur 0,25'lik dilimlerle). Ekip şefi yuvasına ATT giremez (yeteneği yok), yalnız AABT / doktor
  function akisEk(ek, rem, attEs) {
    const dem = {...rem}, fill = {}, kalan = {...ek}, fazla = {}, YT = attEs ? YETENEK_ES : YETENEK; GRUPLAR.forEach(g => { fill[g] = {es: 0, ysp: 0, sur: 0}; });
    const ver = (g, miktar) => { let k = miktar; for (const s of YT[g]) { if (k <= 1e-9) break; const u = Math.min(k, Math.max(0, dem[s])); fill[g][s] += u; dem[s] -= u; k -= u; } return miktar - k; };
    // 1 nöbet ATT sürücülere, 1 nöbet AABT sürücülere (sırayla); grup içinde kişilere eşit dağıtım oneri'de yapılır
    for (let tur = 0; tur < 20000; tur++) { let verildi = false; for (const g of ['sy', 'ka']) { if ((kalan[g] || 0) <= 1e-9) continue; const al = ver(g, Math.min(kalan[g], 1)); if (al > 1e-9) { kalan[g] -= al; verildi = true; } } if (!verildi) break; }
    const digerleri = GRUPLAR.filter(g => g !== 'sy' && g !== 'ka');
    for (let tur = 0; tur < 20000; tur++) { let verildi = false; for (const g of digerleri) { if ((kalan[g] || 0) <= 1e-9) continue; const al = ver(g, Math.min(kalan[g], 0.25)); if (al > 1e-9) { kalan[g] -= al; verildi = true; } } if (!verildi) break; }
    GRUPLAR.forEach(g => { fazla[g] = Math.max(0, kalan[g] || 0); });
    ['es', 'ysp', 'sur'].forEach(s => { dem[s] = Math.round(dem[s] * 100) / 100; });
    return {fill, rem: dem, fazla};
  }
  function oneri(hesap, kilitli) {
    const {ihtiyac, gruplar: gr} = hesap, sonuc = new Map(), D3 = ihtiyac / 3;
    const ser = g => (gr[g] || []).filter(s => !kilitli || !kilitli.has(s.k.id));
    const kil = g => (gr[g] || []).filter(s => kilitli && kilitli.has(s.k.id)).reduce((x, s) => x + kilitli.get(s.k.id), 0);
    const top = (L, f) => L.reduce((x, s) => x + s[f], 0), kilitSup = {}, sup1 = {}, ek = {};
    GRUPLAR.forEach(g => { const L = ser(g); kilitSup[g] = kil(g); sup1[g] = top(L, 'hedef'); ek[g] = top(L, 'azami') - top(L, 'hedef'); });
    const ae = !!hesap.attEs, f0 = akis(kilitSup, {es: D3, ysp: D3, sur: D3}, ae), f1 = akis(sup1, f0.rem, ae), f2 = akisEk(ek, f1.rem, ae);
    GRUPLAR.forEach(g => {
      const L = ser(g), t = x => x.es + x.ysp + x.sur, total = t(f1.fill[g]) + t(f2.fill[g]);
      // Hedefin üstüne fazla nöbet yazılan memur/doktorda nöbet tam sayıya yuvarlanır: önce aşağı, eksik kalan toplam küsuratı en büyük olanlardan başlayarak azamiyi aşmadan yukarı tamamlanır (ör. 8,67 / 8,67 / 8,66 → 9 / 9 / 8)
      // Sürüm 13.57: işçi her durumda mesaisine göre hedef vardiyasını tutar (kilitli memur sürücüler sürücüyü doldursa da düşürülmez)
      // Sürüm 13.71: memur / doktor küsuratı 8 saatlik parçalarla (1/3 nöbet: 0,33 = 8 sa, 0,67 = 16 sa); 0,01'lik artıklar (7,66 / 7,67) çıkmaz
      // Sürüm 13.70: grubun payı hedeflerin toplamını aşıyorsa herkes önce tam hedefini alır (7,67 → 7,67; kimse hedefin altına inmez),
      // yalnız artan fazla nöbet uygun personele (en az fazlası olandan başlayarak, azamiyi aşmadan) dağıtılır; bu artışların küsuratı farklı olabilir (8 / 8,5 / 8,33)
      const sumH = L.reduce((x, s) => x + s.hedef, 0);
      if (g !== 'isci' && L.length && total > sumH + 1e-6) { fazlaDagit(total - sumH, L.map(s => s.hedef), L.map(s => s.azami)).forEach((v, i) => sonuc.set(L[i].k.id, ucte(v))); return; }
      const V = g === 'isci' ? L.map(s => s.hedef) : dagitSinirli(Math.floor(Math.max(0, total) * 3 + 1e-6) / 3, L.map(s => s.hedef), L.map(s => s.azami), 1 / 3);
      if (g !== 'isci') {      // işçinin 12 saatlik vardiyası yüzünden kalan yarım (12 sa) parça: x,33'lü bir kişiye eklenir → x,5 (12 sa)
        const artik = Math.max(0, total) - V.reduce((x, v) => x + v, 0);
        if (artik > 1 / 6 - 1e-6) {
          const kes = v => Math.round((v - Math.floor(v + 1e-6)) * 3), oda = (j, d) => V[j] + d <= L[j].azami + 1e-6 && V[j] + d >= -1e-6;
          const i1 = V.findIndex((v, j) => kes(v) === 1 && oda(j, 1 / 6) && V[j] + 1 / 6 <= L[j].hedef + 1e-6);      // x,33 → x,5 (eksik grupta kimse hedefini aşmaz)
          if (i1 >= 0) V[i1] = Math.floor(V[i1] + 1e-6) + 0.5;
          else {
            // eksik grupta önce hedefi aşmayan yol: x,67 → x,5 ve hedefinin altındaki başka biri +8 sa (kimse hedefin üstüne çıkmaz)
            const c0 = V.findIndex((v, j) => kes(v) === 2 && oda(j, -1 / 6)), d0 = V.findIndex((v, j) => j !== c0 && V[j] + 1 / 3 <= L[j].hedef + 1e-6 && oda(j, 1 / 3));
            if (c0 >= 0 && d0 >= 0) { V[c0] = Math.floor(V[c0] + 1e-6) + 0.5; V[d0] = ucte(V[d0] + 1 / 3); }
            else { const a = V.findIndex((v, j) => kes(v) === 0 && oda(j, 0.5) && V[j] + 0.5 <= L[j].hedef + 1e-6), b = V.findIndex((v, j) => j !== a && kes(v) > 0 && oda(j, -1 / 3));
              if (a >= 0 && b >= 0) { V[a] = Math.round(V[a]) + 0.5; V[b] = ucte(V[b] - 1 / 3); } }      // x,0 → x,5 ve başka biri −8 sa (hedef aşılmaz; yol yoksa 4 saatlik parça boş kalır)
          }
        }
      }
      if (g !== 'isci') {
        const fz = V.map((v, i) => v > L[i].hedef + 0.01 ? i : -1).filter(i => i >= 0), hedefT = fz.reduce((x, i) => x + V[i], 0);
        const R = V.slice(); fz.forEach(i => { R[i] = Math.max(L[i].hedef, Math.floor(V[i] + 0.01)); });
        let eksik = hedefT - fz.reduce((x, i) => x + R[i], 0);
        fz.slice().sort((x, y) => (V[y] - Math.floor(V[y] + 0.01)) - (V[x] - Math.floor(V[x] + 0.01))).forEach(i => { if (eksik <= 0.01) return; const ust = Math.min(L[i].azami, Math.ceil(V[i] - 0.01)); if (ust > R[i]) { eksik -= ust - R[i]; R[i] = ust; } });
        R.forEach((v, i) => sonuc.set(L[i].k.id, ucte(v)));      // 7,666… tam üçte iki olarak saklanır (ekranda 7,67; üç kişi toplamı 23)
      } else V.forEach((v, i) => sonuc.set(L[i].k.id, Math.round(v * 100) / 100));
    });
    // Tam sayıya yuvarlama ihtiyacı aşarsa (ör. 94 / 93) fazlalık, nöbet branşına sığmayan gruptan başlayarak en çok nöbeti olandan 1'er nöbet geri alınır (hedefin altına inilmez)
    const kilitTop = GRUPLAR.reduce((x, g) => x + kilitSup[g], 0), planTop = () => [...sonuc.values()].reduce((x, v) => x + v, 0) + kilitTop;
    for (let tur = 0; tur < 200 && planTop() - ihtiyac >= 0.99; tur++) {
      const sup = {}; GRUPLAR.forEach(g => { sup[g] = kilitSup[g] + ser(g).reduce((x, s2) => x + (sonuc.get(s2.k.id) || 0), 0); });
      const tasan = akis(sup, {es: D3, ysp: D3, sur: D3}, ae).fazla;
      const aday = GRUPLAR.filter(g => g !== 'isci').flatMap(g => ser(g).map(s2 => ({s2, g, v: sonuc.get(s2.k.id) || 0}))).filter(x => x.v - 1 >= x.s2.hedef - 0.01)
        .sort((x, y) => ((tasan[y.g] >= 0.99) - (tasan[x.g] >= 0.99)) || (y.v - y.s2.hedef) - (x.v - x.s2.hedef));
      if (!aday.length) break;
      sonuc.set(aday[0].s2.k.id, ucte(aday[0].v - 1));
    }
    return sonuc;
  }
  // Kadro tipi: AABT (sağlık teknikeri) ve ATT (sağlık memuru / teknisyeni). Unvanda açıkça yazıyorsa o esas alınır.
  // Sürüm 13.57: 657'ye tabi memur şoför / sürücü (sağlık ünvanı yok) — işçi değil, 24 saatlik sürücü nöbeti tutar
  function memurSurucu(k) {
    if (k.sinif !== 'memur') return false;
    const u = TR((k.unvan || '') + ' ' + (k.kadroBrans || ''));
    return /SOFOR|SURUCU/.test(u) && !/AABT|\bATT\b|ACIL|TEKNIKER|TEKNISYEN|SAGLIK|HEMSIRE|EBE\b|PARAMEDIK/.test(u);
  }
  function kadroTip(k) {
    const u = TR((k.unvan || '') + ' ' + (k.kadroBrans || ''));
    if (/\bAABT\b|AMBULANS VE ACIL BAKIM/.test(u)) return 'AABT';
    if (/\bATT\b|ACIL TIP TEKNISYEN/.test(u)) return 'ATT';
    return /TEKNIKER/.test(u) ? 'AABT' : 'ATT';
  }
  function grupBelirle(k, esik, ayar) {
    if (k.sinif === 'doktor') return 'dok';
    if (k.sinif === 'isci') return 'isci';
    if (memurSurucu(k)) return 'ms';
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
    const o = esik || {degil: 0};
    if (k.rolManuel) return {tip: k.rolManuel === 'sur' || k.rolManuel === 'karma' ? 'surucu' : 'degil', kaynak: 'manuel', pay: k.rolManuel === 'sur' || k.rolManuel === 'karma' ? 1 : 0};
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
  // Kadro (birim) değişikliği: EKİP listesinde birimi değişen personel, değişiklikten itibaren 1 yıl başka birime görevlendirilemez / rotasyona önerilmez
  function kadroYilDurum(kadroTarih, refIso) {
    if (!kadroTarih) return {yok: true, uygun: true};
    const b = new Date(kadroTarih + 'T00:00:00Z'), dolum = iso(b.getUTCFullYear() + 1, b.getUTCMonth() + 1, b.getUTCDate());
    return {dolum, uygun: Date.parse(dolum + 'T00:00:00Z') <= Date.parse(refIso + 'T00:00:00Z')};
  }
  function gorevlendirmeEngeli(k, refIso) {
    if (k.dortB) {
      const d = dortYilDurum(k.memBas, refIso);
      if (!d.bilinmiyor && !d.uygun) return `4/B personel 4 yılını doldurmadan görevlendirilemez (dolum: ${d.dolum.split('-').reverse().join('.')})`;
    }
    const y = kadroYilDurum(k.kadroTarih, refIso);
    return y.uygun ? '' : `Kadro değişikliği: 1 yıl dolmadan görevlendirilemez (dolum: ${y.dolum.split('-').reverse().join('.')})`;
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

  const api = {izinSon, surucuDurumu, rolToplam, rolSinifla, rolBelirle, kadroTip, memurSurucu, grupBelirle, akis, YETENEK, GRUP_AD, GRUPLAR, ilceAdi, mesafeKm, ILCE_KONUM, aylariListele, muafiyetCoz, tarihIso, dortB, dortYilDurum, kadroYilDurum, gorevlendirmeEngeli, TR, iso, pad, gunSayisi, gunSaat, ayMesai, kisiMesai, hedefNobet, dagit, dagitSinirli, istasyonHesap, oneri, istAnahtar,
    durumAnahtar, sinifTespit, DURUM_VARSAYILAN, OZEL_TUR, RESMI, MESAI, YUVA_VARSAYILAN, ADIM, ucte};
  return api;
})();
if (typeof module !== 'undefined') module.exports = APCore;
