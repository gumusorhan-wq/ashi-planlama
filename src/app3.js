
  // ---------- içe aktarma ----------
  const dosyaSec = (accept, coklu) => new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !!coklu; i.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
    document.body.appendChild(i);                       // Safari/iOS: DOM'a eklenmeden change olayı güvenilir değil
    const bitir = v => { setTimeout(() => i.remove(), 0); res(v); };
    i.addEventListener('change', () => bitir(coklu ? [...i.files] : (i.files[0] || null)));
    i.addEventListener('cancel', () => bitir(coklu ? [] : null));
    i.click();
  });
  const dosyaOku = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(new Uint8Array(r.result)); r.onerror = () => rej(r.error); r.readAsArrayBuffer(f); });
  async function xlsOku(f) { const wb = XLSX.read(await dosyaOku(f), {type: 'array', cellDates: false}); return wb; }
  const sayfaSatir = ws => XLSX.utils.sheet_to_json(ws, {header: 1, defval: ''});
  const indir = (blob, ad) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = ad; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };

  const ISTASYON_ADI = metin => {            // "MANİSA YUNUSEMRE 2 NOLU ACİL SAĞLIK HİZMETLERİ İSTASYONU" → "YUNUSEMRE 2"
    let t = String(metin || '').toLocaleUpperCase('tr-TR').replace(/^T\.C\. SAĞLIK BAKANLIĞI\s+/, '').trim();
    t = t.replace(/^MANİSA\s+/, ''); const i = t.indexOf(' NOLU'); if (i > 0) t = t.slice(0, i);
    return t.replace(/\s+/g, ' ').trim();
  };
  const KKM_AD = 'KOMUTA KONTROL MERKEZİ', BH_AD = 'BAŞHEKİMLİK';
  function birimCoz(plan, metin) {                 // metin → mevcut/yeni birim adı ve türü; dış birimse null
    const t = C.TR(metin);
    if (!t) return null;
    if (/KOMUTA KONTROL/.test(t)) return ekleBirim(plan, KKM_AD, 'kkm');
    if (/BASHEKIM/.test(t)) return ekleBirim(plan, BH_AD, 'bashekimlik');
    const anahtar = C.istAnahtar(metin);
    if (anahtar && /ACIL SAGLIK HIZMETLERI|\bASHI\b|\bIASB\b/.test(t) && !/AILE HEK|HASTANE|SAGLIK MUDURLUGU|SAGLIK OCAGI/.test(t)) {   // aile hekimliği, hastane, sağlık müdürlüğü istasyon değildir
      const var_ = plan.birimler.find(b => b.tur === 'istasyon' && C.istAnahtar(b.ad) === anahtar);
      return var_ ? var_.ad : ekleBirim(plan, ISTASYON_ADI(metin), 'istasyon');
    }
    return null;
  }
  function ekleBirim(plan, ad, tur) { if (!plan.birimler.some(b => b.ad === ad)) plan.birimler.push({ad, tur, yuva: C.YUVA_VARSAYILAN}); return ad; }
  function birimTemizle(plan) {                     // kayıt ve görev hedefi olmayan boş istasyonları kaldırır (ör. hatalı tanınmış birimler)
    plan.birimler = plan.birimler.filter(b => b.tur !== 'istasyon' || plan.kayitlar.some(k => k.birim === b.ad || (k.gorev && k.gorev.hedef === b.ad)));
  }
  const ashiMetni = t => { const x = C.TR(t); return /ACIL SAGLIK HIZMETLERI|\bASHI\b|\bIASB\b/.test(x) && !/AILE HEK|HASTANE|SAGLIK MUDURLUGU|SAGLIK OCAGI/.test(x); };
  function planOnar(plan) {                         // eski sürümde yanlış istasyon sayılan birimleri (aile hekimliği vb.) düzeltir
    let degisti = false;
    plan.kayitlar.forEach(k => {
      const g = k.gorev; if (!g || !g.hedef || g.kaynak !== 'asos' || !g.yer || g.yer === g.hedef) return;
      const b = plan.birimler.find(x => x.ad === g.hedef);
      if (b && b.tur === 'istasyon' && !ashiMetni(g.yer)) { g.hedef = null; degisti = true; }
    });
    const once = plan.birimler.length; birimTemizle(plan); if (plan.birimler.length !== once) degisti = true;
    return degisti;
  }
  function birimSirala(plan) {
    const sira = {istasyon: 0, kkm: 1, bashekimlik: 2, diger: 3};
    const no = ad => { const m = String(ad).match(/^(.*?)\s+(\d+)\b/); return m ? [m[1], +m[2]] : [ad, 0]; };
    plan.birimler.sort((a, b) => (sira[a.tur] - sira[b.tur]) || trCollator.compare(no(a.ad)[0], no(b.ad)[0]) || (no(a.ad)[1] - no(b.ad)[1]));
  }

  // Ad eşleştirme: önce tam (sıra bağımsız), sonra tek adaylı bulanık eşleşme (eksik ikinci ad / kızlık soyadı / 1 harf yazım hatası)
  function lev1(a, b) {
    if (a === b) return true; if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
    const [u, v] = a.length < b.length ? [a, b] : [b, a]; return u.slice(i) === v.slice(i + 1);
  }
  function adBul(kayitlar, adMap, ad, birim) {
    const exact = adMap.get(adAnahtar(ad)); if (exact) return exact;
    const tok = C.TR(ad).split(' ').filter(Boolean);
    if (tok.length >= 2 && birim) {          // elle yalnızca ilk adı yazılmış kayıt: aynı istasyonda, ilk adı eşleşen tek TC'siz kayıt ASOS kişisiyle birleşir
      const tek = kayitlar.filter(k => k.birim === birim && C.TR(k.ad).split(' ').filter(Boolean).length === 1 && lev1(C.TR(k.ad).split(' ')[0], tok[0]));
      if (tek.length === 1) return tek[0];
    }
    if (tok.length < 2) return null;
    const adaylar = kayitlar.filter(k => {
      const kt = C.TR(k.ad).split(' ').filter(Boolean), [a, b] = tok.length <= kt.length ? [tok, kt] : [kt, tok];
      return a.length >= 2 && a.every(t => b.some(u => lev1(t, u)));
    });
    return adaylar.length === 1 ? adaylar[0] : null;
  }
  // ASOS raporları: (A) "Başhekimlik Komuta İstasyon Personel Listesi Raporu (EKİP)" ve (B) "Personel Listesi Raporu". İkisi de TC ile birleştirilir.
  const gunSon = () => C.iso(S.y, S.m, C.gunSayisi(S.y, S.m));
  function asosParse(wb) {
    let rows = [], hi = -1;
    for (const ad of wb.SheetNames) { rows = sayfaSatir(wb.Sheets[ad]); hi = rows.slice(0, 8).findIndex(r => r.some(c => /^(TC KIMLIK NO|TCKN|T\.C NO)$/.test(C.TR(c)))); if (hi >= 0) break; }
    if (hi < 0) throw new Error('"TC Kimlik No" başlığı bulunamadı. ASOS\'tan indirilen "Personel Listesi Raporu" veya EKİP "Başhekimlik Komuta İstasyon Personel Listesi Raporu" dosyasını seçin.');
    const H = rows[hi].map(C.TR);
    if (H.includes('NOBET GOREVI')) return {tur: 'N', satirlar: asosParseN(rows, hi)};
    if (H.includes('SIRA NO') && H.includes('ADI SOYADI') && H.some(h => /^\d+ [A-Z]+ 20\d\d/.test(h))) throw new Error('Bu dosya "Nöbet Listesi Döküm Cetveli": kişinin hangi günler kaç saat nöbet tuttuğunu içerir ama ekip şefi / YSP / sürücü görevini içermez. Sürücülüğü doğrulamak için ASOS\'tan "Nöbet İçi Hareket Raporu"nu (Nöbet Görevi sütunlu dosya) yükleyin.');
    if (H.includes('KADRO UNVANI') && H.includes('CALISMA DURUMU')) return {tur: 'A', satirlar: asosParseA(rows, hi)};
    if (H.includes('IZIN TURU') && H.includes('IZIN TIPI') && H.includes('AD SOYAD')) return {tur: 'I', satirlar: asosParseI(rows, hi)};
    if (H.includes('IZIN TIPI') || H.includes('MUAFIYET TIPI')) return {tur: 'B', satirlar: asosParseB(rows, hi)};
    throw new Error('Başlıklar tanınmadı (' + H.filter(Boolean).slice(0, 6).join(', ') + '…). ' + 'Tanınmayan ASOS rapor biçimi. Beklenen: EKİP Personel Listesi Raporu ya da Personel Listesi Raporu.');
  }
  // Nöbet İçi Hareket Raporu / Nöbet Listesi Raporu (Nöbet Sayım uygulamasındaki dosya): kişinin ekip şefi / YSP / sürücü olarak tuttuğu nöbet saatleri
  function asosParseN(rows, hi) {
    const H = rows[hi].map(C.TR), ix = re => H.findIndex(h => re.test(h));
    const adI = ix(/^AD$/), soyI = ix(/^SOYAD$/), ebI = ix(/^EKIBIN ISTASYON BILGISI$/), enI = ix(/^EKIP ADI$/), nlbI = ix(/^NOBET LISTESI BRANSI$/), ti = ix(/^(TCKN|TC KIMLIK NO)$/), gi = ix(/^NOBET GOREVI$/), si = ix(/^NOBET SURESI/), eti = ix(/^EKIP TURU$/), epi = ix(/^EKIP TIPI$/), bi = ix(/BASLANGIC TARIHI|NOBET TARIHI|^TARIH$/);
    const out = [], tani = {satir: 0, tcYok: 0, istasyonDisi: 0, ambulansDisi: 0, rolYok: {}, sureYok: {}, ok: 0, baslik: rows[hi].filter(Boolean).join(' | '), gorevler: {}};
    const ornek = (o, v) => { v = String(v ?? '').trim() || '(boş)'; o[v] = (o[v] || 0) + 1; };
    // süre: "24", "24 saat", "24:00", "12,5", "1 gün"
    const saatOku = v => {
      const t = C.TR(String(v ?? '')).trim(); if (!t) return 0; let m;
      if (/^MESAI/.test(t)) return 8;
      if ((m = t.match(/^(\d+):(\d{2})/))) return +m[1] + +m[2] / 60;
      if ((m = t.match(/^(\d+(?:[.,]\d+)?)\s*(SAAT|SA|S)?$/))) return parseFloat(m[1].replace(',', '.'));
      if ((m = t.match(/^(\d+(?:[.,]\d+)?)\s*GUN/))) return parseFloat(m[1].replace(',', '.')) * 24;
      return 0;
    };
    rows.slice(hi + 1).forEach(r => {
      tani.satir++;
      const tc = String(r[ti] || '').replace(/\D/g, ''); if (!tc) { tani.tcYok++; return; }
      if (eti >= 0 && !/ISTASYON/.test(C.TR(r[eti]))) { tani.istasyonDisi++; return; }
      if (epi >= 0 && r[epi] !== '' && !/AMBULANS/.test(C.TR(r[epi]))) { tani.ambulansDisi++; return; }
      const g = C.TR(r[gi]); ornek(tani.gorevler, r[gi]);
      const rol = /EKIP SORUMLUSU|EKIP SEFI|SORUMLU/.test(g) ? 'es' : /YARDIMCI SAGLIK|YSP|REFAKATCI|SAGLIK PERSONELI|ATT|PARAMEDIK/.test(g) ? 'ysp' : /SURUCU|SOFOR|AMBULANS SURUCU/.test(g) ? 'sur' : '';
      if (!rol) { ornek(tani.rolYok, r[gi]); return; }
      let saat = si >= 0 ? saatOku(r[si]) : 0;
      if (!(saat > 0)) { if (si >= 0) ornek(tani.sureYok, r[si]); saat = 1; }       // süre okunamazsa her kayıt eşit ağırlıkta sayılır (yalnız oran önemli)
      tani.ok++; out.push({tc, rol, saat, ad: ((adI >= 0 ? r[adI] : '') + ' ' + (soyI >= 0 ? r[soyI] : '')).trim().toLocaleUpperCase('tr-TR'), brans: nlbI >= 0 ? String(r[nlbI] || '') : '', birimMetin: String(ebI >= 0 && r[ebI] ? r[ebI] : (enI >= 0 ? r[enI] : '') || ''), mesai: si >= 0 && /^MESAI/.test(C.TR(r[si])), bas: bi >= 0 ? String(r[bi]) : '', ay: bi >= 0 ? C.tarihIso(r[bi]).slice(0, 7) : ''});
    });
    out.tani = tani; return out;
  }
  function asosParseA(rows, hi) {
    const ix = {}; rows[hi].forEach((h, i) => { ix[C.TR(h)] = i; });
    const g = (r, a) => (ix[a] === undefined ? '' : r[ix[a]]), out = [];
    rows.slice(hi + 1).forEach((r, n) => {
      const tc = String(g(r, 'TC KIMLIK NO')).replace(/\D/g, ''); if (!tc) return;
      out.push({tur: 'A', tc, ad: `${String(g(r, 'ADI')).trim()} ${String(g(r, 'SOYADI')).trim()}`.toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim(),
        tel: String(g(r, 'CEP TELEFONU') || '').trim(), memBas: C.tarihIso(g(r, 'MEMURIYET BASLANGIC TARIHI')), calisma: String(g(r, 'CALISMA DURUMU') || '').trim(),
        yillikKalan: g(r, 'YILLIK IZIN (KALAN)') === '' ? null : sayi(g(r, 'YILLIK IZIN (KALAN)')), kadroTur: String(g(r, 'KADRO TURU') || '').trim(), kadroBirim: String(g(r, 'KADRO BIRIMI') || '').trim(),
        kadroBrans: String(g(r, 'KADRO BRANSI') || '').trim(), unvan: String(g(r, 'KADRO UNVANI') || '').trim(),
        gecici: {ad: String(g(r, 'GECICI GOREV BIRIMI') || '').trim()}, sira: n});
    });
    return out;
  }
  // Personel İzin-Muafiyet Raporu: her satır bir izin, rapor ya da muafiyet kaydıdır (bir kişide birden çok satır olabilir)
  function asosParseI(rows, hi) {
    const H = rows[hi].map(C.TR), ix = re => H.findIndex(h => re.test(h)), out = [];
    const ti = ix(/^(T\.C NO|TC KIMLIK NO|TCKN)$/), ai = ix(/^AD SOYAD$/), tu = ix(/^IZIN TURU$/), tp = ix(/^IZIN TIPI$/), bi = ix(/^BASLANGIC TARIHI$/), ei = ix(/^BITIS TARIHI$/), gi = ix(/^ALINAN GUN$/), si = ix(/^SILINMIS MI$/);
    rows.slice(hi + 1).forEach(r => {
      const tc = String(r[ti] || '').replace(/\D/g, ''); if (!tc) return;
      if (si >= 0 && /^EVET$/.test(C.TR(r[si]).trim())) return;                      // silinmiş kayıtlar alınmaz
      const tip = String(r[tp] || '').trim(), bas = C.tarihIso(r[bi]), bit = C.tarihIso(r[ei]), muaf = /MUAFIYET/.test(C.TR(r[tu])) || /MUAFIYET|SUT IZN/.test(C.TR(tip));
      let izin = null, mu = [];
      if (muaf) { const T = C.TR(tip), s = T.match(/(\d+(?:[.,]\d+)?)\s*SAAT/); mu = [/NOBET MUAF/.test(T) ? {tur: 'nobet', bas, bit} : /SUT IZN/.test(T) ? {tur: 'sut', bas, bit, saat: s ? parseFloat(s[1].replace(',', '.')) : 0} : {tur: 'diger', bas, bit, ad: tip}]; }
      else izin = {tip, bas, bit, gun: sayi(r[gi])};
      out.push({tur: 'I', tc, ad: String(r[ai] || '').toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim(), izin, muaf: mu});
    });
    return out;
  }
  function asosParseB(rows, hi) {
    const sec = rows[Math.max(0, hi - 1)] || [], ix = {}; let cur = '';
    rows[hi].forEach((h, i) => { if (hi > 0 && sec[i]) cur = C.TR(sec[i]).slice(0, 8); const k = cur + '|' + C.TR(h); if (ix[k] === undefined) ix[k] = i; });
    const g = (r, s, a) => { const i = ix[s + '|' + a]; return i === undefined ? '' : r[i]; }, out = [];
    rows.slice(hi + 1).forEach((r, n) => {
      const tc = String(g(r, 'KIMLIK B', 'TC KIMLIK NO')).replace(/\D/g, ''); if (!tc) return;
      const ds = v => C.tarihIso(v);
      out.push({tur: 'B', tc, ad: `${String(g(r, 'KIMLIK B', 'ADI')).trim()} ${String(g(r, 'KIMLIK B', 'SOYADI')).trim()}`.toLocaleUpperCase('tr-TR').replace(/\s+/g, ' ').trim(),
        unvan: String(g(r, 'OZLUK BI', 'UNVAN') || '').trim(), kadroBrans: String(g(r, 'OZLUK BI', 'BRANS') || '').trim(), kadroTur: String(g(r, 'OZLUK BI', 'ISTIHDAM SEKLI') || '').trim(),
        izin: g(r, 'IZIN BIL', 'IZIN TIPI') ? {tip: String(g(r, 'IZIN BIL', 'IZIN TIPI')).trim(), bas: ds(g(r, 'IZIN BIL', 'BASLANGIC TARIHI')), bit: ds(g(r, 'IZIN BIL', 'BITIS TARIHI')), gun: sayi(g(r, 'IZIN BIL', 'ALINAN GUN'))} : null,
        muaf: C.muafiyetCoz(g(r, 'MUAFIYET', 'MUAFIYET TIPI')), kadroIl: String(g(r, 'ASOS ATA', 'KADRO ILI') || '').trim(),
        kadroBirim: String(g(r, 'ASOS ATA', 'ATAMA BIRIMI ADI') || '').trim(), kadroIstTip: String(g(r, 'ASOS ATA', 'ISTASYON TIPI') || '').trim(), atamaNeden: String(g(r, 'ASOS ATA', 'BASLAYIS NEDENI') || '').trim(), atamaBas: ds(g(r, 'ASOS ATA', 'BASLAYIS TARIHI')),
        aktifBirim: String(g(r, 'AKTIF CA', 'AKTIF BIRIM ADI') || '').trim(), aktifTip: String(g(r, 'AKTIF CA', 'BIRIM TIPI') || '').trim(),
        gecici: {ad: String(g(r, 'GECICI G', 'GECICI GOREV BIRIM ADI') || '').trim(), neden: String(g(r, 'GECICI G', 'BASLAYIS NEDENI') || '').trim(), tip: String(g(r, 'GECICI G', 'BIRIM TIPI') || '').trim(), bas: ds(g(r, 'GECICI G', 'BASLANGIC TARIHI')), bit: ds(g(r, 'GECICI G', 'BITIS TARIHI'))},
        sira: n});
    });
    return out;
  }
  const trTarih = iso => iso ? iso.split('-').reverse().join('.') : '';
  function asosSinif(a) {
    if (/ISCI|SOFOR/.test(C.TR(a.kadroTur + ' ' + a.unvan)) || /SURUCU/.test(C.TR(a.kadroBrans))) return 'isci';
    return C.sinifTespit(a.unvan) || 'memur';
  }
  function asosDurumA(a) {
    const t = C.TR(a.calisma);
    if (/GECICI GOREVLI CALISIYOR/.test(t)) return 'GEÇİCİ GÖREVDE';
    if (/AILE HEK/.test(t)) return 'AİLE HEKİMLİĞİNDE';
    if (/UZMANLIK/.test(t)) return 'UZMANLIK EĞİTİMİ';
    return '';
  }
  const GEREKCE_ESLE = {'PERSONEL IHTIYACI': 'PERSONEL İHTİYACI', 'DIGER': 'DİĞER'};
  // B raporundan plan ayına göre durum / izin / muafiyet / süt izni / geçici görev çıkarır
  function asosAyHesabi(a) {
    const bas = ayIlk(), son = gunSon(), sonuc = {durumB: '', izin: [], sut: 0, gorev: null, durumMetin: ''};
    if (a.izin && a.izin.bit && a.izin.bit > bas && (!a.izin.bas || a.izin.bas <= son)) {
      const t = C.TR(a.izin.tip), uzun = a.izin.bit > son && (!a.izin.bas || a.izin.bas <= bas);
      const dm = /DOGUM ONCESI/.test(t) ? 'DOĞUM ÖNCESİ' : /DOGUM/.test(t) ? 'DOĞUM SONRASI' : /HEYET/.test(t) ? 'HEYET RAPORLU' : /RAPOR/.test(t) ? 'RAPORLU' : '';
      if (dm && uzun) { sonuc.durumB = dm; sonuc.durumMetin = `${a.izin.tip} ${trTarih(a.izin.bas)}–${trTarih(a.izin.bit)}`; }
      else sonuc.izin.push({tur: a.izin.tip.toLocaleUpperCase('tr-TR'), gun: a.izin.gun, bas: a.izin.bas, bit: a.izin.bit});
    }
    (a.muaf || []).forEach(m => {
      if (!(m.bit >= bas && m.bas <= son)) return;
      if (m.tur === 'nobet' && !sonuc.durumB) { sonuc.durumB = 'NÖBET MUAFİYETİ'; sonuc.durumMetin = `Nöbet muafiyeti ${trTarih(m.bas)}–${trTarih(m.bit)}`; }
      if (m.tur === 'sut') sonuc.sut = Math.max(sonuc.sut, m.saat || 0);
    });
    return sonuc;
  }
  function geciciGorev(plan, a) {
    const gc = a.gecici; if (!gc || !gc.ad) return {gorev: null, gecmis: []};
    const hedef = birimCoz(plan, gc.ad), baslik = C.TR(gc.neden);
    const gecmis = gc.bas ? C.aylariListele(gc.bas, gc.bit, bugunIso()) : [];
    if (gc.bit && gc.bit <= ayIlk() && !(gc.bas && gc.bas >= ayIlk())) return {gorev: null, gecmis, sonaErdi: true};   // görev ayın ilk günü bitiyorsa (ör. 01.10–01.11) kişi o ay kadrosuna döner
    return {gorev: {yer: gc.ad, hedef, kaynak: 'asos', yolluk: '', bas: gc.bas || '', bit: gc.bit || '', tarih: gc.bas ? `${trTarih(gc.bas)}${gc.bit ? ' – ' + trTarih(gc.bit) : ''}` : '', gerekce: GEREKCE_ESLE[baslik] || ''}, gecmis};
  }
  const bugunIso = () => new Date().toISOString().slice(0, 10);
  // Gerçekleşen nöbetler (Nöbet Listesi Raporundan): ay → istasyon bazında nöbet sayısı, kişi bazında nöbet ve fazla nöbet, kadrosu dışındaki istasyonlarda tutulan nöbetler
  function birimBul(plan, metin) { const a = C.istAnahtar(metin || ''); if (!a) return ''; const b = plan.birimler.find(x => x.tur === 'istasyon' && C.istAnahtar(x.ad) === a); return b ? b.ad : ''; }
  function gercekHazirla(plan, satirlar) {
    const tcMap = new Map(plan.kayitlar.filter(k => k.tc).map(k => [k.tc, k])), ay = {};
    satirlar.forEach(r => { if (!r.ay || r.mesai) return; const m = (ay[r.ay] = ay[r.ay] || new Map()), e = m.get(r.tc) || {ad: r.ad, brans: r.brans, birimler: {}}; const ist = birimBul(plan, r.birimMetin) || (C.TR(r.birimMetin).includes('KOMUTA') ? 'KOMUTA KONTROL MERKEZİ' : String(r.birimMetin || '').trim() || '—'); e.birimler[ist] = (e.birimler[ist] || 0) + r.saat; m.set(r.tc, e); });
    const out = {};
    Object.entries(ay).forEach(([a, m]) => {
      const [yy, mm] = a.split('-').map(Number), ist = {}, kisi = [], dis = [];
      const hedefStd = sinif => { try { const isci = sinif === 'isci', ms = C.ayMesai(yy, mm, isci, {}); return C.hedefNobet(ms, sinif === 'doktor' ? 'doktor' : isci ? 'isci' : 'memur', false, {isciDusulen: S.ayar.isciDusulen}).birim; } catch (er) { return 0; } };
      m.forEach((e, tc) => {
        const k = tcMap.get(tc), toplam = Object.values(e.birimler).reduce((x, v) => x + v, 0) / 24, brans = k ? bransAd(k) : (e.brans || ''), kadro = k ? k.birim : '', hedef = hedefStd(k ? k.sinif : /SURUCU|ISCI/.test(C.TR(e.brans)) ? 'isci' : 'memur');
        Object.entries(e.birimler).forEach(([b, saat]) => { const o = (ist[b] = ist[b] || {nobet: 0, kisi: 0}); o.nobet += saat / 24; o.kisi++; if (kadro && b !== kadro && b !== 'KOMUTA KONTROL MERKEZİ') dis.push({ad: k ? k.ad : e.ad, brans, kadro, istasyon: b, nobet: Math.round(saat / 24 * 100) / 100}); });
        kisi.push({ad: k ? k.ad : e.ad, brans, kadro, nobet: Math.round(toplam * 100) / 100, hedef, fazla: Math.round(Math.max(0, toplam - hedef) * 100) / 100});
      });
      Object.values(ist).forEach(o => { o.nobet = Math.round(o.nobet * 100) / 100; });
      out[a] = {ay: a, zaman: Date.now(), ist, kisi, dis};
    });
    return out;
  }
  function asosOnizle(sonuc, taban) {
    let {tur, satirlar} = sonuc;
    if (tur === 'N') { const g = new Set(), tani = satirlar.tani; satirlar = satirlar.filter(r => { const k = `${r.tc}|${r.bas}|${r.rol}`; if (!r.bas) return true; if (g.has(k)) return false; g.add(k); return true; }); satirlar.tani = tani; }   // Nöbet Listesi ve Hareket Raporu birlikte yüklenirse aynı nöbet iki kez sayılmaz
    const kaynakPlan = taban || S.plan;
    const plan = kaynakPlan ? JSON.parse(JSON.stringify(kaynakPlan)) : bosPlan();
    if (tur === 'N') {
      // Nöbet kayıtları aya göre saklanır (ay → ekip şefi / YSP / sürücü saati); aynı ay yeniden yüklenirse o ayın verisi yenilenir; son 6 ay birlikte değerlendirilir
      const say = new Map(), aylar = new Set(satirlar.map(r => r.ay || 'belirsiz'));
      satirlar.forEach(r => { const m = say.get(r.tc) || {}, ay = r.ay || 'belirsiz'; (m[ay] = m[ay] || {es: 0, ysp: 0, sur: 0})[r.rol] += r.saat; say.set(r.tc, m); });
      const esk = {degil: S.ayar.surDegilEsik / 100};
      const rp = {tur, yeni: [], degisen: 0, nakil: [], eksik: [], toplam: satirlar.length, kisi: say.size, eslesen: 0, aylar: [...aylar].sort(), surucu: 0, degil: 0, dogrulanmadi: 0, att: 0, plan, tani: satirlar.tani};
      plan.kayitlar.forEach(k => {
        if (!k.tc) return;
        k.rolAy = {...(k.rolAy || {})}; aylar.forEach(a => { delete k.rolAy[a]; });
        const m = say.get(k.tc); if (m) { Object.assign(k.rolAy, m); rp.eslesen++; }
        k.rolSay = Object.keys(k.rolAy).length ? C.rolToplam(k.rolAy) : null;
        if (k.sinif === 'memur') { rp.att++; const d = C.surucuDurumu(k, esk).tip; if (d === 'surucu') rp.surucu++; else if (d === 'degil') rp.degil++; else rp.dogrulanmadi++; }
      });
      plan.nobetAylari = [...new Set([...(plan.nobetAylari || []), ...aylar])].sort();
      rp.gercek = gercekHazirla(plan, satirlar);
      return rp;
    }
    if (tur === 'I') {
      // İzin-Muafiyet Raporu: raporda geçen kişilerin ASOS kaynaklı izin / durum / muafiyet bilgisi baştan kurulur (rapordaki kişiler dışındakilere dokunulmaz)
      const bk = new Map(); satirlar.forEach(r => { (bk.get(r.tc) || bk.set(r.tc, []).get(r.tc)).push(r); });
      const rp = {tur, yeni: [], degisen: 0, nakil: [], eksik: [], toplam: satirlar.length, kisi: bk.size, eslesen: 0, izinli: 0, muafiyet: 0, plan};
      plan.kayitlar.forEach(k => {
        const l = k.tc && bk.get(k.tc); if (!l) return;
        rp.eslesen++;
        k.izin = (k.izin || []).filter(i => !i.asos); if (/DOĞUM|RAPORLU|MUAFİYET/.test(k.durumB || '')) { k.durumB = ''; k.durumMetinB = ''; } k.sut = 0;
        l.forEach(r => { const h = asosAyHesabi(r); if (h.durumB && !k.durumB) { k.durumB = h.durumB; k.durumMetinB = h.durumMetin; } k.sut = Math.max(k.sut || 0, h.sut); k.izin = k.izin.concat(h.izin.map(i => ({...i, asos: true}))); if (h.izin.length) rp.izinli++; if (h.durumB === 'NÖBET MUAFİYETİ' || h.sut) rp.muafiyet++; });
        if (!k.durumManuel) { k.durum = k.durumB || k.durumA || (k.durum === 'GEÇİCİ GÖREVLİ' ? 'GEÇİCİ GÖREVLİ' : (k.gorev && (k.gorev.hedef || k.gorev.yer) ? 'GEÇİCİ GÖREVDE' : '')); k.durumMetin = k.durumMetinB || k.durumMetinA || ''; }
      });
      rp.eslesmeyen = bk.size - rp.eslesen;
      return rp;
    }
    const rapor = {tur, yeni: [], degisen: 0, nakil: [], eksik: [], dortB: 0, dortBTarihsiz: 0, toplam: satirlar.length, gorevli: 0, disKurum: 0, gelen: 0, izinli: 0, muafiyet: 0, plan};
    const tcMap = new Map(), adMap = new Map();
    plan.kayitlar.forEach(k => { if (k.tc) tcMap.set(k.tc, k); const a = adAnahtar(k.ad); if (!adMap.has(a)) adMap.set(a, k); });
    const goruldu = new Set(), izinGoruldu = new Set();
    satirlar.forEach(a => {
      let gelenKaynak = false;
      if (tur === 'B' && !a.kadroIl) {                       // kadrosu Manisa'da olmayan: dış kurum personeli; İASB birimlerinde çalışıyorsa "kurum dışı gelen"
        if (/IASB/.test(C.TR(a.aktifTip))) { gelenKaynak = true; a.kadroBirim = a.aktifBirim; rapor.gelen++; } else { rapor.disKurum++; return; }
      }
      const birim = birimCoz(plan, a.kadroBirim) || (a.kadroBirim ? ekleBirim(plan, ISTASYON_ADI(a.kadroBirim), 'istasyon') : '');
      if (!birim) { rapor.disKurum++; return; }
      if (a.kadroIstTip) { const bo = plan.birimler.find(x => x.ad === birim); if (bo && bo.tur === 'istasyon') bo.tip = a.kadroIstTip.toUpperCase(); }
      const sinif = asosSinif(a), dortB = C.dortB(a.kadroTur, a.unvan);
      if (dortB) { rapor.dortB++; if (!(a.atamaBas || a.memBas)) rapor.dortBTarihsiz++; }
      let k = tcMap.get(a.tc) || adBul(plan.kayitlar.filter(x => !x.tc), adMap, a.ad, birim);
      if (!k) {
        k = {id: uid(), ad: a.ad, tc: a.tc, tel: a.tel || '', unvan: a.unvan, sinif, birim, durum: gelenKaynak ? 'GEÇİCİ GÖREVLİ' : '', durumMetin: '', izin: [], planlanan: null, kilit: false, gorev: null, dortB, memBas: '',
          kadroTur: a.kadroTur, sira: a.sira, istek: '', gecmis: [], gecmisAsos: []};
        plan.kayitlar.push(k); rapor.yeni.push(k.ad); tcMap.set(a.tc, k);
      } else {
        if (k.birim !== birim && k.tc) rapor.nakil.push(`${k.ad}: ${k.birim} → ${birim}`);
        if (a.ad && C.TR(k.ad).split(' ').filter(Boolean).length < C.TR(a.ad).split(' ').filter(Boolean).length) k.ad = a.ad;      // elle eksik yazılmış ad ASOS'taki tam adla düzeltilir
        k.tc = a.tc; k.unvan = a.unvan || k.unvan; k.sinif = sinif; k.birim = birim; k.dortB = dortB; k.kadroTur = a.kadroTur || k.kadroTur; if (a.tel) k.tel = a.tel;
        rapor.degisen++;
      }
      k.gecmis = k.gecmis || []; k.gecmisAsos = k.gecmisAsos || [];
      if (tur === 'A') {
        k.calisma = a.calisma; if (a.yillikKalan != null) k.yillikKalan = a.yillikKalan; if (a.memBas && !k.atamaBas) k.memBas = a.memBas;
        k.durumA = asosDurumA(a);
        if (k.gorevSonaErdi && k.durumA === 'GEÇİCİ GÖREVDE') k.durumA = '';      // Personel Listesi Raporu'na göre görevi plan ayından önce bitiyor (ör. 01.10–01.11): kadrosuna döner
        if (/KADROSUNUN OLDUGU YERDE/.test(C.TR(a.calisma))) k.durumMetinA = ''; else k.durumMetinA = a.calisma;
        if (a.gecici.ad && !k.gorevSonaErdi && (!k.gorev || k.gorev.kaynak !== 'manuel') && !(k.gorev && k.gorev.bas)) k.gorev = {yer: a.gecici.ad, hedef: birimCoz(plan, a.gecici.ad), kaynak: 'asos', yolluk: '', bas: '', bit: '', tarih: '', gerekce: ''};
        else if (!a.gecici.ad && k.gorev && k.gorev.kaynak === 'asos' && !k.gorev.bas) k.gorev = null;
        if (k.durumA === 'GEÇİCİ GÖREVDE' && !k.gorev) k.gorev = {yer: '', hedef: null, kaynak: 'asos', yolluk: '', bas: '', bit: '', tarih: '', gerekce: ''};
      } else {
        k.atamaBas = a.atamaBas || ''; if (a.atamaBas) k.memBas = a.atamaBas; k.atamaNeden = a.atamaNeden;
        // Bir kişinin birden çok izin/muafiyet satırı olabilir: aynı dosyada ilk satırda ASOS verisi sıfırlanır, sonrakiler eklenir
        const h = asosAyHesabi(a), ilkSatir = !izinGoruldu.has(k.id); izinGoruldu.add(k.id);
        if (ilkSatir) { k.durumB = h.durumB; k.durumMetinB = h.durumMetin; k.sut = h.sut; k.izin = (k.izin || []).filter(i => !i.asos); }
        else { if (h.durumB && !k.durumB) { k.durumB = h.durumB; k.durumMetinB = h.durumMetin; } k.sut = Math.max(k.sut || 0, h.sut); }
        k.izin = (k.izin || []).concat(h.izin.map(i => ({...i, asos: true}))); if (h.izin.length) rapor.izinli++; if (h.durumB === 'NÖBET MUAFİYETİ' || h.sut) rapor.muafiyet++;
        const gg = geciciGorev(plan, a);
        k.gorevSonaErdi = !!gg.sonaErdi; if (gg.sonaErdi && k.durumA === 'GEÇİCİ GÖREVDE') { k.durumA = ''; k.durumMetinA = ''; }
        if (!k.gorev || k.gorev.kaynak !== 'manuel') { const eski = k.gorev; k.gorev = gg.gorev && eski && eski.gerekce && !gg.gorev.gerekce ? {...gg.gorev, gerekce: eski.gerekce, yolluk: eski.yolluk || ''} : gg.gorev; }
        k.gecmisAsos = [...new Set([...(k.gecmisAsos || []), ...gg.gecmis])].sort();
        if (gelenKaynak) { k.durumB = 'GEÇİCİ GÖREVLİ'; }
      }
      if (!k.durumManuel) k.durum = k.durumB || k.durumA || (gelenKaynak ? 'GEÇİCİ GÖREVLİ' : (k.gorev && (k.gorev.hedef || k.gorev.yer) ? 'GEÇİCİ GÖREVDE' : ''));
      if (!k.durumManuel) k.durumMetin = k.durumMetinB || k.durumMetinA || '';
      if (k.gorev && (k.gorev.hedef || k.gorev.yer)) rapor.gorevli++;
      goruldu.add(k.id);
    });
    // Elle yalnızca ilk adıyla eklenmiş TC'siz kayıt, aynı istasyondaki ilk adı eşleşen tek ASOS kaydıyla birleştirilir (mükerrer kayıt oluşmaz)
    rapor.birlesen = 0;
    plan.kayitlar.filter(m => !m.tc && C.TR(m.ad).split(' ').filter(Boolean).length === 1).forEach(m => {
      const aday = plan.kayitlar.filter(x => x.tc && x.id !== m.id && x.birim === m.birim && C.TR(x.ad).split(' ').filter(Boolean).length >= 2 && lev1(C.TR(x.ad).split(' ')[0], C.TR(m.ad)));
      if (aday.length !== 1) return; const x = aday[0];
      if (m.kilit && m.planlanan != null) { x.planlanan = m.planlanan; x.kilit = true; } if (m.istek && !x.istek) x.istek = m.istek; if (m.rolManuel && !x.rolManuel) x.rolManuel = m.rolManuel;
      plan.kayitlar = plan.kayitlar.filter(y => y.id !== m.id); rapor.birlesen++;
    });
    if (tur === 'A') plan.kayitlar.forEach(k => { if (!goruldu.has(k.id) && k.tc && !(durumlar()[k.durum] || {}).pasif) rapor.eksik.push(k); });
    birimTemizle(plan); birimSirala(plan);
    return rapor;
  }
  // Seçilen/sürüklenen dosyaları okur; EKİP (A) listesi önce, Personel Listesi Raporu (B) sonra uygulanarak önizleme üretilir
  async function asosDosyalariIsle(dosyalar) {
    dosyalar = (dosyalar || []).filter(Boolean); if (!dosyalar.length) return;
    S.modal = () => '<div class="ap-modal"><div><h2>Dosyalar okunuyor…</h2><p class="ap-note">Büyük listelerde birkaç saniye sürebilir.</p></div></div>'; render();
    const sonuc = [];
    for (const f of dosyalar) {
      try {
        if (!/\.(xls|xlsx)$/i.test(f.name)) throw new Error('Yalnızca .xls / .xlsx dosyaları yüklenebilir.');
        const p = asosParse(await xlsOku(f));
        if (!p.satirlar.length) throw new Error('Dosyada personel satırı bulunamadı (başlıklar var, veri satırı yok).');
        sonuc.push({ad: f.name, tur: p.tur, p, boyut: f.size});
      } catch (er) { sonuc.push({ad: f.name, hata: er.message || String(er)}); }
    }
    const gecerli = sonuc.filter(x => x.p).sort((x, y) => x.tur.localeCompare(y.tur));
    let taban = S.plan, raporlar = [];
    for (const g of gecerli) { try { const r = asosOnizle(g.p, taban); taban = r.plan; g.rapor = r; raporlar.push(r); } catch (er) { g.hata = 'İşlenemedi: ' + (er.message || er); g.rapor = null; } }
    S.asos = {dosyalar: sonuc, plan: raporlar.length ? taban : null, raporlar};
    S.modal = asosModalHtml; render();
  }
  function asosModalHtml() {
    const A = S.asos; if (!A) return '';
    const yenisi = !S.plan, ok = A.raporlar.length > 0;
    const tur = t => t === 'I' ? 'Personel İzin-Muafiyet Raporu' : t === 'A' ? 'EKİP Personel Listesi' : t === 'N' ? 'Nöbet Listesi / Nöbet İçi Hareket Raporu' : 'Personel Listesi Raporu';
    const dosyaSatir = A.dosyalar.map(d => d.hata ? `<div class="ap-err"><b>${esc(d.ad)}</b><br>${esc(d.hata)}</div>` : d.rapor ? `<div class="ap-ok"><b>${esc(d.ad)}</b> — ${tur(d.tur)}, ${d.rapor.toplam} satır okundu</div>` : '').join('');
    const topla = f => A.raporlar.reduce((x, r) => x + f(r), 0);
    const eksik = (A.raporlar.find(r => r.tur === 'A') || {eksik: []}).eksik;
    const yeniler = A.raporlar.flatMap(r => r.yeni), nakiller = A.raporlar.flatMap(r => r.nakil);
    const B = A.raporlar.find(r => r.tur === 'B'), N = A.raporlar.find(r => r.tur === 'N'), Iz = A.raporlar.find(r => r.tur === 'I');
    return `<div class="ap-modal"><div><h2>Personel listeleri — önizleme</h2>${dosyaSatir}
      ${ok ? `<div class="ap-sum"><div><b>${A.plan.kayitlar.length}</b><span>Plandaki kayıt</span></div><div><b>${yeniler.length}</b><span>Yeni kayıt</span></div><div><b>${topla(r => r.degisen)}</b><span>Güncellenen</span></div><div><b>${nakiller.length}</b><span>Birim değişen</span></div><div><b>${A.plan.kayitlar.filter(k => k.gorev && (k.gorev.hedef || k.gorev.yer)).length}</b><span>Geçici görevli</span></div>
      ${B ? `<div><b>${B.izinli}</b><span>Plan ayında izinli</span></div><div><b>${B.muafiyet}</b><span>Muafiyet / süt izni</span></div><div><b>${B.disKurum}</b><span>Dış kurum (alınmadı)</span></div><div><b>${B.gelen}</b><span>Kurum dışından gelen</span></div>` : ''}</div>
      <p>4/B personel: <b>${A.plan.kayitlar.filter(k => k.dortB).length}</b> kişi. ${A.plan.kayitlar.some(k => k.dortB && !k.memBas) ? `<span class="ap-tag ap-t-ih">${A.plan.kayitlar.filter(k => k.dortB && !k.memBas).length} kişide başlangıç tarihi yok</span> — "Personel Listesi Raporu" da yüklenirse 4 yıl kuralı denetlenir.` : '<span class="ap-tag ap-t-ok">Tümünde başlangıç tarihi var</span>'}</p>
      ${N ? `<p><b>Nöbet kayıtları (${N.aylar.join(', ')}):</b> ${N.kisi} kişinin nöbeti okundu, ${N.eslesen} kişi planda eşleşti. Memur (AABT+ATT, ${N.att} kişi): <b>${N.surucu}</b> sürücü olarak nöbet tutmuş, <b>${N.degil}</b> sürücü değil, <b>${N.dogrulanmadi}</b> kişinin nöbet kaydı yok (doğrulanmadı; sürücü sayılmaz). Başka aylara ait nöbet listelerini de yükleyerek doğrulamayı artırabilirsiniz.</p>${N.tani ? `<details ${N.eslesen < N.kisi * 0.8 || N.dogrulanmadi > N.att / 2 ? 'open' : ''}><summary>Nöbet dosyası tanılaması</summary><div class="ap-note" style="line-height:1.6">Okunan satır: <b>${N.tani.satir}</b> · kullanılan: <b>${N.tani.ok}</b> · TC'siz: ${N.tani.tcYok} · istasyon dışı ekip türü: ${N.tani.istasyonDisi} · ambulans dışı: ${N.tani.ambulansDisi}<br>Planda eşleşmeyen TC'li kişi: <b>${Math.max(0, N.kisi - N.eslesen)}</b><br>Başlıklar: ${esc(N.tani.baslik)}<br>Nöbet görevi değerleri: ${esc(Object.entries(N.tani.gorevler).slice(0, 12).map(([a, b]) => a + ' (' + b + ')').join(', '))}<br>${Object.keys(N.tani.rolYok).length ? '<b>Rolü tanınmayan görevler:</b> ' + esc(Object.entries(N.tani.rolYok).slice(0, 10).map(([a, b]) => a + ' (' + b + ')').join(', ')) + '<br>' : ''}${Object.keys(N.tani.sureYok).length ? '<b>Süresi okunamayan değerler:</b> ' + esc(Object.entries(N.tani.sureYok).slice(0, 10).map(([a, b]) => a + ' (' + b + ')').join(', ')) : ''}</div></details>` : ''}` : `<p class="ap-note"><b>ATT'lerin sürücülüğü nöbet listesinden doğrulanır.</b> "Nöbet Listesi / Nöbet İçi Hareket Raporu"nu (Nöbet Sayım uygulamasındaki dosya; son birkaç ayın dosyaları birlikte yüklenebilir) yüklemezseniz ATT'ler yalnız YSP sayılır.</p>`}
      ${Iz ? `<p><b>İzin-Muafiyet Raporu:</b> ${Iz.kisi} kişi, ${Iz.eslesen} kişi planda eşleşti${Iz.eslesmeyen ? ' (' + Iz.eslesmeyen + ' kişi planda yok)' : ''}; bu ay için ${Iz.izinli} izin/rapor ve ${Iz.muafiyet} muafiyet kaydı işlendi. Rapordaki kişilerin önceki ASOS izin bilgisi bu raporla yenilenir.</p>` : ''}
      ${!B && !Iz ? '<p class="ap-note">İzin, rapor, muafiyet ve süt izni bilgisi için "Personel Listesi Raporu"nu da yükleyin (iki dosyayı birlikte seçebilirsiniz).</p>' : ''}
      ${A.raporlar.some(r => r.birlesen) ? `<p class="ap-note"><b>${A.raporlar.reduce((x, r) => x + (r.birlesen || 0), 0)}</b> elle eklenmiş kayıt, ASOS kaydıyla birleştirildi (ikinci kayıt oluşmadı).</p>` : ''}
      ${nakiller.length ? `<details><summary>Birimi değişenler (${nakiller.length})</summary>${nakiller.slice(0, 40).map(esc).join('<br>')}</details>` : ''}
      ${yeniler.length && !yenisi ? `<details><summary>Yeni eklenenler (${yeniler.length})</summary>${yeniler.slice(0, 60).map(esc).join('<br>')}</details>` : ''}
      ${eksik.length ? `<details open><summary>EKİP listesinde olmayan kayıtlar (${eksik.length})</summary>${eksik.slice(0, 40).map(k => esc(k.ad + ' — ' + k.birim)).join('<br>')}
        <label class="ap-row"><input type="checkbox" id="ap-asos-pasif"> Bunları pasife al (silinmez, hesaba katılmaz)</label></details>` : ''}` : ''}
      <div class="ap-row" style="margin-top:12px">${ok ? `<button class="ap-btn pri" data-act="asos-uygula">${yenisi ? 'Plan oluştur ve uygula' : 'Uygula'}</button>` : ''}<button class="ap-btn" data-act="modal-kapat">${ok ? 'Vazgeç' : 'Kapat'}</button></div>
      <p class="ap-note">Kişiler TC ile birleştirilir. Uygulanınca izin, planlanan nöbet ve elle yapılan görevlendirmeler korunur; değişiklikler günlüğe yazılır.</p></div></div>`;
  }

  // ---------- çıktılar ----------
  const hex = c => (c || '#FFFFFF').replace('#', '').toUpperCase();
  // Çıktı biçimi: planlama biriminin kullandığı Excel düzenine uyar (kısa unvan, izin gün + tür, görev yeri metni)
  function unvanKisa(k) {
    const u = C.TR((k.unvan || '') + ' ' + (k.kadroBrans || '') + ' ' + (k.kadroTur || ''));
    if (k.sinif === 'isci') return 'SÜREKLİ İŞÇİ';
    if (k.sinif === 'doktor') return /DHY|DIS HEK|ACIL TIP HEK/.test(u) && /DHY/.test(u) ? 'DHY DOKTOR' : 'DOKTOR';
    return (k.dortB ? '4/B ' : '') + (/\bSRC\b/.test(u) ? 'SRC ' : '') + C.kadroTip(k);
  }
  const izinTur = k => [...new Set((k.izin || []).filter(i => sayi(i.gun) > 0).map(i => i.tur || 'İZİN'))].join(', ');
  function cikDurum(k) {
    if (/^DOĞUM/.test(k.durum || '')) { const m = /(\d{2}\.\d{2}\.\d{4})/.exec(k.durumMetin || ''); return k.durum + (m ? ' ' + m[1] : ''); }
    if (/RAPORLU/.test(k.durum || '')) return k.durum;
    if (k.gorev && (k.gorev.hedef || k.gorev.yer) && (durumlar()[k.durum] || {}).disarida) return 'GEÇİCİ GÖREVDE';
    return durumGosterim(k).toLocaleUpperCase('tr-TR');
  }
  function cikGorev(k) {
    const g = k.gorev; if (!g) return k.durumMetin && !C.durumAnahtar(k.durumMetin) ? k.durumMetin : '';
    const istasyon = g.hedef && S.plan.birimler.some(b => b.ad === g.hedef && b.tur === 'istasyon');
    if (istasyon) return `${g.hedef} NOLU ASHİ ${AYLAR[S.m].toLocaleUpperCase('tr-TR')}`;
    const ozelGerekce = g.gerekce && !/PERSONEL İHTİYACI|MESAİ TAMAMLAYAMAMA/.test(g.gerekce) ? g.gerekce + ' ' : '';
    return (ozelGerekce + (g.hedef || g.yer) + (ozelGerekce && g.bit && g.bit > gunSon() ? ' ' + trTarih(g.bit) : '')).trim();
  }
  function birimSatirlari(b) {
    const D = durumlar(), kis = S.plan.kayitlar.filter(k => k.birim === b.ad || (k.gorev && k.gorev.hedef === b.ad && (D[k.durum] || {}).disarida)).filter(k => !gizliKisi(k)).sort(personelSirala);      // aile hekimliği / uzmanlık eğitimi çıktılarda yer almaz
    const h = b.tur === 'istasyon' ? hesapla(b) : null, sm = new Map(); if (h) h.satir.forEach(s => sm.set(s.k.id, s));
    return kis.map(k => {
      const gelen = k.birim !== b.ad;
      return {k, gelen, renk: gelen ? D['GEÇİCİ GÖREVLİ'].renk : satirRenk(k), sinif: k.sinif,
        hucre: [k.ad, unvanKisa(k), gelen ? 'GEÇİCİ GÖREVLİ' : cikDurum(k), izinAyGun(k) ? fmt(izinAyGun(k)) : '', izinAyGun(k) ? izinTur(k) : '', gelen ? `${k.birim} NOLU ASHİ ${AYLAR[S.m].toLocaleUpperCase('tr-TR')}` : cikGorev(k), (k.gorev && k.gorev.yolluk) || ''],
        tahmini: (sm.get(k.id) && !sm.get(k.id).nobetYok && k.planlanan != null) ? k.planlanan : ''};
    });
  }
  function excelBirimSheet(b) {
    const satirlar = birimSatirlari(b), tah = S.ayar.tahminiGoster;
    const bas = ['AD SOYAD', 'ÜNVAN', 'G.GÖREV DURUMU', '', 'İZİNLER', 'GEÇİCİ GÖREV TARİHLERİ', 'YOLLUK DURUMU'].concat(tah ? ['TAHMİNİ NÖBET'] : []);
    const aoa = [[b.ad + (b.tur === 'istasyon' ? ' NOLU ASHİ' : '') + (b.ekipOf ? ' — EKİP OF' : '')], bas];
    satirlar.forEach(s => aoa.push(s.hucre.concat(tah ? [s.tahmini] : [])));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{wch: 32}, {wch: 16}, {wch: 30}, {wch: 6}, {wch: 14}, {wch: 42}, {wch: 16}, {wch: 14}];
    ws['!merges'] = [{s: {r: 0, c: 0}, e: {r: 0, c: bas.length - 1}}];
    const sinir = {top: {style: 'thin'}, bottom: {style: 'thin'}, left: {style: 'thin'}, right: {style: 'thin'}};
    for (let c = 0; c < bas.length; c++) { const h = XLSX.utils.encode_cell({r: 1, c}); if (ws[h]) ws[h].s = {font: {bold: true}, border: sinir, fill: {patternType: 'solid', fgColor: {rgb: 'DCE6F1'}}}; }
    if (ws['A1']) ws['A1'].s = {font: {bold: true, sz: 14}, alignment: {horizontal: 'center'}};
    satirlar.forEach((s, i) => { for (let c = 0; c < bas.length; c++) { const a = XLSX.utils.encode_cell({r: i + 2, c}); if (!ws[a]) ws[a] = {t: 's', v: ''}; ws[a].s = {border: sinir, ...(s.renk ? {fill: {patternType: 'solid', fgColor: {rgb: hex(s.renk)}}} : {})}; } });
    return ws;
  }
  const sheetAd = (ad, kul) => { let a = String(ad).replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31).trim() || 'Sayfa'; let n = 2, b = a; while (kul.has(a)) a = b.slice(0, 28) + ' ' + n++; kul.add(a); return a; };
  function personelDegerlendirme(b, h) {
    if (b.ekipOf) return 'Ekip OF (kapalı)';
    if (h.ihtiyacTur === 'oner') return `Personel öner: ${h.ihtiyacKisi} kişi (açık ${fmt(h.hedefAcik)} nöbet)`;
    if (h.ihtiyacTur === 'icerde') return `Fazla nöbetle kendi içinde döner (hedefin ${fmt(h.hedefAcik)} nöbet üstü)`;
    if (h.ihtiyacTur === 'elle') return `Elle karar: azamiyle de ${fmt(-h.farkAzami)} nöbet açık, gelen kişi mesaisini tamamlayamaz`;
    return '';
  }
  function excelToplu() {
    const wb = XLSX.utils.book_new(), kul = new Set(), ozet = [['BİRİM', 'KİŞİ', 'İHTİYAÇ', 'KAPASİTE (HEDEF)', 'KAPASİTE (AZAMİ)', 'PLANLANAN', 'DURUM', 'PERSONEL DEĞERLENDİRMESİ']];
    S.plan.birimler.forEach(b => {
      XLSX.utils.book_append_sheet(wb, excelBirimSheet(b), sheetAd(b.ad, kul));
      if (b.tur === 'istasyon') { const h = hesapla(b); ozet.push([b.ad, h.satir.length, h.ihtiyac, h.kapasite, h.azamiKap, planlananToplam(h), h.durum === 'ihtiyac' ? 'Personel ihtiyacı' : h.durum === 'fazla' ? 'Mesai tamamlayamama' : h.durum === 'fazlaMesai' ? 'Fazla mesaiyle dolar' : 'Dengede', personelDegerlendirme(b, h)]); }
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ozet), sheetAd('Plan özeti', kul));
    const {say} = istatistik(); const ist = [['GÖSTERGE', 'DEĞER']]; Object.keys(say).sort().forEach(k => ist.push([k, say[k]]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ist), sheetAd('İstatistik', kul));
    return wb;
  }
  const xlsxIndir = (wb, ad) => indir(new Blob([XLSX.write(wb, {bookType: 'xlsx', type: 'array'})], {type: 'application/octet-stream'}), ad);

  function pngCiz(b) {
    const satirlar = birimSatirlari(b), tah = S.ayar.tahminiGoster;
    const kol = [['AD SOYAD', 290], ['UNVAN', 140], ['G.GÖREV DURUMU', 300], ['', 50], ['İZİNLER', 130], ['GEÇİCİ GÖREV TARİHLERİ', 330], ['YOLLUK DURUMU', 160]].concat(tah ? [['TAHMİNİ NÖBET', 150]] : []);
    const W = kol.reduce((a, c) => a + c[1], 0), RH = 32, TH = 56, HH = 52;
    const sepSay = satirlar.filter((s, i) => i > 0 && s.sinif !== satirlar[i - 1].sinif && !s.gelen && !satirlar[i - 1].gelen).length;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = TH + HH + satirlar.length * RH + sepSay * 8 + 4;
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    x.strokeStyle = '#000'; x.lineWidth = 1; x.textBaseline = 'middle';
    const kes = (t, w) => { t = String(t ?? ''); while (t && x.measureText(t).width > w - 10) t = t.slice(0, -1); return t; };
    x.font = 'bold 20px "Times New Roman", serif'; x.fillStyle = '#000'; x.textAlign = 'center';
    x.fillText(b.ad + (b.tur === 'istasyon' ? ' NOLU ASHİ' : '') + (b.ekipOf ? ' — EKİP OF' : ''), W / 2, TH / 2); x.textAlign = 'left';
    let cx = 0; x.font = 'bold 17px "Times New Roman", serif';
    kol.forEach(([t, w]) => { x.strokeRect(cx + .5, TH + .5, w, HH); x.fillText(kes(t, w), cx + 6, TH + HH / 2); cx += w; });
    let y = TH + HH;
    satirlar.forEach((s, i) => {
      if (i > 0 && s.sinif !== satirlar[i - 1].sinif && !s.gelen && !satirlar[i - 1].gelen) { x.fillStyle = '#0b2a5b'; x.fillRect(0, y, W, 8); y += 8; }
      if (s.renk) { x.fillStyle = s.renk; x.fillRect(0, y, W, RH); }
      x.fillStyle = '#000'; x.font = '17px "Times New Roman", serif'; cx = 0;
      const cells = s.hucre.concat(tah ? [s.tahmini === '' ? '' : fmt(s.tahmini)] : []);
      kol.forEach(([t, w], c) => { x.strokeRect(cx + .5, y + .5, w, RH); x.fillText(kes(cells[c], w), cx + 6, y + RH / 2 + 1); cx += w; });
      y += RH;
    });
    return cv;
  }

  // ---------- aylık rotasyon: her istasyondan ayda (kota) kişi çıkar; sırayla, kişi isteği varsa öncelikli / birkaç ay üst üste ----------
  const ayAnahtari = () => `${S.y}-${C.pad(S.m)}`;
  const gorevAktif = g => !!g && !!(g.hedef || g.yer) && (!g.bit || g.bit > ayIlk() || (g.bas && g.bas >= ayIlk())) && (!g.bas || g.bas <= gunSon());
  const sonCikis = k => [...(k.gecmis || []), ...(k.gecmisAsos || [])].sort().pop() || '';
  const ISTEK = {'': 'Sırayla', git: 'Gitmek istiyor', devam: 'Devam etmek istiyor', gitmesin: 'Bu ay gitmesin'};
  function rotasyon(b, h) {
    const D = durumlar(), ist = n => (S.plan.birimler.find(x => x.ad === n) || {}).tur === 'istasyon';
    h = h || hesapla(b);
    const kisiler = S.plan.kayitlar.filter(k => k.birim === b.ad);
    const disarida = kisiler.filter(k => gorevAktif(k.gorev) && k.gorev.hedef && ist(k.gorev.hedef));    // KKM/Başhekimlik uzun süreli görevler rotasyona sayılmaz
    const devam = b.ekipOf ? disarida : disarida.filter(k => k.istek === 'devam');      // kapalı ekibin geçici görevdekileri olduğu yerde devam eder
    // Kota: elle girilmişse o; değilse 1, mesai dolmuyorsa (kapasite ihtiyacı aşıyorsa) fazlalık kadar kişi (en çok 3)
    const nobetciler = h.satir.filter(s => !s.nobetYok), ort = nobetciler.length ? nobetciler.reduce((a, s) => a + s.hedef, 0) / nobetciler.length : 7;
    const kotaOto = h.fazlaVar && ort > 0 ? Math.min(3, Math.max(1, Math.round(h.fazlaEf / ort))) : 1;
    const kota = b.ekipOf ? 1e6 : (b.cikisKota === undefined || b.cikisKota === null ? kotaOto : b.cikisKota);   // kapalı ekipte tüm uygun personel dağıtılabilir
    const idx = id => { const i = (b.rotasyon || []).indexOf(id); return i < 0 ? 1e6 : i; };
    const grupOf = id => (h.satir.find(s => s.k.id === id) || {}).grup;
    const fz = new Set(C.GRUPLAR.filter(g => (h.fazlaGrupEf || h.slot.hedef.fazla)[g] > 0.001));            // mesaisini tamamlayamayan (fazla) gruplar
    const uygunlar = kisiler.filter(k => {
      const dt = D[k.durum] || {};
      return !aileHek(k) && !gorevAktif(k.gorev) && !dt.nobetYok && !dt.mesaiYok && !dt.pasif && !dt.disarida && !C.gorevlendirmeEngeli(k, ayIlk()) && C.kisiMesai(k, S.y, S.m, ozel(), D) > 0;
    });
    // Fazlalık hangi gruptaysa (genelde ATT) çıkacak kişi o gruptandır; AABT ekip şefi nöbet branşını doldurduğu için fazlaya çıkmaz. Fazlalık yoksa önce ATT, sonra AABT, sonra doktor/işçi.
    const oncelik = k => { const g = grupOf(k.id); return fz.size ? (fz.has(g) ? 0 : 1) : (g === 'sy' || g === 'ysp' ? 0 : g === 'ka' || g === 'ke' ? 1 : 2); };
    const havuz = fz.size && uygunlar.some(k => oncelik(k) === 0) ? uygunlar.filter(k => oncelik(k) === 0) : uygunlar;
    const adaylar = havuz.sort((x, y) => (oncelik(x) - oncelik(y)) || ((y.istek === 'git') - (x.istek === 'git')) || ((x.istek === 'gitmesin') - (y.istek === 'gitmesin')) || sonCikis(x).localeCompare(sonCikis(y)) || (idx(x.id) - idx(y.id)) || (y.memBas || '').localeCompare(x.memBas || '') || trCollator.compare(x.ad, y.ad));   // eşitlikte kıdemli (eski başlayış) en son
    const gerek = Math.max(0, kota - devam.length);
    // İhtiyacı olan nöbet branşını dolduran kişi dışarı gönderilmez: çıkması istasyonun hedef nöbetle açığını artırıyorsa aday olmaz (kapalı ekipte bu denetim yok)
    let adayListe = adaylar, oneri = adaylar.filter(k => k.istek !== 'gitmesin').slice(0, gerek), gerekliler = [];
    if (!b.ekipOf) {
      const taban = acikSimule(b);
      adayListe = adaylar.filter(k => { const gerekli = acikSimule(b, [k.id]) - taban > 0.01; if (gerekli) gerekliler.push(k); return !gerekli; });
      oneri = []; for (const k of adayListe) { if (oneri.length >= gerek) break; if (k.istek === 'gitmesin') continue; if (acikSimule(b, [...oneri.map(x => x.id), k.id]) - taban <= 0.01) oneri.push(k); }
    }
    return {kota, kotaOto, disarida, devam, adaylar: adayListe, gerek, oneri, gerekliler};
  }
  // Bir istasyonun hedef nöbetle açığı: cikar listesindeki kişiler dışarı çıkarsa / don listesindeki dışarıdaki kişiler dönerse
  function acikSimule(b, cikar = [], don = []) {
    const kis = kisCtx(S.plan, b.ad).map(x => cikar.includes(x.id) ? {...x, durum: 'GEÇİCİ GÖREVDE'} : don.includes(x.id) ? {...x, durum: ''} : x);
    return hesaplaCtx(S.plan, S.y, S.m, b, kis).acikEf;
  }
  // Açığı olan istasyonun, başka istasyona görevlendirilmiş ve dönmesi o açığı azaltacak personelini geri çağırır (kişi "devam etsin" işaretliyse, sağlık mazereti/eğitim görevinde ise ya da o ay kadrosunda mesaisi yoksa dokunulmaz)
  function acikGeriCek(uygula) {
    const D = durumlar(), cikti = [], ist = n => (S.plan.birimler.find(x => x.ad === n) || {}).tur === 'istasyon';
    S.plan.birimler.filter(b => b.tur === 'istasyon' && !b.ekipOf).forEach(b => {
      let taban = acikSimule(b); if (taban < 0.5) return;
      const don = [], aday = S.plan.kayitlar.filter(k => k.birim === b.ad && !aileHek(k) && gorevAktif(k.gorev) && k.gorev.hedef && ist(k.gorev.hedef) && k.gorev.hedef !== b.ad && k.istek !== 'devam' && !/SAĞLIK MAZERETİ|EĞİTİM/.test(k.gorev.gerekce || '') && (D[k.durum] || {}).disarida && C.kisiMesai({...k, durum: ''}, S.y, S.m, ozel(), D) > 0);
      aday.forEach(k => { const yeni = acikSimule(b, [], [...don.map(x => x.id), k.id]); if (taban - yeni >= 0.5) { don.push(k); taban = yeni; cikti.push({k, b, hedef: k.gorev.hedef}); } });
    });
    if (uygula && cikti.length) { S.toplu = true; try { cikti.forEach(({k, b, hedef}) => mut(() => { k.gorev = null; if (k.durum === 'GEÇİCİ GÖREVDE') k.durum = ''; k.durumManuel = false; k.istek = ''; }, 'Açık nedeniyle otomatik geri çağrıldı', `${k.ad}: ${hedef} → ${b.ad}`)); } finally { S.toplu = false; } otoHesapla(); }
    return cikti;
  }
  const nedenMetin = k => k.istek === 'git' ? 'kişi isteği' : sonCikis(k) ? `son çıkış ${sonCikis(k)}` : 'daha önce çıkmadı';
  function rotasyonOneriler() {
    const ists = S.plan.birimler.filter(b => b.tur === 'istasyon').map(b => { const h = hesapla(b); return {b, h, r: rotasyon(b, h)}; });
    const hedefler = ists.filter(x => x.h.ihtiyacTur === 'oner' && !x.b.ekipOf).map(x => ({ad: x.b.ad, acik: {...(x.h.acikM || x.h.acik)}, tam: x.h.tamHedef}));
    const kkm = S.plan.birimler.find(b => b.tur === 'kkm');
    const out = [];
    ists.filter(x => x.r.oneri.length && (S.rotKaynak !== 'fazla' || x.h.fazlaVar || x.b.ekipOf)).sort((a, b) => b.h.fazlaEf - a.h.fazlaEf).forEach(src => src.r.oneri.forEach(k => {
      const ilce = C.ilceAdi(src.b.ad), s = src.h.satir.find(x => x.k.id === k.id), hd = s ? s.hedef : 0, grup = s ? s.grup : 'ka';
      const yet = C.YETENEK[grup] || ['es', 'ysp', 'sur'], gerekli = t => Math.min(hd > 0 ? hd : t.tam, t.tam) - 1e-9;
      // Kişinin yeteneklerine uyan nöbet branşlarında (ekip şefi / YSP / sürücü) açığı olan istasyon: aynı ilçe, sonra yakından uzağa
      const yuvaDeger = t => yet.reduce((x, y) => x + (t.acik[y] || 0), 0);
      const uygun = hedefler.filter(t => t.ad !== src.b.ad && yuvaDeger(t) >= gerekli(t) && (k.sinif !== 'doktor' || doktorHedefiUygun(t.ad)))
        .sort((a, b) => (C.mesafeKm(ilce, C.ilceAdi(a.ad)) - C.mesafeKm(ilce, C.ilceAdi(b.ad))) || (yuvaDeger(b) - yuvaDeger(a)));
      const t = uygun[0], hedef = t ? t.ad : (k.sinif === 'doktor' && kkm ? kkm.ad : ''), km = t ? C.mesafeKm(ilce, C.ilceAdi(t.ad)) : null;
      out.push({id: k.id, ad: k.ad, sinif: k.sinif, rol: C.GRUP_AD[grup], kaynak: src.b.ad, uzun: !!src.b.ekipOf, kaynakDurum: src.h.durum, hedef, km, ayniIlce: t ? C.ilceAdi(t.ad) === ilce : false, neden: nedenMetin(k)});
      if (t) { let kalan = hd > 0 ? hd : t.tam; yet.slice().sort((x, y) => t.acik[y] - t.acik[x]).forEach(y => { const u = Math.min(kalan, t.acik[y]); t.acik[y] -= u; kalan -= u; }); }
    }));
    return out;
  }
  function rotasyonHtml() {
    const duz = !salt(), ists = S.plan.birimler.filter(b => b.tur === 'istasyon');
    const veri = ists.map(b => { const h = hesapla(b); return {b, r: rotasyon(b, h), h}; }), oner = rotasyonOneriler(), hedefAdlari = S.plan.birimler.map(b => b.ad);
    const rIst = S.rotIst || '', oFiltre = rIst ? oner.filter(o => o.kaynak === rIst || o.hedef === rIst) : oner;
    const satir = veri.filter(x => (x.r.disarida.length || x.r.gerek) && (!rIst || x.b.ad === rIst)).map(x => `<tr><td><b>${esc(x.b.ad)}</b>${x.b.ekipOf ? ' <span class="ap-tag" style="background:#e5e7eb;color:#374151">EKİP OF</span>' : ''}${!x.b.ekipOf && x.h.durum === 'fazla' ? ' <span class="ap-tag ap-t-fz">fazla</span>' : x.h.durum === 'ihtiyac' ? ' <span class="ap-tag ap-t-ih">açık</span>' : x.h.durum === 'fazlaMesai' ? ' <span class="ap-tag ap-t-fz">fazla mesaili</span>' : ''}</td>
      <td><input class="ap-in n" type="number" min="0" step="1" data-rb="${esc(x.b.ad)}" value="${x.b.cikisKota ?? ''}" placeholder="${x.r.kotaOto}" title="Boş = otomatik (${x.r.kotaOto})" ${duz ? '' : 'disabled'}>${x.b.cikisKota == null ? '<div class="ap-note">oto</div>' : ''}</td>
      <td>${x.r.disarida.map(k => `<div>${esc(k.ad)} → ${esc(k.gorev.hedef)} ${x.b.ekipOf ? '<span class="ap-note">devam ediyor (ekip OF)</span>' : `<select class="ap-sel" data-id="${k.id}" data-f="istek" ${duz ? '' : 'disabled'}><option value="">Dönsün</option><option value="devam" ${k.istek === 'devam' ? 'selected' : ''}>Devam etsin</option></select>`} <button class="ap-btn sm" data-act="rot-don" data-id="${k.id}" ${duz ? '' : 'disabled'}>Görevi bitir</button></div>`).join('') || '<span class="ap-note">—</span>'}</td>
      <td>${x.r.adaylar.slice(0, 4).map((k, i) => `<div>${i + 1}. ${esc(k.ad)} <span class="ap-note">(${nedenMetin(k)}${k.dortB && !k.memBas ? ' · 4/B tarih yok' : ''})</span> <select class="ap-sel" data-id="${k.id}" data-f="istek" ${duz ? '' : 'disabled'}>${Object.entries(ISTEK).map(([v, t]) => `<option value="${v}" ${(k.istek || '') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></div>`).join('') || '<span class="ap-note">Aday yok</span>'}${x.r.gerekliler && x.r.gerekliler.length ? `<div class="ap-note" style="margin-top:4px" title="Bu kişiler çıkarsa istasyonda açık artacağı için dışarı gönderilmez">Nöbet branşını dolduruyor, gönderilmez: ${x.r.gerekliler.slice(0, 6).map(k => esc(k.ad)).join(', ')}${x.r.gerekliler.length > 6 ? ' …' : ''}</div>` : ''}</td></tr>`).join('');
    const oRows = oFiltre.map(o => `<tr><td><input type="checkbox" data-rot="${o.id}" ${o.hedef ? 'checked' : ''}></td><td>${esc(o.ad)}</td><td>${esc(o.kaynak)}${o.kaynakDurum === 'ihtiyac' ? ' <span class="ap-tag ap-t-ih" title="Bu istasyon zaten personel ihtiyacında">açık</span>' : o.kaynakDurum === 'fazla' ? ' <span class="ap-tag ap-t-fz">fazla</span>' : ''}</td>
      <td><select class="ap-sel" id="ap-rh-${o.id}" title="${o.hedef ? '' : 'Bu kişi için uygun hedef (açığı olan, yapabildiği nöbet branşı uyan) istasyon yok; isterseniz elle seçebilirsiniz'}"><option value="" ${o.hedef ? '' : 'selected'}>${o.hedef ? '—' : ''}</option>${hedefAdlari.map(a => `<option ${a === o.hedef ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></td><td>${o.hedef ? (o.km === null ? 'KKM' : o.ayniIlce ? 'aynı ilçe' : (o.km >= 9999 ? '—' : o.km + ' km')) : '—'}</td><td>${esc(o.neden)}${o.rol ? ` · ${esc(o.rol)}` : ''}${o.uzun ? ' <span class="ap-tag" style="background:#e5e7eb;color:#374151">uzun süreli (ekip OF)</span>' : ''}</td></tr>`).join('');
    const rSek = [['kota', 'İstasyon kotaları ve sıradakiler'], ['oner', `Önerilen çıkışlar (${oFiltre.length})`]], ra = rSek.some(x => x[0] === S.rotSekme) ? S.rotSekme : 'kota';
    const rNav = `<div class="ap-subnav ap-noprint">${rSek.map(([v, t]) => `<button class="${ra === v ? 'on' : ''}" data-act="rot-sekme" data-v="${v}">${t}</button>`).join('')}</div>`;
    const rKota = `<div class="ap-card"><h2>Aylık rotasyon — ${ayEtiket()}</h2>
      <p class="ap-note">Her istasyondan ayda <b>kota</b> kadar kişi çıkar: varsayılan 1, mesai dolmayan (fazla) istasyonda fazlalık kadar kişi (2-3); kutuyu doldurarak elle değiştirebilirsiniz. Sıra: önce <b>gitmek isteyenler</b>, sonra <b>en uzun süredir çıkmayan</b> (eşitlikte kıdemli en son). Hedef: önce <b>aynı ilçe</b>, sonra <b>yakından uzağa</b>; <b>doktorlar yalnızca doktorlu (A1) ekiplere ve KKM'ye</b> gidebilir. Dışarıdaki kişi "devam etsin" seçilirse kota onunla dolar ve aylar üst üste sürer. 4/B personel 4 yılını doldurmadan, izinli/nöbet muaf/gitmesin işaretli kişiler önerilmez.</p>
      <div class="ap-row"><button class="ap-btn" data-act="oto-geri-cek" ${duz ? '' : 'disabled'} title="Dönmesi istasyonun açığını azaltacak, başka istasyona görevli personeli geri çağırır (devam etsin işaretliler, sağlık mazereti ve eğitim hariç)">Açığı olan istasyonların personelini geri çağır</button></div><p class="ap-note">Ayrıca: bir istasyonda ihtiyaç varken o nöbet branşını dolduran kişi dışarı önerilmez; personel listeleri yüklenince ve önceki aydan kopyalayınca açığı olan istasyonların dışarıdaki personeli otomatik geri çağrılır (Ayarlar'dan kapatılabilir).</p>
      <div class="ap-tw"><table class="ap-t"><thead><tr><th>İSTASYON</th><th>KOTA</th><th>ŞU AN DIŞARIDA</th><th>SIRADAKİLER (ilk 4)</th></tr></thead><tbody>${satir || '<tr><td colspan="4" class="ap-empty">Rotasyon gerektiren istasyon yok</td></tr>'}</tbody></table></div></div>`;
    const rOner = `<div class="ap-card">
      <div class="ap-row"><h2 style="margin:0">Önerilen çıkışlar (${oFiltre.length}${rIst ? ' / ' + oner.length : ''})</h2><label class="ap-note" title="Seçilen istasyondan çıkanlar ve o istasyona gidenler listelenir">İstasyon <select class="ap-sel" data-act="rot-ist"><option value="">Tümü</option>${hedefAdlari.map(a => `<option ${a === rIst ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label><label class="ap-note">Kaynak <select class="ap-sel" data-act="rot-kaynak"><option value="tum" ${S.rotKaynak !== 'fazla' ? 'selected' : ''}>Tüm istasyonlar (her istasyondan kota kadar)</option><option value="fazla" ${S.rotKaynak === 'fazla' ? 'selected' : ''}>Yalnızca mesaisi dolmayan (fazla) istasyonlar</option></select></label></div>
      <div class="ap-row" style="margin:8px 0"><button class="ap-btn pri" data-act="rot-uygula" ${duz && oner.length ? '' : 'disabled'}>Seçilenleri görevlendir</button></div>
      <div class="ap-tw"><table class="ap-t"><thead><tr><th></th><th>KİŞİ</th><th>KAYNAK</th><th>HEDEF</th><th>UZAKLIK</th><th>NEDEN</th></tr></thead><tbody>${oRows || '<tr><td colspan="6" class="ap-empty">Öneri yok</td></tr>'}</tbody></table></div>
      <div class="ap-row" style="margin-top:8px"><span class="ap-note">Görevlendirme ${ayEtiket()} ayını kapsar; sonraki aya kopyalanırken "devam etsin" işaretliler uzatılır, diğerleri döner.</span></div></div>`;
    return rNav + (ra === 'kota' ? rKota : rOner);
  }

  // ---------- olaylar ----------
  function kayit(id) { return S.plan && S.plan.kayitlar.find(k => k.id === id); }
  function setField(id, f, v) {
    const k = kayit(id); if (!k) return;
    const sakla = (islem, d) => mut(() => {}, islem, `${k.ad}: ${d}`);
    switch (f) {
      case 'ad': if (v.trim()) mut(() => { k.ad = v.trim().toLocaleUpperCase('tr-TR'); }, 'Ad düzenlendi', k.ad); break;
      case 'unvan': mut(() => { k.unvan = v.trim(); k.sinif = C.sinifTespit(v) || k.sinif; k.dortB = C.dortB(v, k.kadroTur); }, 'Ünvan değişti', `${k.ad}: ${v}`); break;
      case 'rolManuel': mut(() => { k.rolManuel = v; }, 'Nöbet rolü', `${k.ad}: ${v || 'otomatik'}`); break;
      case 'sinif': mut(() => { k.sinif = v; }, 'Sınıf değişti', `${k.ad}: ${v}`); break;
      case 'durum': mut(() => { k.durum = v; k.durumMetin = ''; k.durumManuel = true; }, 'Durum değişti', `${k.ad}: ${v || '—'}`); break;
      case 'izinGun': { const n = sayi(v); mut(() => { k.izin = k.izin || []; if (n > 0) { if (k.izin[0]) k.izin[0].gun = n; else k.izin.push({gun: n, tur: 'YILLIK İZİN'}); } else k.izin = []; }, 'İzin değişti', `${k.ad}: ${n} gün`); break; }
      case 'izinTur': mut(() => { if (!k.izin || !k.izin[0]) k.izin = [{gun: 0, tur: v}]; else k.izin[0].tur = v; }, 'İzin türü', `${k.ad}: ${v}`); break;
      case 'planlanan': mut(() => { k.planlanan = v === '' ? null : sayi(v); k.kilit = v !== ''; }, 'Planlanan nöbet (elle)', `${k.ad}: ${v}`); break;
      case 'kilit': mut(() => { k.kilit = !!v; }, v ? 'Kilitlendi' : 'Kilit açıldı', k.ad); break;
      case 'yolluk': mut(() => { k.gorev = k.gorev || {yer: '', hedef: null, kaynak: 'manuel', yolluk: '', tarih: '', gerekce: ''}; k.gorev.yolluk = v; }, 'Yolluk durumu', `${k.ad}: ${v}`); break;
      case 'gTarih': mut(() => { k.gorev.tarih = v; k.gorev.kaynak = 'manuel'; }, 'Görev tarihi', `${k.ad}: ${v}`); break;
      case 'gGerekce': mut(() => { k.gorev.gerekce = v; k.gorev.kaynak = 'manuel'; }, 'Görevlendirme gerekçesi', `${k.ad}: ${v}`); break;
      case 'istek': mut(() => { k.istek = v; }, 'Kişi isteği', `${k.ad}: ${ISTEK[v] || 'Sırayla'}`); break;
      case 'gHedef':
        if (v === '__yer__') break;
        if (v === '__diger__') { mut(() => { k.gorev = {...(k.gorev || {}), yer: '', hedef: null, diger: true, kaynak: 'manuel', yolluk: (k.gorev && k.gorev.yolluk) || '', tarih: (k.gorev && k.gorev.tarih) || '', gerekce: (k.gorev && k.gorev.gerekce) || ''}; k.durum = 'GEÇİCİ GÖREVDE'; k.durumManuel = true; }, 'Görevlendirme (diğer yer)', k.ad); }
        else gorevlendir(k, v, {yer: v, diger: false});
        break;
      case 'gYer': mut(() => { k.gorev = {...(k.gorev || {}), yer: v.trim(), hedef: null, diger: true, kaynak: 'manuel'}; k.durum = 'GEÇİCİ GÖREVDE'; k.durumManuel = true; }, 'Görev yeri', `${k.ad}: ${v}`); break;
    }
  }
  // Görevlendirme engelleri: 4/B (4 yıl) ve doktor kısıtı (yalnızca doktorlu A1 ekipler ve KKM)
  const doktorluIstasyon = b => b && b.tur === 'istasyon' && (b.tip ? b.tip === 'A1' : S.plan.kayitlar.some(k => k.birim === b.ad && k.sinif === 'doktor'));
  const doktorHedefiUygun = ad => { const b = S.plan.birimler.find(x => x.ad === ad); return !!b && (b.tur === 'kkm' || doktorluIstasyon(b)); };
  function gorevEngeli(k, hedef) {
    if (aileHek(k)) return 'Aile hekimliğine geçti: kendi isteği olmadan görevlendirilemez ya da geri çağrılamaz';
    const b = S.plan.birimler.find(x => x.ad === hedef);
    if (b && b.ekipOf && hedef !== k.birim) return 'Bu ekip kapalı (EKİP OF); görevlendirme yapılamaz';
    if (b && b.tur === 'istasyon' && hedef !== k.birim) { const e = C.gorevlendirmeEngeli(k, ayIlk()); if (e) return e; }
    if (k.sinif === 'doktor' && hedef && hedef !== k.birim && !doktorHedefiUygun(hedef)) return 'Doktor yalnızca doktorlu (A1) ekiplere ve Komuta Kontrol Merkezi\'ne görevlendirilebilir';
    return '';
  }
  function gorevlendir(k, hedef, ek) {
    if (!hedef) { mut(() => { k.gorev = null; if (k.durum === 'GEÇİCİ GÖREVDE') k.durum = ''; }, 'Görevlendirme kaldırıldı', k.ad); return false; }
    const eng = gorevEngeli(k, hedef);
    if (eng) { toast(`${k.ad}: ${eng}`); render(); return false; }
    return mut(() => { k.gorev = {...(k.gorev || {}), yer: (k.gorev && k.gorev.yer) || hedef, hedef, kaynak: 'manuel', yolluk: (k.gorev && k.gorev.yolluk) || '', tarih: (k.gorev && k.gorev.tarih) || '', gerekce: (k.gorev && k.gorev.gerekce) || '', ...(ek || {})}; k.durum = 'GEÇİCİ GÖREVDE'; k.durumManuel = true; k.gecmis = [...new Set([...(k.gecmis || []), ayAnahtari()])].sort(); }, 'Görevlendirme', `${k.ad}: ${k.birim} → ${hedef}`);
  }
  // Bir ekibin başka birimlere görevli personelini geri çağırır (ör. kapalı ekip yeniden açılırken). Kurum dışı yerlerdeki görevler (hastane, aile hekimliği vb.) değiştirilmez.
  function geriCagirmaAdaylari(b) { return S.plan.kayitlar.filter(k => k.birim === b.ad && !aileHek(k) && gorevAktif(k.gorev) && k.gorev.hedef); }
  function geriCagir(b) {
    const liste = geriCagirmaAdaylari(b);
    mut(() => { liste.forEach(k => { k.gorev = null; if (k.durum === 'GEÇİCİ GÖREVDE') k.durum = ''; k.durumManuel = false; k.istek = ''; }); }, 'Personel geri çağrıldı', `${b.ad}: ${liste.length} kişi`);
    return liste.length;
  }
  // Her değişiklikte (kilitli değerler hariç) tüm istasyonlarda planlanan nöbeti yeniden hesaplar
  function otoHesapla() {
    if (!S.plan || S.ayar.otoOner === false || !guncelAy()) return;      // geçmiş aylar dondurulur
    S.plan.birimler.forEach(b => { if (b.tur === 'istasyon') oner(b.ad); });
  }
  function oner(birimAd) {
    const b = S.plan.birimler.find(x => x.ad === birimAd); if (!b || b.tur !== 'istasyon') return;
    const D = durumlar();
    if (b.ekipOf) { S.plan.kayitlar.forEach(k => { if (k.birim === b.ad && !(k.gorev && k.gorev.hedef)) k.planlanan = null; }); return; }
    const h = hesapla(b), kilit = new Map(); h.satir.forEach(s => { if (s.k.kilit && s.k.planlanan != null) kilit.set(s.k.id, sayi(s.k.planlanan)); });
    const o = C.oneri(h, kilit), kayitMap = new Map(S.plan.kayitlar.map(k => [k.id, k]));
    h.satir.forEach(s => {
      const k = kayitMap.get(s.k.id); if (!k) return;
      const disarida = !s.k._gelen && (D[k.durum] || {}).disarida && k.gorev && k.gorev.hedef && k.gorev.hedef !== b.ad;
      if (disarida || k.kilit) return;      // başka istasyona görevli kişinin planlananı hedef istasyonda hesaplanır; burada silinmez
      k.planlanan = s.nobetYok ? null : (o.get(k.id) ?? 0);
    });
  }

  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    const a = t.dataset.act, v = t.dataset.v;
    if (/^(SELECT|INPUT|OPTION|TEXTAREA)$/.test(e.target.tagName)) return;      // form kontrolleri change olayıyla işlenir
    if (['ist-sec', 'rol', 'plan-durum', 'f-q', 'f-birim', 'f-sinif', 'f-durum', 'tahmini', 'oto-oner', 'rot-kaynak', 'tema', 'ekip-of', 'p-boyut', 'f-surucu'].includes(a)) return;     // change/input ile işlenir
    e.preventDefault();
    try {
      switch (a) {
        case 'sayfa': S.sayfa = v; break;
        case 'liste-surucu': S.filtre = {q: '', durum: '', birim: '', sinif: 'memur', surucu: 'dogrulanmadi'}; S.pSayfa = 0; S.sayfa = 'personel'; break;
        case 'gorev-sekme': S.gorevSekme = v; break;
        case 'oner-ac': S.onerAc = S.onerAc === v ? '' : v; break;
        case 'rot-sekme': S.rotSekme = v; break;
        case 'ozet-sekme': S.ozetSekme = v; break;
        case 'p-git': S.pSayfa = Math.max(0, parseInt(v, 10) || 0); break;
        case 'pano-filtre': S.panoFiltre = S.panoFiltre === v ? '' : v; break;
        case 'guncel-ay': { S.y = GUNCEL_Y; S.m = GUNCEL_M; S.ist = ''; await planYukle(); S.sayfa = 'pano'; break; }
        case 'arsiv-ac': { const [yy, mm] = String(v).split('-').map(Number); S.y = yy; S.m = mm; S.ist = ''; await planYukle(); S.modul = 1; S.sayfa = S.plan ? 'pano' : 'pano'; break; }
        case 'ay-': case 'ay+': { const d = a === 'ay+' ? 1 : -1; S.m += d; if (S.m > 12) { S.m = 1; S.y++; } if (S.m < 1) { S.m = 12; S.y--; } S.ist = ''; await planYukle(); if (S.plan && planOnar(S.plan)) { otoHesapla(); kaydet(); } break; }
        case 'ist-ac': S.ist = v; S.sayfa = 'ist'; break;
        case 'ist-onceki': case 'ist-sonraki': { const L = S.plan.birimler, i = L.findIndex(b => b.ad === S.ist); S.ist = L[(i + (a === 'ist-sonraki' ? 1 : -1) + L.length) % L.length].ad; break; }
        case 'oner': mut(() => oner(S.ist), 'Planlanan nöbet önerildi', S.ist); break;
        case 'oner-hepsi': mut(() => S.plan.birimler.forEach(b => oner(b.ad)), 'Tüm istasyonlarda planlanan önerildi', ''); toast('Planlanan nöbetler önerildi (kilitli olanlar korundu).'); break;
        case 'kisi-ekle': { const ad = prompt('Ad Soyad:'); if (!ad) break; const un = prompt('Ünvan (ör. ATT, DOKTOR, SÜREKLİ İŞÇİ):', 'ATT') || 'ATT'; mut(() => S.plan.kayitlar.push({id: uid(), ad: ad.toLocaleUpperCase('tr-TR'), tc: '', unvan: un, sinif: C.sinifTespit(un) || 'memur', birim: S.ist, durum: '', durumMetin: '', izin: [], planlanan: null, kilit: false, gorev: null, dortB: C.dortB(un), memBas: ''}), 'Kişi eklendi', `${ad} → ${S.ist}`); break; }
        case 'kisi-sil': { const k = kayit(t.dataset.id); if (k && confirm(`${k.ad} kaydı silinsin mi?`)) mut(() => { (S.plan.silinen = S.plan.silinen || []).unshift({...JSON.parse(JSON.stringify(k)), _silZaman: Date.now(), _silBirim: k.birim}); S.plan.silinen.length = Math.min(S.plan.silinen.length, 200); S.plan.kayitlar = S.plan.kayitlar.filter(x => x.id !== k.id); }, 'Kişi silindi', k.ad); break; }
        case 'kisi-geri': { const sl = (S.plan.silinen || []).find(x => x.id === t.dataset.id); if (!sl) break; if (S.plan.kayitlar.some(x => x.id === sl.id || (sl.tc && x.tc === sl.tc))) { toast('Bu kişi zaten listede.'); break; } const {_silZaman, _silBirim, ...k0} = sl; mut(() => { S.plan.kayitlar.push(k0); S.plan.silinen = S.plan.silinen.filter(x => x.id !== sl.id); }, 'Silinen kişi geri getirildi', `${k0.ad} → ${k0.birim}`); toast(`${k0.ad} geri getirildi.`); break; }
        case 'g-ekle': { const ad = root.querySelector('#ap-g-kisi').value.trim().toLocaleUpperCase('tr-TR'), hedef = root.querySelector('#ap-g-hedef').value; const k = S.plan.kayitlar.find(x => x.ad === ad); if (!k) { toast('Kişi bulunamadı. Listeden seçin.'); break; } gorevlendir(k, hedef); break; }
        case 'og-ekle': { const d = root.querySelector('#ap-og-t').value, tur = root.querySelector('#ap-og-tur').value; if (!d) { toast('Tarih seçin.'); break; } mut(() => { S.plan.ozel[d] = {tur}; }, 'Özel gün eklendi', `${d} ${C.OZEL_TUR[tur]}`); break; }
        case 'og-sil': mut(() => { delete S.plan.ozel[v]; }, 'Özel gün silindi', v); break;
        case 'liste': S.filtre = {q: '', durum: v.slice(6), birim: '', sinif: ''}; S.pSayfa = 0; S.sayfa = 'personel'; break;
        case 'plan-bos': S.plan = bosPlan(); logla('Boş plan oluşturuldu'); kaydet(); S.sayfa = 'ist'; break;
        case 'plan-kopya': {
          const pk = S.m === 1 ? `plan:${S.y - 1}-12` : `plan:${S.y}-${C.pad(S.m - 1)}`, onceki = await depo.get(pk); if (!onceki) { toast('Önceki ay planı yok.'); break; }
          S.plan = bosPlan(); S.plan.birimler = JSON.parse(JSON.stringify(onceki.birimler)); ofUygula(S.plan);
          const ofBirim = new Set((onceki.birimler || []).filter(b => b.ekipOf).map(b => b.ad));
          S.plan.kayitlar = JSON.parse(JSON.stringify(onceki.kayitlar)).map(k => {
            const y = {...k, izin: [], planlanan: null, kilit: false};
            if (y.gorev && y.gorev.bit && y.gorev.bit <= ayIlk()) {
              if (y.istek === 'devam' || ofBirim.has(y.birim)) { y.gorev = {...y.gorev, bas: ayIlk(), bit: gunSon(), tarih: `${trTarih(ayIlk())} – ${trTarih(gunSon())}`}; y.gecmis = [...new Set([...(y.gecmis || []), ayAnahtari()])].sort(); }
              else { y.gorev = null; if (y.durum === 'GEÇİCİ GÖREVDE') y.durum = ''; y.durumManuel = false; }
            }
            return y;
          });
          otoHesapla(); if (S.ayar.otoGeriCek !== false) { const gc = acikGeriCek(true); if (gc.length) toast(`${gc.length} personel, istasyonlarında açık olduğu için otomatik geri çağrıldı.`); } logla('Önceki aydan kopyalandı', pk); kaydet(); S.sayfa = 'pano'; break;
        }
        case 'plan-asos': { if (salt()) { toast(!guncelAy() ? 'Geçmiş aya dosya yüklenemez (salt okunur).' : 'Düzenleme yetkiniz yok / ay kilitli.'); break; } const f = await dosyaSec('.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', true); if (f.length) await asosDosyalariIsle(f); return; }
        case 'asos-uygula': {
          const A = S.asos; if (!A || !A.plan) break;
          if (S.plan && salt()) { toast('Bu ay düzenlemeye kapalı.'); break; }
          const pasif = root.querySelector('#ap-asos-pasif') && root.querySelector('#ap-asos-pasif').checked, eksik = (A.raporlar.find(r => r.tur === 'A') || {eksik: []}).eksik;
          const yeni = A.plan; if (pasif) yeni.kayitlar.forEach(k => { if (eksik.some(e => e.id === k.id)) k.durum = 'PASİF'; });
          S.plan = yeni; ofUygula(S.plan); otoHesapla(); if (S.ayar.otoGeriCek !== false) { const gc = acikGeriCek(true); if (gc.length) toast(`${gc.length} personel, istasyonlarında açık olduğu için otomatik geri çağrıldı.`); }
          logla('ASOS personel listeleri uygulandı', A.raporlar.map(r => `${r.tur === 'A' ? 'EKİP' : 'Personel Listesi'}: ${r.toplam} satır, ${r.yeni.length} yeni, ${r.degisen} güncel, ${r.nakil.length} birim değişikliği`).join(' | '));
          await yuklemeKaydet(A.dosyalar.filter(d => d.rapor));
          for (const r of A.raporlar) if (r.gercek) for (const g of Object.values(r.gercek)) await depo.put('gercek:' + g.ay, g);
          S.arsivVeri = null;
          kaydet(); S.modal = null; S.asos = null; S.sayfa = 'pano'; if (!S.ist || !S.plan.birimler.some(b => b.ad === S.ist)) S.ist = (S.plan.birimler.find(b => b.tur === 'istasyon') || S.plan.birimler[0] || {}).ad || '';
          toast('Personel listeleri uygulandı.'); break;
        }
        case 'pano-mod': { S.ayar.panoMod = v === 'mesai' ? 'mesai' : 'fazla'; await ayarKaydet(); if (S.plan && !salt()) { otoHesapla(); kaydet(); } break; }
        case 'oto-geri-cek': { const gc = acikGeriCek(true); toast(gc.length ? `${gc.length} personel geri çağrıldı: ${gc.slice(0, 4).map(x => x.k.ad).join(', ')}${gc.length > 4 ? ' …' : ''}` : 'Geri çağrılacak personel yok: açığı olan istasyonların dışarıdaki personeli bulunmuyor.'); kaydet(); break; }
        case 'ist-onayla': {      // istasyondaki tüm planlanan değerleri elle girilmiş gibi kilitler (ya da kilitleri açar)
          const b = S.plan.birimler.find(x => x.ad === S.ist); if (!b || salt()) break; const ac = v === '0', h = hesapla(b); let n = 0;
          S.toplu = true; try { mut(() => { h.satir.forEach(s => { if (s.nobetYok) return; const k = s.k; if (k.birim !== b.ad) return; if (ac) { if (k.kilit) { k.kilit = false; n++; } } else if (k.planlanan != null && !k.kilit) { k.kilit = true; n++; } }); }, ac ? 'İstasyon kilitleri açıldı' : 'İstasyon planı onaylandı (değerler kilitlendi)', `${b.ad}: ${n} kişi`); } finally { S.toplu = false; }
          if (ac) { otoHesapla(); kaydet(); }
          toast(ac ? `${n} kişinin kilidi açıldı.` : `${n} kişinin nöbeti onaylandı (kilitlendi).`); break;
        }
        case 'geri-cagir': { const b = S.plan.birimler.find(x => x.ad === v); if (!b) break; const n = geriCagirmaAdaylari(b).length; if (n && confirm(`${b.ad} ekibine bağlı, başka birimlere görevli ${n} personel geri çağrılsın mı?`)) toast(`${geriCagir(b)} personel geri çağrıldı.`); break; }
        case 'gorev-bitir': {
          const k = kayit(t.dataset.id); if (!k || !k.gorev) break;
          if (aileHek(k)) { toast('Aile hekimliğindeki personel kendi isteği olmadan geri çağrılamaz.'); break; }
          const disKurum = !k.gorev.hedef;
          if (disKurum && !confirm(`${k.ad} kurum dışı bir yerde görevli (${k.gorev.yer}). Görev yine de bitirilsin mi?`)) break;
          const hedef = k.gorev.hedef || k.gorev.yer;
          mut(() => { k.gorev = null; if (k.durum === 'GEÇİCİ GÖREVDE') k.durum = ''; k.durumManuel = false; k.istek = ''; }, 'Geçici görev bitirildi (geri gönderildi)', `${k.ad}: ${hedef} → ${k.birim}`);
          toast(`${k.ad} ${k.birim} istasyonuna geri döndü.`); break;
        }
        case 'rot-don': { const k = kayit(t.dataset.id); if (k) mut(() => { k.gorev = null; if (k.durum === 'GEÇİCİ GÖREVDE') k.durum = ''; k.durumManuel = false; }, 'Rotasyon: görev bitirildi', k.ad); break; }
        case 'rot-uygula': { let n = 0; S.toplu = true; try { root.querySelectorAll('[data-rot]:checked').forEach(c => { const k = kayit(c.dataset.rot), h = root.querySelector('#ap-rh-' + c.dataset.rot).value; const ofK = k && (S.plan.birimler.find(x => x.ad === k.birim) || {}).ekipOf; if (k && h && gorevlendir(k, h, ofK ? {bas: ayIlk(), bit: '', uzun: true, gerekce: 'PERSONEL İHTİYACI', kaynak: 'manuel', tarih: `${trTarih(ayIlk())} – (ekip OF, uzun süreli)`} : {bas: ayIlk(), bit: gunSon(), gerekce: 'PERSONEL İHTİYACI', kaynak: 'manuel', tarih: `${trTarih(ayIlk())} – ${trTarih(gunSon())}`})) { if (k.istek === 'git') k.istek = ''; n++; } }); } finally { S.toplu = false; } otoHesapla(); kaydet(); toast(`${n} kişi görevlendirildi; planlanan nöbetler yeniden hesaplandı.`); break; }
        case 'modal-kapat': S.modal = null; S.asos = null; break;
        case 'png': { const b = S.plan.birimler.find(x => x.ad === v); pngCiz(b).toBlob(bl => indir(bl, `${b.ad}-${S.y}-${C.pad(S.m)}.png`)); break; }
        case 'gorev-excel': {      // Görevlendirme sayfasının tüm bölümleri tek Excel dosyasında
          const wb = XLSX.utils.book_new(), ek = (ad, bas, sat) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([bas, ...sat]), ad), r1 = x => Math.round(x * 100) / 100;
          const ists = S.plan.birimler.filter(b => b.tur === 'istasyon' && !b.ekipOf).map(b => ({b, h: hesapla(b)}));
          const degAd = h => h.ihtiyacTur === 'oner' ? `Personel öner: ${h.ihtiyacKisi} kişi${h.kalanAcik > 0 ? ' + ' + fmt(h.kalanAcik) + ' nöbet fazla nöbetle' : ''}` : h.ihtiyacTur === 'icerde' ? 'Fazla nöbetle kapanır' : h.ihtiyacTur === 'elle' ? 'Elle karar' : 'Açık yok';
          ek('Personel ihtiyacı', ['İstasyon', 'Mesai karşılığı açık', 'Fazla nöbetle açık', 'Kaç kişi gerekir', 'Değerlendirme'], ists.filter(x => x.h.ihtiyacTur !== 'yok').sort((a, b) => b.h.hedefAcik - a.h.hedefAcik).map(x => [x.b.ad, r1(x.h.hedefAcik), r1(Math.max(0, x.h.acikEf)), x.h.ihtiyacKisi, degAd(x.h)]));
          ek('Rotasyon kotaları', ['İstasyon', 'Kota', 'Şu an dışarıda', 'Sıradakiler (ilk 4)'], ists.map(x => ({...x, r: rotasyon(x.b, x.h)})).filter(x => x.r.disarida.length || x.r.gerek).map(x => [x.b.ad, x.b.cikisKota != null ? x.b.cikisKota : x.r.kotaOto, x.r.disarida.map(k => `${k.ad} → ${k.gorev.hedef}`).join('; '), x.r.adaylar.slice(0, 4).map((k, i) => `${i + 1}. ${k.ad}`).join('; ')]));
          ek('Önerilen çıkışlar', ['Kişi', 'Kaynak', 'Hedef', 'Uzaklık', 'Neden'], rotasyonOneriler().map(o => [o.ad, o.kaynak, o.hedef || '', o.hedef ? (o.km === null ? 'KKM' : o.ayniIlce ? 'aynı ilçe' : o.km >= 9999 ? '' : o.km + ' km') : '', o.neden + (o.rol ? ' · ' + o.rol : '')]));
          ek('Görevlendirmeler', ['Ad soyad', 'Ünvan', 'Kaynak', 'Hedef / yer', 'Tarih', 'Yolluk', 'Gerekçe'], S.plan.kayitlar.filter(k => k.gorev && (k.gorev.hedef || k.gorev.yer)).sort((a, b) => trCollator.compare(a.birim, b.birim) || trCollator.compare(a.ad, b.ad)).map(k => [k.ad, k.unvan, k.birim, k.gorev.hedef || k.gorev.yer, k.gorev.tarih || '', k.gorev.yolluk || '', k.gorev.gerekce || '']));
          ek('Fazla istasyonlar', ['İstasyon', 'Fazla nöbet'], ists.filter(x => x.h.fazlaVar).sort((a, b) => b.h.fazlaEf - a.h.fazlaEf).map(x => [x.b.ad, r1(x.h.fazlaH)]));
          xlsxIndir(wb, `Gorevlendirme-${S.y}-${C.pad(S.m)}.xlsx`); break;
        }
        case 'excel-ist': { const b = S.plan.birimler.find(x => x.ad === v), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, excelBirimSheet(b), sheetAd(b.ad, new Set())); xlsxIndir(wb, `${b.ad}-${S.y}-${C.pad(S.m)}.xlsx`); break; }
        case 'excel-toplu': xlsxIndir(excelToplu(), `ASHI-Planlama-${S.y}-${C.pad(S.m)}.xlsx`); break;
        case 'yedek-al': indir(new Blob([JSON.stringify({surum: VERSION, plan: S.plan})], {type: 'application/json'}), `ashi-planlama-${S.y}-${C.pad(S.m)}.json`); break;
        case 'yedek-yukle': { const f = await dosyaSec('.json', false); if (!f) break; try { const j = JSON.parse(new TextDecoder().decode(await dosyaOku(f))); if (!j.plan || !Array.isArray(j.plan.kayitlar)) throw new Error('Geçersiz yedek'); if (!confirm('Bu ayın planı yedekle değiştirilecek. Devam edilsin mi?')) break; S.plan = j.plan; logla('Yedekten yüklendi'); kaydet(); } catch (er) { toast('Yedek okunamadı: ' + er.message); } break; }
        default: if (await ekClick(a, v, t, e)) break; return;
      }
    } catch (er) { console.error(er); toast('Hata: ' + er.message); }
    render();
  });
  // Açık seçim penceresi (aylar / istasyonlar): boşluğa tıklayınca ya da Esc ile kapanır
  document.addEventListener('click', e => { if (S.arstatAc && root.isConnected && !e.target.closest('[data-pop],.ap-pop')) { S.arstatAc = ''; render(); } }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && S.arstatAc) { S.arstatAc = ''; render(); } });
  // Görevlendirmeler listesini yazdıkça süz (yeniden çizmeden)
  root.addEventListener('input', e => {
    const t = e.target;
    if (t && t.id === 'ap-ist-ara') { S.arstatAra = t.value; const q = C.TR(t.value).trim(); root.querySelectorAll('.ap-pop-ist [data-ara]').forEach(x => { x.style.display = !q || x.dataset.ara.includes(q) ? '' : 'none'; }); return; }
    if (!t || (t.id !== 'ap-g-kisi' && t.id !== 'ap-g-ist')) return;
    const q = C.TR((root.querySelector('#ap-g-kisi') || {}).value || '').trim(), ist = (root.querySelector('#ap-g-ist') || {}).value || '';
    root.querySelectorAll('tr[data-ara]').forEach(r => { r.style.display = (!q || r.dataset.ara.includes(q)) && (!ist || r.dataset.kay === ist || r.dataset.hed === ist) ? '' : 'none'; });
  });
  root.addEventListener('change', async e => {
    const t = e.target;
    try {
      if (await ekChange(t)) { render(); return; }
      if (t.dataset.id && t.dataset.f) { const v = t.type === 'checkbox' ? t.checked : t.value; setField(t.dataset.id, t.dataset.f, v); render(); return; }
      if (t.dataset.d) { if (S.rol !== 'yonetici') return; const d = S.ayar.durumlar[t.dataset.d]; d[t.dataset.f] = t.type === 'checkbox' ? t.checked : t.value; await ayarKaydet(); otoHesapla(); kaydet(); render(); return; }
      if (t.dataset.rb) { const b = S.plan.birimler.find(x => x.ad === t.dataset.rb); if (b) mut(() => { b.cikisKota = t.value === '' ? null : Math.max(0, Math.round(sayi(t.value))); }, 'Rotasyon kotası', `${b.ad}: ${b.cikisKota === null ? 'otomatik' : b.cikisKota}`); render(); return; }
      if (t.dataset.ib) { const b = S.plan.birimler.find(x => x.ad === t.dataset.ib); if (b) mut(() => { b.azamiMemur = t.value === '' ? null : Math.max(0, sayi(t.value)); }, 'İstasyon azami nöbeti', `${b.ad}: ${b.azamiMemur === null ? 'genel' : b.azamiMemur}`); render(); return; }
      if (t.hasAttribute('data-pano-azami')) { if (salt()) return; S.ayar.azamiMemur = Math.max(0, sayi(t.value)) || S.ayar.azamiMemur; await ayarKaydet(); otoHesapla(); kaydet(); render(); return; }
      if (t.dataset.ay) { if (S.rol !== 'yonetici') return; { const v = sayi(t.value), an = t.dataset.ay; S.ayar[an] = an === 'isciEk' ? Math.max(0, Math.round(v)) : (an === 'surEsik' || an === 'surDegilEsik') ? Math.min(100, Math.max(0, v)) : (v || (an === 'azamiMemur' ? 8 : 11)); } await ayarKaydet(); otoHesapla(); kaydet(); render(); return; }
      const a = t.dataset.act;
      if (a === 'ist-sec') { S.ist = t.value; }
      else if (a === 'rol') { S.rol = t.value; }
      else if (a === 'plan-durum') { if (S.rol !== 'yonetici' && S.rol !== 'planlayici') return; if (t.value === 'kilitli' && S.rol !== 'yonetici') { toast('Ayı yalnızca yönetici kilitler.'); } else mut(() => { S.plan.durum = t.value; }, 'Plan durumu', t.value); }
      else if (a === 'f-birim') { S.filtre.birim = t.value; S.pSayfa = 0; } else if (a === 'f-sinif') { S.filtre.sinif = t.value; S.pSayfa = 0; } else if (a === 'f-durum') { S.filtre.durum = t.value; S.pSayfa = 0; }
      else if (a === 'f-surucu') { S.filtre.surucu = t.value; S.pSayfa = 0; }
      else if (a === 'f-q') { S.filtre.q = t.value; S.pSayfa = 0; }
      else if (a === 'tahmini') { S.ayar.tahminiGoster = t.checked; await ayarKaydet(); }
      else if (a === 'rot-kaynak') S.rotKaynak = t.value;
      else if (a === 'rot-ist') S.rotIst = t.value;
      else if (a === 'p-boyut') { S.pBoyut = parseInt(t.value, 10) || 50; S.pSayfa = 0; }
      else if (a === 'tema') { S.ayar.tema = t.value; await ayarKaydet(); }
      else if (a === 'ekip-of') {
        const b = S.plan.birimler.find(x => x.ad === t.dataset.v);
        if (b) {
          const aciliyor = !t.checked && b.ekipOf, dis = aciliyor ? geriCagirmaAdaylari(b) : [];
          S.ayar.ofIst = (Array.isArray(S.ayar.ofIst) ? S.ayar.ofIst : []).filter(x => x !== b.ad); if (t.checked) S.ayar.ofIst.push(b.ad); await ayarKaydet();
          mut(() => { b.ekipOf = t.checked; }, t.checked ? 'Ekip OF işaretlendi' : 'Ekip OF kaldırıldı (ekip açıldı)', b.ad);
          if (aciliyor && dis.length && confirm(`${b.ad} yeniden açılıyor. Başka birimlere görevli ${dis.length} personel geri çağrılsın mı?\n\nTamam: görevleri bitirilir, personel ekibe döner.\nİptal: görevler olduğu gibi kalır (sonra tek tek veya "Personeli geri çağır" ile dönebilir).`)) toast(`${geriCagir(b)} personel geri çağrıldı.`);
        }
      }
      else if (a === 'oto-geri') { if (S.rol !== 'yonetici') return; S.ayar.otoGeriCek = t.checked; await ayarKaydet(); }
      else if (a === 'oto-oner') { if (S.rol !== 'yonetici') return; S.ayar.otoOner = t.checked; await ayarKaydet(); if (t.checked && S.plan) { otoHesapla(); kaydet(); } }
      else return;
      render();
    } catch (er) { console.error(er); toast('Hata: ' + er.message); }
  });

  root.addEventListener('dragover', e => { if (e.dataTransfer && [...(e.dataTransfer.types || [])].includes('Files')) e.preventDefault(); });
  root.addEventListener('drop', e => { if (!e.dataTransfer || !e.dataTransfer.files.length) return; e.preventDefault(); if (salt()) { toast('Düzenleme yetkiniz yok / ay kilitli / geçmiş ay salt okunur.'); return; } asosDosyalariIsle([...e.dataTransfer.files]); });

  // başlangıç
  const hazir = (async () => { await ayarYukle(); await planYukle(); if (S.plan && planOnar(S.plan)) { otoHesapla(); logla('Plan onarıldı', 'Hatalı tanınan istasyon birimleri temizlendi'); kaydet(); } render(); setTimeout(() => arsivArkaPlan(), 1200); })();
  return {getState: () => S, hazir, yenile: render,  unmount: () => { root.innerHTML = ''; }};
}
return {mount, VERSION};
})();
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => { const el = document.getElementById('ap-app'); if (el) window.__ap = AshiPlanlama.mount(el); });
