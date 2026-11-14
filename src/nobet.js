/* HUSER ASHİ PLANLAMA — Modül 2 çekirdeği: istasyon nöbet listesi (kural denetimi, otomatik üretim, öneri). DOM'dan bağımsızdır. */
const NobetCore = (() => {
  const pad = n => String(n).padStart(2, '0');
  const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const gunSayisi = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  // yuva yetenekleri (Modül 1 ile aynı): dok → ekip şefi; işçi → sürücü (yalnız 12 saat); AABT → ekip şefi + YSP (sürücülüğü doğrulanmışsa + sürücü); ATT yalnız YSP / sürücü + YSP;
  // doktorlu olmayan ekipte (g.attEs ve listede doktor yok) ATT ekip şefi nöbet branşına da yazılabilir (en son tercih)
  const YETENEK = {dok: ['es'], isci: ['sur'], ms: ['sur'], ke: ['es', 'ysp'], ka: ['es', 'ysp', 'sur'], ysp: ['ysp'], sy: ['sur', 'ysp']};
  const KURAL = {minAra: 1, maxAra: 5, izinOnce: 3, surGunAsiri: true, isciGece: true};
  const YUVA_AD = {es: 'Ekip şefi', ysp: 'YSP', sur: 'Sürücü'};
  const KOD = {es: 'E', ysp: 'Y', sur: 'S', surG: 'G', surA: 'A'};

  const attMi = p => p.grup === 'ysp' || p.grup === 'sy';      // ATT (ekip şefine yalnız doktorsuz ekipte ve doktor / AABT yetmezse)
  // İşçi 12 saatlik vardiyaları: bir işçi günde en çok bir vardiya (12 saat) tutar. İki işçinin aynı gün gündüz + gece tuttuğu gün sayısı (D2) en fazla olacak şekilde seçilir;
  // tek işçili günlerde (D1) sürücünün diğer 12 saati, sürücülüğü doğrulanmış bir AABT / ATT tarafından başka bir nöbet branşındaki 12 saatle birlikte (toplam 24 saat) tutulur.
  // İşçi vardiyası ay gün sayısını aşamaz; aşan vardiya yazılmaz.
  function isciDuzen(uhIn, N) {
    const uh = uhIn.map(v => Math.max(0, Math.min(N, Math.floor(v || 0)))), top = () => uh.reduce((a, b) => a + b, 0);
    const d2 = () => { const H = top(), mx = uh.reduce((a, b) => Math.max(a, b), 0); return Math.max(0, Math.min(Math.floor(H / 2), H - mx)); };
    for (let g = 0; g < 2000 && top() - d2() > N; g++) { let k = 0; uh.forEach((v, i) => { if (v > uh[k]) k = i; }); uh[k]--; }
    const D2 = d2(); return {uh, D2, D1: top() - 2 * D2};
  }

  function rng(seed) { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  const gunEkle = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
  const bos = N => Array.from({length: N + 1}, () => ({es: null, ysp: null, sur: null, surG: null, surA: null}));   // 1..N

  // Girdiyi gün indekslerine çevirir. kisi: {id, ad, grup, adet (24 saatlik nöbet), yarim (işçi 12 saatlik adet), izin:[{bas,bit}], istek:[iso]}
  function hazirla(g, kural) {
    const N = g.gun || gunSayisi(g.y, g.m), K = {...KURAL, ...(kural || {})}, ay = `${g.y}-${pad(g.m)}`;
    const gunNo = d => (d && d.slice(0, 7) === ay ? +d.slice(8, 10) : null), attEs = !!g.attEs && !g.kisiler.some(k => k.grup === 'dok');
    const yetBul = grup => { const y = YETENEK[grup] || ['ysp']; return attEs && (grup === 'ysp' || grup === 'sy') ? [...y, 'es'] : y; };
    const P = g.kisiler.map(k => {
      const izin = new Set(), once = new Set(), istek = new Set(), baslar = [], donusAday = [];
      (k.izin || []).forEach(i => {
        if (!i.bas || !i.bit) return;
        // ASOS izin/rapor kaydında bitiş = işe dönüş günüdür (izin bir gün önce biter); diğerlerinde bitiş iznin son günüdür
        const bas = i.bas, bit = i.asos ? gunEkle(i.bit, -1) : i.bit, donus = i.donus || (i.asos ? i.bit : gunEkle(i.bit, 1));
        for (let d = 1; d <= N; d++) { const x = iso(g.y, g.m, d); if (x >= bas && x <= bit) izin.add(d); }
        const dn = gunNo(donus); if (dn) donusAday.push(dn);
        const b = gunNo(bas); if (b) { baslar.push(b); for (let d = Math.max(1, b - K.izinOnce); d < b; d++) once.add(d); }
        else if (bas > iso(g.y, g.m, N)) { const kal = Math.round((Date.parse(bas + 'T00:00:00Z') - Date.parse(iso(g.y, g.m, N) + 'T00:00:00Z')) / 864e5); for (let d = N; d > N - (K.izinOnce - kal + 1) && d >= 1; d--) once.add(d); }   // izin sonraki ayın başında başlıyorsa bu ayın son günleri boş
      });
      (k.istek || []).forEach(x => { const d = gunNo(x); if (d) istek.add(d); });
      // İzin / rapor dönüşü: işe başlama günü nöbete girmek zorunludur (o gün başka bir izinle kapanmıyorsa)
      const donus = new Set(donusAday.filter(d => !izin.has(d)));
      return {id: k.id, ad: k.ad, grup: k.grup, sinif: k.sinif, surPay: k.surPay == null ? 1 : k.surPay, yet: yetBul(k.grup), isci: k.grup === 'isci', gunduz: !!k.gunduz, hedef24: k.gunduz ? 0 : (k.adet || 0), hedefYarim: k.yarim || 0, plan: k.grup !== 'isci' && k.planlanan != null ? Math.round(k.planlanan * 100) / 100 : null, onc: (() => { const o = (g.onceki || {})[k.id] || {}; return {t24: (o.t24 || []).filter(d => d <= 0), s24: (o.s24 || []).filter(d => d <= 0), A: (o.A || []).filter(d => d <= 0), G: (o.G || []).filter(d => d <= 0)}; })(), izin, once, istek, baslar, donus};
    });
    // hafta sonu (cumartesi/pazar) ve resmî tatil günleri: nöbetlerin bu günlere kişiler arasında dengeli dağılması için
    const ozel = new Uint8Array(N + 2); let ozelSay = 0;
    const tatil = new Set((g.tatil || []).map(x => typeof x === 'number' ? x : gunNo(x)).filter(Boolean));
    for (let d = 1; d <= N; d++) { const w = new Date(Date.UTC(g.y, g.m - 1, d)).getUTCDay(); if (w === 0 || w === 6 || tatil.has(d)) { ozel[d] = 1; ozelSay++; } }
    return {N, K, P, attEs, byId: new Map(P.map(p => [p.id, p])), ozel, ozelOran: N ? ozelSay / N : 0, ozelSay};
  }
  // Kişinin hafta sonu / resmî tatil nöbet sayısının beklenenden sapması (±1 nöbet tolerans); ceza tam sayıdır
  const ozelCeza = (say, toplam, oran) => { const dev = Math.abs(say - toplam * oran); return dev > 1 ? Math.round(30 * (dev - 1)) : 0; }

  // Aynı gün iki görev yalnız şu durumda geçerlidir: işçi olmayan kişi sürücünün 12 saatini (gündüz / gece) ve başka nöbet branşının diğer 12 saatini tutar (toplam 24 saat, kesintisiz).
  // Gece (21:00–09:00) sürücü → aynı gün 09:00–21:00 ilk parça; gündüz (09:00–21:00) sürücü → aynı gün 21:00–09:00 ikinci parça.
  const kombiUygun = (g, p) => {
    if (g.length !== 2 || p.isci) return false;
    const s = g.find(x => x.tip === 'surG' || x.tip === 'surA'), b = g.find(x => x !== s);
    if (!s || !b || b.saat !== 12) return false;
    return s.tip === 'surA' ? (b.tip === 'es' || b.tip === 'ysp') : b.tip === 'bol' && (b.yuva === 'es' || b.yuva === 'ysp');
  };
  // Bir listenin cezası ve ihlalleri
  function denetle(liste, H) {
    const {N, K, P, byId} = H, ihlal = [], ekle = (tur, agirlik, gun, kisi, mesaj, ek) => ihlal.push({tur, agirlik, gun, kisi, mesaj, ...(ek || {})});
    const gorev = new Map(P.map(p => [p.id, []]));         // kişi → [{gun, tip}]
    for (let d = 1; d <= N; d++) {
      const L = liste[d];
      ['es', 'ysp', 'sur', 'surG', 'surA'].forEach(s => { const id = L[s]; if (id != null && byId.has(id)) gorev.get(id).push({gun: d, tip: s, saat: L.bol && L.bol[s] ? 24 - L.bol[s].saat : 24}); });
      if (L.bol) Object.entries(L.bol).forEach(([s, b]) => { if (b && b.id != null && byId.has(b.id) && L[s] != null) gorev.get(b.id).push({gun: d, tip: 'bol', yuva: s, saat: b.saat}); });
      const surTamam = L.sur != null || (L.surG != null && L.surA != null);
      if (L.es == null) ekle('eksik', 1000, d, null, `${d}. gün ${YUVA_AD.es} nöbet branşı boş`, {yuva: 'es'});
      if (L.ysp == null) ekle('eksik', 1000, d, null, `${d}. gün ${YUVA_AD.ysp} nöbet branşı boş`, {yuva: 'ysp'});
      if (!surTamam) ekle('eksik', 1000, d, null, `${d}. gün ${YUVA_AD.sur} nöbet branşı ${L.surG == null && L.surA == null && L.sur == null ? 'boş' : 'eksik (12 saatlik yarısı boş)'}`, {yuva: 'sur'});
      if (L.sur != null && (L.surG != null || L.surA != null)) ekle('cakisma', 800, d, L.sur, `${d}. gün sürücü nöbet branşında hem 24 saat hem 12 saatlik atama var`);
    }
    P.forEach(p => {
      const L = gorev.get(p.id).slice().sort((a, b) => a.gun - b.gun), gunde = {};
      L.forEach(x => { (gunde[x.gun] = gunde[x.gun] || []).push(x); });
      // yetenek, izin, istek, aynı gün çakışma
      L.forEach(x => {
        const yuva = x.tip === 'bol' ? x.yuva : x.tip === 'surG' || x.tip === 'surA' ? 'sur' : x.tip;
        if (!p.yet.includes(yuva)) ekle('yetenek', 900, x.gun, p.id, `${p.ad}: ${YUVA_AD[yuva]} nöbet branşında görevlendirilemez`);
        if (p.izin.has(x.gun)) ekle('izin', 900, x.gun, p.id, `${p.ad}: ${x.gun}. gün izinli`);
        else if (p.istek.has(x.gun)) ekle('istek', 80, x.gun, p.id, `${p.ad}: ${x.gun}. gün nöbet istemiyor`);
        if (p.once.has(x.gun) && !p.izin.has(x.gun)) ekle('izinOnce', 300, x.gun, p.id, `${p.ad}: yıllık izin öncesi ${K.izinOnce} gün boşluk kuralı (${x.gun}. gün)`);
      });
      Object.keys(gunde).forEach(d => { if (gunde[d].length > 1 && !kombiUygun(gunde[d], p)) ekle('cakisma', 800, +d, p.id, `${p.ad}: ${d}. gün birden fazla nöbet branşında`); });
      (p.donus || new Set()).forEach(d => { if (!gunde[d]) ekle('donus', 600, d, p.id, `${p.ad}: ${d}. gün izin / rapor dönüşü — işe başladığı gün nöbete girmeli`); });
      // nöbet muafiyetli (gündüz 8 saat): dinlenme / aralık kuralları uygulanmaz; yalnız toplam saat planlananla karşılaştırılır
      if (p.gunduz) { const b8 = Math.round(L.reduce((t, x) => t + (x.saat != null ? x.saat : 24), 0) / 24 * 100) / 100; if (Math.abs(b8 - (p.plan || 0)) > 0.34) ekle('adet', 20 * Math.abs(b8 - (p.plan || 0)), 0, p.id, `${p.ad}: gündüz mesaisi ${p.plan || 0} nöbet karşılığı, listede ${b8}`, {fark: b8 - (p.plan || 0)}); return; }
      // 24 saatlik nöbetler: dinlenme (min boşluk gün) ve sürücü gün aşırı 3
      const onc = p.onc || {t24: [], s24: [], A: [], G: []}, oAd = d => d <= 0 ? `önceki ayın ${d === 0 ? 'son' : `sondan ${1 - d}.`} günü` : `${d}. gün`;      // önceki ayın son günleri (0, -1 …)
      const g24 = [...onc.t24, ...L.filter(x => !(x.tip === 'surG' || x.tip === 'surA')).map(x => x.gun)].sort((a, b) => a - b);
      for (let i = 1; i < g24.length; i++) if (g24[i] >= 1 && g24[i] - g24[i - 1] - 1 < K.minAra) ekle('dinlenme', 700, g24[i], p.id, `${p.ad}: ${oAd(g24[i - 1])} ve ${g24[i]}. gün art arda 24 saatlik nöbet (arada en az ${K.minAra} gün boşluk gerekir)`);
      if (K.surGunAsiri) {
        const s24 = new Set([...onc.s24, ...L.filter(x => x.tip === 'sur').map(x => x.gun)]);
        s24.forEach(d => { if (d + 4 >= 1 && s24.has(d + 2) && s24.has(d + 4)) ekle('surGunAsiri', 300, d + 4, p.id, `${p.ad}: ${d}., ${d + 2}., ${d + 4}. gün sürücü olarak gün aşırı üst üste 3 nöbet (24 saat)`); });
      }
      // işçi: art arda 3 gece; gecenin ertesi günü gündüz vardiyası
      if (p.isci) {
        const A = new Set([...onc.A, ...L.filter(x => x.tip === 'surA').map(x => x.gun)]), G = new Set(L.filter(x => x.tip === 'surG').map(x => x.gun));
        if (K.isciGece) A.forEach(d => { if (d + 2 >= 1 && A.has(d + 1) && A.has(d + 2)) ekle('isciGece', 300, d + 2, p.id, `${p.ad}: ${d}., ${d + 1}., ${d + 2}. gün art arda 3 gece`); });
        G.forEach(d => { if (A.has(d - 1)) ekle('dinlenme', 700, d, p.id, `${p.ad}: ${d - 1}. gün gece nöbetinden sonra ${d}. gün gündüz nöbeti (dinlenme yok)`); });
        const aBu = [...A].filter(d => d >= 1).length; if (Math.abs(G.size - aBu) > 1) ekle('gunGece', 120 * (Math.abs(G.size - A.size) - 1), 0, p.id, `${p.ad}: gündüz ${G.size}, gece ${A.size} nöbet (gece / gündüz eşit dağılmalı)`);
      }
      // iki nöbet arası en fazla maxAra gün (izin araya giriyorsa sayılmaz)
      const tum = L.map(x => x.gun).filter((d, i, a) => a.indexOf(d) === i);
      for (let i = 1; i < tum.length; i++) {
        const a = tum[i - 1], b = tum[i], bosGun = b - a - 1;
        if (bosGun > K.maxAra) { let izinAra = false; for (let d = a + 1; d < b; d++) if (p.izin.has(d)) izinAra = true; if (!izinAra) ekle('aralik', 60 * (bosGun - K.maxAra), b, p.id, `${p.ad}: ${a}. ve ${b}. gün nöbetleri arası ${bosGun} gün (en fazla ${K.maxAra})`, {a, b}); }
      }
      // hafta sonu / resmî tatil dengesi
      if (H.ozelSay > 0 && L.length >= 2) { const oz = new Set(L.filter(x => H.ozel[x.gun]).map(x => x.gun)).size, c = ozelCeza(L.filter(x => H.ozel[x.gun]).length, L.length, H.ozelOran); if (c > 0) ekle('ozelGun', c, 0, p.id, `${p.ad}: ${L.filter(x => H.ozel[x.gun]).length} hafta sonu / resmî tatil nöbeti (dengeli dağılımda ≈ ${(L.length * H.ozelOran).toFixed(1)})`); }
      // nöbet sayısı: planlanan ile yazılan
      // bölünmüş nöbet saatine göre kısmi sayılır (12 sa = 0,5; 8 sa = 0,33; 16 sa = 0,67)
      const birim = Math.round((L.filter(x => !(x.tip === 'surG' || x.tip === 'surA')).reduce((t, x) => t + (x.saat != null ? x.saat / 24 : 1), 0) + 0.5 * L.filter(x => x.tip === 'surG' || x.tip === 'surA').length) * 100) / 100, hedef = p.plan != null ? p.plan : p.hedef24 + p.hedefYarim / 2;      // küsuratlı plan (7,67) bölünmüş nöbetle karşılanır
      if (Math.abs(birim - hedef) > 0.05) ekle('adet', 40 * Math.abs(birim - hedef), 0, p.id, `${p.ad}: planlanan ${hedef} nöbet, listede ${birim}`, {fark: birim - hedef});
    });
    const toplam = ihlal.reduce((x, i) => x + i.agirlik, 0), say = {};
    ihlal.forEach(i => { say[i.tur] = (say[i.tur] || 0) + 1; });
    return {toplam, ihlal, say, gorev};
  }

  // ---- Yeni üretici: sayıları kesin koruyan kurucu + benzetilmiş tavlama ----
  // 1) Nöbet adetleri (24 saatlik: es/ysp/sur/surM; işçi 12 saatlik: surG/surA) akış ile nöbet branşlarına dağıtılır → her kişi en fazla adedi kadar alır (kadro yetmezse yuva boş kalır)
  //    surM: tek işçili günde sürücünün diğer 12 saati — sürücülüğü doğrulanmış AABT / ATT; aynı gün başka branşın 12 saatiyle birlikte 24 saat sayılır (kombiYerlestir)
  // 2) Kişinin nöbetleri ay boyunca eşit aralıklı günlere yerleştirilir
  // 3) Yalnızca iki yuvanın içeriğini takas eden hamlelerle (adetler değişmez) kural ihlalleri tavlama ile giderilir
  function uret2(H, seed, sureMs, basla) {
    const {N, P, K} = H, R = rng(seed), m = P.length, t0 = Date.now();
    const u24 = P.map(p => p.isci ? 0 : p.hedef24), dz = isciDuzen(P.map(p => p.isci ? p.hedefYarim : 0), N), uh = dz.uh, gunIsci = dz.D1 + dz.D2;
    const elig = (i, t) => { const p = P[i]; if (t === 'surG' || t === 'surA') return p.isci && uh[i] > 0; if (p.isci) return false; return t === 'surM' ? p.yet.includes('sur') : p.yet.includes(t); };
    // işçi gündüz/gece vardiyası olan günler ay boyunca eşit aralıklı seçilir (art arda üç işçi günü olmaz: iki işçiyle gece kuralı tutmaz);
    // aralıklı düzenin kayması, hafta sonu / tatil günü payı oranına en yakın olanı seçilerek ayarlanır (24 saatlik sürücü günleri de dengeli kalsın)
    let isciGun = new Set();
    { let enFark = Infinity;
      for (let dn = 0; dn < 12 && gunIsci > 0; dn++) {
        const off = dn === 0 ? 0.5 : R(), set = new Set(); for (let j = 0; j < gunIsci; j++) set.add(Math.min(N, 1 + Math.floor((j + off) * N / gunIsci)));
        if (set.size !== gunIsci) continue;
        let oz = 0; set.forEach(d => { if (H.ozel[d]) oz++; });
        const fark = Math.abs(oz - gunIsci * H.ozelOran) + (dn === 0 ? 0 : 0.01); if (fark < enFark) { enFark = fark; isciGun = set; }
      }
      if (!isciGun.size) for (let j = 0; j < gunIsci; j++) isciGun.add(1 + Math.floor((j + 0.5) * N / gunIsci)); }
    // iki işçili günler (gündüz + gece işçi) işçi günleri arasından eşit aralıklı seçilir; tek işçili günlerde işçi vardiyası gündüz / gece sırayla
    // (önceki gün gece vardiyası varsa ertesi gün gündüz verilmez: gece; iki gece üst üste olduysa gündüz)
    const iG = [...isciGun].sort((a, b) => a - b), cift = new Set(); for (let j = 0; j < dz.D2; j++) cift.add(iG[Math.min(iG.length - 1, Math.floor((j + 0.5) * iG.length / dz.D2))]);
    // gece vardiyasının ertesi günü gündüz olmaz: art arda işçi günlerinde önce gündüz, sonra gece; tek başına günde gündüz / gece sayısı dengelenir
    const gunTip = {}, say = {surG: 0, surA: 0}, isciG = new Set(iG);
    iG.forEach(d => { if (cift.has(d)) { gunTip[d] = 'cift'; return; }
      const A = x => gunTip[x] === 'cift' || gunTip[x] === 'surA'; let t;
      if (A(d - 1)) t = A(d - 2) ? 'surG' : 'surA'; else if (isciG.has(d + 1) && !cift.has(d + 1)) t = 'surG'; else t = say.surG > say.surA ? 'surA' : 'surG';
      gunTip[d] = t; say[t]++; });
    const slotD = [], slotT = [], gunSlot = Array.from({length: N + 1}, () => []), isciYari = {};
    const ekle = (d, t) => { gunSlot[d].push(slotD.length); slotD.push(d); slotT.push(t); };
    for (let d = 1; d <= N; d++) { ekle(d, 'es'); ekle(d, 'ysp'); const gt = gunTip[d];
      if (gt === 'cift') { ekle(d, 'surG'); ekle(d, 'surA'); } else if (gt) { ekle(d, gt); ekle(d, 'surM'); isciYari[d] = gt; } else ekle(d, 'sur'); }
    const S = slotD.length, cont = new Int16Array(S).fill(-1), place = P.map(() => []);
    const sinif = t => (t === 'surG' || t === 'surA') ? 1 : 0, grupT = t => t === 'surM' ? 'sur' : t;
    const tipSlot = {}; ['es', 'ysp', 'sur', 'surM', 'surG', 'surA'].forEach(t => { tipSlot[t] = []; }); for (let s = 0; s < S; s++) tipSlot[slotT[s]].push(s);
    // 1) adetleri nöbet branşlarına dağıt (maksimum akış; her kişi için 24 saatlik ve yarım birimleri ayrı düğüm)
    const tipler = ['es', 'ysp', 'sur', 'surM', 'surG', 'surA'], need = tipler.map(t => tipSlot[t].length);
    const V = 2 + 2 * m + tipler.length, SRC = 0, SNK = 1, cap = Array.from({length: V}, () => new Array(V).fill(0));
    P.forEach((p, i) => {
      cap[SRC][2 + i] = u24[i]; cap[SRC][2 + m + i] = uh[i];
      tipler.forEach((t, k) => { if (!elig(i, t)) return; if (t === 'es' && attMi(p)) return; const dugum = sinif(t) ? 2 + m + i : 2 + i; cap[dugum][2 + 2 * m + k] = 99; });
    });
    // kadro yetmezse öncelik: önce sürücü, sonra ekip şefi, en son YSP doldurulur (artırma yolları aşamalı açılır; dolan branş sonradan azalmaz).
    // ATT ekip şefi nöbetine (doktorsuz ekipte) yalnız doktor / AABT yetmezse, YSP'den önce girer.
    for (const faz of [['sur', 'surM', 'surG', 'surA'], ['es'], ['attEs'], ['ysp']]) { faz.forEach(t => { if (t === 'attEs') { P.forEach((p, i) => { if (attMi(p) && elig(i, 'es')) cap[2 + i][2 + 2 * m + tipler.indexOf('es')] = 99; }); return; } const k = tipler.indexOf(t); cap[2 + 2 * m + k][SNK] = need[k]; });
  for (;;) { const par = new Array(V).fill(-1); par[SRC] = SRC; const q = [SRC]; while (q.length && par[SNK] < 0) { const u = q.shift(); for (let v = 0; v < V; v++) if (par[v] < 0 && cap[u][v] > 0) { par[v] = u; q.push(v); } } if (par[SNK] < 0) break; let f = 1e9; for (let v = SNK; v !== SRC; v = par[v]) f = Math.min(f, cap[par[v]][v]); for (let v = SNK; v !== SRC; v = par[v]) { cap[par[v]][v] -= f; cap[v][par[v]] += f; } } }
    const tahsis = P.map((p, i) => tipler.map((t, k) => cap[2 + 2 * m + k][sinif(t) ? 2 + m + i : 2 + i]));
    // 2) her nöbet branşı için kişilerin birimlerini eşit aralıklı hedef zamanlarla sıralayıp slotlara yerleştir
    tipler.forEach((t, k) => {
      const items = []; P.forEach((p, i) => { const u = tahsis[i][k]; if (!u) return; const off = R(); for (let j = 0; j < u; j++) items.push({i, z: (j + off) / u + R() * 0.02}); });
      items.sort((x, y) => x.z - y.z); const sl = tipSlot[t], Rn = items.length;
      items.forEach((it, r) => { let c = Math.min(sl.length - 1, Math.floor((r + 0.5) * sl.length / Rn)); const c0 = c; while (c < sl.length && cont[sl[c]] >= 0) c++; if (c >= sl.length) { c = c0; while (c >= 0 && cont[sl[c]] >= 0) c--; } if (c < 0) return; cont[sl[c]] = it.i; place[it.i].push(sl[c]); });
    });
    // başlangıç listesi verilmişse (önceki en iyi sonuç) oradan düşük sıcaklıkla iyileştirilir; yuva düzeni aynıysa uygulanır
    let T0x = 160;
    if (basla) { const idx = new Map(P.map((p, i) => [p.id, i])); let uyum = true; const yeni = new Int16Array(S).fill(-1);
      for (let s2 = 0; s2 < S && uyum; s2++) { const t2 = slotT[s2] === 'surM' ? (isciYari[slotD[s2]] === 'surG' ? 'surA' : 'surG') : slotT[s2], id = basla[slotD[s2]] && basla[slotD[s2]][t2]; if (id == null) { continue; } if (!idx.has(id)) { uyum = false; break; } yeni[s2] = idx.get(id); }
      if (uyum) { cont.set(yeni); place.forEach((_, i) => { place[i] = []; }); for (let s2 = 0; s2 < S; s2++) if (cont[s2] >= 0) place[cont[s2]].push(s2); T0x = 45; } }
    const hasDay = P.map(() => new Uint8Array(N + 2)); place.forEach((pl, i) => pl.forEach(s => { hasDay[i][slotD[s]]++; }));
    // maliyet
    const pcost = i => {
      const p = P[i], pl = place[i]; let c = 0;
      (p.donus || new Set()).forEach(d => { if (!hasDay[i][d]) c += 600; });                 // izin / rapor dönüş günü nöbette olmalı
      if (!pl.length) return c; const o = p.onc || {}, g24 = [...(o.t24 || [])], all = [], A = new Set(o.A || []), G = new Set(), s24 = new Set(o.s24 || []);      // önceki ayın son günleri
      for (const s of pl) { const d = slotD[s], t = slotT[s]; all.push(d);
        if (p.izin.has(d)) c += 900; else if (p.istek.has(d)) c += 80;
        if (p.once.has(d) && !p.izin.has(d)) c += 300;
        if (t === 'surA') A.add(d); else if (t === 'surG') G.add(d); else { g24.push(d); if (t === 'sur') s24.add(d); }
        if (!p.isci && (t === 'sur' || t === 'surM' || t === 'surG' || t === 'surA')) c += Math.round(30 * (1 - p.surPay)); }      // sürücü nöbeti önce sürücü payı yüksek olana
      const gv = new Set(); for (const d of all) { if (gv.has(d)) c += 800; gv.add(d); }          // aynı gün birden fazla nöbet
      g24.sort((a, b) => a - b); for (let k = 1; k < g24.length; k++) if (g24[k] >= 1 && g24[k] - g24[k - 1] - 1 < K.minAra) c += 700;
      if (K.surGunAsiri) s24.forEach(d => { if (d + 4 >= 1 && s24.has(d + 2) && s24.has(d + 4)) c += 300; });
      if (p.isci) { if (K.isciGece) A.forEach(d => { if (d + 2 >= 1 && A.has(d + 1) && A.has(d + 2)) c += 300; }); G.forEach(d => { if (A.has(d - 1)) c += 700; }); { const aBu = [...A].filter(d => d >= 1).length; if (Math.abs(G.size - aBu) > 1) c += 120 * (Math.abs(G.size - aBu) - 1); }; }
      const tum = [...new Set(all)].sort((a, b) => a - b);
      for (let k = 1; k < tum.length; k++) { const bos = tum[k] - tum[k - 1] - 1; if (bos > K.maxAra) { let iz = false; for (let d = tum[k - 1] + 1; d < tum[k]; d++) if (p.izin.has(d)) { iz = true; break; } if (!iz) c += 60 * (bos - K.maxAra); } }
      if (H.ozelSay > 0 && pl.length >= 2) { let oz = 0; for (const s of pl) if (H.ozel[slotD[s]]) oz++; c += ozelCeza(oz, pl.length, H.ozelOran); }
      return c;
    };
    const pc = P.map((_, i) => pcost(i)); let toplam = pc.reduce((x, v) => x + v, 0), en = toplam, enCont = Int16Array.from(cont);
    // 3) tavlama: iki slotun içeriğini takas et
    const dolu = []; for (let s = 0; s < S; s++) if (cont[s] >= 0) dolu.push(s);
    const sure = Math.max(50, sureMs - (Date.now() - t0)), T0 = T0x, T1 = 6; let it = 0;
    while (toplam > 0) {
      const el = Date.now() - t0; if (el >= sureMs) break;
      const frac = (el) / sureMs, T = T0 * Math.pow(T1 / T0, frac);
      for (let rep = 0; rep < 200; rep++) {
        it++;
        // a: ihlalli kişinin bir nöbeti (çoğunlukla) ya da rastgele dolu slot
        let a; if (R() < 0.75) { const bad = []; for (let i = 0; i < m; i++) if (pc[i] > 0) bad.push(i); if (bad.length) { const pl = place[bad[Math.floor(R() * bad.length)]]; a = pl[Math.floor(R() * pl.length)]; } }
        if (a === undefined) { if (!dolu.length) break; a = dolu[Math.floor(R() * dolu.length)]; }
        const da = slotD[a]; let b;
        if (R() < 0.6) { const dd = Math.min(N, Math.max(1, da + Math.floor(R() * 13) - 6)); const gs = gunSlot[dd]; b = gs[Math.floor(R() * gs.length)]; } else b = Math.floor(R() * S);
        if (b === a) continue;
        const ca = cont[a], cb = cont[b], db = slotD[b]; if (ca === cb) continue;
        if (sinif(slotT[a]) !== sinif(slotT[b])) continue;         // 24 saatlik ve yarım nöbetler birbirine karışmaz (adetler korunur)
        if ((ca < 0 || cb < 0) && grupT(slotT[a]) !== grupT(slotT[b])) continue;
        if (slotT[a] !== slotT[b] && ((slotT[b] === 'es' && ca >= 0 && attMi(P[ca])) || (slotT[a] === 'es' && cb >= 0 && attMi(P[cb])))) continue;      // ATT'nin ekip şefi sayısı akışta belirlenir, takasla artmaz      // boşluk başka branşa taşınmaz (öncelik: sürücü → ekip şefi → YSP korunur)
        if (ca >= 0 && !elig(ca, slotT[b])) continue; if (cb >= 0 && !elig(cb, slotT[a])) continue;
        if (ca >= 0 && db !== da && hasDay[ca][db]) continue; if (cb >= 0 && db !== da && hasDay[cb][da]) continue;
        const eski = (ca >= 0 ? pc[ca] : 0) + (cb >= 0 ? pc[cb] : 0);
        // uygula
        cont[a] = cb; cont[b] = ca;
        if (ca >= 0) { place[ca][place[ca].indexOf(a)] = b; hasDay[ca][da]--; hasDay[ca][db]++; }
        if (cb >= 0) { place[cb][place[cb].indexOf(b)] = a; hasDay[cb][db]--; hasDay[cb][da]++; }
        const na = ca >= 0 ? pcost(ca) : 0, nb = cb >= 0 ? pcost(cb) : 0, delta = na + nb - eski;
        if (delta <= 0 || R() < Math.exp(-delta / T)) {
          if (ca >= 0) pc[ca] = na; if (cb >= 0) pc[cb] = nb; toplam += delta;
          if (toplam < en) { en = toplam; enCont = Int16Array.from(cont); if (en === 0) break; }
        } else {
          cont[a] = ca; cont[b] = cb;
          if (ca >= 0) { place[ca][place[ca].indexOf(b)] = a; hasDay[ca][db]--; hasDay[ca][da]++; }
          if (cb >= 0) { place[cb][place[cb].indexOf(a)] = b; hasDay[cb][da]--; hasDay[cb][db]++; }
        }
      }
    }
    // surM → işçinin tutmadığı 12 saatlik yarı (gündüz / gece)
    const liste = bos(N); for (let s = 0; s < S; s++) { const c = enCont[s]; if (c < 0) continue; const d = slotD[s], t = slotT[s]; liste[d][t === 'surM' ? (isciYari[d] === 'surG' ? 'surA' : 'surG') : t] = P[c].id; }
    return {liste, iter: it, ceza: en};
  }

  // Kapasite analizi: kişilerin nöbet branşı yetenekleri ve adetleri ile en fazla kaç yuva doldurulabilir; nöbet branşı bazında kaçının boş kalacağı
  function kapasiteAnalizi(girdi, kural) {
    const H = hazirla(girdi, kural), P = H.P, N = H.N, M = P.filter(p => !p.isci), m = M.length;
    const dz = isciDuzen(P.map(p => p.isci ? p.hedefYarim : 0), N);
    // nöbet listesiyle aynı model: işçi vardiyaları işçilerce tutulur; geri kalan her gün ekip şefi + YSP ve iki işçili gün dışında sürücünün 24 saatlik birimi
    // (tek işçili günde 12 saat sürücü + 12 saat başka branş, birleşik görev). Kadro yeterliyse birleşik görev fazlalığı kesirle geri alınır.
    // Sürüm 13.78 (HUSER 13.77.1): hesap 12 saatlik birimle — işçili günde sürücünün boş 12 saati yarım nöbettir (nöbet listesi de 0,5 sayar);
    // eskiden tam nöbet sayıldığı için işçili istasyonda olmayan açık (ör. YSP 7 gün) görünüyordu
    const need = {es: 2 * N, ysp: 2 * N, sur: 2 * (N - dz.D2 - dz.D1), surM: dz.D1}, tipler = Object.keys(need), V = 2 + m + tipler.length, cap = Array.from({length: V}, () => new Array(V).fill(0));
    M.forEach((p, i) => { cap[0][2 + i] = 2 * p.hedef24; tipler.forEach((t, k) => { if (t === 'es' && attMi(p)) return; if (p.yet.includes(t === 'surM' ? 'sur' : t)) cap[2 + i][2 + m + k] = 999; }); });
    // nöbet listesiyle aynı öncelik: sürücü → ekip şefi → YSP; ATT ekip şefine en son
    for (const faz of [['sur', 'surM'], ['es'], ['attEs'], ['ysp']]) { faz.forEach(t => { if (t === 'attEs') { M.forEach((p, i) => { if (attMi(p) && p.yet.includes('es')) cap[2 + i][2 + m + tipler.indexOf('es')] = 999; }); return; } cap[2 + m + tipler.indexOf(t)][1] = need[t]; });
  for (;;) { const par = new Array(V).fill(-1); par[0] = 0; const q = [0]; while (q.length && par[1] < 0) { const u = q.shift(); for (let w = 0; w < V; w++) if (par[w] < 0 && cap[u][w] > 0) { par[w] = u; q.push(w); } } if (par[1] < 0) break; let f = 1e9; for (let w = 1; w !== 0; w = par[w]) f = Math.min(f, cap[par[w]][w]); for (let w = 1; w !== 0; w = par[w]) { cap[par[w]][w] -= f; cap[w][par[w]] += f; } } }
    // bos: gün (nöbet) cinsinden; sürücüde işçili günün boş 12 saati yarım gün sayılır (bosYari: boş 12 saatlik vardiya sayısı). gunSay: boş kalan gün-branş sayısı
    const b = {}; tipler.forEach((t, k) => { b[t] = cap[2 + m + k][1]; });
    const g = x => Math.ceil(x / 2 - 1e-9), bos = {}; if (b.es) bos.es = b.es / 2; if (b.ysp) bos.ysp = b.ysp / 2; if (b.sur || b.surM) bos.sur = (b.sur + b.surM) / 2;
    return {toplam: (b.es + b.ysp + b.sur + b.surM) / 2, gunSay: g(b.es) + g(b.ysp) + g(b.sur) + b.surM, bos, surTam: b.sur / 2, surYari: b.surM, isciGun: dz.D1 + dz.D2, isciCift: dz.D2, kombi: dz.D1};
  }

  // Kural ihlalleri: boş yuva, yetenek dışı, izinli kişiye nöbet, aynı gün çift görev, dinlenme, izin öncesi boşluk, gün aşırı sürücü, 3 gece, azami aralık. Bunlar kalmamalıdır (istek ve nöbet sayısı farkı tercihtir; hafta sonu dengesi de kural gibi zorlanır).
  const SERT = new Set(['eksik', 'yetenek', 'izin', 'cakisma', 'dinlenme', 'izinOnce', 'surGunAsiri', 'isciGece', 'aralik', 'ozelGun', 'gunGece', 'donus']);

  // Sürüm 13.57: nöbet muafiyetli personel her iş günü (hafta içi, resmî tatil ve izin hariç) 09:00–17:00 yazılır: o gün bir nöbet branşının ilk 8 saati,
  // aynı nöbetin kalan 16 saati branşı tutan kişide (bölünmüş nöbet). Planlananın üstünde saati olan kişinin nöbeti tercih edilir.
  function muafYerlestir(liste, H) {
    const {N, P, byId} = H, M = P.filter(p => p.gunduz && !p.isci); if (!M.length) return 0;
    const saat = saatleri(liste, H), fazla = id => { const p = byId.get(id); return p && p.plan != null ? saat.get(id) - p.plan * 24 : 0; };
    let n = 0;
    for (let d = 1; d <= N; d++) {
      if (H.ozel[d]) continue;      // hafta sonu / resmî tatil
      for (const p of M) {
        const L = liste[d]; if (p.izin.has(d) || gundeMi(L, p.id) || (p.plan != null && saat.get(p.id) + 8 > p.plan * 24 + 4)) continue;
        const ad = p.yet.filter(y => y !== 'sur' && L[y] != null && !(L.bol && L.bol[y]) && !(byId.get(L[y]) || {}).gunduz); if (!ad.length) continue;
        const y = ad.sort((a, b) => fazla(L[b]) - fazla(L[a]))[0], X = L[y];
        L.bol = {...(L.bol || {}), [y]: {id: X, saat: 16}}; L[y] = p.id; saat.set(X, saat.get(X) - 8); saat.set(p.id, saat.get(p.id) + 8); n++;
      }
    }
    return n;
  }
  // Tek işçili gün: sürücünün diğer 12 saatini tutan (işçi olmayan) kişi aynı gün başka nöbet branşının (YSP / ekip şefi) 12 saatini de tutar → 24 saat.
  // Gece sürücüsü (21:00–09:00) branşın ilk parçasını (09:00–21:00), gündüz sürücüsü ikinci parçasını alır. Branşın diğer 12 saati o branşı tutan kişide kalır;
  // planlananın üstünde saati olan kişinin branşı tercih edilir (saatler dengelenir).
  // kişilerin listedeki saatleri (bölünmüş nöbet dahil) ve kendilerine ayrılan saat (işçi: vardiya × 12, diğerleri: nöbet adedi × 24)
  const saatleri = (liste, H) => { const saat = new Map(H.P.map(p => [p.id, 0]));
    for (let d = 1; d <= H.N; d++) { const L = liste[d]; ['es', 'ysp', 'sur', 'surG', 'surA'].forEach(t => { const id = L[t]; if (id != null && saat.has(id)) saat.set(id, saat.get(id) + (t === 'surG' || t === 'surA' ? 12 : L.bol && L.bol[t] ? 24 - L.bol[t].saat : 24)); });
      Object.entries(L.bol || {}).forEach(([t, b]) => { if (b && saat.has(b.id) && L[t] != null) saat.set(b.id, saat.get(b.id) + b.saat); }); }
    return saat; };
  const hak = p => p.isci ? p.hedefYarim * 12 : p.hedef24 * 24;
  const gundeMi = (L, id) => ['es', 'ysp', 'sur', 'surG', 'surA'].some(t => L[t] === id) || Object.values(L.bol || {}).some(b => b && b.id === id);
  // Boş kalan nöbetler, kendine ayrılan saatin altında kalan kişilerle (yalnızca o saat kadar) doldurulur; kural ihlali artıyorsa yazılmaz.
  // Böylece kimse adedinin üstüne çıkmaz; tek işçili günde 12 saati boşta kalan sürücü önce başka günün boş sürücü vardiyasına yazılır.
  function bosDoldur(liste, H) {
    const {N, P} = H, saat = saatleri(liste, H), disi = () => { const r = denetle(liste, H).ihlal; return sertSay(r) - r.filter(i => i.tur === 'eksik').length; };
    let taban = disi(), n = 0; const t0 = Date.now();
    const dene = (L, t, p, sa) => { L[t] = p.id; const x = disi(); if (x <= taban) { taban = x; saat.set(p.id, saat.get(p.id) + sa); n++; return true; } L[t] = null; return false; };
    for (let d = 1; d <= N && Date.now() - t0 < 2000; d++) {
      const L = liste[d], aday = (f, sa) => P.filter(p => f(p) && !p.izin.has(d) && !gundeMi(L, p.id) && hak(p) - saat.get(p.id) >= sa).sort((a, b) => (hak(b) - saat.get(b.id)) - (hak(a) - saat.get(a.id)));
      ['es', 'ysp'].forEach(t => { if (L[t] != null) return; for (const p of aday(q => !q.isci && q.yet.includes(t), 24).sort((a, c) => t === 'es' ? attMi(a) - attMi(c) : 0)) if (dene(L, t, p, 24)) break; });
      if (L.sur != null) continue;
      if (L.surG == null && L.surA == null) for (const p of aday(q => !q.isci && q.yet.includes('sur'), 24)) if (dene(L, 'sur', p, 24)) break;
      if (L.sur != null) continue;
      ['surG', 'surA'].forEach(t => { if (L[t] != null) return; for (const p of aday(q => q.yet.includes('sur'), 12)) if (dene(L, t, p, 12)) break; });
    }
    return n;
  }
  function kombiYerlestir(liste, H) {
    const {N, P, byId} = H, saat = saatleri(liste, H);
    const fazla = id => { const p = byId.get(id); return p && p.plan != null ? saat.get(id) - p.plan * 24 : 0; };
    let n = 0;
    for (let d = 1; d <= N; d++) {
      const L = liste[d];
      for (const T of ['surG', 'surA']) {
        const p = byId.get(L[T]); if (!p || p.isci || hak(p) - saat.get(p.id) < 12) continue;      // ayrılan saati dolmuşsa (boş vardiyaya yazıldıysa) birleşik görev verilmez
        if (['es', 'ysp', 'sur', T === 'surG' ? 'surA' : 'surG'].some(t => L[t] === p.id) || Object.values(L.bol || {}).some(b => b && b.id === p.id)) continue;
        const ad = ['ysp', 'es'].filter(B => p.yet.includes(B) && L[B] != null && !(L.bol && L.bol[B]) && !(byId.get(L[B]) || {}).isci);
        if (!ad.length) continue;
        const B = ad.sort((x, y) => fazla(L[y]) - fazla(L[x]))[0], X = L[B];
        L.bol = {...(L.bol || {}), [B]: T === 'surA' ? {id: X, saat: 12} : {id: p.id, saat: 12}};
        if (T === 'surA') L[B] = p.id;
        saat.set(X, saat.get(X) - 12); saat.set(p.id, saat.get(p.id) + 12); n++;
      }
    }
    return n;
  }

  // İzin / rapor dönüşü: işe başladığı gün nöbette olmayan kişi yerleştirilir. Sıra: boş uygun nöbet branşı → dönüşü olmayan
  // birinin tuttuğu uygun nöbet branşı (o kişi bu nöbeti bırakır) → aynı gün dönen başka birinin nöbeti 12/12 bölünür.
  function donusYerlestir(liste, H) {
    const {P} = H, gunde = (id, d) => { const L = liste[d]; return ['es', 'ysp', 'sur', 'surG', 'surA'].some(t => L[t] === id) || Object.values(L.bol || {}).some(b => b && b.id === id); };
    let yer = 0, bol = 0;
    P.forEach(p => (p.donus || new Set()).forEach(d => {
      if (!liste[d] || gunde(p.id, d)) return;
      const L = liste[d];
      if (p.isci) { const t = L.sur == null && ['surG', 'surA'].find(x => L[x] == null); if (t) { L[t] = p.id; yer++; } return; }      // işçi yalnız boş 12 saatlik vardiyaya
      const yuvalar = p.yet.filter(y => y !== 'sur' || (L.surG == null && L.surA == null));
      const bosY = yuvalar.find(y => L[y] == null && !(y === 'sur' && (L.surG != null || L.surA != null)));
      if (bosY) { L[bosY] = p.id; yer++; return; }
      const donen = id => { const q = H.byId.get(id); return !!q && q.donus && q.donus.has(d); };
      const yuvalar2 = attMi(p) ? yuvalar.filter(y => y !== 'es') : yuvalar;      // ATT başkasının ekip şefi nöbetini almaz
      const alY = yuvalar2.find(y => L[y] != null && !donen(L[y]) && !(L.bol && L.bol[y]));
      if (alY) { L[alY] = p.id; yer++; return; }
      const bolY = yuvalar2.find(y => L[y] != null && donen(L[y]) && !(L.bol && L.bol[y]));
      if (bolY) { L.bol = {...(L.bol || {}), [bolY]: {id: p.id, saat: 12}}; bol++; }
    }));
    return {yer, bol};
  }
  const sertSay = ihlal => ihlal.filter(i => SERT.has(i.tur)).length;
  // Küsurat dengeleme: tam sayıya yukarı tamamlanan kişinin (ör. plan 7,67 → 8) bir nöbeti, aşağı kalan kişiyle (7,67 → 7) bölünür:
  // 8/16, 12/12 gibi (saat 4'ün katı; kısa parça her zaman önce). Bölünen kişi o nöbet branşını tutabilmeli, o gün boş olmalı; sert kural ihlali artarsa bölme yapılmaz.
  function kesirDengele(liste, H) {
    const {N, P} = H, yuvalar = ['es', 'ysp', 'sur'], saat = () => { const m = new Map(P.map(p => [p.id, 0])); for (let d = 1; d <= N; d++) { const L = liste[d]; ['es', 'ysp', 'sur', 'surG', 'surA'].forEach(t => { const id = L[t]; if (id == null || !m.has(id)) return; m.set(id, m.get(id) + (t === 'surG' || t === 'surA' ? 12 : L.bol && L.bol[t] ? 24 - L.bol[t].saat : 24)); }); if (L.bol) Object.entries(L.bol).forEach(([t, b]) => { if (b && m.has(b.id) && L[t] != null) m.set(b.id, m.get(b.id) + b.saat); }); } return m; };
    let sert = sertSay(denetle(liste, H).ihlal), bolunen = 0, deneme = 0; const t0 = Date.now();      // deneme ve süre sınırı: büyük / eksik kadroda tarayıcıyı bekletmesin
    for (let tur = 0; tur < 200; tur++) {
      const sa = saat(), fark = p => p.plan == null || p.isci ? 0 : sa.get(p.id) - p.plan * 24;      // saat cinsinden: + fazla, − eksik
      const eksik = P.filter(p => fark(p) <= -4).sort((a, b) => fark(a) - fark(b)), fazla = P.filter(p => fark(p) >= 4).sort((a, b) => fark(b) - fark(a));
      let yapildi = false;
      for (const B of eksik) { for (const A of fazla) {
        const s0 = Math.round(Math.min(-fark(B), fark(A)) / 4) * 4, sa1 = Math.max(4, Math.min(20, s0));
        for (let d = 1; d <= N && !yapildi; d++) {
          const L = liste[d]; if (B.izin.has(d)) continue;
          if (['es', 'ysp', 'sur', 'surG', 'surA'].some(t => L[t] === B.id) || Object.values(L.bol || {}).some(b => b && b.id === B.id)) continue;
          for (const y of yuvalar) { if (L[y] !== A.id || (L.bol && L.bol[y]) || !B.yet.includes(y) || (y === 'es' && attMi(B) && !attMi(A))) continue;
            if (++deneme > 4000 || (deneme % 50 === 0 && Date.now() - t0 > 1500)) return bolunen;
            // kısa parça hep önce: nöbet sahibi (ilk parça, 09:00'dan) kısa süreli olan, ikinci kişi uzun parçayı alır (8 sa → 16 sa)
            const kisaB = sa1 < 12; if (kisaB) L[y] = B.id;
            L.bol = {...(L.bol || {}), [y]: kisaB ? {id: A.id, saat: 24 - sa1} : {id: B.id, saat: sa1}};
            const s2 = sertSay(denetle(liste, H).ihlal);
            if (s2 <= sert) { sert = s2; bolunen++; yapildi = true; break; }
            if (kisaB) L[y] = A.id; delete L.bol[y]; if (!Object.keys(L.bol).length) delete L.bol; }
        }
        if (yapildi) break; }
        if (yapildi) break; }
      if (!yapildi) break;
    }
    return bolunen;
  }

  // Otomatik nöbet listesi. girdi: {y, m, kisiler:[...], tatil:[gün/iso]}. seçenekler: {kural, sureMs, deneme, seed, zorlaMs}
  // Kişiye planlanan nöbet adedinden fazlası yazılmaz: kadro yetmiyorsa yuva BOŞ kalır (kaçınılmaz boşluk sayısı kapasite analizinden bilinir, kalite hesabında sert sayılmaz).
  // Sert ihlal kalırsa süre dolana (zorlaMs) kadar yeni denemeler yapılır (kurallar gevşetilmez). Dönüş: {liste, ihlal, ceza, say, deneme, sureMs, zorlandi, sert, bos, kombi}
  // Üretim adım adım ilerler (generator): her denemeden sonra {oran, deneme} verir. uret: aynı anda (testler); uretAsync: tarayıcıda ilerleme göstererek, arayüzü kilitlemeden.
  function* uretAdim(girdi, sec) {
    const o = {sureMs: 1200, deneme: 4, seed: 1, zorlaMs: 6000, ...(sec || {})}, H = hazirla(girdi, o.kural), t0 = Date.now(), kap = kapasiteAnalizi(girdi, o.kural);
    // kaçınılmaz boşluk: kapasite açığındaki boş gün-branş sayısı (yarısı boş kalan sürücü günü de bir boşluk)
    const kacinilmaz = kap.gunSay;
    const kalite = son => { const eks = son.ihlal.filter(i => i.tur === 'eksik').length; return Math.max(0, sertSay(son.ihlal) - Math.min(eks, kacinilmaz)) * 1e7 + son.toplam; };
    let eniyi = null, kal = Infinity, denendi = 0; const pay = Math.max(200, Math.floor(o.sureMs / o.deneme)), topSure = o.sureMs + o.zorlaMs;
    const dene = (seed, ms, basla) => { denendi++; const r = uret2(H, seed, ms, basla), k = kalite(denetle(r.liste, H)); if (k < kal) { kal = k; eniyi = r.liste; } };
    for (let i = 0; i < o.deneme && Date.now() - t0 < o.sureMs; i++) { dene(o.seed + i * 977, Math.min(pay, o.sureMs - (Date.now() - t0))); if (kal === 0) break; yield {oran: Math.min(0.95, (Date.now() - t0) / (kal >= 1e7 ? topSure : o.sureMs)), deneme: denendi}; }
    let zorlandi = false;
    if (kal >= 1e7) {
      zorlandi = true; const t1 = Date.now(); let n = 0, durgun = 0;
      while (kal >= 1e7 && Date.now() - t1 < o.zorlaMs && durgun < 4) { const ms = Math.min(1500, Math.max(300, o.zorlaMs - (Date.now() - t1))), once = kal; n++; dene(o.seed + 5000 + 131 * n, ms, n % 2 === 0 ? null : eniyi); durgun = kal < once ? 0 : durgun + 1; yield {oran: Math.min(0.95, (Date.now() - t0) / topSure), deneme: denendi}; }      // dönüşümlü: sıfırdan yeni deneme / en iyiden düşük sıcaklıkla iyileştirme; art arda 4 denemede iyileşme yoksa durur
    }
    eniyi = eniyi.map(x => ({...x, ...(x.bol ? {bol: {...x.bol}} : {})}));
    const doldu = bosDoldur(eniyi, H), kombi = kombiYerlestir(eniyi, H), muaf = muafYerlestir(eniyi, H), dy = donusYerlestir(eniyi, H), kesir = kesirDengele(eniyi, H);
    const son = denetle(eniyi, H), bos = son.ihlal.filter(i => i.tur === 'eksik').length;
    return {liste: eniyi, ihlal: son.ihlal, ceza: son.toplam, say: son.say, deneme: denendi, sureMs: Date.now() - t0, zorlandi, sert: sertSay(son.ihlal) - bos, bos, bosYuva: kap.bos, kombi, doldu, muaf, donus: dy, kesir};
  }
  function uret(girdi, sec) { const g = uretAdim(girdi, sec); for (;;) { const x = g.next(); if (x.done) return x.value; } }
  async function uretAsync(girdi, sec, ilerle) { const g = uretAdim(girdi, sec); for (;;) { const x = g.next(); if (x.done) { if (ilerle) ilerle({oran: 1, deneme: x.value.deneme}); return x.value; } if (ilerle) ilerle(x.value); await new Promise(r => setTimeout(r, 0)); } }

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
          const yuva = y === 'surG' || y === 'surA' ? 'sur' : y; if (!p.yet.includes(yuva) || (!(y === 'surG' || y === 'surA') && p.isci)) return;
          const onceki = kopya[ih.gun][y]; kopya[ih.gun][y] = p.id;
          // aynı gün başka nöbet branşında ise vazgeç
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
  // İşçi: 12 saatlik vardiya adedi (planlanan × 2, aşağı yuvarlanır; mesaisinin üstüne çıkılmaz). Diğerleri: 24 saatlik nöbet.
  // Toplam, nöbet branşlarının gerektirdiği nöbet sayısına kadar tamamlanır; azami (ust) aşılmaz. Tek işçili günlerde sürücünün diğer 12 saati başka branştaki 12 saatle
  // aynı kişide birleşir: o gün branşı tutan kişi 12 saat tutar (yukarı tamamlanan kişinin fazlası böylece saat olarak geri alınır).
  function adetHazirla(kisiler, gun) {
    const isci = kisiler.filter(k => k.grup === 'isci'), diger = kisiler.filter(k => k.grup !== 'isci' && !k.gunduz);
    kisiler.filter(k => k.gunduz).forEach(k => { k.adet = 0; k.yarim = 0; });      // nöbet muafiyetli: gündüz 8 saatlik parçalar (muafYerlestir)
    isci.forEach(k => { k.yarim = Math.max(0, Math.floor((k.planlanan || 0) * 2 + 1e-6)); k.adet = 0; });
    const dz = isciDuzen(isci.map(k => k.yarim), gun); isci.forEach((k, i) => { k.yarim = dz.uh[i]; });      // işçi: mesaisine en yakın vardiya (aşağı yuvarlanır), azaltılmaz
    const gerek = gun * 2 + (gun - dz.D2);
    diger.forEach(k => { k.adet = Math.floor((k.planlanan || 0) + 1e-6); k.kesir = (k.planlanan || 0) - k.adet; });
    let fark = gerek - diger.reduce((x, k) => x + k.adet, 0);
    // Küsurat tamamlanırken tek nöbet branşına bağlı gruplar (doktor → yalnız ekip şefi, ATT yalnız YSP → yalnız YSP) o branşın gün sayısını aşmaz;
    // aşarsa artan nöbet esnek gruplara (AABT, sürücü ATT) gider. Böylece Modül 1'de dolu görünen branş Modül 2'de boş kalmaz.
    const tekGrup = {dok: 'dok', ysp: 'ysp'}, grupTop = g => diger.filter(k => k.grup === g).reduce((x, k) => x + k.adet, 0), dolu = k => !!tekGrup[k.grup] && grupTop(k.grup) >= gun;
    const sirala = L => L.sort((a, b) => b.kesir - a.kesir || (b.planlanan || 0) - (a.planlanan || 0));
    const ustu = k => k.ust == null ? 99 : k.ust;
    while (fark > 0) { const L = diger.filter(k => k.adet < ustu(k)); const aday = sirala(L.filter(k => !dolu(k)))[0] || sirala(L)[0]; if (!aday) break; aday.adet++; aday.kesir -= 1; fark--; }
    // Sürüm 13.78: azaminin tam kısmında (8,5 → 8) durulduğu için hâlâ açık kalıyorsa, kesirli azamisi olan kişiler bir üst tam sayıya (9) çıkabilir;
    // fazlası kesirDengele ile aşağı kalan kişilerle bölünmüş nöbete (12/12, 8/16) döner. Böylece kesirli hedefler yüzünden gün boş kalmaz.
    const ustY = k => k.ustYumusak == null ? ustu(k) : Math.max(ustu(k), k.ustYumusak);
    // önce azamiye en çok payı kalan (azami − planlanan büyük), sonra kesri büyük olan: bölünmüş nöbetle geri alınırken azami aşılmaz
    const pay = k => (k.azamiF == null ? 0 : k.azamiF - (k.planlanan || 0));
    const siralaY = L => L.sort((a, b) => pay(b) - pay(a) || b.kesir - a.kesir || (b.planlanan || 0) - (a.planlanan || 0));
    while (fark > 0) { const L = diger.filter(k => k.adet < ustY(k)); const aday = siralaY(L.filter(k => !dolu(k)))[0] || siralaY(L)[0]; if (!aday) break; aday.adet++; aday.kesir -= 1; fark--; }
    while (fark < 0) { const L = diger.filter(k => k.adet > 0), tasan = L.filter(k => tekGrup[k.grup] && grupTop(k.grup) > gun); const aday = (tasan.length ? tasan : L).sort((a, b) => (a.kesir) - (b.kesir) || b.adet - a.adet)[0]; if (!aday) break; aday.adet--; aday.kesir += 1; fark++; }
    return {gerek, gunIsci: dz.D1 + dz.D2, isciCift: dz.D2, kombi: dz.D1, kalanFark: fark};
  }
  return {adetHazirla, kapasiteAnalizi, isciDuzen, kombiYerlestir, uretAsync, hazirla, denetle, uret, oneriler, bos, YETENEK, KURAL, YUVA_AD, KOD, gunSayisi, iso};
})();
if (typeof module !== 'undefined') module.exports = NobetCore;
