
  // ================= MODÜL 1 — ARŞİV VE ARŞİV İSTATİSTİKLERİ =================
  const bransAd = k => k.sinif === 'doktor' ? 'Doktor' : k.sinif === 'isci' ? 'İşçi' : C.kadroTip(k);
  const BRANSLAR = ['Doktor', 'AABT', 'ATT', 'İşçi'];
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
    return {ay: `${y}-${C.pad(m)}`, zaman: Date.now(), hesapImza: hesapImza(), ist};
  }
  // Hesap imzası: hesaplama sürümü + sonucu etkileyen ayarlar. Değişirse arşivdeki aylar yeni yönteme göre arka planda yeniden hesaplanır.
  const hesapImza = () => JSON.stringify([HESAP_SURUM, S.ayar.isciDusulen, S.ayar.azamiMemur, S.ayar.panoMod, S.ayar.surEsik, S.ayar.surDegilEsik, Object.entries(S.ayar.durumlar).map(([k, v]) => [k, !!v.nobetYok, !!v.mesaiYok, !!v.disarida, !!v.pasif])]);
  // Arşivlenmiş bir ayın planını (kopya üzerinde) güncel yöntemle yeniden hesaplar; kayıtlı plana dokunulmaz
  function planiYenidenHesapla(plan, y, m) {
    const kopya = JSON.parse(JSON.stringify(plan)), yedek = {plan: S.plan, y: S.y, m: S.m, toplu: S.toplu};
    try { S.plan = kopya; S.y = y; S.m = m; S.toplu = true; kopya.birimler.filter(b => b.tur === 'istasyon').forEach(b => oner(b.ad)); return ayMetrik(kopya, y, m); }
    finally { S.plan = yedek.plan; S.y = yedek.y; S.m = yedek.m; S.toplu = yedek.toplu; }
  }
  // Arka plan: imzası eski olan arşiv aylarını sırayla (arayüzü kilitlemeden) yeniler
  async function arsivArkaPlan() {
    if (!S.ayar) return;
    if (S.arsivCalisiyor) { S.arsivTekrar = true; return; }
    S.arsivCalisiyor = true;
    try {
      const v = S.arsivVeri || await arsivYukle(), imza = hesapImza(); let n = 0, yok = 0;
      for (const ay of Object.keys(v).sort()) {
        const rec = v[ay]; if (rec.hesapImza === imza) continue;
        const [y, m] = ay.split('-').map(Number);
        const plan = (S.plan && `${S.y}-${C.pad(S.m)}` === ay) ? S.plan : await depo.get(anahtar(y, m));
        if (!plan) { yok++; continue; }
        await new Promise(r => setTimeout(r, 30));
        const yeni = planiYenidenHesapla(plan, y, m); yeni.zaman = rec.zaman; yeni.yenilendi = Date.now();
        await arsivYaz(yeni); n++;
      }
      if (n) { toast(`${n} arşiv ayı güncel hesaplama yöntemine göre yeniden hesaplandı.`); render(); }
      S.arsivPlanYok = yok;
    } catch (er) { console.error(er); }
    finally { S.arsivCalisiyor = false; if (S.arsivTekrar) { S.arsivTekrar = false; setTimeout(() => arsivArkaPlan(), 300); } }
  }
  // Yüklenen dosya günlüğü (Arşiv sayfasında gösterilir): hangi dosya, hangi tür, kaç satır, hangi aya uygulandı
  const DOSYA_TUR = {A: 'EKİP Personel Listesi', B: 'Personel Listesi Raporu', I: 'Personel İzin-Muafiyet Raporu', N: 'Nöbet Listesi / Hareket Raporu'};
  async function yuklemeKaydet(dosyalar) {
    const l = (await depo.get('yuklemeler')) || [], t = Date.now();
    dosyalar.forEach(d => {
      const r = d.rapor, ozet = d.tur === 'I' ? `${r.kisi} kişi, ${r.eslesen} eşleşti · ${r.izinli} izinli, ${r.muafiyet} muafiyet` : d.tur === 'N' ? `${r.kisi} kişi, ${r.eslesen} eşleşti · aylar: ${(r.aylar || []).join(', ')}` : `${r.yeni.length} yeni, ${r.degisen} güncel${r.nakil && r.nakil.length ? ', ' + r.nakil.length + ' birim değişikliği' : ''}`;
      const kayit = {t, ad: d.ad, tur: d.tur, satir: r.toplam, boyut: d.boyut || 0, ay: ayAnahtari(), aylar: d.tur === 'N' ? (r.aylar || []).join(',') : '', rol: S.rol, ozet, guncel: 0};
      const anahtar = x => `${x.tur}|${x.ay}|${x.tur === 'N' ? (x.aylar || '') : ''}`, i = l.findIndex(x => anahtar(x) === anahtar(kayit));
      if (i >= 0) { kayit.guncel = (l[i].guncel || 0) + 1; l.splice(i, 1); }          // aynı tür ve ay için yeni yükleme eskisinin yerine geçer (yeni satır eklenmez)
      l.unshift(kayit);
    });
    if (l.length > 500) l.length = 500;
    await depo.put('yuklemeler', l); S.yuklemeler = l;
  }
  async function arsivYukle() {
    S.yuklemeler = (await depo.get('yuklemeler')) || [];
    const anahtarlar = ((await depo.keys()) || []).filter(k => String(k).startsWith('arsiv:')).sort(), v = {};
    for (const k of anahtarlar) { const r = await depo.get(k); if (r && r.ay) v[r.ay] = r; }
    const gk = ((await depo.keys()) || []).filter(k => String(k).startsWith('gercek:')).sort(), g = {};
    for (const k of gk) { const r = await depo.get(k); if (r && r.ay) g[r.ay] = r; }
    S.gercekVeri = g; S.arsivVeri = v; S.arsivSecili = S.arsivSecili || []; S.arsivBilinen = S.arsivBilinen || new Set();
    [...new Set([...Object.keys(v), ...Object.keys(g)])].sort().forEach(a => { if (!S.arsivBilinen.has(a)) { S.arsivBilinen.add(a); S.arsivSecili.push(a); } });      // yeni gelen aylar otomatik seçilir
    return v;
  }
  async function arsivYaz(rec) { await depo.put(arsivAnahtar(rec.ay), rec); (S.arsivVeri = S.arsivVeri || {})[rec.ay] = rec; if (S.arsivSecili && !S.arsivSecili.includes(rec.ay)) S.arsivSecili.push(rec.ay); }
  function arsivToplam(rec) {
    const o = {ihtiyac: 0, planlanan: 0, kapasite: 0, cikan: 0, gelen: 0, fazla: 0, oner: 0, of: 0};
    Object.values(rec.ist).forEach(i => { if (i.of) { o.of++; return; } o.ihtiyac += i.ihtiyac; o.planlanan += i.planlanan; o.kapasite += i.kapasite; o.cikan += i.cikan.length; o.gelen += i.gelen.length; o.fazla += i.fazlaMesai; if (i.ihtiyacTur === 'oner') o.oner++; });
    return o;
  }
  const tabloHtml = (bas, sat, ek) => `<div class="ap-tw"><table class="ap-t ${ek || ''}"><thead><tr>${bas.map((b, i) => `<th${sat.length && typeof sat[0][i] === 'number' ? ' class="num"' : ''}>${b}</th>`).join('')}</tr></thead><tbody>${sat.map(r => `<tr>${r.map((c, i) => `<td${typeof c === 'number' ? ' class="num"' : ''}>${typeof c === 'number' ? fmt(c) : c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${bas.length}" class="ap-empty">Kayıt yok</td></tr>`}</tbody></table></div>`;

  // Her ay yüklenecek dosyalar: en az sayıda ASOS dosyası (3 dosya) ve bu ay için durumu
  function dosyaDurumHtml() {
    const ay = ayAnahtari(), yl = (S.yuklemeler || []).filter(x => x.ay === ay), var_ = t => yl.some(x => x.tur === t);
    const durum = ok => ok ? '<span class="ap-tag ap-t-ok">yüklendi</span>' : '<span class="ap-tag ap-t-ih">bekleniyor</span>';
    const nobetAy = (S.plan && S.plan.nobetAylari) || [];
    const sat = [
      ['1', '<b>EKİP — Başhekimlik / Komuta / İstasyon Personel Listesi</b>', 'Kim hangi istasyonda çalışıyor, çalışma durumu, yıllık izin bakiyesi. Doktorlar dahil tüm ekibi içerir: yalnız Personel Listesi Raporu ile ~58 kişi (çoğu doktor) eksik kalır.', var_('A')],
      ['2', '<b>Personel Listesi Raporu</b>', 'İzin, rapor, muafiyet, süt izni, geçici görev yeri ve tarihleri, atama başlangıç tarihi (4/B 4 yıl kuralı). İzin-Muafiyet Raporu aynı bilgiyi içerir; ayrıca yüklemeye gerek yok.', var_('B') || var_('I')],
      ['3', '<b>Nöbet Listesi Raporu</b> (ya da Nöbet İçi Hareket Raporu)', `Kişinin ekip şefi / YSP / sürücü olarak tuttuğu nöbetler: sürücülük doğrulaması ve gerçekleşen nöbetler. İkisi aynı bilgiyi verir, <b>birini yüklemeniz yeterli</b>. Son 6 ay birlikte değerlendirilir; yüklü nöbet ayları: ${nobetAy.length ? nobetAy.map(a => ayAd(a)).join(', ') : 'yok'}.`, var_('N') || nobetAy.length > 0]];
    return `<div class="ap-card"><h2>Her ay yüklenecek dosyalar — ${ayEtiket()}</h2><p class="ap-note">Sistem yalnızca <b>3 ASOS dosyasıyla</b> çalışır. Her ay planlama öncesi bu üçünü yenilemeniz yeterlidir; arşiv ve istatistikler bunlardan ve planlamadan otomatik üretilir.</p>
      ${tabloHtml(['#', 'Dosya', 'Ne için gerekli', 'Bu ay'], sat.map(r => [r[0], r[1], `<span class="ap-note">${r[2]}</span>`, durum(r[3])]))}
      <details style="margin-top:8px"><summary class="ap-note">Yüklemeniz gerekmeyen dosyalar</summary><ul class="ap-note" style="line-height:1.7"><li><b>Personel İzin-Muafiyet Raporu:</b> Personel Listesi Raporu ile aynı izin/muafiyet bilgisini verir. Yalnızca bir kişinin aynı ay içinde birden çok izni olduğunda ek ayrıntı sağlar (isteğe bağlı).</li><li><b>Nöbet İçi Hareket Raporu:</b> Nöbet Listesi Raporu ile aynı bilgiyi içerir; ikisini birden yüklemek gerekmez.</li><li><b>Nöbet Listesi Döküm Cetveli:</b> Gün gün saat bilgisi verir ama ekip şefi / YSP / sürücü bilgisini içermez; şu an kullanılmıyor (ileride fazla mesai bakiyesi için değerlendirilebilir).</li></ul></details></div>`;
  }
  // Aylara göre arşiv: yıl yıl açılır liste; geçmiş aylar salt okunur olarak açılır
  function arsivAyListeHtml() {
    const kume = new Set([...(S.planAnahtarlari || []).map(k => String(k).slice(5)), ...Object.keys(S.arsivVeri || {}), ...Object.keys(S.gercekVeri || {}), ...(S.yuklemeler || []).map(x => x.ay), `${GUNCEL_Y}-${C.pad(GUNCEL_M)}`].filter(a => /^\d{4}-\d{2}$/.test(a)));
    const yillar = [...new Set([...kume].map(a => +a.slice(0, 4)))].sort((a, b) => b - a), simdi = ayAnahtari(), guncel = `${GUNCEL_Y}-${C.pad(GUNCEL_M)}`;
    const planVar = a => (S.planAnahtarlari || []).includes('plan:' + a), say = a => (S.yuklemeler || []).filter(x => x.ay === a).length;
    const yil = y => {
      const aylar = [...kume].filter(a => +a.slice(0, 4) === y).sort().reverse(), ac = S.arsivYilAc && S.arsivYilAc[y] != null ? S.arsivYilAc[y] : y === GUNCEL_Y;
      return `<div class="ap-yil"><div class="ap-yilbas"><button class="ap-yilbtn" data-act="arsiv-yil" data-v="${y}"><span>${ac ? '▼' : '▶'}</span> <b>${y}</b> <span class="ap-note">${aylar.length} ay</span></button></div>
        ${ac ? tabloHtml(['Ay', 'Plan', 'Arşiv kaydı', 'Gerçekleşen nöbet', 'Yüklenen dosya', ''], aylar.map(a => [ayAd(a) + (a === guncel ? ' <span class="ap-tag ap-t-ok">güncel</span>' : '') + (a === simdi ? ' <span class="ap-tag ap-t-ih">açık</span>' : ''), planVar(a) ? '✓' : '—', S.arsivVeri && S.arsivVeri[a] ? new Date(S.arsivVeri[a].zaman).toLocaleDateString('tr-TR') : '—', S.gercekVeri && S.gercekVeri[a] ? '✓' : '—', say(a) || '—', a === simdi ? '' : `<button class="ap-btn sm" data-act="arsiv-ac" data-v="${a}">${a >= `${BUGUN.getFullYear()}-${C.pad(BUGUN.getMonth() + 1)}` ? 'Aç' : 'Aç (salt okunur)'}</button>` + ((S.arsivVeri && S.arsivVeri[a]) || (S.gercekVeri && S.gercekVeri[a]) ? (planlamaRol() ? ` <button class="ap-btn sm dng" data-act="arsiv-ay-sil" data-v="${a}" title="Bu ayın arşiv kaydını ve gerçekleşen nöbet verisini siler (plan silinmez)">Arşivi sil</button>` : '') : '')])) : ''}</div>`;
    };
    return `<div class="ap-card"><h2>Aylara göre arşiv</h2><p class="ap-note">Geçmiş bir ayı açarak o ayın planını, personelini ve istatistiklerini görebilirsiniz. <b>Bu ay (${AYLAR[BUGUN.getMonth() + 1]}) ve sonraki aylar düzenlenebilir; daha önceki aylar salt okunurdur</b>: değiştirilemez, dosya yüklenemez.</p>${yillar.map(yil).join('') || '<span class="ap-note">Kayıt yok</span>'}</div>`;
  }
  function arsivHtml() {
    if (S.arsivVeri === null) { if (!S.arsivYuk) { S.arsivYuk = true; arsivYukle().then(() => { S.arsivYuk = false; render(); }); } return '<div class="ap-card">Arşiv yükleniyor…</div>'; }
    const aylar = Object.keys(S.arsivVeri).sort().reverse(), ay = ayAnahtari(), var_ = S.arsivVeri[ay], duz = S.rol !== 'salt_okur' && guncelAy();
    const kayitliPlan = S.planAnahtarlari.map(k => k.slice(5)).filter(a => !S.arsivVeri[a]);
    const yl = S.yuklemeler || [], kb = b => b ? (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB') : '';
    const yuklemeHtml = `<div class="ap-card"><h2>Yüklenen dosyalar (${yl.length})</h2><p class="ap-note">ASOS'tan yüklenen her dosya, uygulandığı anda burada listelenir: ne zaman, hangi türde, kaç satır ve hangi plan ayına uygulandı. Dosyanın kendisi saklanmaz, yalnızca bu günlük tutulur.</p><div class="ap-drop"><div class="ap-row" style="justify-content:center"><button class="ap-btn pri" data-act="plan-asos" ${salt() ? 'disabled' : ''}>Excel dosyası yükle (.xls / .xlsx)</button></div><div class="ap-note" style="text-align:center;margin-top:6px">ya da dosyaları bu alana sürükleyip bırakın · EKİP listesi, Personel Listesi Raporu, Nöbet Listesi, Nöbet İçi Hareket Raporu (birlikte seçilebilir)</div></div>${tabloHtml(['Tarih', 'Dosya', 'Tür', 'Satır', 'Boyut', 'Plan ayı', 'Sonuç', ''], yl.slice(0, 100).map((x, xi) => [new Date(x.t).toLocaleString('tr-TR'), esc(x.ad), DOSYA_TUR[x.tur] || x.tur, x.satir, kb(x.boyut), ayAd(x.ay), esc(x.ozet) + (x.guncel ? ` <span class="ap-note">(${x.guncel + 1}. yükleme, güncellendi)</span>` : ''), S.rol === 'salt_okur' ? '' : `<button class="ap-btn sm dng" data-act="yukleme-sil" data-v="${xi}" title="Bu yükleme kaydını sil">Sil</button>`]))}${yl.length > 100 ? '<div class="ap-note">Son 100 kayıt gösteriliyor.</div>' : ''}</div>`;
    const asek = [['dosya', 'Yüklenen dosyalar'], ['ay', 'Aylara göre arşiv'], ['kayit', 'Aylık arşiv']], aa = asek.some(x => x[0] === S.arsivSekme) ? S.arsivSekme : 'dosya';
    const nav = `<div class="ap-subnav ap-noprint">${asek.map(([v, t]) => `<button class="${aa === v ? 'on' : ''}" data-act="arsiv-sekme" data-v="${v}">${t}</button>`).join('')}</div>`;
    const kayit = `<div class="ap-card"><h2>Aylık arşiv</h2>
      <p class="ap-note">Arşiv, her ayın istasyon bazlı özetini saklar: ihtiyaç, planlanan, kapasite, <b>çıkan ve gelen personel (branş ve istasyon)</b>, <b>fazla nöbet</b> alan kişiler. TC, telefon ve sağlık bilgisi arşive yazılmaz. Arşiv aynı tarayıcı veritabanında tutulur; yedeği Ayarlar'dan alınır.</p>
      <div class="ap-row"><button class="ap-btn pri" data-act="arsiv-yaz" ${duz ? '' : 'disabled'}>${ayEtiket()} ayını arşive kaydet${var_ ? ' (güncelle)' : ''}</button>
      <label class="ap-note"><input type="checkbox" id="ap-arsiv-kilit" ${S.rol === 'yonetici' ? '' : 'disabled'}> Kaydederken ayı kilitle (yalnız yönetici)</label>
      <button class="ap-btn" data-act="arsiv-hepsi" ${duz && kayitliPlan.length + (var_ ? 0 : 1) > 0 ? '' : 'disabled'} title="Tarayıcıdaki arşivlenmemiş tüm aylık planları arşive ekler">Kayıtlı tüm planları arşivle (${kayitliPlan.length})</button></div>
      ${var_ ? `<div class="ap-note" style="margin-top:8px">${ayEtiket()} son arşivleme: ${new Date(var_.zaman).toLocaleString('tr-TR')}</div>` : ''}</div>
      <div class="ap-card"><h2>Arşivlenen aylar (${aylar.length})</h2>${tabloHtml(['Ay', 'Arşivleme', 'İhtiyaç', 'Planlanan', 'Çıkan', 'Gelen', 'Fazla nöbet', 'Personel önerilen ist.', 'Hesap', ''],
      aylar.map(a => { const r = S.arsivVeri[a], t = arsivToplam(r); return [ayAd(a), new Date(r.zaman).toLocaleDateString('tr-TR'), t.ihtiyac, t.planlanan, t.cikan, t.gelen, t.fazla, t.oner, r.hesapImza === hesapImza() ? (r.yenilendi ? `<span class="ap-note" title="Güncel yönteme göre yeniden hesaplandı">güncellendi ${new Date(r.yenilendi).toLocaleDateString('tr-TR')}</span>` : 'güncel') : '<span class="ap-note" style="color:var(--ap-warn)" title="Bu ayın planı bu tarayıcıda yoksa eski yöntemle kalır">eski hesap</span>', planlamaRol() ? `<button class="ap-btn sm dng" data-act="arsiv-sil" data-v="${a}">Sil</button>` : '']; }))}</div>`;
    return nav + (aa === 'dosya' ? dosyaDurumHtml() + yuklemeHtml : aa === 'ay' ? arsivAyListeHtml() : kayit);
  }

  // ---- istatistik: seçilen aylar ----
  // "Ay sayısı" sütunu: sayıya tıklayınca hangi aylar olduğu satır altında açılır (ayrı "Aylar" sütunu yok)
  const ayHucre = (key, n, aylar) => `<button class="ap-ayno" data-pop data-act="arstat-aylar" data-v="${key}" title="Hangi aylar?">${n}</button>${S.arstatAc === 'ayno' && S.arstatAyAc === key ? `<div class="ap-ayliste" data-pop>${aylar}</div>` : ''}`;
  const ayDuz = (rows, ci, pre) => rows.map((r, i) => { const x = r.slice(0, -1); x[ci] = ayHucre(pre + i, x[ci], r[r.length - 1]); return x; });
  function arsivIstatistik() {
    const sec = (S.arsivSecili || []).filter(a => S.arsivVeri[a]).sort(), ayN = sec.length;
    const recs = sec.map(a => S.arsivVeri[a]), adlar = new Set();
    recs.forEach(r => Object.keys(r.ist).forEach(a => adlar.add(a)));
    const ister = ad => !(S.arsivIstler || []).length || S.arsivIstler.includes(ad);
    const seyir = recs.map(r => { const t = arsivToplam(r); return [ayAd(r.ay), t.ihtiyac, t.planlanan, t.kapasite, t.cikan, t.gelen, t.fazla, t.oner]; });
    const ist = [...adlar].filter(ister).sort(trCollator.compare).map(ad => {
      const o = {ad, ay: 0, ihtiyac: 0, planlanan: 0, cikan: 0, gelen: 0, fazla: 0, fazlaKisi: 0, oner: 0, of: 0};
      recs.forEach(r => { const i = r.ist[ad]; if (!i) return; if (i.of) { o.of++; return; } o.ay++; o.ihtiyac += i.ihtiyac; o.planlanan += i.planlanan; o.cikan += i.cikan.length; o.gelen += i.gelen.length; o.fazla += i.fazlaMesai; o.fazlaKisi += i.fazla.length; if (i.ihtiyacTur === 'oner') o.oner++; });
      return [ad, o.ay, o.ihtiyac, o.planlanan, o.cikan, o.gelen, o.fazla, o.oner, o.of];
    });
    // çıkan personel: kişi başına kaç ay çıktı
    const cik = new Map(), gel = new Map(), faz = new Map(), mat = {};
    recs.forEach(r => Object.entries(r.ist).forEach(([ad, i]) => {
      i.cikan.forEach(x => { if (!ister(ad)) return; const a = `${x.ad}|${ad}`; const e = cik.get(a) || {ad: x.ad, brans: x.brans, kaynak: ad, hedefler: new Set(), aylar: []}; e.hedefler.add(x.hedef); e.aylar.push(r.ay); cik.set(a, e); });
      i.gelen.forEach(x => { if (!ister(ad)) return; const a = `${x.ad}|${ad}`; const e = gel.get(a) || {ad: x.ad, brans: x.brans, hedef: ad, kaynaklar: new Set(), aylar: []}; e.kaynaklar.add(x.kaynak); e.aylar.push(r.ay); gel.set(a, e); (mat[ad] = mat[ad] || {})[x.brans] = (mat[ad][x.brans] || 0) + 1; });
      i.fazla.forEach(x => { if (!ister(ad)) return; const a = `${x.ad}|${ad}`; const e = faz.get(a) || {ad: x.ad, brans: x.brans, ist: ad, aylar: [], toplam: 0}; e.aylar.push(r.ay); e.toplam += x.fazla; faz.set(a, e); });
    }));
    const kisaAy = a => `${AYLAR[+a.slice(5)]} / ${a.slice(2, 4)}`;
    const cikSat = [...cik.values()].sort((a, b) => b.aylar.length - a.aylar.length || trCollator.compare(a.ad, b.ad)).map(e => [esc(e.ad), e.brans, esc(e.kaynak), esc([...e.hedefler].join(', ')), e.aylar.length, e.aylar.map(kisaAy).join(', ')]);
    const gelSat = [...gel.values()].sort((a, b) => trCollator.compare(a.hedef, b.hedef) || trCollator.compare(a.ad, b.ad)).map(e => [esc(e.ad), e.brans, esc([...e.kaynaklar].join(', ')), esc(e.hedef), e.aylar.length, e.aylar.map(kisaAy).join(', ')]);
    const fazSat = [...faz.values()].sort((a, b) => b.toplam - a.toplam || trCollator.compare(a.ad, b.ad)).map(e => [esc(e.ad), e.brans, esc(e.ist), e.aylar.length, e.toplam, e.aylar.map(kisaAy).join(', ')]);
    const matSat = Object.keys(mat).sort(trCollator.compare).map(ad => [esc(ad), ...BRANSLAR.map(b => mat[ad][b] || 0), BRANSLAR.reduce((x, b) => x + (mat[ad][b] || 0), 0)]);
    return {ayN, seyir, ist, cikSat, gelSat, fazSat, matSat, adlar: [...adlar].sort(trCollator.compare)};
  }
  // Gerçekleşen nöbetler (Nöbet Listesi Raporundan): planlananla karşılaştırma, fazla nöbet, kadrosu dışında tutulan nöbet
  function gercekIstatistik() {
    const g = S.gercekVeri || {}, sec = (S.arsivSecili || []).filter(a => g[a]).sort(), ister = ad => !(S.arsivIstler || []).length || S.arsivIstler.includes(ad);
    const ist = new Map(), faz = new Map(), dis = new Map(), mat = {};
    sec.forEach(a => {
      const rec = g[a], pl = S.arsivVeri && S.arsivVeri[a];
      Object.entries(rec.ist).forEach(([ad, o]) => { if (!ister(ad)) return; const e = ist.get(ad) || {ad, plan: 0, planVar: 0, gercek: 0, kisi: 0, ay: 0}; e.gercek += o.nobet; e.kisi += o.kisi; e.ay++; if (pl && pl.ist[ad]) { e.plan += pl.ist[ad].planlanan; e.planVar++; } ist.set(ad, e); });
      rec.kisi.forEach(k => { if (k.fazla <= 0.01 || !ister(k.kadro)) return; const key = k.ad + '|' + k.kadro, e = faz.get(key) || {ad: k.ad, brans: k.brans, ist: k.kadro, aylar: [], toplam: 0}; e.aylar.push(a); e.toplam += k.fazla; faz.set(key, e); });
      rec.dis.forEach(x => { if (!ister(x.istasyon)) return; const key = x.ad + '|' + x.istasyon, e = dis.get(key) || {ad: x.ad, brans: x.brans, kadro: x.kadro, ist: x.istasyon, aylar: [], nobet: 0}; e.aylar.push(a); e.nobet += x.nobet; dis.set(key, e); (mat[x.istasyon] = mat[x.istasyon] || {})[x.brans] = (mat[x.istasyon][x.brans] || 0) + 1; });
    });
    const kisa = a => `${AYLAR[+a.slice(5)]} / ${a.slice(2, 4)}`, r2 = v => Math.round(v * 100) / 100;
    return {sec,
      ist: [...ist.values()].sort((a, b) => trCollator.compare(a.ad, b.ad)).map(e => [esc(e.ad), e.ay, e.planVar ? r2(e.plan) : '—', r2(e.gercek), e.planVar ? r2(e.gercek - e.plan) : '—', e.kisi]),
      faz: [...faz.values()].sort((a, b) => b.toplam - a.toplam || trCollator.compare(a.ad, b.ad)).map(e => [esc(e.ad), esc(e.brans), esc(e.ist), e.aylar.length, r2(e.toplam), e.aylar.map(kisa).join(', ')]),
      dis: [...dis.values()].sort((a, b) => trCollator.compare(a.ist, b.ist) || trCollator.compare(a.ad, b.ad)).map(e => [esc(e.ad), esc(e.brans), esc(e.kadro), esc(e.ist), r2(e.nobet), e.aylar.map(kisa).join(', ')]),
      mat: Object.keys(mat).sort(trCollator.compare).map(ad => [esc(ad), ...BRANSLAR.map(b => mat[ad][b] || 0), BRANSLAR.reduce((x, b) => x + (mat[ad][b] || 0), 0)])};
  }
  function gercekKartlar() {
    const G = gercekIstatistik(); if (!G.sec.length) return null;
    const k = {};
    k.gist = `<div class="ap-card"><h2>Gerçekleşen nöbet — planlananla karşılaştırma</h2><p class="ap-note">Nöbet Listesi Raporundan: istasyonda fiilen tutulan nöbet (24 saatlik; idari/mesai kayıtları hariç). Fark = gerçekleşen − planlanan (planı arşivlenmiş aylar için). Seçilen aylar: ${G.sec.map(ayAd).join(', ')}.</p>${tabloHtml(['İstasyon', 'Ay', 'Planlanan', 'Gerçekleşen nöbet', 'Fark', 'Nöbet tutan kişi-ay'], G.ist)}</div>`;
    k.gfaz = `<div class="ap-card"><h2>Gerçekleşen fazla nöbet</h2><p class="ap-note">Kişinin o ay tuttuğu nöbet, standart aylık hedefinin (izin ve muafiyet düşülmeden) üstündeyse fazla sayılır. Kadro istasyonu başlığı altında toplanır.</p>${tabloHtml(['Ad soyad', 'Branş', 'Kadro istasyonu', 'Toplam fazla nöbet', 'Ay sayısı'], ayDuz(G.faz.map(r => [r[0], r[1], r[2], r[4], r[3], r[5]]), 4, 'gf'), 'dar')}</div>`;
    k.gdism = `<div class="ap-card"><h2>Kadrosu dışındaki istasyonlarda tutulan nöbetler</h2><p class="ap-note">Hangi istasyona hangi branştan kişi gelip nöbet tuttu (kişi-ay).</p>${tabloHtml(['İstasyon', ...BRANSLAR, 'Toplam'], G.mat)}</div>`;
    k.gdis = `<div class="ap-card"><h2>Kadrosu dışındaki istasyonlarda tutulan nöbetler — liste</h2>${tabloHtml(['Ad soyad', 'Branş', 'Kadro istasyonu', 'Nöbet tuttuğu istasyon', 'Nöbet'], G.dis.map(r => r.slice(0, -1)), 'dar')}</div>`;
    return k;
  }
  // ---- seçim pencereleri: aylar (yıl yıl) ve istasyonlar (ilçe bazlı toplu seçim); boşluğa tıklayınca kapanır ----
  const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const ilceGoster = ad => { const t = ad.replace(/\s+\d+.*$/, '').trim().toLocaleLowerCase('tr-TR'); return t.charAt(0).toLocaleUpperCase('tr-TR') + t.slice(1); };
  function istAdlari() {
    const k = new Set(); (S.plan ? S.plan.birimler : []).forEach(b => { if (b.tur === 'istasyon') k.add(b.ad); });
    Object.values(S.arsivVeri || {}).forEach(r => Object.keys(r.ist).forEach(a => k.add(a)));
    return [...k].sort(trCollator.compare);
  }
  function aySecimHtml(aylar) {
    const sec = [...new Set(S.arsivSecili || [])].filter(a => aylar.includes(a)), yillar = [...new Set([...aylar.map(a => +a.slice(0, 4)), ...(S.plan ? [S.y] : [])])].sort((a, b) => b - a);
    const etiket = !sec.length ? 'Ay seçilmedi' : sec.length === 1 ? ayAd(sec[0]) : `${sec.length} ay seçili`, acik = S.arstatAc === 'ay';
    const yilHtml = y => {
      const var_ = aylar.filter(a => +a.slice(0, 4) === y), ac = S.arstatYil[y] != null ? S.arstatYil[y] : y === yillar[0];
      return `<div class="ap-yil"><div class="ap-yilbas"><button class="ap-yilbtn" data-pop data-act="arstat-yil" data-v="${y}"><span>${ac ? '▼' : '▶'}</span> <b>${y}</b> <span class="ap-note">${var_.length} ay</span></button><button class="ap-btn sm" data-pop data-act="arstat-yil-hepsi" data-v="${y}" ${var_.length ? '' : 'disabled'}>Tüm yıl</button></div>
        ${ac ? `<div class="ap-aygrid">${AY_KISA.map((ad, i) => { const key = `${y}-${C.pad(i + 1)}`, mv = aylar.includes(key), sc = sec.includes(key); return `<button class="ap-aybtn ${sc ? 'sec' : mv ? 'mv' : ''}" data-pop data-act="arsiv-ay" data-v="${key}" ${mv ? '' : 'disabled'}>${ad}</button>`; }).join('')}</div>` : ''}</div>`;
    };
    return `<div class="ap-popwrap"><button class="ap-btn" data-pop data-act="arstat-pop" data-v="ay">Aylar: ${etiket} ▾</button>${acik ? `<div class="ap-pop" data-pop><div class="ap-row" style="justify-content:space-between"><b class="ap-poph">ARŞİVDEN AY EKLE</b><span class="ap-note">${sec.length} ay seçili</span></div>${yillar.map(yilHtml).join('')}
      <div class="ap-popalt"><span class="ap-note"><i class="ap-lg sec"></i> seçili &nbsp; <i class="ap-lg mv"></i> mevcut ay &nbsp; Yıla tıkla → ayları aç</span><button class="ap-btn sm" data-pop data-act="arstat-pop" data-v="">Kapat ✕</button></div></div>` : ''}</div>`;
  }
  function istSecimHtml() {
    const tum = istAdlari(), sec = S.arsivIstler || [], q = C.TR(S.arstatAra || '').trim(), acik = S.arstatAc === 'ist';
    const gruplar = new Map(); tum.forEach(a => { const k = C.ilceAdi(a), g = gruplar.get(k) || {ad: ilceGoster(a), list: []}; g.list.push(a); gruplar.set(k, g); });
    const gizle = (...m) => q && !m.some(x => C.TR(x).includes(q));
    const etiket = !sec.length || sec.length === tum.length ? 'Tüm istasyonlar' : sec.length === 1 ? sec[0] : `${sec.length} istasyon seçili`;
    return `<div class="ap-popwrap"><button class="ap-btn" data-pop data-act="arstat-pop" data-v="ist">İstasyon: ${esc(etiket)} ▾</button>${acik ? `<div class="ap-pop ap-pop-ist" data-pop>
      <div class="ap-row"><button class="ap-btn sm" data-pop data-act="arstat-ist-tumu">Tümü</button><button class="ap-btn sm" data-pop data-act="arstat-ist-temizle">Temizle</button><span class="ap-note">${sec.length ? sec.length + ' seçili' : 'seçim yok = tüm istasyonlar'}</span></div>
      <input class="ap-in w" id="ap-ist-ara" data-pop placeholder="İlçe veya istasyon ara…" value="${esc(S.arstatAra || '')}" autocomplete="off">
      <div class="ap-chips">${[...gruplar.entries()].map(([k, g]) => { const n = g.list.filter(a => sec.includes(a)).length; return `<button class="ap-chip ${n === g.list.length ? 'sec' : n ? 'kis' : ''}" data-pop data-act="arstat-ilce" data-v="${esc(k)}" data-ara="${esc(C.TR(g.ad + ' ' + g.list.join(' ')))}" ${gizle(g.ad, ...g.list) ? 'style="display:none"' : ''}>${esc(g.ad)} (${g.list.length})</button>`; }).join('')}</div>
      <div class="ap-ilist">${tum.map(a => `<label data-ara="${esc(C.TR(a))}" ${gizle(a, ilceGoster(a)) ? 'style="display:none"' : ''}><input type="checkbox" data-pop data-act="arstat-ist" data-v="${esc(a)}" ${sec.includes(a) ? 'checked' : ''}> ${esc(a)}</label>`).join('')}</div>
      <div class="ap-popalt"><span class="ap-note">İlçe düğmesi o ilçenin tüm istasyonlarını seçer / kaldırır</span><button class="ap-btn sm" data-pop data-act="arstat-pop" data-v="">Kapat ✕</button></div></div>` : ''}</div>`;
  }
  function arstatHtml() {
    if (S.arsivVeri === null) { if (!S.arsivYuk) { S.arsivYuk = true; arsivYukle().then(() => { S.arsivYuk = false; render(); }); } return '<div class="ap-card">Arşiv yükleniyor…</div>'; }
    const aylar = [...new Set([...Object.keys(S.arsivVeri), ...Object.keys(S.gercekVeri || {})])].sort();
    if (!aylar.length) return '<div class="ap-card ap-empty"><h2>Arşivde ay yok</h2><p>Önce "Arşiv" sayfasından aylık planı arşive kaydedin ya da Nöbet Listesi Raporu yükleyin.</p></div>';
    const st = arsivIstatistik(), gk = gercekKartlar();
    const kartlar = {seyir: `<div class="ap-card"><h2>Aylara göre seyir (toplam)</h2>${tabloHtml(['Ay', 'İhtiyaç', 'Planlanan', 'Kapasite', 'Çıkan kişi', 'Gelen kişi', 'Fazla nöbet', 'Personel önerilen ist.'], st.seyir)}</div>`, ist: `<div class="ap-card"><h2>İstasyon özeti (seçilen aylar toplamı)</h2><p class="ap-note">Her satır bir istasyon; sayılar <b>yukarıda seçtiğiniz ayların toplamıdır</b> (örn. 2 ay seçiliyse iki ayın toplamı).</p>
      <ul class="ap-note" style="margin:6px 0 10px 18px;line-height:1.6"><li><b>Açık ay:</b> istasyonun kapalı (Ekip OF) olmadığı ay sayısı</li><li><b>İhtiyaç:</b> o aylarda yazılması gereken toplam nöbet</li><li><b>Planlanan:</b> o aylarda planlamada kişilere yazılan toplam nöbet (tutulması gereken; ihtiyaçtan azsa eksik var demektir)</li><li><b>Çıkan / Gelen:</b> başka istasyona giden / istasyona gelen kişi sayısı (kişi-ay: bir kişi 3 ay gittiyse 3)</li><li><b>Fazla nöbet:</b> kişilere hedeflerinin üstünde yazılan nöbetlerin toplamı</li><li><b>Personel önerilen ay:</b> sistemin "personel gönderin" dediği ay sayısı</li><li><b>Ekip OF ay:</b> istasyonun kapalı olduğu ay sayısı</li></ul>${tabloHtml(['İstasyon', 'Açık ay', 'İhtiyaç', 'Planlanan', 'Çıkan', 'Gelen', 'Fazla nöbet', 'Personel önerilen ay', 'Ekip OF ay'], st.ist)}</div>`, cik: `<div class="ap-card"><h2>Çıkan personel — kaç ay çıktı</h2>${tabloHtml(['Ad soyad', 'Branş', 'Çıktığı istasyon', 'Gittiği yer', 'Ay sayısı'], ayDuz(st.cikSat, 4, 'c'), 'dar')}</div>`, gelm: `<div class="ap-card"><h2>Hangi istasyona hangi branştan personel geldi</h2>${tabloHtml(['İstasyon', ...BRANSLAR, 'Toplam'], st.matSat)}</div>`, gel: `<div class="ap-card"><h2>Gelen personel listesi</h2>${tabloHtml(['Ad soyad', 'Branş', 'Geldiği istasyon', 'Gittiği (gelen) istasyon', 'Ay sayısı'], ayDuz(st.gelSat, 4, 'g'), 'dar')}</div>`, faz: `<div class="ap-card"><h2>Fazla nöbet alan kişiler</h2>${tabloHtml(['Ad soyad', 'Branş', 'İstasyon', 'Toplam fazla nöbet', 'Ay sayısı'], ayDuz(st.fazSat.map(r => [r[0], r[1], r[2], r[4], r[3], r[5]]), 4, 'f'), 'dar')}</div>`};
    const sek = [['seyir', 'Aylara göre seyir'], ['ist', 'İstasyon özeti'], ['gelm', 'Gelen branş matrisi'], ['gel', 'Gelen personel listesi'], ['cik', 'Çıkan personel'], ['faz', 'Fazla nöbet alanlar'], ...(gk ? [['gist', 'Gerçekleşen nöbet'], ['gfaz', 'Gerçekleşen fazla nöbet'], ['gdism', 'Kadro dışı nöbet (özet)'], ['gdis', 'Kadro dışı nöbet (liste)']] : [])];
    if (gk) Object.assign(kartlar, gk);
    const aktif = sek.some(x => x[0] === S.arstatSekme) ? S.arstatSekme : 'seyir';
    return `<div class="ap-card"><h2>İstatistik — dönem ve istasyon seçimi</h2>
      <div class="ap-row">${aySecimHtml(aylar)}${istSecimHtml()}<button class="ap-btn" data-act="arsiv-excel">Excel'e aktar</button></div></div>
      <div class="ap-subnav ap-noprint">${sek.map(([v, t]) => `<button class="${aktif === v ? 'on' : ''}" data-act="arstat-sekme" data-v="${v}">${t}</button>`).join('')}</div>
      ${kartlar[aktif]}`;
  }
  function arsivExcel() {
    const st = arsivIstatistik(), wb = XLSX.utils.book_new(), temiz = r => r.map(c => typeof c === 'string' ? c.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"') : c);
    const ekle = (ad, bas, sat) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([bas, ...sat.map(temiz)]), ad);
    ekle('Seyir', ['Ay', 'İhtiyaç', 'Planlanan', 'Kapasite', 'Çıkan', 'Gelen', 'Fazla nöbet', 'Personel önerilen ist.'], st.seyir);
    ekle('İstasyon özeti', ['İstasyon', 'Açık ay', 'İhtiyaç', 'Planlanan', 'Çıkan', 'Gelen', 'Fazla nöbet', 'Personel önerilen ay', 'Ekip OF ay'], st.ist);
    ekle('Çıkan personel', ['Ad soyad', 'Branş', 'Çıktığı istasyon', 'Gittiği yer', 'Ay sayısı', 'Aylar'], st.cikSat);
    ekle('Gelen branş', ['İstasyon', ...BRANSLAR, 'Toplam'], st.matSat);
    ekle('Gelen personel', ['Ad soyad', 'Branş', 'Geldiği istasyon', 'İstasyon', 'Ay sayısı', 'Aylar'], st.gelSat);
    ekle('Fazla nöbet', ['Ad soyad', 'Branş', 'İstasyon', 'Ay sayısı', 'Toplam fazla nöbet', 'Aylar'], st.fazSat);
    const G = gercekIstatistik(); if (G.sec.length) { ekle('Gerçekleşen nöbet', ['İstasyon', 'Ay', 'Planlanan', 'Gerçekleşen nöbet', 'Fark', 'Nöbet tutan kişi-ay'], G.ist); ekle('Gerçekleşen fazla', ['Ad soyad', 'Branş', 'Kadro istasyonu', 'Ay sayısı', 'Toplam fazla nöbet', 'Aylar'], G.faz); ekle('Dışarıdan nöbet', ['Ad soyad', 'Branş', 'Kadro istasyonu', 'Nöbet tuttuğu istasyon', 'Nöbet', 'Aylar'], G.dis); }
    xlsxIndir(wb, `ASHI-Arsiv-Istatistik-${(S.arsivSecili || []).slice().sort()[0] || ''}_${(S.arsivSecili || []).slice().sort().pop() || ''}.xlsx`);
  }
