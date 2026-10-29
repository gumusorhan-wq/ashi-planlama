
  // ================= MODÜL 1 — ARŞİV VE ARŞİV İSTATİSTİKLERİ =================
  const bransAd = k => k.sinif === 'doktor' ? 'Doktor' : k.sinif === 'isci' ? 'İşçi' : C.kadroTip(k);
  const BRANSLAR = ['AABT', 'ATT', 'Doktor', 'İşçi'];
  const arsivAnahtar = ay => 'arsiv:' + ay;
  const ayAd = ay => { const [y, m] = ay.split('-'); return `${AYLAR[+m]} ${y}`; };

  // Bir planın aylık özeti (kişisel veri içermez: TC, sağlık, telefon yok; yalnız ad ve branş)
  function ayMetrik(plan, y, m) {
    const D = durumlar(), ist = {};
    plan.birimler.filter(b => b.tur === 'istasyon').forEach(b => {
      const h = hesaplaCtx(plan, y, m, b), aktif = h.satir.filter(s => !s.nobetYok);
      const planlanan = aktif.reduce((a, s) => a + sayi(s.k.planlanan), 0);
      const cikan = plan.kayitlar.filter(k => k.birim === b.ad && (D[k.durum] || {}).disarida && k.gorev && k.gorev.hedef && k.gorev.hedef !== b.ad)
        .map(k => ({ad: k.ad, brans: bransAd(k), hedef: k.gorev.hedef, uzun: !!k.gorev.uzun}));
      const gelen = h.satir.filter(s => s.k._gelen).map(s => ({ad: s.k.ad, brans: bransAd(s.k), kaynak: s.k.birim}));
      const fazla = aktif.map(s => ({ad: s.k.ad, brans: bransAd(s.k), planlanan: sayi(s.k.planlanan), hedef: s.hedef, fazla: Math.round((sayi(s.k.planlanan) - s.hedef) * 100) / 100})).filter(x => x.fazla > 0.01);
      ist[b.ad] = {of: !!b.ekipOf, ihtiyac: h.ihtiyac, kapasite: h.kapasite, azami: h.azamiKap, planlanan: Math.round(planlanan * 100) / 100, kisi: aktif.length,
        fazlaMesai: Math.round(fazla.reduce((a, x) => a + x.fazla, 0) * 100) / 100, fazlaH: h.fazlaH, hedefAcik: h.hedefAcik, ihtiyacTur: h.ihtiyacTur, ihtiyacKisi: h.ihtiyacKisi, durum: h.durum, cikan, gelen, fazla};
    });
    return {ay: `${y}-${C.pad(m)}`, zaman: Date.now(), ist};
  }
  // Yüklenen dosya günlüğü (Arşiv sayfasında gösterilir): hangi dosya, hangi tür, kaç satır, hangi aya uygulandı
  const DOSYA_TUR = {A: 'EKİP Personel Listesi', B: 'Personel Listesi Raporu', N: 'Nöbet Listesi / Hareket Raporu'};
  async function yuklemeKaydet(dosyalar) {
    const l = (await depo.get('yuklemeler')) || [], t = Date.now();
    dosyalar.forEach(d => {
      const r = d.rapor, ozet = d.tur === 'N' ? `${r.kisi} kişi, ${r.eslesen} eşleşti · aylar: ${(r.aylar || []).join(', ')}` : `${r.yeni.length} yeni, ${r.degisen} güncel${r.nakil && r.nakil.length ? ', ' + r.nakil.length + ' birim değişikliği' : ''}`;
      l.unshift({t, ad: d.ad, tur: d.tur, satir: r.toplam, boyut: d.boyut || 0, ay: ayAnahtari(), rol: S.rol, ozet});
    });
    if (l.length > 500) l.length = 500;
    await depo.put('yuklemeler', l); S.yuklemeler = l;
  }
  async function arsivYukle() {
    S.yuklemeler = (await depo.get('yuklemeler')) || [];
    const anahtarlar = ((await depo.keys()) || []).filter(k => String(k).startsWith('arsiv:')).sort(), v = {};
    for (const k of anahtarlar) { const r = await depo.get(k); if (r && r.ay) v[r.ay] = r; }
    S.arsivVeri = v; if (!S.arsivSecili) S.arsivSecili = Object.keys(v);
    return v;
  }
  async function arsivYaz(rec) { await depo.put(arsivAnahtar(rec.ay), rec); (S.arsivVeri = S.arsivVeri || {})[rec.ay] = rec; if (S.arsivSecili && !S.arsivSecili.includes(rec.ay)) S.arsivSecili.push(rec.ay); }
  function arsivToplam(rec) {
    const o = {ihtiyac: 0, planlanan: 0, kapasite: 0, cikan: 0, gelen: 0, fazla: 0, oner: 0, of: 0};
    Object.values(rec.ist).forEach(i => { if (i.of) { o.of++; return; } o.ihtiyac += i.ihtiyac; o.planlanan += i.planlanan; o.kapasite += i.kapasite; o.cikan += i.cikan.length; o.gelen += i.gelen.length; o.fazla += i.fazlaMesai; if (i.ihtiyacTur === 'oner') o.oner++; });
    return o;
  }
  const tabloHtml = (bas, sat, ek) => `<div class="ap-tw"><table class="ap-t ${ek || ''}"><thead><tr>${bas.map(b => `<th>${b}</th>`).join('')}</tr></thead><tbody>${sat.map(r => `<tr>${r.map((c, i) => `<td${typeof c === 'number' ? ' class="num"' : ''}>${typeof c === 'number' ? fmt(c) : c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${bas.length}" class="ap-empty">Kayıt yok</td></tr>`}</tbody></table></div>`;

  function arsivHtml() {
    if (S.arsivVeri === null) { if (!S.arsivYuk) { S.arsivYuk = true; arsivYukle().then(() => { S.arsivYuk = false; render(); }); } return '<div class="ap-card">Arşiv yükleniyor…</div>'; }
    const aylar = Object.keys(S.arsivVeri).sort().reverse(), ay = ayAnahtari(), var_ = S.arsivVeri[ay], duz = S.rol !== 'salt_okur';
    const kayitliPlan = S.planAnahtarlari.map(k => k.slice(5)).filter(a => !S.arsivVeri[a]);
    const yl = S.yuklemeler || [], kb = b => b ? (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB') : '';
    const yuklemeHtml = `<div class="ap-card"><h2>Yüklenen dosyalar (${yl.length})</h2><p class="ap-note">ASOS'tan yüklenen her dosya, uygulandığı anda burada listelenir: ne zaman, hangi türde, kaç satır ve hangi plan ayına uygulandı. Dosyanın kendisi saklanmaz, yalnızca bu günlük tutulur.</p>${tabloHtml(['Tarih', 'Dosya', 'Tür', 'Satır', 'Boyut', 'Plan ayı', 'Sonuç'], yl.slice(0, 100).map(x => [new Date(x.t).toLocaleString('tr-TR'), esc(x.ad), DOSYA_TUR[x.tur] || x.tur, x.satir, kb(x.boyut), ayAd(x.ay), esc(x.ozet)]))}${yl.length > 100 ? '<div class="ap-note">Son 100 kayıt gösteriliyor.</div>' : ''}</div>`;
    return `<div class="ap-card"><h2>Aylık arşiv</h2>
      <p class="ap-note">Arşiv, her ayın istasyon bazlı özetini saklar: ihtiyaç, planlanan, kapasite, <b>çıkan ve gelen personel (branş ve istasyon)</b>, <b>fazla nöbet</b> alan kişiler. TC, telefon ve sağlık bilgisi arşive yazılmaz. Arşiv aynı tarayıcı veritabanında tutulur; yedeği Ayarlar'dan alınır.</p>
      <div class="ap-row"><button class="ap-btn pri" data-act="arsiv-yaz" ${duz ? '' : 'disabled'}>${ayEtiket()} ayını arşive kaydet${var_ ? ' (güncelle)' : ''}</button>
      <label class="ap-note"><input type="checkbox" id="ap-arsiv-kilit" ${S.rol === 'yonetici' ? '' : 'disabled'}> Kaydederken ayı kilitle (yalnız yönetici)</label>
      <button class="ap-btn" data-act="arsiv-hepsi" ${duz && kayitliPlan.length + (var_ ? 0 : 1) > 0 ? '' : 'disabled'} title="Tarayıcıdaki arşivlenmemiş tüm aylık planları arşive ekler">Kayıtlı tüm planları arşivle (${kayitliPlan.length})</button></div>
      ${var_ ? `<div class="ap-note" style="margin-top:8px">${ayEtiket()} son arşivleme: ${new Date(var_.zaman).toLocaleString('tr-TR')}</div>` : ''}</div>
      <div class="ap-card"><h2>Arşivlenen aylar (${aylar.length})</h2>${tabloHtml(['Ay', 'Arşivleme', 'İhtiyaç', 'Planlanan', 'Çıkan', 'Gelen', 'Fazla nöbet', 'Personel önerilen ist.', ''],
      aylar.map(a => { const r = S.arsivVeri[a], t = arsivToplam(r); return [ayAd(a), new Date(r.zaman).toLocaleDateString('tr-TR'), t.ihtiyac, t.planlanan, t.cikan, t.gelen, t.fazla, t.oner, S.rol === 'yonetici' ? `<button class="ap-btn sm dng" data-act="arsiv-sil" data-v="${a}">Sil</button>` : '']; }))}</div>` + yuklemeHtml;
  }

  // ---- istatistik: seçilen aylar ----
  function arsivIstatistik() {
    const sec = (S.arsivSecili || []).filter(a => S.arsivVeri[a]).sort(), f = S.arsivIst, ayN = sec.length;
    const recs = sec.map(a => S.arsivVeri[a]), adlar = new Set();
    recs.forEach(r => Object.keys(r.ist).forEach(a => adlar.add(a)));
    const ister = ad => !f || ad === f;
    const seyir = recs.map(r => { const t = arsivToplam(r); return [ayAd(r.ay), t.ihtiyac, t.planlanan, t.kapasite, t.cikan, t.gelen, t.fazla, t.oner]; });
    const ist = [...adlar].filter(ister).sort(trCollator.compare).map(ad => {
      const o = {ad, ay: 0, ihtiyac: 0, planlanan: 0, cikan: 0, gelen: 0, fazla: 0, fazlaKisi: 0, oner: 0, of: 0};
      recs.forEach(r => { const i = r.ist[ad]; if (!i) return; if (i.of) { o.of++; return; } o.ay++; o.ihtiyac += i.ihtiyac; o.planlanan += i.planlanan; o.cikan += i.cikan.length; o.gelen += i.gelen.length; o.fazla += i.fazlaMesai; o.fazlaKisi += i.fazla.length; if (i.ihtiyacTur === 'oner') o.oner++; });
      return [ad, o.ay, o.ihtiyac, o.planlanan, o.cikan, o.gelen, o.fazla, o.fazlaKisi, o.oner, o.of];
    });
    // çıkan personel: kişi başına kaç ay çıktı
    const cik = new Map(), gel = new Map(), faz = new Map(), mat = {};
    recs.forEach(r => Object.entries(r.ist).forEach(([ad, i]) => {
      i.cikan.forEach(x => { if (!ister(ad)) return; const a = `${x.ad}|${ad}`; const e = cik.get(a) || {ad: x.ad, brans: x.brans, kaynak: ad, hedefler: new Set(), aylar: []}; e.hedefler.add(x.hedef); e.aylar.push(r.ay); cik.set(a, e); });
      i.gelen.forEach(x => { if (!ister(ad)) return; const a = `${x.ad}|${ad}`; const e = gel.get(a) || {ad: x.ad, brans: x.brans, hedef: ad, kaynaklar: new Set(), aylar: []}; e.kaynaklar.add(x.kaynak); e.aylar.push(r.ay); gel.set(a, e); (mat[ad] = mat[ad] || {})[x.brans] = (mat[ad][x.brans] || 0) + 1; });
      i.fazla.forEach(x => { if (!ister(ad)) return; const a = `${x.ad}|${ad}`; const e = faz.get(a) || {ad: x.ad, brans: x.brans, ist: ad, aylar: [], toplam: 0}; e.aylar.push(r.ay); e.toplam += x.fazla; faz.set(a, e); });
    }));
    const kisaAy = a => a.slice(2).replace('-', '/');
    const cikSat = [...cik.values()].sort((a, b) => b.aylar.length - a.aylar.length || trCollator.compare(a.ad, b.ad)).map(e => [esc(e.ad), e.brans, esc(e.kaynak), esc([...e.hedefler].join(', ')), e.aylar.length, e.aylar.map(kisaAy).join(', ')]);
    const gelSat = [...gel.values()].sort((a, b) => trCollator.compare(a.hedef, b.hedef) || trCollator.compare(a.ad, b.ad)).map(e => [esc(e.ad), e.brans, esc([...e.kaynaklar].join(', ')), esc(e.hedef), e.aylar.length, e.aylar.map(kisaAy).join(', ')]);
    const fazSat = [...faz.values()].sort((a, b) => b.toplam - a.toplam || trCollator.compare(a.ad, b.ad)).map(e => [esc(e.ad), e.brans, esc(e.ist), e.aylar.length, e.toplam, e.aylar.map(kisaAy).join(', ')]);
    const matSat = Object.keys(mat).sort(trCollator.compare).map(ad => [esc(ad), ...BRANSLAR.map(b => mat[ad][b] || 0), BRANSLAR.reduce((x, b) => x + (mat[ad][b] || 0), 0)]);
    return {ayN, seyir, ist, cikSat, gelSat, fazSat, matSat, adlar: [...adlar].sort(trCollator.compare)};
  }
  function arstatHtml() {
    if (S.arsivVeri === null) { if (!S.arsivYuk) { S.arsivYuk = true; arsivYukle().then(() => { S.arsivYuk = false; render(); }); } return '<div class="ap-card">Arşiv yükleniyor…</div>'; }
    const aylar = Object.keys(S.arsivVeri).sort();
    if (!aylar.length) return '<div class="ap-card ap-empty"><h2>Arşivde ay yok</h2><p>Önce "Arşiv" sayfasından aylık planı arşive kaydedin.</p></div>';
    const st = arsivIstatistik();
    return `<div class="ap-card"><h2>İstatistik — dönem ve istasyon seçimi</h2>
      <div class="ap-row">${aylar.map(a => `<label class="ap-note"><input type="checkbox" data-act="arsiv-ay" data-v="${a}" ${(S.arsivSecili || []).includes(a) ? 'checked' : ''}> ${ayAd(a)}</label>`).join(' ')}
      <button class="ap-btn sm" data-act="arsiv-ay-hepsi">Tümü</button><button class="ap-btn sm" data-act="arsiv-ay-hic">Hiçbiri</button></div>
      <div class="ap-row" style="margin-top:8px"><label class="ap-note">İstasyon <select class="ap-sel" data-act="arsiv-ist"><option value="">Tüm istasyonlar</option>${st.adlar.map(a => `<option ${a === S.arsivIst ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select></label>
      <button class="ap-btn" data-act="arsiv-excel">Excel'e aktar</button><span class="ap-note">${st.ayN} ay seçili</span></div></div>
      <div class="ap-card"><h2>Aylara göre seyir (toplam)</h2>${tabloHtml(['Ay', 'İhtiyaç', 'Planlanan', 'Kapasite', 'Çıkan kişi', 'Gelen kişi', 'Fazla nöbet', 'Personel önerilen ist.'], st.seyir)}</div>
      <div class="ap-card"><h2>İstasyon özeti (seçilen aylar toplamı)</h2><p class="ap-note">Çıkan/gelen: kişi-ay (bir kişi 3 ay çıktıysa 3). Fazla nöbet: kişilerin hedeflerinin üstünde yazılan nöbetlerin toplamı.</p>${tabloHtml(['İstasyon', 'Açık ay', 'İhtiyaç', 'Planlanan', 'Çıkan', 'Gelen', 'Fazla nöbet', 'Fazla nöbetli kişi-ay', 'Personel önerilen ay', 'Ekip OF ay'], st.ist)}</div>
      <div class="ap-card"><h2>Çıkan personel — kaç ay çıktı</h2>${tabloHtml(['Ad soyad', 'Branş', 'Çıktığı istasyon', 'Gittiği yer', 'Ay sayısı', 'Aylar'], st.cikSat)}</div>
      <div class="ap-card"><h2>Hangi istasyona hangi branştan personel geldi</h2>${tabloHtml(['İstasyon', ...BRANSLAR, 'Toplam'], st.matSat)}
        <h2 style="margin-top:14px">Gelen personel listesi</h2>${tabloHtml(['Ad soyad', 'Branş', 'Geldiği istasyon', 'Gittiği (gelen) istasyon', 'Ay sayısı', 'Aylar'], st.gelSat)}</div>
      <div class="ap-card"><h2>Fazla nöbet alan kişiler</h2>${tabloHtml(['Ad soyad', 'Branş', 'İstasyon', 'Ay sayısı', 'Toplam fazla nöbet', 'Aylar'], st.fazSat)}</div>`;
  }
  function arsivExcel() {
    const st = arsivIstatistik(), wb = XLSX.utils.book_new(), temiz = r => r.map(c => typeof c === 'string' ? c.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"') : c);
    const ekle = (ad, bas, sat) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([bas, ...sat.map(temiz)]), ad);
    ekle('Seyir', ['Ay', 'İhtiyaç', 'Planlanan', 'Kapasite', 'Çıkan', 'Gelen', 'Fazla nöbet', 'Personel önerilen ist.'], st.seyir);
    ekle('İstasyon özeti', ['İstasyon', 'Açık ay', 'İhtiyaç', 'Planlanan', 'Çıkan', 'Gelen', 'Fazla nöbet', 'Fazla nöbetli kişi-ay', 'Personel önerilen ay', 'Ekip OF ay'], st.ist);
    ekle('Çıkan personel', ['Ad soyad', 'Branş', 'Çıktığı istasyon', 'Gittiği yer', 'Ay sayısı', 'Aylar'], st.cikSat);
    ekle('Gelen branş', ['İstasyon', ...BRANSLAR, 'Toplam'], st.matSat);
    ekle('Gelen personel', ['Ad soyad', 'Branş', 'Geldiği istasyon', 'İstasyon', 'Ay sayısı', 'Aylar'], st.gelSat);
    ekle('Fazla nöbet', ['Ad soyad', 'Branş', 'İstasyon', 'Ay sayısı', 'Toplam fazla nöbet', 'Aylar'], st.fazSat);
    xlsxIndir(wb, `ASHI-Arsiv-Istatistik-${(S.arsivSecili || []).slice().sort()[0] || ''}_${(S.arsivSecili || []).slice().sort().pop() || ''}.xlsx`);
  }
