
  // ================= MODÜL 2 — İSTASYON NÖBET LİSTESİ =================
  const NC = NobetCore;
  const N2_SEKME = [['plan', 'Planlama'], ['istek', 'İstek takvimi'], ['liste', 'Nöbet listesi'], ['denetim', 'Denetim ve öneriler'], ['paket', 'Çıktı']];
  const IHLAL_AD = {eksik: 'Boş nöbet branşı', yetenek: 'Nöbet branşına uygun değil', izin: 'İzinli günde nöbet', cakisma: 'Aynı gün çift görev', dinlenme: 'Dinlenme ihlali', izinOnce: 'Yıllık izin öncesi boşluk', surGunAsiri: 'Sürücü gün aşırı 3 nöbet', isciGece: 'İşçi art arda 3 gece', aralik: 'İki nöbet arası çok uzun', istek: 'İstenmeyen güne nöbet', adet: 'Nöbet sayısı farkı'};
  const GUN_AD = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];
  // İstasyon sorumlusu, planlama onaylanmadan (Kesinleştir / Ayı kilitle) kendi istasyonunun planlamasını ve nöbet listesi araçlarını göremez
  const n2Onayli = () => !!S.plan && (S.plan.durum === 'kesin' || S.plan.durum === 'kilitli');
  const n2Acik = () => S.rol !== 'istasyon' || n2Onayli();
  const n2Ist = () => S.n2.ist && S.plan && S.plan.birimler.some(b => b.ad === S.n2.ist) ? S.n2.ist : (S.n2.ist = (S.plan && (S.plan.birimler.find(b => b.tur === 'istasyon' && !b.ekipOf) || {}).ad) || '');
  const n2Birim = () => S.plan && S.plan.birimler.find(b => b.ad === n2Ist());
  function n2Depo(ad) { const N = (S.plan.nobet = S.plan.nobet || {}); return N[ad] = N[ad] || {istek: {}, izin: {}, liste: null, kural: {}, kisiler: null}; }
  const n2Duz = () => S.rol !== 'salt_okur' && !(S.plan && S.plan.durum === 'kilitli');
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
    return {girdi: {y: S.y, m: S.m, kisiler: ks}, ozet, kural: {...NC.KURAL, ...(dp.kural || {})}};
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
    const satir = h.satir.map(s => { const k = s.k, tutar = !s.nobetYok && !((D[k.durum] || {}).disarida), mevcut = sayi(k.planlanan), tek = tutar ? (o.teklif[k.id] != null ? sayi(o.teklif[k.id]) : mevcut) : 0, ust = s.azami > 0 ? s.azami : (k.sinif === 'isci' ? s.hedef : 0);
      return {s, k, tutar, mevcut, tek, ust, asim: tutar && tek > ust + 1e-9, degisti: tutar && Math.abs(tek - mevcut) > 1e-9}; }).sort((x, y) => (NB_SIRA[x.s.grup] - NB_SIRA[y.s.grup]) || personelSirala(x.k, y.k));
    const toplam = satir.reduce((a, x) => a + x.tek, 0), mevcutT = satir.reduce((a, x) => a + (x.tutar ? x.mevcut : 0), 0);
    return {h, o, satir, toplam, mevcutT, fark: Math.round((toplam - h.ihtiyac) * 100) / 100, asimSay: satir.filter(x => x.asim).length, degisenSay: satir.filter(x => x.degisti).length};
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
      <td class="num">${!x.tutar ? '' : duz ? `<input class="ap-in n ${x.asim ? 'n2e' : ''}" type="number" min="0" step="0.5" data-n2="teklif" data-id="${x.k.id}" value="${x.tek}" title="${x.asim ? 'Üst sınır ' + fmt(x.ust) + ' nöbet' : ''}">` : `<b class="${x.degisti ? 'n2d' : ''}">${fmt(x.tek)}</b>`}</td><td class="num">${x.tutar && x.degisti ? `<span class="${x.tek > x.mevcut ? 'n2art' : 'n2eks'}">${x.tek > x.mevcut ? '+' : ''}${fmt(x.tek - x.mevcut)}</span>` : ''}</td></tr>`).join('');
    const durumRozet = `<span class="ap-badge ${o.durum === 'onaylandi' ? 'ap-b-kesin' : o.durum === 'reddedildi' ? 'ap-b-taslak' : ''}">${ONAY_AD[o.durum]}</span>`;
    const uyari = [T.fark ? `Toplam ${fmt(T.toplam)}, gereken ${h.ihtiyac} (${T.fark > 0 ? '+' : ''}${fmt(T.fark)})` : '', T.asimSay ? `${T.asimSay} kişide üst sınır aşıldı` : ''].filter(Boolean);
    return `${!ist ? `<div class="ap-card" style="border-color:var(--ap-warn);background:var(--ap-warnbg)"><span class="ap-note">Planlama birimi görünümü. İstasyon sorumlusu bu bölümü yalnızca plan <b>Kesinleştirildiğinde</b> görür (şu an: <b>${S.plan.durum === 'taslak' ? 'Taslak' : S.plan.durum === 'kesin' ? 'Kesinleşti' : 'Kilitli'}</b>), nöbet sayılarını düzenleyip size geri gönderir; onayınızı <b>İstasyon talepleri</b> sayfasından verirsiniz. Sağlık nedenleri (rapor, doğum, muafiyet) istasyon sorumlusuna gösterilmez.</span></div>` : ''}
      ${o.durum === 'reddedildi' && o.ret ? `<div class="ap-card" style="border-color:var(--ap-bad)"><b>Planlama düzeltme istedi:</b> ${esc(o.ret)}</div>` : ''}
      <div class="ap-card"><h2>${esc(b.ad)} — ${ayEtiket()} planlaması ${durumRozet}</h2>
      ${ist ? `<div class="ap-row" style="margin:8px 0 10px">${duz ? `<button class="ap-btn pri" data-act="n2-gonder">Planlamaya gönder</button>${T.degisenSay ? `<button class="ap-btn" data-act="n2-teklif-sifirla">Değişiklikleri geri al</button>` : ''}` : o.durum === 'gonderildi' ? '<span class="ap-note">Planınız planlama birimine gönderildi; onay bekleniyor.</span>' : o.durum === 'onaylandi' ? '<button class="ap-btn pri" data-act="n2-sekme" data-v="istek">İstek takvimine geç →</button>' : ''}</div>` : ''}
      <div class="ap-sum ap-sum1" style="margin-bottom:10px"><div><b>${fmt(T.toplam)} / ${h.ihtiyac}</b><span>${T.degisenSay ? 'Sizin planınız / gereken nöbet' : 'Yazılan / gereken nöbet'}</span></div><div><b>${T.satir.filter(x => x.tutar).length}</b><span>Nöbet tutan kişi</span></div>${[['es', 'Ekip şefi'], ['ysp', 'YSP'], ['sur', 'Sürücü']].map(([k, ad]) => `<div><b>${fmt(h.slot.dem[k] - Math.max(0, h.acikM[k]))}/${fmt(h.slot.dem[k])}</b><span>${ad} (planlamadaki)</span></div>`).join('')}</div>
      ${uyari.length ? `<div class="ap-ek ap-ek-c" style="margin-bottom:8px"><b>Dikkat:</b> ${uyari.join(' · ')}</div>` : ''}
      <div class="ap-tw"><table class="ap-t"><thead><tr><th>Ad soyad</th><th>Kadro</th><th>Durum</th><th>Nöbet branşı</th><th>Planlamanın yazdığı</th><th>${duz ? 'Sizin planınız' : 'Planlanan (son)'}</th><th>Fark</th></tr></thead><tbody>${sat || '<tr><td colspan="7" class="ap-empty">Kişi yok</td></tr>'}</tbody></table></div>
      <p class="ap-note" style="margin-top:8px">Kime kaç nöbet yazılacağını ${duz ? '<b>"Sizin planınız"</b> sütunundan değiştirebilirsiniz' : 'bu sütunda görürsünüz'} (24 saatlik nöbet; 12 saatlik nöbetler 0,5). Toplam, istasyonun gereken nöbetine (${h.ihtiyac}) eşit olmalı; memur ve doktor için üst sınır ${istMod(b) === 'mesai' ? 'hedef nöbetleridir' : fmt(azamiDeger(b)) + ' nöbettir'}.</p>
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
      <div class="ap-row" style="margin:8px 0 10px"><button class="ap-btn" data-act="n2-istek-temizle" ${duz ? '' : 'disabled'}>Tüm istekleri temizle</button><button class="ap-btn pri" data-act="n2-sekme" data-v="liste">Nöbet listesine geç →</button></div>
      <div style="margin:4px 0 12px"><b>İzin aralığı ekle</b> <span class="ap-note">Yıllık izin başlamadan önceki ${G.kural.izinOnce} gün nöbet yazılmaz, izin süresince de yazılmaz. ASOS'tan tarihli gelen izinler otomatik tanınır.</span>
      
      <div class="ap-row" style="margin-top:6px"><select class="ap-sel" id="ap-n2-izkisi">${kisiSec}</select><label class="ap-note">Başlangıç <input type="date" class="ap-in" id="ap-n2-izbas"></label><label class="ap-note">Bitiş <input type="date" class="ap-in" id="ap-n2-izbit"></label><button class="ap-btn pri" data-act="n2-izin-ekle" ${duz ? '' : 'disabled'}>Ekle</button></div></div>
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
      return `<td class="${e ? 'n2e' : ''}" title="${esc(e)}"><select class="ap-sel n2s" data-n2="hucre" data-g="${gun}" data-t="${tip}" ${duz ? '' : 'disabled'}>${secenek(yuva, tip, id)}</select></td>`; };
    const sat = [...Array(N)].map((_, i) => { const g = i + 1, w = new Date(Date.UTC(S.y, S.m - 1, g)).getUTCDay(); return `<tr class="${w === 0 || w === 6 ? 'hs' : ''}"><td class="num">${g}</td><td>${GUN_AD[w]}</td>${hucre(g, 'es')}${hucre(g, 'ysp')}${hucre(g, 'sur')}${ks.some(k => k.grup === 'isci') ? hucre(g, 'surG') + hucre(g, 'surA') : ''}</tr>`; }).join('');
    const sayim = ks.map(k => { let a = 0, y = 0; for (let g = 1; g <= N; g++) ['es', 'ysp', 'sur'].forEach(t => { if (L[g][t] === k.id) a++; }); for (let g = 1; g <= N; g++) ['surG', 'surA'].forEach(t => { if (L[g][t] === k.id) y++; }); return {k, birim: a + y / 2, hedef: (k.adet || 0) + (k.yarim || 0) / 2}; });
    const ozetIh = Object.entries(d.say).filter(([t]) => t !== 'adet').map(([t, n]) => `${IHLAL_AD[t]}: <b>${n}</b>`).join(' · ');
    const kisiGoruntu = S.n2.gorunum === 'kisi';
    const kisiTablo = () => {
      const bas = [...Array(N)].map((_, i) => `<th class="n2d">${i + 1}</th>`).join('');
      return `<div class="ap-tw"><table class="ap-t n2"><thead><tr><th style="text-align:left">Personel</th>${bas}<th>Liste</th><th>Hedef</th></tr></thead><tbody>${sayim.map(({k, birim, hedef}) => {
        const p = H.byId.get(k.id), c = [...Array(N)].map((_, i) => { const g = i + 1; let x = ''; ['es', 'ysp', 'sur', 'surG', 'surA'].forEach(t => { if (L[g][t] === k.id) x = NC.KOD[t]; }); return `<td class="n2c ${x ? 'nb' : p.izin.has(g) ? 'iz' : p.istek.has(g) ? 'is' : ''}">${x || (p.izin.has(g) ? 'İ' : p.istek.has(g) ? '✕' : '')}</td>`; }).join('');
        return `<tr><td class="n2n">${esc(k.ad)}</td>${c}<td class="num"><b>${fmt(birim)}</b></td><td class="num ${Math.abs(birim - hedef) > 0.01 ? 'n2e' : ''}">${fmt(hedef)}</td></tr>`; }).join('')}</tbody></table></div><p class="ap-note">E: ekip şefi · Y: YSP · S: sürücü (24 sa.) · G: sürücü gündüz · A: sürücü gece (12 sa. işçi)</p>`; };
    return `<div class="ap-card"><h2>Otomatik nöbet listesi</h2>
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
      <div class="ap-card">${kisiGoruntu ? kisiTablo() : `<div class="ap-tw"><table class="ap-t n2l"><thead><tr><th>Gün</th><th></th><th>Ekip şefi</th><th>YSP</th><th>Sürücü (24 sa.)</th>${ks.some(k => k.grup === 'isci') ? '<th>Sürücü gündüz (12)</th><th>Sürücü gece (12)</th>' : ''}</tr></thead><tbody>${sat}</tbody></table></div>`}</div>
      <div class="ap-card"><h2>Kişi başına nöbet</h2>${tabloHtml(['Personel', 'Branş', 'Hedef (Modül 1)', 'Listede'], sayim.map(({k, birim, hedef}) => [esc(k.ad), k.brans || '', hedef, `<span class="${Math.abs(birim - hedef) > 0.01 ? 'n2e' : ''}">${fmt(birim)}</span>`]))}</div>`;
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
    return `<div class="ap-card"><h2>Denetim özeti</h2><p>Toplam ceza puanı <b>${d.toplam}</b> · ihlal sayısı <b>${d.ihlal.length}</b></p>
      <div class="ap-row">${Object.entries(d.say).map(([t, n]) => `<span class="ap-tag ${['eksik', 'yetenek', 'izin', 'cakisma', 'dinlenme'].includes(t) ? 'ap-t-ih' : 'ap-t-fz'}">${IHLAL_AD[t]}: ${n}</span>`).join('') || '<span class="ap-tag ap-t-ok">Kural ihlali yok</span>'}</div>
      ${adetIh.length ? `<div class="ap-note" style="margin-top:8px">Nöbet sayısı farkı: ${adetIh.map(i => esc(i.mesaj)).join(' · ')}</div>` : ''}</div>
      <div class="ap-card"><h2>Öneriler (${O.oneriler.length})</h2><p class="ap-note">Her ihlal için, atamayı başka kişiyle değiştirdiğinde toplam cezayı en çok düşüren seçenekler. "Uygula" listeyi değiştirir ve denetim yenilenir.</p>${O.oneriler.map(kart).join('') || '<span class="ap-note">Önerilecek bir düzeltme yok.</span>'}</div>`;
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
    for (let i = 1; i <= N; i++) g.push([i, `${C.pad(i)}.${C.pad(S.m)}.${S.y}`, ad(L[i].es), ad(L[i].ysp), ad(L[i].sur), ad(L[i].surG), ad(L[i].surA)]);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(g), 'Gün listesi');
    const k = [['Personel', ...[...Array(N)].map((_, i) => i + 1), 'Toplam']];
    G.girdi.kisiler.forEach(p => { const r = [p.ad]; let t = 0; for (let i = 1; i <= N; i++) { let x = ''; ['es', 'ysp', 'sur', 'surG', 'surA'].forEach(s => { if (L[i][s] === p.id) { x = NC.KOD[s]; t += s === 'surG' || s === 'surA' ? .5 : 1; } }); r.push(x); } r.push(t); k.push(r); });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(k), 'Kişi listesi');
    xlsxIndir(wb, `${b.ad}-Nobet-Listesi-${S.y}-${C.pad(S.m)}.xlsx`);
  }

  // ---- olaylar ----
  async function ekClick(a, v, t, e) {
    if (!a.startsWith('n2-') && !a.startsWith('arsiv-') && !a.startsWith('talep-') && a !== 'modul') return false;
    const b = S.plan ? n2Birim() : null;
    switch (a) {
      case 'modul': S.modul = +v; if (S.modul === 1 && S.rol === 'istasyon') S.modul = 2; break;
      case 'n2-sekme': S.n2.sekme = v; break;
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
        try { const G = n2Girdi(b), r = NC.uret(G.girdi, {kural: G.kural, sureMs: 3000, deneme: 10, seed: (Date.now() % 100000) + 1}); mut2(() => { dp.liste = r.liste; }, 'Modül 2: otomatik liste', `${b.ad} ceza ${r.ceza}`); toast(r.ceza === 0 ? 'Liste oluşturuldu: kural ihlali yok.' : `Liste oluşturuldu; ${r.ihlal.length} ihlal kaldı. Denetim sekmesine bakın.`); }
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
      case 'arsiv-sil': if (S.rol === 'yonetici' && confirm(`${ayAd(v)} arşivi silinsin mi?`)) { await depo.del(arsivAnahtar(v)); delete S.arsivVeri[v]; S.arsivSecili = (S.arsivSecili || []).filter(x => x !== v); } break;
      case 'arsiv-ay': { const l = S.arsivSecili = S.arsivSecili || []; const i = l.indexOf(v); if (i >= 0) l.splice(i, 1); else l.push(v); break; }
      case 'arsiv-ay-hepsi': S.arsivSecili = Object.keys(S.arsivVeri); break;
      case 'arsiv-ay-hic': S.arsivSecili = []; break;
      case 'arsiv-excel': arsivExcel(); return true;
      default: return false;
    }
    return true;
  }
  async function ekChange(t) {
    const a = t.dataset.act, n = t.dataset.n2;
    if (a === 'arsiv-ist') { S.arsivIst = t.value; return true; }
    if (a === 'arsiv-ay') return false;
    if (!n) return false;
    const b = S.plan && n2Birim();
    if (n === 'teklif') { const b2 = S.plan && n2Birim(); if (!b2 || !n2Duzenlenir(b2.ad)) return false; const id = t.dataset.id, v = t.value === '' ? null : Math.max(0, Math.round(sayi(t.value) * 2) / 2); mut2(() => { const o = n2OnayYaz(b2.ad); if (v == null) delete o.teklif[id]; else o.teklif[id] = v; }); return true; }
    if (n === 'ist') { S.n2.ist = t.value; S.n2.oneri = null; return true; }
    if (n === 'kural') { const dp = n2Depo(b.ad), k = t.dataset.k; mut2(() => { dp.kural = {...dp.kural, [k]: t.type === 'checkbox' ? t.checked : Math.max(0, Math.round(sayi(t.value))) }; }, 'Modül 2: kural', `${k}`); return true; }
    if (n === 'hucre') { const dp = n2Depo(b.ad), g = +t.dataset.g, tip = t.dataset.t; mut2(() => { dp.liste = dp.liste || NC.bos(NC.gunSayisi(S.y, S.m)); dp.liste[g][tip] = t.value === '' ? null : t.value; }, 'Modül 2: elle değişiklik', `${g}. gün ${tip}`); return true; }
    return false;
  }
