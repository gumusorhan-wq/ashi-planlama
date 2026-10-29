
  // ---------- sayfalar ----------
  const ayEtiket = () => `${AYLAR[S.m]} ${S.y}`;
  const ayIlk = () => C.iso(S.y, S.m, 1);
  function ustHtml() {
    const d = S.plan ? S.plan.durum : '';
    return `<div class="ap-top"><h1>HUSER ASHİ PLANLAMA <span class="ap-note">v${VERSION}</span></h1>
      <div class="ap-mod">${S.rol === 'istasyon' ? '' : `<button class="${S.modul === 1 ? 'on' : ''}" data-act="modul" data-v="1">Modül 1 · Planlama</button>`}<button class="${S.modul === 2 ? 'on' : ''}" data-act="modul" data-v="2">Modül 2 · Nöbet listesi</button></div>
      <div class="ap-ay"><button class="ap-btn sm" data-act="ay-" title="Önceki ay">‹</button><b>${ayEtiket()}</b><button class="ap-btn sm" data-act="ay+" title="Sonraki ay">›</button></div>
      ${S.plan ? `<span class="ap-badge ap-b-${d}">${d === 'taslak' ? 'Taslak' : d === 'kesin' ? 'Kesinleşti' : 'Kilitli'}</span>` : ''}
      <span class="ap-sp"></span>
      <label class="ap-note" title="Tema"><select class="ap-sel" data-act="tema"><option value="acik" ${S.ayar.tema !== 'koyu' && S.ayar.tema !== 'sistem' ? 'selected' : ''}>Açık</option><option value="koyu" ${S.ayar.tema === 'koyu' ? 'selected' : ''}>Koyu</option><option value="sistem" ${S.ayar.tema === 'sistem' ? 'selected' : ''}>Sistem</option></select></label>
      ${S.plan && S.rol !== 'salt_okur' ? `<select class="ap-sel" data-act="plan-durum" title="Plan durumu">${[['taslak', 'Taslak'], ['kesin', 'Kesinleştir'], ['kilitli', 'Ayı kilitle']].map(([v, t]) => `<option value="${v}" ${v === d ? 'selected' : ''} ${v === 'kilitli' && S.rol !== 'yonetici' ? 'disabled' : ''}>${t}</option>`).join('')}</select>` : ''}
      ${opts.kullanici ? '' : `<label class="ap-note" title="Rol (demo)"><select class="ap-sel" data-act="rol">${Object.entries(ROLLER).map(([k, v]) => `<option value="${k}" ${k === S.rol ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`}</div>`;
  }
  const SAYFALAR = [['pano', 'Pano'], ['ist', 'İstasyon'], ['gorev', 'Görevlendirme'], ['personel', 'Personel'], ['ozel', 'Özel günler'], ['stat', 'İstatistik'], ['arsiv', 'Arşiv'], ['arstat', 'Arşiv istatistikleri'], ['log', 'Değişiklik günlüğü'], ['ayar', 'Ayarlar']];
  const navHtml = () => S.modul === 2 ? `<div class="ap-nav">${N2_SEKME.map(([k, t]) => `<button class="${S.n2.sekme === k ? 'on' : ''}" data-act="n2-sekme" data-v="${k}">${t}</button>`).join('')}</div>` : `<div class="ap-nav">${SAYFALAR.map(([k, t]) => `<button class="${S.sayfa === k ? 'on' : ''}" data-act="sayfa" data-v="${k}">${t}</button>`).join('')}</div>`;

  function bosHtml() {
    const onceki = S.m === 1 ? C.iso(S.y - 1, 12, 1).slice(0, 7) : C.iso(S.y, S.m - 1, 1).slice(0, 7);
    const oncekiVar = S.planAnahtarlari.includes('plan:' + onceki);
    return `<div class="ap-card ap-empty"><h2>${ayEtiket()} için plan yok</h2>
      <p>Planlama her ayın 10-15'inde bir sonraki ay için yapılır. ASOS'tan indirdiğiniz iki personel dosyasını yükleyin:</p>
      <div class="ap-note" style="margin:6px 0 14px">1) <b>Personel Listesi Raporu</b> (izin, muafiyet, geçici görev tarihleri) &nbsp; 2) <b>EKİP — Başhekimlik / Komuta / İstasyon Personel Listesi Raporu</b><br>İki dosyayı birlikte seçebilir ya da bu alana sürükleyip bırakabilirsiniz.</div>
      <div class="ap-row" style="justify-content:center">
        <button class="ap-btn pri" data-act="plan-asos" ${S.rol === 'salt_okur' ? 'disabled' : ''}>Personel listelerini yükle</button>
        <button class="ap-btn" data-act="plan-kopya" ${oncekiVar && S.rol !== 'salt_okur' ? '' : 'disabled'}>Önceki aydan kopyala (${onceki})</button>
        <button class="ap-btn" data-act="plan-bos" ${S.rol === 'salt_okur' ? 'disabled' : ''}>Boş plan</button></div>
      <p class="ap-note">Veriler yalnızca bu tarayıcıda (IndexedDB) tutulur. Yedek almak için Ayarlar'daki JSON yedeğini kullanın.</p></div>`;
  }

  // ---- istasyon kartı: hangi yuva eksik, hangi branştan kaç kişi gerekli, kaç kişi dışarı çıkabilir ----
  const YUVA_ADLARI = {es: 'Ekip şefi', ysp: 'YSP', sur: 'Sürücü'};
  // Aday branşlar ve doldurabildikleri yuvalar (nöbet listesi doğrulamasına göre)
  const ADAY_BRANS = [
    {ad: 'Doktor', yuva: ['es']},
    {ad: 'İşçi (sürücü)', yuva: ['sur'], isci: true},
    {ad: 'ATT', yuva: ['ysp']},
    {ad: 'ATT (sürücü teyitli)', yuva: ['ysp', 'sur']},
    {ad: 'AABT', yuva: ['es', 'ysp']},
    {ad: 'AABT (sürücü teyitli)', yuva: ['es', 'ysp', 'sur']}];
  function eksikAnaliz(h, isciTam, doktorOk, fazlaMod) {
    const rem = h.acikM || h.slot.hedef.rem, tam = h.tamHedef, yuvalar = ['es', 'ysp', 'sur'].map(k => ({k, ad: YUVA_ADLARI[k], gerek: h.slot.dem[k], hedefAcik: Math.max(0, h.slot.hedef.rem[k]), acik: Math.max(0, rem[k]), azamiAcik: Math.max(0, h.slot.azami.rem[k])}));
    // her aday branş, doldurabildiği nöbet branşlarındaki açık kadar nöbet tutar; gelen kişi o ay tüm hedefini (tam ay) tutabiliyorsa önerilir
    const adaylar = ADAY_BRANS.filter(x => x.ad !== 'Doktor' || doktorOk).map(x => ({...x, kapasite: x.yuva.reduce((t, y) => t + Math.max(0, rem[y]), 0), tam: x.isci ? isciTam : tam})).map(x => ({...x, kisi: x.tam > 0 ? Math.floor(x.kapasite / x.tam + 1e-9) : 0})).filter(x => x.kisi >= 1);
    // en dar branşlar önce (yuva sayısı az olan), aynı yuva kümesindeki doktor/AABT gibi seçenekler birlikte gösterilir
    adaylar.sort((a, c) => a.yuva.length - c.yuva.length);
    const acikYuva = yuvalar.filter(y => y.acik >= 0.5);
    const fazlaGrup = Object.entries(h.fazlaGrupEf || h.slot.hedef.fazla).filter(([, v]) => v > 0.001).map(([g, v]) => ({g, v, ad: C.GRUP_AD[g]}));
    const kisiBasi = fazlaMod ? Math.max(tam, ...(h.satir.filter(s => !s.nobetYok && s.azami > 0 && s.k.sinif !== 'isci').map(s => s.azami).slice(0, 1))) : tam;     // fazla mesaili modda kalan kişiler azami nöbete kadar tutabildiği için çıkan kişinin yerini daha az kişi doldurur
    const cikabilir = h.fazlaEf > 0.001 && kisiBasi > 0 ? Math.floor(h.fazlaEf / kisiBasi + 1e-9) : 0;
    return {yuvalar, adaylar, acikYuva, fazlaGrup, cikabilir};
  }
  function kartHtml(b, h, p, etiket, plFark, oran, dengeli, isciTam) {
    const aile = h.satir.filter(x => aileHek(x.k)).length, dis = x => !aileHek(x.k) && (durumlar()[x.k.durum] || {}).disarida && !x.k._gelen, disarida = h.satir.filter(dis).length, nobetsiz = h.satir.filter(x => !aileHek(x.k) && !dis(x) && x.nobetYok).length, nobetTutan = h.satir.length - aile - disarida - nobetsiz;
    const fazlaMod = S.ayar.panoMod !== 'mesai', E = eksikAnaliz(h, isciTam, doktorluIstasyon(b), fazlaMod), gelecek = h.ihtiyacTur === 'oner' ? h.ihtiyacKisi : 0;
    const yuvaSatir = E.yuvalar.map(y => {
      const dolu = y.gerek - y.acik;
      return `<div class="ap-yuva"><span>${y.ad}</span><span class="v">${fmt(dolu)}/${fmt(y.gerek)}</span>${y.acik >= 0.5 ? `<span class="ap-tag ap-t-ih" title="${y.ad} nöbet branşında ${fazlaMod ? 'fazla nöbetle bile' : 'mesai karşılığı nöbetle'} ${fmt(y.acik)} nöbet açık kalıyor">−${fmt(y.acik)}</span>` : '<span class="ap-tag ap-t-ok">tam</span>'}</div>`;
    }).join('');
    // gelecek personel: hangi branşlardan ve kaç kişi
    let gelen = '';
    if (gelecek) {
      const secenek = E.adaylar.map(x => `${esc(x.ad)}${x.kisi > 1 ? ' ×' + x.kisi : ''}`).join(' · ');
      gelen = `<div class="ap-ek ap-ek-g" title="Gelen kişi o ay boyunca (tam ay) bu istasyonda mesaisini tamamlayacak şekilde önerilir. Açık nöbet branşlarına girebilen branşlar listelenir."><b>+${gelecek} kişi gelmeli</b> <span>(ay boyu ${fmt(h.tamHedef)} nöbet tutar)</span><div class="ap-note">${fazlaMod ? 'Fazla nöbetle de açık' : 'Mesai karşılığıyla açık'}: ${E.acikYuva.map(y => `${y.ad} ${fmt(y.acik)}`).join(', ') || '—'}<br>Uygun personel: ${secenek || 'AABT (sürücü teyitli)'}</div></div>`;
    } else if (h.ihtiyacTur === 'icerde') gelen = `<div class="ap-ek ap-ek-c" title="Herkes yalnız mesaisini tutsa ${fmt(h.hedefAcik)} nöbet açık kalırdı; bu açık bir kişinin tüm ay mesaisini doldurmaya yetmediği ve fazla nöbetle kapandığı için personel önerilmez"><b>Personel gerekmez</b> <span>nöbet branşları fazla nöbetle doluyor</span></div>`;
    else if (h.ihtiyacTur === 'elle') gelen = fazlaMod ? `<div class="ap-ek ap-ek-e"><b>Elle karar</b> <span>fazla nöbetle de ${fmt(-h.farkAzami)} açık; bir kişinin ayı dolmaz</span></div>` : `<div class="ap-ek ap-ek-c"><b>Açık kalıyor</b> <span>${fmt(h.hedefAcik)} nöbet; bir kişinin ayını doldurmaz</span></div>`;
    // dışarı çıkabilecek personel
    let cikan = '';
    if (h.fazlaEf > 0.001) cikan = `<div class="ap-ek ap-ek-c" title="${fazlaMod ? 'Memur/doktor en çok ' + fmt(S.ayar.azamiMemur) + ' nöbet tutarsa bile' : 'Mesai karşılığıyla'} nöbet branşlarına sığmayan nöbet fazlası. ${E.fazlaGrup.map(f => f.ad + ': ' + fmt(f.v) + ' nöbet').join('; ')}"><b>${E.cikabilir ? `${E.cikabilir} kişi dışarı çıkabilir` : 'Fazlalık var'}</b> <span>${fmt(h.fazlaEf)} nöbetlik fazlalık${E.fazlaGrup.length ? ' · ' + esc(E.fazlaGrup.map(f => f.ad).join(', ')) : ''} — nöbet branşlarına sığmıyor</span></div>`;
    const net = gelecek && E.cikabilir ? `<div class="ap-note" style="margin-top:4px">Net: gelen ${gelecek}, çıkabilir ${E.cikabilir} → ${E.cikabilir >= gelecek ? 'kendi fazlalığı yetiyor' : 'dışarıdan ' + (gelecek - E.cikabilir) + ' kişi gerekir'}</div>` : '';
    const durumRozet = !gelecek && !cikan && h.ihtiyacTur === 'yok' ? '<span class="ap-tag ap-t-ok">Dengede</span>' : '';
    return `<div class="ap-st" data-act="ist-ac" data-v="${esc(b.ad)}"><h3>${esc(b.ad)} ${durumRozet}</h3>
        <div class="ap-bar ${dengeli ? 'ok' : p > h.ihtiyac ? 'fz' : 'bad'}"><i style="width:${oran}%"></i></div>
        <div class="r"><span title="Nöbet yazılan toplam / ayda dolması gereken nöbet">Yazılan / gereken nöbet</span><b>${fmt(p)} / ${h.ihtiyac}</b></div>
        <div class="r"><span title="${fazlaMod ? 'Memur/doktor en çok ' + fmt(S.ayar.azamiMemur) + ' nöbet tutarsa kişilerin toplam kapasitesi' : 'Herkes yalnız mesaisini tamamlayacak kadar nöbet tutarsa kişilerin toplam kapasitesi'}">${fazlaMod ? 'Kapasite (fazla mesaili)' : 'Kapasite (mesai karşılığı)'}</span><b>${fmt(fazlaMod ? h.azamiKap : h.kapasite)}</b></div>
        <div class="r"><span title="Hesaba giren kişi: istasyonda çalışan ve nöbet tutabilen. Dışarıda (geçici görevde) olanların hedefi 0 sayılır, kapasiteye ve ihtiyaca girmez.">Kişi (nöbet tutan)</span><b>${nobetTutan}${disarida ? ` <span class="ap-note">+ ${disarida} dışarıda</span>` : ''}${nobetsiz ? ` <span class="ap-note">+ ${nobetsiz} nöbet tutmaz</span>` : ''}${aile ? ` <span class="ap-note" title="Aile hekimliğine geçen personel listede görünür ama hiçbir hesaba girmez; kendi isteği olmadan geri çağrılmaz">+ ${aile} aile hekimliğinde</span>` : ''}</b></div>
        <div class="ap-yh">Nöbet branşları (${fazlaMod ? 'fazla mesaili' : 'mesai karşılığı'}: dolu / gereken)</div>${yuvaSatir}
        ${gelen}${cikan}${net}${Math.abs(plFark) > 0.01 ? `<div class="ap-note" style="margin-top:6px" title="Yazılan nöbet beklenenden ${fmt(Math.abs(plFark))} ${plFark < 0 ? 'eksik' : 'fazla'}: kilitli değer ya da nöbet branşı kısıtı">Yazılan nöbet beklenenden ${fmt(Math.abs(plFark))} ${plFark < 0 ? 'eksik' : 'fazla'}</div>` : ''}</div>`;
  }

  function panoHtml() {
    const ists = S.plan.birimler.filter(b => b.tur === 'istasyon'), isciTam = C.hedefNobet(C.ayMesai(S.y, S.m, true, S.plan.ozel || {}), 'isci', false, {isciDusulen: S.ayar.isciDusulen}).birim;
    let ih = 0, kap = 0, pl = 0, acik = 0, fazla = 0, fm = 0, azk = 0, of = 0, kisiOner = 0, elle = 0;
    const kat = {};
    const liste = ists.map(b => {
      const h = hesapla(b), p = planlananToplam(h);
      if (b.ekipOf) {
        of++; kat[b.ad] = 'of';
        return `<div class="ap-st" data-act="ist-ac" data-v="${esc(b.ad)}" style="opacity:.75"><h3>${esc(b.ad)} <span class="ap-tag" style="background:#e5e7eb;color:#374151">EKİP OF</span></h3>
          <div class="r"><span>Kişi</span><b>${h.satir.length}</b></div><div class="r"><span>İhtiyaç</span><b>0 (kapalı)</b></div>
          <div class="ap-note" style="margin-top:6px">Personeli diğer istasyonlara görevlendirilebilir.</div></div>`;
      }
      ih += h.ihtiyac; kap += h.kapasite; pl += p; azk += h.azamiKap;
      kat[b.ad] = h.ihtiyacTur !== 'yok' ? h.ihtiyacTur : (h.fazlaVar ? 'fazla' : 'diger');
      if (h.ihtiyacTur === 'oner') { acik++; kisiOner += h.ihtiyacKisi; } else if (h.ihtiyacTur === 'icerde') fm++; else if (h.ihtiyacTur === 'elle') elle++; if (h.fazlaVar) fazla++;
      const beklenen = Math.min(h.ihtiyac, h.azamiKap), plFark = p - beklenen;
      const oran = Math.min(100, Math.round(p / h.ihtiyac * 100)), dengeli = Math.abs(p - h.ihtiyac) < 1e-9;
      const etiket = h.ihtiyacTur === 'oner' ? `<span class="ap-tag ap-t-ih" title="Hedef nöbetle ${fmt(h.hedefAcik)} nöbet açık: gelen ${h.ihtiyacKisi} kişi mesaisini bu istasyonda tamamlar${h.kalanAcik > 0 ? '; kalan ' + fmt(h.kalanAcik) + ' nöbet fazla nöbetle kapanır' : ''}">Personel öner: ${h.ihtiyacKisi} kişi</span>`
        : h.ihtiyacTur === 'icerde' ? `<span class="ap-tag ap-t-fz" title="Açık (${fmt(h.hedefAcik)} nöbet) bir kişinin mesaisini doldurmaya yetmiyor; kişilere hedefin üstünde nöbet yazılarak kapanıyor. Personel önerilmez.">Fazla nöbetle döner (+${fmt(h.hedefAcik)})</span>`
        : h.ihtiyacTur === 'elle' ? `<span class="ap-tag" style="background:#ffedd5;color:#9a3412" title="Azami nöbetle de ${fmt(-h.farkAzami)} nöbet açık ama bir kişi gelirse mesaisini tamamlayamaz. Karar sizde: gerekirse elle görevlendirin.">Elle karar: ${fmt(-h.farkAzami)} açık</span>`
        : h.durum === 'fazla' ? `<span class="ap-tag ap-t-fz" title="Nöbet branşları doluyor ama bazı kişiler hedef nöbetlerini tamamlayamıyor (${fmt(h.fazlaH)} nöbet fazla)">Mesai tamamlayamama ${fmt(h.fazlaH)}</span>`
        : '<span class="ap-tag ap-t-ok">Dengede</span>';
      return kartHtml(b, h, p, etiket, plFark, oran, dengeli, isciTam);
    });
    const f = S.panoFiltre || '', gosterilen = liste.filter((_, i) => !f || kat[ists[i].ad] === f), kartlar = gosterilen.join('');
    const FILTRE_AD = {oner: 'Personel önerilen istasyonlar', icerde: 'Fazla nöbetle kendi içinde dönen istasyonlar', elle: 'Elle karar gerektiren istasyonlar', fazla: S.ayar.panoMod === 'mesai' ? 'Mesai tamamlayamayan istasyonlar' : 'Fazlalığı olan istasyonlar', of: 'Ekip OF (kapalı) istasyonlar'};
    const tk = (v, sayi, renk, etiket, ek) => `<div class="ap-click ${f === v ? 'on' : ''}" data-act="pano-filtre" data-v="${v}" title="Tıklayınca bu istasyonlar gösterilir" tabindex="0"><b style="color:${renk}">${sayi}</b><span>${etiket}${ek || ''}</span></div>`;
    const aktif = S.plan.kayitlar.filter(k => !(durumlar()[k.durum] || {}).pasif && !aileHek(k)).length;
    const attK = S.plan.kayitlar.filter(k => k.sinif === 'memur' && !(durumlar()[k.durum] || {}).pasif), attDog = attK.filter(k => C.surucuDurumu(k, {degil: S.ayar.surDegilEsik / 100}).tip === 'dogrulanmadi').length, attSur = attK.filter(k => C.surucuDurumu(k, {degil: S.ayar.surDegilEsik / 100}).tip === 'surucu').length;
    const uyari = '';
    return `${uyari}<details class="ap-card"><summary><b>Bu değerler ne anlama geliyor?</b></summary>
      <ul class="ap-note" style="line-height:1.7">
        <li><b>Kart okuma:</b> <i>Yazılan / gereken nöbet</i> ayda dolması gereken nöbete karşı yazılan nöbet toplamıdır. <i>Nöbet branşları</i> satırı hedef nöbetle (herkes mesaisi kadar tutarsa) her nöbet branşının ne kadar dolduğunu, <b>−N</b> ise orada kaç nöbet açık kaldığını gösterir. <b>+N kişi gelmeli</b>: açık, gelen kişinin o ay boyunca tüm hedef nöbetini tutmasına yetiyorsa çıkar; hangi nöbet branşı açık olduğuna göre uygun branşlar (Doktor, İşçi, ATT, AABT) yazılır. <b>N kişi dışarı çıkabilir</b>: nöbet branşlarına sığmayan fazla nöbetten hesaplanır. <i>Net</i> satırı ikisini karşılaştırır.</li>
        <li><b>İhtiyaç:</b> ay günü × 3 nöbet branşı (Kasım: 30 × 3 = 90 nöbet). Her gün ekip sorumlusu, yardımcı sağlık personeli ve sürücü gerekir.</li>
        <li><b>Kapasite (hedef):</b> istasyondaki kişilerin ayın mesaisini doldurmak için tutması gereken nöbetlerin toplamı (memur 7, işçi 8,5; izin ve muafiyet düşülür). Doktor yalnızca ekip şefi, işçi yalnızca sürücü nöbet branşını doldurabildiği için fazlası sayılmaz.</li>
        <li><b>Kapasite (azami):</b> memur ve doktora hedefin üstünde yazılabilecek en çok nöbetle (genel 8, istasyon bazında değiştirilebilir) hesaplanan toplam.</li>
        <li><b>Mesai tamamlayamama X:</b> nöbet branşları doluyor ama X nöbetlik fazlalık var; fazlalık genelde ATT'dedir (AABT fazlaya çıkmaz). Bu istasyondan bir ATT bir ay dışarı çıkabilir.</li>
        <li><b>Personel öner: N kişi:</b> kişiler hedef nöbetlerini tamamen tutsa bile istasyonda açık kalıyor ve bu açık, gelen kişinin mesaisini orada tamamlamasına yetiyor (açık ≥ yaklaşık 7 nöbet). N = açık ÷ 7 (aşağı yuvarlanır). Kalan küçük kısım fazla nöbetle kapanır.</li>
        <li><b>Fazla nöbetle döner:</b> açık bir kişiyi doldurmaya yetmiyor (7'den az); kişilere hedefin üstünde, azami sınıra kadar nöbet yazılarak kapanıyor. Personel önerilmez.</li>
        <li><b>Elle karar:</b> azami nöbetle bile açık kalıyor ama açık bir kişinin mesaisini doldurmaya yetmiyor. Gelen kişi fazla kalır; görevlendirme gerekip gerekmediğine siz karar verirsiniz (Görevlendirme sayfasından elle yapılır).</li>
        <li><b>Nöbet branşları ve yetenekler:</b> her istasyonda üç nöbet branşı vardır: ekip şefi (ES), yardımcı sağlık personeli (YSP), sürücü. Doktor yalnızca ES, işçi yalnızca sürücü; <b>AABT</b> (ASOS'ta sağlık teknikeri) ekip şefi ve YSP nöbet branşında; sürücü nöbet branşına yalnız nöbet listelerinde sürücü olarak nöbet tuttuğu doğrulanırsa; <b>ATT</b> (sağlık memuru / teknisyeni) YSP ve sürücü nöbet branşında çalışır, <b>ekip şefi nöbet branşına girmez</b>. Nöbet branşları önce AABT doldurur (ekip şefi öncelikli; gerekirse hedefin üstüne +1 nöbet yazılır), fazlalık ATT'de görünür ve bir ATT bir ay dışarı çıkabilir. Rol Nöbet Listesi Raporu'ndaki nöbet görevlerinden otomatik belirlenir, istasyon sayfasından değiştirilebilir. Bir grubun fazlası başka nöbet branşını doldurmaz.</li>
        <li><b>Ekip OF:</b> kapalı ekip; ihtiyaç 0 sayılır.</li>
        <li><b>Plan farkı:</b> planlanan nöbet toplamı ile olması gereken (ihtiyaç ya da azami kapasite, hangisi küçükse) arasındaki fark. Normalde görünmez; elle girilip kilitlenen değerler varsa çıkar.</li></ul></details>
      <div class="ap-sum ap-sum1"><div class="ap-click ${f ? '' : 'on'}" data-act="pano-filtre" data-v="" title="Tüm istasyonları göster" tabindex="0"><b>${ists.length - of}</b><span>Açık istasyon</span></div>${of ? tk('of', of, 'inherit', 'Ekip OF (kapalı)') : ''}<div><b>${aktif}</b><span>Aktif kayıt</span></div>
      <div><b>${ih}</b><span>Toplam ihtiyaç (nöbet)</span></div><div><b>${fmt(S.ayar.panoMod === 'mesai' ? kap : azk)}</b><span>${S.ayar.panoMod === 'mesai' ? 'Kapasite (mesai karşılığı)' : `Kapasite (en çok ${fmt(S.ayar.azamiMemur)} nöbet)`}</span></div>
      <div><b>${fmt(pl)}</b><span>Planlanan</span></div>${tk('oner', acik, 'var(--ap-bad)', 'Personel önerilen istasyon', ` (toplam ${kisiOner} kişi)`)}${S.ayar.panoMod === 'mesai' ? '' : tk('icerde', fm, 'var(--ap-warn)', 'Fazla nöbetle kendi içinde dönen')}${tk('elle', elle, '#9a3412', S.ayar.panoMod === 'mesai' ? 'Açık kalan (kişiye yetmeyen)' : 'Elle karar gerektiren')}${tk('fazla', fazla, 'var(--ap-warn)', S.ayar.panoMod === 'mesai' ? 'Mesai tamamlayamayan' : 'Fazlalığı olan (fazla mesaili)')}</div>
      ${f ? `<div class="ap-row"><b>${FILTRE_AD[f]}: ${gosterilen.length}</b><button class="ap-btn sm" data-act="pano-filtre" data-v="">✕ Filtreyi kaldır</button><span class="ap-note">Kartlara tıklayarak istasyonu açabilirsiniz.</span></div>` : ''}
      <div class="ap-toolbar ap-noprint"><button class="ap-btn pri" data-act="oner-hepsi" title="Tüm istasyonlarda planlanan nöbetleri yeniden hesaplar">Planlananı yeniden hesapla</button>
      <button class="ap-btn" data-act="excel-toplu">Toplu Excel</button>
      <span class="ap-seg" title="Mesai karşılığı: herkes yalnız mesaisini tamamlayacak kadar nöbet tutar. Fazla mesaili: memur/doktora yazdığınız nöbet sayısına kadar fazla nöbet yazılabilir."><button class="${S.ayar.panoMod === 'mesai' ? 'on' : ''}" data-act="pano-mod" data-v="mesai">Mesai karşılığı</button><button class="${S.ayar.panoMod !== 'mesai' ? 'on' : ''}" data-act="pano-mod" data-v="fazla">Fazla mesaili</button></span>
      <label class="ap-note ap-azami ${S.ayar.panoMod === 'mesai' ? 'off' : ''}" title="Memur ve doktora bir ayda yazılabilecek en çok 24 saatlik nöbet sayısı. Yazdığınız sayıya göre pano yeniden hesaplanır (istasyon sayfasından istasyona özel değiştirilebilir).">Memur/doktor en çok <input class="ap-in n" type="number" min="0" step="0.5" data-pano-azami value="${S.ayar.azamiMemur}" ${S.ayar.panoMod === 'mesai' || salt() ? 'disabled' : ''}> nöbet</label>
      <span class="ap-note">${AYLAR[S.m]}: ${C.gunSayisi(S.y, S.m)} gün × ${C.YUVA_VARSAYILAN} nöbet branşı = ${C.gunSayisi(S.y, S.m) * C.YUVA_VARSAYILAN} nöbet/istasyon · memur ${fmt(C.ayMesai(S.y, S.m, false, ozel()))} sa., işçi ${fmt(C.ayMesai(S.y, S.m, true, ozel()))} sa.</span></div>
      <div class="ap-grid">${kartlar || `<div class="ap-empty">${f ? 'Bu grupta istasyon yok' : 'İstasyon yok'}</div>`}</div>`;
  }

  function lejant() {
    const D = durumlar(), ek = [['#FFFF00', 'Yıllık izin'], ['#95B3D7', 'Geçici görevli + izin']];
    const set = new Map(); Object.entries(D).forEach(([k, v]) => { if (v.renk && !v.pasif) { const t = set.get(v.renk) || []; t.push(k); set.set(v.renk, t); } });
    return `<div class="ap-legend">${ek.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}${[...set].map(([c, t]) => `<span><i style="background:${c}"></i>${t.join(' / ')}</span>`).join('')}</div>`;
  }

  // Yuva bazlı özet: üç yuva (ekip şefi, YSP, sürücü) için dolan/açık ve hangi grubun doldurduğu; gruplara göre fazlalar
  function slotOzet(h) {
    const d = h.slot, H = d.hedef, A = d.azami, SL = [['es', 'Ekip şefi nöbet branşı'], ['ysp', 'YSP nöbet branşı'], ['sur', 'Sürücü nöbet branşı']];
    const katki = sl => C.GRUPLAR.filter(g => H.fill[g][sl] > 0.001).map(g => `${C.GRUP_AD[g]} ${fmt(H.fill[g][sl])}`).join(' + ') || '—';
    const satir = SL.map(([sl, ad]) => `<div class="r" style="margin:3px 0"><b style="min-width:150px;display:inline-block">${ad}</b> ${fmt(d.dem[sl])} nöbet · dolan <b>${fmt(d.dem[sl] - H.rem[sl])}</b> <span class="ap-note">(${katki(sl)})</span> ${H.rem[sl] > 0.001 ? `<span class="ap-tag ap-t-ih">${fmt(H.rem[sl])} açık</span> <span class="ap-note">${A.rem[sl] > 0.001 ? 'azamiyle de ' + fmt(A.rem[sl]) + ' açık kalır' : 'azami nöbetle kapanır'}</span>` : '<span class="ap-tag ap-t-ok">dolu</span>'}</div>`).join('');
    const fazla = C.GRUPLAR.filter(g => H.fazla[g] > 0.001).map(g => `<span class="ap-tag ap-t-fz">${C.GRUP_AD[g]}: ${fmt(H.fazla[g])} nöbet fazla</span>`).join(' ');
    return `<div class="ap-card" style="margin-top:8px;padding:10px"><b>Nöbet branşı dengesi (hedef nöbetle)</b>${satir}
      ${fazla ? `<div style="margin-top:4px">${fazla} <span class="ap-note">fazla = o gruptaki kişiler hedef nöbetlerini tamamlayamıyor; başka nöbet branşını dolduramaz</span></div>` : ''}
      <div class="ap-note" style="margin-top:4px">Yetenekler: doktor → ekip şefi · işçi → sürücü · AABT (sağlık teknikeri) → ekip şefi, YSP; sürücü nöbet branşına yalnız nöbet listesinde sürücü görünüyorsa · ATT (sağlık memuru / teknisyeni) → YSP ve sürücü; ATT ekip şefi nöbet branşına girmez. Önce AABT nöbet branşları doldurur (ekip şefi öncelikli), fazlalık ATT'de görünür.</div></div>`;
  }
  function istHtml() {
    const birimler = S.plan.birimler;
    const b = birimler.find(x => x.ad === S.ist) || birimler[0];
    if (!b) return '<div class="ap-card ap-empty">Birim yok.</div>';
    S.ist = b.ad;
    const D = durumlar(), duz = !salt();
    const kis = S.plan.kayitlar.filter(k => k.birim === b.ad || (k.gorev && k.gorev.hedef === b.ad && (D[k.durum] || {}).disarida)).sort(personelSirala);
    const istas = b.tur === 'istasyon', h = istas ? hesapla(b) : null;
    const disSay = S.plan.kayitlar.filter(k => k.birim === b.ad && gorevAktif(k.gorev) && k.gorev.hedef).length;
    const satirMap = new Map(); if (h) h.satir.forEach(s => satirMap.set(s.k.id, s));
    const p = h ? planlananToplam(h) : 0;
    let son = '', rows = '';
    kis.forEach(k => {
      const gelen = k.birim !== b.ad, s = satirMap.get(k.id), dt = D[k.durum] || {};
      if (!gelen && son && k.sinif !== son) rows += '<tr class="sep"><td colspan="16"></td></tr>';
      if (!gelen) son = k.sinif;
      const renk = gelen ? D['GEÇİCİ GÖREVLİ'].renk : satirRenk(k), eng = C.gorevlendirmeEngeli(k, ayIlk());
      const dis = duz ? '' : 'disabled';
      const fark = s ? sayi(k.planlanan) - s.hedef : 0;
      rows += `<tr class="c" style="${renk ? 'background:' + renk : ''}">
        <td><input class="ap-in w" data-id="${k.id}" data-f="ad" value="${esc(k.ad)}" ${dis}></td>
        <td><input class="ap-in w" data-id="${k.id}" data-f="unvan" value="${esc(k.unvan)}" ${dis} title="${esc(k.dortB ? '4/B' : '')}">${k.dortB ? '<span class="ap-tag ap-t-fz" title="4/B personel">4/B</span>' : ''}</td>
        <td><select class="ap-sel" data-id="${k.id}" data-f="sinif" ${dis}>${Object.entries(SINIF_AD).map(([a, t]) => `<option value="${a}" ${a === k.sinif ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
        <td>${k.sinif === 'memur' ? `${(() => { const sd = C.surucuDurumu(k, {degil: S.ayar.surDegilEsik / 100}); return `<select class="ap-sel" data-id="${k.id}" data-f="rolManuel" ${dis} title="Boş: nöbet listelerinden otomatik. AABT ve ATT sürücü nöbet branşına yalnız nöbet listesinde sürücü görünüyorsa girer; ATT ekip şefi nöbet branşına girmez."><option value="">Oto: ${esc(s ? ({dok: 'Doktor', isci: 'İşçi', ke: 'AABT: ekip şefi+YSP', ka: 'AABT: sürücü dahil', ysp: 'Yalnız YSP', sy: 'Sürücü+YSP'})[s.grup] : '')}</option>${(s && s.kadroTip === 'AABT' ? [['ysp', 'Ekip şefi+YSP (sürücü değil)'], ['sur', 'Sürücü dahil']] : [['ysp', 'Yalnız YSP'], ['sur', 'Sürücü+YSP']]).map(([r, t]) => `<option value="${r}" ${(k.rolManuel === r || (r === 'sur' && k.rolManuel === 'karma')) ? 'selected' : ''}>${t}</option>`).join('')}</select><div class="ap-note">${sd.kaynak === 'manuel' ? 'elle seçildi' : sd.kaynak === 'kayit' ? `sürücü %${Math.round(100 * sd.pay)}` : '<span style="color:var(--ap-warn)">doğrulanmadı</span>'}</div>`; })()}` : `<span class="ap-note">${k.sinif === 'doktor' ? 'Ekip şefi' : 'Sürücü'}</span>`}</td>
        <td>${gelen ? '<b>GEÇİCİ GÖREVLİ</b>' : `<select class="ap-sel" data-id="${k.id}" data-f="durum" ${dis}><option value="">—</option>${Object.keys(D).map(a => `<option ${a === k.durum ? 'selected' : ''}>${a}</option>`).join('')}</select>`}${k.durumMetin && k.durumMetin !== k.durum ? `<div class="ap-note">${esc(k.durumMetin)}</div>` : ''}</td>
        <td><input class="ap-in n" type="number" min="0" step="0.5" data-id="${k.id}" data-f="izinGun" value="${izinGun(k) || ''}" ${dis}>${izinTarihli(k) && izinAyGun(k) !== izinGun(k) ? `<div class="ap-note" title="İznin başlangıç-bitiş tarihleri ASOS'tan geldi; mesaiyi yalnız plan ayına düşen günler etkiler">${ayEtiket()}'da ${izinAyGun(k)} gün · mesaiden ${fmt(C.kisiMesai({...k, izin: [], sut: 0, durum: ''}, S.y, S.m, ozel(), durumlar()) - C.kisiMesai({...k, sut: 0, durum: ''}, S.y, S.m, ozel(), durumlar()))} saat düşer</div>` : ''}</td>
        <td><select class="ap-sel" data-id="${k.id}" data-f="izinTur" ${dis}><option value="">—</option>${IZIN_TURLERI.map(a => `<option ${a === ((k.izin || [])[0] || {}).tur ? 'selected' : ''}>${a}</option>`).join('')}</select></td>
        <td class="num">${s ? fmt(s.mesai) : ''}</td><td class="num">${s ? fmt(s.hedef) : ''}</td><td class="num">${s && !s.nobetYok ? fmt(s.azami) : ''}</td>
        <td>${istas && !(s && s.nobetYok) ? `<input class="ap-in n" type="number" min="0" step="0.5" data-id="${k.id}" data-f="planlanan" value="${k.planlanan ?? ''}" ${dis}>` : ''}</td>
        <td class="num ${fark > 0 ? 'ap-pos' : fark < 0 ? 'ap-neg' : ''}">${s && !s.nobetYok && k.planlanan != null ? (fark > 0 ? '+' : '') + fmt(fark) : ''}</td>
        <td>${istas && !(s && s.nobetYok) ? `<input type="checkbox" data-id="${k.id}" data-f="kilit" ${k.kilit ? 'checked' : ''} ${dis} title="Kilitli değer otomatik hesapta değişmez. Elle girilen planlanan değer kendiliğinden kilitlenir; kilidi açınca yeniden hesaplanır.">` : ''}</td>
        <td>${esc(gelen ? k.birim + ' kadrosundan' : gorevMetin(k))}${eng ? `<div class="ap-note" style="color:var(--ap-bad)">${esc(eng)}</div>` : ''}</td>
        <td><select class="ap-sel" data-id="${k.id}" data-f="yolluk" ${dis}>${['', 'YOLLUKLU', 'YOLLUKSUZ'].map(a => `<option ${a === ((k.gorev || {}).yolluk || '') ? 'selected' : ''}>${a}</option>`).join('')}</select></td>
        <td>${gelen ? `<button class="ap-btn sm" data-act="gorev-bitir" data-id="${k.id}" ${duz ? '' : 'disabled'} title="Geri gönder: görevlendirmeyi bitirir, kişi ${esc(k.birim)} istasyonuna geri döner">↩ Geri</button>` : (gorevAktif(k.gorev) ? `<button class="ap-btn sm" data-act="gorev-bitir" data-id="${k.id}" ${duz ? '' : 'disabled'} title="Geri çağır: görevlendirmeyi bitirir, kişi bu istasyona geri döner">↩ Geri</button> ` : '')}${duz && !gelen ? `<button class="ap-btn sm dng" data-act="kisi-sil" data-id="${k.id}" title="Kaydı sil">✕</button>` : ''}</td></tr>`;
    });
    const durumBar = h && b.ekipOf ? `<div class="ap-card"><b>EKİP OF — bu ekip kapalı.</b> İhtiyaç 0 sayılır. Personeli diğer istasyonlara <b>uzun süreli</b> görevlendirilir (Görevlendirme sayfasındaki rotasyon önerisi açık uçlu görev yazar) ve ekip yeniden açılırken <b>geri çağrılır</b>: kutunun işaretini kaldırdığınızda ya da "Personeli geri çağır" düğmesiyle. Kapalı ekibe görevlendirme yapılamaz.</div>` : h ? `<div class="ap-card"><div class="ap-row"><b>Plan: ${fmt(p)} / ${h.ihtiyac}</b>
      <span class="ap-tag ${Math.abs(p - h.ihtiyac) < 1e-9 ? 'ap-t-ok' : 'ap-t-ih'}">${Math.abs(p - h.ihtiyac) < 1e-9 ? 'İhtiyaçla eşit' : (p < h.ihtiyac ? fmt(h.ihtiyac - p) + ' nöbet planlanamadı' : fmt(p - h.ihtiyac) + ' nöbet fazla')}</span>
      <span>Kapasite: hedef <b>${fmt(h.kapasite)}</b> · azami <b>${fmt(h.azamiKap)}</b></span>
      <label class="ap-note" title="Boş bırakırsanız genel azami (${fmt(S.ayar.azamiMemur)}) kullanılır">Bu istasyonda azami nöbet (memur/doktor) <input class="ap-in n" type="number" step="0.5" min="0" data-ib="${esc(b.ad)}" value="${b.azamiMemur != null ? b.azamiMemur : ''}" placeholder="${fmt(S.ayar.azamiMemur)}" ${duz ? '' : 'disabled'}></label>
      ${h.ihtiyacTur === 'oner' ? `<span class="ap-tag ap-t-ih">Personel öner: ${h.ihtiyacKisi} kişi (hedefle ${fmt(h.hedefAcik)} nöbet açık${h.kalanAcik > 0 ? ', ' + fmt(h.kalanAcik) + ' nöbet fazla nöbetle' : ''})</span>` : h.ihtiyacTur === 'icerde' ? `<span class="ap-tag ap-t-fz">Fazla nöbetle kendi içinde döner: hedefin ${fmt(h.hedefAcik)} nöbet üstü yazılıyor, personel önerilmez</span>` : h.ihtiyacTur === 'elle' ? `<span class="ap-tag" style="background:#ffedd5;color:#9a3412">Elle karar: azamiyle de ${fmt(-h.farkAzami)} nöbet açık; gelen kişi mesaisini tamamlayamaz</span>` : ''}${h.durum === 'fazla' ? `<span class="ap-tag ap-t-fz">Mesai tamamlayamama ${fmt(h.fazlaH)}</span>` : ''}
      </div>${slotOzet(h)}<div class="ap-note">İhtiyaç = ${h.gun} gün × ${b.yuva || 3} nöbet branşı${b.tip ? ` · İstasyon tipi ${esc(b.tip)}${b.tip === 'A1' ? ' (doktorlu)' : ''}` : ''}. Doktor yalnızca ekip şefi nöbet branşını (${h.gun}) doldurur; işçi sürücü nöbet branşında 12 saatlik nöbet tutar (en çok ${h.gun}); kalanı memur karşılar. Memur/doktor hedefin üstünde en çok ${fmt(b.azamiMemur != null ? b.azamiMemur : S.ayar.azamiMemur)} nöbet yazılır; işçi hedefin üstünde nöbet tutmaz.</div></div>` : '';
    return `<div class="ap-row ap-noprint"><select class="ap-sel" data-act="ist-sec">${birimler.map(x => `<option ${x.ad === b.ad ? 'selected' : ''}>${esc(x.ad)}</option>`).join('')}</select>
      <button class="ap-btn" data-act="ist-onceki">‹</button><button class="ap-btn" data-act="ist-sonraki">›</button>
      ${istas ? `<button class="ap-btn pri" data-act="oner" ${duz ? '' : 'disabled'} title="Plan her değişiklikte otomatik hesaplanır; bu düğme kilitli olmayan değerleri yeniden hesaplar">Yeniden hesapla</button>` : ''}
      <button class="ap-btn" data-act="kisi-ekle" ${duz ? '' : 'disabled'}>+ Kişi ekle</button>
      ${disSay ? `<button class="ap-btn" data-act="geri-cagir" data-v="${esc(b.ad)}" ${duz ? '' : 'disabled'} title="Bu ekibin başka birimlere görevli personelini geri çağırır">Personeli geri çağır (${disSay})</button>` : ''}<button class="ap-btn" data-act="png" data-v="${esc(b.ad)}">Görüntü (PNG)</button><button class="ap-btn" data-act="excel-ist" data-v="${esc(b.ad)}">Excel</button>
      ${istas ? `<label class="ap-note" title="Kapalı ekip: ihtiyaç 0 sayılır; işareti kaldırınca ekip açılır ve personel geri çağrılabilir"><input type="checkbox" data-act="ekip-of" data-v="${esc(b.ad)}" ${b.ekipOf ? 'checked' : ''} ${duz ? '' : 'disabled'}> <b>Ekip OF (kapalı)</b></label>` : ''}
      <label class="ap-note"><input type="checkbox" data-act="tahmini" ${S.ayar.tahminiGoster ? 'checked' : ''}> Çıktıda tahmini nöbeti göster</label></div>
      ${durumBar}${lejant()}
      <div class="ap-tw ap-tw-ist"><table class="ap-t ap-ist"><colgroup><col style="width:14.5%"><col style="width:8.5%"><col style="width:6%"><col style="width:10.5%"><col style="width:10.3%"><col style="width:4%"><col style="width:5.8%"><col style="width:3.6%"><col style="width:3.1%"><col style="width:3.3%"><col style="width:4.8%"><col style="width:3.1%"><col style="width:2.2%"><col style="width:9.2%"><col style="width:6%"><col style="width:5.1%"></colgroup><thead><tr><th>AD SOYAD</th><th>ÜNVAN</th><th>SINIF</th><th>NÖBET ROLÜ</th><th>G.GÖREV DURUMU</th><th>İZİN GÜN</th><th>İZİN TÜRÜ</th><th>MESAİ</th><th>HEDEF</th><th>AZAMİ</th><th>PLAN</th><th>FARK</th><th>🔒</th><th>GEÇİCİ GÖREV</th><th>YOLLUK</th><th>İŞLEM</th></tr></thead><tbody>${rows || '<tr><td colspan="16" class="ap-empty">Bu birimde kayıt yok</td></tr>'}</tbody></table></div>`;
  }

  function gorevHtml() {
    const D = durumlar(), duz = !salt(), birimler = S.plan.birimler;
    const ists = birimler.filter(b => b.tur === 'istasyon' && !b.ekipOf).map(b => ({b, h: hesapla(b)}));
    const acik = ists.filter(x => x.h.ihtiyacTur === 'oner').sort((a, b) => b.h.acikEf - a.h.acikEf);
    const ic = ists.filter(x => x.h.ihtiyacTur === 'icerde' || x.h.ihtiyacTur === 'elle').sort((a, b) => b.h.hedefAcik - a.h.hedefAcik);
    const fazla = ists.filter(x => x.h.fazlaVar).sort((a, b) => b.h.fazlaEf - a.h.fazlaEf);
    const gk = S.plan.kayitlar.filter(k => k.gorev && (k.gorev.hedef || k.gorev.yer)).sort((a, b) => trCollator.compare(a.birim, b.birim) || trCollator.compare(a.ad, b.ad));
    const opts = k => `<option value="">— (kaldır)</option>${birimler.map(b => `<option ${b.ad === k.gorev.hedef ? 'selected' : ''}>${esc(b.ad)}</option>`).join('')}`;
    const rows = gk.map(k => {
      const eng = C.gorevlendirmeEngeli(k, ayIlk()), dy = k.dortB && k.memBas ? C.dortYilDurum(k.memBas, ayIlk()) : null;
      return `<tr><td>${esc(k.ad)}</td><td>${esc(k.unvan)}${k.dortB ? ' <span class="ap-tag ap-t-fz">4/B</span>' : ''}${dy && !dy.uygun ? `<div class="ap-note" style="color:var(--ap-bad)">4 yıl dolumu: ${dy.dolum.split('-').reverse().join('.')}</div>` : dy && dy.yakinda ? '<div class="ap-note">yakında uygun</div>' : ''}</td><td>${esc(k.birim)}</td>
      <td><select class="ap-sel" data-id="${k.id}" data-f="gHedef" ${duz ? '' : 'disabled'}>${opts(k)}</select>${k.gorev.hedef ? '' : `<div class="ap-note">${esc(k.gorev.yer || '')}</div>`}</td>
      <td><input class="ap-in w" data-id="${k.id}" data-f="gTarih" value="${esc(k.gorev.tarih || '')}" ${duz ? '' : 'disabled'}></td>
      <td><select class="ap-sel" data-id="${k.id}" data-f="yolluk" ${duz ? '' : 'disabled'}>${['', 'YOLLUKLU', 'YOLLUKSUZ'].map(a => `<option ${a === (k.gorev.yolluk || '') ? 'selected' : ''}>${a}</option>`).join('')}</select></td>
      <td><select class="ap-sel" data-id="${k.id}" data-f="gGerekce" ${duz ? '' : 'disabled'}>${GEREKCE.map(a => `<option ${a === (k.gorev.gerekce || '') ? 'selected' : ''}>${a}</option>`).join('')}</select></td>
      <td>${eng ? `<span class="ap-tag ap-t-ih" title="${esc(eng)}">Engel</span>` : ''}</td></tr>`;
    }).join('');
    // basit eşleştirme önerisi
    const oner = []; let fz = fazla.map(x => ({ad: x.b.ad, k: x.h.fazlaEf})), ac = acik.map(x => ({ad: x.b.ad, k: x.h.hedefAcik}));
    for (const a of ac) for (const f of fz) { const m = Math.min(a.k, f.k); if (m >= 4) { oner.push(`${f.ad} → ${a.ad}: yaklaşık ${fmt(m)} nöbet (≈ ${Math.max(1, Math.round(m / 7.5))} kişi)`); a.k -= m; f.k -= m; } }
    // Dağıtım sonucu: önerilen rotasyon tüm istasyonlara uygulanınca hâlâ personel bekleyen istasyonlar. Fazla nöbetle kapanan istasyonlara personel gönderilmez; kalan açık fazla nöbetle kapanır.
    const rotOner = rotasyonOneriler(), gidenSay = {}; rotOner.forEach(o => { if (o.hedef) gidenSay[o.hedef] = (gidenSay[o.hedef] || 0) + 1; });
    const karsilanamayan = acik.filter(x => x.h.ihtiyacTur === 'oner' && x.h.ihtiyacKisi > (gidenSay[x.b.ad] || 0)), fazlaIleDolan = [...ic].filter(x => x.h.ihtiyacTur === 'icerde');
    const dagitimOzet = `<div class="ap-ek ap-ek-c" style="margin:8px 0"><b>Dağıtım sonucu:</b> ${rotOner.filter(o => o.hedef).length} kişi gerçekten ihtiyacı olan istasyonlara yönlendirildi. ${karsilanamayan.length ? `<b>${karsilanamayan.length} istasyonun ihtiyacı karşılanamadı</b> (${karsilanamayan.slice(0, 8).map(x => `${esc(x.b.ad)} −${x.h.ihtiyacKisi - (gidenSay[x.b.ad] || 0)} kişi`).join(', ')}${karsilanamayan.length > 8 ? ' …' : ''}); kalan açık o istasyonlarda fazla nöbetle kapanır.` : 'Personel bekleyen istasyon kalmadı.'} ${fazlaIleDolan.length ? `Fazla nöbetle kapanan ${fazlaIleDolan.length} istasyona (açığı bir kişiye yetmiyor) personel gönderilmez.` : ''}</div>`;
    const degerlendirme = `<div class="ap-card"><h2>Personel ihtiyacı değerlendirmesi — ${ayEtiket()}</h2>
      ${dagitimOzet}
      <p class="ap-note">${S.ayar.panoMod === 'mesai' ? 'Mod: <b>Mesai karşılığı</b>. Ölçüt: kişiler yalnız hedef nöbetlerini tutarsa istasyon açık kalıyorsa ve bu açık, gelen bir kişinin mesaisini orada tamamlamasına yetiyorsa personel önerilir.' : `Mod: <b>Fazla mesaili</b> (memur/doktor en çok ${fmt(S.ayar.azamiMemur)} nöbet). Ölçüt: fazla nöbet yazıldıktan sonra da istasyon açık kalıyorsa ve bu açık, gelen bir kişinin mesaisini tamamlamasına yetiyorsa personel önerilir; fazla nöbetle kapanıyorsa önerilmez.`} İsterseniz aşağıdaki "Görevlendirmeler" bölümünden elle görevlendirme yapabilirsiniz.</p>
      <div class="ap-tw"><table class="ap-t"><thead><tr><th>İSTASYON</th><th>MESAİ KARŞILIĞI AÇIK</th>${S.ayar.panoMod === 'mesai' ? '' : '<th>FAZLA NÖBETLE AÇIK</th>'}<th>KAÇ KİŞİ GEREKİR</th><th>DEĞERLENDİRME</th></tr></thead><tbody>
      ${[...acik, ...ic].map(x => `<tr><td><b>${esc(x.b.ad)}</b></td><td class="num">${fmt(x.h.hedefAcik)}</td>${S.ayar.panoMod === 'mesai' ? '' : `<td class="num">${fmt(Math.max(0, x.h.acikEf))}</td>`}<td class="num">${x.h.ihtiyacKisi}</td>
      <td>${x.h.ihtiyacTur === 'oner' ? `<span class="ap-tag ap-t-ih">Personel öner: ${x.h.ihtiyacKisi} kişi</span>${x.h.kalanAcik > 0 ? ` <span class="ap-note">+ ${fmt(x.h.kalanAcik)} nöbet fazla nöbetle</span>` : ''}` : x.h.ihtiyacTur === 'icerde' ? '<span class="ap-tag ap-t-fz">Fazla nöbetle kapanır — personel önerilmez</span>' : `<span class="ap-tag" style="background:#ffedd5;color:#9a3412">${S.ayar.panoMod === 'mesai' ? 'Açık kalıyor (bir kişiyi doldurmaz)' : 'Elle karar'}</span>`}</td></tr>`).join('') || `<tr><td colspan="${S.ayar.panoMod === 'mesai' ? 4 : 5}" class="ap-empty">Açık veren istasyon yok</td></tr>`}</tbody></table></div></div>`;
    const sekme = S.gorevSekme || 'deg';
    const sekmeler = [['deg', 'Personel ihtiyacı değerlendirmesi'], ['rot', 'Aylık rotasyon'], ['list', `Görevlendirmeler (${gk.length})`], ['ozet', 'Açık / fazla istasyonlar']];
    const nav = `<div class="ap-subnav ap-noprint">${sekmeler.map(([v, t]) => `<button class="${sekme === v ? 'on' : ''}" data-act="gorev-sekme" data-v="${v}">${t}</button>`).join('')}</div>`;
    const ozet = `<div class="ap-two"><div class="ap-card"><h2>Personel önerilen istasyonlar (${acik.length})</h2>${acik.map(x => `<div class="ap-row"><b>${esc(x.b.ad)}</b><span class="ap-tag ap-t-ih">${x.h.ihtiyacKisi} kişi · ${fmt(x.h.hedefAcik)} nöbet açık</span></div>`).join('') || '<span class="ap-note">Yok</span>'}</div>
      <div class="ap-card"><h2>Mesai tamamlayamayan istasyonlar (${fazla.length})</h2>${fazla.map(x => `<div class="ap-row"><b>${esc(x.b.ad)}</b><span class="ap-tag ap-t-fz">${fmt(x.h.fazlaH)} nöbet fazla</span></div>`).join('') || '<span class="ap-note">Yok</span>'}</div></div>
      ${oner.length ? `<div class="ap-card"><h2>Eşleştirme önerisi</h2>${oner.map(t => `<div>${esc(t)}</div>`).join('')}<div class="ap-note">Öneri yalnızca büyüklük gösterir. Kişi seçerken 4/B kuralı (4 yıl dolmadan başka istasyona görevlendirme yasak) otomatik denetlenir.</div></div>` : ''}
`;
    const liste = `<div class="ap-card"><div class="ap-row"><h2 style="margin:0">Görevlendirmeler (${gk.length})</h2>
      <input class="ap-in" list="ap-kisi-list" id="ap-g-kisi" placeholder="Kişi ara…"><datalist id="ap-kisi-list">${S.plan.kayitlar.filter(k => !k.gorev || !k.gorev.hedef).slice(0, 2000).map(k => `<option value="${esc(k.ad)}">`).join('')}</datalist>
      <select class="ap-sel" id="ap-g-hedef">${birimler.map(b => `<option>${esc(b.ad)}</option>`).join('')}</select>
      <button class="ap-btn pri" data-act="g-ekle" ${duz ? '' : 'disabled'}>Görevlendir</button></div>
      <div class="ap-tw"><table class="ap-t"><thead><tr><th>AD SOYAD</th><th>ÜNVAN</th><th>KAYNAK</th><th>HEDEF</th><th>TARİH</th><th>YOLLUK</th><th>GEREKÇE</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="ap-empty">Görevlendirme yok</td></tr>'}</tbody></table></div></div>`;
    return nav + ({deg: degerlendirme, rot: sekme === 'rot' ? rotasyonHtml() : '', ozet, list: liste}[sekme] || degerlendirme);
  }
  function personelHtml() {
    const D = durumlar(), f = S.filtre, q = C.TR(f.q);
    let liste = S.plan.kayitlar.filter(k => (!f.durum || k.durum === f.durum || (f.durum === '_izin' && izinGun(k) > 0)) && (!f.birim || k.birim === f.birim) && (!f.sinif || k.sinif === f.sinif) && (!f.surucu || (k.sinif === 'memur' && C.kadroTip(k) === 'ATT' && C.surucuDurumu(k, {degil: S.ayar.surDegilEsik / 100}).tip === f.surucu)) && (!q || C.TR(k.ad + ' ' + (k.tc || '')).includes(q)));
    const boyut = S.pBoyut || 50, sayfaSay = Math.max(1, Math.ceil(liste.length / boyut)); if (S.pSayfa >= sayfaSay) S.pSayfa = sayfaSay - 1; if (S.pSayfa < 0) S.pSayfa = 0;
    const bas = S.pSayfa * boyut, gos = liste.slice(bas, bas + boyut);
    const rows = gos.map(k => {
      const dy = k.dortB && k.memBas ? C.dortYilDurum(k.memBas, ayIlk()) : null;
      return `<tr><td>${esc(k.ad)}${k.asosYok ? ' <span class="ap-tag ap-t-fz" title="ASOS listelerinde bulunamadı">ASOS\'ta yok</span>' : ''}</td><td>${esc(k.tc || '')}</td><td>${esc(k.unvan)}${k.dortB ? ' <span class="ap-tag ap-t-fz">4/B</span>' : ''}</td><td>${SINIF_AD[k.sinif] || ''}</td><td>${esc(k.birim)}</td><td>${C.GRUP_AD[C.grupBelirle(k, {degil: S.ayar.surDegilEsik / 100}, S.ayar)]}${k.rolManuel ? ' (elle)' : ''}</td><td>${(() => { if (k.sinif !== 'memur' || C.kadroTip(k) !== 'ATT') return ''; const sd = C.surucuDurumu(k, {degil: S.ayar.surDegilEsik / 100}); return sd.tip === 'surucu' ? `Sürücü${sd.kaynak === 'kayit' ? ' (%' + Math.round(100 * sd.pay) + ')' : ' (elle)'}` : sd.tip === 'degil' ? 'Sürücü değil' : '<span class="ap-tag ap-t-fz">Doğrulanmadı</span>'; })()}</td><td>${esc(durumGosterim(k))}</td>
      <td>${k.memBas ? k.memBas.split('-').reverse().join('.') : ''}${k.dortB && !k.memBas ? '<span class="ap-tag ap-t-ih">tarih yok</span>' : ''}</td><td>${dy ? (dy.uygun ? 'Uygun' : esc(dy.dolum.split('-').reverse().join('.'))) : ''}</td><td class="num">${k.yillikKalan != null ? fmt(k.yillikKalan) : ''}</td></tr>`;
    }).join('');
    const pager = () => { const dugme = (v, t, on, dis) => `<button class="ap-btn sm ${on ? 'on' : ''}" data-act="p-git" data-v="${v}" ${dis ? 'disabled' : ''}>${t}</button>`;
      const p = S.pSayfa, bas0 = Math.max(0, Math.min(p - 3, sayfaSay - 7)), nums = []; for (let i = bas0; i < Math.min(sayfaSay, bas0 + 7); i++) nums.push(dugme(i, i + 1, i === p));
      return `<div class="ap-pager ap-noprint">${dugme(0, '«', false, p === 0)}${dugme(p - 1, '‹ Önceki', false, p === 0)}${nums.join('')}${dugme(p + 1, 'Sonraki ›', false, p >= sayfaSay - 1)}${dugme(sayfaSay - 1, '»', false, p >= sayfaSay - 1)}
        <span class="ap-note">${liste.length ? bas + 1 : 0}–${Math.min(liste.length, bas + boyut)} / ${liste.length} · Sayfa ${p + 1}/${sayfaSay}</span>
        <select class="ap-sel" data-act="p-boyut">${[25, 50, 100, 200].map(n => `<option value="${n}" ${n === boyut ? 'selected' : ''}>${n} / sayfa</option>`).join('')}</select></div>`; };
    return `<div class="ap-row ap-noprint"><button class="ap-btn pri" data-act="plan-asos" ${salt() ? 'disabled' : ''} title="Personel Listesi Raporu ve EKİP listesini birlikte seçebilirsiniz">Personel listelerini yükle</button>
      <input class="ap-in" data-act="f-q" placeholder="Ad veya TC ara" value="${esc(f.q)}">
      <select class="ap-sel" data-act="f-birim"><option value="">Tüm birimler</option>${S.plan.birimler.map(b => `<option ${b.ad === f.birim ? 'selected' : ''}>${esc(b.ad)}</option>`).join('')}</select>
      <select class="ap-sel" data-act="f-sinif"><option value="">Tüm sınıflar</option>${Object.entries(SINIF_AD).map(([a, t]) => `<option value="${a}" ${a === f.sinif ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select class="ap-sel" data-act="f-surucu" title="ATT sürücülüğü"><option value="">ATT sürücülüğü: tümü</option><option value="dogrulanmadi" ${f.surucu === 'dogrulanmadi' ? 'selected' : ''}>Doğrulanmadı</option><option value="surucu" ${f.surucu === 'surucu' ? 'selected' : ''}>Sürücü</option><option value="degil" ${f.surucu === 'degil' ? 'selected' : ''}>Sürücü değil</option></select>
      <select class="ap-sel" data-act="f-durum"><option value="">Tüm durumlar</option><option value="_izin" ${f.durum === '_izin' ? 'selected' : ''}>İzinli</option>${Object.keys(D).map(a => `<option ${a === f.durum ? 'selected' : ''}>${a}</option>`).join('')}</select>
      <span class="ap-note">${liste.length} kayıt${S.plan.disKurum && S.plan.disKurum.length ? ` · Dış kurum: ${S.plan.disKurum.length}` : ''}</span></div>
      ${pager()}<div class="ap-tw"><table class="ap-t"><thead><tr><th>AD SOYAD</th><th>TC</th><th>ÜNVAN</th><th>SINIF</th><th>BİRİM</th><th>NÖBET ROLÜ</th><th>SÜRÜCÜLÜK</th><th>DURUM</th><th>GÖREV BAŞLANGICI</th><th>4/B 4 YIL DOLUMU</th><th>YILLIK İZİN KALAN</th></tr></thead><tbody>${rows || '<tr><td colspan="11" class="ap-empty">Kayıt yok</td></tr>'}</tbody></table></div>${pager()}`;
  }

  function ozelHtml() {
    const o = ozel(), duz = !salt();
    const liste = Object.entries(o).sort();
    const tatil = []; for (let d = 1; d <= C.gunSayisi(S.y, S.m); d++) { const i = C.iso(S.y, S.m, d), w = C.RESMI[i]; if (w !== undefined) tatil.push(`${i.split('-').reverse().join('.')} ${w === 'A' ? '(arife, 5 saat)' : '(resmî tatil)'}`); }
    return `<div class="ap-two"><div class="ap-card"><h2>Özel gün ekle</h2><div class="ap-row"><input type="date" class="ap-in" id="ap-og-t" min="${C.iso(S.y, S.m, 1)}" max="${C.iso(S.y, S.m, C.gunSayisi(S.y, S.m))}">
      <select class="ap-sel" id="ap-og-tur">${Object.entries(C.OZEL_TUR).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="ap-btn pri" data-act="og-ekle" ${duz ? '' : 'disabled'}>Ekle</button></div>
      <p class="ap-note">Bayram, resmî tatil ve idari izin günü tüm personelin mesaisinden tam gün düşer (hafta içiyse). Yarım gün 5 saattir. Kişiye özel idari izin için ilgili kişinin izin türünü <b>İDARİ İZİN</b> seçip gün sayısını girin.</p>
      <h2>Eklenenler</h2>${liste.map(([t, v]) => `<div class="ap-row"><b>${t.split('-').reverse().join('.')}</b> ${C.OZEL_TUR[v.tur]} <button class="ap-btn sm dng" data-act="og-sil" data-v="${t}" ${duz ? '' : 'disabled'}>Sil</button></div>`).join('') || '<span class="ap-note">Yok</span>'}</div>
      <div class="ap-card"><h2>${ayEtiket()} takvimi</h2><div>Memur aylık mesai: <b>${fmt(C.ayMesai(S.y, S.m, false, o))} saat</b> → hedef <b>${fmt(C.hedefNobet(C.ayMesai(S.y, S.m, false, o), 'memur', false).birim)}</b> nöbet</div>
      <div>İşçi aylık mesai: <b>${fmt(C.ayMesai(S.y, S.m, true, o))} saat</b> → hedef <b>${C.hedefNobet(C.ayMesai(S.y, S.m, true, o), 'isci', false, {isciDusulen: S.ayar.isciDusulen}).adet}</b> × 12 saatlik nöbet</div>
      <p class="ap-note">Memur: hafta içi günler (resmî tatil hariç) × 8 saat ÷ 24, üst 0,5'e. İşçi: pazar ve tatil hariç günler × 7,5 saat ÷ ${S.ayar.isciDusulen}, alt tam sayıya.</p>
      <h2>Takvimdeki resmî tatiller</h2>${tatil.join('<br>') || '<span class="ap-note">Bu ayda resmî tatil yok</span>'}</div></div>`;
  }

  function istatistik() {
    const D = durumlar(), K = S.plan.kayitlar.filter(k => !(D[k.durum] || {}).pasif && !aileHek(k)), say = {};
    const inc = (a, n = 1) => { say[a] = (say[a] || 0) + n; };
    K.forEach(k => {
      inc('toplam'); inc('sinif:' + k.sinif); if (k.durum) inc('durum:' + k.durum);
      if (izinGun(k) > 0) { inc('izinli'); inc('izinGun', izinGun(k)); (k.izin || []).forEach(i => { if (sayi(i.gun) > 0) inc('izinTur:' + (i.tur || 'Belirtilmemiş'), sayi(i.gun)); }); }
      if (k.gorev && (k.gorev.hedef || k.gorev.yer)) { inc('gorev'); inc('yolluk:' + (k.gorev.yolluk || 'Belirtilmemiş')); }
      if (k.dortB) inc('dortB');
    });
    return {say, K};
  }
  function statHtml() {
    const {say} = istatistik(), ists = S.plan.birimler.filter(b => b.tur === 'istasyon');
    const sat = (t, v, f) => `<tr><td>${t}</td><td class="num"><b>${v === undefined ? 0 : fmt(v)}</b></td>${f ? `<td><a href="#" data-act="liste" data-v="${f}">Listele</a></td>` : '<td></td>'}</tr>`;
    const durumSat = Object.keys(durumlar()).filter(k => say['durum:' + k]).map(k => sat(k, say['durum:' + k], 'durum:' + k)).join('');
    const izinSat = Object.keys(say).filter(k => k.startsWith('izinTur:')).map(k => sat(k.slice(8), say[k])).join('');
    let ih = 0, pl = 0; ists.forEach(b => { const h = hesapla(b); ih += h.ihtiyac; pl += planlananToplam(h); });
    return `<div class="ap-two"><div class="ap-card"><h2>Personel</h2><table class="ap-t"><tbody>${sat('Toplam aktif kayıt', say.toplam, 'durum:')}${sat('Doktor', say['sinif:doktor'])}${sat('Memur', say['sinif:memur'])}${sat('İşçi', say['sinif:isci'])}${sat('4/B personel', say.dortB)}${sat('İzinli personel', say.izinli, 'durum:_izin')}${sat('Toplam izin günü', say.izinGun)}${izinSat}</tbody></table></div>
      <div class="ap-card"><h2>Durum ve görevlendirme</h2><table class="ap-t"><tbody>${durumSat}${sat('Görevlendirme (toplam)', say.gorev)}${sat('Yolluklu', say['yolluk:YOLLUKLU'])}${sat('Yolluksuz', say['yolluk:YOLLUKSUZ'])}${sat('Yolluk durumu belirtilmemiş', say['yolluk:Belirtilmemiş'])}</tbody></table></div></div>
      <div class="ap-card"><h2>Plan özeti</h2><div>İstasyon ihtiyacı toplamı: <b>${ih}</b> · Planlanan: <b>${fmt(pl)}</b> · Fark: <b>${fmt(pl - ih)}</b></div></div>`;
  }

  function logHtml() {
    const l = (S.plan.log || []).slice(0, 300);
    return `<div class="ap-card"><h2>Değişiklik günlüğü (son ${l.length})</h2><div class="ap-tw"><table class="ap-t"><thead><tr><th>Zaman</th><th>Rol</th><th>İşlem</th><th>Ayrıntı</th></tr></thead><tbody>${l.map(x => `<tr><td>${new Date(x.t).toLocaleString('tr-TR')}</td><td>${ROLLER[x.rol] || x.rol}</td><td>${esc(x.islem)}</td><td>${esc(x.detay)}</td></tr>`).join('') || '<tr><td colspan="4" class="ap-empty">Kayıt yok</td></tr>'}</tbody></table></div></div>`;
  }

  function ayarHtml() {
    const D = durumlar(), yon = S.rol === 'yonetici';
    return `<div class="ap-card"><h2>Durum tablosu</h2><p class="ap-note">Her durumun nöbet ve mesai etkisini ayarlayın. "Nöbet yok": kişi nöbet tutmaz (hedef 0). "Mesai yok": o ay mesai yükümlülüğü yoktur (izinli). Değişiklik yalnızca Yönetici içindir.</p>
      <div class="ap-tw"><table class="ap-t"><thead><tr><th>Durum</th><th>Renk</th><th>Nöbet yok</th><th>Mesai yok</th></tr></thead><tbody>${Object.entries(D).map(([k, v]) => `<tr><td>${k}</td><td><input type="color" data-d="${esc(k)}" data-f="renk" value="${v.renk || '#ffffff'}" ${yon ? '' : 'disabled'}></td><td><input type="checkbox" data-d="${esc(k)}" data-f="nobetYok" ${v.nobetYok ? 'checked' : ''} ${yon ? '' : 'disabled'}></td><td><input type="checkbox" data-d="${esc(k)}" data-f="mesaiYok" ${v.mesaiYok ? 'checked' : ''} ${yon ? '' : 'disabled'}></td></tr>`).join('')}</tbody></table></div></div>
      <div class="ap-card"><h2>Hesap ayarları</h2><div class="ap-row"><label>ATT sürücü sayılması için nöbetlerinin sürücü payı bu değerden büyük olmalı (%): <input class="ap-in n" type="number" min="0" max="100" data-ay="surDegilEsik" value="${S.ayar.surDegilEsik}" ${yon ? '' : 'disabled'}></label> <span class="ap-note">Nöbet kaydı olmayan ATT sürücü sayılmaz.</span></div>
      <div class="ap-row"><label>Memur/doktor genel azami nöbet (24 sa.; istasyon sayfasından istasyon bazında değiştirilebilir) <input class="ap-in n" type="number" step="0.5" data-ay="azamiMemur" value="${S.ayar.azamiMemur}" ${yon ? '' : 'disabled'}></label>
      <label>İşçi nöbetinde sistemden düşülen saat <input class="ap-in n" type="number" step="0.5" data-ay="isciDusulen" value="${S.ayar.isciDusulen}" ${yon ? '' : 'disabled'}></label></div>
      <div class="ap-row"><label><input type="checkbox" data-act="oto-geri" ${S.ayar.otoGeriCek !== false ? 'checked' : ''} ${yon ? '' : 'disabled'}> Açığı olan istasyonların başka istasyona görevli personelini listeler yüklenince / önceki aydan kopyalanınca otomatik geri çağır</label></div>
      <div class="ap-row"><label><input type="checkbox" data-act="oto-oner" ${S.ayar.otoOner !== false ? 'checked' : ''} ${yon ? '' : 'disabled'}> Planlanan nöbeti her değişiklikte otomatik hesapla (kilitli değerler korunur)</label></div>
      <p class="ap-note">Yuvarlama: memur ve doktor hedefi yukarı 0,5 adıma, işçi hedefi aşağı tam 12 saatlik nöbete yuvarlanır.</p></div>
      <div class="ap-card"><h2>Yedek</h2><div class="ap-row"><button class="ap-btn" data-act="yedek-al">JSON yedeği al (bu ay)</button><button class="ap-btn" data-act="yedek-yukle" ${salt() ? 'disabled' : ''}>JSON yedeği yükle</button></div>
      <p class="ap-note">Yedek dosyasında kişisel veri bulunur; güvenli yerde saklayın. Şifreli ortak Drive arşivi sonraki sürümde eklenecek.</p></div>`;
  }

  function sayfaHtml() {
    if (S.modul === 2) return n2Html();
    if (!S.plan) return bosHtml();
    return ({pano: panoHtml, ist: istHtml, gorev: gorevHtml, personel: personelHtml, ozel: ozelHtml, stat: statHtml, log: logHtml, ayar: ayarHtml, arsiv: arsivHtml, arstat: arstatHtml}[S.sayfa] || panoHtml)();
  }
  function render() {
    const sy = window.scrollY, tw = root.querySelector('.ap-tw'), sl = tw ? tw.scrollLeft : 0, st = tw ? tw.scrollTop : 0;
    const koyu = S.ayar && (S.ayar.tema === 'koyu' || (S.ayar.tema === 'sistem' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches));
    root.className = 'ap-root' + (koyu ? ' ap-dark' : ''); document.body.style.background = koyu ? '#0f1720' : '#f4f6f9';
    if (S.rol === 'istasyon') S.modul = 2;
    root.innerHTML = ustHtml() + (S.plan || S.modul === 2 ? navHtml() : '') + `<div class="ap-main">${sayfaHtml()}</div>` + (S.modal ? S.modal() : '');
    toastCiz();
    const tw2 = root.querySelector('.ap-tw'); if (tw2) { tw2.scrollLeft = sl; tw2.scrollTop = st; }
    window.scrollTo(0, sy);
  }
