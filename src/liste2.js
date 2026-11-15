/* HUSER ASHİ PLANLAMA — Nöbet listesi iyileştirici (Sürüm 13.79 taslağı, 15.11.2026 kullanıcı kuralları).
   Mevcut üreticinin listesini başlangıç alır, tek bir maliyet işleviyle (kurallar tek yerde) tavlama yapar:
   1) nöbet 24 saat; bölünürse 8 / 16 ya da 12 / 12 (saatlik parça yalnız zorda kalınca)
   2) sürücü 24 saat tek kişide; 12 / 12 sürücü yalnız işçi gününde
   3) izinli işçiye vardiya yok
   4) 24 saatten (ve sabah 09:00'da biten parçadan) sonra en az 24 saat dinlenme; gece yarısı en çok 2 art arda, sonra dinlenme;
      gündüz yarısı / parçası sonrası ertesi gün 24 saat ve 3+ art arda gündüz yalnız zorda kalınca
   5) sürücü ATT ekip şefine yazılmaz; o gün nöbette AABT varken ATT ekip şefi tutmaz
   6) kimse planının (en az nöbet) altında kalmaz; fazla serbest (hafif ceza)
   7) bölünmeler en aza ve kişiler arasında (branş gözetmeksizin) dengeli; aynı ikili tekrar etmez
   8) ekip şefi mümkün olduğunca 24 saat
   9) tek işçili günlerin memur sürücü yarısı sürücüler arasında dengeli
   DOM'dan bağımsızdır. */
const ListeIyilestir = (() => {
  const NC = typeof NobetCore !== 'undefined' ? NobetCore : require('./nobet.js');
  const rng = seed => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
  const C = {bos: 20000, uygun: 60000, cakisma: 60000, izin: 60000, dinlenme: 60000, eksikSaat: 2000, fazlaSaat: 3, planSapma: 2, bolme: 60, esBolme: 150, surBolme: 3000, garipParca: 800,
    denge: 60, bolUst: 500, ikili: 120, gunduz24: 250, gunduz3: 90, istek: 80, izinOnce: 300, donus: 600, maxAra: 60, surGunAsiri: 300, yariDenge: 200, yariTek: 900};
  const PARCA = [8, 12, 16, 8, 12, 16, 4, 20];      // 4 / 20 yalnız zorda kalınca (ceza)

  function* iyilestirAdim(girdi, liste0, secenek) {
    const o = {sureMs: 2500, seed: 1, ...(secenek || {})}, H = NC.hazirla(girdi, o.kural), {N, K, P} = H, R = rng(o.seed), t0 = Date.now();
    const ix = new Map(P.map((p, i) => [p.id, i])), m = P.length;
    const surAtt = i => P[i].grup === 'sy';
    const uygun = (i, t) => { const p = P[i]; if (p.isci || p.gunduz) return false; if (t === 'es' && surAtt(i)) return false; return p.yet.includes(t === 'M' ? 'sur' : t); };
    // --- yuvalar: {d, t ('es'|'ysp'|'sur'|'M'), a, b, h (a'nın saati; b yoksa 24 ya da M'de 12), sabit, yari ('G'|'A' : M yuvasının vardiyası)}
    const Y = [], gunY = Array.from({length: N + 2}, () => []), isciVar = Array.from({length: N + 2}, () => []);
    for (let d = 1; d <= N; d++) {
      const L = liste0[d] || {}; const isciG = L.surG != null && P[ix.get(L.surG)] && P[ix.get(L.surG)].isci, isciA = L.surA != null && P[ix.get(L.surA)] && P[ix.get(L.surA)].isci;
      // izinli işçinin vardiyası kaldırılır (kural 3)
      const iG = isciG && !P[ix.get(L.surG)].izin.has(d), iA = isciA && !P[ix.get(L.surA)].izin.has(d);
      if (iG) isciVar[d].push({i: ix.get(L.surG), t: 'G'}); if (iA) isciVar[d].push({i: ix.get(L.surA), t: 'A'});
      ['es', 'ysp'].forEach(t => ekleY(d, t, L));
      if (iG && iA) continue;
      if (iG || iA) { const yari = iG ? 'A' : 'G', kim = yari === 'A' ? L.surA : L.surG, a = kim != null && ix.has(kim) && !P[ix.get(kim)].isci ? ix.get(kim) : (L.sur != null && ix.has(L.sur) ? ix.get(L.sur) : -1);
        const y = {d, t: 'M', a, b: -1, h: 12, sabit: false, yari}; gunY[d].push(Y.length); Y.push(y); continue; }
      // işçisiz gün: sürücü 24 saat (önceki listede memur 12 / 12 ise ilk yarıdaki kişi)
      const L2 = {...L}; if (L2.sur == null) { const g = L.surG != null && ix.has(L.surG) && !P[ix.get(L.surG)].isci ? L.surG : null, a = L.surA != null && ix.has(L.surA) && !P[ix.get(L.surA)].isci ? L.surA : null; L2.sur = g != null ? g : a; L2.bol = {...(L.bol || {})}; delete L2.bol.sur; }
      ekleY(d, 'sur', L2);
    }
    function ekleY(d, t, L) {
      const a = L[t] != null && ix.has(L[t]) ? ix.get(L[t]) : -1, bb = L.bol && L.bol[t], b = bb && ix.has(bb.id) ? ix.get(bb.id) : -1;
      const sabit = (a >= 0 && P[a].gunduz) || (b >= 0 && P[b].gunduz);
      const y = {d, t, a, b: a >= 0 && b >= 0 ? b : -1, h: a >= 0 && b >= 0 ? 24 - bb.saat : 24, sabit}; gunY[d].push(Y.length); Y.push(y);
    }
    Y.forEach(y => { if (y.b >= 0 && y.h > 12 && !y.sabit) { [y.a, y.b] = [y.b, y.a]; y.h = 24 - y.h; } });
    const S = Y.length;
    // --- kişi görevleri
    const gorev = P.map(() => new Set()); const bagla = (s, i) => { if (i >= 0) gorev[i].add(s); }, coz = (s, i) => { if (i >= 0) gorev[i].delete(s); };
    Y.forEach((y, s) => { bagla(s, y.a); bagla(s, y.b); });
    const bolSay = new Int32Array(m), ikili = new Map(); let ikiliCeza = 0, dengeT = 0;
    const ikiliAnahtar = (a, b) => a < b ? a * 1000 + b : b * 1000 + a;
    const bolEkle = (y, k) => { if (y.b < 0 || y.t === 'M') return; bolSay[y.a] += k; bolSay[y.b] += k; const an = ikiliAnahtar(y.a, y.b), v = (ikili.get(an) || 0); const yeni = v + k; ikili.set(an, yeni); ikiliCeza += C.ikili * (Math.max(0, yeni - 1) - Math.max(0, v - 1)); };
    Y.forEach(y => bolEkle(y, 1));
    const memur = P.map((p, i) => i).filter(i => !P[i].isci && !P[i].gunduz && (P[i].plan || 0) > 0.5);
    const dengeHesap = () => { let s2 = 0, ust = 0; memur.forEach(i => { s2 += bolSay[i] * bolSay[i]; if (bolSay[i] > 3) ust += bolSay[i] - 3; }); return C.denge * s2 + C.bolUst * ust; };      // kişi başı 3'ü aşan bölünme ağır
    // tek işçili günlerin memur yarısı dengesi (sürücü olabilen memurlar arasında)
    const surucu = memur.filter(i => uygun(i, 'M')); const yariSay = new Int32Array(m); Y.forEach(y => { if (y.t === 'M' && y.a >= 0) yariSay[y.a]++; });
    const yariHesap = () => { if (surucu.length < 2) return 0; let s2 = 0; surucu.forEach(i => { s2 += yariSay[i] * yariSay[i] * C.yariDenge + (yariSay[i] % 2 ? C.yariTek : 0); }); return s2; };      // tek sayıda yarı 4 saatlik artık bırakır (7,67 hedefte)
    // --- kişi maliyeti
    // en az: mesai hedefi (enAz); Modül 1 kişiyi bunun altına planladıysa (fazla personel, kesinleştirmede onaylı) planlanan. Planlananın üstü serbest:
    // kişi başı sayı istasyonun işi (kullanıcı 15.11) — planlanandan sapma yalnız hafif ceza, bölme gerektirmez
    const kayit = new Map((girdi.kisiler || []).map(k => [k.id, k]));
    const hedefSaat = P.map(p => p.plan != null ? Math.round(p.plan * 24) : null);
    const enAzSaat = P.map((p, i) => { if (p.plan == null) return null; const k = kayit.get(p.id) || {}, e = k.enAz != null && k.enAz !== '' ? +k.enAz : p.plan; return Math.round(Math.min(p.plan, e) * 24); });
    function kisiMaliyet(i) {
      const p = P[i]; if (p.isci) return 0; let c = 0, saat = 0;
      const gun = new Map();      // d -> {bas, bit}: saat 0 = 09:00; bit 24 = ertesi gün 09:00
      const ek = (d, bas, bit) => { if (gun.has(d)) { c += C.cakisma; const g = gun.get(d); g.bas = Math.min(g.bas, bas); g.bit = Math.max(g.bit, bit); } else gun.set(d, {bas, bit}); saat += bit - bas; };
      gorev[i].forEach(s => { const y = Y[s];
        if (y.t === 'M') { ek(y.d, y.yari === 'G' ? 0 : 12, y.yari === 'G' ? 12 : 24); if (!uygun(i, 'M')) c += C.uygun; }
        else if (y.b < 0) { ek(y.d, 0, 24); if (!uygun(i, y.t) && !y.sabit) c += C.uygun; }
        else if (y.a === i) { ek(y.d, 0, y.h); if (!uygun(i, y.t) && !y.sabit) c += C.uygun; }
        else { ek(y.d, y.h, 24); if (!uygun(i, y.t) && !y.sabit) c += C.uygun; } });
      // önceki ayın son günleri
      (p.onc.t24 || []).forEach(d => { if (!gun.has(d)) gun.set(d, {bas: 0, bit: 24}); }); (p.onc.A || []).forEach(d => { if (!gun.has(d)) gun.set(d, {bas: 12, bit: 24}); }); (p.onc.G || []).forEach(d => { if (!gun.has(d)) gun.set(d, {bas: 0, bit: 12}); });
      const gunler = [...gun.keys()].sort((a, b) => a - b);
      for (const d of gunler) { if (d < 1) continue; if (p.izin.has(d)) c += C.izin; else if (p.istek.has(d)) c += C.istek; if (p.once.has(d) && !p.izin.has(d)) c += C.izinOnce; }
      p.donus.forEach(d => { if (!gun.has(d)) c += C.donus; });
      // dinlenme
      for (const d of gunler) { const g = gun.get(d), n = gun.get(d + 1); if (!n || d + 1 < 1) continue;
        if (g.bit === 24) {        // ertesi sabah 09:00'da biten görev
          const geceYari = g.bas === 12;
          if (geceYari && n.bas === 12 && n.bit === 24) { const o2 = gun.get(d - 1); if (o2 && o2.bas === 12 && o2.bit === 24) c += C.dinlenme; }      // 3. gece
          else c += C.dinlenme * Math.max(1, K.minAra);
        } else {                  // gündüz biten görev
          if (n.bit - n.bas >= 16 && n.bas === 0) c += C.gunduz24;
          const o2 = gun.get(d - 1); if (o2 && o2.bit < 24 && n.bit < 24) c += C.gunduz3; }
      }
      if (K.minAra > 1) for (const d of gunler) { const g = gun.get(d); if (g.bit < 24) continue; for (let k = 2; k <= K.minAra; k++) if (gun.has(d + k)) c += C.dinlenme; }
      // en uzun ara
      for (let k = 1; k < gunler.length; k++) { const a = gunler[k - 1], b = gunler[k]; if (a < 1) continue; const bos = b - a - 1; if (bos > K.maxAra) { let iz = false; for (let d = a + 1; d < b; d++) if (p.izin.has(d)) { iz = true; break; } if (!iz) c += C.maxAra * (bos - K.maxAra); } }
      // sürücü gün aşırı üç 24 saat
      if (K.surGunAsiri) { const s24 = new Set(); gorev[i].forEach(s => { const y = Y[s]; if (y.t === 'sur' && y.b < 0) s24.add(y.d); }); (p.onc.s24 || []).forEach(d => s24.add(d)); s24.forEach(d => { if (s24.has(d + 2) && s24.has(d + 4)) c += C.surGunAsiri; }); }
      // saat: planın altı ağır, üstü hafif
      if (enAzSaat[i] != null) { const f = saat - enAzSaat[i]; if (f < -3) c += C.eksikSaat * (-f); c += C.planSapma * Math.abs(saat - hedefSaat[i]); }
      // hafta sonu / tatil dengesi
      if (H.ozelSay > 0 && gunler.length >= 2) { const pl = gunler.filter(d => d >= 1), oz = pl.filter(d => H.ozel[d]).length, dev = Math.abs(oz - pl.length * H.ozelOran); if (dev > 1) c += Math.round(30 * (dev - 1)); }
      return c;
    }
    const yuvaMaliyet = y => { if (y.a < 0) return C.bos; if (y.b < 0) return 0; let c = C.bolme; if (y.t === 'es') c += C.esBolme; if (y.t === 'sur') c += C.surBolme; const h = Math.min(y.h, 24 - y.h); if (h !== 8 && h !== 12) c += C.garipParca; return c; };
    // gün maliyeti: AABT nöbetteyken ATT ekip şefi tutamaz (kullanıcı, 15.11)
    const aabt = i => i >= 0 && (P[i].grup === 'ke' || P[i].grup === 'ka'), att = i => i >= 0 && (P[i].grup === 'ysp' || P[i].grup === 'sy');
    const gunMaliyet = d => { const ys = gunY[d].map(s => Y[s]), es = ys.find(y => y.t === 'es'); if (!es) return 0;
      if (!att(es.a) && !att(es.b)) return 0; return ys.some(y => y.t !== 'es' && (aabt(y.a) || aabt(y.b))) ? C.uygun : 0; };
    const dc = new Array(N + 2).fill(0); for (let d = 1; d <= N; d++) dc[d] = gunMaliyet(d); let dct = dc.reduce((a, v) => a + v, 0);
    const pc = P.map((_, i) => kisiMaliyet(i)); let yc = Y.reduce((a, y) => a + yuvaMaliyet(y), 0);
    const toplam = () => pc.reduce((a, v) => a + v, 0) + yc + dct + ikiliCeza + dengeHesap() + yariHesap();
    // ön adım: tek işçili günlerin memur yarıları sürücülere çift sayıda ve dengeli (7,67 gibi hedeflerde 4 saatlik artık kalmasın);
    // tavlama tek adımda bu dengeye geçemiyor (arada saat açığı büyür), bu yüzden önce kişiler yer değiştirir, saatler sonra tavlamayla dengelenir
    if (surucu.length >= 2) for (let tur = 0; tur < 40; tur++) {
      const tek = surucu.filter(i => yariSay[i] % 2); if (tek.length < 2) break;
      const [p1, p2] = tek.sort((x, y) => yariSay[y] - yariSay[x]); let oldu = false;
      for (let s = 0; s < S && !oldu; s++) { const y = Y[s]; if (y.t !== 'M' || y.a !== p1 || P[p2].izin.has(y.d)) continue;
        const once = pc[p1] + pc[p2]; coz(s, p1); bagla(s, p2); y.a = p2; yariSay[p1]--; yariSay[p2]++; const n1 = kisiMaliyet(p1), n2 = kisiMaliyet(p2);
        if (n1 + n2 - once < C.dinlenme / 2 && n1 < C.cakisma && n2 < C.cakisma) { pc[p1] = n1; pc[p2] = n2; oldu = true; }
        else { coz(s, p2); bagla(s, p1); y.a = p1; yariSay[p1]++; yariSay[p2]--; } }
      if (!oldu) break;
    }
    let cur = toplam(), en = cur, enY = Y.map(y => ({...y}));
    // --- hareketler
    const adaylar = (t, d) => { const r = []; for (let i = 0; i < m; i++) if (uygun(i, t) && !P[i].izin.has(d)) r.push(i); return r; };
    const ADAY = {}; ['es', 'ysp', 'sur', 'M'].forEach(t => { ADAY[t] = P.map((_, i) => i).filter(i => uygun(i, t)); });
    const sec = a => a[Math.floor(R() * a.length)];
    let it = 0; const sure = o.sureMs, T0 = 150, T1 = 1;
    while (Date.now() - t0 < sure) {
      for (let rep = 0; rep < 300; rep++) {
        it++;
        const s = Math.floor(R() * S), y = Y[s]; if (y.sabit) continue;
        const once = {a: y.a, b: y.b, h: y.h}; const etk = new Set([y.a, y.b]);
        let s2 = -1, y2 = null, once2 = null;
        const r = R();
        if (r < 0.35) {          // kişi değiştir
          const A = ADAY[y.t]; if (!A.length) continue; const yeni = sec(A);
          if (y.b >= 0 && R() < 0.5) { if (yeni === y.a) continue; y.b = yeni; } else { if (yeni === y.b) continue; y.a = yeni; }
          etk.add(yeni);
        } else if (r < 0.45) {   // aynı iki kişinin iki bölmesini birleştir: biri bir günü, öbürü öbür günü tam tutar
          if (y.b < 0 || y.t === 'M') continue; const es2 = []; for (let k = 0; k < S; k++) { const z = Y[k]; if (k !== s && !z.sabit && z.b >= 0 && z.t !== 'M' && ((z.a === y.a && z.b === y.b) || (z.a === y.b && z.b === y.a))) es2.push(k); }
          if (!es2.length) continue; s2 = sec(es2); y2 = Y[s2]; once2 = {a: y2.a, b: y2.b, h: y2.h};
          const [p1, p2] = R() < 0.5 ? [y.a, y.b] : [y.b, y.a]; y.a = p1; y.b = -1; y.h = 24; y2.a = p2; y2.b = -1; y2.h = 24;
        } else if (r < 0.6) {    // aynı türden iki yuvanın içeriğini takas
          s2 = Math.floor(R() * S); y2 = Y[s2]; if (s2 === s || y2.sabit || y2.t !== y.t || (y.t === 'M' && y2.yari !== y.yari && false)) continue;
          once2 = {a: y2.a, b: y2.b, h: y2.h}; [y.a, y2.a] = [y2.a, y.a]; [y.b, y2.b] = [y2.b, y.b]; [y.h, y2.h] = [y2.h, y.h];
          etk.add(once2.a); etk.add(once2.b);
        } else if (r < 0.8) {    // böl / birleştir
          if (y.t === 'M' || y.a < 0) continue;
          if (y.b < 0 && y.t === 'sur' && R() < 0.8) continue;      // sürücü 24 saat tek kişide; yalnız gerçekten gerekirse bölünür (kural 2, yüksek ceza)
          if (y.b < 0) { const A = ADAY[y.t]; const yeni = sec(A); if (yeni === y.a) continue; y.b = yeni; y.h = PARCA[Math.floor(R() * PARCA.length)]; etk.add(yeni); }
          else { if (R() < 0.5) y.a = y.b; y.b = -1; y.h = 24; }
        } else {                 // parça saatini değiştir ya da sırayı çevir
          if (y.b < 0) continue;
          if (R() < 0.5) { const h = PARCA[Math.floor(R() * PARCA.length)]; if (h === y.h) continue; y.h = h; } else { [y.a, y.b] = [y.b, y.a]; y.h = 24 - y.h; }
        }
        if (y.a < 0 && y.b >= 0) { y.a = y.b; y.b = -1; y.h = 24; }
        if (y.b >= 0 && y.b === y.a) { y.b = -1; y.h = 24; }
        if (y.b < 0 && y.t !== 'M') y.h = 24;
        // 8 / 16 ve 4 / 20'de kısa parça önce (09:00–17:00, sonra 17:00–09:00; kullanıcı 15.11)
        if (y.b >= 0 && y.h > 12) { [y.a, y.b] = [y.b, y.a]; y.h = 24 - y.h; }
        if (y2 && y2.b >= 0 && y2.h > 12) { [y2.a, y2.b] = [y2.b, y2.a]; y2.h = 24 - y2.h; }
        // maliyeti yenile
        const eskiY = yuvaMaliyet({...y, ...once}) + (y2 ? yuvaMaliyet({...y2, ...once2}) : 0);
        bolEkle({...y, ...once}, -1); if (y2) bolEkle({...y2, ...once2}, -1);
        if (y.t === 'M') { if (once.a >= 0) yariSay[once.a]--; if (y2 && once2.a >= 0) yariSay[once2.a]--; }
        // görev kümeleri
        coz(s, once.a); coz(s, once.b); bagla(s, y.a); bagla(s, y.b);
        if (y2) { coz(s2, once2.a); coz(s2, once2.b); bagla(s2, y2.a); bagla(s2, y2.b); }
        bolEkle(y, 1); if (y2) bolEkle(y2, 1);
        if (y.t === 'M') { if (y.a >= 0) yariSay[y.a]++; if (y2 && y2.a >= 0) yariSay[y2.a]++; }
        const yeniY = yuvaMaliyet(y) + (y2 ? yuvaMaliyet(y2) : 0);
        const eskiP = new Map(); etk.forEach(i => { if (i >= 0) { eskiP.set(i, pc[i]); pc[i] = kisiMaliyet(i); } });
        yc += yeniY - eskiY;
        const gunler2 = new Set([y.d, y2 ? y2.d : y.d]), eskiD = new Map(); gunler2.forEach(d => { eskiD.set(d, dc[d]); dct -= dc[d]; dc[d] = gunMaliyet(d); dct += dc[d]; });
        const yeniT = toplam(), delta = yeniT - cur;
        const T = T0 * Math.pow(T1 / T0, (Date.now() - t0) / sure);
        if (delta <= 0 || R() < Math.exp(-delta / T)) { cur = yeniT; if (cur < en) { en = cur; enY = Y.map(q => ({...q})); } continue; }
        // geri al
        bolEkle(y, -1); if (y2) bolEkle(y2, -1);
        if (y.t === 'M') { if (y.a >= 0) yariSay[y.a]--; if (y2 && y2.a >= 0) yariSay[y2.a]--; }
        coz(s, y.a); coz(s, y.b); if (y2) { coz(s2, y2.a); coz(s2, y2.b); }
        Object.assign(y, once); if (y2) Object.assign(y2, once2);
        bagla(s, y.a); bagla(s, y.b); if (y2) { bagla(s2, y2.a); bagla(s2, y2.b); }
        bolEkle(y, 1); if (y2) bolEkle(y2, 1);
        if (y.t === 'M') { if (y.a >= 0) yariSay[y.a]++; if (y2 && y2.a >= 0) yariSay[y2.a]++; }
        eskiP.forEach((v, i) => { pc[i] = v; }); yc -= yeniY - eskiY; eskiD.forEach((v, d) => { dct += v - dc[d]; dc[d] = v; });
      }
      yield Math.min(0.99, (Date.now() - t0) / sure);
    }
    // --- listeye çevir
    const liste = NC.bos(N);
    for (let d = 1; d <= N; d++) isciVar[d].forEach(x => { liste[d][x.t === 'G' ? 'surG' : 'surA'] = P[x.i].id; });
    enY.forEach(y => { const L = liste[y.d];
      if (y.t === 'M') { if (y.a >= 0) L[y.yari === 'G' ? 'surG' : 'surA'] = P[y.a].id; return; }
      if (y.a < 0) return; L[y.t] = P[y.a].id; if (y.b >= 0) L.bol = {...(L.bol || {}), [y.t]: {id: P[y.b].id, saat: 24 - y.h}}; });
    return {liste, maliyet: en, adim: it};
  }
  const iyilestir = (g, l, o) => { const it = iyilestirAdim(g, l, o); let r; while (!(r = it.next()).done); return r.value; };
  // tarayıcıda arayüzü kilitlemeden: her ~40 ms'de bir ara verir; ilerle(oran)
  const iyilestirAsync = (g, l, o, ilerle) => new Promise((coz, red) => { const it = iyilestirAdim(g, l, o);
    const adim = () => { try { const t = Date.now(); let r; do { r = it.next(); } while (!r.done && Date.now() - t < 40); if (r.done) coz(r.value); else { if (ilerle) ilerle(r.value); setTimeout(adim, 0); } } catch (e) { red(e); } }; adim(); });
  return {iyilestir, iyilestirAsync, MALIYET: C};
})();
if (typeof module !== 'undefined') module.exports = ListeIyilestir;
