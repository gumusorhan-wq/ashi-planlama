
  // ================= MODÜL 2 — İSTASYON NÖBET LİSTESİ =================
  const NC = NobetCore;
  const N2_SEKME = [['plan', 'Planlama'], ['istek', 'İstek takvimi'], ['liste', 'Nöbet listesi'], ['denetim', 'Denetim ve öneriler'], ['paket', 'Çıktı']];
  const IHLAL_AD = {donus: 'İzin / rapor dönüşü nöbetsiz', eksik: 'Boş nöbet branşı', yetenek: 'Nöbet branşına uygun değil', izin: 'İzinli günde nöbet', cakisma: 'Aynı gün çift görev', dinlenme: 'Dinlenme ihlali', izinOnce: 'Yıllık izin öncesi boşluk', surGunAsiri: 'Sürücü gün aşırı 3 nöbet', isciGece: 'İşçi art arda 3 gece', aralik: 'İki nöbet arası çok uzun', istek: 'İstenmeyen güne nöbet', adet: 'Nöbet sayısı farkı', ozelGun: 'Hafta sonu / tatil dengesizliği', gunGece: 'İşçi gündüz / gece dengesizliği'};
  const GUN_AD = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
  // İstasyon sorumlusu, planlama onaylanmadan (Kesinleştir / Ayı kilitle) kendi istasyonunun planlamasını ve nöbet listesi araçlarını göremez
  const n2Onayli = () => !!S.plan && (S.plan.durum === 'kesin' || S.plan.durum === 'kilitli');
  const n2Acik = () => S.rol !== 'istasyon' || n2Onayli();
  const n2Ist = () => S.n2.ist && S.plan && S.plan.birimler.some(b => b.ad === S.n2.ist) ? S.n2.ist : (S.n2.ist = (S.plan && (S.plan.birimler.find(b => b.tur === 'istasyon' && !b.ekipOf) || {}).ad) || '');
  const n2Birim = () => S.plan && S.plan.birimler.find(b => b.ad === n2Ist());
  function n2Depo(ad) { const N = (S.plan.nobet = S.plan.nobet || {}); return N[ad] = N[ad] || {istek: {}, izin: {}, liste: null, kural: {}, kisiler: null}; }
  const n2Duz = () => S.rol !== 'salt_okur' && guncelAy() && !(S.plan && S.plan.durum === 'kilitli');
  function mut2(fn, islem, detay) {
    if (!n2Duz()) { toast(S.plan && S.plan.durum === 'kilitli' ? 'Bu ay kilitli.' : 'Salt okur modundasınız.'); return false; }
    fn(); S.n2.oneri = null; if (islem) logla(islem, detay); kaydet(); return true;
  }
  // Kişi listesi: Modül 1 planından (planlama tarafı) ya da paketle gelen kayıtlardan (istasyon tarafı)
  function n2Kisiler(b) {
    const dp = n2Depo(b.ad);
    if (dp.kisiler && !S.plan.kayitlar.some(k => k.birim === b.ad)) return dp.kisiler;
    return hesapla(b).satir.filter(s => !s.nobetYok).map(s => {
      const k = s.k, azami = Math.floor(s.azami + 1e-9);
      return {id: k.id, ad: k.ad, grup: s.grup, sinif: k.sinif, brans: bransAd(k), planlanan: sayi(k.planlanan), ust: k.sinif === 'isci' ? null : azami, gelen: !!k._gelen,
        izin: (k.izin || []).filter(i => i.bas && i.bit).map(i => ({bas: i.bas, bit: C.izinSon(i), tur: i.tur})), izinGun: izinGun(k)};
    }).sort((a, c) => (NB_SIRA[a.grup] - NB_SIRA[c.grup]) || trCollator.compare(a.ad, c.ad));
  }
  function n2Girdi(b) {
    const dp = n2Depo(b.ad), ks = n2Kisiler(b).map(k => ({...k, izin: [...(k.izin || []), ...(dp.izin[k.id] || [])], istek: dp.istek[k.id] || []}));
    const ozet = NC.adetHazirla(ks, NC.gunSayisi(S.y, S.m));
    const oz = ozel(), tatil = []; for (let d = 1; d <= NC.gunSayisi(S.y, S.m); d++) { const i = C.iso(S.y, S.m, d), og = oz[i]; if (C.RESMI[i] === 0 || (og && (og.tur === 'bayram' || og.tur === 'resmi'))) tatil.push(d); }      // resmî tatil / bayram günleri (hafta sonu gibi dengeli dağıtılır)
    return {girdi: {y: S.y, m: S.m, kisiler: ks, tatil}, ozet, kural: {...NC.KURAL, ...(dp.kural || {})}};
  }
  const n2Deneti = (b) => { const G = n2Girdi(b), dp = n2Depo(b.ad), H = NC.hazirla(G.girdi, G.kural), L = dp.liste || NC.bos(H.N); return {G, H, L, d: NC.denetle(L, H)}; };

  function n2UstHtml(b) {
    const kisit = S.rol === 'istasyon' && opts.kullanici && opts.kullanici.birim, ists = S.plan.birimler.filter(x => x.tur === 'istasyon' && !x.ekipOf && (!kisit || x.ad === kisit));
    return `<div class="ap-card"><div class="ap-row"><label>İstasyon <select class="ap-sel" data-n2="ist">${ists.map(x => `<option ${x.ad === b.ad ? 'selected' : ''}>${esc(x.ad)}</option>`).join('')}</select></label>
      <span class="ap-note">${ayEtiket()} · ${NC.gunSayisi(S.y, S.m)} gün · nöbet 09:00–09:00</span></div></div>`;
  }
  function n2Html() {
    if (!S.plan) return `<div class="ap-card ap-empty"><h2>Modül 2 — İstasyon nöbet listesi</h2><p>Bu ay için plan yok. Önce Modül 1'den personel listelerini yükleyin.</p></div>`;
    const b = n2Birim(); if (!b) return '<div class="ap-card ap-empty">Açık istasyon yok.</div>';
    let s = n2Acik() ? S.n2.sekme : 'plan';
    if (S.rol === 'istasyon' && ['liste', 'denetim', 'paket'].includes(s) && n2OnayOku(b.ad).durum !== 'onaylandi') return n2UstHtml(b) + `<div class="ap-card ap-empty"><h2>Planlama onayı bekleniyor</h2><p>Nöbet listesi araçları, planlama birimi sizin nöbet planınızı <b>onayladıktan</b> sonra açılır. Durum: <b>${ONAY_AD[n2OnayOku(b.ad).durum]}</b>.</p><button class="ap-btn" data-act="n2-sekme" data-v="plan">Planlama sekmesine dön</button></div>`;
    return n2UstHtml(b) + ({plan: n2PlanHtml, istek: n2IstekHtml, liste: n2ListeHtml, denetim: n2DenetimHtml, paket: n2PaketHtml}[s] || n2PlanHtml)(b);
  }
  // ---- Planlama: Modül 1'de hazırlanan, bu istasyonun kendi planlaması (istasyon sorumlusu için yalnız onaydan sonra; sağlık nedenleri görünmez) ----
  const NB_AD = {dok: 'Ekip şefi', isci: 'Sürücü', ke: 'Ekip şefi · YSP', ka: 'Ekip şefi · YSP · Sürücü', ysp: 'YSP', sy: 'YSP · Sürücü'};
  // İstasyon onay akışı: plan "Kesinleştir" ile istasyonlara gönderilir → istasyon sorumlusu nöbetleri düzenleyip planlamaya geri gönderir → planlama onaylarsa kesin plana işlenir
  const ONAY_AD = {acik: 'Düzenleniyor', gonderildi: 'Planlama onayı bekleniyor', onaylandi: 'Onaylandı', reddedildi: 'Planlama düzeltme istedi'};
  const n2OnayOku = ad => ((S.plan && S.plan.onay) || {})[ad] || {durum: 'acik', teklif: {}};
  const n2OnayYaz = ad => { const o = (S.plan.onay = S.plan.onay || {}); return o[ad] = o[ad] || {durum: 'acik', teklif: {}}; };
  const n2Duzenlenir = ad => ['acik', 'reddedildi'].includes(n2OnayOku(ad).durum);
  const talepSay = () => (S.plan && S.plan.onay ? Object.values(S.plan.onay).filter(o => o.durum === 'gonderildi').length : 0);
  // Bir istasyonun teklif değerleri ve uyarıları
  function n2TeklifOzet(b) {
    const h = hesapla(b), o = n2OnayOku(b.ad), D = durumlar();
    const satir = h.satir.filter(s => !gizliKisi(s.k)).map(s => { const k = s.k, tutar = !s.nobetYok && !((D[k.durum] || {}).disarida), mevcut = sayi(k.planlanan), tek = tutar ? (o.teklif[k.id] != null ? sayi(o.teklif[k.id]) : mevcut) : 0, ust = s.azami > 0 ? s.azami : (k.sinif === 'isci' ? s.hedef : 0);
      return {s, k, tutar, mevcut, tek, ust, asim: tutar && tek > ust + 1e-9, degisti: tutar && Math.abs(tek - mevcut) > 1e-9}; }).sort((x, y) => (NB_SIRA[x.s.grup] - NB_SIRA[y.s.grup]) || personelSirala(x.k, y.k));
    const toplam = satir.reduce((a, x) => a + x.tek, 0), mevcutT = satir.reduce((a, x) => a + (x.tutar ? x.mevcut : 0), 0);
    return {h, o, satir, toplam, mevcutT, fark: Math.abs(toplam - h.ihtiyac) < 0.05 ? 0 : Math.round((toplam - h.ihtiyac) * 100) / 100, asimSay: satir.filter(x => x.asim).length, degisenSay: satir.filter(x => x.degisti).length};
  }
  function n2PlanHtml(b) {
    const ist = S.rol === 'istasyon';
    if (ist && !n2Onayli()) return `<div class="ap-card ap-empty"><h2>Planlama henüz onaylanmadı</h2><p>${ayEtiket()} planlaması planlama birimi tarafından <b>kesinleştirilip istasyonlara gönderilince</b> burada görünecek; nöbet sayılarını düzenleyip planlamaya geri gönderirsiniz.</p></div>`;
    const T = n2TeklifOzet(b), h = T.h, o = T.o, D = durumlar(), duz = ist && n2Duzenlenir(b.ad) && n2Duz();
    const durumMetin = s => { const k = s.k;
      if (k._gelen) return `Geçici görevli (${esc(k.birim)} kadrosundan)`;
      if (aileHek(k)) return 'Aile hekimliğinde';
      if ((D[k.durum] || {}).disarida && k.gorev && (k.gorev.hedef || k.gorev.yer)) return `Başka yerde görevli: ${esc(k.gorev.hedef || k.gorev.yer)}`;
      if (izinAyGun(k) > 0 && !s.nobetYok) return `İzinli (${fmt(izinAyGun(k))} gün)`;
      if (s.nobetYok) return 'Nöbet tutmaz';
      return 'Nöbet tutar'; };
    const sat = T.satir.map(x => `<tr><td>${esc(x.k.ad)}</td><td>${esc(bransAd(x.k))}</td><td>${durumMetin(x.s)}</td><td>${x.tutar ? esc(NB_AD[x.s.grup] || '') : ''}</td><td class="num">${x.tutar ? fmt(x.mevcut) : ''}</td>
      <td class="num">${!x.tutar ? '' : duz ? `<input class="ap-in n ${x.asim ? 'n2e' : ''}" type="number" min="0" step="0.01" data-n2="teklif" data-id="${x.k.id}" value="${x.tek}" title="${x.asim ? 'Üst sınır ' + fmt(x.ust) + ' nöbet' : ''}">` : `<b class="${x.degisti ? 'n2d' : ''}">${fmt(x.tek)}</b>`}</td><td class="num">${x.tutar && x.degisti ? `<span class="${x.tek > x.mevcut ? 'n2art' : 'n2eks'}">${x.tek > x.mevcut ? '+' : ''}${fmt(x.tek - x.mevcut)}</span>` : ''}</td></tr>`).join('');
    const durumRozet = `<span class="ap-badge ${o.durum === 'onaylandi' ? 'ap-b-kesin' : o.durum === 'reddedildi' ? 'ap-b-taslak' : ''}">${ONAY_AD[o.durum]}</span>`;
    const uyari = [T.fark ? `Toplam ${fmt(T.toplam)}, gereken ${h.ihtiyac} (${T.fark > 0 ? '+' : ''}${fmt(T.fark)})` : '', T.asimSay ? `${T.asimSay} kişide üst sınır aşıldı` : ''].filter(Boolean);
    return `${!ist ? `<div class="ap-card" style="border-color:var(--ap-warn);background:var(--ap-warnbg)"><span class="ap-note">Planlama birimi görünümü. İstasyon sorumlusu bu bölümü yalnızca plan <b>Kesinleştirildiğinde</b> görür (şu an: <b>${S.plan.durum === 'taslak' ? 'Taslak' : S.plan.durum === 'kesin' ? 'Kesinleşti' : 'Kilitli'}</b>), nöbet sayılarını düzenleyip size geri gönderir; onayınızı <b>İstasyon talepleri</b> sayfasından verirsiniz. Sağlık nedenleri (rapor, doğum, muafiyet) istasyon sorumlusuna gösterilmez.</span></div>` : ''}
      ${o.durum === 'reddedildi' && o.ret ? `<div class="ap-card" style="border-color:var(--ap-bad)"><b>Planlama düzeltme istedi:</b> ${esc(o.ret)}</div>` : ''}
      <div class="ap-card"><h2>${esc(b.ad)} — ${ayEtiket()} planlaması ${durumRozet}</h2>
      ${ist ? `<div class="ap-row" style="margin:8px 0 10px">${duz ? `<button class="ap-btn pri" data-act="n2-gonder">Planlamaya gönder</button>${T.degisenSay ? `<button class="ap-btn" data-act="n2-teklif-sifirla">Değişiklikleri geri al</button>` : ''}` : o.durum === 'gonderildi' ? '<span class="ap-note">Planınız planlama birimine gönderildi; onay bekleniyor.</span>' : o.durum === 'onaylandi' ? '<button class="ap-btn pri" data-act="n2-sekme" data-v="istek">İstek takvimine geç →</button>' : ''}</div>` : ''}
      <div class="ap-sum ap-sum1" style="margin-bottom:10px"><div><b>${fmt(T.toplam)} / ${h.ihtiyac}</b><span>${T.degisenSay ? 'Sizin planınız / gereken nöbet' : 'Yazılan / gereken nöbet'}</span></div><div><b>${T.satir.filter(x => x.tutar).length}</b><span>Nöbet tutan kişi</span></div>${[['es', 'Ekip şefi'], ['ysp', 'YSP'], ['sur', 'Sürücü']].map(([k, ad]) => `<div><b>${fmt(h.slot.dem[k] - Math.max(0, h.acikM[k]))}/${fmt(h.slot.dem[k])}</b><span>${ad} (planlamadaki)</span></div>`).join('')}</div>
      ${uyari.length ? `<div class="ap-ek ap-ek-c" style="margin-bottom:8px"><b>Dikkat:</b> ${uyari.join(' · ')}</div>` : ''}
      <div class="ap-tw"><table class="ap-t"><thead><tr><th>Ad soyad</th><th>Kadro</th><th>Durum</th><th>Nöbet branşı</th><th>Planlamanın yazdığı</th><th>${duz ? 'Sizin planınız' : 'Planlanan (son)'}</th><th>Fark</th></tr></thead><tbody>${sat || '<tr><td colspan="7" class="ap-empty">Kişi yok</td></tr>'}</tbody></table></div>
      <p class="ap-note" style="margin-top:8px">Kime kaç nöbet yazılacağını ${duz ? '<b>"Sizin planınız"</b> sütunundan değiştirebilirsiniz' : 'bu sütunda görürsünüz'} (24 saatlik nöbet; 12 saatlik nöbetler 0,5). Toplam, istasyonun gereken nöbetine (${h.ihtiyac}) eşit olmalı; DOKTOR-AABT-ATT için üst sınır ${istMod(b) === 'mesai' ? 'hedef nöbetleridir' : fmt(azamiDeger(b)) + ' nöbettir'}.</p>
</div>`;
  }
  // Modül 1: istasyonlardan gelen talepler
  function talepHtml() {
    if (!S.plan) return bosHtml();
    const ists = S.plan.birimler.filter(b => b.tur === 'istasyon' && !b.ekipOf), onay = S.plan.onay || {}, duz = !salt();
    const durumlu = ists.filter(b => onay[b.ad] && onay[b.ad].durum !== 'acik' || (onay[b.ad] && Object.keys(onay[b.ad].teklif || {}).length));
    const gel = ists.filter(b => (onay[b.ad] || {}).durum === 'gonderildi');
    const kart = b => { const T = n2TeklifOzet(b), o = T.o, degisen = o.durum === 'onaylandi' && o.onceki ? T.satir.filter(x => x.tutar && o.onceki[x.k.id] && Math.abs(sayi(o.onceki[x.k.id].planlanan) - x.tek) > 1e-9).map(x => ({...x, mevcut: sayi(o.onceki[x.k.id].planlanan), degisti: true})) : T.satir.filter(x => x.degisti);
      return `<div class="ap-card"><h2>${esc(b.ad)} <span class="ap-badge ${o.durum === 'onaylandi' ? 'ap-b-kesin' : o.durum === 'reddedildi' ? 'ap-b-taslak' : ''}">${ONAY_AD[o.durum]}</span> ${o.gonderZaman ? `<span class="ap-note">${new Date(o.gonderZaman).toLocaleString('tr-TR')}</span>` : ''}</h2>
        <div class="ap-note">Toplam <b>${fmt(T.toplam)}</b> / gereken ${T.h.ihtiyac}${T.fark ? ` (<span style="color:var(--ap-bad)">${T.fark > 0 ? '+' : ''}${fmt(T.fark)}</span>)` : ''}${T.asimSay ? ` · <span style="color:var(--ap-bad)">${T.asimSay} kişide üst sınır aşıldı</span>` : ''} · ${degisen.length} kişide değişiklik</div>
        ${degisen.length ? tabloHtml(['Kişi', 'Kadro', 'Planlamanın yazdığı', 'İstasyonun önerdiği', 'Fark'], degisen.map(x => [esc(x.k.ad), esc(bransAd(x.k)), x.mevcut, x.tek, `<span class="${x.tek > x.mevcut ? 'n2art' : 'n2eks'}">${x.tek > x.mevcut ? '+' : ''}${fmt(x.tek - x.mevcut)}</span>`])) : '<p class="ap-note">Planlamadaki sayılar aynen bırakılmış.</p>'}
        ${o.durum === 'onaylandi' ? `<div class="ap-row" style="margin-top:8px"><span class="ap-note">Onaylandı${o.onayZaman ? ' · ' + new Date(o.onayZaman).toLocaleString('tr-TR') : ''}: nöbet sayıları kesin plana işlendi.</span><button class="ap-btn dng" data-act="talep-geri-al" data-v="${esc(b.ad)}" ${duz ? '' : 'disabled'} title="${o.onceki ? 'Onaydan önceki nöbet sayıları geri yüklenir; istasyon tekrar onay bekler' : 'Bu onay eski sürümde yapıldı: kilitler açılır ve planlanan nöbetler otomatik yeniden hesaplanır; istasyon tekrar onay bekler'}">Onayı geri al</button></div>` : ''}
        ${o.durum === 'gonderildi' ? `<div class="ap-row" style="margin-top:8px"><button class="ap-btn pri" data-act="talep-onayla" data-v="${esc(b.ad)}" ${duz ? '' : 'disabled'}>Onayla (kesin plana işle)</button><input class="ap-in" id="ap-talep-not-${esc(b.ad)}" placeholder="Reddederseniz istasyona not yazın" style="min-width:260px"><button class="ap-btn dng" data-act="talep-reddet" data-v="${esc(b.ad)}" ${duz ? '' : 'disabled'}>Düzeltme iste</button></div>` : ''}</div>`; };
    return `<div class="ap-card"><h2>İstasyon talepleri — ${ayEtiket()}</h2>
      <p class="ap-note">Plan <b>Kesinleştirilince</b> istasyonlara gönderilir; istasyon sorumluları kime kaç nöbet yazılacağını değiştirip size geri gönderir. Onayladığınız liste, o istasyonun kesin planının yerine geçer (nöbet sayıları kilitlenir). Plan durumu: <b>${S.plan.durum === 'taslak' ? 'Taslak (istasyonlara gönderilmedi)' : S.plan.durum === 'kesin' ? 'Kesinleşti (istasyonlarda)' : 'Kilitli'}</b>. Onay bekleyen: <b>${gel.length}</b> · onaylanan: <b>${ists.filter(b => (onay[b.ad] || {}).durum === 'onaylandi').length}</b> / ${ists.length}.</p>
      ${gel.length > 1 ? `<div class="ap-row"><button class="ap-btn pri" data-act="talep-hepsi" ${duz ? '' : 'disabled'}>Gönderilen ${gel.length} istasyonu onayla</button></div>` : ''}</div>
      ${durumlu.map(kart).join('') || '<div class="ap-card ap-empty">Henüz istasyondan gelen bir talep yok.</div>'}`;
  }
  // Onayı geri alma: kişilerin onay öncesi nöbet sayıları ve kilit durumları geri yüklenir; istasyon yeniden "onay bekliyor" durumuna döner
  function talepGeriAl(b) {
    const o = n2OnayYaz(b.ad), onceki = o.onceki; let n = 0;
    S.toplu = true;
    try {
      if (onceki) Object.entries(onceki).forEach(([id, v]) => { const k = S.plan.kayitlar.find(y => y.id === id); if (!k) return; k.planlanan = v.planlanan; k.kilit = !!v.kilit; n++; });
      else S.plan.kayitlar.filter(k => k.birim === b.ad).forEach(k => { if (k.kilit) { k.kilit = false; n++; } });      // eski onay: onaydan önceki değerler kayıtlı değil; kilitler açılır, planlanan nöbetler otomatik yeniden hesaplanır
    }
    finally { S.toplu = false; }
    o.durum = 'gonderildi'; o.onayZaman = null; o.onceki = null;
    logla('İstasyon planı onayı geri alındı', `${b.ad}: ${n} kişi eski değerine döndü`); otoHesapla(); kaydet();
    return n;
  }
  // Onay: istasyonun önerdiği nöbet sayıları kesin plana işlenir ve kilitlenir
  function talepOnayla(b) {
    const o = n2OnayYaz(b.ad), T = n2TeklifOzet(b); let n = 0; o.onceki = {};      // geri alabilmek için onay öncesi değerler saklanır
    S.toplu = true;
    try { T.satir.forEach(x => { if (!x.tutar) return; const k = S.plan.kayitlar.find(y => y.id === x.k.id); if (!k) return; o.onceki[k.id] = {planlanan: k.planlanan, kilit: !!k.kilit}; k.planlanan = x.tek; k.kilit = true; n++; }); }
    finally { S.toplu = false; }
    o.durum = 'onaylandi'; o.onayZaman = Date.now(); o.ret = '';
    logla('İstasyon planı onaylandı', `${b.ad}: ${n} kişi, ${T.degisenSay} değişiklik`); otoHesapla(); kaydet();
  }

  // ---- istek takvimi: kişi × gün matrisi ----
  function n2IstekHtml(b) {
    const dp = n2Depo(b.ad), G = n2Girdi(b), N = NC.gunSayisi(S.y, S.m), duz = n2Duz(), H = NC.hazirla(G.girdi, G.kural);
    const bas = [...Array(N)].map((_, i) => { const d = i + 1, g = new Date(Date.UTC(S.y, S.m - 1, d)).getUTCDay(); return `<th class="n2d ${g === 0 || g === 6 ? 'hs' : ''}">${d}<br><span class="ap-note">${GUN_AD[g]}</span></th>`; }).join('');
    const sat = G.girdi.kisiler.map((k, i) => {
      const p = H.byId.get(k.id), tarihsiz = (k.izinGun || 0) > 0 && !(k.izin || []).length;
      const hucre = [...Array(N)].map((_, j) => { const d = j + 1, iz = p.izin.has(d), on = p.once.has(d) && !iz, is = p.istek.has(d); return `<td class="n2c ${iz ? 'iz' : is ? 'is' : on ? 'on' : ''}" ${iz || !duz ? '' : `data-act="n2-istek" data-id="${k.id}" data-v="${d}"`} title="${iz ? 'İzinli' : is ? 'Nöbet istemiyor' : on ? 'Yıllık izin öncesi boşluk (otomatik)' : ''}">${iz ? 'İ' : is ? '✕' : on ? '·' : ''}</td>`; }).join('');
      return `<tr><td class="n2n">${esc(k.ad)} ${k.gelen ? '<span class="ap-tag ap-t-ih">gelen</span>' : ''}${tarihsiz ? ` <span class="ap-tag ap-t-fz" title="Bu kişinin ${fmt(k.izinGun)} gün izni var ama tarih aralığı bilinmiyor; aşağıdan izin aralığı ekleyin">izin tarihi yok</span>` : ''}<div class="ap-note">${k.brans || ''} · ${fmt(k.planlanan)} nöbet</div></td>${hucre}</tr>`;
    }).join('');
    const kisiSec = G.girdi.kisiler.map(k => `<option value="${k.id}">${esc(k.ad)}</option>`).join('');
    const izinler = G.girdi.kisiler.flatMap(k => (dp.izin[k.id] || []).map((z, i) => ({k, z, i})));
    return `<div class="ap-card"><h2>İstek takvimi — nöbet istenmeyen günler</h2>
      <p class="ap-note">Bir hücreye tıklayarak o kişinin <b>nöbet istemediği günü</b> işaretleyin (✕), tekrar tıklayınca kalkar. <b>İ</b>: izinli gün (ASOS'tan gelen izinler ve aşağıdan eklenenler); <b>·</b>: yıllık izin öncesi ${G.kural.izinOnce} günlük otomatik boşluk. Otomatik liste önce bu günleri ve izinleri gözetir; mümkün olmazsa istek günü sona kalır ve denetimde uyarı verir.</p>
      <div class="ap-toolbar" style="margin:8px 0 10px"><button class="ap-btn" data-act="n2-istek-temizle" ${duz ? '' : 'disabled'}>Tüm istekleri temizle</button><button class="ap-btn pri" data-act="n2-sekme" data-v="liste">Nöbet listesine geç →</button>
        <span style="border-left:1px solid var(--ap-line);height:28px;margin:0 4px"></span><b>İzin aralığı ekle</b><select class="ap-sel" id="ap-n2-izkisi" title="Yıllık izin başlamadan önceki ${G.kural.izinOnce} gün nöbet yazılmaz, izin süresince de yazılmaz. ASOS'tan tarihli gelen izinler otomatik tanınır.">${kisiSec}</select><label class="ap-note">Başlangıç <input type="date" class="ap-in" id="ap-n2-izbas"></label><label class="ap-note">Bitiş <input type="date" class="ap-in" id="ap-n2-izbit"></label><button class="ap-btn pri" data-act="n2-izin-ekle" ${duz ? '' : 'disabled'}>Ekle</button></div>
      ${izinler.length ? `<div style="margin-top:8px">${izinler.map(({k, z, i}) => `<div class="ap-row"><b>${esc(k.ad)}</b> ${z.bas.split('-').reverse().join('.')} – ${z.bit.split('-').reverse().join('.')} <button class="ap-btn sm dng" data-act="n2-izin-sil" data-id="${k.id}" data-v="${i}" ${duz ? '' : 'disabled'}>Sil</button></div>`).join('')}</div>` : ''}</div>


      <div class="ap-card"><div class="ap-tw"><table class="ap-t n2"><thead><tr><th style="text-align:left">Personel</th>${bas}</tr></thead><tbody>${sat}</tbody></table></div>
</div>`;
  }

  // ---- nöbet listesi ----
  const n2Ad = (G, id) => { const k = G.girdi.kisiler.find(x => x.id === id); return k ? k.ad : ''; };
  function n2ListeHtml(b) {
    const {G, H, L, d} = n2Deneti(b), dp = n2Depo(b.ad), N = H.N, duz = n2Duz(), ks = G.girdi.kisiler, K = G.kural, kap = NC.kapasiteAnalizi(G.girdi, G.kural);
    const hata = new Map(); d.ihlal.forEach(i => { const a = `${i.gun}|${i.kisi == null ? '' : i.kisi}`; hata.set(a, (hata.get(a) || '') + i.mesaj + '\n'); if (i.yuva) hata.set(`${i.gun}||${i.yuva}`, i.mesaj); });
    const secenek = (yuva, tip, sec) => `<option value=""></option>` + ks.filter(k => (k.grup === 'isci') === (tip === 'surG' || tip === 'surA') && NC.YETENEK[k.grup].includes(yuva)).map(k => `<option value="${k.id}" ${k.id === sec ? 'selected' : ''}>${esc(k.ad)}</option>`).join('');
    const hucre = (gun, tip) => { const yuva = tip === 'surG' || tip === 'surA' ? 'sur' : tip, id = L[gun][tip], e = (id != null && hata.get(`${gun}|${id}`)) || (id == null && hata.get(`${gun}||${yuva}`) && (tip === 'sur' || tip === 'es' || tip === 'ysp') ? 'Boş' : '');
      const bl = L[gun].bol && L[gun].bol[tip];
      const bolHtml = bl ? `<div class="ap-note n2bol" title="İzin / rapor dönüşü: aynı gün dönen iki kişi bu nöbeti böler (saatine göre kısmi nöbet sayılır)">+ ${esc(n2Ad(G, bl.id))} <select class="ap-sel" data-n2="bol" data-g="${gun}" data-t="${tip}" ${duz ? '' : 'disabled'}>${[[12, '12/12'], [8, '16/8 (sonra 8 sa)'], [16, '8/16 (sonra 16 sa)'], ['', 'bölmeyi kaldır']].map(([v, t]) => `<option value="${v}" ${String(v) === String(bl.saat) ? 'selected' : ''}>${t}</option>`).join('')}</select></div>` : '';
      return `<td class="${e ? 'n2e' : ''}" title="${esc(e)}"><select class="ap-sel n2s" data-n2="hucre" data-g="${gun}" data-t="${tip}" ${duz ? '' : 'disabled'}>${secenek(yuva, tip, id)}</select>${bolHtml}</td>`; };
    const sat = [...Array(N)].map((_, i) => { const g = i + 1, w = new Date(Date.UTC(S.y, S.m - 1, g)).getUTCDay(); return `<tr class="${w === 0 || w === 6 ? 'hs' : ''} ${(G.girdi.tatil || []).includes(g) ? 'tt' : ''}"><td class="num">${g}</td><td>${GUN_AD[w]}</td>${hucre(g, 'es')}${hucre(g, 'ysp')}${hucre(g, 'sur')}${ks.some(k => k.grup === 'isci') ? hucre(g, 'surG') + hucre(g, 'surA') : ''}</tr>`; }).join('');
    const sayim = ks.map(k => { let a = 0, y = 0; for (let g = 1; g <= N; g++) { const B = L[g].bol || {}; ['es', 'ysp', 'sur'].forEach(t => { if (L[g][t] === k.id) a += B[t] ? (24 - B[t].saat) / 24 : 1; if (B[t] && B[t].id === k.id) a += B[t].saat / 24; }); } for (let g = 1; g <= N; g++) ['surG', 'surA'].forEach(t => { if (L[g][t] === k.id) y++; }); return {k, birim: Math.round((a + y / 2) * 100) / 100, hedef: (k.adet || 0) + (k.yarim || 0) / 2}; });
    const ozetIh = Object.entries(d.say).filter(([t]) => t !== 'adet').map(([t, n]) => `${IHLAL_AD[t]}: <b>${n}</b>`).join(' · ');
    const kisiGoruntu = S.n2.gorunum === 'kisi';
    const kisiTablo = () => {
      const bas = [...Array(N)].map((_, i) => `<th class="n2d">${i + 1}</th>`).join('');
      return `<div class="ap-tw"><table class="ap-t n2"><thead><tr><th style="text-align:left">Personel</th>${bas}<th>Liste</th><th>Hedef</th></tr></thead><tbody>${sayim.map(({k, birim, hedef}) => {
        const p = H.byId.get(k.id), c = [...Array(N)].map((_, i) => { const g = i + 1; let x = ''; ['es', 'ysp', 'sur', 'surG', 'surA'].forEach(t => { if (L[g][t] === k.id) x = NC.KOD[t] + (L[g].bol && L[g].bol[t] ? '½' : ''); if (L[g].bol && L[g].bol[t] && L[g].bol[t].id === k.id) x = NC.KOD[t] + '½'; }); return `<td class="n2c ${x ? 'nb' : p.izin.has(g) ? 'iz' : p.istek.has(g) ? 'is' : ''}">${x || (p.izin.has(g) ? 'İ' : p.istek.has(g) ? '✕' : '')}</td>`; }).join('');
        return `<tr><td class="n2n">${esc(k.ad)}</td>${c}<td class="num"><b>${fmt(birim)}</b></td><td class="num ${Math.abs(birim - hedef) > 0.01 ? 'n2e' : ''}">${fmt(hedef)}</td></tr>`; }).join('')}</tbody></table></div><p class="ap-note">E: ekip şefi · Y: YSP · S: sürücü (24 sa.) · G: sürücü gündüz · A: sürücü gece (12 sa. işçi)</p>`; };
    const lSek = [['liste', 'Nöbet listesi'], ['kisi', 'Kişi başına nöbet']], la = lSek.some(x => x[0] === S.n2.altSekme) ? S.n2.altSekme : 'liste';
    const lNav = `<div class="ap-subnav ap-noprint">${lSek.map(([v, t]) => `<button class="${la === v ? 'on' : ''}" data-act="n2-alt" data-v="${v}">${t}</button>`).join('')}</div>`;
    const lKisi = `<div class="ap-card"><h2>Kişi başına nöbet</h2>${tabloHtml(['Personel', 'Branş', 'Hedef (Modül 1)', 'Listede'], sayim.map(({k, birim, hedef}) => [esc(k.ad), k.brans || '', hedef, `<span class="${Math.abs(birim - hedef) > 0.01 ? 'n2e' : ''}">${fmt(birim)}</span>`]))}</div>`;
    const lListe = `<div class="ap-card"><h2>Otomatik nöbet listesi</h2>
      <div class="ap-row"><label class="ap-note">İki nöbet arası en az <input class="ap-in n" type="number" min="0" max="5" data-n2="kural" data-k="minAra" value="${K.minAra}"> gün boş</label>
      <label class="ap-note">en fazla <input class="ap-in n" type="number" min="1" max="15" data-n2="kural" data-k="maxAra" value="${K.maxAra}"> gün</label>
      <label class="ap-note">yıllık izin öncesi <input class="ap-in n" type="number" min="0" max="10" data-n2="kural" data-k="izinOnce" value="${K.izinOnce}"> gün boşluk</label>
      <label class="ap-note"><input type="checkbox" data-n2="kural" data-k="surGunAsiri" ${K.surGunAsiri ? 'checked' : ''}> sürücüye gün aşırı 3 nöbet (24 sa.) yazma</label>
      <label class="ap-note"><input type="checkbox" data-n2="kural" data-k="isciGece" ${K.isciGece ? 'checked' : ''}> işçiye art arda 3 gece yazma</label></div>
      <div class="ap-row" style="margin-top:10px"><button class="ap-btn pri" data-act="n2-uret" ${duz && !S.n2.calisiyor ? '' : 'disabled'}>${S.n2.calisiyor ? 'Oluşturuluyor…' : '⚙ Otomatik nöbet listesi oluştur'}</button>
      <button class="ap-btn" data-act="n2-liste-temizle" ${duz && dp.liste ? '' : 'disabled'}>Listeyi temizle</button>
      <button class="ap-btn" data-act="n2-excel" ${dp.liste ? '' : 'disabled'}>Excel çıktısı</button>
      <span class="ap-sp"></span><button class="ap-btn ${kisiGoruntu ? '' : 'pri'}" data-act="n2-gorunum" data-v="yuva">Gün görünümü</button><button class="ap-btn ${kisiGoruntu ? 'pri' : ''}" data-act="n2-gorunum" data-v="kisi">Kişi görünümü</button></div>
      ${kap.toplam > 0 ? `<div class="ap-note" style="margin-top:8px;color:var(--ap-bad)"><b>Bu kadroyla ${kap.toplam} nöbet boş kalacak:</b> ${Object.entries(kap.bos).map(([k, n]) => `${NC.YUVA_AD[k]} nöbet branşında ${n}`).join(', ')}. O nöbet branşını tutabilecek yeterli personel yok (ekip şefi: doktor/AABT; sürücü: işçi ya da sürücü teyitli AABT/ATT). Personel isteyin ya da Modül 1'de kişilerin nöbet branşlarını gözden geçirin.</div>` : ''}
      <div style="margin-top:8px">${dp.liste ? `Ceza puanı <b>${d.toplam}</b> · ${ozetIh || '<span style="color:var(--ap-ok)"><b>Hiç kural ihlali yok</b></span>'} ${d.say.adet ? `· Nöbet sayısı farkı olan kişi: <b>${d.say.adet}</b>` : ''}` : '<span class="ap-note">Henüz liste yok. Önce istek takvimini doldurun, sonra butona basın.</span>'}</div></div>
      <div class="ap-card">${kisiGoruntu ? kisiTablo() : `<div class="ap-tw"><table class="ap-t n2l"><thead><tr><th>Gün</th><th></th><th>Ekip şefi</th><th>YSP</th><th>Sürücü (24 sa.)</th>${ks.some(k => k.grup === 'isci') ? '<th>Sürücü gündüz (12)</th><th>Sürücü gece (12)</th>' : ''}</tr></thead><tbody>${sat}</tbody></table></div>`}</div>`;
    return lNav + (la === 'kisi' ? lKisi : lListe);
  }

  // ---- denetim ve öneriler ----
  function n2DenetimHtml(b) {
    const {G, H, L, d} = n2Deneti(b), dp = n2Depo(b.ad);
    if (!dp.liste) return '<div class="ap-card ap-empty">Önce nöbet listesi oluşturun ya da elle doldurun.</div>';
    if (!S.n2.oneri) S.n2.oneri = NC.oneriler(L, G.girdi, G.kural, 40);
    const O = S.n2.oneri, duz = n2Duz();
    const kart = (o, i) => `<div class="ap-card" style="margin:0 0 10px"><div><span class="ap-tag ${o.ihlal.agirlik >= 700 ? 'ap-t-ih' : 'ap-t-fz'}">${IHLAL_AD[o.ihlal.tur]}</span> ${esc(o.ihlal.mesaj)}</div>
      ${o.secenekler.length ? o.secenekler.map((s, j) => `<div class="ap-row" style="margin-top:6px"><span>${s.gun}. gün <b>${NC.YUVA_AD[s.yuva === 'surG' || s.yuva === 'surA' ? 'sur' : s.yuva]}${s.yuva === 'surG' ? ' (gündüz)' : s.yuva === 'surA' ? ' (gece)' : ''}</b>: ${esc(n2Ad(G, s.eski) || 'boş')} → <b>${esc(s.yeniAd)}</b></span><span class="ap-note">ceza −${s.kazanc}</span><button class="ap-btn sm pri" data-act="n2-uygula" data-v="${i}:${j}" ${duz ? '' : 'disabled'}>Uygula</button></div>`).join('') : '<div class="ap-note" style="margin-top:6px">Tek atama değişikliğiyle düzelen seçenek yok; elle takas gerekebilir ya da istek/izin kısıtlarını gözden geçirin.</div>'}</div>`;
    const adetIh = d.ihlal.filter(i => i.tur === 'adet');
    const dSek = [['ozet', 'Denetim özeti'], ['oner', `Öneriler (${O.oneriler.length})`]], da = dSek.some(x => x[0] === S.n2.altSekme) ? S.n2.altSekme : 'ozet';
    const dNav = `<div class="ap-subnav ap-noprint">${dSek.map(([v, t]) => `<button class="${da === v ? 'on' : ''}" data-act="n2-alt" data-v="${v}">${t}</button>`).join('')}</div>`;
    const dOzet = `<div class="ap-card"><h2>Denetim özeti</h2><p>Toplam ceza puanı <b>${d.toplam}</b> · ihlal sayısı <b>${d.ihlal.length}</b></p>
      <div class="ap-row">${Object.entries(d.say).map(([t, n]) => `<span class="ap-tag ${['eksik', 'yetenek', 'izin', 'cakisma', 'dinlenme'].includes(t) ? 'ap-t-ih' : 'ap-t-fz'}">${IHLAL_AD[t]}: ${n}</span>`).join('') || '<span class="ap-tag ap-t-ok">Kural ihlali yok</span>'}</div>
      ${adetIh.length ? `<div class="ap-note" style="margin-top:8px">Nöbet sayısı farkı: ${adetIh.map(i => esc(i.mesaj)).join(' · ')}</div>` : ''}</div>`;
    const dOner = `<div class="ap-card"><h2>Öneriler (${O.oneriler.length})</h2><p class="ap-note">Her ihlal için, atamayı başka kişiyle değiştirdiğinde toplam cezayı en çok düşüren seçenekler. "Uygula" listeyi değiştirir ve denetim yenilenir.</p>${O.oneriler.map(kart).join('') || '<span class="ap-note">Önerilecek bir düzeltme yok.</span>'}</div>`;
    return dNav + (da === 'oner' ? dOner : dOzet);
  }

  // ---- paylaşım / çıktı ----
  function n2PaketHtml(b) {
    const dp = n2Depo(b.ad);
    return `<div class="ap-card"><h2>ASOS'a giriş için çıktı</h2><p class="ap-note">Nöbet listeleri ASOS'a girilir; oradan alınan <b>Nöbet Listesi Raporu</b>, Modül 1'de sürücülük tespiti ve arşiv istatistikleri için kullanılır. Modül 2 çıktısı Excel olarak (gün × nöbet branşı ve kişi × gün sayfaları) alınır.</p>
      <div class="ap-row"><button class="ap-btn pri" data-act="n2-excel" ${dp.liste ? '' : 'disabled'}>Excel çıktısı</button></div></div>`;
  }
  function n2Excel(b) {
    const {G, H, L} = n2Deneti(b), N = H.N, wb = XLSX.utils.book_new(), ad = id => (id == null ? '' : n2Ad(G, id));
    const g = [['Gün', 'Tarih', 'Ekip şefi', 'YSP', 'Sürücü (24 sa.)', 'Sürücü gündüz', 'Sürücü gece']];
    const hc = (i, t) => { const b = L[i].bol && L[i].bol[t]; return b ? `${ad(L[i][t])} (${24 - b.saat} sa) / ${ad(b.id)} (${b.saat} sa)` : ad(L[i][t]); };
    for (let i = 1; i <= N; i++) g.push([i, `${C.pad(i)}.${C.pad(S.m)}.${S.y}`, hc(i, 'es'), hc(i, 'ysp'), hc(i, 'sur'), ad(L[i].surG), ad(L[i].surA)]);
    // hafta sonu: turuncu, resmî tatil / bayram: kırmızı tonu (hem gün listesinde hem kişi listesinde)
    const tatil = new Set(G.girdi.tatil || []), renk = d => tatil.has(d) ? 'F8B4B4' : (H.ozel[d] ? 'FDD9A0' : null);
    const boya = (ws, r, c1, c2, rgb) => { for (let c = c1; c <= c2; c++) { const a = XLSX.utils.encode_cell({r, c}); if (!ws[a]) ws[a] = {t: 's', v: ''}; ws[a].s = {fill: {patternType: 'solid', fgColor: {rgb}}}; } };
    const wsG = XLSX.utils.aoa_to_sheet(g); for (let i = 1; i <= N; i++) { const rg = renk(i); if (rg) boya(wsG, i, 0, 6, rg); }
    XLSX.utils.sheet_add_aoa(wsG, [['Renkler: turuncu = hafta sonu · kırmızı = resmî tatil / bayram']], {origin: {r: N + 2, c: 0}});
    XLSX.utils.book_append_sheet(wb, wsG, 'Gün listesi');
    const k = [['Personel', ...[...Array(N)].map((_, i) => i + 1), 'Toplam']];
    G.girdi.kisiler.forEach(p => { const r = [p.ad]; let t = 0; for (let i = 1; i <= N; i++) { let x = ''; const B = L[i].bol || {}; ['es', 'ysp', 'sur', 'surG', 'surA'].forEach(s => { if (L[i][s] === p.id) { x = NC.KOD[s] + (B[s] ? '½' : ''); t += s === 'surG' || s === 'surA' ? .5 : B[s] ? (24 - B[s].saat) / 24 : 1; } if (B[s] && B[s].id === p.id) { x = NC.KOD[s] + '½'; t += B[s].saat / 24; } }); r.push(x); } r.push(Math.round(t * 100) / 100); k.push(r); });
    const wsK = XLSX.utils.aoa_to_sheet(k); for (let d = 1; d <= N; d++) { const rg = renk(d); if (rg) boya(wsK, 0, d, d, rg), k.forEach((_, ri) => { if (ri) boya(wsK, ri, d, d, rg); }); }
    XLSX.utils.book_append_sheet(wb, wsK, 'Kişi listesi');
    xlsxIndir(wb, `${b.ad}-Nobet-Listesi-${S.y}-${C.pad(S.m)}.xlsx`);
  }

  // ---- Kullanım kılavuzu ----
  function kilavuzHtml() {
    const b = (baslik, icerik, acik) => `<details ${acik ? 'open' : ''} style="margin:6px 0;border:1px solid var(--ap-line,#d0d7de);border-radius:8px;padding:6px 10px"><summary style="cursor:pointer;font-weight:700;padding:3px 0">${baslik}</summary><div style="padding:4px 2px 8px;line-height:1.6;font-size:13.5px">${icerik}</div></details>`;
    return `<div class="ap-modal"><div style="max-width:980px"><div class="ap-row" style="justify-content:space-between"><h2 style="margin:0">Kullanım kılavuzu</h2><button class="ap-btn" data-act="modal-kapat">Kapat ✕</button></div>
      <p class="ap-note">HUSER ASHİ PLANLAMA iki modülden oluşur: <b>Modül 1 · Planlama</b> (kimin hangi istasyonda kaç nöbet tutacağı, görevlendirmeler) ve <b>Modül 2 · Nöbet listesi</b> (istasyonun gün gün nöbet çizelgesi). Başlıkları açıp kapatabilirsiniz.</p>
      ${b('1. Aylık iş akışı (özet)', `<ol><li><b>Dosyaları yükleyin</b> (her ayın 10-15'inde, bir sonraki ay için): ASOS'tan <b>EKİP Personel Listesi</b>, <b>Personel Listesi Raporu</b> ve <b>Nöbet Listesi Raporu</b>. İzin-Muafiyet Raporu isteğe bağlıdır. Dosyaları birlikte seçebilir veya sayfaya sürükleyebilirsiniz. Önizlemeyi kontrol edip <i>Uygula</i> deyin.</li>
        <li><b>Pano</b> › <i>Tüm planlamayı oluştur</i>: açığı olan istasyonların personeli geri çağrılır, nöbetler hesaplanır, rotasyon önerileri görevlendirme olarak uygulanır. Sonuçları <b>İstasyon</b> ve <b>Görevlendirme</b> sayfalarında kontrol edip elle düzeltin.</li>
        <li>Plan durumunu <b>Kesinleştir (istasyonlara gönder)</b> yapın. İstasyon sorumluları Modül 2'de planlarını görür, nöbet sayılarını düzenleyip size geri gönderir; <b>İstasyon talepleri</b> sayfasından onaylarsınız.</li>
        <li>İstasyonlar Modül 2'de <b>istek takvimini</b> doldurur, <b>nöbet listesini</b> oluşturur ve <b>Denetim</b> ile kural ihlallerini giderir.</li>
        <li>Çıktıları alın: istasyon bazında <b>Görüntü (PNG)</b> / <b>Excel</b> veya Pano'dan <b>Tüm istasyonlar Excel (tek dosya)</b>.</li>
        <li>Ay bitince <b>Arşiv</b> sayfasından ayı arşive kaydedin; <b>Arşiv istatistikleri</b> geçmiş aylardan raporlar üretir.</li></ol>`, true)}
      ${b('2. Roller ve yetkiler', `<ul><li><b>Yönetici:</b> her şeyi yapar; ayarlar, arşiv silme, yedek ve kilit.</li><li><b>Planlayıcı:</b> planlama birimi; Modül 1'in tamamı ve sağlık bilgileri, arşiv silme.</li><li><b>İstasyon sorumlusu:</b> yalnızca kendi istasyonu; Modül 2 ve plan "kesin" olduktan sonra kendi istasyonunun planı. Sağlık bilgisi göremez.</li><li><b>Salt okur:</b> görüntüler, değiştiremez.</li></ul>
        <p>Bu ay ve sonraki aylar düzenlenebilir; <b>önceki aylar salt okunurdur</b> (arşiv görünümü). Aylar arası geçiş üst çubuktaki ‹ › düğmeleriyle yapılır.</p>`)}
      ${b('3. Pano', `<ul><li>Kartlar: açık istasyon, ekip OF (kapalı), aktif kayıt, ihtiyaç, kapasite, planlanan, personel önerilen, fazla nöbetle dönen, elle karar gereken istasyonlar. Karta tıklayınca istasyonlar süzülür.</li><li><b>Tüm planlamayı oluştur:</b> tek tuşla geri çağırma + nöbet hesabı + rotasyon görevlendirmesi. Kilitli değerler korunur.</li><li><b>Planlananı yeniden hesapla:</b> yalnız nöbet sayılarını yeniden hesaplar.</li><li><b>Bu ayın planını sıfırla:</b> bu ayın planını (kişiler, nöbetler, görevlendirmeler, onaylar, Modül 2 listeleri) tamamen siler; arşiv ve diğer aylar kalır. Kilitli ya da geçmiş ayda yapılamaz. Tüm aylar ve arşiv için Ayarlar › Yedek ve sıfırlama bölümündeki <i>Tüm planları ve arşivi sıfırla</i> (yalnız yönetici, SIFIRLA yazılarak onaylanır).</li><li><b>Tüm istasyonlar Excel (tek dosya):</b> her istasyon ayrı sayfada; sütunlar yüklenen örnek dosyayla aynıdır (Başhekimlik, KKM ve Tanımsız İstasyon sayfaları dahil, sayfalar alfabetik; geçici görevde dışarıdakiler listelenmez, NEDEN ve KALAN AY boş bırakılır) (AD SOYAD, ÜNVAN, SRC YETKİSİ, KADRO TÜRÜ, BRANŞ, İZİN (GÜN), TAHMİNİ NÖBET, G.GÖREV DURUMU, GELDİĞİ/GİTTİĞİ İSTASYON, NEDEN, KALAN AY, YOLLUK DURUMU, AÇIKLAMA). Tahmini nöbet kişinin mesai saatinden hesaplanır (memur/doktor "7 Nöbet + 8 Saat", işçi "16 Nöbet"); planlanan nöbet sayısı yazılmaz.</li><li><b>Mod:</b> <i>Mesai karşılığı</i> (kişi yalnız mesai saatini tamamlayacak kadar nöbet tutar) veya <i>Fazla mesaili</i> (DOKTOR-AABT-ATT için kişi başı en çok N nöbet yazılabilir).</li></ul>`)}
      ${b('4. İstasyon sayfası', `<ul><li>Üstte istasyonun <b>Plan: yazılan / gereken</b> durumu, <b>Nöbet branşı dengesi</b> (ekip şefi, YSP, sürücü; listedeki planlanan nöbetlere göre dolu / açık) ve uyarılar yer alır. Plan ihtiyaca eşit ve üç nöbet branşı doluysa "İstasyon tam" görünür.</li>
        <li>Tablo: <b>Mesai</b> (izinler düşülmüş saat), <b>Hedef</b> (memur/doktorda mesai ÷ 24 tam oran, ör. 160 saat = 6,67 nöbet; işçide mesai ÷ 11 aşağı tam 12 saatlik nöbete yuvarlanır ve altında tam oran görünür; yuvarlamayı siz yaparsınız, Ayarlar'dan eski 0,5 adım yuvarlama açılabilir), <b>Azami</b>, <b>Plan</b> (elle yazılır ya da ▲▼ ile 0,5 artırılır), <b>Fark</b>.</li>
        <li><b>Elle değiştirdiğiniz değer kilitlenir</b> (🔒) ve diğer kişilerin değerleri değişmez. Kilidi kaldırırsanız otomatik hesap o kişiyi yeniden hesaplar. <i>Planı onayla (kilitle)</i> tüm değerleri kilitler, <i>Kilitleri aç</i> hepsini serbest bırakır.</li>
        <li><b>Fazlalık nöbet sırası</b> (hedefin üstüne yazılan, açığı kapatan nöbetler): sırayla 1 nöbet ATT sürücülere, 1 nöbet AABT sürücülere (kendi aralarında eşit); ikisinin payı dolduktan sonra kalan diğer branşlara. Ekip şefi yuvasına ATT giremez, yalnızca AABT ve doktor.</li><li><b>Kırmızı satır / "Mesaisi eksik kalan personel" kutusu:</b> planlanan nöbet, Mesai sütunundaki saati karşılamıyor (eksik saat yazılır).</li>
        <li><b>Geçici görev</b> sütunu: istasyon, Başhekimlik ve KKM listeden seçilir; ilçe sağlık müdürlüğü, hastane gibi yerler için <i>Diğer (yaz)…</i> seçilip yazılır.</li>
        <li><b>Açıklama</b> sütunu: her kişinin yanında ona özel not yazılır; PNG ve Excel çıktılarındaki AÇIKLAMA sütununda yer alır.</li><li><b>Ekip OF (kapalı):</b> işaretlenen istasyon kapalı sayılır; ihtiyaç 0'dır ve bu bilgi aylar arasında kalıcıdır. Açana kadar kapalı gelir.</li>
        <li><b>Görüntü (PNG)</b> ve <b>Excel</b> çıktılarında nöbet sayıları gösterilmez; aile hekimliği ve uzmanlık eğitimindeki personel yer almaz.</li></ul>`)}
      ${b('5. Görevlendirme ve rotasyon', `<ul><li><b>Personel ihtiyacı değerlendirmesi:</b> hangi istasyon kaç kişiye ihtiyaç duyuyor. "Personel öner: N kişi" etiketine tıklayınca önerilen personel görünür.</li>
        <li><b>Aylık rotasyon:</b> her istasyondan ayda <i>kota</i> kadar kişi çıkar (varsayılan 1; mesaisi dolmayan istasyonda fazlalık kadar). Sıra: önce gitmek isteyenler, sonra en uzun süredir çıkmayanlar. Hedef: önce aynı ilçe, sonra yakından uzağa. <i>Önerilen çıkışlar</i> sekmesinde seçip <i>Seçilenleri görevlendir</i> deyin.</li>
        <li><b>Görevlendirilemeyenler / önerilmeyenler:</b> 4/B personel 4 yıl dolmadan; <b>EKİP'te atama ile kadro birimi değişen personel 1 yıl dolmadan</b> (geçici görev bu kurala girmez); aile hekimliği; izinli, nöbet muaf, "gitmesin" işaretli kişiler; doktorlar yalnızca doktorlu (A1) istasyonlara ve KKM'ye; bir istasyonda nöbet branşını dolduran kişi (çıkarsa açık artacaksa); <b>işçi kendi istasyonu dışında tek işçi olarak önerilmez</b>.</li>
        <li><b>İstasyon dışı görevliler:</b> geçici görevde olup başka bir istasyona atanmamış personel (Başhekimlik, KKM, hastane vb.). Bu kişilere kendi istasyonunda nöbet yazılmaz.</li>
        <li><b>Excel'e aktar:</b> görevlendirmenin tüm bölümlerini tek dosyada indirir.</li></ul>`)}
      ${b('6. İstasyon talepleri (onay akışı)', `<p>Plan <b>Kesinleştir</b> yapıldığında istasyon sorumluları kendi istasyonlarının nöbet sayılarını düzenleyip planlamaya gönderebilir. <b>İstasyon talepleri</b> sayfasında farkları görür; <i>Onayla</i> ile nöbet sayıları kesin plana işlenir (kilitlenir), <i>Düzeltme iste</i> ile geri gönderirsiniz. Onayı <i>geri al</i> ile eski değerlere dönebilirsiniz. Bekleyen tüm istasyonları tek seferde onaylayabilirsiniz.</p>`)}
      ${b('7. Personel, özel günler, istatistik', `<ul><li><b>Personel:</b> arama, süzme, sayfalama; kişi ekleme/silme (silinen kişiler geri alınabilir). Aile hekimliği ve uzmanlık eğitimindeki personel en altta ve yalnızca planlama yetkililerine görünür.</li><li><b>Özel günler:</b> bayram, resmî tatil, idari izin, yarım gün tanımlanır; mesai saatlerini ve hafta sonu/tatil dengesini etkiler.</li><li><b>İstatistik:</b> personel dağılımı, durumlar, görevlendirmeler, plan özeti.</li></ul>`)}
      ${b('8. Modül 2 · Nöbet listesi', `<ul><li><b>Planlama:</b> istasyonun kendi planı (kime kaç nöbet).</li><li><b>İstek takvimi:</b> kişi × gün matrisinde nöbet istenmeyen günler ve izin aralıkları. İzin başlangıcından önceki günlere (varsayılan 3) nöbet yazılmaz.</li>
        <li><b>Liste:</b> <i>Otomatik nöbet listesi oluştur</i> kurallara uygun, boş yuvasız bir çizelge üretir; zor istasyonlarda 12-15 saniye sürebilir. Gün veya kişi görünümünde hücreleri elle değiştirebilirsiniz.</li>
        <li><b>Üretim kuralları:</b> her gün üç nöbet branşı (ekip şefi, YSP, sürücü) dolu; yetenek uyumu (doktor → ekip şefi, işçi → sürücü 12 saat gündüz/gece, AABT → ekip şefi/YSP, ATT → YSP/sürücü); izinli güne ve izin öncesi 3 güne nöbet yok; iki 24 saatlik nöbet arası en az 1, en çok 5 gün; sürücüye gün aşırı üst üste 3 nöbet yok; işçiye art arda 3 gece yok ve gecenin ertesi gündüz yok; <b>işçide gündüz ve gece nöbetleri eşit</b>; <b>hafta sonu ve resmî tatil nöbetleri kişiler arasında dengeli</b>.</li>
        <li><b>Denetim:</b> ihlalleri listeler; <i>Öneriler</i> sekmesi her ihlal için en iyi değişiklikleri sunar, <i>Uygula</i> ile listeye işler.</li>
        <li><b>Kadro yetersizse</b> boş yuva kalmaması için bazı kişilerin nöbet sayısı Modül 1 hedefinden farklı çıkabilir ("Nöbet sayısı farkı" olarak görünür).</li>
        <li><b>Çıktı:</b> Excel'de gün listesi ve kişi listesi; <b>hafta sonları turuncu, resmî tatiller kırmızı</b> renklidir.</li>
        <li><b>İzin / rapor dönüşü:</b> izin veya rapordan dönen personel işe başlama günü mutlaka nöbete yazılır (İzin ve Rapor Bilgileri dosyasındaki İşe Başlama Tarihi; yoksa izin bitişinin ertesi günü). Aynı gün birden fazla kişi dönüyor ve yer yoksa o nöbet <b>12/12 bölünür</b>; hücredeki ikinci seçimden <b>8/16 – 16/8</b> yapılabilir veya bölme kaldırılabilir. Bölünen nöbet saatine göre kısmi sayılır (½). Dönüş günü nöbetsiz kalan kişi Denetim'de <i>İzin / rapor dönüşü nöbetsiz</i> olarak görünür.</li></ul>`)}
      ${b('9. Çıktılar', `<ul><li><b>İstasyon PNG / Excel:</b> ad soyad, ünvan, görev durumu, izinler, geçici görev tarihleri, yolluk durumu ve kişi açıklamaları. Nöbet sayıları yer almaz.</li><li><b>Tüm istasyonlar Excel:</b> her istasyon ayrı sayfa, tek dosya.</li><li><b>Görevlendirme Excel:</b> ihtiyaç, rotasyon, görevlendirmeler, istasyon dışı görevliler.</li><li><b>Arşiv istatistikleri Excel:</b> seçilen aylar ve istasyonlar için tüm tablolar.</li></ul>`)}
      ${b('10. Arşiv ve istatistikler', `<ul><li><b>Arşiv › Yüklenen dosyalar:</b> yüklenen her dosyanın günlüğü (aynı ay için ikinci yükleme öncekini günceller). Dosyanın kendisi saklanmaz.</li><li><b>Aylara göre arşiv:</b> yıl yıl açılır liste; geçmiş ayı açarak o ayın planını salt okunur görürsünüz.</li><li><b>Aylık arşiv:</b> ayı arşive kaydeder (TC, telefon, sağlık bilgisi yazılmaz).</li>
        <li><b>Arşiv istatistikleri:</b> ay ve istasyon seçerek (açılır, çoklu seçim, ilçe bazlı toplu seçim) seyir, istasyon özeti, gelen/çıkan personel, fazla nöbet ve gerçekleşen nöbet raporları. Sayıdaki düğmeye tıklayınca hangi aylar olduğu görünür.</li></ul>`)}
      ${b('11. Dosyalar: hangisi ne işe yarar', `<ul><li><b>EKİP Personel Listesi (zorunlu):</b> kişi, kadro birimi, unvan, çalışma durumu. Birimi değişen personel için 1 yıllık görevlendirme engeli buradan başlar.</li><li><b>Personel Listesi Raporu (zorunlu):</b> izin, muafiyet ve geçici görev tarihleri.</li><li><b>Nöbet Listesi Raporu (zorunlu):</b> ATT'lerin sürücü olup olmadığı ve gerçekleşen nöbetler. Rapordaki <b>İdari (Başhekimlik)</b> ve <b>Komuta (KKM)</b> nöbet satırları da okunur: son 6 ayda nöbet kaydı olan Başhekimlik / KKM personeli İstasyon sayfasında "nöbet tutar" etiketi alır, birimin PNG/Excel çıktısında NÖBET sütununda işaretlenir ve Arşiv istatistiklerindeki gerçekleşen nöbete BAŞHEKİMLİK ve KOMUTA KONTROL MERKEZİ satırı olarak girer. Yüklenmezse sürücüler "doğrulanmadı" kalır, sürücü nöbet branşı eksik hesaplanır.</li><li><b>İzin ve Rapor Bilgileri (en son yüklenir):</b> ASOS'taki yıllık izin talepleri (TC, ad, kurum, talep edilen başlangıç ve bitiş tarihi, gün, talep durumu). Aynı yükleme düğmesiyle seçilir; kişiler TC ile (TC yoksa ad ve kurumla) eşleşir. <b>Onaylanan ve beklemedeki</b> talepler (isteğe bağlı: talep aşamasındakiler) plan ayına yakın tarihler için raporundaki başlangıç–bitiş aralığıyla izin olarak eklenir; vazgeçilen, reddedilen ve iptal edilenler alınmaz. Mevcut izinle aynı günlere denk gelenler tekrar eklenmez; rapor yeniden yüklenince önceki talep kaynaklı izinler yenilenir. Eski "İzin Talepleri Raporu" (yalnız bitiş tarihli) da okunur; onda başlangıç, bitişten geriye iş günü sayılarak bulunur.</li><li><b>İzin-Muafiyet Raporu (isteğe bağlı):</b> izin ve muafiyet tarihlerini kesinleştirir.</li></ul>`)}
      ${b('12. Yedek, güvenlik ve ASHİ bağlantısı', `<ul><li>Veriler yalnızca bu tarayıcıda (IndexedDB) tutulur. <b>Ayarlar › Yedek</b> ile JSON yedeği alın; yedekte kişisel veri bulunur, güvenli saklayın.</li><li>Ayarlar sayfasında durum tablosu (nöbet/mesai etkisi), hesap ayarları (ATT sürücü eşiği, genel azami nöbet, işçi düşülen saat, otomatik hesap) bulunur; yalnızca yönetici değiştirebilir.</li><li><b>ASHİ bağlantısı hazırlığı:</b> Nöbet Listesi ve İzin-Muafiyet raporları ASHİ tarafından güncel okunabilecek şekilde hazırdır (<code>veriKaynagi</code> / <code>dosyaVer</code>); bağlantı kurulduğunda bu raporları elle yüklemek gerekmeyecek.</li></ul>`)}
      ${b('13. İpuçları', `<ul><li>Değişiklikler otomatik kaydedilir; ayrı bir kaydet düğmesi yoktur.</li><li>Her değişiklik <b>Değişiklik günlüğü</b>ne yazılır.</li><li>Renkler: kırmızı satır = geçici görevde, sarı = yıllık izin, mor = doğum/analık, gri = rapor/ücretsiz izin vb. (sayfanın üstündeki renk açıklamasına bakın).</li><li>Bir sorun varsa önce Denetim ve Pano'daki uyarılara bakın; çoğu zaman nedeni (eksik kadro, 4/B, kadro değişikliği, izin) orada yazar.</li></ul>`)}
    </div></div>`;
  }

  // ---- olaylar ----
  async function ekClick(a, v, t, e) {
    if (!a.startsWith('n2-') && !a.startsWith('arsiv-') && !a.startsWith('arstat-') && !a.startsWith('yukleme-') && !a.startsWith('talep-') && !a.startsWith('ayar-') && !a.startsWith('takip-') && a !== 'modul') return false;
    const b = S.plan ? n2Birim() : null;
    switch (a) {
      case 'modul': S.modul = +v; if (S.modul === 1 && S.rol === 'istasyon') S.modul = 2; break;
      case 'n2-sekme': S.n2.sekme = v; S.n2.altSekme = ''; break;
      case 'n2-gonder': {
        const T = n2TeklifOzet(b); if (!n2Duzenlenir(b.ad)) break;
        const sorun = [T.fark ? `toplam nöbet gerekenden ${T.fark > 0 ? 'fazla' : 'eksik'} (${fmt(T.toplam)} / ${T.h.ihtiyac})` : '', T.asimSay ? `${T.asimSay} kişide üst sınır aşıldı` : ''].filter(Boolean);
        if (sorun.length && !confirm('Uyarılar var: ' + sorun.join('; ') + '.\n\nYine de planlamaya gönderilsin mi?')) break;
        mut2(() => { const o = n2OnayYaz(b.ad); T.satir.forEach(x => { if (x.tutar) o.teklif[x.k.id] = x.tek; }); o.durum = 'gonderildi'; o.gonderZaman = Date.now(); o.ret = ''; }, 'İstasyon planı planlamaya gönderildi', `${b.ad}: ${T.degisenSay} değişiklik`);
        toast('Planınız planlama birimine gönderildi.'); break;
      }
      case 'n2-teklif-sifirla': if (n2Duzenlenir(b.ad) && confirm('Yaptığınız değişiklikler geri alınsın mı?')) mut2(() => { n2OnayYaz(b.ad).teklif = {}; }, 'İstasyon teklifi sıfırlandı', b.ad); break;
      case 'talep-onayla': { const bb = S.plan.birimler.find(x => x.ad === v); if (!bb || salt()) break; if (confirm(`${bb.ad} istasyonunun planı kesin plana işlensin mi?`)) { talepOnayla(bb); toast(`${bb.ad} planı onaylandı.`); } break; }
      case 'talep-reddet': { const bb = S.plan.birimler.find(x => x.ad === v), not = (root.querySelector('[id="ap-talep-not-' + v + '"]') || {}).value || ''; if (!bb || salt()) break; if (!not.trim()) { toast('Düzeltme isterken istasyona kısa bir not yazın.'); break; } mut(() => { const o = n2OnayYaz(bb.ad); o.durum = 'reddedildi'; o.ret = not.trim(); }, 'İstasyon planı için düzeltme istendi', `${bb.ad}: ${not.trim()}`); toast('Düzeltme istendi.'); break; }
      case 'talep-geri-al': { const bb = S.plan.birimler.find(x => x.ad === v); if (!bb || salt()) break; if (confirm(`${bb.ad} istasyonunun onayı geri alınsın mı? ${(S.plan.onay[bb.ad] || {}).onceki ? 'Nöbet sayıları onaydan önceki değerlerine döner' : 'Bu onay eski sürümde yapıldığı için önceki değerler kayıtlı değil: nöbet kilitleri açılır ve planlanan nöbetler otomatik yeniden hesaplanır'}; istasyon yeniden onay bekler.`)) { const n = talepGeriAl(bb); toast(`${bb.ad} onayı geri alındı (${n} kişi).`); } break; }
      case 'talep-hepsi': { const gel = S.plan.birimler.filter(x => x.tur === 'istasyon' && (S.plan.onay || {})[x.ad] && S.plan.onay[x.ad].durum === 'gonderildi'); if (salt() || !gel.length) break; if (confirm(`Gönderilen ${gel.length} istasyonun planı kesin plana işlensin mi?`)) { gel.forEach(talepOnayla); toast(`${gel.length} istasyon planı onaylandı.`); } break; }
      case 'n2-gorunum': S.n2.gorunum = v; break;
      case 'n2-istek': { const dp = n2Depo(b.ad), id = t.dataset.id, g = C.iso(S.y, S.m, +v); mut2(() => { const l = dp.istek[id] = dp.istek[id] || []; const i = l.indexOf(g); if (i >= 0) l.splice(i, 1); else l.push(g); if (!l.length) delete dp.istek[id]; }); break; }
      case 'n2-istek-temizle': if (confirm('Bu istasyonun tüm istek günleri silinsin mi?')) mut2(() => { n2Depo(b.ad).istek = {}; }, 'Modül 2: istekler temizlendi', b.ad); break;
      case 'n2-izin-ekle': {
        const id = root.querySelector('#ap-n2-izkisi').value, bas = root.querySelector('#ap-n2-izbas').value, bit = root.querySelector('#ap-n2-izbit').value;
        if (!id || !bas || !bit || bit < bas) { toast('Kişi, başlangıç ve bitiş tarihini (bitiş ≥ başlangıç) girin.'); break; }
        mut2(() => { const dp = n2Depo(b.ad); (dp.izin[id] = dp.izin[id] || []).push({bas, bit, tur: 'YILLIK İZİN'}); }, 'Modül 2: izin aralığı', `${b.ad} ${bas}–${bit}`); break;
      }
      case 'n2-izin-sil': mut2(() => { const dp = n2Depo(b.ad); dp.izin[t.dataset.id].splice(+v, 1); if (!dp.izin[t.dataset.id].length) delete dp.izin[t.dataset.id]; }); break;
      case 'n2-uret': {
        const dp = n2Depo(b.ad); if (dp.liste && !confirm('Mevcut liste yeni oluşturulan listeyle değiştirilecek. Devam edilsin mi?')) break;
        if (!n2Duz()) { toast('Düzenleme yetkiniz yok / ay kilitli.'); break; }
        S.n2.calisiyor = true; render(); await new Promise(r => setTimeout(r, 40));
        try { const G = n2Girdi(b), r = NC.uret(G.girdi, {kural: G.kural, sureMs: 3000, deneme: 10, zorlaMs: 12000, seed: (Date.now() % 100000) + 1}); mut2(() => { dp.liste = r.liste; }, 'Modül 2: otomatik liste', `${b.ad} ceza ${r.ceza}${r.zorlandi ? ' (zorlandı)' : ''}`); toast(r.ceza === 0 ? 'Liste oluşturuldu: kural ihlali yok.' : r.sert === 0 ? `Liste oluşturuldu: boş yuva ve sert kural ihlali yok${r.zorlandi ? ' (zorlanarak)' : ''}; ${r.ihlal.length} küçük sapma (nöbet sayısı vb.) kaldı. Denetim sekmesine bakın.` : `Liste oluşturuldu; ${r.sert} sert ihlal kaldı (kadro bu kuralları sağlamaya yetmiyor olabilir). Denetim sekmesine bakın.`); }
        finally { S.n2.calisiyor = false; }
        break;
      }
      case 'n2-liste-temizle': if (confirm('Liste silinsin mi?')) mut2(() => { n2Depo(b.ad).liste = null; }, 'Modül 2: liste temizlendi', b.ad); break;
      case 'n2-uygula': { const [i, j] = v.split(':').map(Number), s = S.n2.oneri.oneriler[i].secenekler[j], dp = n2Depo(b.ad); mut2(() => { dp.liste[s.gun][s.yuva] = s.yeni; }, 'Modül 2: öneri uygulandı', `${s.gun}. gün ${s.yuva} → ${s.yeniAd}`); break; }
      case 'n2-excel': n2Excel(b); return true;
      case 'arsiv-yaz': {
        if (!S.plan) break; const rec = ayMetrik(S.plan, S.y, S.m); await arsivYaz(rec);
        const kilit = root.querySelector('#ap-arsiv-kilit'); if (kilit && kilit.checked && S.rol === 'yonetici') mut(() => { S.plan.durum = 'kilitli'; }, 'Ay arşivlendi ve kilitlendi', rec.ay);
        else logla('Ay arşive kaydedildi', rec.ay);
        toast(`${ayEtiket()} arşive kaydedildi.`); break;
      }
      case 'arsiv-hepsi': {
        const mevcut = S.y * 100 + S.m; let n = 0;
        for (const k of S.planAnahtarlari) {
          const ay = k.slice(5), [y, m] = ay.split('-').map(Number); if (S.arsivVeri && S.arsivVeri[ay]) continue;
          const plan = y * 100 + m === mevcut ? S.plan : await depo.get(k); if (!plan) continue; await arsivYaz(ayMetrik(plan, y, m)); n++;
        }
        toast(`${n} ay arşive eklendi.`); break;
      }
      case 'arsiv-sil': if (planlamaRol() && confirm(`${ayAd(v)} arşivi silinsin mi?`)) { await depo.del(arsivAnahtar(v)); delete S.arsivVeri[v]; S.arsivSecili = (S.arsivSecili || []).filter(x => x !== v); } break;
      case 'arstat-aylar': S.arstatAc = S.arstatAc === 'ayno' && S.arstatAyAc === v ? '' : 'ayno'; S.arstatAyAc = v; break;
      case 'takip-pop': S.arstatAc = S.arstatAc === 'tk-' + v ? '' : 'tk-' + v; break;
      case 'takip-yil': { const T = S.takip, y = +v; T.yil = T.yil.includes(y) ? T.yil.filter(x => x !== y) : [...T.yil, y]; break; }
      case 'takip-ay': { const T = S.takip, m = +v; T.ay = T.ay.includes(m) ? T.ay.filter(x => x !== m) : [...T.ay, m]; break; }
      case 'takip-ilce': { const T = S.takip, l = istAdlari().filter(x => C.ilceAdi(x) === v), hepsi = l.every(x => T.ist.includes(x)); T.ist = hepsi ? T.ist.filter(x => !l.includes(x)) : [...new Set([...T.ist, ...l])]; break; }
      case 'takip-temizle': S.takip[v] = []; break;
      case 'takip-tumu': S.takip[v] = v === 'ay' ? AY_KISA.map((_, i) => i + 1) : [...new Set(Object.keys(S.takipVeri || {}).map(a => +a.slice(0, 4)))]; break;
      case 'takip-sekme': S.takip.sekme = v; break;
      case 'takip-yenile': S.takipVeri = null; break;
      case 'takip-excel': takipExcel(); return true;
      case 'arsiv-ay-sil': if (planlamaRol() && confirm(`${ayAd(v)} için arşiv kaydı ve gerçekleşen nöbet verisi silinsin mi? (Aylık plan silinmez.)`)) { await depo.del(arsivAnahtar(v)); await depo.del('gercek:' + v); if (S.arsivVeri) delete S.arsivVeri[v]; if (S.gercekVeri) delete S.gercekVeri[v]; S.arsivSecili = (S.arsivSecili || []).filter(x => x !== v); toast('Arşiv silindi.'); } break;
      case 'arsiv-ay': { const l = [...new Set(S.arsivSecili || [])]; S.arsivSecili = l.includes(v) ? l.filter(x => x !== v) : [...l, v]; break; }
      case 'arsiv-ay-hepsi': S.arsivSecili = Object.keys(S.arsivVeri); break;
      case 'arsiv-ay-hic': S.arsivSecili = []; break;
      case 'yukleme-sil': {
        const l = S.yuklemeler || [], x = l[+v]; if (!x || S.rol === 'salt_okur') break;
        if (!confirm(`"${x.ad}" yükleme kaydı silinsin mi?\n\nNot: Dosyanın plana işlediği veriler (kişiler, izinler, nöbetler) geri alınmaz; yalnızca bu günlük kaydı silinir.`)) break;
        l.splice(+v, 1); await depo.put('yuklemeler', l); S.yuklemeler = l;
        if (x.tur === 'N' && x.aylar && confirm(`Bu dosyadan oluşturulan gerçekleşen nöbet kayıtları da (${x.aylar.split(',').map(ayAd).join(', ')}) silinsin mi?\n\nTamam: arşiv istatistiklerinden de kalkar. İptal: kayıtlar kalır.`)) { for (const ay of x.aylar.split(',')) { await depo.del('gercek:' + ay); if (S.gercekVeri) delete S.gercekVeri[ay]; } }
        toast('Yükleme kaydı silindi.'); break;
      }
      case 'arsiv-yil': S.arsivYilAc = S.arsivYilAc || {}; S.arsivYilAc[v] = !(S.arsivYilAc[v] != null ? S.arsivYilAc[v] : +v === GUNCEL_Y); break;
      case 'ayar-sekme': S.ayarSekme = v; break;
      case 'n2-alt': S.n2.altSekme = v; break;
      case 'arsiv-sekme': S.arsivSekme = v; break;
      case 'arstat-sekme': S.arstatSekme = v; break;
      case 'arstat-pop': S.arstatAra = ''; S.arstatAc = S.arstatAc === v ? '' : v; if (S.arstatAc === 'ist') setTimeout(() => { const i = root.querySelector('#ap-ist-ara'); if (i) i.focus(); }, 0); break;
      case 'arstat-yil': S.arstatYil[v] = !(S.arstatYil[v] != null ? S.arstatYil[v] : false); break;
      case 'arstat-yil-hepsi': { const l = Object.keys(S.arsivVeri || {}).concat(Object.keys(S.gercekVeri || {})).filter((x, i, ar) => x.slice(0, 4) === v && ar.indexOf(x) === i), sec = S.arsivSecili = S.arsivSecili || [], hepsi = l.every(x => sec.includes(x)); S.arsivSecili = hepsi ? sec.filter(x => !l.includes(x)) : [...new Set([...sec, ...l])]; break; }
      case 'arstat-ilce': { const l = istAdlari().filter(a => C.ilceAdi(a) === v), sec = S.arsivIstler = S.arsivIstler || [], hepsi = l.every(a => sec.includes(a)); S.arsivIstler = hepsi ? sec.filter(a => !l.includes(a)) : [...new Set([...sec, ...l])]; break; }
      case 'arstat-ist-tumu': S.arsivIstler = istAdlari(); break;
      case 'arstat-ist-temizle': S.arsivIstler = []; break;
      case 'arsiv-excel': arsivExcel(); return true;
      default: return false;
    }
    return true;
  }
  async function ekChange(t) {
    const a = t.dataset.act, n = t.dataset.n2;
    if (a === 'arstat-ist') { const l = S.arsivIstler = S.arsivIstler || [], v = t.dataset.v, i = l.indexOf(v); if (t.checked && i < 0) l.push(v); else if (!t.checked && i >= 0) l.splice(i, 1); return true; }
    if (a === 'takip-ist') { const T = S.takip, v = t.dataset.v; T.ist = t.checked ? [...new Set([...T.ist, v])] : T.ist.filter(x => x !== v); return true; }
    if (a === 'takip-sadece') { S.takip.sadece = t.checked; return true; }
    if (a === 'takip-ara') { S.takip.ara = t.value; return true; }
    if (a === 'arsiv-ay') return false;
    if (!n) return false;
    const b = S.plan && n2Birim();
    if (n === 'teklif') { const b2 = S.plan && n2Birim(); if (!b2 || !n2Duzenlenir(b2.ad)) return false; const id = t.dataset.id, v = t.value === '' ? null : Math.max(0, Math.round(sayi(t.value) * 100) / 100); mut2(() => { const o = n2OnayYaz(b2.ad); if (v == null) delete o.teklif[id]; else o.teklif[id] = v; }); return true; }
    if (n === 'ist') { S.n2.ist = t.value; S.n2.oneri = null; return true; }
    if (n === 'kural') { const dp = n2Depo(b.ad), k = t.dataset.k; mut2(() => { dp.kural = {...dp.kural, [k]: t.type === 'checkbox' ? t.checked : Math.max(0, Math.round(sayi(t.value))) }; }, 'Modül 2: kural', `${k}`); return true; }
    if (n === 'hucre') { const dp = n2Depo(b.ad), g = +t.dataset.g, tip = t.dataset.t; mut2(() => { dp.liste = dp.liste || NC.bos(NC.gunSayisi(S.y, S.m)); dp.liste[g][tip] = t.value === '' ? null : t.value; if (dp.liste[g].bol && dp.liste[g].bol[tip] && (t.value === '' || dp.liste[g].bol[tip].id === t.value)) { const B = {...dp.liste[g].bol}; delete B[tip]; dp.liste[g].bol = B; } }, 'Modül 2: elle değişiklik', `${g}. gün ${tip}`); return true; }
    if (n === 'bol') { const dp = n2Depo(b.ad), g = +t.dataset.g, tip = t.dataset.t; mut2(() => { const B = {...(dp.liste[g].bol || {})}; if (t.value === '') delete B[tip]; else B[tip] = {...B[tip], saat: +t.value}; dp.liste[g].bol = B; }, 'Modül 2: bölünmüş nöbet', `${g}. gün ${tip} ${t.value || 'kaldırıldı'}`); return true; }
    return false;
  }
