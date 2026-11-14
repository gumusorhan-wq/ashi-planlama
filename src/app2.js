
  // ---------- sayfalar ----------
  const ayEtiket = () => `${AYLAR[S.m]} ${S.y}`;
  const ayIlk = () => C.iso(S.y, S.m, 1);
  // Plan durumu düğmeleri: Taslak → "İstasyonlara gönder" (Kesinleşti) → "Ayı kapat" (Kilitli, yalnız yönetici); geri adımlar: "Taslağa geri al", "Kilidi aç" (yalnız yönetici)
  const durumSecHtml = d => d === 'kilitli' ? (S.rol === 'yonetici' ? `<button class="ap-btn sm" data-act="kilit-ac" ${S.kilitAcBekle ? 'disabled' : ''} title="Ayın kilidini açar: plan Kesinleşti durumuna döner ve yeniden düzenlenebilir (günlüğe yazılır)">${S.kilitAcBekle ? 'Kilit açılıyor…' : 'Kilidi aç'}</button>` : '')
    : d === 'taslak' ? `<button class="ap-btn sm pri" data-act="durum-git" data-v="kesin" title="Plan kesinleşir; istasyon sorumluları kendi planlarını ve nöbet listesi araçlarını görür">İstasyonlara gönder (kesinleştir)</button>`
    : `<button class="ap-btn sm" data-act="durum-git" data-v="taslak" title="Plan taslağa döner; istasyonlar planı ve nöbet listesi araçlarını görmez">Taslağa geri al</button>${S.rol === 'yonetici' ? `<button class="ap-btn sm" data-act="durum-git" data-v="kilitli" title="Ay kapanır: kimse değişiklik yapamaz; kilidi yalnız yönetici açar">Ayı kapat (kilitle)</button>` : ''}`;
  const DURUM_AD = {taslak: 'Taslak', kesin: 'Kesinleşti', kilitli: 'Kilitli'}, DURUM_IPUCU = {taslak: 'Taslak: istasyonlar bu ayın planını görmez', kesin: 'Kesinleşti: istasyonlar planı görür, nöbet listelerini hazırlar', kilitli: 'Kilitli: ay kapandı, değişiklik yapılamaz'};
  function ustHtml() {
    const d = S.plan ? S.plan.durum : '';
    return `<div class="ap-top"><img class="ap-logo" src="${AP_LOGO}" alt="HUSER" title="HUSER"><h1>HUSER ASHİ PLANLAMA <span class="ap-note">v${VERSION}</span></h1>
      <div class="ap-mod">${S.rol === 'istasyon' ? '' : `<button class="${S.modul === 1 ? 'on' : ''}" data-act="modul" data-v="1">Modül 1 · Planlama</button>`}<button class="${S.modul === 2 ? 'on' : ''}" data-act="modul" data-v="2">Modül 2 · Nöbet listesi</button></div>
      <div class="ap-ay"><button class="ap-btn sm" data-act="ay-" title="Önceki ay">‹</button><button class="ap-ayac" data-pop data-act="tp-ay-ac" title="Ay seç">${ayEtiket()} ▾</button><button class="ap-btn sm" data-act="ay+" title="Sonraki ay">›</button></div>
      ${S.plan ? `<span class="ap-badge ap-b-${d}" title="${DURUM_IPUCU[d] || ''}">${DURUM_AD[d] || d}</span>` : ''}
      <span class="ap-sp"></span>
      ${opts.gomulu ? '' : `<button class="ap-btn sm" data-act="kilavuz" title="Programın kullanımı">Kullanım kılavuzu</button>
      <label class="ap-note" title="Tema"><select class="ap-sel" data-act="tema"><option value="acik" ${S.ayar.tema !== 'koyu' && S.ayar.tema !== 'sistem' ? 'selected' : ''}>Açık</option><option value="koyu" ${S.ayar.tema === 'koyu' ? 'selected' : ''}>Koyu</option><option value="sistem" ${S.ayar.tema === 'sistem' ? 'selected' : ''}>Sistem</option></select></label>`}
      ${S.plan && guncelAy() && (S.rol === 'yonetici' || S.rol === 'planlayici') ? durumSecHtml(d) : ''}
      ${opts.kullanici ? '' : `<label class="ap-note" title="Rol (demo)"><select class="ap-sel" data-act="rol">${Object.entries(ROLLER).map(([k, v]) => `<option value="${k}" ${k === S.rol ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`}</div>`;
  }
  const SAYFALAR = [['ana', 'Ana Sayfa'], ['pano', 'Pano'], ['ist', 'İstasyon'], ['gorev', 'Görevlendirme'], ['personel', 'Personel'], ['takip', 'İzin / görev takibi'], ['ozel', 'Özel günler'], ['stat', 'İstatistik'], ['arsiv', 'Arşiv'], ['arstat', 'Arşiv istatistikleri'], ['ayar', 'Ayarlar']];
  // Değişiklik günlüğü sekmesi yoktur (günlük arka planda tutulur); sayfalarda "Son kayıt" damgası görünür
  const sayfaListesi = () => SAYFALAR.filter(([k]) => k !== 'takip' || planlamaRol());
  const navHtml = () => S.modul === 2 ? `<div class="ap-nav">${N2_SEKME.filter(() => n2Acik()).map(([k, t]) => `<button class="${(n2Acik() ? S.n2.sekme : 'plan') === k ? 'on' : ''}" data-act="n2-sekme" data-v="${k}">${t}</button>`).join('')}</div>` : `<div class="ap-nav">${sayfaListesi().map(([k, t]) => `<button class="${S.sayfa === k ? 'on' : ''}" data-act="sayfa" data-v="${k}">${t}${k === 'talep' && talepSay() ? ` <span class="ap-tag ap-t-ih">${talepSay()}</span>` : ''}</button>`).join('')}</div>`;

  // ---- Gömülü mod sol menüsü (112stoktakip İstatistik / İK modülleriyle aynı görsel dil) ----
  const YAN_IC = {ana: 'M3 11l9-8 9 8M5 9v12h14V9M9 21v-7h6v7', pano: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z', ist: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6', gorev: 'M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4', talep: 'M4 4h16v12H4zM4 13h5l1 3h4l1-3h5', personel: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a7 7 0 0114 0v1M17 11a3 3 0 100-6M22 21v-1a5 5 0 00-4-5', takip: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4M8 15l2.5 2.5L16 12', ozel: 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4M9 14h.01M12 14h.01M15 14h.01M9 17h.01M12 17h.01', stat: 'M4 20V10M10 20V4M16 20v-7M22 20H2', arsiv: 'M3 4h18v4H3zM5 8v12h14V8M10 12h4', arstat: 'M3 3v18h18M7 15l4-4 3 3 6-6', ayar: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z', log: 'M4 6h16M4 12h16M4 18h10',
    'n2-plan': 'M9 4h6v3H9zM6 5H5v16h14V5h-1M8 12h8M8 16h5', 'n2-istek': 'M4 5h16v16H4zM4 9h16M8 3v4M16 3v4M10 13l4 4M14 13l-4 4', 'n2-liste': 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', 'n2-denetim': 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM9 12l2 2 4-4', 'n2-paket': 'M12 3v12M7 10l5 5 5-5M4 21h16'};
  const yanIc = n => `<span class="ap-yic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${YAN_IC[n] || YAN_IC.log}"/></svg></span>`;
  const YAN_VERI = ['arsiv', 'arstat', 'ayar'];
  function yanHtml() {
    const d = S.plan ? S.plan.durum : '', m1 = S.rol !== 'istasyon';
    const it = (on, act, v, ad, ikon, ek) => `<button type="button" class="ap-yit ${on ? 'on' : ''}" data-act="${act}" data-v="${v}" title="${esc(ad)}">${yanIc(ikon)}<span class="ap-ytx">${ad}</span>${ek || ''}</button>`;
    const sp = sayfaListesi(), m1Sec = sp.filter(([k]) => !YAN_VERI.includes(k)), veri = sp.filter(([k]) => YAN_VERI.includes(k));
    const s1 = ([k, t]) => it(S.modul !== 2 && S.sayfa === k, 'yan1', k, t, k, k === 'talep' && talepSay() ? `<span class="ap-ysay">${talepSay()}</span>` : '');
    // Sürüm 13.63: o ay plan yokken plana bağlı bölümler soluk ve tıklanmaz (hepsi aynı 'plan yok' ekranını açıyordu); Ana Sayfa nasıl başlanacağını anlatır
    const s1y = ([k, t]) => !S.plan && k !== 'ana' && !YAN_VERI.includes(k) ? it(false, 'yan1', k, t, k, '').replace('class="ap-yit ', 'disabled aria-disabled="true" class="ap-yit ap-ysoluk ').replace(/title="[^"]*"/, `title="${esc(ayEtiket())} için plan yok"`) : s1([k, t]);
    const n2s = n2Acik() ? S.n2.sekme : 'plan', s2 = N2_SEKME.filter(() => n2Acik()).map(([k, t]) => { const h = it(S.modul === 2 && n2s === k, 'yan2', k, t, 'n2-' + k); return S.plan ? h : h.replace('class="ap-yit ', 'disabled aria-disabled="true" class="ap-yit ap-ysoluk ').replace(/title="[^"]*"/, `title="${esc(ayEtiket())} için plan yok"`); }).join('');
    const aktif = S.modul === 2 ? (N2_SEKME.find(x => x[0] === n2s) || [, ''])[1] : (SAYFALAR.find(x => x[0] === S.sayfa) || [, ''])[1];
    const kisaAy = `${AYLAR[S.m].slice(0, 3)} ${String(S.y).slice(2)}`;
    return `<nav class="ap-yan ${S.yanAcik ? 'acik' : ''} ${S.yanDar ? 'dar' : ''}" aria-label="Planlama menüsü">
      <div class="ap-yanbas"><img class="ap-ylogo" src="${AP_LOGO}" alt=""><div class="ap-ybaslik"><b>ASHİ Planlama</b><span>${S.modul === 2 ? 'Modül 2' : 'Modül 1'} · ${esc(aktif)}</span></div><button type="button" class="ap-yanac" data-act="yan-ac" aria-label="Menüyü aç / kapat">${S.yanAcik ? '✕' : '☰'}</button></div>
      <div class="ap-ykisa" title="${esc(ayEtiket())}"><button class="ap-ykok" data-act="ay-" title="Önceki ay">‹</button><button class="ap-ayac" data-pop data-act="tp-ay-ac" title="Ay seç">${kisaAy}</button><button class="ap-ykok" data-act="ay+" title="Sonraki ay">›</button></div>
      <div class="ap-yanust"><div class="ap-ay"><button class="ap-btn sm" data-act="ay-" title="Önceki ay">‹</button><button class="ap-ayac" data-pop data-act="tp-ay-ac" title="Ay seç">${ayEtiket()} ▾</button><button class="ap-btn sm" data-act="ay+" title="Sonraki ay">›</button></div>
        ${S.plan ? `<div class="ap-ydurum"><span class="ap-badge ap-b-${d}" title="${DURUM_IPUCU[d] || ''}">${DURUM_AD[d] || d}</span>${guncelAy() && planlamaRol() ? durumSecHtml(d) : ''}</div>` : ''}
        ${opts.kullanici ? '' : `<select class="ap-sel" data-act="rol" title="Rol (demo)">${Object.entries(ROLLER).map(([k, v]) => `<option value="${k}" ${k === S.rol ? 'selected' : ''}>${v}</option>`).join('')}</select>`}</div>
      <div class="ap-yanic">${m1 ? `<div class="ap-ysec">MODÜL 1 · PLANLAMA</div>${m1Sec.map(s1y).join('')}` : ''}
        <div class="ap-ysec">MODÜL 2 · NÖBET LİSTESİ</div>${s2}
        ${m1 && veri.length ? `<div class="ap-ysec">VERİ</div>${veri.map(s1).join('')}` : ''}</div>
      <button type="button" class="ap-ydar" data-act="yan-dar" title="${S.yanDar ? 'Menüyü genişlet' : 'Menüyü daralt'}" aria-label="${S.yanDar ? 'Menüyü genişlet' : 'Menüyü daralt'}">${S.yanDar ? '»' : '«'}<span class="ap-ytx">${S.yanDar ? '' : 'Menüyü daralt'}</span></button></nav>`;
  }

  function bosHtml() {
    const onceki = S.m === 1 ? C.iso(S.y - 1, 12, 1).slice(0, 7) : C.iso(S.y, S.m - 1, 1).slice(0, 7);
    const oncekiVar = S.planAnahtarlari.includes('plan:' + onceki);
    return `<div class="ap-card ap-empty"><h2>${ayEtiket()} için plan yok</h2>
      <p>Planlama her ayın 10–15'inde bir sonraki ay için yapılır.</p>
      <ol class="ap-note" style="margin:6px auto 14px;text-align:left;max-width:640px;line-height:1.7">
        <li>ASOS'tan şu raporları indirin: <b>Personel Listesi Raporu</b>, <b>EKİP Personel Listesi Raporu</b> (Başhekimlik / Komuta / İstasyon) ve <b>Nöbet Listesi Raporu</b>. İsterseniz <i>Personel İzin-Muafiyet Raporu</i>nu da ekleyin.</li>
        <li>Aşağıdaki <b>Personel listelerini yükle</b> düğmesiyle dosyaları birlikte seçin (ya da bu alana sürükleyin).</li>
        <li>Açılan önizlemede <b>Plan oluştur ve uygula</b>ya basın.</li></ol>
      <p class="ap-note" style="max-width:640px;margin:0 auto 12px">Nöbet Listesi Raporu, ATT / AABT'nin sürücü olup olmadığını gösterir; yüklenmezse sürücüler "doğrulanmadı" kalır ve sürücü nöbet branşı eksik görünür.</p>
      <div class="ap-row" style="justify-content:center">
        <button class="ap-btn pri" data-act="plan-asos" ${S.rol === 'salt_okur' || !guncelAy() ? 'disabled' : ''}>Personel listelerini yükle</button>
        ${typeof opts.veriKaynagi === 'function' ? `<button class="ap-btn" data-act="asos-kaynak" ${S.rol === 'salt_okur' || !guncelAy() ? 'disabled' : ''} title="ASHİ'deki güncel Nöbet Listesi ve İzin-Muafiyet raporlarını doğrudan alır">ASHİ'den nöbet listesi + izin raporu getir</button>` : ''}
        <button class="ap-btn" data-act="plan-kopya" ${oncekiVar && S.rol !== 'salt_okur' && guncelAy() ? '' : 'disabled'}>Önceki aydan kopyala (${AYLAR[+onceki.slice(5)]} ${onceki.slice(0, 4)})</button>
        <button class="ap-btn" data-act="plan-bos" ${S.rol === 'salt_okur' || !guncelAy() ? 'disabled' : ''}>Boş plan</button></div>
      <p class="ap-note">${opts.gomulu ? 'Veriler kurum sunucusunda (HUSER Yönetim Sistemi) tutulur; planlama ekibi aynı planı görür ve sunucu yedeğine girer.' : "Veriler yalnızca bu tarayıcıda (IndexedDB) tutulur. Yedek almak için Ayarlar'daki JSON yedeğini kullanın."}</p></div>`;
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
    const kisiBasi = tam;     // fazla: mesai eksiği; çıkan kişi tam ay mesaisi kadar nöbeti götürür
    const cikabilir = h.fazlaEf > 0.001 && kisiBasi > 0 ? Math.floor(h.fazlaEf / kisiBasi + 1e-9) : 0;
    return {yuvalar, adaylar, acikYuva, fazlaGrup, cikabilir};
  }
  function kartHtml(b, h, p, etiket, plFark, oran, dengeli, isciTam) {
    const aile = h.satir.filter(x => aileHek(x.k)).length, dis = x => !aileHek(x.k) && (durumlar()[x.k.durum] || {}).disarida && !x.k._gelen, disarida = h.satir.filter(dis).length, nobetsiz = h.satir.filter(x => !aileHek(x.k) && !dis(x) && x.nobetYok).length, nobetTutan = h.satir.length - aile - disarida - nobetsiz;
    const fazlaMod = istMod(b) !== 'mesai', E = eksikAnaliz(h, isciTam, doktorluIstasyon(b), fazlaMod), gelecek = h.ihtiyacTur === 'oner' && !h.planKarsilar ? h.ihtiyacKisi : 0;
    // nöbet branşı satırı: nöbet listesinin (Modül 2) aynı hesabıyla — kişilerin tam sayı nöbet adetleri ve branş yetenekleriyle kaç gün boş kalacağı (istasyon nöbet listesinde görünen sayı)
    const kp = n2BosTahmin(b), gun = C.gunSayisi(S.y, S.m);
    const yuvaSatir = ['es', 'ysp', 'sur'].map(k => {
      const bos = kp ? (kp.bos[k] || 0) : 0, ad = YUVA_ADLARI[k];
      return `<div class="ap-yuva"><span>${ad}</span><span class="v">${fmt(gun - bos)}/${gun} gün</span>${bos ? `<span class="ap-tag ap-t-ih" title="${ad}: ${kp && kp.kaynak === 'liste' ? 'oluşturulan nöbet listesinde' : 'bu kadroyla nöbet listesinde (tahmini)'} ${fmt(bos)} gün boş (kimseye adedinden fazla nöbet yazılmaz; 0,5 gün = 12 saat)">${fmt(bos)} gün eksik</span>` : '<span class="ap-tag ap-t-ok">tam</span>'}</div>`;
    }).join('');
    // gelecek personel: hangi branşlardan ve kaç kişi
    let gelen = '';
    if (gelecek) {
      const secenek = E.adaylar.filter(x => !kp || !kp.toplam || x.yuva.some(y => kp.bos[y])).map(x => `${esc(x.ad)}${x.kisi > 1 ? ' ×' + x.kisi : ''}`).join(' · ');
      gelen = `<div class="ap-ek ap-ek-g" title="Gelen kişi o ay boyunca (tam ay) bu istasyonda mesaisini tamamlayacak şekilde önerilir. Açık nöbet branşlarına girebilen branşlar listelenir."><b>+${gelecek} kişi gelmeli</b> <span>(ay boyu ${fmt(h.tamHedef)} nöbet tutar)</span><div class="ap-note">Uygun personel: ${secenek || 'AABT (sürücü teyitli)'}</div></div>`;
    } else if (h.planKarsilar) gelen = '';
    else if (h.ihtiyacTur === 'icerde') gelen = `<div class="ap-ek ap-ek-c" title="Herkes yalnız mesaisini tutsa ${fmt(h.hedefAcik)} nöbet açık kalırdı; bu açık bir kişinin tüm ay mesaisini doldurmaya yetmediği ve fazla nöbetle kapandığı için personel önerilmez"><b>Personel gerekmez</b> <span>${fmt(h.hedefAcik)} nöbet, kişilere mesailerinin üstünde (azami nöbete kadar) yazılarak kapanır</span></div>`;
    else if (h.ihtiyacTur === 'elle') gelen = `<div class="ap-ek ap-ek-e"><b>Elle karar</b> <span>yukarıdaki eksik nöbetler bir kişinin ay boyu mesaisine yetmiyor; personel önerilmez — kısa görevlendirme ya da plan değişikliği</span></div>`;
    // dışarı çıkabilecek personel
    let cikan = '';
    // fazla: kişilerin mesaisi (hedef nöbet) toplamı, girebildikleri nöbet branşlarındaki boş yeri aşıyor → bu kadar nöbet bu istasyonda tutulamaz
    if (h.fazlaEf > 0.001) { const kalan = Math.round((h.fazlaEf - E.cikabilir * h.tamHedef) * 100) / 100, mem = h.fazlaMemur || 0;
      cikan = `<div class="ap-ek ${mem > 0.001 ? 'ap-ek-e' : 'ap-ek-c'}"><b>Mesai tamamlanamıyor: ${fmt(h.fazlaEf)} nöbet fazla</b>
      <div class="ap-note">Kişilerin mesaisi kadar nöbet bu istasyonda yok (girebildikleri nöbet branşları dolu): ${E.fazlaGrup.map(f => `${esc(f.ad)} <b>${fmt(f.v)}</b>`).join(' · ')}<br>
      ${E.cikabilir ? `→ <b>${E.cikabilir} kişi başka istasyona gitmeli</b>${kalan > 0.01 ? '; ' : '.'}` : '→ '}${kalan > 0.01 ? `${E.cikabilir ? 'kalan ' : ''}<b>${fmt(kalan)} nöbet</b> başka istasyonda ya da KKM'de tutulmalı (kısa görevlendirme)${mem > 0.001 ? ' — doktor / AABT / ATT eksik mesaide kalamaz' : ' — yalnız işçi: eksi mesai kalabilir'}.` : ''}</div></div>`; }
    const net = gelecek && E.cikabilir ? `<div class="ap-note" style="margin-top:4px">Net: gelen ${gelecek}, çıkabilir ${E.cikabilir} → ${E.cikabilir >= gelecek ? 'kendi fazlalığı yetiyor' : 'dışarıdan ' + (gelecek - E.cikabilir) + ' kişi gerekir'}</div>` : '';
    const durumRozet = !gelecek && !cikan && h.planKarsilar && h.ihtiyacTur !== 'yok' ? '<span class="ap-tag ap-t-ok" title="Elle yazılan / sabitlenen sayılarla ihtiyaç ve bütün nöbet branşları karşılanıyor">Plan karşılıyor</span>' : !gelecek && !cikan && h.ihtiyacTur === 'yok' ? '<span class="ap-tag ap-t-ok">Dengede</span>' : '';
    return `<div class="ap-st" data-act="ist-ac" data-v="${esc(b.ad)}"><h3>${esc(b.ad)} ${durumRozet}</h3>
        <div class="ap-bar ${dengeli ? 'ok' : p > h.ihtiyac ? 'fz' : 'bad'}"><i style="width:${oran}%"></i></div>
        <div class="r"><span title="Nöbet yazılan toplam / ayda dolması gereken nöbet">Yazılan / gereken nöbet</span><b>${fmt(p)} / ${h.ihtiyac}</b></div>
        <div class="r"><span title="${fazlaMod ? 'Yazılan nöbet değildir: herkes azami nöbetini (DOKTOR-AABT-ATT ' + fmt(azamiDeger(b)) + ') tutsa bu istasyonda en çok tutulabilecek nöbet. Gereken nöbetten büyükse fazla mesaiyle açık kapatılabilir.' : 'Yazılan nöbet değildir: herkes yalnız mesaisini tamamlasa tutulabilecek nöbet.'}">${fazlaMod ? 'En çok tutulabilir (azamiyle)' : 'En çok tutulabilir (mesaiyle)'}</span>${(() => { const kap = fazlaMod ? h.azamiKap : h.kapasite; return h.planKarsilar && p > kap + 0.005 ? `<b title="Kişilere azaminin üstünde elle nöbet yazıldı / sabitlendi: kapasite yazılan nöbete göre gösterilir">${fmt(p)} <span class="ap-note">(elle; azamiyle ${fmt(kap)})</span></b>` : `<b>${fmt(kap)}</b>`; })()}</div>
        <div class="r"><span title="Hesaba giren kişi: istasyonda çalışan ve nöbet tutabilen. Dışarıda (geçici görevde) olanların hedefi 0 sayılır, kapasiteye ve ihtiyaca girmez.">Kişi (nöbet tutan)</span><b>${nobetTutan}${disarida ? ` <span class="ap-note">+ ${disarida} dışarıda</span>` : ''}${nobetsiz ? ` <span class="ap-note">+ ${nobetsiz} nöbet tutmaz</span>` : ''}${aile ? ` <span class="ap-note" title="Aile hekimliğine geçen personel listede görünür ama hiçbir hesaba girmez; kendi isteği olmadan geri çağrılmaz">+ ${aile} aile hekimliğinde</span>` : ''}</b></div>
        <div class="ap-yh" title="${kp && kp.kaynak === 'liste' ? 'Oluşturulan nöbet listesine göre' : kp && kp.listeEski ? 'Nöbet listesi plandan eski; bugünkü plana göre (tahmini)' : 'Kişilerin nöbet sayıları ve branş yeteneklerine göre (tahmini)'}">Nöbet branşları — dolu gün / gereken gün</div>${kp && kp.listeEski ? `<div class="ap-note" style="color:#b45309;margin:2px 0 4px" title="Nöbet listesi plan değişmeden önce oluşturulmuş: ${kp.listeEski} kişinin listedeki nöbet sayısı bugünkü planından farklı. Branş günleri bugünkü plana göre tahmin edildi.">⚠ Nöbet listesi plandan eski — yeniden oluşturun</div>` : ''}${yuvaSatir}
        ${gelen}${cikan}${net}${Math.abs(plFark) > 0.01 ? `<div class="ap-note" style="margin-top:6px" title="Elle girilen ya da sabitlenen (🔒) sayılar ya da nöbet branşı kısıtı yüzünden">Planlanan toplam, olması gerekenden ${fmt(Math.abs(plFark))} nöbet ${plFark < 0 ? 'eksik' : 'fazla'}</div>` : ''}</div>`;
  }

  // Sürüm 13.28: modül Ana Sayfası (Depo / Teknik ana sayfası gibi) — ön bilgi kartları + hızlı erişim. Pano ve öteki sayfalar değişmedi.
  function anaHtml() {
    const ists = S.plan.birimler.filter(b => b.tur === 'istasyon');
    let ih = 0, pl = 0, of = 0, oner = 0, kisiOner = 0, elle = 0;
    ists.forEach(b => { if (b.ekipOf) { of++; return; } const h = hesapla(b); ih += h.ihtiyac; pl += planlananToplam(h); if (h.ihtiyacTur === 'oner') { oner++; kisiOner += h.ihtiyacKisi; } else if (h.ihtiyacTur === 'elle') elle++; });
    const aktif = S.plan.kayitlar.filter(k => !(durumlar()[k.durum] || {}).pasif && !aileHek(k)).length;
    const gorev = S.plan.kayitlar.filter(k => k.gorev && (k.gorev.hedef || k.gorev.yer)).length;
    const d = S.plan.durum, durumAd = d === 'kesin' ? 'Kesinleşti' : d === 'kilit' ? 'Kilitli' : 'Taslak', oran = ih ? Math.round(pl / ih * 100) : 0;
    const kart = (baslik, deger, alt, git, renk) => `<div class="ap-ana-kart"><span>${baslik}</span><b${renk ? ` style="color:${renk}"` : ''}>${deger}</b><small>${alt}${git ? ` <a href="#" data-act="yan1" data-v="${git}">ayrıntı</a>` : ''}</small></div>`;
    const hizli = sayfaListesi().filter(([k]) => k !== 'ana').map(([k, t]) => `<button type="button" class="ap-ana-git" data-act="yan1" data-v="${k}">${yanIc(k)}<span>${t}</span></button>`).join('')
      + `<button type="button" class="ap-ana-git" data-act="yan2" data-v="plan">${yanIc('n2-plan')}<span>Nöbet hedefleri</span></button>`;
    return `<div class="ap-ana">
      <div class="ap-ana-kartlar">
        ${kart('Dönem', `${AYLAR[S.m]} ${S.y}`, `Plan durumu: ${durumAd}`, '', '')}
        ${kart('Açık istasyon', ists.length - of, of ? `${of} ekip OF (kapalı)` : 'Kapalı ekip yok', 'pano', '')}
        ${kart('Aktif personel', aktif, `${S.plan.kayitlar.length} kayıt`, 'personel', '')}
        ${kart('Planlanan nöbet', `${fmt(pl)} / ${fmt(ih)}`, `%${oran} planlandı`, 'pano', oran >= 100 ? 'var(--ap-ok)' : '')}
        ${kart('Personel önerilen', oner, oner ? `${kisiOner} kişi gelmeli` : 'Öneri yok', 'gorev', oner ? 'var(--ap-bad)' : '')}
        ${kart('Görevlendirme', gorev, elle ? `${elle} istasyon elle karar bekliyor` : 'geçici görevli personel', 'gorev', '')}
      </div>
      <div class="ap-card ap-ana-hizli"><h3>Hızlı erişim</h3><div class="ap-ana-git-l">${hizli}</div></div>
    </div>`;
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
      // planlanan (elle yazılan / sabitlenen dahil) ihtiyacı ve her nöbet branşını karşılıyorsa açık gösterilmez (kapasite azamiye göre hesaplansa da)
      h.planKarsilar = planKarsilar(h, p);
      kat[b.ad] = h.planKarsilar ? (h.fazlaVar ? 'fazla' : 'diger') : h.ihtiyacTur === 'oner' ? 'oner' : h.fazlaVar ? 'fazla' : h.ihtiyacTur !== 'yok' ? h.ihtiyacTur : 'diger';      // mesai tamamlayamama, fazla mesaiyle kapanmadan önce gelir
      if (h.planKarsilar) { if (h.fazlaVar) fazla++; } else if (h.ihtiyacTur === 'oner') { acik++; kisiOner += h.ihtiyacKisi; } else if (h.ihtiyacTur === 'icerde') fm++; else if (h.ihtiyacTur === 'elle') elle++; if (h.fazlaVar) fazla++;
      const beklenen = h.planKarsilar ? h.ihtiyac : Math.min(h.ihtiyac, h.azamiKap), plFark = p - beklenen;
      const oran = Math.min(100, Math.round(p / h.ihtiyac * 100)), dengeli = Math.abs(p - h.ihtiyac) < 0.05;
      const etiket = h.ihtiyacTur === 'oner' ? `<span class="ap-tag ap-t-ih" title="Hedef nöbetle ${fmt(h.hedefAcik)} nöbet açık: gelen ${h.ihtiyacKisi} kişi mesaisini bu istasyonda tamamlar${h.kalanAcik > 0 ? '; kalan ' + fmt(h.kalanAcik) + ' nöbet fazla nöbetle kapanır' : ''}">Personel öner: ${h.ihtiyacKisi} kişi</span>`
        : h.ihtiyacTur === 'icerde' ? `<span class="ap-tag ap-t-fz" title="Açık (${fmt(h.hedefAcik)} nöbet) bir kişinin mesaisini doldurmaya yetmiyor; kişilere mesailerinin üstünde (azami nöbete kadar) nöbet yazılarak kapanıyor. Personel önerilmez.">Fazla mesaiyle kapanır (+${fmt(h.hedefAcik)})</span>`
        : h.ihtiyacTur === 'elle' ? `<span class="ap-tag" style="background:#ffedd5;color:#9a3412" title="Azami nöbetle de ${fmt(-h.farkAzami)} nöbet açık ama bir kişi gelirse mesaisini tamamlayamaz. Karar sizde: gerekirse elle görevlendirin.">Elle karar: ${fmt(-h.farkAzami)} açık</span>`
        : h.durum === 'fazla' ? `<span class="ap-tag ap-t-fz" title="Nöbet branşları doluyor ama bazı kişiler hedef nöbetlerini tamamlayamıyor (${fmt(h.fazlaH)} nöbet fazla)">Mesai tamamlayamama ${fmt(h.fazlaH)}</span>`
        : '<span class="ap-tag ap-t-ok">Dengede</span>';
      return kartHtml(b, h, p, etiket, plFark, oran, dengeli, isciTam);
    });
    // Ekip arama (büyük/küçük harf ve Türkçe karakter duyarsız): kartlar yalnız görünümde süzülür; üstteki sayı kartları tüm istasyonları sayar
    const araQ = C.TR(S.panoAra || '').trim(), sar = (h, b) => `<div class="ap-stsar" data-ara="${esc(C.TR(b.ad))}" style="display:${araQ && !C.TR(b.ad).includes(araQ) ? 'none' : 'contents'}">${h}</div>`;
    const f = S.panoFiltre || '', gosterilenI = ists.map((b, i) => i).filter(i => !f || kat[ists[i].ad] === f), gosterilen = gosterilenI.map(i => liste[i]), kartlar = gosterilenI.map(i => sar(liste[i], ists[i])).join('');
    const araGorunen = gosterilenI.filter(i => !araQ || C.TR(ists[i].ad).includes(araQ)).length;
    const FILTRE_AD = {oner: 'Personel önerilen istasyonlar', icerde: 'Fazla mesaiyle kapanan istasyonlar (personel gerekmez)', elle: 'Elle karar gerektiren istasyonlar', fazla: 'Mesaisini tamamlayamayan istasyonlar (fazla personel)', of: 'Ekip OF (kapalı) istasyonlar'};
    // tıklanabilir sayaçların hepsi aynı görünür: altta "İstasyonları göster ›"; seçili olanda "✓ Gösteriliyor"
    const tk = (v, sayi, renk, etiket, ek) => `<div class="ap-click ${f === v ? 'on' : ''}" data-act="pano-filtre" data-v="${f === v ? '' : v}" title="${f === v ? 'Tekrar tıklayınca bütün istasyonlar gösterilir' : 'Tıklayınca yalnız bu istasyonlar gösterilir'}" tabindex="0"><b style="color:${renk}">${sayi}</b><span>${etiket}${ek || ''}</span><small class="ap-tk-git">${f === v ? '✓ Gösteriliyor' : 'Göster ›'}</small></div>`;
    const aktif = S.plan.kayitlar.filter(k => !(durumlar()[k.durum] || {}).pasif && !aileHek(k)).length;
    const istAd = new Set(ists.map(b => b.ad)), attK = S.plan.kayitlar.filter(k => k.sinif === 'memur' && istAd.has(k.birim) && !(durumlar()[k.durum] || {}).pasif)      /* KKM / Başhekimlik personeli istasyonda sürücü olmadığı için sayılmaz */, attDog = attK.filter(k => C.surucuDurumu(k, {degil: S.ayar.surDegilEsik / 100}).tip === 'dogrulanmadi').length, attSur = attK.filter(k => C.surucuDurumu(k, {degil: S.ayar.surDegilEsik / 100}).tip === 'surucu').length;
    const uyari = isciBakiyeUyari(ists);
    return `${uyari}<details class="ap-card"><summary><b>Bu değerler ne anlama geliyor?</b></summary>
      <ul class="ap-note" style="line-height:1.7">
        <li><b>Kart okuma:</b> <i>Yazılan / gereken nöbet</i> ayda dolması gereken nöbete karşı yazılan nöbet toplamıdır. <i>Nöbet branşları</i> satırı hedef nöbetle (herkes mesaisi kadar tutarsa) her nöbet branşının ne kadar dolduğunu, <b>−N</b> ise orada kaç nöbet açık kaldığını gösterir. <b>+N kişi gelmeli</b>: açık, gelen kişinin o ay boyunca tüm hedef nöbetini tutmasına yetiyorsa çıkar; hangi nöbet branşı açık olduğuna göre uygun branşlar (Doktor, İşçi, ATT, AABT) yazılır. <b>N kişi dışarı çıkabilir</b>: nöbet branşlarına sığmayan fazla nöbetten hesaplanır. <i>Net</i> satırı ikisini karşılaştırır.</li>
        <li><b>İhtiyaç:</b> ay günü × 3 nöbet branşı (Kasım: 30 × 3 = 90 nöbet). Her gün ekip sorumlusu, yardımcı sağlık personeli ve sürücü gerekir.</li>
        <li><b>En çok tutulabilir (mesaiyle) / Kapasite (hedef):</b> yazılan nöbet değildir; istasyondaki kişilerin ayın mesaisini doldurmak için tutması gereken nöbetlerin toplamı (memur 7, işçi 8,5; izin ve muafiyet düşülür). Doktor yalnızca ekip şefi, işçi yalnızca sürücü nöbet branşını doldurabildiği için fazlası sayılmaz.</li>
        <li><b>En çok tutulabilir (azamiyle) / Kapasite (azami):</b> yazılan nöbet değildir; DOKTOR-AABT-ATT'ye hedefin üstünde yazılabilecek en çok nöbetle (genel 8, istasyon bazında değiştirilebilir) hesaplanan toplam. Gereken nöbetten büyükse açık fazla mesaiyle kapatılabilir.</li>
        <li><b>Mesai tamamlanamıyor: X nöbet fazla:</b> herkes yalnız mesaisi kadar nöbet tutsa bile X nöbet nöbet branşlarına sığmıyor; bu kişiler mesaisini bu istasyonda tamamlayamaz. Doktor / AABT / ATT eksik mesaide kalamaz (657): tam ay mesaisi kadar fazla varsa kişi başka istasyona gitmeli, kalanı kısa görevlendirmeyle başka istasyonda ya da KKM'de tutulmalı. İşçi eksi mesaide kalabilir.</li>
        <li><b>Personel öner: N kişi:</b> kişiler hedef nöbetlerini tamamen tutsa bile istasyonda açık kalıyor ve bu açık, gelen kişinin mesaisini orada tamamlamasına yetiyor (açık ≥ yaklaşık 7 nöbet). N = açık ÷ 7 (aşağı yuvarlanır). Kalan küçük kısım fazla nöbetle kapanır.</li>
        <li><b>Fazla mesaiyle kapanır:</b> açık bir kişiyi doldurmaya yetmiyor; kişilere mesailerinin üstünde, azami nöbete kadar nöbet yazılarak kapanıyor. Personel gerekmez.</li>
        <li><b>Elle karar:</b> azami nöbetle bile açık kalıyor ama açık bir kişinin mesaisini doldurmaya yetmiyor. Gelen kişi fazla kalır; görevlendirme gerekip gerekmediğine siz karar verirsiniz (Görevlendirme sayfasından elle yapılır).</li>
        <li><b>Nöbet branşları ve yetenekler:</b> her istasyonda üç nöbet branşı vardır: ekip şefi (ES), yardımcı sağlık personeli (YSP), sürücü. Doktor yalnızca ES, işçi yalnızca sürücü; <b>AABT</b> (ASOS'ta sağlık teknikeri) ekip şefi ve YSP nöbet branşında; sürücü nöbet branşına yalnız nöbet listelerinde sürücü olarak nöbet tuttuğu doğrulanırsa; <b>ATT</b> (sağlık memuru / teknisyeni) YSP ve sürücü nöbet branşında çalışır, <b>ekip şefi nöbet branşına girmez</b>. Nöbet branşları önce AABT doldurur (ekip şefi öncelikli; gerekirse hedefin üstüne +1 nöbet yazılır), fazlalık ATT'de görünür ve bir ATT bir ay dışarı çıkabilir. Rol Nöbet Listesi Raporu'ndaki nöbet görevlerinden otomatik belirlenir, istasyon sayfasından değiştirilebilir. Bir grubun fazlası başka nöbet branşını doldurmaz.</li>
        <li><b>Ekip OF:</b> kapalı ekip; ihtiyaç 0 sayılır.</li>
        <li><b>Plan farkı:</b> planlanan nöbet toplamı ile olması gereken (ihtiyaç ya da azami kapasite, hangisi küçükse) arasındaki fark. Normalde görünmez; elle girilip kilitlenen değerler varsa çıkar.</li></ul></details>
      <div class="ap-sum ap-sum1"><div class="ap-click ${f ? '' : 'on'}" data-act="pano-filtre" data-v="" title="Tüm istasyonları göster" tabindex="0"><b>${ists.length - of}</b><span>Açık istasyon</span><small class="ap-tk-git">${f ? 'Tümünü göster ›' : '✓ Gösteriliyor'}</small></div>${of ? tk('of', of, 'inherit', 'Ekip OF (kapalı)') : ''}<div><b>${aktif}</b><span>Aktif kayıt</span></div>
      <div><b>${ih}</b><span>Toplam ihtiyaç (nöbet)</span></div><div><b>${fmt(S.ayar.panoMod === 'mesai' ? kap : azk)}</b><span>${S.ayar.panoMod === 'mesai' ? 'Kapasite (mesai karşılığı)' : `Kapasite (en çok ${fmt(S.ayar.azamiMemur)} nöbet)`}</span></div>
      <div><b>${fmt(pl)}</b><span>Planlanan</span></div>${tk('oner', acik, 'var(--ap-bad)', 'Personel önerilen istasyon', ` (toplam ${kisiOner} kişi)`)}${S.ayar.panoMod === 'mesai' ? '' : tk('icerde', fm, 'var(--ap-warn)', 'Fazla mesaiyle kapanan (personel gerekmez)')}${tk('elle', elle, '#9a3412', S.ayar.panoMod === 'mesai' ? 'Açık kalan (kişiye yetmeyen)' : 'Elle karar gerektiren')}${tk('fazla', fazla, 'var(--ap-bad)', 'Mesaisini tamamlayamayan (fazla personel)')}</div>
      ${f ? `<div class="ap-row"><b>${FILTRE_AD[f]}: ${gosterilen.length}</b><button class="ap-btn sm" data-act="pano-filtre" data-v="">✕ Filtreyi kaldır</button><span class="ap-note">Kartlara tıklayarak istasyonu açabilirsiniz.</span></div>` : ''}
      <div class="ap-toolbar ap-noprint" data-ust><button class="ap-btn pri" data-act="tum-plan" ${salt() ? 'disabled' : ''} title="Geri çağırma, nöbet hesabı ve rotasyon görevlendirmelerini tek seferde yapar">Tüm planlamayı oluştur</button><button class="ap-btn" data-act="oner-hepsi" title="Tüm istasyonlarda planlanan nöbetleri yeniden hesaplar">Planlananı yeniden hesapla</button>
      <button class="ap-btn" data-act="excel-toplu" title="Planlama biriminin aylık dosya düzeni: Personel Bilgileri, İstatistik, Kurum Dışına Giden/Gelen, KKM, Başhekimlik ve ilçe sırasıyla istasyonlar; satırlar duruma göre renkli, tahmini nöbet mesai saatinden">Tüm istasyonlar (tek dosya) ▾</button>
      <span class="ap-seg" title="Mesai karşılığı: herkes yalnız mesaisini tamamlayacak kadar nöbet tutar. Fazla mesaili: DOKTOR-AABT-ATT'ye yazdığınız nöbet sayısına kadar fazla nöbet yazılabilir."><button class="${S.ayar.panoMod === 'mesai' ? 'on' : ''}" data-act="pano-mod" data-v="mesai">Mesai karşılığı</button><button class="${S.ayar.panoMod !== 'mesai' ? 'on' : ''}" data-act="pano-mod" data-v="fazla">Fazla mesaili</button></span>
      <label class="ap-note ap-azami ${S.ayar.panoMod === 'mesai' ? 'off' : ''}" title="DOKTOR-AABT-ATT'ye bir ayda yazılabilecek en çok 24 saatlik nöbet sayısı. Yazdığınız sayıya göre pano yeniden hesaplanır (istasyon sayfasından istasyona özel değiştirilebilir).">DOKTOR-AABT-ATT en çok <input class="ap-in n" type="number" min="0" step="0.5" data-pano-azami value="${S.ayar.azamiMemur}" ${S.ayar.panoMod === 'mesai' || salt() ? 'disabled' : ''}> nöbet</label>
      <span class="ap-pano-ara"><input id="ap-pano-ara" class="ap-in" type="search" placeholder="Ekip ara…" value="${esc(S.panoAra || '')}" aria-label="Ekip (istasyon) ara" autocomplete="off"><span class="ap-note">${AYLAR[S.m]}: ${C.gunSayisi(S.y, S.m)} gün × ${C.YUVA_VARSAYILAN} nöbet branşı = ${C.gunSayisi(S.y, S.m) * C.YUVA_VARSAYILAN} nöbet/istasyon · memur ${fmt(C.ayMesai(S.y, S.m, false, ozel()))} sa., işçi ${fmt(C.ayMesai(S.y, S.m, true, ozel()))} sa.</span><span class="ap-note" id="ap-pano-ara-say">${araQ ? `${araGorunen} / ${gosterilenI.length} istasyon gösteriliyor (üstteki sayılar tüm istasyonlar içindir)` : ''}</span></span></div>
      <div class="ap-grid">${kartlar || `<div class="ap-empty">${f ? 'Bu grupta istasyon yok' : 'İstasyon yok'}</div>`}<div class="ap-empty" id="ap-pano-ara-yok" style="display:${araQ && !araGorunen && kartlar ? '' : 'none'}">Aramaya uyan istasyon yok</div></div>`;
  }

  function lejant() {
    const D = durumlar(), ek = RENK_LEJANT.map(([r, t]) => [RENK[r], t]), kapsanan = k => k === 'GEÇİCİ GÖREVDE' || k === 'GEÇİCİ GÖREVLİ' || /RAPORLU|ANALIK|DOĞUM|GEBE|GEBELİK/.test(k);
    const set = new Map(); Object.entries(D).forEach(([k, v]) => { if (v.renk && !v.pasif && !kapsanan(k)) { const t = set.get(v.renk) || []; t.push(k); set.set(v.renk, t); } });
    return `<div class="ap-legend">${ek.map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('')}${[...set].map(([c, t]) => `<span><i style="background:${c}"></i>${t.join(' / ')}</span>`).join('')}</div>`;
  }

  // Yuva bazlı özet: üç yuva (ekip şefi, YSP, sürücü) için dolan/açık ve hangi grubun doldurduğu; gruplara göre fazlalar
  // Listedeki planlanan nöbetlerle yuva akışı (kişi bazlı değerler değiştikçe güncellenir)
  function planAkis(h) {
    const sup = {}; C.GRUPLAR.forEach(g => { sup[g] = 0; });
    h.satir.forEach(s => { if (!s.nobetYok) sup[s.grup] = (sup[s.grup] || 0) + sayi(s.k.planlanan); });
    return C.akis(sup, h.slot.dem, h.attEs);
  }
  // İstasyon sayfası durumu: tek kaynak yazılı plan (kişilerin PLAN sütunu). Açık branş, sığmayan fazla ve mesai eksiği tek kutuda, çözümüyle birlikte.
  function planDurumHtml(h, pa, mesaiEksik) {
    if (!pa) return '';
    const AD = {es: 'Ekip şefi', ysp: 'YSP', sur: 'Sürücü'}, acik = ['es', 'ysp', 'sur'].filter(y => pa.rem[y] > 0.05), fazla = C.GRUPLAR.filter(g => pa.fazla[g] > 0.05);
    const sat = [];
    if (acik.length) {
      const yapar = {es: 'doktor / AABT', ysp: 'AABT / ATT', sur: 'işçi ya da sürücülüğü doğrulanmış AABT / ATT'};
      sat.push(`<b>${acik.map(y => `${AD[y]} ${fmt(pa.rem[y])} nöbet açık`).join(', ')}</b> — bu nöbeti tutabilecek kişinin planı dolu. Gereken: ${acik.map(y => yapar[y]).join('; ')}.`);
      if (pa.rem.sur > 0.05) {      // sürücü açığı: kimin sürücü sayıldığı, kimin sayılmadığı ve nedeni
        const es = {degil: S.ayar.surDegilEsik / 100}, sur = h.satir.filter(x => !x.nobetYok && ['ka', 'sy', 'isci', 'ms'].includes(x.grup)), deg = h.satir.filter(x => !x.nobetYok && x.k.sinif === 'memur' && (x.grup === 'ke' || x.grup === 'ysp'));
        const pct = x => { const d = C.surucuDurumu(x.k, es); return d.kaynak === 'kayit' ? `sürücü %${Math.round(100 * d.pay)}` : d.kaynak === 'manuel' ? 'elle: sürücü değil' : 'kayıt yok'; };
        sat.push(`Sürücü sayılan: <b>${sur.length} kişi</b> (planı ${fmt(sur.reduce((t, x) => t + sayi(x.k.planlanan), 0))} nöbet; ${fmt(pa.fill.ka.sur + pa.fill.sy.sur + pa.fill.isci.sur)} nöbeti sürücüye yazılabiliyor). ${deg.length ? `Sürücü <b>sayılmayan</b>: ${deg.map(x => `${esc(x.k.ad)} (${pct(x)})`).join(', ')} — nöbet kayıtlarında sürücü olarak nöbeti yok ya da kayıt yok. Sürücü olarak nöbet tutuyorsa <b>NÖBET ROLÜ</b> sütunundan "Sürücü dahil" seçin.` : ''}`);
      }
      if (fazla.length) sat.push(`Aynı istasyonda ${fazla.map(g => `${C.GRUP_AD[g]} ${fmt(pa.fazla[g])} nöbet`).join(', ')} yazılı ama açık branşa giremiyor. <b>Çözüm:</b> bu gruptan biri başka istasyona, açık branşı tutabilen biri bu istasyona (değişim) ya da açık branşı tutabilen kişilerin planını artırın.`);
      else sat.push(`<b>Çözüm:</b> açık branşı tutabilen kişilerin planını artırın (azami nöbete kadar) ya da personel isteyin${h.ihtiyacTur === 'oner' ? ` — rotasyon önerisi: <b>${h.ihtiyacKisi} kişi</b> gelmeli` : h.ihtiyacTur === 'elle' ? ' — açık bir kişinin ay boyu mesaisine yetmiyor: kısa görevlendirme' : ''}.`);
    } else if (fazla.length) sat.push(`<b>${fazla.map(g => `${C.GRUP_AD[g]} ${fmt(pa.fazla[g])} nöbet`).join(', ')} fazla yazılı</b>: nöbet branşları dolu, bu nöbetler kullanılmaz. Planı azaltın ya da kişi başka istasyona gitsin.`);
    if (mesaiEksik.length) sat.push(`<b>${mesaiEksik.length} kişi mesaisini tamamlayamıyor</b> (${mesaiEksik.map(x => `${esc(x.s.k.ad)} ${fmt(x.eksik)}`).join(', ')} nöbet eksik): doktor / AABT / ATT eksik mesaide kalamaz — eksik nöbetleri başka istasyonda / KKM'de tutmalı.`);
    return sat.length ? `<div class="ap-ek ${acik.length || mesaiEksik.length ? 'ap-ek-e' : 'ap-ek-c'}" style="margin-top:8px">${sat.map(x => `<div>${x}</div>`).join('')}</div>` : '';
  }
  const planKarsilar = (h, p) => p >= h.ihtiyac - 0.05 && h.ihtiyac > 0 && (() => { const r = planAkis(h).rem; return r.es <= 0.05 && r.ysp <= 0.05 && r.sur <= 0.05; })();
  function slotOzet(h, ek) {
    // Tek satırlık özet: her nöbet branşında dolan / gereken ve durum etiketi; dolduran gruplar ve azami notu üzerine gelince (title) görünür
    const d = h.slot, A = d.azami, SL = [['es', 'Ekip şefi'], ['ysp', 'YSP'], ['sur', 'Sürücü']];
    const H = planAkis(h);
    const katki = sl => C.GRUPLAR.filter(g => H.fill[g][sl] > 0.001).map(g => `${C.GRUP_AD[g]} ${fmt(H.fill[g][sl])}`).join(' + ') || '—';
    const satir = SL.map(([sl, ad]) => { const ac = H.rem[sl] > 0.05, az = A.rem[sl] > 0.001 ? 'azamiyle de ' + fmt(A.rem[sl]) + ' açık kalır' : 'azami nöbetle kapanır';
      return `<span class="r" title="Dolduran: ${esc(katki(sl))}${ac ? ' · ' + az : ''}">${ad} <b>${fmt(d.dem[sl] - H.rem[sl])}/${fmt(d.dem[sl])}</b> ${ac ? `<span class="ap-tag ap-t-ih">${fmt(H.rem[sl])} açık${A.rem[sl] > 0.001 ? '' : ' · azamiyle kapanır'}</span>` : '<span class="ap-tag ap-t-ok">dolu</span>'}</span>`; }).join('');
    const fazla = C.GRUPLAR.filter(g => H.fazla[g] > 0.05).map(g => `<span class="ap-tag ap-t-fz" title="Bu gruptaki kişilere yazılan nöbet kendi nöbet branşlarını aşıyor; başka nöbet branşını dolduramaz">${C.GRUP_AD[g]}: ${fmt(H.fazla[g])} fazla</span>`).join(' ');
    return `<div class="ap-slot"><b>Nöbet branşları:</b>${satir}${fazla}
      <details class="ap-note"><summary style="cursor:pointer">Kurallar</summary>Yetenekler: doktor → ekip şefi · işçi → sürücü · AABT (sağlık teknikeri) → ekip şefi, YSP ve sürücü (nöbet listesinde sürücü görünen AABT sürücü branşına öncelikli girer) · ATT (sağlık memuru / teknisyeni) → YSP ve sürücü; doktorlu ekipte (tip A1 ya da kadroda doktor) ATT ekip şefi nöbet branşına girmez, doktorsuz ekipte en son ekip şefine takviye verir. Önce AABT nöbet branşları doldurur (ekip şefi öncelikli), fazlalık ATT'de görünür.</details>${ek || ''}</div>`;
  }
  // Silinen kişiler: kayıt kalıcı silinmez, buradan geri getirilebilir
  function silinenHtml(b, duz) {
    const l = (S.plan.silinen || []).filter(x => x.birim === b.ad || x._silBirim === b.ad);
    if (!l.length) return '';
    return `<details class="ap-card" style="margin-top:12px"><summary><b>Silinen kişiler (${l.length})</b> <span class="ap-note">yanlışlıkla silineni geri getirebilirsiniz</span></summary>${l.map(k => `<div class="ap-row"><b>${esc(k.ad)}</b><span class="ap-note">${esc(k.unvan || '')} · ${new Date(k._silZaman).toLocaleString('tr-TR')}</span><button class="ap-btn sm pri" data-act="kisi-geri" data-id="${k.id}" ${duz ? '' : 'disabled'}>Geri getir</button></div>`).join('')}</details>`;
  }
  // Geçici görev hücresi: hedef istasyon / Başhekimlik / KKM seçilir; diğer yerler (ilçe sağlık müdürlüğü, devlet hastanesi…) elle yazılır
  function gorevHucre(k, birimler, b, dt, dis) {
    const g = k.gorev, aktif = dt.disarida || (g && (g.hedef || g.yer));
    if (!aktif) return gorevMetin(k) ? `<span class="ap-hd">${esc(gorevMetin(k))}</span>` : '';
    const diger = !!g && !g.hedef && (g.diger || !!g.yer);
    return `<div class="ap-gh">${istTekHtml('f:' + k.id + ':gHedef', g && g.hedef ? g.hedef : diger ? '__diger__' : '', birimler.filter(x => x.ad !== b.ad).map(x => x.ad), {kucuk: true, kapali: !!dis, bos: '— yer seç —', ek: [['__diger__', 'Diğer (yaz)…']]})}${diger ? `<input class="ap-in w" data-id="${k.id}" data-f="gYer" value="${esc(g.diger && g.yer === 'Diğer' ? '' : g.yer || '')}" placeholder="İlçe Sağlık Müd., Devlet Hastanesi…" ${dis}>` : ''}${g && (g.hedef || g.yer) && g.tarih ? `<div class="ap-note">${esc(g.tarih)}</div>` : ''}</div>`;
  }
  // İstasyon tablosu, ad altındaki "nöbet tutar" etiketi (Başhekimlik / KKM nöbeti). Planlama yetkilisi etikete tıklayıp seçer:
  // Otomatik (rapordan) / Nöbet tutar / Nöbet tutmaz. Elle seçim k.idariNobetElle'de saklanır; "nöbet tutmaz" soluk ve üstü çizili görünür.
  function idariEtiket(k, duz) {
    const elle = typeof k.idariNobetElle === 'boolean', var_ = idariNobetVar(k), oto = idariNobetOto(k), ed = duz && planlamaRol();
    const kay = k.idariNobet && k.idariNobet.birim ? `Nöbet Listesi Raporunda ${k.idariNobet.birim} nöbeti kaydı var (son 6 ay)` : 'Nöbet Listesi Raporunda son 6 ayda Başhekimlik / KKM nöbeti kaydı yok';
    const bil = elle ? `Elle seçildi: ${var_ ? 'nöbet tutar' : 'nöbet tutmaz'} (rapora göre: ${oto ? 'tutar' : 'tutmaz'})` : kay;
    const ic = `nöbet tutar${elle ? '<sup class="ap-elle">elle</sup>' : ''}`, sinif = `ap-tag ap-t-ok${elle && !var_ ? ' ap-idn-yok' : ''}`;
    let h = '';
    if (var_ || elle) h = ed ? `<button type="button" class="${sinif} ap-tagbtn" data-act="idari-ac" data-id="${k.id}" title="${esc(bil)} — değiştirmek için tıklayın">${ic}</button>` : `<span class="${sinif}" title="${esc(bil)}">${ic}</span>`;
    else if (ed) h = `<button type="button" class="ap-tag ap-tagbtn ap-idn-ek" data-act="idari-ac" data-id="${k.id}" title="${esc(kay)} — Başhekimlik / KKM nöbet durumunu elle belirlemek için tıklayın">idari nöbet…</button>`;
    if (ed && S.idariAc === k.id) {
      const sec = elle ? (k.idariNobetElle ? '1' : '0') : 'oto';
      h += `<div class="ap-idn-sec" role="group" aria-label="Başhekimlik / KKM nöbeti">${[['oto', `Otomatik (rapordan: ${oto ? 'tutar' : 'tutmaz'})`], ['1', 'Nöbet tutar'], ['0', 'Nöbet tutmaz']].map(([v, t]) => `<button type="button" class="ap-btn sm${v === sec ? ' pri' : ''}" data-act="idari-sec" data-id="${k.id}" data-v="${v}">${t}</button>`).join('')}</div>`;
    }
    return h;
  }
  function istHtml() {
    const birimler = S.plan.birimler;
    const b = birimler.find(x => x.ad === S.ist) || birimler[0];
    if (!b) return '<div class="ap-card ap-empty">Birim yok.</div>';
    S.ist = b.ad;
    const D = durumlar(), duz = !salt();
    const kis = S.plan.kayitlar.filter(k => (k.birim === b.ad || (k.gorev && k.gorev.hedef === b.ad && (D[k.durum] || {}).disarida)) && (planlamaRol() || !gizliKisi(k)));
    const istas = b.tur === 'istasyon', h = istas ? hesapla(b) : null;
    const disSay = geriCagirmaAdaylari(b, true).length;
    const satirMap = new Map(); if (h) h.satir.forEach(s => satirMap.set(s.k.id, s));
    kis.sort(nobetSirala(satirMap, !istas));
    const p = h ? planlananToplam(h) : 0;
    let son = '', rows = '';
    const mesEksik = [];
    kis.forEach(k => {
      const gelen = k.birim !== b.ad, s = satirMap.get(k.id), dt = D[k.durum] || {};
      if (!gelen && son && k.sinif !== son) rows += '<tr class="sep"><td colspan="17"></td></tr>';
      if (!gelen) son = k.sinif;
      const renk = satirRenk(k, gelen), eng = C.gorevlendirmeEngeli(k, ayIlk());
      const dis = duz ? '' : 'disabled';
      // Hedef ekranda 2 ondalıkla gösterilir (104 sa ÷ 24 = 4,33); planlanan bu yuvarlanmış hedefe ulaşıyorsa mesai tamam sayılır
      const r2 = v => Math.round(v * 100) / 100, hedefTam = s ? sayi(k.planlanan) >= r2(s.hedef) - 1e-9 : false;
      const fark = s ? ((f0 => Math.abs(f0) < 0.02 ? 0 : f0)(r2(sayi(k.planlanan) - r2(s.hedef)))) : 0;      // küsurat yuvarlaması (7,66 / 7,67) fark sayılmaz
      // mesai saatini tamamlayamama: memur/doktor planlanan×24 saat < mesai; işçi 12 saatlik nöbet başına sistemden düşülen saat (hedefin altında kalan nöbet sayısı × düşülen saat)
      const saatEksik = s && !s.nobetYok && !gelen && k.planlanan != null && !hedefTam ? (k.sinif === 'isci' ? Math.max(0, (s.hedef - sayi(k.planlanan)) / C.ADIM * (S.ayar.isciDusulen || 11)) : Math.max(0, s.mesai - sayi(k.planlanan) * 24)) : 0, eksikMesai = saatEksik > 0.01;
      if (eksikMesai) mesEksik.push(`${k.ad} (−${fmt(Math.round(saatEksik * 10) / 10)} saat)`);
      rows += `<tr class="c${eksikMesai ? ' mes-eksik' : ''}" title="${eksikMesai ? 'Mesai saatini tamamlayamıyor: planlanan nöbet mesai saatinin altında kalıyor' : ''}" style="${renk ? 'background:' + renk : ''}">
        <td><input class="ap-in w" data-id="${k.id}" data-f="ad" value="${esc(k.ad)}" ${dis}>${idariEtiket(k, duz)}</td>
        <td><input class="ap-in w" data-id="${k.id}" data-f="unvan" value="${esc(k.unvan)}" ${dis} title="${esc(k.dortB ? '4/B' : '')}">${k.dortB ? '<span class="ap-tag ap-t-fz" title="4/B personel">4/B</span>' : ''}${(() => { const y = C.kadroYilDurum(k.kadroTarih, ayIlk()); return y.yok || y.uygun ? '' : `<span class="ap-tag ap-t-fz" title="Kadro değişikliği (${esc(k.kadroTarih.split('-').reverse().join('.'))}): ${esc(y.dolum.split('-').reverse().join('.'))} tarihine kadar görevlendirilemez">kadro 1 yıl</span>`; })()}</td>
        <td class="gz"><select class="ap-sel" data-id="${k.id}" data-f="sinif" ${dis}>${Object.entries(SINIF_AD).map(([a, t]) => `<option value="${a}" ${a === k.sinif ? 'selected' : ''}>${t}</option>`).join('')}</select></td>
        <td>${k.sinif === 'memur' ? `${(() => { const sd = C.surucuDurumu(k, {degil: S.ayar.surDegilEsik / 100}); return `<select class="ap-sel" data-id="${k.id}" data-f="rolManuel" ${dis} title="${sd.kaynak === 'kayit' ? `Nöbet kayıtlarında sürücü payı %${Math.round(100 * sd.pay)}. ` : ''}Boş: nöbet listelerinden otomatik. AABT ve ATT sürücü nöbet branşına yalnız nöbet listesinde sürücü görünüyorsa girer; ATT ekip şefi nöbet branşına girmez."><option value="">Oto: ${esc(s ? ({dok: 'Doktor', isci: 'İşçi', ms: 'Sürücü (657)', ke: 'AABT: ekip şefi+YSP', ka: 'AABT: sürücü dahil', ysp: 'Yalnız YSP', sy: 'Sürücü+YSP'})[s.grup] : '')}</option>${(s && s.kadroTip === 'AABT' ? [['ysp', 'Ekip şefi+YSP (sürücü değil)'], ['sur', 'Sürücü dahil']] : [['ysp', 'Yalnız YSP'], ['sur', 'Sürücü+YSP']]).map(([r, t]) => `<option value="${r}" ${(k.rolManuel === r || (r === 'sur' && k.rolManuel === 'karma')) ? 'selected' : ''}>${t}</option>`).join('')}</select><div class="ap-note ap-rolnot">${sd.kaynak === 'manuel' ? 'elle seçildi' : sd.kaynak === 'kayit' ? `sürücü %${Math.round(100 * sd.pay)}` : '<span style="color:var(--ap-warn)">doğrulanmadı</span>'}</div>`; })()}` : `<span class="ap-note ap-hd">${k.sinif === 'doktor' ? 'Ekip şefi' : 'Sürücü'}</span>`}</td>
        <td title="${k.durumMetin && k.durumMetin !== k.durum ? esc(k.durumMetin) : ''}">${gelen ? '<b class="ap-hd">GEÇİCİ GÖREVLİ</b>' : `<select class="ap-sel" data-id="${k.id}" data-f="durum" ${dis}><option value="">—</option>${Object.keys(D).map(a => `<option ${a === k.durum ? 'selected' : ''}>${a}</option>`).join('')}</select>`}${k.durumMetin && k.durumMetin !== k.durum ? `<div class="ap-note ap-durnot">${esc(k.durumMetin)}</div>` : ''}</td>
        <td class="iz-g"><input class="ap-in n" type="number" min="0" step="0.5" data-id="${k.id}" data-f="izinGun" value="${izinGun(k) || ''}" ${dis}>${izinTarihli(k) && izinAyGun(k) !== izinGun(k) ? `<div class="ap-note iz-not" title="İznin başlangıç-bitiş tarihleri ASOS'tan geldi; mesaiyi yalnız plan ayına düşen günler etkiler">${ayEtiket()}'da ${izinAyGun(k)} gün · mesaiden ${fmt(C.kisiMesai({...k, izin: [], sut: 0, durum: ''}, S.y, S.m, ozel(), durumlar()) - C.kisiMesai({...k, sut: 0, durum: ''}, S.y, S.m, ozel(), durumlar()))} saat düşer</div>` : ''}</td>
        <td class="gz iz-t"><select class="ap-sel" data-id="${k.id}" data-f="izinTur" ${dis}><option value="">—</option>${IZIN_TURLERI.map(a => `<option ${a === ((k.izin || [])[0] || {}).tur ? 'selected' : ''}>${a}</option>`).join('')}</select></td>
        <td class="num">${s ? fmt(s.mesai) : ''}</td><td class="num">${s ? fmt(s.hedef) : ''}${(() => { if (!s || s.nobetYok || !(s.mesai > 0) || k.sinif !== 'isci') return ''; const tam = k.sinif === 'isci' ? s.mesai / (S.ayar.isciDusulen || 11) * C.ADIM : s.mesai / 24; return Math.abs(tam - s.hedef) > 0.005 ? `<div class="ap-note" title="Mesai saati ÷ ${k.sinif === 'isci' ? (S.ayar.isciDusulen || 11) + ' × 0,5' : '24'} = tam oran (hedef 0,5 adıma ${k.sinif === 'isci' ? 'aşağı' : 'yukarı'} yuvarlanır)">tam ${tam.toLocaleString('tr-TR', {maximumFractionDigits: 2})}</div>` : ''; })()}</td><td class="num gz">${s && !s.nobetYok ? fmt(s.azami) : ''}</td>
        <td>${istas && !(s && s.nobetYok) ? `<div class="ap-stp"><input class="ap-in n" type="text" inputmode="decimal" data-id="${k.id}" data-f="planlanan" value="${k.planlanan != null ? fmt(k.planlanan) : ''}" ${dis}><span class="ap-stb"><button type="button" data-act="plan-art" data-id="${k.id}" data-v="1" ${dis} title="Bir üst 0,5 adıma (ör. 7,67 → 8)">▲</button><button type="button" data-act="plan-art" data-id="${k.id}" data-v="-1" ${dis} title="Bir alt 0,5 adıma (ör. 7,67 → 7,5)">▼</button></span></div>` : ''}</td>
        <td class="num fk ${Math.round(fark * 100) > 0 ? 'ap-pos' : Math.round(fark * 100) < 0 ? 'ap-neg' : ''}">${s && !s.nobetYok && k.planlanan != null ? (Math.round(fark * 100) > 0 ? '+' : '') + fmt(fark) : ''}</td>
        <td>${istas && !(s && s.nobetYok) ? `<input type="checkbox" data-id="${k.id}" data-f="kilit" ${k.kilit ? 'checked' : ''} ${dis} title="Kilitli değer otomatik hesapta değişmez. Elle girilen planlanan değer kendiliğinden kilitlenir; kilidi açınca yeniden hesaplanır.">` : ''}</td>
        <td>${gelen ? `<span class="ap-hd">${esc(k.birim + ' kadrosundan')}</span>${(() => { const t = gorevTarihleri(k.gorev); return t.bas || t.bit ? `<div class="ap-note">${t.bas ? trTarih(t.bas) : '…'} – ${t.bit ? trTarih(t.bit) : 'bitiş yok'}${k.gorev.kaynak === 'asos' ? ' · ASOS' : ''}</div>` : '<div class="ap-note">tarih yok</div>'; })()}` : gorevHucre(k, birimler, b, dt, dis)}${eng ? `<div class="ap-note" style="color:var(--ap-bad)">${esc(eng)}</div>` : ''}</td>
        <td class="gz"><select class="ap-sel" data-id="${k.id}" data-f="yolluk" ${dis}>${YOLLUK_SEC.map(a => `<option ${a === ((k.gorev || {}).yolluk || '') ? 'selected' : ''}>${a}</option>`).join('')}</select></td>
        <td class="gz"><input class="ap-in w" data-id="${k.id}" data-f="aciklama" value="${esc(k.aciklama || '')}" ${dis} placeholder="Açıklama" title="Kişiye özel not; PNG ve Excel çıktısındaki AÇIKLAMA sütununda yer alır"></td>
        <td>${gelen ? `<button class="ap-btn sm" data-act="gorev-bitir" data-id="${k.id}" ${duz ? '' : 'disabled'} title="Geri gönder: görevlendirmeyi bitirir, kişi ${esc(k.birim)} istasyonuna geri döner">↩ Geri</button>` : (gorevAktif(k.gorev) ? `<button class="ap-btn sm" data-act="gorev-bitir" data-id="${k.id}" ${duz ? '' : 'disabled'} title="Geri çağır: görevlendirmeyi bitirir, kişi bu istasyona geri döner">↩ Geri</button> ` : '')}${duz && !gelen ? `<button class="ap-btn sm dng" data-act="kisi-sil" data-id="${k.id}" title="Kaydı sil">✕</button>` : ''}</td></tr>`;
    });
    // 657: doktor / AABT / ATT'nin planlanan nöbeti mesaisinin (hedef) altındaysa uyarı (işçi hariç; eksi kalabilir)
    const mesaiEksik = h && !b.ekipOf ? h.satir.filter(x => !x.nobetYok && x.k.sinif !== 'isci').map(x => ({s: x, eksik: Math.round((x.hedef - sayi(x.k.planlanan)) * 100) / 100})).filter(x => x.eksik >= 0.02) : [];
    const pAk = h && !b.ekipOf ? planAkis(h) : null, planTam = !!pAk && Math.abs(p - h.ihtiyac) < 0.05 && ['es', 'ysp', 'sur'].every(y => pAk.rem[y] <= 0.05);      // plan ihtiyaca eşit ve üç nöbet branşı da dolu: hesap uyarıları gösterilmez
    const durumBar = h && b.ekipOf ? `<div class="ap-card"><b>EKİP OF — bu ekip kapalı.</b> İhtiyaç 0 sayılır. Personeli diğer istasyonlara <b>uzun süreli</b> görevlendirilir (Görevlendirme sayfasındaki rotasyon önerisi açık uçlu görev yazar) ve ekip yeniden açılırken <b>geri çağrılır</b>: kutunun işaretini kaldırdığınızda ya da "Personeli geri çağır" düğmesiyle. Kapalı ekibe görevlendirme yapılamaz.</div>` : h ? `<div class="ap-card"><div class="ap-row"><b>Plan: ${fmt(p)} / ${h.ihtiyac}</b>
      <span class="ap-tag ${Math.abs(p - h.ihtiyac) < 0.05 ? 'ap-t-ok' : 'ap-t-ih'}">${Math.abs(p - h.ihtiyac) < 0.05 ? 'İhtiyaçla eşit' : (p < h.ihtiyac ? fmt(h.ihtiyac - p) + ' nöbet planlanamadı' : fmt(p - h.ihtiyac) + ' nöbet fazla')}</span>
      <label class="ap-note" title="Boş bırakırsanız Pano'daki mod geçerli olur (Mesai karşılığı: fazla nöbet yazılmaz; Fazla mesaili: genel ${fmt(S.ayar.azamiMemur)} nöbet). Bir sayı yazarsanız bu istasyon, Pano modundan bağımsız olarak o sayıyla fazla mesaili hesaplanır.">Bu istasyonda azami nöbet (DOKTOR-AABT-ATT) <input class="ap-in n" type="number" step="0.5" min="0" data-ib="${esc(b.ad)}" value="${b.azamiMemur != null ? b.azamiMemur : ''}" placeholder="${fmt(S.ayar.azamiMemur)}" ${duz ? '' : 'disabled'}></label>
      ${planTam ? `<span class="ap-tag ap-t-ok">İstasyon tam: ihtiyaç karşılandı${mesaiEksik.length ? ' (nöbet branşları dolu)' : ''}</span>` : ''}
      </div>${planDurumHtml(h, pAk, mesaiEksik)}${slotOzet(h, `<details class="ap-note"><summary style="cursor:pointer">İhtiyaç hesabı</summary>İhtiyaç = ${h.gun} gün × ${b.yuva || 3} nöbet branşı${b.tip ? ` · İstasyon tipi ${esc(b.tip)}${b.tip === 'A1' ? ' (doktorlu)' : ''}` : ''}. Doktor yalnızca ekip şefi nöbet branşını (${h.gun}) doldurur; işçi sürücü nöbet branşında 12 saatlik nöbet tutar (en çok ${h.gun}); kalanı memur karşılar. DOKTOR-AABT-ATT hedefin üstünde en çok ${fmt(b.azamiMemur != null ? b.azamiMemur : S.ayar.azamiMemur)} nöbet yazılır; işçi hedefin üstünde nöbet tutmaz.</details>`)}</div>` : '';
    const tabloHtml = () => `${(() => { const W = [['ad', 170], ['unvan', 150], ['sinif', 90, 1], ['rol', 190], ['durum', 150], ['izin', 66], ['izintur', 120, 1], ['mesai', 68], ['hedef', 76], ['azami', 68, 1], ['plan', 108], ['fark', 68], ['kilit', 46], ['gecici', 210], ['yolluk', 110, 1], ['acik', 190, 1], ['islem', 96]], vis = W.filter(x => !(S.istKmp && x[2])), top = vis.reduce((a, x) => a + x[1], 0);
        const H = ['AD SOYAD', 'ÜNVAN', 'SINIF', 'NÖBET ROLÜ', 'G.GÖREV DURUMU', 'İZİN GÜN', 'İZİN TÜRÜ', 'MESAİ', 'HEDEF', 'AZAMİ', 'PLAN', 'FARK', '🔒', 'GEÇİCİ GÖREV', 'YOLLUK', 'AÇIKLAMA', 'İŞLEM'];
        return `<div class="ap-tw ap-tw-ist"><table class="ap-t ap-ist ${S.istKmp ? 'kmp' : ''} ${istSiki() ? 'siki' : ''}" style="width:${top}px"><colgroup>${W.map(x => `<col class="${x[2] ? 'gz' : ''}" style="width:${x[1]}px">`).join('')}</colgroup><thead><tr>${H.map((t, n) => `<th class="${W[n][2] ? 'gz' : ''}">${t}</th>`).join('')}</tr></thead>`; })()}<tbody>${rows || '<tr><td colspan="17" class="ap-empty">Bu birimde kayıt yok</td></tr>'}</tbody></table></div>${silinenHtml(b, duz)}`;
    // Sürüm 13.58 (deneme): tam ekran — yalnız kısa çubuk + personel tablosu, yan menü ve üst bölüm yok
    if (S.tamEkran) return `<div class="ap-row ap-noprint ap-tam-cubuk">${istTekHtml('ist', b.ad, birimler.map(x => x.ad))}
      <button class="ap-btn" data-act="ist-onceki">‹</button><button class="ap-btn" data-act="ist-sonraki">›</button>
      <span class="ap-tag ${h && Math.abs(p - h.ihtiyac) < 0.05 ? 'ap-t-ok' : 'ap-t-ih'}" title="Planlanan / ihtiyaç">${h ? `${fmt(p)} / ${fmt(h.ihtiyac)}` : ''}</span>
      ${mesEksik.length && !b.ekipOf ? `<span class="ap-tag ap-t-ih" title="${esc(mesEksik.join(' · '))}">Mesaisi eksik: ${mesEksik.length}</span>` : ''}
      ${istas ? `<button class="ap-btn pri" data-act="oner" ${duz ? '' : 'disabled'} title="Kilitli olmayan değerleri yeniden hesaplar">Yeniden hesapla</button><button class="ap-btn" data-act="ist-onayla" data-v="1" ${duz ? '' : 'disabled'} title="Bu istasyondaki planlanan nöbet sayılarını sabitler (🔒)">Sayıları sabitle 🔒</button><button class="ap-btn" data-act="ist-onayla" data-v="0" ${duz ? '' : 'disabled'} title="Bu istasyondaki sabitlemeleri kaldırır">Sabitlemeyi kaldır</button>` : ''}
      <button class="ap-btn sm" data-act="ist-siki" title="Satırları daraltır; kalabalık ekipte personelin hepsi tek ekranda görünür (sürücü payı ve görev durumu notu üzerine gelince)">${istSiki() ? '⇕ Satırları genişlet' : '⇕ Satırları daralt'}</button>
      <button class="ap-btn sm" data-act="ist-tam" data-v="0" style="margin-left:auto" title="Tam ekrandan çık (Esc)">✕ Tam ekrandan çık</button>
      ${(S.plan.durum || 'taslak') !== 'kilitli' && !salt() ? `<button class="ap-btn pri sm" data-act="plan-kaydet" title="Değişiklikler zaten otomatik kaydedilir; bu düğme bekleyen değişikliği hemen sunucuya yazar">💾 Kaydet</button>` : ''}</div>
      ${h && !b.ekipOf ? `<div class="ap-tam-ozet">${slotOzet(h, '')}</div>` : ''}
      ${tabloHtml()}`;
    return `<div class="ap-row ap-noprint" data-ust>${istTekHtml('ist', b.ad, birimler.map(x => x.ad))}
      <button class="ap-btn" data-act="ist-onceki">‹</button><button class="ap-btn" data-act="ist-sonraki">›</button>
      ${istas ? `<button class="ap-btn pri" data-act="oner" ${duz ? '' : 'disabled'} title="Plan her değişiklikte otomatik hesaplanır; bu düğme kilitli olmayan değerleri yeniden hesaplar">Yeniden hesapla</button>` : ''}
      ${istas ? `<button class="ap-btn" data-act="ist-onayla" data-v="1" ${duz ? '' : 'disabled'} title="Bu istasyondaki tüm planlanan nöbet sayılarını sabitler (🔒): otomatik hesap bunları değiştirmez">Sayıları sabitle 🔒</button><button class="ap-btn" data-act="ist-onayla" data-v="0" ${duz ? '' : 'disabled'} title="Bu istasyondaki sabitlemeleri kaldırır; sayılar yeniden otomatik hesaplanır">Sabitlemeyi kaldır</button>` : ''}
      <button class="ap-btn" data-act="kisi-ekle" ${duz ? '' : 'disabled'}>+ Kişi ekle</button><button class="ap-btn" data-act="ist-tam" data-v="1" title="Personel tablosunu ekranın tamamında açar (yan menü ve üst bölüm gizlenir); Esc ile çıkılır">⛶ Tam ekran</button>
      ${disSay ? `<button class="ap-btn" data-act="geri-cagir" data-v="${esc(b.ad)}" ${duz ? '' : 'disabled'} title="Bu ekibin başka ASHİ istasyonlarına görevli personelini geri çağırır; uzun süreli (3 ay+) görevler ayrıca sorulur. KKM, Başhekimlik ve kurum dışı görevler geri çağrılmaz.">Personeli geri çağır (${disSay})</button>` : ''}<button class="ap-btn" data-act="png" data-v="${esc(b.ad)}">Görüntü (PNG)</button><button class="ap-btn" data-act="excel-ist" data-v="${esc(b.ad)}">İndir ▾</button>
      ${istas ? `<label class="ap-note" title="Kapalı ekip: ihtiyaç 0 sayılır; işareti kaldırınca ekip açılır ve personel geri çağrılabilir"><input type="checkbox" data-act="ekip-of" data-v="${esc(b.ad)}" ${b.ekipOf ? 'checked' : ''} ${duz ? '' : 'disabled'}> <b>Ekip OF (kapalı)</b></label>` : ''}
      </div>
      ${mesEksik.length && !b.ekipOf ? `<div class="ap-ek ap-ek-c" style="margin:8px 0;color:var(--ap-bad)"><b>Mesaisi eksik kalan personel (${mesEksik.length}):</b> ${mesEksik.map(esc).join(' · ')} <span class="ap-note">— planlanan nöbetler "Mesai" sütunundaki saati karşılamıyor; satırları kırmızı gösterilir</span></div>` : ''}${lejant()}
      <div class="ap-row ap-noprint" style="margin:6px 0"><button class="ap-btn sm" data-act="ist-siki" title="Satırları daraltır; kalabalık ekipte personelin hepsi tek ekranda görünür (sürücü payı ve görev durumu notu üzerine gelince)">${istSiki() ? '⇕ Satırları genişlet' : '⇕ Satırları daralt'}</button><button class="ap-btn sm" data-act="ist-kmp" title="Sınıf, izin türü, azami, yolluk ve açıklama sütunlarını gizler / gösterir">${S.istKmp ? 'Tüm sütunları göster' : 'Ek sütunları gizle'}</button><span class="ap-note">Tablo yana kaydırılabilir; ad soyad sütunu sabit kalır.</span></div>
      ${durumBar ? `<div class="ap-ist-ozet">${durumBar}</div>` : ''}
      ${tabloHtml()}`;
  }

  function gorevHtml() {
    const D = durumlar(), duz = !salt(), birimler = S.plan.birimler;
    const ists = birimler.filter(b => b.tur === 'istasyon' && !b.ekipOf).map(b => ({b, h: hesapla(b)}));
    const acik = ists.filter(x => x.h.ihtiyacTur === 'oner').sort((a, b) => b.h.acikEf - a.h.acikEf);
    const ic = ists.filter(x => x.h.ihtiyacTur === 'icerde' || x.h.ihtiyacTur === 'elle').sort((a, b) => b.h.hedefAcik - a.h.hedefAcik);
    const fazla = ists.filter(x => x.h.fazlaVar).sort((a, b) => b.h.fazlaEf - a.h.fazlaEf);
    const gk = S.plan.kayitlar.filter(k => k.gorev && (k.gorev.hedef || k.gorev.yer)).sort((a, b) => trCollator.compare(a.birim, b.birim) || trCollator.compare(a.ad, b.ad));
    const opts = k => `<option value="">— (görevlendirmeyi kaldır)</option>${!k.gorev.hedef && k.gorev.yer ? `<option value="__yer__" selected>Diğer yer: ${esc(k.gorev.yer.length > 40 ? k.gorev.yer.slice(0, 40) + '…' : k.gorev.yer)}</option>` : ''}${birimler.map(b => `<option ${b.ad === k.gorev.hedef ? 'selected' : ''}>${esc(b.ad)}</option>`).join('')}`;
    const rows = gk.map(k => {
      const eng = C.gorevlendirmeEngeli(k, ayIlk()), dy = k.dortB && k.memBas ? C.dortYilDurum(k.memBas, ayIlk()) : null;
      const araM = C.TR([k.ad, k.birim, k.gorev.hedef || '', k.gorev.yer || '', k.unvan].join(' ')), gq = C.TR(S.gAra || '').trim(), gor = (!gq || araM.includes(gq)) && (!S.gIst || k.birim === S.gIst || k.gorev.hedef === S.gIst);      // süzgeç yeniden çizimde korunur
      return `<tr data-ara="${esc(araM)}" data-kay="${esc(k.birim)}" data-hed="${esc(k.gorev.hedef || '')}" ${gor ? '' : 'style="display:none"'}><td>${esc(k.ad)}</td><td>${esc(k.unvan)}${k.dortB ? ' <span class="ap-tag ap-t-fz">4/B</span>' : ''}${dy && !dy.uygun ? `<div class="ap-note" style="color:var(--ap-bad)">4 yıl dolumu: ${dy.dolum.split('-').reverse().join('.')}</div>` : dy && dy.yakinda ? '<div class="ap-note">yakında uygun</div>' : ''}</td><td>${esc(k.birim)}</td>
      <td>${istTekHtml('f:' + k.id + ':gHedef', k.gorev.hedef || (k.gorev.yer ? '__yer__' : ''), birimler.map(b => b.ad), {kucuk: true, kapali: !duz, ek: [['', '— (görevlendirmeyi kaldır)'], ...(!k.gorev.hedef && k.gorev.yer ? [['__yer__', 'Diğer yer: ' + (k.gorev.yer.length > 40 ? k.gorev.yer.slice(0, 40) + '…' : k.gorev.yer)]] : [])]})}${k.gorev.hedef ? '' : `<div class="ap-note">${esc(k.gorev.yer || '')}</div>`}</td>
      <td style="min-width:170px">${gorevTarihSecim(k, duz)}</td>
      <td><select class="ap-sel" data-id="${k.id}" data-f="yolluk" ${duz ? '' : 'disabled'}>${YOLLUK_SEC.map(a => `<option ${a === (k.gorev.yolluk || '') ? 'selected' : ''}>${a}</option>`).join('')}</select></td>
      <td><select class="ap-sel" data-id="${k.id}" data-f="gGerekce" ${duz ? '' : 'disabled'}>${GEREKCE.map(a => `<option ${a === (k.gorev.gerekce || '') ? 'selected' : ''}>${a}</option>`).join('')}</select></td>
      <td>${eng ? `<span class="ap-tag ap-t-ih" title="${esc(eng)}">Engel</span>` : ''}</td></tr>`;
    }).join('');
    // basit eşleştirme önerisi
    // Eşleştirme: fazlası olan istasyondan açığı olana, en yakın ilçe çiftinden başlayarak (aynı ilçe 0 km); açık nöbet branşları yazılır
    const oner = []; let fz = fazla.map(x => ({ad: x.b.ad, k: x.h.fazlaEf})), ac = acik.map(x => ({ad: x.b.ad, k: x.h.hedefAcik, h: x.h}));
    const ciftler = []; ac.forEach(a => fz.forEach(f => ciftler.push({a, f, km: C.mesafeKm(C.ilceAdi(f.ad), C.ilceAdi(a.ad))})));
    ciftler.sort((x, y) => x.km - y.km || y.a.k - x.a.k);
    const brAd = {es: 'ekip şefi', ysp: 'YSP', sur: 'sürücü'}, acBr = h => { const r = h.slot && h.slot.hedef && h.slot.hedef.rem; return r ? Object.keys(brAd).filter(x => r[x] > 0.5).map(x => `${brAd[x]} ${fmt(r[x])}`).join(', ') : ''; };
    // Gelen kişi hedef istasyonda tüm mesaisini doldurabilmeli: öneri yalnız tam kişi (ayın tam hedefi, ör. 7,67 nöbet) katlarında; aynı istasyon kendine önerilmez
    const kisiN = C.ayMesai(S.y, S.m, false, ozel()) / 24;
    for (const {a, f, km} of ciftler) { if (a.ad === f.ad) continue; const kisi = Math.floor(Math.min(a.k, f.k) / kisiN + 1e-6), m = Math.round(kisi * kisiN * 100) / 100; if (kisi >= 1) { const br = acBr(a.h); oner.push(`${f.ad} → ${a.ad}: ${kisi} kişi (≈ ${fmt(m)} nöbet) · ${km >= 9999 ? 'mesafe bilinmiyor' : km === 0 ? 'aynı ilçe' : '~' + km + ' km'}${br ? ' · açık: ' + br : ''}`); a.k -= m; f.k -= m; } }
    // Dağıtım sonucu: önerilen rotasyon tüm istasyonlara uygulanınca hâlâ personel bekleyen istasyonlar. Fazla nöbetle kapanan istasyonlara personel gönderilmez; kalan açık fazla nöbetle kapanır.
    const rotOner = rotasyonOneriler(), gidenSay = {}; rotOner.forEach(o => { if (o.hedef) gidenSay[o.hedef] = (gidenSay[o.hedef] || 0) + 1; });
    const karsilanamayan = acik.filter(x => x.h.ihtiyacTur === 'oner' && x.h.ihtiyacKisi > (gidenSay[x.b.ad] || 0)), fazlaIleDolan = [...ic].filter(x => x.h.ihtiyacTur === 'icerde');
    const dagitimOzet = `<div class="ap-ek ap-ek-c" style="margin:8px 0"><b>Dağıtım sonucu:</b> ${rotOner.filter(o => o.hedef).length} kişi gerçekten ihtiyacı olan istasyonlara yönlendirildi. ${karsilanamayan.length ? `<b>${karsilanamayan.length} istasyonun ihtiyacı karşılanamadı</b> (${karsilanamayan.slice(0, 8).map(x => `${esc(x.b.ad)} −${x.h.ihtiyacKisi - (gidenSay[x.b.ad] || 0)} kişi`).join(', ')}${karsilanamayan.length > 8 ? ' …' : ''}); kalan açık o istasyonlarda fazla nöbetle kapanır.` : 'Personel bekleyen istasyon kalmadı.'} ${fazlaIleDolan.length ? `Fazla nöbetle kapanan ${fazlaIleDolan.length} istasyona (açığı bir kişiye yetmiyor) personel gönderilmez.` : ''}</div>`;
    const degerlendirme = `<div class="ap-card"><h2>Personel ihtiyacı değerlendirmesi — ${ayEtiket()}</h2>
      ${dagitimOzet}
      <p class="ap-note">${S.ayar.panoMod === 'mesai' ? 'Mod: <b>Mesai karşılığı</b>. Ölçüt: kişiler yalnız hedef nöbetlerini tutarsa istasyon açık kalıyorsa ve bu açık, gelen bir kişinin mesaisini orada tamamlamasına yetiyorsa personel önerilir.' : `Mod: <b>Fazla mesaili</b> (DOKTOR-AABT-ATT en çok ${fmt(S.ayar.azamiMemur)} nöbet). Ölçüt: fazla nöbet yazıldıktan sonra da istasyon açık kalıyorsa ve bu açık, gelen bir kişinin mesaisini tamamlamasına yetiyorsa personel önerilir; fazla nöbetle kapanıyorsa önerilmez.`} İsterseniz aşağıdaki "Görevlendirmeler" bölümünden elle görevlendirme yapabilirsiniz.</p>
      <div class="ap-tw"><table class="ap-t ap-ferah"><thead><tr><th>İSTASYON</th><th>MESAİ KARŞILIĞI AÇIK</th>${S.ayar.panoMod === 'mesai' ? '' : '<th>FAZLA NÖBETLE AÇIK</th>'}<th>KAÇ KİŞİ GEREKİR</th><th>DEĞERLENDİRME</th></tr></thead><tbody>
      ${(() => { const onerAll = S.onerAc ? rotasyonOneriler() : []; return [...acik, ...ic].map(x => `<tr><td><b>${esc(x.b.ad)}</b></td><td class="num">${fmt(x.h.hedefAcik)}</td>${S.ayar.panoMod === 'mesai' ? '' : `<td class="num">${fmt(Math.max(0, x.h.acikEf))}</td>`}<td class="num">${x.h.ihtiyacKisi}</td>
      <td>${x.h.ihtiyacTur === 'oner' ? `<button class="ap-tag ap-t-ih ap-tagbtn" data-act="oner-ac" data-v="${esc(x.b.ad)}" title="Önerilen personeli göster">Personel öner: ${x.h.ihtiyacKisi} kişi ${S.onerAc === x.b.ad ? '▲' : '▼'}</button>${x.h.kalanAcik > 0 ? ` <span class="ap-note" style="margin-left:14px">+ ${fmt(x.h.kalanAcik)} nöbet fazla nöbetle</span>` : ''}` : x.h.ihtiyacTur === 'icerde' ? '<span class="ap-tag ap-t-fz">Fazla nöbetle kapanır — personel önerilmez</span>' : `<span class="ap-tag" style="background:#ffedd5;color:#9a3412">${S.ayar.panoMod === 'mesai' ? 'Açık kalıyor (bir kişiyi doldurmaz)' : 'Elle karar'}</span>`}</td></tr>${S.onerAc === x.b.ad ? (() => { const l = onerAll.filter(o => o.hedef === x.b.ad); return `<tr class="ap-onerac"><td colspan="${S.ayar.panoMod === 'mesai' ? 4 : 5}">${l.length ? `<b>${esc(x.b.ad)} için önerilen personel (${l.length} / ${x.h.ihtiyacKisi}):</b>${l.map(o => `<div>• ${esc(o.ad)} <span class="ap-note">— ${esc(o.kaynak)}${o.rol ? ' · ' + esc(o.rol) : ''}${o.km === null ? ' · KKM' : o.ayniIlce ? ' · aynı ilçe' : o.km < 9999 ? ' · ' + o.km + ' km' : ''}</span></div>`).join('')}<div class="ap-note">Görevlendirmek için "Aylık rotasyon › Önerilen çıkışlar" sekmesini kullanın.</div>` : `<span class="ap-note">Rotasyon önerisi bu istasyon için henüz kişi seçmedi (kaynak istasyonlarda uygun kişi yok olabilir). "Aylık rotasyon" sekmesinden elle seçebilirsiniz.</span>`}</td></tr>`; })() : ''}`).join('') || `<tr><td colspan="${S.ayar.panoMod === 'mesai' ? 4 : 5}" class="ap-empty">Açık veren istasyon yok</td></tr>`; })()}</tbody></table></div></div>`;
    const sekme = S.gorevSekme || 'deg';
    const istAd = new Set(birimler.filter(b => b.tur === 'istasyon').map(b => b.ad));
    const disK = S.plan.kayitlar.filter(k => !gizliKisi(k) && ((D[k.durum] || {}).disarida || (k.gorev && (k.gorev.hedef || k.gorev.yer))) && !(k.gorev && k.gorev.hedef && istAd.has(k.gorev.hedef))).sort((a, b) => trCollator.compare(a.birim, b.birim) || trCollator.compare(a.ad, b.ad));
    const dq = C.TR(S.disAra || '').trim(), dist = S.disIst || '';
    const disSat = disK.map(k => { const g = k.gorev || {}, bk = birimler.find(x => x.ad === k.birim) || {ad: k.birim}, dt = D[k.durum] || {}, ara = C.TR([k.ad, k.birim, g.hedef || '', g.yer || '', k.durumMetin || ''].join(' ')), gor = (!dq || ara.includes(dq)) && (!dist || k.birim === dist); return `<tr data-ara="${esc(ara)}" data-kay="${esc(k.birim)}" style="${gor ? '' : 'display:none'}"><td>${esc(k.ad)}</td><td>${esc(k.unvan)}</td><td>${esc(k.birim)}</td><td>${esc(k.durum || '')}</td><td>${gorevHucre(k, birimler, bk, {disarida: true}, duz ? '' : 'disabled')}</td></tr>`; }).join('');
    const dis = `<div class="ap-card"><div class="ap-row"><h2 style="margin:0">İstasyon dışı görevliler (${disK.length})</h2>
      <input class="ap-in" id="ap-d-kisi" data-liste-ara placeholder="Kişi / yer ara (listeyi süzer)…" value="${esc(S.disAra || '')}" autocomplete="off">
      <label class="ap-note" title="Yalnız seçilen kadro istasyonunun personeli listelenir">Kadro istasyonu süz ${istTekHtml('dist', dist, [...new Set(disK.map(k => k.birim))].sort(trCollator.compare), {bos: 'Tümü', kucuk: true})}</label></div><p class="ap-note">Geçici görevde olup başka bir <b>istasyona</b> atanmamış personel (Başhekimlik, KKM, ilçe sağlık müdürlüğü, hastane vb. ya da yeri henüz seçilmemiş). Bu kişilere kendi istasyonlarında nöbet yazılmaz. Yeri "Görev yeri" sütunundan seçebilir ya da yazabilirsiniz.</p>
      <div class="ap-tw"><table class="ap-t"><thead><tr><th>Ad soyad</th><th>Ünvan</th><th>Kadro istasyonu</th><th>Durum</th><th style="min-width:230px">Görev yeri / tarih</th></tr></thead><tbody>${disSat || '<tr><td colspan="5" class="ap-empty">İstasyon dışında görevli personel yok</td></tr>'}</tbody></table></div></div>`;
    const sekmeler = [['deg', 'Personel ihtiyacı değerlendirmesi'], ['rot', 'Aylık rotasyon'], ['list', `Görevlendirmeler (${gk.length})`], ['dis', `İstasyon dışı görevliler (${disK.length})`], ['tekay', `Tek ay görevleri (${tekAyGorevler().length})`], ['ozet', 'Açık / fazla istasyonlar']];
    const nav = `<div class="ap-subnav ap-noprint" data-ust>${sekmeler.map(([v, t]) => `<button class="${sekme === v ? 'on' : ''}" data-act="gorev-sekme" data-v="${v}">${t}</button>`).join('')}<button class="ap-btn" style="margin-left:auto" data-act="gorev-excel" title="Personel ihtiyacı, rotasyon, görevlendirmeler ve açık/fazla istasyonlar tek Excel dosyasında">İndir ▾</button></div>`;
    const oSek = [['oner', `Personel önerilen istasyonlar (${acik.length})`], ['fazla', `Mesai tamamlayamayan istasyonlar (${fazla.length})`], ...(oner.length ? [['esles', 'Eşleştirme önerisi']] : [])], oa = oSek.some(x => x[0] === S.ozetSekme) ? S.ozetSekme : 'oner';
    const oKart = {oner: `<div class="ap-card"><h2>Personel önerilen istasyonlar (${acik.length})</h2>${acik.map(x => `<div class="ap-row"><b>${esc(x.b.ad)}</b><span class="ap-tag ap-t-ih">${x.h.ihtiyacKisi} kişi · ${fmt(x.h.hedefAcik)} nöbet açık</span></div>`).join('') || '<span class="ap-note">Yok</span>'}</div>`,
      fazla: `<div class="ap-card"><h2>Mesai tamamlayamayan istasyonlar (${fazla.length})</h2>${fazla.map(x => `<div class="ap-row"><b>${esc(x.b.ad)}</b><span class="ap-tag ap-t-fz">${fmt(x.h.fazlaH)} nöbet fazla</span></div>`).join('') || '<span class="ap-note">Yok</span>'}</div>`,
      esles: `<div class="ap-card"><h2>Eşleştirme önerisi</h2>${oner.map(t => `<div>${esc(t)}</div>`).join('')}<div class="ap-note">Öneri yalnız tam kişi önerir: gelen kişi hedef istasyonda bütün mesaisini doldurabilmeli (bir kişilik açık yoksa personel önerilmez). Yakınlık ilçe merkezleri arası yaklaşık km; branş uyumu kişi seçerken denetlenir. Kişi seçerken 4/B kuralı (4 yıl dolmadan başka istasyona görevlendirme yasak) otomatik denetlenir.</div></div>`};
    const ozet = `<div class="ap-subnav ap-noprint" data-ust>${oSek.map(([v, t]) => `<button class="${oa === v ? 'on' : ''}" data-act="ozet-sekme" data-v="${v}">${t}</button>`).join('')}</div>${oKart[oa]}`;
    const liste = `<div class="ap-card"><div class="ap-row" data-ust><h2 style="margin:0">Görevlendirmeler (${gk.length})</h2>
      <input class="ap-in" type="search" id="ap-g-kisi" data-liste-ara value="${esc(S.gAra || '')}" placeholder="Listede ara (ad, kaynak, hedef)…" title="Yazdıkça aşağıdaki görevlendirme listesi süzülür">
      <label class="ap-note" title="Seçilen istasyondan görevli çıkanlar ve o istasyona gelenler listelenir">İstasyon süz ${istTekHtml('gist', S.gIst || '', birimler.map(b => b.ad), {bos: 'Tümü', kucuk: true})}</label>
      <span class="ap-note">Yeni görevlendirme:</span><select class="ap-sel" id="ap-g-sec" title="Görevlendirilecek kişi (arayarak seçin)"><option value="">— kişi seçin —</option>${S.plan.kayitlar.filter(k => !gizliKisi(k) && (!k.gorev || !(k.gorev.hedef || k.gorev.yer))).sort((a, b) => trCollator.compare(a.ad, b.ad)).map(k => `<option value="${esc(k.id)}" ${S.gSecId === k.id ? 'selected' : ''}>${esc(k.ad)} · ${esc(k.birim || '')}</option>`).join('')}</select><span class="ap-note">→</span>${(() => { const h = birimler.some(b => b.ad === S.gYeniHedef) ? S.gYeniHedef : (birimler[0] || {}).ad || ''; return `<input type="hidden" id="ap-g-hedef" value="${esc(h)}">${istTekHtml('gyh', h, birimler.map(b => b.ad), {kucuk: true})}`; })()}
      <button class="ap-btn pri" data-act="g-ekle" ${duz ? '' : 'disabled'}>Görevlendir</button>
      
      <button class="ap-btn" data-act="g-tarihsiz-bitir" ${duz ? '' : 'disabled'} title="TARİH sütunu boş (önceki aylardan kalan) görevlendirmeleri bitirir; istasyon süzgeci seçiliyse yalnız o istasyonunkileri. Yalnız başka ASHİ istasyonuna görevler; aile hekimliği, KKM, Başhekimlik, hastane ve kurum dışı görevler, uzun süreli (OF) ve devam isteği olanlar hariç.">Tarihi boş görevleri bitir (${gk.filter(k => tarihsizGorev(k)).length})</button></div>
      <div class="ap-tw"><table class="ap-t"><thead><tr><th>AD SOYAD</th><th>ÜNVAN</th><th>KAYNAK</th><th>HEDEF</th><th>TARİH</th><th>YOLLUK</th><th>GEREKÇE</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="8" class="ap-empty">Görevlendirme yok</td></tr>'}</tbody></table></div>${S.gtAc ? gorevTarihPop() : ''}</div>`;
    const tekay = sekme === 'tekay' ? (() => { const L = tekAyGorevler(), ilk = ayIlk(), son = sonrakiAyIlk(), n = t => L.filter(k => yollukTur(k) === t).length;
      const sat = L.map((k, i) => { const t = gorevTarihleri(k.gorev), y = yollukTur(k); return `<tr><td class="num">${i + 1}</td><td>${esc(k.ad)}</td><td>${esc(k.unvan || '')}</td><td>${esc(k.birim || '')}</td><td>${esc(k.gorev.hedef || k.gorev.yer || '')}</td><td>${trTarih(t.bas || ilk)}</td><td>${trTarih(t.bit || son)}</td><td>${y === 'Y' ? 'Yolluklu' : y === 'N' ? 'Yolluksuz' : y === 'S' ? 'Sürekli görevlendirme' : '<span class="ap-tag" style="background:#ffedd5;color:#9a3412">Seçilmemiş</span>'}</td><td>${esc(k.gorev.gerekce || '')}</td></tr>`; }).join('');
      return `<div class="ap-card"><div class="ap-row"><h2 style="margin:0">Tek ay görevleri — ${esc(ayEtiket())} (${L.length})</h2><span class="ap-tag">Yolluklu ${n('Y')}</span><span class="ap-tag">Yolluksuz ${n('N')}</span>${n('S') ? `<span class="ap-tag">Sürekli görevlendirme ${n('S')}</span>` : ''}${n('') ? `<span class="ap-tag" style="background:#ffedd5;color:#9a3412">Yolluğu seçilmemiş ${n('')}</span>` : ''}<button class="ap-btn" style="margin-left:auto" data-act="gorev-tekay-excel" title="İlk sayfada tablonun tamamı; Yolluklu ve Yolluksuz ayrıca ayrı sayfalarda">📄 İndir ▾</button></div>
        <p class="ap-note">Yalnız bu ay başlayıp bu ay biten (1 aylık) görevlendirmeler; uzun süreli (3 ay+) görevler girmez. Sütun başlığına tıklayarak sıralayabilir ve süzebilirsiniz (ör. YOLLUK › yalnız Yolluklu). Yolluk ve gerekçe "Görevlendirmeler" sekmesinden değiştirilir.</p>
        <div class="ap-tw"><table class="ap-t"><thead><tr><th>Sıra</th><th>Ad soyad</th><th>Ünvan</th><th>Kadro istasyonu</th><th>Görev yeri</th><th>Başlangıç</th><th>Bitiş</th><th>Yolluk</th><th>Gerekçe</th></tr></thead><tbody>${sat || '<tr><td colspan="9" class="ap-empty">Bu ay için 1 aylık görevlendirme yok</td></tr>'}</tbody></table></div></div>`; })() : '';
    return nav + ({deg: degerlendirme, rot: sekme === 'rot' ? rotasyonHtml() : '', ozet, list: liste, dis, tekay}[sekme] || degerlendirme);
  }
  // İstatistik sayfasındaki satırların listesi (istatistikle aynı kapsam: pasif ve aile hekimliğindekiler hariç)
  function ozelUyar(k, o) {
    const D = durumlar(); if ((D[k.durum] || {}).pasif || aileHek(k)) return false;
    if (o === 'tum') return true;
    if (o === 'dortB') return !!k.dortB;
    if (o === 'izinli') return izinGun(k) > 0;
    if (o.startsWith('izinTur:')) { const t = o.slice(8); return (k.izin || []).some(i => sayi(i.gun) > 0 && (i.tur || 'Belirtilmemiş') === t); }
    const g = k.gorev && (k.gorev.hedef || k.gorev.yer);
    if (o === 'gorev') return !!g;
    if (o.startsWith('yolluk:')) return !!g && (k.gorev.yolluk || 'Belirtilmemiş') === o.slice(7);
    if (o.startsWith('sinif:')) return k.sinif === o.slice(6);
    if (o.startsWith('durum:')) return k.durum === o.slice(6);
    return true;
  }
  function personelHtml() {
    const D = durumlar(), f = S.filtre, q = C.TR(f.q);
    let liste = S.plan.kayitlar.filter(k => (!f.durum || k.durum === f.durum || (f.durum === '_izin' && izinGun(k) > 0)) && (!f.birim || k.birim === f.birim) && (!f.sinif || k.sinif === f.sinif) && (!f.ozel || ozelUyar(k, f.ozel)) && (!f.surucu || (k.sinif === 'memur' && C.kadroTip(k) === 'ATT' && C.surucuDurumu(k, {degil: S.ayar.surDegilEsik / 100}).tip === f.surucu)) && (!q || C.TR(k.ad + ' ' + (k.tc || '')).includes(q)) && (planlamaRol() || !gizliKisi(k)));
    liste = [...liste.filter(k => !gizliKisi(k)), ...liste.filter(gizliKisi)];
    const boyut = S.pBoyut === 0 ? Math.max(1, liste.length) : (S.pBoyut || 50), sayfaSay = Math.max(1, Math.ceil(liste.length / boyut)); if (S.pSayfa >= sayfaSay) S.pSayfa = sayfaSay - 1; if (S.pSayfa < 0) S.pSayfa = 0;
    const bas = S.pSayfa * boyut, gos = liste.slice(bas, bas + boyut);
    const rows = gos.map(k => {
      const dy = k.dortB && k.memBas ? C.dortYilDurum(k.memBas, ayIlk()) : null;
      return `<tr><td style="white-space:nowrap">${esc(k.ad)}${k.asosYok ? ' <span class="ap-tag ap-t-fz" title="ASOS listelerinde bulunamadı">ASOS\'ta yok</span>' : ''}</td><td>${esc(k.tc || '')}</td><td>${esc(k.unvan)}${k.dortB ? ' <span class="ap-tag ap-t-fz">4/B</span>' : ''}</td><td>${SINIF_AD[k.sinif] || ''}</td><td>${esc(k.birim)}</td><td>${C.GRUP_AD[C.grupBelirle(k, {degil: S.ayar.surDegilEsik / 100}, S.ayar)]}${k.rolManuel ? ' (elle)' : ''}</td><td>${(() => { if (k.sinif !== 'memur' || C.kadroTip(k) !== 'ATT') return ''; const sd = C.surucuDurumu(k, {degil: S.ayar.surDegilEsik / 100}); return sd.tip === 'surucu' ? `Sürücü${sd.kaynak === 'kayit' ? ' (%' + Math.round(100 * sd.pay) + ')' : ' (elle)'}` : sd.tip === 'degil' ? 'Sürücü değil' : '<span class="ap-tag ap-t-fz">Doğrulanmadı</span>'; })()}</td><td>${esc(durumGosterim(k))}</td>
      <td>${k.memBas ? k.memBas.split('-').reverse().join('.') : ''}${k.dortB && !k.memBas ? '<span class="ap-tag ap-t-ih">tarih yok</span>' : ''}</td><td>${dy ? (dy.uygun ? 'Uygun' : esc(dy.dolum.split('-').reverse().join('.'))) : ''}</td><td class="num">${k.yillikKalan != null ? fmt(k.yillikKalan) : ''}</td></tr>`;
    }).join('');
    const pager = () => { const dugme = (v, t, on, dis) => `<button class="ap-btn sm ${on ? 'on' : ''}" data-act="p-git" data-v="${v}" ${dis ? 'disabled' : ''}>${t}</button>`;
      const p = S.pSayfa, bas0 = Math.max(0, Math.min(p - 3, sayfaSay - 7)), nums = []; for (let i = bas0; i < Math.min(sayfaSay, bas0 + 7); i++) nums.push(dugme(i, i + 1, i === p));
      return `<div class="ap-pager ap-noprint">${sayfaSay > 1 ? dugme(0, '«', false, p === 0) + dugme(p - 1, '‹ Önceki', false, p === 0) + nums.join('') + dugme(p + 1, 'Sonraki ›', false, p >= sayfaSay - 1) + dugme(sayfaSay - 1, '»', false, p >= sayfaSay - 1) : ''}
        <span class="ap-note">${liste.length ? bas + 1 : 0}–${Math.min(liste.length, bas + boyut)} / ${liste.length} · Sayfa ${p + 1}/${sayfaSay}</span>
        <select class="ap-sel" data-act="p-boyut"><option value="0" ${S.pBoyut === 0 ? 'selected' : ''}>Tümü (tek sayfa)</option>${[25, 50, 100, 200].map(n => `<option value="${n}" ${S.pBoyut !== 0 && n === boyut ? 'selected' : ''}>${n} / sayfa</option>`).join('')}</select></div>`; };
    return `<div class="ap-row ap-noprint" data-ust><button class="ap-btn pri" data-act="plan-asos" ${salt() ? 'disabled' : ''} title="Personel Listesi Raporu ve EKİP listesini birlikte seçebilirsiniz">Personel listelerini yükle</button>
      <input class="ap-in" data-act="f-q" data-liste-ara placeholder="Ad veya TC ara" value="${esc(f.q)}">
      ${istTekHtml('fbirim', f.birim || '', S.plan.birimler.map(b => b.ad), {bos: 'Tüm birimler', kucuk: true})}
      <select class="ap-sel" data-act="f-sinif"><option value="">Tüm sınıflar</option>${Object.entries(SINIF_AD).map(([a, t]) => `<option value="${a}" ${a === f.sinif ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select class="ap-sel" data-act="f-surucu" title="ATT sürücülüğü"><option value="">ATT sürücülüğü: tümü</option><option value="dogrulanmadi" ${f.surucu === 'dogrulanmadi' ? 'selected' : ''}>Doğrulanmadı</option><option value="surucu" ${f.surucu === 'surucu' ? 'selected' : ''}>Sürücü</option><option value="degil" ${f.surucu === 'degil' ? 'selected' : ''}>Sürücü değil</option></select>
      <select class="ap-sel" data-act="f-durum"><option value="">Tüm durumlar</option><option value="_izin" ${f.durum === '_izin' ? 'selected' : ''}>İzinli</option>${Object.keys(D).map(a => `<option ${a === f.durum ? 'selected' : ''}>${a}</option>`).join('')}</select>
      ${f.ozel ? `<span class="ap-chip sec">${esc(f.ozelAd || 'İstatistik süzgeci')} <a href="#" data-act="f-ozel-sil" title="Süzgeci kaldır">✕</a></span>` : ''}<span class="ap-note">${liste.length} kayıt${S.plan.disKurum && S.plan.disKurum.length ? ` · Dış kurum: ${S.plan.disKurum.length}` : ''}</span></div>
      ${pager()}<div class="ap-tw"><table class="ap-t"><thead><tr><th>AD SOYAD</th><th>TC</th><th>ÜNVAN</th><th>SINIF</th><th>BİRİM</th><th>NÖBET ROLÜ</th><th>SÜRÜCÜLÜK</th><th>DURUM</th><th>GÖREV BAŞLANGICI</th><th>4/B 4 YIL DOLUMU</th><th>YILLIK İZİN KALAN</th></tr></thead><tbody>${rows || '<tr><td colspan="11" class="ap-empty">Kayıt yok</td></tr>'}</tbody></table></div>${sayfaSay > 1 ? pager() : ''}`;
  }

  function ozelHtml() {
    const o = ozel(), ortak = !!opts.ozelGun, duz = ortak ? !!S.ozelYaz : !salt(), tur = S.ogTur || 'bayram';
    const liste = Object.entries(o).sort();
    const tatil = []; for (let d = 1; d <= C.gunSayisi(S.y, S.m); d++) { const i = C.iso(S.y, S.m, d), w = C.RESMI[i]; if (w !== undefined) tatil.push(`${i.split('-').reverse().join('.')} ${w === 'A' ? '(arife, 5 saat)' : '(resmî tatil)'}`); }
    return `<div class="ap-two"><div class="ap-card"><h2>Özel gün ekle</h2><div class="ap-row">${tarihDugme('og', 'tek', {min: C.iso(S.y, S.m, 1), max: C.iso(S.y, S.m, C.gunSayisi(S.y, S.m)), idler: ['ap-og-t']})}
      <span class="ap-seg">${Object.entries(C.OZEL_TUR).map(([k, v]) => `<button class="ap-btn${k === tur ? ' on' : ''}" data-act="og-tur" data-v="${k}">${v}</button>`).join('')}</span><button class="ap-btn pri" data-act="og-ekle" ${duz ? '' : 'disabled'}>Ekle</button></div>
      ${ortak ? `<p class="ap-note"><b>Ortak liste:</b> buradaki özel günler İK (ASHİ nöbet) modülüyle aynıdır; birinde eklenen ötekinde de görünür.${duz ? '' : ' Ekleme / silme için Planlama ya da İK yükleme yetkisi gerekir.'}</p>` : ''}
      <p class="ap-note">Bayram, resmî tatil ve idari izin günü tüm personelin mesaisinden tam gün düşer (hafta içiyse). Yarım gün 5 saattir. Kişiye özel idari izin için ilgili kişinin izin türünü <b>İDARİ İZİN</b> seçip gün sayısını girin.</p>
      <h2>Eklenenler</h2>${liste.map(([t, v]) => `<div class="ap-row"><b>${t.split('-').reverse().join('.')}</b> ${C.OZEL_TUR[v.tur]}${v.ekleyen ? ` <span class="ap-note">· ${esc(v.ekleyen)}</span>` : ''} <button class="ap-btn sm dng" data-act="og-sil" data-v="${t}" ${duz ? '' : 'disabled'}>Sil</button></div>`).join('') || '<span class="ap-note">Yok</span>'}</div>
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
    const sat = (t, v, f) => `<tr><td>${t}</td><td class="num"><b>${v === undefined ? 0 : fmt(v)}</b></td>${f ? `<td><a href="#" data-act="liste" data-v="ozel:${esc(f)}" data-ad="${esc(String(t).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim())}">Listele</a></td>` : '<td></td>'}</tr>`;
    const durumAc = {'GEÇİCİ GÖREVDE': 'GEÇİCİ GÖREVDE <span class="ap-note">(kadromuzdan, başka yerde çalışan)</span>', 'GEÇİCİ GÖREVLİ': 'GEÇİCİ GÖREVLİ <span class="ap-note">(kadrosu başka yerde, bize gelen)</span>'};
    const durumSat = Object.keys(durumlar()).filter(k => say['durum:' + k]).map(k => sat(durumAc[k] || k, say['durum:' + k], 'durum:' + k)).join('');
    const izinSat = Object.keys(say).filter(k => k.startsWith('izinTur:')).map(k => sat(k.slice(8), say[k], k)).join('');
    let ih = 0, pl = 0; ists.forEach(b => { const h = hesapla(b); ih += h.ihtiyac; pl += planlananToplam(h); });
    return `<div class="ap-two"><div class="ap-card"><h2>Personel</h2><table class="ap-t"><tbody>${sat('Toplam aktif kayıt', say.toplam, 'tum')}${sat('Doktor', say['sinif:doktor'], 'sinif:doktor')}${sat('Memur', say['sinif:memur'], 'sinif:memur')}${sat('İşçi', say['sinif:isci'], 'sinif:isci')}${sat('4/B personel', say.dortB, 'dortB')}${sat('İzinli personel', say.izinli, 'izinli')}${sat('Toplam izin günü', say.izinGun, 'izinli')}${izinSat}</tbody></table></div>
      <div class="ap-card"><h2>Durum ve görevlendirme</h2><table class="ap-t"><tbody>${durumSat}${sat('Görev yeri girilmiş görevlendirme <span class="ap-note">(Geçici görev sütunu dolu)</span>', say.gorev, 'gorev')}${sat('&nbsp;&nbsp;Yolluklu', say['yolluk:YOLLUKLU'], 'yolluk:YOLLUKLU')}${sat('&nbsp;&nbsp;Yolluksuz', say['yolluk:YOLLUKSUZ'], 'yolluk:YOLLUKSUZ')}${sat('&nbsp;&nbsp;Yolluk durumu belirtilmemiş', say['yolluk:Belirtilmemiş'], 'yolluk:Belirtilmemiş')}</tbody></table></div></div>
      <div class="ap-card"><h2>Plan özeti</h2><div>İstasyon ihtiyacı toplamı: <b>${ih}</b> · Planlanan: <b>${fmt(pl)}</b> · Fark: <b>${fmt(pl - ih)}</b></div></div>`;
  }


  function ayarHtml() {
    const D = durumlar(), yon = S.rol === 'yonetici';
    const tum = `<div class="ap-card"><h2>Durum tablosu</h2><p class="ap-note">Her durumun nöbet ve mesai etkisini ayarlayın. "Nöbet yok": kişi nöbet tutmaz (hedef 0). "Mesai yok": o ay mesai yükümlülüğü yoktur (izinli). Değişiklik yalnızca Yönetici içindir.</p>
      <div class="ap-tw"><table class="ap-t"><thead><tr><th>Durum</th><th>Renk</th><th>Nöbet yok</th><th>Mesai yok</th></tr></thead><tbody>${Object.entries(D).map(([k, v]) => `<tr><td>${k}</td><td><input type="color" data-d="${esc(k)}" data-f="renk" value="${v.renk || '#ffffff'}" ${yon ? '' : 'disabled'}></td><td><input type="checkbox" data-d="${esc(k)}" data-f="nobetYok" ${v.nobetYok ? 'checked' : ''} ${yon ? '' : 'disabled'}></td><td><input type="checkbox" data-d="${esc(k)}" data-f="mesaiYok" ${v.mesaiYok ? 'checked' : ''} ${yon ? '' : 'disabled'}></td></tr>`).join('')}</tbody></table></div></div>
      <div class="ap-card"><h2>Hesap ayarları</h2><div class="ap-row"><label>AABT / ATT'nin sürücü sayılması için nöbetlerinin sürücü payı bu değerden büyük olmalı (%; 0 = sürücü olarak bir kez nöbet tutan sürücü sayılır): <input class="ap-in n" type="number" min="0" max="100" data-ay="surDegilEsik" value="${S.ayar.surDegilEsik}" ${yon ? '' : 'disabled'}></label> <span class="ap-note">Nöbet kaydı olmayan sürücü sayılmaz. Sürücü nöbeti önce sürücü payı en yüksek olana yazılır; yetmezse payı düşük olanlara geçilir.</span></div>
      <div class="ap-row"><label>DOKTOR-AABT-ATT genel azami nöbet (24 sa.; istasyon sayfasından istasyon bazında değiştirilebilir) <input class="ap-in n" type="number" step="0.5" data-ay="azamiMemur" value="${S.ayar.azamiMemur}" ${yon ? '' : 'disabled'}></label>
      <label>İşçi nöbetinde sistemden düşülen saat <input class="ap-in n" type="number" step="0.5" data-ay="isciDusulen" value="${S.ayar.isciDusulen}" ${yon ? '' : 'disabled'}></label></div>
      <div class="ap-row"><label title="Kapalıyken memur/doktor hedefi tam oranla hesaplanır (160 saat = 6,67 nöbet). Açıkken hedef 0,5 adıma yukarı yuvarlanır (160 saat = 7)."><input type="checkbox" data-act="hedef-yuv" ${S.ayar.hedefYuvarla ? 'checked' : ''} ${yon ? '' : 'disabled'}> Memur/doktor hedefini 0,5 adıma yuvarla (eski yöntem)</label></div>
      <div class="ap-row"><label><input type="checkbox" data-act="oto-geri" ${S.ayar.otoGeriCek !== false ? 'checked' : ''} ${yon ? '' : 'disabled'}> Açığı olan istasyonların başka istasyona görevli personelini listeler yüklenince / önceki aydan kopyalanınca otomatik geri çağır (ASHİ dışındaki görevler — KKM, Başhekimlik, hastane vb. — geri çağrılmaz)</label></div>
      <div class="ap-row"><label><input type="checkbox" data-act="uzun-geri" ${S.ayar.uzunGeriCek ? 'checked' : ''} ${yon ? '' : 'disabled'}> Uzun süreli (3 ay ve üzeri) görevlendirmeler de otomatik geri çağrılsın</label></div>
      <div class="ap-row"><label><input type="checkbox" data-act="oto-oner" ${S.ayar.otoOner !== false ? 'checked' : ''} ${yon ? '' : 'disabled'}> Planlanan nöbeti her değişiklikte otomatik hesapla (kilitli değerler korunur)</label></div>
      <p class="ap-note">Yuvarlama: DOKTOR-AABT-ATT hedefi yukarı 0,5 adıma, işçi hedefi aşağı tam 12 saatlik nöbete yuvarlanır.</p></div>
      <div class="ap-card"><h2>Yedek ve sıfırlama</h2><div class="ap-row"><button class="ap-btn dng" data-act="tum-sifirla" ${S.rol === 'yonetici' ? '' : 'disabled'} title="Tüm aylık planlar, arşiv ve gerçekleşen nöbet verisini siler (ayarlar korunur)">Tüm planları ve arşivi sıfırla</button><button class="ap-btn" data-act="yedek-al">JSON yedeği al (bu ay)</button><button class="ap-btn" data-act="yedek-yukle" ${salt() ? 'disabled' : ''}>JSON yedeği yükle</button></div>
      <p class="ap-note">${opts.gomulu ? 'Planlar, arşiv ve ayarlar kurum sunucusunda (HUSER Yönetim Sistemi) tutulur ve sunucu yedeğine girer. JSON yedeği ek bir kopyadır; dosyada kişisel veri bulunur, güvenli yerde saklayın.' : 'Yedek dosyasında kişisel veri bulunur; güvenli yerde saklayın. Şifreli ortak Drive arşivi sonraki sürümde eklenecek.'}</p></div>`;
    const p = tum.split(/(?=<div class="ap-card"><h2>)/), sek = [['durum', 'Durum tablosu'], ['hesap', 'Hesap ayarları'], ['yedek', 'Yedek']], a = sek.some(x => x[0] === S.ayarSekme) ? S.ayarSekme : 'durum';
    return `<div class="ap-subnav ap-noprint" data-ust>${sek.map(([v, t]) => `<button class="${a === v ? 'on' : ''}" data-act="ayar-sekme" data-v="${v}">${t}</button>`).join('')}</div>` + p[sek.findIndex(x => x[0] === a)];
  }

  // Sayfa başlığı ve "Son kayıt" satırı (o sayfada yapılan son değişiklik; istasyon sayfasında o istasyonun). Gömülü modda başlık da yazılır (sol menüde sekme çubuğu yoktur).
  const DAMGA_SAYFA = ['pano', 'ist', 'gorev', 'talep', 'personel', 'ozel', 'ayar'];
  function sayfaBasHtml() {
    if (S.modul === 2 || !S.plan) return '';
    if (S.tamEkran && S.sayfa === 'ist') return '';
    const k = S.sayfa, D = S.plan.damga || {};
    let d = DAMGA_SAYFA.includes(k) ? D[k === 'ist' ? 'ist:' + S.ist : 'sayfa:' + k] : null;
    if (k === 'ayar' && S.ayar.damga && (!d || S.ayar.damga.t > d.t)) d = S.ayar.damga;
    const baslik = k === 'ist' ? esc(S.ist || 'İstasyon') : esc((SAYFALAR.find(x => x[0] === k) || [, ''])[1]);
    // Pano: "Bu ayın planını sıfırla" sağ üstte (profil kartının altı), sık kullanılan düğmelerden ayrı
    const sag = k === 'pano' ? `<button class="ap-btn dng sm ap-sbas-sag ap-noprint" data-act="plan-sifirla" ${salt() || !planlamaRol() ? 'disabled' : ''} title="Bu ayın planını tamamen siler (arşiv etkilenmez)">Bu ayın planını sıfırla</button>` : '';
    const kay = (S.plan.durum || 'taslak') !== 'kilitli' && !salt() ? `<button class="ap-btn pri sm ap-noprint" data-act="plan-kaydet" title="Değişiklikler zaten otomatik kaydedilir; bu düğme bekleyen değişikliği hemen sunucuya yazar">💾 Kaydet</button>${S.sonKayit ? `<span class="ap-note" title="Son kayıt">✓ ${S.sonKayit}</span>` : ''}` : '';
    const sagG = kay || sag ? `<div class="ap-sbas-sag ap-sbas-dg">${kay}${sag.replace(' ap-sbas-sag', '')}</div>` : '';
    return opts.gomulu ? `<div class="ap-sbas"><div><h2>${baslik}</h2>${damgaHtml(d)}</div>${sagG}</div>` : (d || sagG ? `<div class="ap-sbas"><div>${damgaHtml(d)}</div>${sagG}</div>` : '');
  }
  function sayfaHtml() {
    if (S.modul === 2) return n2Html();
    if (!S.plan && !YAN_VERI.includes(S.sayfa)) return bosHtml();      // Sürüm 13.63: Arşiv, Arşiv istatistikleri ve Ayarlar o ayın planı olmadan da açılır
    if (!S.plan) return (opts.gomulu ? `<div class="ap-sbas"><div><h2>${esc((SAYFALAR.find(x => x[0] === S.sayfa) || [, ""])[1])}</h2></div></div>` : "") + sayfaGovde();
    if (!SAYFALAR.some(x => x[0] === S.sayfa)) S.sayfa = 'ana';
    const ic = sayfaGovde();      // önce gövde: istasyon sayfası seçili istasyonu (S.ist) burada belirler
    return sayfaBasHtml() + ic;
  }
  function sayfaGovde() {
    return ({ana: anaHtml, pano: panoHtml, ist: istHtml, gorev: gorevHtml, personel: personelHtml, ozel: ozelHtml, stat: statHtml, talep: talepHtml, ayar: ayarHtml, arsiv: arsivHtml, arstat: arstatHtml, takip: takipHtml}[S.sayfa] || panoHtml)();
  }
  // Plan kutusunda Enter: değer kaydedilir ve odak alt satırın plan kutusuna geçer
  const PLAN_KUTU = 'input[data-f=planlanan], input[data-n2=teklif], input[data-n2=hedef]';      // Enter: alt satır · ↑/↓: ±1 (Shift ile ±0,5)
  function odakUygula() {
    if (S.odakSonraki == null) return;
    const l = root.querySelectorAll(PLAN_KUTU), i = S.odakSonraki; S.odakSonraki = null;
    const h = l[i] || l[l.length - 1]; if (h) { h.focus({preventScroll: false}); try { h.select(); } catch (e) {} }
  }
  // Gömülü mod: sayfa başlığı + "Son kayıt" + sayfanın data-ust işaretli düğme / süzgeç satırları içerik kutusunun üstünde yapışık bölüme (.ap-ust) taşınır;
  // tablo başlıkları (thead) tablonun kendi kaydırma kutusunda yapışık durur. Dar ekranda (≤760 px) CSS yapışkanlığı kapatır, düzen değişmez.
  let ustGozcu = null;
  function ustYerlestir() {
    const ust = root.querySelector('.ap-ust'); if (!ust) return;
    const main = ust.parentNode, bas = main.querySelector(':scope > .ap-sbas');
    if (bas) ust.appendChild(bas);
    main.querySelectorAll('[data-ust]').forEach(x => { if (!ust.contains(x)) ust.appendChild(x); });
    if (!ust.children.length) { ust.remove(); return; }
    const olc = () => { const ic = root.querySelector('.ap-icerik'), oz = root.querySelector('.ap-ist-ozet'); if (ic) { ic.style.setProperty('--ap-ust-h', ust.offsetHeight + 'px'); ic.style.setProperty('--ap-ozet-h', (oz ? oz.offsetHeight : 0) + 'px'); } };
    // Yatay taşmayan tablolar kendi kutusunda kaydırılmaz: başlıkları doğrudan sabit üst bölümün altına yapışır; taşanlar (ör. İstasyon tablosu) kutusunda kalır
    const sinifla = () => root.querySelectorAll('.ap-icerik .ap-tw').forEach(tw => { const t = tw.querySelector('table'); if (t) tw.classList.toggle('ap-tw-acik', t.scrollWidth <= tw.clientWidth + 1); });
    olc(); sinifla();
    if (typeof ResizeObserver === 'function') { if (ustGozcu) ustGozcu.disconnect(); ustGozcu = new ResizeObserver(() => { olc(); sinifla(); }); ustGozcu.observe(ust); const oz = root.querySelector('.ap-ist-ozet'); if (oz) ustGozcu.observe(oz); const ic = root.querySelector('.ap-icerik'); if (ic) ustGozcu.observe(ic); }
  }
  // Görev tarihi: ay seçici (İstatistik dönem seçicisi gibi). Görev, seçilen ilk ayın 1'i 09:00'dan son ayın ertesi ayının 1'i 09:00'a kadardır
  const ayIleri = ym => { const [y, m] = ym.split('-').map(Number); return m === 12 ? `${y + 1}-01` : `${y}-${C.pad(m + 1)}`; };
  const ayGeri = ym => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${C.pad(m - 1)}`; };
  // kayıttaki tarihi ay aralığına çevirir: {ilk: 'YYYY-MM', son: 'YYYY-MM' | '' (süresiz)}; ay sonu bitiş (30.11) Kasım'ı kapsar, 01.12 bitiş de Kasım'da biter
  function gorevAyAraligi(g) {
    const t = gorevTarihleri(g); if (!t.bas && !t.bit) return null;
    const ilk = t.bas ? t.bas.slice(0, 7) : '';
    let son = ''; if (t.bit) { const [y, m, d] = t.bit.split('-').map(Number); son = d === 1 ? ayGeri(t.bit.slice(0, 7)) : t.bit.slice(0, 7); }
    return {ilk, son};
  }
  const ayEt = ym => `${AY_KISA[+ym.slice(5) - 1]} ${ym.slice(0, 4)}`;
  function gorevTarihEtiket(k) {
    const r = gorevAyAraligi(k.gorev); if (!r) return 'Tarih seç';
    if (!r.son) return `${r.ilk ? ayEt(r.ilk) : '?'} – süresiz`; if (!r.ilk) return `… – ${ayEt(r.son)}`;
    if (r.ilk === r.son) return ayEt(r.ilk); return r.ilk.slice(0, 4) === r.son.slice(0, 4) ? `${AY_KISA[+r.ilk.slice(5) - 1]} – ${ayEt(r.son)}` : `${ayEt(r.ilk)} – ${ayEt(r.son)}`;
  }
  function gorevTarihSecim(k, duz) {
    const r = gorevAyAraligi(k.gorev), tarihMetni = r && r.ilk ? `${trTarih(r.ilk + '-01')} – ${r.son ? trTarih(ayIleri(r.son) + '-01') : 'süresiz'}` : '';
    const ham = k.gorev.tarih && k.gorev.tarih !== tarihMetni ? `<div class="ap-note" title="Kayıttaki tarih metni">${esc(k.gorev.tarih)}</div>` : '';
    return `<button class="ap-btn sm" data-pop data-act="gt-ac" data-v="${k.id}" ${duz ? '' : 'disabled'} title="${esc(tarihMetni || 'Görev tarihi girilmemiş')}">${esc(gorevTarihEtiket(k))} ▾</button>${tarihMetni ? `<div class="ap-note">${tarihMetni}</div>` : ''}${ham}`;
  }
  function gorevTarihPop() {
    const k = S.plan && S.plan.kayitlar.find(x => x.id === S.gtAc); if (!k || !k.gorev) return '';
    const r = gorevAyAraligi(k.gorev) || {ilk: '', son: ''}, bekle = S.gtBekle && S.gtBekle.id === k.id ? S.gtBekle.ilk : '';
    const yillar = [...new Set([S.y, ...(S.m === 1 ? [S.y - 1] : []), ...(r.ilk ? [+r.ilk.slice(0, 4)] : []), ...(r.son ? [+r.son.slice(0, 4)] : [])])].sort();      // plan yılı; Ocak planında önceki yıl da (Aralık'ta başlayan görevler)
    const icinde = ym => r.ilk && ym >= r.ilk && (!r.son || ym <= r.son);
    const yil = y => `<div class="ap-yil"><div class="ap-yilbas"><b>${y}</b><button class="ap-btn sm" data-pop data-act="gt-yil" data-v="${y}">✓ Tüm yıl</button></div><div class="ap-aygrid" style="grid-template-columns:repeat(6,1fr)">${AY_KISA.map((ad, i) => { const ym = `${y}-${C.pad(i + 1)}`; return `<button class="ap-aybtn ${icinde(ym) ? 'sec' : ''} ${ym === bekle ? 'bek' : ''}" data-pop data-act="gt-ay" data-v="${ym}">${ad}</button>`; }).join('')}</div></div>`;
    return `<div class="ap-pop ap-gtpop" data-pop><div class="ap-row" style="justify-content:space-between"><b class="ap-poph">GÖREV TARİHİ — ${esc(k.ad)}</b><span class="ap-note">${esc(gorevTarihEtiket(k))}</span></div>
      <div class="ap-note" style="margin-top:4px">${bekle ? `Başlangıç <b>${ayEt(bekle)}</b>. Şimdi son ayı seçin (tek ay için aynı aya tıklayın).` : 'Önce başlangıç ayına, sonra son aya tıklayın. Görev ilk ayın 1\'i 09:00\'da başlar, son ayın ertesi ayının 1\'i 09:00\'da biter.'}</div>
      ${yillar.map(yil).join('')}
      <div class="ap-popalt"><span><button class="ap-btn sm" data-pop data-act="gt-suresiz">Süresiz</button> <button class="ap-btn sm" data-pop data-act="gt-temizle">Tarihi sil</button></span><button class="ap-btn sm" data-pop data-act="gt-kapat">Kapat ✕</button></div></div>`;
  }
  // ---------- Ortak tarih düzeni (12.48): tek ay seçimi "‹ Ay Yıl ›" + yıl–ay ızgarası; gün gerekiyorsa aynı görünümde gün takvimi ----------
  // S.tp = {tur: 'ay'} ay geçişi | {tur: 'gun', anahtar, mod: 'tek'|'aralik', gor: 'YYYY-MM', min, max, bekle}; seçilen günler S.tarihSec[anahtar]
  const tarihSec = () => S.tarihSec = S.tarihSec || {};
  const tpGunEt = d => d ? trTarih(d) : '';
  function tarihDugme(anahtar, mod, ops) {      // gün seçim düğmesi + gizli değer alanları (eski id'lerle)
    const v = tarihSec()[anahtar] || {}, o = ops || {}, et = mod === 'aralik' ? (v.bas ? `${tpGunEt(v.bas)} – ${v.bit ? tpGunEt(v.bit) : '…'}` : (o.bos || 'Tarih aralığı seç')) : (v.bas ? tpGunEt(v.bas) : (o.bos || 'Gün seç'));
    return `<button class="ap-btn ap-tpbtn" data-pop data-act="tp-gun-ac" data-v="${anahtar}" data-mod="${mod}" data-min="${o.min || ''}" data-max="${o.max || ''}" ${o.disabled ? 'disabled' : ''}>📅 ${esc(et)} ▾</button>${(o.idler || []).map((id, i) => `<input type="hidden" id="${id}" value="${i === 0 ? (v.bas || '') : (v.bit || '')}">`).join('')}`;
  }
  function tarihPopHtml() {
    const T = S.tp; if (!T) return '';
    if (T.tur === 'ay') {
      const yillar = [...new Set([S.y - 1, S.y, S.y + 1, BUGUN.getFullYear()])].sort((a, b) => b - a), ac = T.acik || [S.y];
      return `<div class="ap-pop ap-tppop" data-pop><div class="ap-row" style="justify-content:space-between"><b class="ap-poph">AY SEÇ</b><span class="ap-note">${ayEtiket()}</span></div>
        ${yillar.map(y => `<div class="ap-yil"><button class="ap-yilbas ap-yilac" data-pop data-act="tp-yil" data-v="${y}"><b>${ac.includes(y) ? '▾' : '▸'} ${y}</b></button>${ac.includes(y) ? `<div class="ap-aygrid" style="grid-template-columns:repeat(6,1fr)">${AY_KISA.map((ad, i) => `<button class="ap-aybtn ${y === S.y && i + 1 === S.m ? 'sec' : ''}" data-pop data-act="tp-ay" data-v="${y}-${C.pad(i + 1)}">${ad}</button>`).join('')}</div>` : ''}</div>`).join('')}
        <div class="ap-popalt"><span></span><button class="ap-btn sm" data-pop data-act="tp-kapat">Kapat ✕</button></div></div>`;
    }
    const v = tarihSec()[T.anahtar] || {}, [gy, gm] = T.gor.split('-').map(Number), N = C.gunSayisi(gy, gm), ilk = (new Date(Date.UTC(gy, gm - 1, 1)).getUTCDay() + 6) % 7;      // Pazartesi başlangıçlı
    const bas = T.bekle || v.bas, bit = T.bekle ? '' : v.bit, gunler = [];
    for (let i = 0; i < ilk; i++) gunler.push('<span></span>');
    for (let d = 1; d <= N; d++) { const iso = C.iso(gy, gm, d), dis = (T.min && iso < T.min) || (T.max && iso > T.max), sec = bas && (iso === bas || (bit && iso >= bas && iso <= bit)), hs = ((ilk + d - 1) % 7) >= 5;
      gunler.push(`<button class="ap-aybtn ap-gunbtn ${sec ? 'sec' : ''} ${iso === T.bekle ? 'bek' : ''} ${hs ? 'hs' : ''}" data-pop data-act="tp-gun" data-v="${iso}" ${dis ? 'disabled' : ''}>${d}</button>`); }
    const ileri = T.max && T.max.slice(0, 7) <= T.gor ? 'disabled' : '', geri = T.min && T.min.slice(0, 7) >= T.gor ? 'disabled' : '';
    return `<div class="ap-pop ap-tppop" data-pop><div class="ap-row" style="justify-content:space-between"><b class="ap-poph">${T.mod === 'aralik' ? 'TARİH ARALIĞI' : 'GÜN SEÇ'}</b><span class="ap-note">${T.mod === 'aralik' ? (T.bekle ? 'Şimdi bitiş gününe tıklayın' : 'Başlangıç gününe, sonra bitiş gününe tıklayın') : ''}</span></div>
      <div class="ap-row" style="justify-content:space-between;margin:6px 0"><button class="ap-btn sm" data-pop data-act="tp-gor" data-v="-1" ${geri}>‹</button><b>${AYLAR[gm]} ${gy}</b><button class="ap-btn sm" data-pop data-act="tp-gor" data-v="1" ${ileri}>›</button></div>
      <div class="ap-gungrid">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(x => `<span class="ap-note">${x}</span>`).join('')}${gunler.join('')}</div>
      <div class="ap-popalt"><span>${v.bas ? `<button class="ap-btn sm" data-pop data-act="tp-temizle">Temizle</button>` : ''}</span><button class="ap-btn sm" data-pop data-act="tp-kapat">Kapat ✕</button></div></div>`;
  }
  // Sürüm 13.57: bütün tablolarda başlığa tıklayınca sıralama (▲ / ▼, üçüncü tıklama kaldırır) ve 8+ satırlı tabloda "Tabloda ara" süzgeci.
  // Ara başlık satırı (colspan) olan gruplu tablolarda sıralanınca ara başlıklar gizlenir. Takvim tabloları (istek / nöbet listesi) hariç. Durum sayfa + tablo sırasına göre saklanır.
  const TD = {};
  const hucreDeger = (r, i) => { const c = r.cells[i]; if (!c) return ''; const e = c.querySelector('input:not([type=checkbox]),select');
    if (e) return e.tagName === 'SELECT' ? ((e.options[e.selectedIndex] || {}).text || '') : e.value; const cb = c.querySelector('input[type=checkbox]'); if (cb) return cb.checked ? '1' : '0'; return (c.textContent || '').trim(); };
  const hucreSayi = v => { const t = String(v).replace(/[−–]/g, '-').replace(/\s/g, ''); if (!/^[-+]?[\d.]*\d(,\d+)?/.test(t)) return null; const m = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.').match(/^[-+]?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
  // Sütun süzgeci (Excel gibi): d.f = {sütunNo: [gizlenen değerler]}. Yalnız bu kodun gizlediği satırlar (data-tara-gizli) geri açılır.
  const suzDeger = v => String(v || '').replace(/\s+/g, ' ').trim();
  function tabloSuz(t, d) { const q = C.TR(d.ara || ''), f = d.f || {}, fk = Object.keys(f).filter(i => f[i] && f[i].length);
    [...t.tBodies[0].rows].forEach(r => { if (r.querySelector('td[colspan]')) return;
      const gizle = (q && !C.TR([...r.cells].map((c, i) => hucreDeger(r, i)).join(' ')).includes(q)) || fk.some(i => f[i].includes(suzDeger(hucreDeger(r, +i))));
      if (gizle) { if (r.style.display !== 'none') { r.style.display = 'none'; r.dataset.taraGizli = '1'; } }
      else if (r.dataset.taraGizli) { r.style.display = ''; delete r.dataset.taraGizli; } }); }
  const suzAktif = d => !!(d && (d.ara || Object.keys(d.f || {}).some(i => d.f[i] && d.f[i].length)));
  function sutunSuzYenile() { root.querySelectorAll('.ap-main table.ap-t').forEach(t => { const th = t.querySelector('th.ap-sirala'), d = th && TD[th.dataset.tk]; if (suzAktif(d)) tabloSuz(t, d); }); }
  function sutunPopAc(th) {
    const d = TD[th.dataset.tk], i = +th.dataset.ti, t = th.closest('table'); if (!d || !t) return;
    ssKapat(); d.f = d.f || {};
    const gizli = new Set(d.f[i] || []), say = new Map();
    [...t.tBodies[0].rows].forEach(r => { if (r.querySelector('td[colspan]')) return; const v = suzDeger(hucreDeger(r, i)); say.set(v, (say.get(v) || 0) + 1); });
    const degerler = [...say.keys()].sort((a, b) => { if (!a) return 1; if (!b) return -1; const na = hucreSayi(a), nb = hucreSayi(b); return na != null && nb != null ? na - nb : a.localeCompare(b, 'tr', {numeric: true}); });
    const host = document.createElement('div'); host.className = root.className + ' ap-sshost';
    const ad = esc((th.textContent || '').replace(/[▲▼]/g, '').trim());
    host.innerHTML = `<div class="ap-pop ap-sspop ap-supop" data-pop><b class="ap-supop-bas">${ad}</b>
      <div class="ap-supop-sira"><button type="button" class="ap-btn sm ${d.k === i && d.y > 0 ? 'pri' : ''}" data-su="a">▲ Küçükten büyüğe</button><button type="button" class="ap-btn sm ${d.k === i && d.y < 0 ? 'pri' : ''}" data-su="z">▼ Büyükten küçüğe</button>${d.k === i ? '<button type="button" class="ap-btn sm" data-su="k">Sıralamayı kaldır</button>' : ''}</div>
      ${degerler.length > 8 ? '<input class="ap-in ap-ssara" placeholder="Değer ara…" autocomplete="off">' : ''}
      <label class="ap-supop-tum"><input type="checkbox" data-su-tum> <span>Tümünü seç</span></label>
      <div class="ap-supop-liste">${degerler.map((v, j) => `<label data-ara="${esc(C.TR(v))}"><input type="checkbox" data-j="${j}" ${gizli.has(v) ? '' : 'checked'}> <span>${v ? esc(v) : '<i>(Boş)</i>'}</span><em>${say.get(v)}</em></label>`).join('')}</div>
      <div class="ap-popalt"><button type="button" class="ap-btn sm" data-su="temizle">Süzgeci temizle</button><button type="button" class="ap-btn pri sm" data-su="uygula">Uygula</button></div></div>`;
    document.body.appendChild(host); ssPop = host; ssKonum(th);
    const kutu = [...host.querySelectorAll('[data-j]')], tum = host.querySelector('[data-su-tum]'), ara = host.querySelector('.ap-ssara');
    const gor = () => kutu.filter(c => c.closest('label').style.display !== 'none');
    const tumGuncelle = () => { const g = gor(), n = g.filter(c => c.checked).length; tum.checked = g.length > 0 && n === g.length; tum.indeterminate = n > 0 && n < g.length; };
    tumGuncelle();
    const kapat = () => { ssKapat(); };
    host.addEventListener('mousedown', e => e.stopPropagation());
    host.addEventListener('change', e => { if (e.target === tum) gor().forEach(c => { c.checked = tum.checked; }); tumGuncelle(); });
    if (ara) { ara.addEventListener('input', () => { const q = C.TR(ara.value).trim(); kutu.forEach(c => { const l = c.closest('label'); l.style.display = !q || l.dataset.ara.includes(q) ? '' : 'none'; }); tumGuncelle(); }); ara.focus(); }
    host.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); kapat(); } else if (e.key === 'Enter') { e.preventDefault(); host.querySelector('[data-su=uygula]').click(); } });
    host.addEventListener('click', e => { const x = e.target.closest('[data-su]'); if (!x) return; e.stopPropagation(); const k = x.dataset.su;
      if (k === 'a' || k === 'z') { d.k = i; d.y = k === 'a' ? 1 : -1; }
      else if (k === 'k') d.k = -1;
      else if (k === 'temizle') delete d.f[i];
      else if (k === 'uygula') {      // arama açıkken yalnız görünen değerler seçilmiş sayılır (Excel davranışı)
        const q = ara && C.TR(ara.value).trim(), h = kutu.filter(c => !c.checked || (q && c.closest('label').style.display === 'none')).map(c => degerler[+c.dataset.j]);
        if (h.length && h.length === degerler.length) { toast('En az bir değer seçin.'); return; }
        if (h.length) d.f[i] = h; else delete d.f[i]; }
      kapat(); render(); });
  }
  function tabloSiralaFiltrele() {
    const sayfa = S.modul === 2 ? 'n2:' + S.n2.sekme : S.sayfa + ':' + (S.gorevSekme || '');
    const kendiAra = !!root.querySelector('[data-liste-ara]');      // Sürüm 13.62: sayfanın kendi arama kutusu varsa (Personel 'Ad veya TC ara' vb.) ikinci 'Tabloda ara' kutusu açılmaz
    root.querySelectorAll('.ap-main table.ap-t').forEach((t, ti) => {
      if (t.matches('.n2, .n2l, [data-sirasiz]') || !t.tBodies[0]) return;
      const tb = t.tBodies[0], satir = [...tb.rows]; if (satir.length < 2) return;
      const ths = [...t.querySelectorAll('thead tr:last-child th')]; if (!ths.length) return;
      const anahtar = `${sayfa}:${ti}:${ths.length}`, d = TD[anahtar] || (TD[anahtar] = {k: -1, y: 1, ara: ''}), grup = satir.some(r => r.querySelector('td[colspan]'));
      if (satir.length >= 8 && !kendiAra && !satir.some(r => r.dataset.ara != null)) {      // kendi arama kutusu olan listelerde (data-ara) ikinci kutu açılmaz
        const kap = t.closest('.ap-tw') || t, inp = document.createElement('input');
        inp.className = 'ap-in ap-tara ap-noprint'; inp.placeholder = 'Tabloda ara…'; inp.value = d.ara; inp.dataset.tk = anahtar; inp.setAttribute('aria-label', 'Tabloda ara');
        kap.parentNode.insertBefore(inp, kap); inp._tablo = t;
      }
      ths.forEach((th, i) => { if (th.colSpan > 1 || !(th.textContent || '').trim()) return; th.classList.add('ap-sirala'); th.dataset.tk = anahtar; th.dataset.ti = i; if (d.k === i) th.dataset.yon = d.y > 0 ? '▲' : '▼'; else delete th.dataset.yon; th.classList.toggle('ap-suzulu', !!(d.f && d.f[i] && d.f[i].length)); th.title = 'Sırala / süz'; });
      if (d.k >= 0 && grup) satir.forEach(r => { if (r.querySelector('td[colspan]')) r.style.display = 'none'; });      // gruplu tabloda sıralanınca ara başlıklar gizlenir (sıralama kaldırılınca geri gelir)
      if (d.k >= 0) satir.filter(r => !r.querySelector('td[colspan]')).sort((a, b) => { const va = hucreDeger(a, d.k), vb = hucreDeger(b, d.k), na = hucreSayi(va), nb = hucreSayi(vb);
        if (!va && vb) return 1; if (va && !vb) return -1; return (na != null && nb != null ? na - nb : va.localeCompare(vb, 'tr', {numeric: true})) * d.y; }).forEach(r => tb.appendChild(r));
      if (suzAktif(d)) tabloSuz(t, d);
    });
  }
  root.addEventListener('click', e => { const th = e.target.closest && e.target.closest('th.ap-sirala'); if (!th || e.target.closest('input,select,button,a')) return;
    e.stopPropagation(); if (ssPop && ssPop.dataset.th === th.dataset.tk + ':' + th.dataset.ti) { ssKapat(); return; } sutunPopAc(th); if (ssPop) ssPop.dataset.th = th.dataset.tk + ':' + th.dataset.ti; });
  root.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('th.ap-sirala')) e.stopPropagation(); });
  root.addEventListener('input', e => { const t = e.target; if (t && t.classList && !t.classList.contains('ap-tara')) setTimeout(sutunSuzYenile, 0); });
  root.addEventListener('input', e => { const t = e.target; if (!t.classList || !t.classList.contains('ap-tara')) return; const d = TD[t.dataset.tk]; if (!d) return; d.ara = t.value; if (t._tablo) tabloSuz(t._tablo, d); });
  function render() {
    oturumYaz();
    const sy = window.scrollY, tw = root.querySelector('.ap-tw'), sl = tw ? tw.scrollLeft : 0, st = tw ? tw.scrollTop : 0, ic0 = root.querySelector('.ap-icerik'), isy = ic0 ? ic0.scrollTop : 0;
    const koyu = !opts.gomulu && S.ayar && (S.ayar.tema === 'koyu' || (S.ayar.tema === 'sistem' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches));
    root.className = 'ap-root' + (koyu ? ' ap-dark' : '') + (opts.gomulu ? ' ap-gomulu' : ''); document.body.style.background = koyu ? '#0f1720' : opts.gomulu ? '#f8fafc' : '#f4f6f9';      // gömülü modda tema her zaman açık: koyu modu ana uygulama verir
    if (S.rol === 'istasyon') S.modul = 2;
    kilitGuncelle();
    const bant = (kilitBende() ? '' : `<div class="ap-oku"><b>${esc(kilitMesaj())}</b> O kişi çıkınca düzenleme kendiliğinden açılır.</div>`) + (guncelAy() ? '' : `<div class="ap-oku"><b>Arşiv görünümü — ${ayEtiket()} salt okunur.</b> Geçmiş aylar yalnızca görüntülenir, değiştirilemez. <button class="ap-btn sm" data-act="guncel-ay">Güncel aya dön (${AYLAR[GUNCEL_M]} ${GUNCEL_Y})</button></div>`);
    if (S.tamEkran && (S.sayfa !== 'ist' || S.modul === 2 || !S.plan)) S.tamEkran = false;
    root.innerHTML = S.tamEkran ? `<div class="ap-tamekran">${sayfaHtml()}</div>${tarihPopHtml()}` + (S.modal ? S.modal() : '') : (opts.gomulu ? `<div class="ap-yanlay">${yanHtml()}<div class="ap-icerik">${bant}<div class="ap-main"><div class="ap-ust"></div>${sayfaHtml()}</div></div></div>${tarihPopHtml()}` : ustHtml() + (S.plan || S.modul === 2 ? navHtml() : '') + bant + `<div class="ap-main">${sayfaHtml()}</div>${tarihPopHtml()}`) + (S.modal ? S.modal() : '');
    // Sayı sütunları: tüm hücreleri sayı olan sütunun başlığı ve hücreleri sağa yaslanır (başlık ile sayı aynı hizada)
    root.querySelectorAll('table').forEach(t => {
      const ths = [...t.querySelectorAll('thead th')]; if (!ths.length) return;
      const rows = [...t.querySelectorAll('tbody tr')].filter(r => r.children.length === ths.length);
      ths.forEach((th, i) => {
        const hucre = rows.map(r => r.children[i]), dolu = hucre.map(c => (c.querySelector('input,select') ? (c.querySelector('input,select').value || '') : (c.textContent || '')).trim()).filter(v => v !== '');
        if (!dolu.length || th.classList.contains('num') && hucre.every(c => c.classList.contains('num'))) return;
        const sayisal = dolu.every(v => /^[−+-]?\d{1,7}([.,]\d+)?$/.test(v)) && !(hucre.some(c => c.querySelector('select')));
        if (sayisal || hucre.every(c => c.classList.contains('num') || (!(c.textContent || '').trim() && !c.querySelector('input,select')))) { th.classList.add('num'); hucre.forEach(c => c.classList.add('num')); }
      });
    });
    tabloSiralaFiltrele();
    seciciDonustur();
    toastCiz();
    ustYerlestir();
    tekKonum();
    const tw2 = root.querySelector('.ap-tw'); if (tw2) { tw2.scrollLeft = sl; tw2.scrollTop = st; }
    window.scrollTo(0, sy); const ic1 = root.querySelector('.ap-icerik'); if (ic1) ic1.scrollTop = isy;
    odakUygula();
  }
