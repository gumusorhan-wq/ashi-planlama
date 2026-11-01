const N = require('../src/nobet.js'); const assert = require('assert');
const kisi = (id, grup, adet, yarim, ekstra) => ({id, ad: 'K' + id, grup, adet, yarim: yarim || 0, izin: [], istek: [], ...(ekstra || {})});
// Kasım 2026 (30 gün): ES 30 + YSP 30 + sürücü 30 (işçi 51 yarım = 25 gün, kalan 5 gün 24 saat)
const kisiler = [];
for (let i = 1; i <= 5; i++) kisiler.push(kisi(i, 'ka', 7));
for (let i = 6; i <= 8; i++) kisiler.push(kisi(i, 'ysp', 7));
kisiler.push(kisi(9, 'sy', 5)); kisiler.push(kisi(10, 'sy', 4));
for (let i = 11; i <= 13; i++) kisiler.push(kisi(i, 'isci', 0, 17));
const girdi = {y: 2026, m: 11, kisiler};
let t = Date.now(); const r = N.uret(girdi, {sureMs: 2500, deneme: 8, seed: 3});
console.log('süre', Date.now() - t, 'ms | ceza', r.ceza, '| deneme', r.deneme, '| ihlal özeti', JSON.stringify(r.say));
const eksik = r.ihlal.filter(i => i.tur === 'eksik'); assert.strictEqual(eksik.length, 0, 'boş yuva kalmamalı');
const sert = r.ihlal.filter(i => ['yetenek', 'izin', 'cakisma', 'dinlenme'].includes(i.tur)); assert.strictEqual(sert.length, 0, 'sert kural ihlali yok: ' + JSON.stringify(sert.slice(0, 3)));
// denetle: bilinçli ihlal — art arda iki 24 saat, gün aşırı 3 sürücü, işçi 3 gece
const H = N.hazirla(girdi), L = N.bos(30);
L[1].es = 1; L[2].es = 1;                                  // dinlenme ihlali
L[3].sur = 9; L[5].sur = 9; L[7].sur = 9;                  // sürücü gün aşırı 3
L[1].surA = 11; L[2].surA = 11; L[3].surA = 11;            // işçi 3 gece
const d = N.denetle(L, H); const turler = new Set(d.ihlal.map(i => i.tur));
['dinlenme', 'surGunAsiri', 'isciGece', 'eksik'].forEach(x => assert.ok(turler.has(x), x + ' bulunmalı'));
// yıllık izin öncesi 3 gün boşluk ve izin sırasında nöbet yok
const g2 = {y: 2026, m: 11, kisiler: kisiler.map(k => k.id === 1 ? {...k, izin: [{bas: '2026-11-15', bit: '2026-11-20'}], istek: ['2026-11-04']} : k)};
const r2 = N.uret(g2, {sureMs: 2500, deneme: 8, seed: 5}); const p1 = r2.liste.map((x, d) => [x, d]).filter(([x, d]) => d && ['es', 'ysp', 'sur'].some(s => x[s] === 1)).map(([, d]) => d);
console.log('kişi 1 nöbet günleri', p1.join(','), '| ceza', r2.ceza, JSON.stringify(r2.say));
assert.ok(!p1.some(d => d >= 12 && d <= 20), 'izin ve öncesi 3 gün (12-14) boş olmalı');
assert.ok(!p1.includes(4), 'istek günü yazılmamalı');
// öneri
const on = N.oneriler(L, girdi, null, 10); assert.ok(on.oneriler.length > 0);
// adet hazırlama: toplam, yuvaların gerektirdiği sayıya eşitlenir
{ const ks = [...[1, 2, 3, 4, 5].map(i => ({id: i, grup: 'ka', planlanan: 7.5, ust: 8})), ...[6, 7, 8, 9].map(i => ({id: i, grup: 'ysp', planlanan: 6.5, ust: 8})), ...[10, 11, 12].map(i => ({id: i, grup: 'isci', planlanan: 8.5}))];
  const s = N.adetHazirla(ks, 30); const top = ks.filter(k => k.grup !== 'isci').reduce((a, k) => a + k.adet, 0);
  assert.strictEqual(top, s.gerek); assert.strictEqual(ks.filter(k => k.grup === 'isci').reduce((a, k) => a + k.yarim, 0), 50); /* tek kalan yarım vardiya düşülür */ assert.strictEqual(s.gunIsci, 25); assert.strictEqual(s.gerek, 65); }
// tek işçi: yarım vardiyalar aynı gün iki farklı kişi gerektirir; tek işçinin yarımları 24 saatlik nöbete çevrilir, aynı gün çift görev oluşmaz
{ const ks = []; for (let i = 1; i <= 7; i++) ks.push(kisi(i, 'ka', 7)); for (let i = 8; i <= 10; i++) ks.push(kisi(i, 'ysp', 7)); ks.push(kisi(11, 'sy', 6)); ks.push(kisi(12, 'isci', 0, 16));
  const r3 = N.uret({y: 2026, m: 11, kisiler: ks}, {sureMs: 1500, deneme: 4, seed: 9}); assert.ok(!r3.say.cakisma, 'aynı gün çift görev olmamalı'); assert.ok(!r3.say.dinlenme && !r3.say.yetenek && !r3.say.izin, 'sert ihlal yok'); }
// kapasite analizi: yalnız ekip şefi yapamayanlar varsa ekip şefi nöbet branşı boş kalır
{ const ks = []; for (let i = 1; i <= 10; i++) ks.push(kisi(i, 'ysp', 9)); const k = N.kapasiteAnalizi({y: 2026, m: 11, kisiler: ks}); assert.ok(k.bos.es === 30 && k.bos.sur === 30, 'es ve sür boş kalmalı: ' + JSON.stringify(k.bos)); }
// hafta sonu / resmî tatil dengesi: eşit adetli 24 saatlik kişilerin özel gün nöbet sayıları birbirine yakın olmalı
{ const H2 = N.hazirla({...girdi, tatil: [2]}); const oz = {}; for (let d = 1; d <= 30; d++) ['es', 'ysp', 'sur'].forEach(s => { const id = r.liste[d][s]; if (id != null && id <= 8) oz[id] = (oz[id] || 0) + (H2.ozel[d] ? 1 : 0); });
  const v = Object.values(oz); assert.ok(Math.max(...v) - Math.min(...v) <= 3, 'hafta sonu dağılımı dengeli olmalı: ' + JSON.stringify(oz)); }
// zorlama: yetersiz kadroda bile boş yuva ve sert ihlal kalmamalı
{ const az = []; for (let i = 1; i <= 4; i++) az.push(kisi(i, 'ka', 6)); for (let i = 5; i <= 7; i++) az.push(kisi(i, 'ysp', 6)); az.push(kisi(8, 'sy', 5, 0, {izin: [{bas: '2026-11-05', bit: '2026-11-12'}]}));
  const z = N.uret({y: 2026, m: 11, kisiler: az}, {sureMs: 800, deneme: 2, seed: 5, zorlaMs: 4000}); assert.strictEqual(z.sert, 0, 'zorlamayla sert ihlal kalmamalı: ' + JSON.stringify(z.say)); }
console.log('nöbet çekirdek testleri geçti');
