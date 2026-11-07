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
const fmt = v => ((Math.round(v * 100) / 100) || 0).toLocaleString('tr-TR', {maximumFractionDigits: 2});      // -0 yazılmaz
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const trCollator = new Intl.Collator('tr', {numeric: true});
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
    y: 0, m: 0, plan: null, sayfa: 'pano', ist: '', ayar: null, filtre: {q: '', durum: '', birim: '', sinif: ''}, modal: null, planAnahtarlari: [], toastlar: [], rotKaynak: 'fazla', gorevSekme: 'deg', pSayfa: 0, pBoyut: 50, modul: 1, n2: {ist: '', sekme: 'plan', gorunum: 'yuva', oneri: null, kural: {}, sonuc: null}, arsivVeri: null, yuklemeler: null, arsivIstler: [], arstatAc: '', arstatAra: '', arstatYil: {}, arsivSecili: null, arsivIst: ''
  };
  try { S.yanDar = localStorage.getItem('ap_yan_dar') === '1'; } catch (er) { S.yanDar = false; }      // gömülü sol menü daraltılmış mı (bu tarayıcıda)
  const bugun = new Date(), sonraki = new Date(Date.UTC(bugun.getUTCFullYear(), bugun.getUTCMonth() + 1, 1));
  S.y = sonraki.getUTCFullYear(); S.m = sonraki.getUTCMonth() + 1;      // planlama bir sonraki ay içindir
  const GUNCEL_Y = S.y, GUNCEL_M = S.m, BUGUN = new Date(), MEVCUT = BUGUN.getFullYear() * 12 + BUGUN.getMonth() + 1, guncelAy = () => S.y * 12 + S.m >= MEVCUT;      // güncel ay dışındaki aylar yalnızca görüntülenir (salt okunur)
  const olay = (ad, d) => { try { root.dispatchEvent(new CustomEvent('ashiplan:' + ad, {detail: d, bubbles: true})); } catch (e) {} if (opts.olaylar && opts.olaylar[ad]) opts.olaylar[ad](d); };

  const anahtar = (y, m) => `plan:${y}-${C.pad(m)}`;
  const durumlar = () => S.ayar.durumlar;
  // Gömülü mod düzenleme kilidi (opts.kilit, ana uygulamadan): Modül 1'de ay başına bir planlayıcı, Modül 2'de istasyon başına bir kişi düzenler
  const kilitVar = !!(opts.kilit && opts.kilit.iste);
  S.kilit = {kapsam: null, bende: !kilitVar, kim: ''};
  const kilitBende = () => !kilitVar || !S.kilit.kapsam || S.kilit.bende;
  const kilitMesaj = () => S.kilit.kim ? `${S.kilit.kim} şu an ${S.modul === 2 ? 'bu istasyonu' : 'planlamayı'} düzenliyor; siz salt okunur görüyorsunuz.` : 'Düzenleme izni bekleniyor…';
  function kilitKapsam() {
    if (!kilitVar || !S.plan || !guncelAy() || S.rol === 'salt_okur') return null;
    const ay = `${S.y}-${C.pad(S.m)}`;
    if (S.plan.durum === 'kilitli') return S.kilitAcBekle && S.rol === 'yonetici' ? `${ay}|ana` : null;      // kilitli ay: yalnız yönetici "Kilidi aç" dediğinde planlama kilidi istenir
    if (S.modul === 2) { if (S.rol === 'istasyon' && S.plan.durum !== 'kesin') return null; const i = typeof n2Ist === 'function' ? n2Ist() : ''; return i ? `${ay}|ist|${i}` : null; }   // istasyon, plan kesinleşmeden düzenleyemez: kilit almaz
    return S.rol === 'istasyon' ? null : `${ay}|ana`;
  }
  function kilitGuncelle() { if (!kilitVar) return; const k = kilitKapsam(); if (k === S.kilit.kapsam) return; S.kilit = {kapsam: k, bende: false, kim: ''}; opts.kilit.iste(k); }
  if (kilitVar) opts.kilit.onDegis = async d => {
    if (!d || d.kapsam !== S.kilit.kapsam) return;
    const once = S.kilit.bende; S.kilit = {kapsam: d.kapsam, bende: !!d.bende, kim: d.kim || ''};
    if (S.kilit.bende && !once && !S.kaydetBekliyor) { const ist = S.ist, n2 = S.n2 && S.n2.ist; await planYukle(); S.ist = ist || S.ist; if (n2 && S.n2) S.n2.ist = n2; }   // düzenleme izni gelince güncel planı sunucudan al
    if (S.kilitAcBekle && S.kilit.kapsam && S.kilit.kapsam.endsWith('|ana')) {      // "Kilidi aç" planlama kilidini bekliyordu
      if (S.kilit.bende) { await ayKilidiAc(); return; }
      if (S.kilit.kim) { S.kilitAcBekle = false; toast(`${S.kilit.kim} şu an planlamayı düzenliyor; ay kilidi şimdi açılamadı.`); }
    }
    render();
  };
  const salt = () => S.rol === 'salt_okur' || !guncelAy() || (S.plan && S.plan.durum === 'kilitli') || (S.modul !== 2 && !kilitBende());
  let kaydetZamani = null;
  // Kayıt sürerken (bekleme + sunucuya yazma) S.kaydetBekliyor açık kalır; S.yazNo her kayıt isteğinde artar (gömülü moddaki periyodik yenileme bunlara bakar)
  S.yazNo = 0;
  let yaziliyor = 0;
  const planYaz = async () => { S.yazNo++; S.kaydetBekliyor = true; yaziliyor++; try { if (S.plan) { await depo.put(anahtar(S.y, S.m), S.plan); olay('plan:degisti', {ay: `${S.y}-${S.m}`}); } } finally { yaziliyor--; if (!kaydetZamani && !yaziliyor) S.kaydetBekliyor = false; } };
  const kaydetIptal = () => { clearTimeout(kaydetZamani); kaydetZamani = null; if (!yaziliyor) S.kaydetBekliyor = false; };
  const kaydet = () => { S.yazNo++; S.kaydetBekliyor = true; clearTimeout(kaydetZamani); kaydetZamani = setTimeout(() => { kaydetZamani = null; planYaz().catch(e => console.error(e)); }, 300); };
  // Ay kilidini açma (yalnız yönetici): kilitli ay mut() ile değiştirilemediğinden bu işlem salt() engelini bilinçli olarak aşar; plan 'kesin' durumuna döner.
  // Gömülü modda önce planlama ('ana') kilidi alınır (ana belge yalnız o kilit bu sekmedeyken sunucuya yazılır), sonra durum hemen yazılır.
  async function ayKilidiAc() {
    S.kilitAcBekle = false;
    if (S.rol !== 'yonetici' || !S.plan || S.plan.durum !== 'kilitli' || !guncelAy()) { render(); return; }
    S.plan.durum = 'kesin'; logla('Ay kilidi açıldı', 'kilitli → kesin'); damgala();
    kaydetIptal(); await planYaz();
    toast(`${ayEtiket()} kilidi açıldı; plan "Kesinleşti" durumunda.`); render();
  }
  function ayKilidiAcIste() {
    if (S.rol !== 'yonetici') { toast('Ay kilidini yalnızca yönetici açabilir.'); return; }
    if (!S.plan || S.plan.durum !== 'kilitli' || !guncelAy()) return;
    if (!confirm(`${ayEtiket()} ayının kilidi açılsın mı?\n\nPlan "Kesinleşti" durumuna döner ve yeniden düzenlenebilir. İşlem günlüğe yazılır.`)) { render(); return; }
    if (!kilitVar) { ayKilidiAc(); return; }
    S.kilitAcBekle = true; render();      // render → kilitGuncelle: 'ana' kilidi istenir; izin gelince onDegis ayKilidiAc'ı çağırır
  }
  const ayarKaydet = () => { if (S.sayfa === 'ayar' && S.modul !== 2) S.ayar.damga = {ad: (opts.kullanici && opts.kullanici.ad) || ROLLER[S.rol] || S.rol, t: Date.now()}; const r = depo.put('ayar', S.ayar); setTimeout(() => arsivArkaPlan(), 800); return r; };     // hesap ayarı değişirse arşiv arka planda yenilenir
  const HESAP_SURUM = 9;      // hesaplama yöntemi (formüller, yuva kuralları, görev/izin yorumu) değiştikçe artırılır
  function toast(t) { const id = uid(); S.toastlar.push({id, t}); toastCiz(); setTimeout(() => { S.toastlar = S.toastlar.filter(x => x.id !== id); toastCiz(); }, 5000); }
  function toastCiz() { root.querySelectorAll('.ap-toast').forEach(e => e.remove()); S.toastlar.forEach((x, i) => { const e = document.createElement('div'); e.className = 'ap-toast'; e.style.bottom = (14 + i * 46) + 'px'; e.textContent = x.t; root.appendChild(e); }); }
  function logla(islem, detay) { if (!S.plan) return; (S.plan.log = S.plan.log || []).unshift({t: Date.now(), rol: S.rol, islem, detay: detay || ''}); if (S.plan.log.length > 1500) S.plan.log.length = 1500; }
  // Sayfa bazlı "Son kayıt" damgası (112stoktakip Depo modülündeki gibi): değişiklik hangi sayfadan yapıldıysa o sayfanın damgası güncellenir.
  // Modül 1: plan.damga['sayfa:<sayfa>'], istasyon sayfasında istasyon bazında plan.damga['ist:<istasyon>'];
  // Modül 2: istasyonun nöbet verisinde plan.nobet[istasyon].damga (ana uygulamada istasyon başına ayrı parça olarak saklanır); Ayarlar: S.ayar.damga
  const damgaAd = () => (opts.kullanici && opts.kullanici.ad) || ROLLER[S.rol] || S.rol;
  const damgaYeni = () => ({ad: damgaAd(), t: Date.now()});
  const damgaAnahtar = () => S.sayfa === 'ist' ? 'ist:' + S.ist : 'sayfa:' + (S.sayfa || 'pano');
  function damgala() {
    if (!S.plan || S.modul === 2) return;
    const d = S.plan.damga = (S.plan.damga && typeof S.plan.damga === 'object') ? S.plan.damga : {};
    d[damgaAnahtar()] = damgaYeni();
  }
  const p2 = n => String(n).padStart(2, '0');
  const damgaZaman = t => { const d = new Date(t); return `${p2(d.getDate())}.${p2(d.getMonth() + 1)}.${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`; };
  const damgaHtml = d => d && d.t ? `<div class="ap-damga" title="Bu sayfada son değişikliği yapan kişi ve zamanı">Son kayıt: ${esc(d.ad || '')} · ${damgaZaman(d.t)}</div>` : '';
  function mut(fn, islem, detay) {
    if (salt()) { toast(!guncelAy() ? 'Geçmiş aylar salt okunurdur (arşiv görünümü). Güncel aya dönün.' : S.plan && S.plan.durum === 'kilitli' ? (S.rol === 'yonetici' ? 'Bu ay kilitli; değiştirmek için önce "Kilidi aç".' : 'Bu ay kilitli.') : !kilitBende() ? kilitMesaj() : 'Salt okur modundasınız.'); return false; }
    fn(); if (!S.toplu) otoHesapla(); if (islem) logla(islem, detay); damgala(); kaydet(); return true;
  }

  async function ayarYukle() {
    const a = (await depo.get('ayar')) || {};
    S.ayar = {durumlar: JSON.parse(JSON.stringify(C.DURUM_VARSAYILAN)), isciDusulen: 11, tahminiGoster: true, otoOner: true, otoGeriCek: true, panoMod: 'fazla', azamiMemur: 8, isciEk: 0, tema: 'acik', surEsik: 70, surDegilEsik: 15, kapsam: [], ...a, ...(opts.ayarlar || {})};
    Object.keys(C.DURUM_VARSAYILAN).forEach(k => { if (!S.ayar.durumlar[k]) S.ayar.durumlar[k] = C.DURUM_VARSAYILAN[k]; });
    // Sürüm 12.47: yarı zamanlı nöbet listesine girer (mesainin yarısı kadar); eski kayıtlı ayarda 'Nöbet yok' işaretliyse bir kez kaldırılır
    if (!S.ayar.yariZamanliV2 && S.ayar.durumlar['YARI ZAMANLI']) { S.ayar.durumlar['YARI ZAMANLI'] = {...S.ayar.durumlar['YARI ZAMANLI'], nobetYok: false, mesaiOran: 0.5}; S.ayar.yariZamanliV2 = true; }
  }
  // Ekip OF (kapalı istasyon) bilgisi aylar arasında kalıcıdır: kullanıcı açana kadar her ayın planında kapalı gelir
  function ofUygula(plan) {
    if (!plan || !S.ayar) return;
    if (!Array.isArray(S.ayar.ofIst)) S.ayar.ofIst = plan.birimler.filter(b => b.ekipOf).map(b => b.ad);
    plan.birimler.forEach(b => { if (b.tur === 'istasyon') b.ekipOf = S.ayar.ofIst.includes(b.ad); });
  }
  async function planYukle() {
    S.plan = (await depo.get(anahtar(S.y, S.m))) || null;
    if (S.plan && guncelAy()) ofUygula(S.plan);
    try { const py = S.m === 1 ? S.y - 1 : S.y, pm = S.m === 1 ? 12 : S.m - 1, op = await depo.get(anahtar(py, pm)); S.oncePlanBirim = new Map(); ((op && op.kayitlar) || []).forEach(k => { if (k.tc) S.oncePlanBirim.set(k.tc, {birim: k.birim, kadroTarih: k.kadroTarih || ''}); });
      // Modül 2: önceki ayın nöbet listeleri (son günlerdeki nöbetler dinlenme / gün aşırı kurallarında hesaba katılır)
      S.onceNobet = {y: py, m: pm, nobet: (op && op.nobet) || {}, ad: new Map(((op && op.kayitlar) || []).map(k => [k.id, {ad: C.TR(k.ad || ''), tc: k.tc || ''}]))}; } catch (e) { S.oncePlanBirim = new Map(); S.onceNobet = null; }
    S.planAnahtarlari = ((await depo.keys()) || []).filter(k => String(k).startsWith('plan:')).sort();
    if (S.plan && !S.ist) S.ist = (S.plan.birimler.find(b => b.tur === 'istasyon') || {}).ad || '';
    if (S.plan && S.ist && !S.plan.birimler.some(b => b.ad === S.ist)) S.ist = (S.plan.birimler.find(b => b.tur === 'istasyon') || {}).ad || '';
    try { bitenGorevleriKapat(); } catch (e) { console.warn('biten görev kontrolü', e); }
    try { await kisaGelenKontrol(); } catch (e) { console.warn('kısa görev kontrolü', e); }
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
  // Bir istasyonda azami nöbet elle yazılmışsa o istasyon, genel moddan bağımsız olarak 'fazla mesaili' hesaplanır
  const istMod = b => b && b.azamiMemur != null ? 'fazla' : S.ayar.panoMod;
  const azamiDeger = b => b && b.azamiMemur != null ? b.azamiMemur : S.ayar.azamiMemur;
  function hesaplaCtx(plan, y, m, birim, kisiler) {
    return C.istasyonHesap(kisiler || kisCtx(plan, birim.ad), y, m, plan.ozel || {}, durumlar(), {isciDusulen: S.ayar.isciDusulen, hedefYuvarla: !!S.ayar.hedefYuvarla, azamiMemur: istMod(birim) === 'mesai' ? 0 : azamiDeger(birim), isciEk: 0, mod: istMod(birim), surEsik: S.ayar.surEsik, surDegilEsik: S.ayar.surDegilEsik, attEsIzin: birim.tur === 'istasyon' && birim.tip !== 'A1'}, birim.ekipOf ? 0 : birim.yuva);
  }
  const hesapla = birim => hesaplaCtx(S.plan, S.y, S.m, birim);
  const planlananToplam = (hesap) => hesap.satir.filter(s => !s.nobetYok).reduce((a, s) => a + sayi(s.k.planlanan), 0);

  // ---------- görünüm yardımcıları ----------
  // Satır rengi: ekran, PNG ve Excel'de aynı (planlama biriminin aylık dosyasındaki renk açıklaması)
  const RENK = {gelen: '#8DB4E2', giden: '#C0504D', izin: '#FFFF00', rapor: '#A6A6A6', analik: '#B1A0C7', uzun: '#9BBB59'};
  const RENK_LEJANT = [['gelen', '1 aylık gelen personel'], ['giden', 'Giden personel'], ['izin', 'Yıllık izinli personel'], ['rapor', 'Raporlu personel'], ['analik', 'Analık hakkındaki personel (doğum, gebe, süt izni)'], ['uzun', 'Uzun süreli görevle gelen personel (3 ay ve üzeri)']];
  function satirRenk(k, gelen) {
    const D = durumlar(), d = k.durum || '';
    if (gizliKisi(k)) return (D[d] && D[d].renk) || RENK.rapor;   // aile hekimliği / uzmanlık eğitimi: pasif (gri), görev bilgisi olsa da kırmızı olmaz
    if (gelen || d === 'GEÇİCİ GÖREVLİ') return k.gorev && xlUzunGorev(k.gorev) ? RENK.uzun : RENK.gelen;   // 3 ay+ gelen de yeşil (uzun süreli)
    if (k.gorev && (k.gorev.hedef || k.gorev.yer) && (D[d] || {}).disarida) return RENK.giden;   // kadrosunun olduğu yerde giden hep kırmızı; yeşil yalnız gittiği yerde (uzun süreli gelen)
    if (/RAPORLU/.test(d)) return RENK.rapor;
    if (/ANALIK|DOĞUM|GEBE|GEBELİK/.test(d) || k.sut > 0) return RENK.analik;
    if (D[d] && D[d].renk) return D[d].renk;
    if (izinAyGun(k) > 0) return RENK.izin;
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
  // Aile hekimliği ve uzmanlık eğitimindekiler: yalnız planlama yapanlara (yönetici/planlayıcı) ve listelerin en altında görünür; istasyon planlama görünümünde yer almaz
  const gizliKisi = k => !!k && (k.durum === 'AİLE HEKİMLİĞİNDE' || k.durum === 'UZMANLIK EĞİTİMİ'), planlamaRol = () => S.rol === 'yonetici' || S.rol === 'planlayici';
  const izinTarihli = k => (k.izin || []).some(i => i.bas && i.bit);
  const izinMetin = k => (k.izin || []).filter(i => sayi(i.gun) > 0).map(i => `${fmt(sayi(i.gun))} ${i.tur || ''}`.trim()).join(', ');
  const izinGun = k => (k.izin || []).reduce((a, i) => a + sayi(i.gun), 0);
  function gorevMetin(k) {
    const g = k.gorev; if (!g) return k.durumMetin && !C.durumAnahtar(k.durumMetin) ? k.durumMetin : '';
    return [g.hedef || g.yer, g.tarih].filter(Boolean).join(' ');
  }
  const gorevGosterim = k => (k.durum === 'GEÇİCİ GÖREVLİ' && k._gelen ? (k.birim + ' kadrosundan') : gorevMetin(k));
  const durumGosterim = k => k.durumMetin || k.durum || '';

  // Branş sırası (tüm kişi listeleri, PNG ve Excel çıktıları): doktor (tabip) → memur [AABT → ATT → diğer memur unvanları → sürücü olarak çalışan ATT
  // (nöbet rolü sürücü)] → işçi. Grup (doktor / memur / işçi) ayrımı korunur; aynı branşta ASOS sırası, sonra ad.
  const ATT_RE = /\bATT\b|ACIL TIP TEKNISYEN|SAGLIK MEMUR|SAGLIK TEKNISYEN/;
  const surEsikleri = () => ({sur: ((S.ayar && S.ayar.surEsik) ?? 70) / 100, degil: ((S.ayar && S.ayar.surDegilEsik) ?? 15) / 100});
  function bransSira(k, grup) {
    if (k.sinif === 'doktor') return 0;
    if (k.sinif === 'isci') return 9;
    const g = grup || C.grupBelirle(k, surEsikleri(), S.ayar);
    if (g === 'ke' || g === 'ka') return 1;      // AABT (sürücü teyitli AABT de AABT sırasında kalır)
    if (g === 'sy') return 4;                     // nöbet rolü sürücü olan ATT: memurların en altı
    return ATT_RE.test(C.TR((k.unvan || '') + ' ' + (k.kadroBrans || ''))) ? 2 : 3;
  }
  // satirMap: istasyon hesabındaki satırlar (id → {grup}); verilmezse grup kişiden hesaplanır
  // Başhekimlik / KKM gibi nöbet hesabı olmayan birimlerde sıra unvandan: doktor → AABT → ATT → diğer sağlık → diğer (idari, sürücü olmayan işçi) → sürücü → işçi sürücü
  function idariSira(k) {
    const u = C.TR((k.unvan || '') + ' ' + (k.kadroBrans || '') + ' ' + (k.kadroTur || ''));
    if (k.sinif === 'doktor' || /TABIP|DOKTOR|HEKIM|UZMAN DR/.test(u)) return 0;
    const surucu = /SOFOR|SURUCU/.test(u);
    if (k.sinif === 'isci' || /ISCI/.test(u)) return surucu ? 7 : 4;      // sürücü olmayan işçi idari personelle
    if (/\bAABT\b|AMBULANS VE ACIL BAKIM|PARAMEDIK|TEKNIKER/.test(u)) return 1;
    if (/\bATT\b|ACIL TIP TEKNISYEN/.test(u)) return 2;
    if (surucu) return 5;
    if (/HEMSIRE|EBE\b|SAGLIK|TEKNISYEN|ECZACI|BIYOLOG|PSIKOLOG|DIYETISYEN|FIZYOTERAPIST|LABORANT|RADYOLOJI/.test(u)) return 3;
    return 4;
  }
  const kisiSirala = (satirMap, idari) => (a, b) => (gizliKisi(a) - gizliKisi(b)) || (idari ? idariSira(a) - idariSira(b) : 0) || (bransSira(a, satirMap && satirMap.get(a.id) && satirMap.get(a.id).grup) - bransSira(b, satirMap && satirMap.get(b.id) && satirMap.get(b.id).grup)) || ((a.sira ?? 1e9) - (b.sira ?? 1e9)) || trCollator.compare(a.ad || '', b.ad || '');
  const nobetSirala = kisiSirala;
  const personelSirala = kisiSirala(null);
  // Başhekimlik / KKM nöbeti: Nöbet Listesi Raporunun İdari / Komuta satırlarından; son 6 ayda nöbet kaydı olan kişi "nöbet tutar" sayılır
  // Planlama yetkilisi bu durumu elle değiştirebilir: k.idariNobetElle true (nöbet tutar) / false (nöbet tutmaz); alan yoksa rapordan otomatik
  const idariNobetOto = k => { if (!k || !k.idariNobet || !k.idariNobet.aylar) return false; const t = S.y * 12 + S.m - 1; return Object.keys(k.idariNobet.aylar).some(a => { const x = (+a.slice(0, 4)) * 12 + (+a.slice(5)) - 1; return x <= t && x > t - 6; }); };
  const idariNobetVar = k => !!k && (typeof k.idariNobetElle === 'boolean' ? k.idariNobetElle : idariNobetOto(k));
