/* HUSER ASHİ PLANLAMA — uygulama (modül sözleşmesi: AshiPlanlama.mount(kök, {depolama, kullanici, ayarlar})) */
const AshiPlanlama = (() => {
const VERSION = '01.00';
const C = APCore;
const AYLAR = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const ROLLER = {yonetici: 'Yönetici (idareci)', planlayici: 'Planlayıcı (planlama birimi)', istasyon: 'İstasyon sorumlusu (yalnız Modül 2)', salt_okur: 'Salt okur'};
const SINIF_AD = {doktor: 'Doktor', memur: 'Memur', isci: 'İşçi'};
const ROL_AD = {es: 'Ekip şefi', ysp: 'YSP', sur: 'Sürücü', karma: 'Karma'};
const GEREKCE = ['', 'PERSONEL İHTİYACI', 'MESAİ TAMAMLAYAMAMA', 'SAĞLIK MAZERETİ', 'EĞİTİM', 'DİĞER'];
const IZIN_TURLERI = ['YILLIK İZİN', 'MAZERET İZNİ', 'İDARİ İZİN', 'RAPOR', 'ÜCRETSİZ İZİN', 'DİĞER'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const sayi = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const fmt = v => (Math.round(v * 100) / 100).toLocaleString('tr-TR', {maximumFractionDigits: 2});
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const trCollator = new Intl.Collator('tr');
const adAnahtar = ad => C.TR(ad).split(' ').filter(Boolean).sort().join(' ');

// Varsayılan depolama: IndexedDB (kullanılamazsa bellek)
function varsayilanDepo() {
  const bellek = new Map();
  let p = null;
  const ac = () => p || (p = new Promise((res, rej) => {
    try { const r = indexedDB.open('ashiPlanlama', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); }
  }));
  const tx = async (mod, fn) => { const db = await ac(); return new Promise((res, rej) => { const t = db.transaction('kv', mod), rq = fn(t.objectStore('kv')); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }); };
  const sar = (f, b) => async (...a) => { try { return await f(...a); } catch (e) { return b(...a); } };
  return {
    get: sar(k => tx('readonly', s => s.get(k)), k => bellek.get(k)),
    put: sar((k, v) => tx('readwrite', s => s.put(v, k)), (k, v) => { bellek.set(k, v); }),
    del: sar(k => tx('readwrite', s => s.delete(k)), k => { bellek.delete(k); }),
    keys: sar(() => tx('readonly', s => s.getAllKeys()), () => [...bellek.keys()])
  };
}

function mount(root, opts = {}) {
  const depo = opts.depolama || varsayilanDepo();
  const S = {
    rol: (opts.kullanici && opts.kullanici.rol) || (opts.salt_okur ? 'salt_okur' : 'planlayici'),
    y: 0, m: 0, plan: null, sayfa: 'pano', ist: '', ayar: null, filtre: {q: '', durum: '', birim: '', sinif: ''}, modal: null, planAnahtarlari: [], toastlar: [], rotKaynak: 'fazla', gorevSekme: 'deg', pSayfa: 0, pBoyut: 50, modul: 1, n2: {ist: '', sekme: 'istek', gorunum: 'yuva', oneri: null, kural: {}, sonuc: null}, arsivVeri: null, yuklemeler: null, arsivSecili: null, arsivIst: ''
  };
  const bugun = new Date(), sonraki = new Date(Date.UTC(bugun.getUTCFullYear(), bugun.getUTCMonth() + 1, 1));
  S.y = sonraki.getUTCFullYear(); S.m = sonraki.getUTCMonth() + 1;      // planlama bir sonraki ay içindir
  const olay = (ad, d) => { try { root.dispatchEvent(new CustomEvent('ashiplan:' + ad, {detail: d, bubbles: true})); } catch (e) {} if (opts.olaylar && opts.olaylar[ad]) opts.olaylar[ad](d); };

  const anahtar = (y, m) => `plan:${y}-${C.pad(m)}`;
  const durumlar = () => S.ayar.durumlar;
  const salt = () => S.rol === 'salt_okur' || (S.plan && S.plan.durum === 'kilitli');
  let kaydetZamani = null;
  const kaydet = () => { clearTimeout(kaydetZamani); kaydetZamani = setTimeout(async () => { if (S.plan) { await depo.put(anahtar(S.y, S.m), S.plan); olay('plan:degisti', {ay: `${S.y}-${S.m}`}); } }, 300); };
  const ayarKaydet = () => { const r = depo.put('ayar', S.ayar); setTimeout(() => arsivArkaPlan(), 800); return r; };     // hesap ayarı değişirse arşiv arka planda yenilenir
  const HESAP_SURUM = 7;      // hesaplama yöntemi (formüller, yuva kuralları, görev/izin yorumu) değiştikçe artırılır
  function toast(t) { const id = uid(); S.toastlar.push({id, t}); toastCiz(); setTimeout(() => { S.toastlar = S.toastlar.filter(x => x.id !== id); toastCiz(); }, 5000); }
  function toastCiz() { root.querySelectorAll('.ap-toast').forEach(e => e.remove()); S.toastlar.forEach((x, i) => { const e = document.createElement('div'); e.className = 'ap-toast'; e.style.bottom = (14 + i * 46) + 'px'; e.textContent = x.t; root.appendChild(e); }); }
  function logla(islem, detay) { if (!S.plan) return; (S.plan.log = S.plan.log || []).unshift({t: Date.now(), rol: S.rol, islem, detay: detay || ''}); if (S.plan.log.length > 1500) S.plan.log.length = 1500; }
  function mut(fn, islem, detay) {
    if (salt()) { toast(S.plan && S.plan.durum === 'kilitli' ? 'Bu ay kilitli.' : 'Salt okur modundasınız.'); return false; }
    fn(); if (!S.toplu) otoHesapla(); if (islem) logla(islem, detay); kaydet(); return true;
  }

  async function ayarYukle() {
    const a = (await depo.get('ayar')) || {};
    S.ayar = {durumlar: JSON.parse(JSON.stringify(C.DURUM_VARSAYILAN)), isciDusulen: 11, tahminiGoster: true, otoOner: true, otoGeriCek: true, panoMod: 'fazla', azamiMemur: 8, isciEk: 0, tema: 'acik', surEsik: 70, surDegilEsik: 15, kapsam: [], ...a, ...(opts.ayarlar || {})};
    Object.keys(C.DURUM_VARSAYILAN).forEach(k => { if (!S.ayar.durumlar[k]) S.ayar.durumlar[k] = C.DURUM_VARSAYILAN[k]; });
  }
  async function planYukle() {
    S.plan = (await depo.get(anahtar(S.y, S.m))) || null;
    S.planAnahtarlari = ((await depo.keys()) || []).filter(k => String(k).startsWith('plan:')).sort();
    if (S.plan && !S.ist) S.ist = (S.plan.birimler.find(b => b.tur === 'istasyon') || {}).ad || '';
    if (S.plan && S.ist && !S.plan.birimler.some(b => b.ad === S.ist)) S.ist = (S.plan.birimler.find(b => b.tur === 'istasyon') || {}).ad || '';
  }
  const bosPlan = () => ({ay: `${S.y}-${C.pad(S.m)}`, durum: 'taslak', birimler: [], kayitlar: [], ozel: {}, log: [], disKurum: [], olusturma: Date.now()});

  // ---------- hesaplar ----------
  const ozel = () => (S.plan && S.plan.ozel) || {};
  function kisCtx(plan, ad) {
    const D = durumlar(), out = [];
    plan.kayitlar.forEach(k => {
      if (k.birim === ad) out.push(k);
      else if (k.gorev && k.gorev.hedef === ad && D[k.durum] && D[k.durum].disarida) out.push({...k, durum: 'GEÇİCİ GÖREVLİ', _gelen: true});
    });
    return out;
  }
  const birimKisileri = ad => kisCtx(S.plan, ad);
  function hesaplaCtx(plan, y, m, birim, kisiler) {
    return C.istasyonHesap(kisiler || kisCtx(plan, birim.ad), y, m, plan.ozel || {}, durumlar(), {isciDusulen: S.ayar.isciDusulen, azamiMemur: S.ayar.panoMod === 'mesai' ? 0 : (birim.azamiMemur != null ? birim.azamiMemur : S.ayar.azamiMemur), isciEk: 0, mod: S.ayar.panoMod, surEsik: S.ayar.surEsik, surDegilEsik: S.ayar.surDegilEsik}, birim.ekipOf ? 0 : birim.yuva);
  }
  const hesapla = birim => hesaplaCtx(S.plan, S.y, S.m, birim);
  const planlananToplam = (hesap) => hesap.satir.filter(s => !s.nobetYok).reduce((a, s) => a + sayi(s.k.planlanan), 0);

  // ---------- görünüm yardımcıları ----------
  function satirRenk(k) {
    const D = durumlar(), dt = D[k.durum] || {}, izin = izinAyGun(k) > 0;
    if (k.gorev && k.gorev.hedef && dt.disarida) return D['GEÇİCİ GÖREVDE'].renk;
    if (k.durum === 'GEÇİCİ GÖREVLİ' && izin) return '#95B3D7';
    if (dt.renk) return dt.renk;
    if (izin) return '#FFFF00';
    return '';
  }
  // Kişinin izninin plan ayına düşen takvim günü: tarihli (ASOS) izinlerde yalnız bu aya taşan günler, tarihsiz izinlerde girilen gün sayısı
  function izinAyGun(k) {
    const ay = `${S.y}-${C.pad(S.m)}`; let n = 0;
    (k.izin || []).forEach(i => {
      if (i.bas && i.bit) { for (let ms = Date.parse(i.bas + 'T00:00:00Z'); ms <= Date.parse(C.izinSon(i) + 'T00:00:00Z'); ms += 864e5) if (new Date(ms).toISOString().slice(0, 7) === ay) n++; }
      else n += sayi(i.gun);
    });
    return n;
  }
  // Aile hekimliğine geçen personel listede görünür ama hiçbir hesaba girmez; kendi isteği olmadan görevlendirilmez ya da geri çağrılmaz (durumu ancak elle değiştirilebilir)
  const aileHek = k => !!k && k.durum === 'AİLE HEKİMLİĞİNDE';
  const izinTarihli = k => (k.izin || []).some(i => i.bas && i.bit);
  const izinMetin = k => (k.izin || []).filter(i => sayi(i.gun) > 0).map(i => `${fmt(sayi(i.gun))} ${i.tur || ''}`.trim()).join(', ');
  const izinGun = k => (k.izin || []).reduce((a, i) => a + sayi(i.gun), 0);
  function gorevMetin(k) {
    const g = k.gorev; if (!g) return k.durumMetin && !C.durumAnahtar(k.durumMetin) ? k.durumMetin : '';
    return [g.hedef || g.yer, g.tarih].filter(Boolean).join(' ');
  }
  const gorevGosterim = k => (k.durum === 'GEÇİCİ GÖREVLİ' && k._gelen ? (k.birim + ' kadrosundan') : gorevMetin(k));
  const durumGosterim = k => k.durumMetin || k.durum || '';

  function personelSirala(a, b) {
    const sg = {doktor: 0, memur: 1, isci: 2};
    return (sg[a.sinif] - sg[b.sinif]) || ((a.sira ?? 1e9) - (b.sira ?? 1e9)) || trCollator.compare(a.ad, b.ad);
  }
