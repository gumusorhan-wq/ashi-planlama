const C = require('../src/core.js'); const assert = require('assert');
const D = C.DURUM_VARSAYILAN;
// Ağustos 2026: memur 168 saat → 7 nöbet; işçi 195 saat → 17,7 → alt 17 adet = 8,5 birim
assert.strictEqual(C.ayMesai(2026, 8, false, {}), 168);
assert.strictEqual(C.ayMesai(2026, 8, true, {}), 195);
assert.deepStrictEqual([C.hedefNobet(168, 'memur', false).birim, C.hedefNobet(195, 'isci', false).adet, C.hedefNobet(195, 'isci', false).birim], [7, 17, 8.5]);
// Kasım 2026: 21 hafta içi; işçi (30−5 pazar)=25 gün
assert.strictEqual(C.ayMesai(2026, 11, false, {}), 168);
assert.strictEqual(C.ayMesai(2026, 11, true, {}), 187.5);
assert.strictEqual(C.hedefNobet(176, 'memur', false).birim, 7.5);       // 7,33 → 7,5 (üst)
// idari izin günü (toplu): hafta içi bir gün düşer
assert.strictEqual(C.ayMesai(2026, 11, false, {'2026-11-10': {tur: 'idari'}}), 160);
assert.strictEqual(C.ayMesai(2026, 11, false, {'2026-11-09': {tur: 'yarim'}}), 165);
// Resmî tatil: Ekim 2026 29 Ekim Perşembe, 28 arife
assert.strictEqual(C.gunSaat('2026-10-29', false, {}), 0); assert.strictEqual(C.gunSaat('2026-10-28', false, {}), 5);
// izin: memur 5 gün izin → 168−40=128 → 5,33→5,5
const k = {sinif: 'memur', durum: '', izin: [{gun: 5}]};
assert.strictEqual(C.kisiMesai(k, 2026, 11, {}, D), 128); assert.strictEqual(C.hedefNobet(128, 'memur', false).birim, 5.5);
// tarihli izin hafta sonuna düşerse mesaiyi etkilemez
assert.strictEqual(C.kisiMesai({sinif: 'memur', izin: [{bas: '2026-11-07', bit: '2026-11-08'}]}, 2026, 11, {}, D), 168);
// dağıtım
assert.strictEqual(C.dagit(31, [7.5, 7.5, 7.5, 7.5]).reduce((a, b) => a + b, 0), 31);
// istasyon: doktorlu + işçili; işçi hedefi kadar, kalan memur (Excel YUNUSEMRE 2 örüntüsü)
const kisiler = [];
for (let i = 0; i < 4; i++) kisiler.push({id: 'd' + i, sinif: 'doktor', durum: '', izin: []});
for (let i = 0; i < 8; i++) kisiler.push({id: 'm' + i, sinif: 'memur', durum: '', izin: [], unvan: 'Sağlık Teknikeri', rolSay: {es: 30, ysp: 40, sur: 30}});
for (let i = 0; i < 3; i++) kisiler.push({id: 'i' + i, sinif: 'isci', durum: '', izin: []});
const h = C.istasyonHesap(kisiler, 2026, 8, {}, D, {azamiMemur: 8}, 3), o = C.oneri(h);
const topl = (p) => kisiler.filter(x => x.id[0] === p).reduce((a, x) => a + o.get(x.id), 0);
assert.strictEqual(topl('d'), 28); assert.strictEqual(topl('i'), 25.5); assert.strictEqual(topl('m'), 39.5);   // doktorlar hedeflerinde kalır; ES'nin kalan 3 nöbetini AABT hedef nöbetiyle tutar
assert.strictEqual(h.ihtiyac, 93);
assert.strictEqual(C.istAnahtar('ŞEHZADELER 8 NOLU ASHİ AĞUSTOS'), 'SEHZADELER 8');
assert.strictEqual(C.istAnahtar('MANİSA AHMETLİ 1 NOLU ACİL SAĞLIK HİZMETLERİ İSTASYONU'), 'AHMETLI 1');
assert.strictEqual(C.durumAnahtar('DOĞUM SONRASI 17.09.2026'), 'DOĞUM SONRASI');
assert.strictEqual(C.durumAnahtar('GEBE-MESAİ '), 'GEBE MESAİ');
assert.strictEqual(C.tarihIso('15.03.2022'), '2022-03-15'); assert.strictEqual(C.tarihIso(44635), '2022-03-15'); assert.strictEqual(C.tarihIso('2022-03-15 00:00:00'), '2022-03-15');
assert.strictEqual(C.dortB('Sağlık Teknikeri', '4/B Sözleşmeli'), true); assert.strictEqual(C.dortB('ATT', 'Kadrolu'), false);
const g1 = C.gorevlendirmeEngeli({dortB: true, memBas: '2022-12-01'}, '2026-11-01'); assert.ok(g1.includes('01.12.2026'));
assert.strictEqual(C.gorevlendirmeEngeli({dortB: true, memBas: '2022-11-01'}, '2026-11-01'), '');
assert.strictEqual(C.gorevlendirmeEngeli({dortB: false, memBas: '2025-01-01'}, '2026-11-01'), '');
assert.strictEqual(C.dortB('657/4B  Sözleşmeli Personel (663 sayılı KHK 45/A)'), true);
assert.strictEqual(C.dortB('657/4A Memur'), false); assert.strictEqual(C.dortB('Sürekli İşçi (696 sayılı KHK)'), false);
assert.strictEqual(C.dortB('4/B ATT'), true);
assert.deepStrictEqual(C.aylariListele('2026-09-15','2026-11-02','2026-10-29'), ['2026-09','2026-10']);
const mf = C.muafiyetCoz('12.02.2026 00:00 / 12.02.2028 00:00 : Nöbet Muafiyeti, 01.07.2026 00:00 / 01.01.2027 00:01 : Süt İzni 3 Saat');
assert.strictEqual(mf.length, 2); assert.strictEqual(mf[0].tur, 'nobet'); assert.strictEqual(mf[1].saat, 3); assert.strictEqual(mf[1].bit, '2027-01-01');
assert.strictEqual(C.muafiyetCoz('29.04.2026 01:00 / 29.10.2026 01:30 : Süt İzni 1,5 Saat')[0].saat, 1.5);
assert.strictEqual(C.ilceAdi('ŞEHZADELER 8'), 'SEHZADELER'); assert.strictEqual(C.ilceAdi('YUNUSEMRE 9 UMKE'), 'YUNUSEMRE');
assert.strictEqual(C.mesafeKm('SALİHLİ', 'SALİHLİ'), 0);
assert.ok(C.mesafeKm('SALİHLİ', 'AHMETLİ') < C.mesafeKm('SALİHLİ', 'SOMA')); assert.ok(C.mesafeKm('YUNUSEMRE', 'SEHZADELER') < 6);
assert.ok(C.mesafeKm('SOMA', 'SARIGÖL') > 100);
// azami nöbet: Kasım — hedef 7, azami 8
const D2 = C.DURUM_VARSAYILAN, AY = {isciDusulen: 11, azamiMemur: 8, isciEk: 0};
const mk = (n, id, sinif, unvan) => Array.from({length: n}, (_, i) => ({id: id + i, sinif, durum: '', izin: [], unvan: unvan || (sinif === 'memur' ? 'Sağlık Teknikeri' : ''), rolSay: /Tekniker/.test(unvan || (sinif === 'memur' ? 'Tekniker' : '')) ? {es: 30, ysp: 40, sur: 30} : undefined}));
let h2 = C.istasyonHesap(mk(12, 'm', 'memur'), 2026, 11, {}, D2, AY, 3);          // ihtiyaç 90; hedef 12×7=84; azami 12×8=96
assert.strictEqual(h2.kapasite, 84); assert.strictEqual(h2.azamiKap, 96); assert.strictEqual(h2.durum, 'fazlaMesai');
let o2 = C.oneri(h2), top = [...o2.values()].reduce((a, b) => a + b, 0);
assert.strictEqual(top, 90); assert.ok([...o2.values()].every(v => v >= 7 && v <= 8));
h2 = C.istasyonHesap(mk(10, 'm', 'memur'), 2026, 11, {}, D2, AY, 3);              // azami 80 < 90 → gerçek ihtiyaç
assert.strictEqual(h2.durum, 'ihtiyac'); o2 = C.oneri(h2); assert.ok([...o2.values()].every(v => v === 8)); assert.strictEqual(h2.farkAzami, -10);
h2 = C.istasyonHesap(mk(14, 'm', 'memur'), 2026, 11, {}, D2, AY, 3);              // hedef 98 > 90 → mesai dolmaz, hepsi ≤7
assert.strictEqual(h2.durum, 'fazla'); o2 = C.oneri(h2); assert.strictEqual([...o2.values()].reduce((a, b) => a + b, 0), 90);
// izinli kişi: hedef + 1 ile sınırlı (azami 8'i geçmez)
const kk = mk(11, 'm', 'memur'); kk[0].izin = [{gun: 10}];
h2 = C.istasyonHesap(kk, 2026, 11, {}, D2, AY, 3); const s0 = h2.satir[0];
assert.ok(s0.azami <= 8 && s0.azami === s0.hedef + 1);
// doktor kendi içinde: 6 doktor × 7 = 42 > ES yuvası 30 → 12 nöbet doktor fazlası; ES+YSP açığı karma memurla kapanır
{ const kk2 = [...mk(6, 'd', 'doktor'), ...mk(8, 'm', 'memur')], hh = C.istasyonHesap(kk2, 2026, 11, {}, D2, AY, 3);
  assert.strictEqual(hh.kapasite, 42 + 56); assert.strictEqual(hh.slot.hedef.fazla.dok, 12); assert.strictEqual(hh.hedefAcik, 4); assert.strictEqual(hh.fazlaH, 12);
  const pl = C.oneri(hh); assert.strictEqual(kk2.filter(k => k.sinif === 'doktor').reduce((a, k) => a + pl.get(k.id), 0), 30); }
// yuva yetenekleri: ATT sürücü → sürücü + YSP (ekip şefi olamaz), AABT → her yuva, doktor → ES, işçi → sürücü
{ const att = mk(10, 'a', 'memur', 'Sağlık Memuru'); att.forEach(k => { k.rolSay = {sur: 90, ysp: 10, es: 0}; });
  assert.strictEqual(C.grupBelirle(att[0], {sur: .7, degil: .15}), 'sy'); assert.strictEqual(C.kadroTip(att[0]), 'ATT'); assert.strictEqual(C.kadroTip({unvan: 'Sağlık Teknikeri'}), 'AABT');
  assert.strictEqual(C.grupBelirle({sinif: 'memur', unvan: 'Sağlık Teknikeri', rolSay: {sur: 100}}, {sur: .7, degil: .15}), 'ka');
  assert.strictEqual(C.grupBelirle({sinif: 'memur', unvan: 'Sağlık Memuru', rolSay: {ysp: 100}}, {sur: .7, degil: .15}), 'ysp');
  assert.strictEqual(C.grupBelirle({sinif: 'memur', unvan: 'Sağlık Memuru', rolSay: {es: 80, ysp: 20}}, {sur: .7, degil: .15}), 'ysp');   // ATT ekip şefi olamaz
  // 10 ATT (sy) tek başına: ES yuvasına giremez → ES 30 açık; sürücü + YSP 60 yuvaya 70 hedef → 10 fazla
  const hA = C.istasyonHesap(att, 2026, 11, {}, D2, AY, 3);
  assert.strictEqual(hA.acik.es, 30); assert.strictEqual(hA.acik.ysp + hA.acik.sur, 0); assert.strictEqual(hA.fazlaH, 10); assert.strictEqual(hA.hedefAcik, 30);
  // 6 AABT eklenince ES yuvasını AABT doldurur
  const hB = C.istasyonHesap([...att, ...mk(5, 'x', 'memur', 'Sağlık Teknikeri')], 2026, 11, {}, D2, AY, 3);
  assert.strictEqual(hB.acik.es, 0); assert.strictEqual(hB.hedefAcik, 0);
  const plan = C.oneri(hB), toplam = [...plan.values()].reduce((x, y) => x + y, 0); assert.ok(Math.abs(toplam - 90) < 1e-6); }
// doktor kendi içinde: 4 doktor 28 → ES yuvası 30'da 2 açık; işçi kendi içinde sürücü yuvasında
{ const x = [...mk(4, 'd', 'doktor'), ...mk(3, 'i', 'isci')], hx = C.istasyonHesap(x, 2026, 11, {}, D2, AY, 3);
  assert.strictEqual(hx.acik.es, 2); assert.strictEqual(hx.acik.sur, 30 - 25.5); assert.strictEqual(hx.acik.ysp, 30); }
assert.strictEqual(C.rolSinifla({sur: 80, ysp: 20, es: 0}), 'sur'); assert.strictEqual(C.rolSinifla({sur: 5, ysp: 80, es: 15}), 'ysp'); assert.strictEqual(C.rolSinifla({sur: 40, ysp: 40, es: 20}), 'karma'); assert.strictEqual(C.rolSinifla({}), '');
assert.strictEqual(C.rolBelirle({sinif: 'memur', rolManuel: 'sur', rolSay: {ysp: 100}}), 'sur'); assert.strictEqual(C.rolBelirle({sinif: 'doktor'}), 'es'); assert.strictEqual(C.rolBelirle({sinif: 'isci'}), 'sur'); assert.strictEqual(C.rolBelirle({sinif: 'memur'}), 'karma');
// ekip OF: yuva 0 → ihtiyaç 0
assert.strictEqual(C.istasyonHesap(mk(5, 'm', 'memur'), 2026, 11, {}, D2, AY, 0).ihtiyac, 0);
// personel önerisi: Kasım memur hedefi 7
{ const g = n => C.istasyonHesap(mk(n, 'm', 'memur'), 2026, 11, {}, D2, AY, 3);
  assert.strictEqual(g(12).ihtiyacTur, 'icerde');                 // açık 6 < 7 ve azami (96) ihtiyacı (90) karşılıyor → önerilmez
  assert.strictEqual(g(11).ihtiyacTur, 'oner'); assert.strictEqual(g(11).ihtiyacKisi, 1);   // açık 13 → 1 kişi mesaisini tamamlar
  assert.strictEqual(g(10).ihtiyacKisi, 2); assert.strictEqual(g(13).ihtiyacTur, 'yok');
  const e = g(12); e.satir.slice(0, 1).forEach(() => {});
  const kk3 = mk(12, 'm', 'memur'); kk3.forEach((k, i) => { if (i < 6) k.izin = [{gun: 6}]; });   // izinler hedefi düşürür: açık büyür
  assert.ok(C.istasyonHesap(kk3, 2026, 11, {}, D2, AY, 3).ihtiyacKisi >= 1);
  const az = C.istasyonHesap(mk(12, 'm', 'memur'), 2026, 11, {}, D2, {azamiMemur: 7}, 3);       // azami 7: açık 6 azamiyle de dolmuyor → elle karar
  assert.strictEqual(az.ihtiyacTur, 'elle'); }
// AABT fazlaya çıkmaz, fazlalık ATT'de: 5 AABT (35) + 10 ATT (70) = 105 > 90
const attS = (n, id) => mk(n, id, 'memur', 'Sağlık Memuru').map(k => ({...k, rolSay: {sur: 50, ysp: 50, es: 0}}));
{ const xs = [...mk(5, 'x', 'memur', 'Sağlık Teknikeri'), ...attS(10, 'a')], hz = C.istasyonHesap(xs, 2026, 11, {}, D2, AY, 3);
  assert.strictEqual(hz.slot.hedef.fazla.ka, 0); assert.strictEqual(hz.slot.hedef.fazla.sy, 15); assert.strictEqual(hz.slot.hedef.fill.ka.es, 30);
  // ES'yi ATT dolduramaz: yalnızca 3 AABT (21) → ES yuvası 9 açık; azami (8) ile 24 → hâlâ 6 açık
  const hy = C.istasyonHesap([...mk(3, 'x', 'memur', 'Sağlık Teknikeri'), ...attS(12, 'a')], 2026, 11, {}, D2, AY, 3);
  assert.strictEqual(hy.acik.es, 9); assert.strictEqual(hy.slot.azami.rem.es, 6); assert.ok(hy.slot.hedef.fazla.sy > 0);
  // planlanan: AABT'lere hedefin üstüne +1 yazılır (ES'yi kapatmak için), ATT'ler hedefin altına düşer
  const pl2 = C.oneri(hz), aabtPl = xs.slice(0, 5).map(k => pl2.get(k.id)); assert.ok(aabtPl.every(v => v >= 7)); }
// ATT sürücülüğü nöbet listesiyle teyit edilir
{ const esk = {sur: .7, degil: .15};
  assert.strictEqual(C.surucuDurumu({sinif: 'memur'}, esk).tip, 'dogrulanmadi'); assert.strictEqual(C.grupBelirle({sinif: 'memur', unvan: 'Sağlık Memuru'}, esk), 'ysp');   // kayıt yok → sürücü sayılmaz
  assert.strictEqual(C.grupBelirle({sinif: 'memur', unvan: 'Sağlık Memuru', rolSay: {sur: 30, ysp: 70, es: 0}}, esk), 'sy');       // %30 sürücü → sürücü
  assert.strictEqual(C.grupBelirle({sinif: 'memur', unvan: 'Sağlık Memuru', rolSay: {sur: 0, ysp: 100, es: 0}}, esk), 'ysp');
  assert.strictEqual(C.grupBelirle({sinif: 'memur', unvan: 'Sağlık Memuru', rolManuel: 'sur'}, esk), 'sy');
  assert.deepStrictEqual(C.rolToplam({'2026-08': {sur: 10, ysp: 5}, '2026-09': {sur: 5, es: 2}}), {es: 2, ysp: 5, sur: 15}); }
// AABT de sürücü yuvasına nöbet listesine göre girer: kayıt yoksa / sürücü değilse yalnız ekip şefi + YSP
{ const esk = {sur: .7, degil: .15};
  assert.strictEqual(C.grupBelirle({sinif: 'memur', unvan: 'Sağlık Teknikeri'}, esk), 'ke');
  assert.strictEqual(C.grupBelirle({sinif: 'memur', unvan: 'Sağlık Teknikeri', rolSay: {es: 50, ysp: 50, sur: 0}}, esk), 'ke');
  assert.strictEqual(C.grupBelirle({sinif: 'memur', unvan: 'Sağlık Teknikeri', rolSay: {es: 40, ysp: 30, sur: 30}}, esk), 'ka');
  assert.deepStrictEqual(C.YETENEK.ke, ['es', 'ysp']); }
console.log('çekirdek testleri geçti');
