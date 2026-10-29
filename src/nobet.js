/* HUSER ASHİ PLANLAMA — Modül 2 çekirdeği: istasyon nöbet listesi (kural denetimi, otomatik üretim, öneri). DOM'dan bağımsızdır. */
const NobetCore = (() => {
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const gunSayisi = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  // yuva yetenekleri (Modül 1 ile aynı): dok → ekip şefi; işçi → sürücü (12 saat); AABT → her yuva; ATT yalnız YSP / sürücü + YSP
  const YETENEK = {dok: ['es'], isci: ['sur'], ke: ['es', 'ysp'], ka: ['es', 'ysp', 'sur'], ysp: ['ysp'], sy: ['sur', 'ysp']};
  const KURAL = {minAra: 1, maxAra: 5, izinOnce: 3, surGunAsiri: true, isciGece: true};
  const YUVA_AD = {es: 'Ekip şefi', ysp: 'YSP', sur: 'Sürücü'};
  const KOD = {es: 'E', ysp: 'Y', sur: 'S', surG: 'G', surA: 'A'};

  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const bos = N => Array.from({length: N + 1}, () => ({es: null, ysp: null, sur: null, surG: null, surA: null}));   // 1..N

  // Girdiyi gün indekslerine çevirir. kisi: {id, ad, grup, adet (24 saatlik nöbet), yarim (işçi 12 saatlik adet), izin:[{bas,bit}], istek:[iso]}
  function hazirla(g, kural) {
    const N = g.gun || gunSayisi(g.y, g.m), K = {...KURAL, ...(kural || {})}, ay = `${g.y}-${pad(g.m)}`;
    const gunNo = d => (d && d.slice(0, 7) === ay ? +d.slice(8, 10) : null);
    const P = g.kisiler.map(k => {
      const izin = new Set(), once = new Set(), istek = new Set(), baslar = [];
      (k.izin || []).forEach(i => {
        if (!i.bas || !i.bit) return;
        const bas = i.bas, bit = i.bit;
        for (let d = 1; d <= N; d++) { const x = iso(g.y, g.m, d); if (x >= bas && x <= bit) izin.add(d); }
        const b = gunNo(bas); if (b) { baslar.push(b); for (let d = Math.max(1, b - K.izinOnce); d < b; d++) once.add(d); }
        else if (bas > iso(g.y, g.m, N)) { const kal = Math.round((Date.parse(bas + 'T00:00:00Z') - Date.parse(iso(g.y, g.m, N) + 'T00:00:00Z')) / 864e5); for (let d = N; d > N - (K.izinOnce - kal + 1) && d >= 1; d--) once.add(d); }   // izin sonraki ayın başında başlıyorsa bu ayın son günleri boş
      });
      (k.istek || []).forEach(x => { const d = gunNo(x); if (d) istek.add(d); });
      return {id: k.id, ad: k.ad, grup: k.grup, sinif: k.sinif, yet: YETENEK[k.grup] || ['ysp'], isci: k.grup === 'isci', hedef24: k.adet || 0, hedefYarim: k.yarim || 0, izin, once, istek, baslar};
    });
    return {N, K, P, byId: new Map(P.map(p => [p.id, p]))};
  }

  // Bir listenin cezası ve ihlalleri
  function denetle(liste, H) {
    const {N, K, P, byId} = H, ihlal = [], ekle = (tur, agirlik, gun, kisi, mesaj, ek) => ihlal.push({tur, agirlik, gun, kisi, mesaj, ...(ek || {})});
    const gorev = new Map(P.map(p => [p.id, []]));         // kişi → [{gun, tip}]
    for (let d = 1; d <= N; d++) {
      const L = liste[d];
      ['es', 'ysp', 'sur', 'surG', 'surA'].forEach(s => { const id = L[s]; if (id != null && byId.has(id)) gorev.get(id).push({gun: d, tip: s}); });
      const surTamam = L.sur != null || (L.surG != null && L.surA != null);
      if (L.es == null) ekle('eksik', 1000, d, null, `${d}. gün ${YUVA_AD.es} yuvası boş`, {yuva: 'es'});
      if (L.ysp == null) ekle('eksik', 1000, d, null, `${d}. gün ${YUVA_AD.ysp} yuvası boş`, {yuva: 'ysp'});
      if (!surTamam) ekle('eksik', 1000, d, null, `${d}. gün ${YUVA_AD.sur} yuvası ${L.surG == null && L.surA == null && L.sur == null ? 'boş' : 'eksik (12 saatlik yarısı boş)'}`, {yuva: 'sur'});
      if (L.sur != null && (L.surG != null || L.surA != null)) ekle('cakisma', 800, d, L.sur, `${d}. gün sürücü yuvasında hem 24 saat hem 12 saatlik atama var`);
    }
    P.forEach(p => {
      const L = gorev.get(p.id).slice().sort((a, b) => a.gun - b.gun), gunde = {};
      L.forEach(x => { (gunde[x.gun] = gunde[x.gun] || []).push(x); });
      // yetenek, izin, istek, aynı gün çakışma
      L.forEach(x => {
        const yuva = x.tip === 'surG' || x.tip === 'surA' ? 'sur' : x.tip;
        if (!p.yet.includes(yuva)) ekle('yetenek', 900, x.gun, p.id, `${p.ad}: ${YUVA_AD[yuva]} yuvasında görevlendirilemez`);
        if (p.izin.has(x.gun)) ekle('izin', 900, x.gun, p.id, `${p.ad}: ${x.gun}. gün izinli`);
        else if (p.istek.has(x.gun)) ekle('istek', 80, x.gun, p.id, `${p.ad}: ${x.gun}. gün nöbet istemiyor`);
        if (p.once.has(x.gun) && !p.izin.has(x.gun)) ekle('izinOnce', 300, x.gun, p.id, `${p.ad}: yıllık izin öncesi ${K.izinOnce} gün boşluk kuralı (${x.gun}. gün)`);
      });
      Object.keys(gunde).forEach(d => { if (gunde[d].length > 1) ekle('cakisma', 800, +d, p.id, `${p.ad}: ${d}. gün birden fazla yuvada`); });
      // 24 saatlik nöbetler: dinlenme (min boşluk gün) ve sürücü gün aşırı 3
      const g24 = L.filter(x => !(x.tip === 'surG' || x.tip === 'surA')).map(x => x.gun);
      for (let i = 1; i < g24.length; i++) if (g24[i] - g24[i - 1] - 1 < K.minAra) ekle('dinlenme', 700, g24[i], p.id, `${p.ad}: ${g24[i - 1]}. ve ${g24[i]}. gün art arda 24 saatlik nöbet (arada en az ${K.minAra} gün boşluk gerekir)`);
      if (K.surGunAsiri) {
        const s24 = new Set(L.filter(x => x.tip === 'sur').map(x => x.gun));
        s24.forEach(d => { if (s24.has(d + 2) && s24.has(d + 4)) ekle('surGunAsiri', 300, d + 4, p.id, `${p.ad}: ${d}., ${d + 2}., ${d + 4}. gün sürücü olarak gün aşırı üst üste 3 nöbet (24 saat)`); });
      }
      // işçi: art arda 3 gece; gecenin ertesi günü gündüz vardiyası
      if (p.isci) {
        const A = new Set(L.filter(x => x.tip === 'surA').map(x => x.gun)), G = new Set(L.filter(x => x.tip === 'surG').map(x => x.gun));
        if (K.isciGece) A.forEach(d => { if (A.has(d + 1) && A.has(d + 2)) ekle('isciGece', 300, d + 2, p.id, `${p.ad}: ${d}., ${d + 1}., ${d + 2}. gün art arda 3 gece`); });
        G.forEach(d => { if (A.has(d - 1)) ekle('dinlenme', 700, d, p.id, `${p.ad}: ${d - 1}. gün gece nöbetinden sonra ${d}. gün gündüz nöbeti (dinlenme yok)`); });
      }
      // iki nöbet arası en fazla maxAra gün (izin araya giriyorsa sayılmaz)
      const tum = L.map(x => x.gun).filter((d, i, a) => a.indexOf(d) === i);
      for (let i = 1; i < tum.length; i++) {
        const a = tum[i - 1], b = tum[i], bosGun = b - a - 1;
        if (bosGun > K.maxAra) { let izinAra = false; for (let d = a + 1; d < b; d++) if (p.izin.has(d)) izinAra = true; if (!izinAra) ekle('aralik', 60 * (bosGun - K.maxAra), b, p.id, `${p.ad}: ${a}. ve ${b}. gün nöbetleri arası ${bosGun} gün (en fazla ${K.maxAra})`, {a, b}); }
      }
      // nöbet sayısı: planlanan ile yazılan
      const birim = L.filter(x => !(x.tip === 'surG' || x.tip === 'surA')).length + 0.5 * L.filter(x => x.tip === 'surG' || x.tip === 'surA').length, hedef = p.hedef24 + p.hedefYarim / 2;
      if (Math.abs(birim - hedef) > 0.01) ekle('adet', 40 * Math.abs(birim - hedef), 0, p.id, `${p.ad}: planlanan ${hedef} nöbet, listede ${birim}`, {fark: birim - hedef});
    });
    const toplam = ihlal.reduce((x, i) => x + i.agirlik, 0), say = {};
    ihlal.forEach(i => { say[i.tur] = (say[i.tur] || 0) + 1; });
    return {toplam, ihlal, say, gorev};
  }

  const musait = (p, d) => !p.izin.has(d);
  function adayPuani(p, d, durum, yuva, H, R) {
    const {N} = H, son = durum.son[p.id], gap = d - (son == null ? 0 : son) - 1;
    const kalan = (p.isci ? durum.kalanYarim[p.id] : durum.kalan24[p.id]);
    let bos = 0; for (let x = d; x <= N; x++) if (!p.izin.has(x) && !p.istek.has(x) && !p.once.has(x)) bos++;
    const oran = kalan / Math.max(1, p.isci ? bos : Math.ceil(bos / 2));
    let puan = 100 * oran;
    if (gap >= H.K.maxAra - 1) puan += 60 * (gap - (H.K.maxAra - 2));          // 5 günlük sınır yaklaşıyor
    if (gap < 2 && son != null) puan -= 25;
    puan += 12 * (3 - p.yet.length);                                           // yeteneği az olan (uzman) önce kullanılır
    if (kalan <= 0) puan -= 1000;
    return puan + R() * 6;
  }
  function uygun(p, d, tip, durum, H, rahat) {
    if (p.izin.has(d)) return false;
    if (durum.bugun.has(p.id)) return false;
    if (!rahat.istek && p.istek.has(d)) return false;
    if (!rahat.once && p.once.has(d)) return false;
    const g = durum.gorevler[p.id];
    if (tip === 'surG' || tip === 'surA') {
      if (g.A.has(d - 1) && tip === 'surG') return false;                      // gece nöbeti sonrası gündüz yok
      if (tip === 'surA' && H.K.isciGece && g.A.has(d - 1) && g.A.has(d - 2)) return false;
      return true;
    }
    for (let k = 1; k <= H.K.minAra; k++) if (g.t24.has(d - k) || g.t24.has(d + k)) return false;
    if (tip === 'sur' && H.K.surGunAsiri && g.s24.has(d - 2) && g.s24.has(d - 4)) return false;
    return true;
  }

  // Açgözlü kurucu: gün gün, yuva yuva
  function kur(H, seed) {
    const {N, P} = H, R = rng(seed), liste = bos(N);
    const durum = {son: {}, kalan24: {}, kalanYarim: {}, bugun: new Set(), gorevler: {}};
    P.forEach(p => { durum.kalan24[p.id] = p.hedef24; durum.kalanYarim[p.id] = p.hedefYarim; durum.gorevler[p.id] = {t24: new Set(), s24: new Set(), A: new Set(), G: new Set()}; });
    const ata = (p, d, tip, alan) => {
      alan[tip] = p.id; durum.bugun.add(p.id); durum.son[p.id] = d; const g = durum.gorevler[p.id];
      if (tip === 'surG' || tip === 'surA') { durum.kalanYarim[p.id]--; (tip === 'surA' ? g.A : g.G).add(d); }
      else { durum.kalan24[p.id]--; g.t24.add(d); if (tip === 'sur') g.s24.add(d); }
    };
    const sec = (d, yuva, tip) => {
      for (const rahat of [{}, {istek: true}, {istek: true, once: true}]) {
        const adaylar = P.filter(p => p.yet.includes(yuva) && ((tip === 'surG' || tip === 'surA') ? p.isci : !p.isci) && uygun(p, d, tip, durum, H, rahat));
        if (!adaylar.length) continue;
        let en = null, enPuan = -1e9; adaylar.forEach(p => { const x = adayPuani(p, d, durum, yuva, H, R) - (rahat.istek ? 200 : 0) - (rahat.once ? 200 : 0); if (x > enPuan) { enPuan = x; en = p; } });
        if (en) return en;
      }
      return null;
    };
    for (let d = 1; d <= N; d++) {
      durum.bugun = new Set(); const L = liste[d];
      // yuvalar: en az adayı olandan başla
      const sira = ['es', 'sur', 'ysp'].map(y => [y, P.filter(p => p.yet.includes(y) && !p.izin.has(d) && !p.istek.has(d) && durum.kalan24[p.id] + durum.kalanYarim[p.id] > 0).length]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
      sira.forEach(y => {
        if (y === 'sur') {
          // işçi varsa gündüz + gece 12 saatlik; yoksa 24 saatlik sürücü
          const iscilerVar = P.some(p => p.isci && (durum.kalanYarim[p.id] > 0));
          if (iscilerVar) {
            const g = sec(d, 'sur', 'surG'); if (g) ata(g, d, 'surG', L);
            const a = sec(d, 'sur', 'surA'); if (a) ata(a, d, 'surA', L);
            if (L.surG != null && L.surA != null) return;
            // işçiyle tamamlanamadı: 24 saatlik sürücüye geç
            if (L.surG != null) { durum.kalanYarim[L.surG]++; durum.bugun.delete(L.surG); durum.gorevler[L.surG].G.delete(d); L.surG = null; }
            if (L.surA != null) { durum.kalanYarim[L.surA]++; durum.bugun.delete(L.surA); durum.gorevler[L.surA].A.delete(d); L.surA = null; }
          }
          const s = sec(d, 'sur', 'sur'); if (s) ata(s, d, 'sur', L);
        } else { const p = sec(d, y, y); if (p) ata(p, d, y, L); }
      });
    }
    return liste;
  }

  // Yerel iyileştirme: bir atamayı başka uygun kişiyle değiştir ya da iki atamayı takas et
  function iyilestir(liste, H, seed, sureMs) {
    const R = rng(seed + 7), t0 = Date.now(), N = H.N;
    let en = denetle(liste, H), enListe = liste.map(x => ({...x})), mevcut = enListe.map(x => ({...x})), mevcutCeza = en.toplam;
    const yuvalar = ['es', 'ysp', 'sur', 'surG', 'surA'], adayHavuz = {es: H.P.filter(p => p.yet.includes('es') && !p.isci), ysp: H.P.filter(p => p.yet.includes('ysp') && !p.isci), sur: H.P.filter(p => p.yet.includes('sur') && !p.isci), surG: H.P.filter(p => p.isci), surA: H.P.filter(p => p.isci)};
    let iter = 0;
    while (Date.now() - t0 < sureMs && en.toplam > 0) {
      iter++;
      const sonuc = denetle(mevcut, H);
      // hedef: ihlali olan ya da boş bir pozisyonu seç
      const ih = sonuc.ihlal.filter(i => i.gun > 0), secim = ih.length ? ih[Math.floor(R() * ih.length)] : null;
      let d = secim ? secim.gun : 1 + Math.floor(R() * N), y = yuvalar[Math.floor(R() * yuvalar.length)];
      if (secim && secim.yuva) y = secim.yuva === 'sur' ? (mevcut[d].surG != null || mevcut[d].surA != null ? (mevcut[d].surG == null ? 'surG' : 'surA') : 'sur') : secim.yuva;
      else if (secim && secim.kisi != null) { const L = mevcut[d]; const o = yuvalar.filter(s => L[s] === secim.kisi); if (o.length) y = o[0]; }
      const havuz = adayHavuz[y]; if (!havuz.length) continue;
      const yeni = havuz[Math.floor(R() * havuz.length)].id, eski = mevcut[d][y];
      if (yeni === eski) continue;
      const hareket = [];
      if (R() < 0.5) {            // değiştir
        hareket.push([d, y, yeni]);
        // yeni kişi o gün başka yuvadaysa onu eskisiyle takas et
        yuvalar.forEach(s => { if (s !== y && mevcut[d][s] === yeni) hareket.push([d, s, eski]); });
      } else {                    // başka güne ait bir atamayla takas
        const d2 = 1 + Math.floor(R() * N), cand = yuvalar.filter(s => mevcut[d2][s] === yeni); if (!cand.length) continue;
        hareket.push([d, y, yeni], [d2, cand[0], eski]);
      }
      const yedek = hareket.map(([dd, s]) => [dd, s, mevcut[dd][s]]);
      hareket.forEach(([dd, s, id]) => { if (id != null && !(adayHavuz[s] || []).some(p => p.id === id)) { /* yetenek uyuşmazlığı denetle'de cezalanır */ } mevcut[dd][s] = id; });
      const yeniCeza = denetle(mevcut, H).toplam;
      if (yeniCeza <= mevcutCeza || R() < 0.01) { mevcutCeza = yeniCeza; if (yeniCeza < en.toplam) { en = {toplam: yeniCeza}; enListe = mevcut.map(x => ({...x})); } }
      else yedek.forEach(([dd, s, id]) => { mevcut[dd][s] = id; });
    }
    return {liste: enListe, iter};
  }

  // Otomatik nöbet listesi. girdi: {y, m, kisiler:[...]}. seçenekler: {kural, sureMs, deneme, seed}
  function uret(girdi, sec) {
    const o = {sureMs: 1200, deneme: 6, seed: 1, ...(sec || {})}, H = hazirla(girdi, o.kural), t0 = Date.now();
    let eniyi = null, ceza = Infinity, denendi = 0;
    for (let i = 0; i < o.deneme && Date.now() - t0 < o.sureMs * 1.6; i++) {
      denendi++;
      const L = kur(H, o.seed + i * 101), ilk = denetle(L, H), kalanMs = Math.max(150, o.sureMs / o.deneme);
      const r = ilk.toplam > 0 ? iyilestir(L, H, o.seed + i, kalanMs) : {liste: L}, c = denetle(r.liste, H).toplam;
      if (c < ceza) { ceza = c; eniyi = r.liste; }
      if (ceza === 0) break;
    }
    const son = denetle(eniyi, H);
    return {liste: eniyi, ihlal: son.ihlal, ceza: son.toplam, say: son.say, deneme: denendi, sureMs: Date.now() - t0};
  }

  // Öneri: her ihlal için, ilgili atamayı başka kişiyle değiştirmenin cezayı en çok düşürdüğü seçenekler
  function oneriler(liste, girdi, kural, enFazla) {
    const H = hazirla(girdi, kural), ilk = denetle(liste, H), oner = [], yuvalar = ['es', 'ysp', 'sur', 'surG', 'surA'];
    const kopya = liste.map(x => ({...x}));
    const gorulen = new Set();
    ilk.ihlal.filter(i => i.gun > 0 && i.tur !== 'adet').forEach(ih => {
      const anahtar = `${ih.tur}|${ih.gun}|${ih.kisi}|${ih.yuva || ''}`; if (gorulen.has(anahtar)) return; gorulen.add(anahtar);
      const hedefler = ih.yuva ? [ih.yuva === 'sur' ? (kopya[ih.gun].surG == null && kopya[ih.gun].surA != null ? 'surG' : kopya[ih.gun].surA == null && kopya[ih.gun].surG != null ? 'surA' : 'sur') : ih.yuva] : yuvalar.filter(s => kopya[ih.gun][s] === ih.kisi);
      const secenekler = [];
      hedefler.forEach(y => {
        const eski = kopya[ih.gun][y];
        H.P.forEach(p => {
          if (p.id === eski) return;
          const yuva = y === 'surG' || y === 'surA' ? 'sur' : y; if (!p.yet.includes(yuva) || ((y === 'surG' || y === 'surA') !== p.isci)) return;
          const onceki = kopya[ih.gun][y]; kopya[ih.gun][y] = p.id;
          // aynı gün başka yuvada ise vazgeç
          const cakisma = yuvalar.some(s => s !== y && kopya[ih.gun][s] === p.id);
          const c = cakisma ? Infinity : denetle(kopya, H).toplam;
          kopya[ih.gun][y] = onceki;
          if (c < ilk.toplam) secenekler.push({gun: ih.gun, yuva: y, eski, yeni: p.id, yeniAd: p.ad, kazanc: ilk.toplam - c});
        });
      });
      secenekler.sort((a, b) => b.kazanc - a.kazanc);
      oner.push({ihlal: ih, secenekler: secenekler.slice(0, 3)});
    });
    return {ceza: ilk.toplam, say: ilk.say, ihlaller: ilk.ihlal, oneriler: oner.slice(0, enFazla || 60)};
  }

  // Modül 1'deki planlanan nöbetlerden (24 saatlik eşdeğer) listeye yazılacak tam sayı nöbet adetlerini çıkarır.
  // İşçi: 12 saatlik adet (planlanan × 2); diğerleri: 24 saatlik nöbet. Toplam, yuvaların gerektirdiği nöbet sayısına eşitlenir.
  function adetHazirla(kisiler, gun) {
    const isci = kisiler.filter(k => k.grup === 'isci'), diger = kisiler.filter(k => k.grup !== 'isci');
    isci.forEach(k => { k.yarim = Math.max(0, Math.round((k.planlanan || 0) * 2)); k.adet = 0; });
    let H = isci.reduce((x, k) => x + k.yarim, 0); const gunIsci = Math.min(gun, Math.floor(H / 2));
    for (let ex = H - gunIsci * 2; ex > 0; ex--) isci.slice().sort((a, b) => b.yarim - a.yarim)[0].yarim--;
    const gerek = gun * 2 + (gun - gunIsci);
    diger.forEach(k => { k.adet = Math.floor(k.planlanan || 0); k.kesir = (k.planlanan || 0) - k.adet; });
    let fark = gerek - diger.reduce((x, k) => x + k.adet, 0);
    while (fark > 0) { const aday = diger.filter(k => k.adet < (k.ust == null ? 99 : k.ust)).sort((a, b) => b.kesir - a.kesir || (b.planlanan || 0) - (a.planlanan || 0))[0]; if (!aday) break; aday.adet++; aday.kesir -= 1; fark--; }
    while (fark < 0) { const aday = diger.filter(k => k.adet > 0).sort((a, b) => (a.kesir) - (b.kesir) || b.adet - a.adet)[0]; if (!aday) break; aday.adet--; aday.kesir += 1; fark++; }
    return {gerek, gunIsci, kalanFark: fark};
  }
  return {adetHazirla, hazirla, denetle, uret, oneriler, bos, YETENEK, KURAL, YUVA_AD, KOD, gunSayisi, iso};
})();
if (typeof module !== 'undefined') module.exports = NobetCore;
