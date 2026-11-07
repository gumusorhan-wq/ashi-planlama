
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
  const hesapImza = () => JSON.stringify([HESAP_SURUM, !!S.ayar.hedefYuvarla, S.ayar.isciDusulen, S.ayar.azamiMemur, S.ayar.panoMod, S.ayar.surEsik, S.ayar.surDegilEsik, Object.entries(S.ayar.durumlar).map(([k, v]) => [k, !!v.nobetYok, !!v.mesaiYok, !!v.disarida, !!v.pasif])]);
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
  const DOSYA_TUR = {A: 'EKİP Personel Listesi', B: 'Personel Listesi Raporu', I: 'Personel İzin-Muafiyet Raporu', N: 'Nöbet Listesi / Hareket Raporu', T: 'İzin ve Rapor Bilgileri'};
  async function yuklemeKaydet(dosyalar) {
    const l = (await depo.get('yuklemeler')) || [], t = Date.now();
    dosyalar.forEach(d => {
      const r = d.rapor, ozet = d.tur === 'I' ? `${r.kisi} kişi, ${r.eslesen} eşleşti · ${r.izinli} izinli, ${r.muafiyet} muafiyet` : d.tur === 'N' ? `${r.kisi} kişi, ${r.eslesen} eşleşti · aylar: ${(r.aylar || []).join(', ')}` : `${r.yeni.length} yeni, ${r.degisen} güncel${r.nakil && r.nakil.length ? ', ' + r.nakil.length + ' birim değişikliği' : ''}`;
      const kayit = {t, ad: d.ad, tur: d.tur, satir: r.toplam, boyut: d.boyut || 0, ay: ayAnahtari(), aylar: d.tur === 'N' ? (r.aylar || []).join(',') : '', rol: S.rol, ozet, guncel: 0, ...(d.kaynak ? {kaynak: d.kaynak} : {}), ...(d.ikMod ? {ikMod: d.ikMod} : {})};
      const anahtar = x => `${x.tur}|${x.ay}|${x.tur === 'N' ? (x.aylar || '') : ''}`, i = l.findIndex(x => anahtar(x) === anahtar(kayit));
      if (i >= 0) { kayit.guncel = (l[i].guncel || 0) + 1; l.splice(i, 1); }          // aynı tür ve ay için yeni yükleme eskisinin yerine geçer (yeni satır eklenmez)
      l.unshift(kayit);
    });
    if (l.length > 500) l.length = 500;
    await depo.put('yuklemeler', l); S.yuklemeler = l;
  }
  // Nöbet Listesi Raporu (N) yüklemesinden plana işlenen veriyi geri alır: kişilerin o aylara ait nöbet rolü sayıları (rolAy → rolSay, sürücülük
  // doğrulaması), idari (Başhekimlik / KKM) nöbet kayıtları ve plan.nobetAylari
  function nobetAylariniGeriAl(plan, aylar) {
    if (!plan || !aylar.length) return 0; let n = 0;
    (plan.kayitlar || []).forEach(k => {
      if (k.rolAy && aylar.some(a => a in k.rolAy)) { k.rolAy = {...k.rolAy}; aylar.forEach(a => { delete k.rolAy[a]; }); k.rolSay = Object.keys(k.rolAy).length ? C.rolToplam(k.rolAy) : null; n++; }
      if (k.idariNobet && k.idariNobet.aylar) { const ay = {...k.idariNobet.aylar}; aylar.forEach(a => { delete ay[a]; }); k.idariNobet = Object.keys(ay).length ? {...k.idariNobet, aylar: ay} : null; }
    });
    plan.nobetAylari = (plan.nobetAylari || []).filter(a => !aylar.includes(a));
    return n;
  }
  // Silinen yüklemelerin gerçekleşen nöbet kayıtları (gercek:YYYY-AA): kalan hiçbir Nöbet raporu yüklemesi (hangi plan ayına yüklenmiş olursa olsun)
  // o ayı kapsamıyorsa silinir; başka bir yüklemede de kullanılan ay korunur
  async function gercekTemizle(aylar, kalan) {
    const kullanilan = new Set(kalan.filter(x => x.tur === 'N').flatMap(x => String(x.aylar || '').split(',').filter(Boolean)));
    const sil = [...new Set(aylar)].filter(a => !kullanilan.has(a));
    for (const a of sil) { await depo.del('gercek:' + a); if (S.gercekVeri) delete S.gercekVeri[a]; }
    return sil;
  }
  const nAylari = l => l.filter(x => x.tur === 'N').flatMap(x => String(x.aylar || '').split(',').filter(Boolean));

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
    const ay = ayAnahtari(), yl = (S.yuklemeler || []).filter(x => x.ay === ay), var_ = t => yl.some(x => x.tur === t), dosya = t => yl.some(x => x.tur === t && x.kaynak !== 'ik'), ik = t => yl.some(x => x.tur === t && x.kaynak === 'ik');
    const durum = ok => ok === 'ik' ? '<span class="ap-tag ap-t-ok" style="white-space:nowrap" title="Bu ay İK (ASHİ Nöbet Sayım) arşivinden alındı">İK\'dan alındı</span>' : ok === 'once' ? '<span class="ap-tag ap-t-fz" title="Bu aya yükleme yok; önceki aydan kopyalanan nöbet ayları kullanılıyor">önceki aydan</span>' : ok ? '<span class="ap-tag ap-t-ok">yüklendi</span>' : '<span class="ap-tag ap-t-ih">bekleniyor</span>';      // durum bu ayın yükleme kayıtlarından türetilir
    const nobetAy = (S.plan && S.plan.nobetAylari) || [];
    // Gömülü mod: Nöbet Listesi ve İzin-Muafiyet bilgisi İK'nın kurum arşivinden alınabilir (dosya yükleme yedek yol olarak kalır)
    if (opts.ik && !Array.isArray(S.ikAylar) && !S.ikYuk) { S.ikYuk = true; ikAylariGetir().then(() => { S.ikYuk = false; render(); }); }
    const ikVar = new Set(S.ikAylar || []), ikN = ikOncekiAylar().filter(a => ikVar.has(a) && (!S.ikSlotlu || S.ikSlotlu.has(a))), ikI = [ay, ...ikOncekiAylar()].filter(a => ikVar.has(a) && (!S.ikIzinli || S.ikIzinli.has(a)));
    // İK'dan alınmış veri İK'da sonradan güncellendiyse (ay paketinin mod zamanı değiştiyse ya da pencereye yeni ay girdiyse) "yeniden al" gösterilir
    const ikEski = (t, aylar) => { const x = yl.find(y => y.tur === t && y.kaynak === 'ik'); if (!x || !x.ikMod || !S.ikMod) return false; return aylar.some(a => !(a in x.ikMod) ? t === 'N' && !!S.ikSlotlu && S.ikSlotlu.has(a) : String(S.ikMod[a] || '') > String(x.ikMod[a] || '')); };
    const ikHucre = (t, aylar, tamam) => {
      if (!opts.ik) return '';
      if (tamam && Array.isArray(S.ikAylar) && ikEski(t, aylar)) return `<div class="ap-row" style="margin-top:4px;gap:6px"><span class="ap-tag ap-t-fz">İK'da daha yeni veri var</span><button class="ap-btn sm pri" data-act="ik-al" data-v="${t}" ${salt() ? 'disabled' : ''} title="İK'daki en son yüklenen veriyi yeniden alır">Yeniden al</button><span class="ap-note">İK'da: ${aylar.map(a => ayAd(a)).join(', ')}</span></div>`;
      if (!Array.isArray(S.ikAylar)) return '<div class="ap-note" style="margin-top:4px">İK arşivi denetleniyor…</div>';
      if (!aylar.length) return `<div class="ap-note" style="margin-top:4px">${tamam ? '' : '<b>İK\'da yok — dosya yükleyin.</b> '}İK arşivinde ${t === 'N' ? 'son 6 ayın nöbet verisi' : 'bu döneme ait izin verisi'} bulunmuyor.</div>`;
      return `<div class="ap-row" style="margin-top:4px;gap:6px"><button class="ap-btn sm ${tamam ? '' : 'pri'}" data-act="ik-al" data-v="${t}" ${salt() ? 'disabled' : ''} title="İK (ASHİ Nöbet Sayım) kurum arşivinden alır; önizlemeden sonra uygulanır">${tamam ? 'İK\'dan yenile' : 'İK\'dan al'}</button><span class="ap-note">İK'da: ${aylar.map(a => ayAd(a)).join(', ')}</span></div>`;
    };
    const nDurum = ik('N') ? 'ik' : var_('N') || (nobetAy.length > 0 ? 'once' : false), iDurum = ik('I') ? 'ik' : dosya('I');
    const sat = [
      ['1', '<b>EKİP — Başhekimlik / Komuta / İstasyon Personel Listesi</b>', 'Kim hangi istasyonda çalışıyor, çalışma durumu, yıllık izin bakiyesi. Doktorlar dahil tüm ekibi içerir: yalnız Personel Listesi Raporu ile ~58 kişi (çoğu doktor) eksik kalır.', var_('A')],
      ['2', '<b>Personel Listesi Raporu</b>', 'İzin, rapor, muafiyet, süt izni, geçici görev yeri ve tarihleri, atama başlangıç tarihi (4/B 4 yıl kuralı). İzin-Muafiyet Raporu aynı bilgiyi içerir; ayrıca yüklemeye gerek yok.', var_('B') || dosya('I')],
      ['3', '<b>Nöbet Listesi Raporu</b> (ya da Nöbet İçi Hareket Raporu)', `Kişinin ekip şefi / YSP / sürücü olarak tuttuğu nöbetler: sürücülük doğrulaması ve gerçekleşen nöbetler. İkisi aynı bilgiyi verir, <b>birini yüklemeniz yeterli</b>. Son 6 ay birlikte değerlendirilir; yüklü nöbet ayları: ${nobetAy.length ? nobetAy.map(a => ayAd(a)).join(', ') : 'yok'}.${ikHucre('N', ikN, nDurum === 'ik')}`, nDurum]];
    if (opts.ik) sat.push(['4', '<b>Personel İzin-Muafiyet Raporu</b> <span class="ap-note">(isteğe bağlı)</span>', `İzin, rapor ve muafiyet tarihleri. İK'dan alınırsa yalnız bu aya denk gelen kayıtlar işlenir; rapordaki kişilerin önceki ASOS izin bilgisi yenilenir.${ikHucre('I', ikI, iDurum === 'ik')}`, iDurum]);
    return `<div class="ap-card"><h2>Her ay yüklenecek dosyalar — ${ayEtiket()}</h2><p class="ap-note">Sistem yalnızca <b>3 ASOS dosyasıyla</b> çalışır. Her ay planlama öncesi bu üçünü yenilemeniz yeterlidir; arşiv ve istatistikler bunlardan ve planlamadan otomatik üretilir.${opts.ik ? ' Nöbet Listesi ve İzin-Muafiyet bilgisi <b>İK\'dan alınabilir</b> (İK\'ya o ay yüklenmiş nöbet ve izin verisi); İK\'da yoksa dosya yükleyin.' : ''}</p>
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
    const yuklemeHtml = `<div class="ap-card"><h2>Yüklenen dosyalar (${yl.length})</h2><p class="ap-note">ASOS'tan yüklenen her dosya, uygulandığı anda burada listelenir: ne zaman, hangi türde, kaç satır ve hangi plan ayına uygulandı. Dosyanın kendisi saklanmaz, yalnızca bu günlük tutulur.</p><div class="ap-drop"><div class="ap-row" style="justify-content:center"><button class="ap-btn pri" data-act="plan-asos" ${salt() ? 'disabled' : ''}>Excel dosyası yükle (.xls / .xlsx)</button>${typeof opts.veriKaynagi === 'function' ? `<button class="ap-btn" data-act="asos-kaynak" ${salt() ? 'disabled' : ''} title="ASHİ'deki güncel Nöbet Listesi ve İzin-Muafiyet raporlarını doğrudan alır">ASHİ'den nöbet listesi + izin raporu getir</button>` : ''}${opts.ik ? `<button class="ap-btn" data-act="ik-al" data-v="N,I" ${salt() ? 'disabled' : ''} title="Son 6 ayın nöbet verisini ve bu aya denk gelen izinleri İK (ASHİ Nöbet Sayım) kurum arşivinden alır">İK'dan nöbet + izin al</button>` : ''}</div><div class="ap-note" style="text-align:center;margin-top:6px">ya da dosyaları bu alana sürükleyip bırakın · EKİP listesi, Personel Listesi Raporu, Nöbet Listesi, Nöbet İçi Hareket Raporu (birlikte seçilebilir)</div></div>${tabloHtml(['Tarih', 'Dosya', 'Tür', 'Satır', 'Boyut', 'Plan ayı', 'Sonuç', ''], yl.slice(0, 100).map((x, xi) => [new Date(x.t).toLocaleString('tr-TR'), esc(x.ad), DOSYA_TUR[x.tur] || x.tur, x.satir, kb(x.boyut), ayAd(x.ay), esc(x.ozet) + (x.guncel ? ` <span class="ap-note">(${x.guncel + 1}. yükleme, güncellendi)</span>` : ''), S.rol === 'salt_okur' ? '' : `<button class="ap-btn sm dng" data-act="yukleme-sil" data-v="${xi}" title="Bu yükleme kaydını sil">Sil</button>`]))}${yl.length > 100 ? '<div class="ap-note">Son 100 kayıt gösteriliyor.</div>' : ''}</div>`;
    const asek = [['dosya', 'Yüklenen dosyalar'], ['ay', 'Aylara göre arşiv'], ['kayit', 'Aylık arşiv']], aa = asek.some(x => x[0] === S.arsivSekme) ? S.arsivSekme : 'dosya';
    const nav = `<div class="ap-subnav ap-noprint">${asek.map(([v, t]) => `<button class="${aa === v ? 'on' : ''}" data-act="arsiv-sekme" data-v="${v}">${t}</button>`).join('')}</div>`;
    const kayit = `<div class="ap-card"><h2>Aylık arşiv</h2>
      <p class="ap-note">Arşiv, her ayın istasyon bazlı özetini saklar: ihtiyaç, planlanan, kapasite, <b>çıkan ve gelen personel (branş ve istasyon)</b>, <b>fazla nöbet</b> alan kişiler. TC, telefon ve sağlık bilgisi arşive yazılmaz. ${opts.gomulu ? 'Arşiv, planla birlikte kurum sunucusunda (HUSER Yönetim Sistemi) tutulur ve sunucu yedeğine girer; ayrıca Ayarlar’dan JSON yedeği alınabilir.' : "Arşiv aynı tarayıcı veritabanında tutulur; yedeği Ayarlar'dan alınır."}</p>
      <div class="ap-row"><button class="ap-btn pri" data-act="arsiv-yaz" ${duz ? '' : 'disabled'}>${ayEtiket()} ayını arşive kaydet${var_ ? ' (güncelle)' : ''}</button>
      <label class="ap-note"><input type="checkbox" id="ap-arsiv-kilit" ${S.rol === 'yonetici' ? '' : 'disabled'}> Kaydederken ayı kilitle (yalnız yönetici)</label>
      <button class="ap-btn" data-act="arsiv-hepsi" ${duz && kayitliPlan.length + (var_ ? 0 : 1) > 0 ? '' : 'disabled'} title="${opts.gomulu ? 'Sunucuda kayıtlı, arşivlenmemiş tüm aylık planları arşive ekler' : 'Tarayıcıdaki arşivlenmemiş tüm aylık planları arşive ekler'}">Kayıtlı tüm planları arşivle (${kayitliPlan.length})</button></div>
      ${var_ ? `<div class="ap-note" style="margin-top:8px">${ayEtiket()} son arşivleme: ${new Date(var_.zaman).toLocaleString('tr-TR')}</div>` : ''}</div>
      <div class="ap-card"><h2>Arşivlenen aylar (${aylar.length})</h2>${tabloHtml(['Ay', 'Arşivleme', 'İhtiyaç', 'Planlanan', 'Çıkan', 'Gelen', 'Fazla nöbet', 'Personel önerilen ist.', 'Hesap', ''],
      aylar.map(a => { const r = S.arsivVeri[a], t = arsivToplam(r); return [ayAd(a), new Date(r.zaman).toLocaleDateString('tr-TR'), t.ihtiyac, t.planlanan, t.cikan, t.gelen, t.fazla, t.oner, r.hesapImza === hesapImza() ? (r.yenilendi ? `<span class="ap-note" title="Güncel yönteme göre yeniden hesaplandı">güncellendi ${new Date(r.yenilendi).toLocaleDateString('tr-TR')}</span>` : 'güncel') : '<span class="ap-note" style="color:var(--ap-warn)" title="Bu ayın planı ' + (opts.gomulu ? 'sunucuda' : 'bu tarayıcıda') + ' yoksa eski yöntemle kalır">eski hesap</span>', planlamaRol() ? `<button class="ap-btn sm dng" data-act="arsiv-sil" data-v="${a}">Sil</button>` : '']; }))}</div>`;
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
  // Tek istasyon seçen ortak panel — HUSER ortak istasyon seçicisi (IstasyonSeciciTek) görünümü: 🚑 düğme, ara, sayılı ilçe düğmeleri, liste.
  // anahtar: 'ist' (Modül 1 istasyon sayfası) / 'n2' (Modül 2). Seçim tıklayınca uygulanır, panel kapanır.
  function istTekHtml(anahtar, secili, adlar) {
    const acik = S.arstatAc === 'tek-' + anahtar, q = C.TR(S.arstatAra || '').trim(), ilceSec = S.tekIlce || '';
    if (adlar.length <= 1) return `<b class="ap-tekad">🚑 ${esc(secili || '—')}</b>`;
    const gruplar = new Map(); adlar.forEach(a => { const k = C.ilceAdi(a), g = gruplar.get(k) || {ad: ilceGoster(a), n: 0}; g.n++; gruplar.set(k, g); });
    const gizle = a => (ilceSec && C.ilceAdi(a) !== ilceSec) || (q && !C.TR(a + ' ' + ilceGoster(a)).includes(q));
    return `<div class="ap-popwrap"><button class="ap-btn ap-tekbtn" data-pop data-act="arstat-tek-pop" data-v="${anahtar}" title="${esc(secili)}">🚑 <b>${esc(secili || '—')}</b> ▾</button>${acik ? `<div class="ap-pop ap-pop-ist" data-pop>
      <div class="ap-row" style="justify-content:space-between"><b class="ap-poph">İSTASYON SEÇ</b><span class="ap-note">${adlar.length} birim</span></div>
      <input class="ap-in w" id="ap-tek-ara" data-pop placeholder="İlçe veya istasyon ara…" value="${esc(S.arstatAra || '')}" autocomplete="off">
      ${gruplar.size > 1 ? `<div class="ap-chips">${[...gruplar.entries()].map(([k, g]) => `<button class="ap-chip ${ilceSec === k ? 'sec' : C.ilceAdi(secili || '') === k ? 'kis' : ''}" data-pop data-act="arstat-tek-ilce" data-v="${esc(k)}">${esc(g.ad)} (${g.n})</button>`).join('')}</div>` : ''}
      <div class="ap-tlist">${adlar.map(a => `<button class="${a === secili ? 'sec' : ''}" data-pop data-act="arstat-tek-sec" data-k="${anahtar}" data-v="${esc(a)}" data-ara="${esc(C.TR(a + ' ' + ilceGoster(a)))}" data-ilce="${esc(C.ilceAdi(a))}" ${gizle(a) ? 'style="display:none"' : ''}><i></i>${esc(a)}</button>`).join('')}</div></div>` : ''}</div>`;
  }
  // ---- İzin ve geçici görev takibi: personelin hangi aylarda izin kullandığı / geçici görevlendirildiği (kayıtlı tüm aylık planlardan) ----
  async function takipYukle() {
    const anahtarlar = ((await depo.keys()) || []).filter(k => String(k).startsWith('plan:')).sort(), veri = {};
    const proje = p => (p.kayitlar || []).map(k => ({a: k.tc || k.ad, ad: k.ad, unvan: k.unvan || '', birim: k.birim || '', izin: (k.izin || []).map(i => ({tur: i.tur, gun: i.gun, bas: i.bas, bit: i.bit})), durum: k.durum || '', durumMetin: k.durumMetin || '', gorev: k.gorev && (k.gorev.hedef || k.gorev.yer) ? {hedef: k.gorev.hedef || '', yer: k.gorev.yer || '', tarih: k.gorev.tarih || ''} : null}));
    for (const key of anahtarlar) { const p = await depo.get(key); if (p && p.kayitlar) veri[String(key).slice(5)] = proje(p); }
    if (S.plan) veri[ayAnahtari()] = proje(S.plan);
    S.takipVeri = veri;
  }
  const takipDurum = () => S.takip = S.takip || {yil: [BUGUN.getFullYear()], ist: [], sekme: 'izin', ara: '', sadece: true};   // açılışta yalnız içinde bulunulan yıl
  const takipKisa = a => `${AY_KISA[+a.slice(5) - 1]} ${a.slice(2, 4)}`;
  // İzin / durum kısaltmaları (takip tablosu ve lejant tek yerden): [kod, ad, eşleşme (C.TR metnine)]
  const IZIN_KISA = [['YI', 'Yıllık izin', /YILLIK/], ['MZ', 'Mazeret izni', /MAZERET/], ['HR', 'Heyet raporu', /HEYET/], ['RP', 'Rapor (hastalık)', /RAPOR|HASTALIK/], ['DÖ', 'Doğum öncesi', /DOGUM ONCESI/],
    ['DS', 'Doğum sonrası', /DOGUM/], ['Sİ', 'Süt izni', /SUT IZN/], ['NM', 'Nöbet muafiyeti', /NOBET MUAF/], ['Üİ', 'Ücretsiz izin', /UCRETSIZ|AYLIKSIZ/], ['AS', 'Askerlik', /ASKER/], ['İİ', 'İdari izin', /IDARI/], ['Dİ', 'Diğer izin / durum', /./]];
  const izinKod = t => (IZIN_KISA.find(([, , re]) => re.test(C.TR(t))) || IZIN_KISA[IZIN_KISA.length - 1])[0];
  // Sütunlar: seçili her yılın 12 ayı (Oca … Ara); planı olmayan aylar boş sütun olarak kalır. Yıl seçilmezse kayıtlı planı olan tüm yıllar.
  function takipHazirla() {
    const T = takipDurum(), D = durumlar(), veri = S.takipVeri || {}, kayitliYil = [...new Set(Object.keys(veri).map(a => +a.slice(0, 4)))];
    const yillar = (T.yil.length ? [...T.yil] : kayitliYil).sort((a, b) => a - b), tekYil = yillar.length === 1;
    const aylar = yillar.flatMap(y => AY_KISA.map((_, i) => `${y}-${C.pad(i + 1)}`)), ayEt = a => tekYil ? AY_KISA[+a.slice(5) - 1] : takipKisa(a);
    const ara = C.TR(T.ara || '').trim(), kisiler = new Map();
    aylar.filter(ay => veri[ay]).forEach(ay => veri[ay].forEach(r => {
      if (T.ist.length && !T.ist.includes(r.birim)) return;
      if (r.durum === 'AİLE HEKİMLİĞİNDE' || r.durum === 'UZMANLIK EĞİTİMİ') return;      // aile hekimliği sözleşmelileri ve uzmanlık eğitimindekiler izin / görev takibinde yer almaz
      if (ara && !C.TR(r.ad).includes(ara)) return;
      const e = kisiler.get(r.a) || {ad: r.ad, unvan: r.unvan, ekip: r.birim, h: {}}; e.ekip = r.birim; e.unvan = r.unvan || e.unvan;
      // izin: tarihli izinlerin ay içine düşen günleri + tarihsiz gün sayısı; izin sayılan durumlar (rapor, doğum, ücretsiz izin vb.)
      let n = 0; const tur = new Set();
      r.izin.forEach(i => { if (i.bas && i.bit) { let c = 0; for (let ms = Date.parse(i.bas + 'T00:00:00Z'); ms <= Date.parse(C.izinSon(i) + 'T00:00:00Z'); ms += 864e5) if (new Date(ms).toISOString().slice(0, 7) === ay) c++; if (c) { n += c; tur.add(i.tur); } } else if (sayi(i.gun) > 0) { n += sayi(i.gun); tur.add(i.tur); } });
      const dt = D[r.durum] || {}, durumIzin = r.durum && (dt.nobetYok || dt.mesaiYok) && !dt.disarida && !/AİLE HEK|UZMANLIK|GEÇİCİ/.test(r.durum) ? r.durum : '';
      const gDurum = (D[r.durum] || {}).disarida || r.gorev;
      e.h[ay] = {izinGun: n, izinTur: [...tur].filter(Boolean), durumIzin, gorev: r.gorev, gorevVar: !!gDurum, gorevYok: !!gDurum && !r.gorev, durumMetin: r.durumMetin};
      kisiler.set(r.a, e);
    }));
    const satir = [...kisiler.values()].sort((a, b) => trCollator.compare(a.ekip, b.ekip) || trCollator.compare(a.ad, b.ad));
    const izinVar = h => h && (h.izinGun > 0 || h.durumIzin), gorevVar = h => h && h.gorevVar;
    return {aylar, satir, izinVar, gorevVar, T, ayEt, yillar, planli: ay => !!veri[ay]};
  }
  function takipExcel() {
    const {aylar, satir, izinVar, gorevVar, ayEt, yillar} = takipHazirla(), wb = XLSX.utils.book_new(), temiz = s => String(s == null ? '' : s);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Ad soyad', 'Ünvan', 'Ekip', ...aylar.map(a => yillar.length === 1 ? `${ayEt(a)} ${a.slice(0, 4)}` : ayEt(a)), 'Toplam gün'], ...satir.filter(e => aylar.some(a => izinVar(e.h[a]))).map(e => [e.ad, e.unvan, e.ekip, ...aylar.map(a => { const h = e.h[a]; return izinVar(h) ? (h.izinGun ? h.izinGun + ' gün' + (h.izinTur.length ? ' (' + h.izinTur.join(', ') + ')' : '') : '') + (h.durumIzin ? (h.izinGun ? ' · ' : '') + h.durumIzin : '') : ''; }), aylar.reduce((x, a) => x + ((e.h[a] || {}).izinGun || 0), 0)])]), 'İzin takibi');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Ad soyad', 'Ünvan', 'Ekip', ...aylar.map(a => yillar.length === 1 ? `${ayEt(a)} ${a.slice(0, 4)}` : ayEt(a)), 'Görevli ay sayısı'], ...satir.filter(e => aylar.some(a => gorevVar(e.h[a]))).map(e => [e.ad, e.unvan, e.ekip, ...aylar.map(a => { const h = e.h[a]; return gorevVar(h) ? (h.gorev ? temiz(h.gorev.hedef || h.gorev.yer) + (h.gorev.tarih ? ' ' + h.gorev.tarih : '') : (h.durumMetin || 'GEÇİCİ GÖREVDE (yer seçilmedi)')) : ''; }), aylar.filter(a => gorevVar(e.h[a])).length])]), 'Geçici görev takibi');
    xlsxIndir(wb, `Izin-Gorev-Takibi-${yillar.join('-') || 'tum'}-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }
  function takipHtml() {
    if (S.rol !== 'yonetici' && S.rol !== 'planlayici') return '<div class="ap-card ap-empty"><h2>Yetki yok</h2><p>İzin / görev takibi yalnızca planlama yetkililerine açıktır.</p></div>';
    if (S.takipVeri == null) { if (!S.takipYuk) { S.takipYuk = true; takipYukle().then(() => { S.takipYuk = false; render(); }); } return '<div class="ap-card">Aylık planlar okunuyor…</div>'; }
    const T = takipDurum(), veri = S.takipVeri, tumAylar = Object.keys(veri).sort(), yillar = [...new Set(tumAylar.map(a => +a.slice(0, 4)))].sort((a, b) => b - a);
    const {aylar, satir, izinVar, gorevVar, ayEt, yillar: sYil, planli} = takipHazirla(), izinSekme = T.sekme !== 'gorev', say = izinSekme ? izinVar : gorevVar;
    const gorunen = T.sadece ? satir.filter(e => aylar.some(a => say(e.h[a]))) : satir;
    const pop = (anahtar, etiket, icerik) => `<div class="ap-popwrap"><button class="ap-btn" data-pop data-act="takip-pop" data-v="${anahtar}">${etiket} ▾</button>${S.arstatAc === 'tk-' + anahtar ? `<div class="ap-pop" data-pop>${icerik}<div class="ap-popalt">${anahtar === 'ay' || anahtar === 'yil' ? `<button class="ap-btn sm" data-pop data-act="takip-tumu" data-v="${anahtar}">Tümünü seç</button>` : ''}<button class="ap-btn sm" data-pop data-act="takip-temizle" data-v="${anahtar}">Temizle (tümü)</button><button class="ap-btn sm" data-pop data-act="takip-pop" data-v="${anahtar}">Kapat ✕</button></div></div>` : ''}</div>`;
    const etYil = !T.yil.length ? 'Yıl: tümü' : `Yıl: ${[...T.yil].sort().join(', ')}`;
    const ist = istAdlari(), gruplar = new Map(); ist.forEach(a => { const k = C.ilceAdi(a), g = gruplar.get(k) || {ad: ilceGoster(a), list: []}; g.list.push(a); gruplar.set(k, g); });
    const etIst = !T.ist.length ? 'Ekip: tümü' : T.ist.length === 1 ? `Ekip: ${T.ist[0]}` : `Ekip: ${T.ist.length} seçili`;
    const yilIc = `<div class="ap-aygrid">${[...new Set([...yillar, BUGUN.getFullYear()])].sort((a, b) => b - a).map(y => `<button class="ap-aybtn ${T.yil.includes(y) ? 'sec' : 'mv'}" data-pop data-act="takip-yil" data-v="${y}">${y}</button>`).join('') || '<span class="ap-note">Kayıtlı plan yok</span>'}</div>`;
    const istIc = `<div class="ap-chips">${[...gruplar.entries()].map(([k, g]) => { const n = g.list.filter(a => T.ist.includes(a)).length; return `<button class="ap-chip ${n === g.list.length ? 'sec' : n ? 'kis' : ''}" data-pop data-act="takip-ilce" data-v="${esc(k)}">${esc(g.ad)} (${g.list.length})</button>`; }).join('')}</div><div class="ap-ilist">${ist.map(a => `<label><input type="checkbox" data-pop data-act="takip-ist" data-v="${esc(a)}" ${T.ist.includes(a) ? 'checked' : ''}> ${esc(a)}</label>`).join('')}</div>`;
    // Hücreler dar ve eşit: izinde gün sayısı + küçük kısaltma (tam ad title'da); görevde simge — tıklanınca yer ve tarih açılır kutuda
    const hucre = (h, e, a) => {
      if (!say(h)) return '<td class="tk-bos"></td>';
      if (izinSekme) {
        const turler = h.izinTur || [], kodlar = [...new Set([...turler.map(izinKod), ...(h.durumIzin ? [izinKod(h.durumIzin)] : [])])], tam = [...turler, ...(h.durumIzin ? [h.durumIzin] : [])].join(', ');
        return `<td class="tk-iz" title="${esc(tam)}${h.izinGun ? ' — ' + h.izinGun + ' gün' : ''}">${h.izinGun ? `<b>${h.izinGun}</b>` : `<b class="tk-kod">${esc(kodlar[0] || '')}</b>`}${h.izinGun && kodlar.length ? `<div class="tk-alt">${esc(kodlar.join(' '))}</div>` : !h.izinGun && kodlar.length > 1 ? `<div class="tk-alt">${esc(kodlar.slice(1).join(' '))}</div>` : ''}</td>`;
      }
      const g = h.gorev, yer = g ? String(g.hedef || g.yer || '') : '', metin = g ? [yer, g.tarih].filter(Boolean).join(' · ') : (h.durumMetin || 'Görev yeri seçilmedi'), anahtar = `${e.ad}|${a}`, acik = S.takipPop === anahtar;
      return `<td class="tk-gr ${g ? '' : 'tk-soluk'}" title="${esc(metin)}"><button type="button" class="tk-ic" data-act="takip-gpop" data-v="${esc(anahtar)}" aria-label="${esc(metin)}">${g ? '⇄' : '◌'}</button>${acik ? `<div class="tk-pop" data-pop><b>${esc(e.ad)}</b><span>${esc(AYLAR[+a.slice(5)])} ${a.slice(0, 4)}</span>${g ? `<div>${esc(yer)}</div>${g.tarih ? `<div class="ap-note">${esc(g.tarih)}</div>` : ''}` : `<div class="ap-note">${esc(h.durumMetin || 'Geçici görevde; görev yeri seçilmedi')}</div>`}</div>` : ''}</td>`;
    };
    const toplam = e => izinSekme ? aylar.reduce((x, a) => x + ((e.h[a] || {}).izinGun || 0), 0) + ' gün' : aylar.filter(a => gorevVar(e.h[a])).length + ' ay';
    const lejant = izinSekme ? `<div class="tk-lejant ap-note"><b>Kısaltmalar:</b> ${IZIN_KISA.map(([k, ad]) => `<span><b>${k}</b> ${ad}</span>`).join('')} · Sayı: o ayda kullanılan izin günü; sayı yoksa ay boyu süren durum.</div>` : '<div class="tk-lejant ap-note"><span><b class="tk-ic-l">⇄</b> görev yeri belli (tıklayın: yer ve tarih)</span><span><b class="tk-ic-l soluk">◌</b> geçici görevde, yer bilgisi yok</span></div>';
    const tablo = `<div class="ap-tw tk-tw"><table class="ap-t tk"><colgroup><col class="tk-c-ad"><col class="tk-c-ek">${aylar.map(() => '<col class="tk-c-ay">').join('')}<col class="tk-c-top"></colgroup><thead><tr><th>Ad soyad</th><th>Ekip</th>${aylar.map(a => `<th class="tk-ay${planli(a) ? '' : ' tk-yok'}" title="${AYLAR[+a.slice(5)]} ${a.slice(0, 4)}${planli(a) ? '' : ' — kayıtlı plan yok'}">${ayEt(a)}</th>`).join('')}<th>${izinSekme ? 'Toplam' : 'Ay'}</th></tr></thead><tbody>${gorunen.slice(0, 600).map(e => `<tr><td title="${esc(e.ad)}">${esc(e.ad)}</td><td title="${esc(e.ekip)}">${esc(String(e.ekip || '').replace(/ NOLU ASHİ.*$/, ''))}</td>${aylar.map(a => hucre(e.h[a], e, a)).join('')}<td><b>${toplam(e)}</b></td></tr>`).join('') || `<tr><td colspan="${aylar.length + 3}" class="ap-empty">Seçilen süzgeçlere uyan kayıt yok</td></tr>`}</tbody></table></div>${lejant}${gorunen.length > 600 ? '<div class="ap-note">İlk 600 kişi gösteriliyor; süzgeçleri daraltın ya da Excel\'e aktarın.</div>' : ''}`;
    return `<div class="ap-card"><h2>İzin ve geçici görev takibi</h2><p class="ap-note">Kayıtlı aylık planlardan (${tumAylar.length} ay${tumAylar.length ? ': ' + takipKisa(tumAylar[0]) + ' – ' + takipKisa(tumAylar[tumAylar.length - 1]) : ''}) personelin hangi aylarda izin kullandığı ve hangi aylarda geçici görevlendirildiği. Seçili yılın 12 ayı birlikte görünür; birden çok yıl seçilebilir, boş bırakılırsa kayıtlı tüm yıllar.</p>
      <div class="ap-row" data-ust>${pop('yil', etYil, yilIc)}${pop('ist', etIst, istIc)}<input class="ap-in" data-act="takip-ara" placeholder="Ad ara…" value="${esc(T.ara || '')}"><label class="ap-note"><input type="checkbox" data-act="takip-sadece" ${T.sadece ? 'checked' : ''}> Yalnız kaydı olanlar</label><button class="ap-btn" data-act="takip-yenile" title="Kayıtlı planları yeniden okur">Yenile</button><button class="ap-btn" data-act="takip-excel">Excel'e aktar</button></div></div>
      <div class="ap-subnav ap-noprint" data-ust><button class="${izinSekme ? 'on' : ''}" data-act="takip-sekme" data-v="izin">İzin takibi</button><button class="${izinSekme ? '' : 'on'}" data-act="takip-sekme" data-v="gorev">Geçici görev takibi</button></div>
      <div class="ap-card"><div class="ap-note" style="margin-bottom:6px">${gorunen.length} kişi · ${sYil.join(', ') || '—'} (${aylar.length} ay sütunu; planı olmayan aylar boş)${izinSekme ? ' · hücre: o ayda kullanılan izin günü ve kısaltma (üzerine gelince tam ad)' : ' · hücre: simgeye tıklayınca görev yeri ve tarih'}</div>${tablo}</div>`;
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
