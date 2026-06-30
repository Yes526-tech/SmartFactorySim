// 1. Canlı Saat ve Dinamik Vardiya Güncelleme (Otomatik Motor)
setInterval(() => {
    const now = new Date();
    const liveClock = document.getElementById('liveClock');
    if (liveClock) {
        liveClock.innerText = now.toLocaleString('tr-TR');
    }

    const currentHour = now.getHours();
    let shiftName = "";
    let shiftColorClass = "";

    if (currentHour >= 8 && currentHour < 16) {
        shiftName = "Gündüz Vardiyası";
        shiftColorClass = "text-primary";
    } else if (currentHour >= 16 && currentHour < 24) {
        shiftName = "Akşam Vardiyası";
        shiftColorClass = "text-warning";
    } else {
        shiftName = "Gece Vardiyası";
        shiftColorClass = "text-info";
    }

    const activeShiftElement = document.getElementById('activeShift');
    if (activeShiftElement) {
        activeShiftElement.innerText = shiftName;
        activeShiftElement.className = shiftColorClass + " fw-bold";
    }
}, 1000);

// 2. SignalR Bağlantısını Başlat
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/factoryHub")
    .build();

let messageCount = 0;
let messageHistory = [];

window.bandStates = {
    'BANT-1': { busySince: null, worker: 'Ahmet Yılmaz', totalProduced: 0 },
    'BANT-2': { busySince: null, worker: 'Burak Can', totalProduced: 0 },
    'BANT-3': { busySince: null, worker: 'Hasan Şahin', totalProduced: 0 }
};

// Global timer: Aktif üretim için geçen süreyi günceller (1 sn aralıkla)
setInterval(() => {
    for (const [bantId, state] of Object.entries(window.bandStates)) {
        const timerEl = document.getElementById(`timer_${bantId}`);
        if (state.busySince && !state.finished) {
            const diffSec = Math.floor((Date.now() - state.busySince) / 1000);
            const m = Math.floor(diffSec / 60).toString().padStart(2, '0');
            const s = (diffSec % 60).toString().padStart(2, '0');
            state.timerDisplay = `${m}:${s}`;
            if (timerEl) timerEl.innerText = `⏱ ${m}:${s}`;

            // Modal açıksa onu da güncelle
            if (window.currentActiveModalBand === bantId) {
                const modalTimerEl = document.getElementById('modalActiveTimer');
                if (modalTimerEl) modalTimerEl.innerText = state.timerDisplay;
            }
        } else if (!state.busySince) {
            // Boşta — sıfırla
            if (timerEl && timerEl.innerText !== '⏱ 00:00') timerEl.innerText = '⏱ 00:00';
        }
    }
}, 1000);

// Sürekli Üretim Döngüsü: Her 3 saniyede üretim sayısını artır
setInterval(() => {
    Object.keys(window.bandStates).forEach(bantId => {
        const bState = window.bandStates[bantId];
        if (!bState.busySince || bState.finished) return;

        // Üretim adımı: hedef varsa artır
        if (bState.totalProduced < bState.targetProduced) {
            bState.totalProduced += 1;
        }

        const target = bState.targetProduced || 500;
        const produced = bState.totalProduced;
        const pct = Math.min(100, Math.round((produced / target) * 100));

        // Sayaç göstergesi
        const prodCountEl = document.getElementById(`prodCount_${bantId}`);
        if (prodCountEl) {
            prodCountEl.innerHTML = `<span class="text-muted">Üretilen: </span><strong class="${produced >= target ? 'text-success' : 'text-warning'}">${produced} / ${target} akü</strong> <span class="text-muted">(${pct}%)</span>`;
        }

        // Progress bar güncelle
        const progressEl = document.getElementById(`progress_${bantId}`);
        if (progressEl) {
            progressEl.style.width = pct + '%';
        }

        if (produced >= target && target > 0) {
            // ÜRETİM TAMAMLANDI
            bState.finished = true;

            const statusEl = document.getElementById(`status_${bantId}`);
            if (statusEl) {
                statusEl.innerText = 'ÜRETİM BİTTİ';
                statusEl.style.color = '#27ae60';
                statusEl.className = 'fw-bold badge bg-success';
                statusEl.style.fontSize = '1rem';
            }

            if (progressEl) {
                progressEl.className = 'progress-bar bg-success';
                progressEl.style.width = '100%';
            }

            const logisticEl = document.getElementById(`logistic_${bantId}`);
            if (logisticEl) {
                logisticEl.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i><span class="text-success fw-bold">Hedef ${target} akü tamamlandı.</span>`;
            }

            // Onayla butonunu actionRow'a yerleştir
            const actionRow = document.getElementById(`actionRow_${bantId}`);
            const onaylaContainer = document.getElementById(`onaylaContainer_${bantId}`);
            if (actionRow) actionRow.style.display = 'flex';
            if (onaylaContainer && !onaylaContainer.querySelector('button')) {
                onaylaContainer.innerHTML = `
                    <button id="onaylaBtn_${bantId}" class="btn btn-success fw-bold py-0 px-3" style="font-size:0.8rem;"
                            onclick="uretimiTamamla('${bantId}', this)">
                        <i class="bi bi-check-lg me-1"></i>Onayla
                    </button>`;
            }
        } else {
            // Üretim devam ediyor
            const logisticEl = document.getElementById(`logistic_${bantId}`);
            if (logisticEl && !logisticEl.innerHTML.includes('Hedef')) {
                logisticEl.innerHTML = `<i class="bi bi-gear-fill text-warning me-1 animate__animated animate__spin"></i><span class="text-warning fw-bold">Seri Üretim Aktif</span>`;
            }
        }

        // Modal açıksa sayacı güncelle
        if (window.currentActiveModalBand === bantId) {
            const countEl = document.getElementById('modalProdCount');
            if (countEl) countEl.innerText = `${produced} / ${target}`;
        }
    });
}, 3000);

// Üretim Tamamlama (Onayla butonu)
window.uretimiTamamla = function(bantId, btnElement) {
    const bState = window.bandStates[bantId];
    if (!bState) {
        console.error('Bant durumu bulunamadı:', bantId);
        return;
    }

    // Butonu hemen devre dışı bırak — çift tıklamayı önle
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>İşleniyor...`;
        btnElement.className = 'btn btn-secondary fw-bold py-0 px-3';
    }

    // Onay anındaki bilgileri kaydet (fetch sonrası state sıfırlanabilir)
    const islemId = bState.islemId || 0; // Eğer id yoksa backend bantId'den bulacak
    const hedef = bantId;
    const akuTipi = bState.akuTipi || 'Akü';
    const miktar = bState.targetProduced || 500;

    fetch('/Bant/UretimTamamla', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: islemId, bantId: bantId })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            if (btnElement) {
                btnElement.innerHTML = `<i class="bi bi-check-all me-1"></i>Onaylandı ✓`;
                btnElement.className = 'btn btn-outline-success fw-bold py-0 px-3';
            }

            // Onaylanan üretimler listesine dinamik kart ekle
            const onaylananContainer = document.getElementById('onaylananListContainer');
            if (onaylananContainer) {
                const bosEl = document.getElementById('bosOnaylananDurumu');
                if (bosEl) bosEl.remove();

                const now = new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }) + ' ' +
                            new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                const yeniKart = `
                    <div class="border rounded p-2 mb-2 shadow-sm animate__animated animate__fadeIn"
                         style="background-color: #f0fff4; border-color: #27ae60 !important;">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="fw-bold text-success" style="font-size: 0.78rem;">
                                <i class="bi bi-check-all me-1"></i>${hedef}
                            </span>
                            <span class="badge bg-success" style="font-size: 0.65rem;">Tamamlandı</span>
                        </div>
                        <div class="small fw-bold text-dark mb-1">${akuTipi}</div>
                        <div class="d-flex justify-content-between small text-muted" style="font-size: 0.68rem;">
                            <span>Üretilen:</span><span class="fw-bold text-success">${miktar} Adet ✓</span>
                        </div>
                        <div class="text-muted mt-1" style="font-size: 0.65rem;">
                            <i class="bi bi-clock me-1"></i>${now}
                        </div>
                    </div>`;
                onaylananContainer.insertAdjacentHTML('afterbegin', yeniKart);
            }

            // Onayla alanını 3 saniye sonra temizle
            const onaylaContainer = document.getElementById(`onaylaContainer_${bantId}`);
            if (onaylaContainer) {
                setTimeout(() => { onaylaContainer.innerHTML = ''; }, 3000);
            }
        } else {
            alert('Hata: ' + (result.message || 'Bilinmeyen hata'));
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = `<i class="bi bi-check-lg me-1"></i>Onayla`;
                btnElement.className = 'btn btn-success fw-bold py-0 px-3';
            }
        }
    })
    .catch(err => {
        console.error('UretimTamamla hatası:', err);
        alert('Sunucu ile bağlantı kurulamadı. Lütfen tekrar deneyin.');
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = `<i class="bi bi-check-lg me-1"></i>Onayla`;
            btnElement.className = 'btn btn-success fw-bold py-0 px-3';
        }
    });
};



connection.on("ReceiveFactoryData", function (topic, payload) {
    messageCount++;
    const logCounter = document.getElementById('logCounter');
    if (logCounter) logCounter.innerText = messageCount + " Mesaj";

    const noDataRow = document.getElementById('noDataRow');
    if (noDataRow) noDataRow.remove();

    const data = JSON.parse(payload);
    const now = new Date().toLocaleTimeString('tr-TR');

    messageHistory[messageCount] = data;

    const tableBody = document.getElementById('logTableBody');
    if (tableBody) {
        const row = tableBody.insertRow(0);
        row.className = 'animate__animated animate__fadeIn bg-light';
        setTimeout(() => row.classList.remove('bg-light'), 1000);
        
        row.innerHTML = `
            <td class="text-muted small">${now}</td>
            <td class="fw-bold text-primary">${topic}</td>
            <td class="text-secondary small font-monospace">${payload}</td>
        `;
        if (tableBody.rows.length > 50) tableBody.deleteRow(50);
    }

    // Sol Menüdeki "Son İşlemler" özetine ekle
    const sidebarLogList = document.getElementById('sidebarLogList');
    if (sidebarLogList) {
        const emptyState = document.getElementById('sidebarEmptyState');
        if (emptyState) emptyState.remove();

        const sidebarLogCount = document.getElementById('sidebarLogCount');
        if (sidebarLogCount) {
            let currCount = parseInt(sidebarLogCount.innerText) || 0;
            sidebarLogCount.innerText = currCount + 1;
        }

        // Konuya göre renk ve ikon belirle
        let sIcon = "bi-info-circle";
        let sColor = "primary";
        let title = "Sistem İşlemi";
        let desc = "";

        if (topic.includes("uretim_bitti") || topic.includes("uretim_tamamlandi")) {
            sIcon = "bi-check-circle"; sColor = "success"; title = "Üretim Tamamlandı";
            desc = `${data.hedef_bant || 'Bant'} - ${data.miktar || 0} Adet`;
        } else if (topic.includes("uretim_basladi")) {
            sIcon = "bi-play-circle"; sColor = "info"; title = "Üretim Başladı";
            desc = `${data.bant_id || 'Bant'} - ${data.hedef_miktar || 0} Adet Hedef`;
        } else if (topic.includes("etiket_transfer_basladi")) {
            sIcon = "bi-truck"; sColor = "warning"; title = "Etiket Sevkiyatı";
            desc = `${data.firma_markasi || 'Etiket'} -> ${data.hedef_bant || 'Bant'}`;
        } else if (topic.includes("sarj")) {
            sIcon = "bi-lightning-charge"; sColor = "danger"; title = "Şarj İşlemi";
            desc = `${data.aku_tipi || 'Akü'} şarja alındı/talep edildi`;
        }

        const logCard = document.createElement('div');
        logCard.className = `p-2 mb-2 border rounded shadow-sm bg-white animate__animated animate__fadeInLeft`;
        logCard.style.borderLeft = `4px solid var(--bs-${sColor}) !important`;
        logCard.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="fw-bold text-${sColor}" style="font-size: 0.75rem;"><i class="bi ${sIcon} me-1"></i>${title}</span>
                <span class="text-muted" style="font-size: 0.65rem;">${now}</span>
            </div>
            <div class="text-dark small lh-sm" style="font-size: 0.75rem;">${desc || topic}</div>
        `;

        sidebarLogList.insertBefore(logCard, sidebarLogList.firstChild);

        // Menüde sadece son 15 işlemi tut
        if (sidebarLogList.children.length > 15) {
            sidebarLogList.removeChild(sidebarLogList.lastChild);
        }
    }

    let statusBadge = `<span class="badge bg-info">Bilgi</span>`;

    // --- AKILLI ENDÜSTRİYEL LOJİSTİK VE ETİKET ENTEGRASYON MOTORU ---

    // Senaryo A: Herhangi bir banttan gelen klasik kritik seviye "Malzeme Talebi" uyarısı
    if (topic.includes("talep")) {
        statusBadge = `<span class="badge bg-danger">Malzeme Talebi</span>`;

        const targetBant = data.bant_id || "BANT-2"; // Veriden gelen bant ID'si

        // İlgili bandın kartını tehlike moduna alıyoruz
        const bStatus = document.getElementById(`status_${targetBant}`);
        if (bStatus) {
            bStatus.innerText = "MALZEME EKSİK";
            bStatus.className = "fs-4 fw-bold text-danger";
        }
        const bBadge = document.getElementById(`badge_${targetBant}`);
        if (bBadge) bBadge.className = "badge bg-danger animate__animated animate__flash animate__infinite";

        const bProgress = document.getElementById(`progress_${targetBant}`);
        if (bProgress) {
            bProgress.style.width = (data.kalan_seviye_yuzde || 15) + "%";
            bProgress.className = "progress-bar bg-danger";
        }
    }

    // Senaryo B: ETİKET DEPOSUNDAN BANTLARA ETİKET SEVKİYATI
    else if (topic.includes("etiket_depo/sevkiyat")) {
        statusBadge = `<span class="badge bg-success">Etiket Sevkiyatı</span>`;

        const targetBant = data.hedef_bant; // Örn: BANT-1

        // 1. Etiket Depo Listesini Güncelle
        const listContainer = document.getElementById('etiketListContainer');
        if (listContainer) {
            // Eğer boş durumu varsa kaldır
            const bosDurum = document.getElementById('bosEtiketDurumu');
            if (bosDurum) bosDurum.remove();

            // Varsa eski kartı kaldır
            const eskiKart = document.getElementById(`etiketCard_${targetBant}`);
            if (eskiKart) eskiKart.remove();

            const kalanYuzde = data.kalan_seviye_yuzde || 100;
            const etiketTipi = data.etiket_tipi || 'Etiket';
            const miktar = data.miktar || 0;
            const agvId = data.tasiyici_arac_id || 'AGV-??';

            const yeniKartHTML = `
                <div id="etiketCard_${targetBant}" class="border rounded p-2 mb-2 shadow-sm position-relative animate__animated animate__fadeInDown">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold text-success" style="font-size: 0.8rem;"><i class="bi bi-truck text-success"></i> <span class="spinner-border spinner-border-sm text-success me-1"></span> ${agvId}</span>
                        <span class="badge bg-secondary" style="font-size: 0.7rem;">${targetBant}</span>
                    </div>
                    <div class="small fw-bold mb-1">
                        <i class="bi bi-tag-fill text-primary"></i> ${etiketTipi}
                    </div>
                    <div class="d-flex justify-content-between small text-muted mb-1" style="font-size: 0.7rem;">
                        <span>Etiket Miktarı:</span>
                        <span class="fw-bold text-dark">${miktar} Adet</span>
                    </div>
                    <div class="progress mb-1" style="height: 4px;">
                        <div class="progress-bar bg-info progress-bar-striped progress-bar-animated" role="progressbar" style="width: ${kalanYuzde}%;"></div>
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('afterbegin', yeniKartHTML);
        }

        // 2. Hedef Bandın Lojistik Bölümünü Canlandır
        const bStatus = document.getElementById(`status_${targetBant}`);
        if (bStatus) {
            bStatus.innerText = "ETİKET YOLDA";
            bStatus.className = "fs-4 fw-bold text-warning";
        }
        const bProgress = document.getElementById(`progress_${targetBant}`);
        if (bProgress) bProgress.className = "progress-bar bg-warning progress-bar-striped progress-bar-animated";

        const bLogistic = document.getElementById(`logistic_${targetBant}`);
        if (bLogistic) {
            bLogistic.innerHTML = `<i class="bi bi-tags-fill text-warning me-1"></i> <span class="text-warning fw-bold">${data.etiket_tipi} (${data.miktar} Adet)</span> yolda.`;
        }

        // Teslimat simülasyonu: 4 saniye sonra bant eski normal durumuna döner
        setTimeout(() => {
            if (document.getElementById(`status_${targetBant}`).innerText === "ETİKET YOLDA") {
                document.getElementById(`status_${targetBant}`).innerText = "Normal";
                document.getElementById(`status_${targetBant}`).className = "fs-4 fw-bold text-success";
                document.getElementById(`progress_${targetBant}`).className = "progress-bar bg-success";
                document.getElementById(`progress_${targetBant}`).style.width = "100%";
                document.getElementById(`logistic_${targetBant}`).innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> Etiketler başarıyla beslendi.`;
            }
            
            document.getElementById('etiketSure').innerText = "0 dk (Ulaştı)";
            document.getElementById('etiketSure').className = "fw-bold text-success animate__animated animate__pulse animate__infinite";
            document.getElementById('agvInfo').innerHTML = `<i class="bi bi-check-circle-fill text-success"></i> Görev Tamamlandı`;
            
        }, 4000);
    }
    // Senaryo B2: ETİKET DEPO SİPARİŞİ
    else if (topic.includes("fabrika/etiket_depo/siparis")) {
        statusBadge = `<span class="badge" style="background-color: #2c3e50;">Sipariş (Etiket)</span>`;

        document.getElementById('depoStatus').innerText = "Sipariş Hazırlanıyor";
        document.getElementById('depoStatus').className = "fs-5 fw-bold text-primary animate__animated animate__pulse animate__infinite";

        const bInfo = document.getElementById('agvInfo');
        if (bInfo) {
            bInfo.innerHTML = `<strong>${data.hedef_bant}</strong> için ${data.aku_tipi} talebi oluşturuldu.`;
            bInfo.className = "small text-primary fw-bold";
        }
    }

    // Senaryo C: MAMÜL DEPOSUNDAN BANTLARA AKÜ SEVKİYATI (FORKLİFT)
    else if (topic.includes("mamul_depo/sevkiyat")) {
        statusBadge = `<span class="badge" style="background-color: #8e44ad;">Akü Sevkiyatı</span>`;

        const targetBant = data.hedef_bant; // Örn: BANT-2
        const isBusy = window.bandStates[targetBant] && window.bandStates[targetBant].busySince != null;

        // 1. Mamül Depo Listesini Güncelle
        const listContainer = document.getElementById('mamulListContainer');
        if (listContainer) {
            const bosDurum = document.getElementById('bosMamulDurumu');
            if (bosDurum) bosDurum.remove();

            const islemId = data.islem_id || Math.floor(Math.random() * 10000);
            const miktar = data.miktar || 500;
            const akuTipi = data.stok_kodu || data.aku_tipi || 'Standart';
            
            const cardId = `mamulCard_${islemId}`;
            const eskiKart = document.getElementById(cardId);
            if (eskiKart) eskiKart.remove();

            const yeniKartHTML = `
                <div id="${cardId}" class="border rounded p-2 mb-2 shadow-sm position-relative animate__animated animate__fadeInDown">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold text-primary" style="font-size: 0.8rem;"><i class="bi bi-box-seam-fill"></i> Akü Sevkiyatı</span>
                        <span class="badge bg-info" style="font-size: 0.7rem;">Transferde</span>
                    </div>
                    <div class="small fw-bold mb-1">${akuTipi}</div>
                    <div class="d-flex justify-content-between small text-muted mb-1" style="font-size: 0.7rem;">
                        <span>Miktar:</span>
                        <span class="fw-bold text-dark">${miktar} Adet</span>
                    </div>
                    <div class="d-flex justify-content-between small text-muted" style="font-size: 0.7rem;">
                        <span>Kaynak/Hedef:</span>
                        <span class="fw-bold text-dark">${targetBant}</span>
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('afterbegin', yeniKartHTML);
        }

        // 2. Hedef Bandın Durumunu Güncelle (Sadece boşsa AKÜ YOLDA yap)
        if (!isBusy) {
            const bStatus = document.getElementById(`status_${targetBant}`);
            if (bStatus) {
                bStatus.innerText = "AKÜ YOLDA";
                bStatus.className = "fs-4 fw-bold text-info";
            }
            const bProgress = document.getElementById(`progress_${targetBant}`);
            if (bProgress) bProgress.className = "progress-bar bg-info progress-bar-striped progress-bar-animated";
        }

        const bLogistic = document.getElementById(`logistic_${targetBant}`);
        const tasinanUrun = data.stok_kodu || data.aku_tipi || 'Akü';
        if (bLogistic) {
            bLogistic.innerHTML = `<i class="bi bi-truck text-info me-1"></i> Lojistik Akış: <span class="text-info fw-bold">${tasinanUrun}</span> forkliftle taşınıyor.`;
        }

        // Teslimat simülasyonu: Sadece teslim edildi bilgisi verecek, üretime başlatmayacak.
        setTimeout(() => {
            const bStatus = document.getElementById(`status_${targetBant}`);
            if (bStatus && bStatus.innerText === "AKÜ YOLDA") {
                bStatus.innerText = "Normal";
                bStatus.className = "fs-4 fw-bold text-success";
                const bProg = document.getElementById(`progress_${targetBant}`);
                if (bProg) {
                    bProg.className = "progress-bar bg-success";
                    bProg.style.width = "100%";
                }
            }

            if (bLogistic && (!window.bandStates[targetBant] || !window.bandStates[targetBant].busySince)) {
                bLogistic.innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> Bant'a teslim edildi, onay bekliyor.`;
            }

            document.getElementById('mamulStatus').innerText = "TESLİM EDİLDİ";
            document.getElementById('mamulStatus').style.color = "#27ae60";
            document.getElementById('mamulVarisSuresi').innerText = "0 dk (Ulaştı)";
            document.getElementById('mamulVarisSuresi').className = "fw-bold text-success animate__animated animate__pulse animate__infinite";
            document.getElementById('forkliftInfo').innerHTML = `<i class="bi bi-truck text-success"></i> Görev Tamamlandı`;
        }, 4000);
    }
    
    // Senaryo C-1: ŞARJ TALEBİ GELDİ (MAMÜL DEPOYA)
    else if (topic.includes("mamul_depo/sarj_talebi")) {
        statusBadge = `<span class="badge" style="background-color: #f39c12; color: #333;">Şarj Talebi</span>`;
        
        const listContainer = document.getElementById('mamulListContainer');
        if (listContainer) {
            const bosDurum = document.getElementById('bosMamulDurumu');
            if (bosDurum) bosDurum.remove();

            const islemId = data.islem_id;
            const cardId = `mamulCard_${islemId}`;
            
            const yeniKartHTML = `
                <div id="${cardId}" class="border rounded p-2 mb-2 shadow-sm position-relative animate__animated animate__fadeInDown" style="background-color: #fff8e1; border-color: #f39c12 !important;">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold text-danger" style="font-size: 0.8rem;"><i class="bi bi-lightning-charge-fill"></i> Şarj İsteği</span>
                        <span class="badge bg-warning text-dark" style="font-size: 0.7rem;">Şarj Bekliyor</span>
                    </div>
                    <div class="small fw-bold mb-1">${data.aku_tipi || 'Akü'}</div>
                    <div class="d-flex justify-content-between small text-muted mb-1" style="font-size: 0.7rem;">
                        <span>Miktar:</span>
                        <span class="fw-bold text-dark">${data.miktar || 0} Adet</span>
                    </div>
                    <div class="d-flex justify-content-between small text-muted" style="font-size: 0.7rem;">
                        <span>Kaynak/Hedef:</span>
                        <span class="fw-bold text-dark">${data.kaynak_bant || 'Bant ?'}</span>
                    </div>
                    <div class="mt-2 text-end">
                        <button class="btn btn-sm btn-success px-2 py-0" style="font-size: 0.7rem; font-weight: bold;" onclick="sarjaAl(${islemId}, this)">
                            <i class="bi bi-check-circle me-1"></i> Şarja Al
                        </button>
                    </div>
                </div>
            `;
            listContainer.insertAdjacentHTML('afterbegin', yeniKartHTML);
        }
    }
    
    // Senaryo C-2: ŞARJLI AKÜ BANDA GÖNDERİLDİ (MAMÜL DEPODAN)
    else if (topic.includes("mamul_depo/sarj_banta_gonderildi")) {
        statusBadge = `<span class="badge bg-success">Şarjlı Akü Sevkiyatı</span>`;

        const targetBant = data.hedef_bant; // Örn: BANT-1

        // Hedef Bandın Lojistik Bölümünü Canlandır
        const bStatus = document.getElementById(`status_${targetBant}`);
        if (bStatus) {
            bStatus.innerText = "ŞARJLI AKÜ YOLDA";
            bStatus.className = "fs-4 fw-bold text-success";
        }
        const bProgress = document.getElementById(`progress_${targetBant}`);
        if (bProgress) bProgress.className = "progress-bar bg-success progress-bar-striped progress-bar-animated";

        const bLogistic = document.getElementById(`logistic_${targetBant}`);
        if (bLogistic) {
            bLogistic.innerHTML = `<i class="bi bi-truck text-success me-1"></i> <span class="text-success fw-bold">${data.aku_tipi} (${data.miktar} Adet)</span> şarj edildi, teslim ediliyor...`;
        }

        // Teslimat simülasyonu: 4 saniye sonra bant normal durumuna döner
        setTimeout(() => {
            if (document.getElementById(`status_${targetBant}`).innerText === "ŞARJLI AKÜ YOLDA") {
                document.getElementById(`status_${targetBant}`).innerText = "Normal";
                document.getElementById(`status_${targetBant}`).className = "fs-4 fw-bold text-success animate__animated animate__fadeIn";
                document.getElementById(`progress_${targetBant}`).className = "progress-bar bg-success";

                if (document.getElementById(`logistic_${targetBant}`)) {
                    document.getElementById(`logistic_${targetBant}`).innerHTML = `<i class="bi bi-check-circle-fill text-success me-1"></i> Şarjlı Akü Teslim Alındı ✓`;
                }

                // 10 saniye sonra "Bekleniyor..." yazısına geri döner (eğer üretim aktif değilse)
                setTimeout(() => {
                    const logisticEl = document.getElementById(`logistic_${targetBant}`);
                    if (logisticEl && logisticEl.innerHTML.includes("Teslim Alındı") && window.bandStates[targetBant] && !window.bandStates[targetBant].busySince) {
                        logisticEl.innerHTML = `<i class="bi bi-pause-circle text-muted me-1"></i> Bekleniyor...`;
                    }
                }, 10000);
            }
        }, 4000);
    }
    
    // Senaryo C-3: ŞARJ İŞLEMİ ONAYLANDI (Listeden sil)
    else if (topic.includes("mamul_depo/sarj_alindi")) {
        statusBadge = `<span class="badge" style="background-color: #2ecc71;">Şarja Alındı</span>`;
        
        const cardId = `mamulCard_${data.islem_id}`;
        const card = document.getElementById(cardId);
        if (card) {
            card.classList.remove('animate__fadeInDown');
            card.classList.add('animate__zoomOutRight');
            setTimeout(() => {
                card.remove();
                // Eğer liste boşaldıysa
                const listContainer = document.getElementById('mamulListContainer');
                if (listContainer && listContainer.children.length === 0) {
                    listContainer.innerHTML = `
                        <div id="bosMamulDurumu" class="text-center text-muted my-4">
                            <i class="bi bi-box-seam fs-1 text-light"></i>
                            <p class="mb-0 small fw-bold mt-2">Hazır / Görev Bekleniyor</p>
                        </div>
                    `;
                }
            }, 600); // animasyon süresi
        }
    }

    // Senaryo D: BANT YÖNETİMİNDEN ÜRETİM ONAYI VERİLDİ
    else if (topic.includes("fabrika/bant/uretim_basladi")) {
        statusBadge = `<span class="badge" style="background-color: #3498db;">Üretim Başladı</span>`;

        const targetBant = data.hedef_bant; // Örn: BANT-2

        const bState = window.bandStates[targetBant];
        if (bState) {
            bState.busySince = Date.now();
            bState.totalProduced = 0; // Sıfırdan başlıyor
            bState.targetProduced = data.hedef_miktar || 500;
            bState.islemId = data.islem_id; // Üretim tamamlamada kullanmak için sakla
            bState.akuTipi = data.aku_tipi || 'Akü'; // Onaylanan listesi için akü tipini sakla
            bState.finished = false;
        }

        const bStatus = document.getElementById(`status_${targetBant}`);
        if (bStatus) {
            bStatus.innerText = 'MEŞGUL';
            bStatus.style.color = '#e67e22';
            bStatus.className = 'fw-bold';
            bStatus.style.fontSize = '1.1rem';
        }
        const bBadge = document.getElementById(`badge_${targetBant}`);
        if (bBadge) {
            bBadge.className = 'badge bg-warning text-dark';
            bBadge.innerText = `${targetBant.replace('BANT-', 'B')} MEŞGUL`;
        }
        const bProgress = document.getElementById(`progress_${targetBant}`);
        if (bProgress) {
            bProgress.className = 'progress-bar bg-warning progress-bar-striped progress-bar-animated';
            bProgress.style.width = '0%';
        }
        const bProdCount = document.getElementById(`prodCount_${targetBant}`);
        if (bProdCount) {
            bProdCount.innerHTML = `<span class="text-muted">Üretilen: </span><strong class="text-warning">0 / ${data.hedef_miktar || 500} akü</strong>`;
        }
        const actionRow = document.getElementById(`actionRow_${targetBant}`);
        const onaylaContainer = document.getElementById(`onaylaContainer_${targetBant}`);
        if (actionRow) actionRow.style.display = 'none';
        if (onaylaContainer) onaylaContainer.innerHTML = '';

        const bLogistic = document.getElementById(`logistic_${targetBant}`);
        if (bLogistic) {
            bLogistic.innerHTML = `<i class="bi bi-gear-fill text-warning me-1"></i><span class="text-warning fw-bold">Seri Üretim Aktif</span>`;
        }

        const timerEl = document.getElementById(`timer_${targetBant}`);
        if (timerEl) timerEl.innerText = '⏱ 00:00';

        // Modal açıksa güncelle
        if (window.currentActiveModalBand === targetBant) {
            const taskEl = document.getElementById('modalCurrentTask');
            if (taskEl) { taskEl.innerText = 'Montaj / Test Aşamasında'; taskEl.className = 'fw-bold text-warning'; }
            const countEl = document.getElementById('modalProdCount');
            if (countEl) countEl.innerText = `0 / ${data.hedef_miktar || 500}`;
        }

        document.dispatchEvent(new CustomEvent('mamulDepoYeniIslem', { detail: data }));
        if (typeof bantAkisGuncelle === 'function') bantAkisGuncelle(targetBant);
    }
    // Senaryo F: ÜRETİM TAMAMLANDI (Onayla sonrası backend sinyali)
    else if (topic.includes("fabrika/bant/uretim_bitti")) {
        statusBadge = `<span class="badge" style="background-color: #27ae60;">Üretim Bitti</span>`;

        const targetBant = data.hedef_bant;

        const bState = window.bandStates[targetBant];
        if (bState) {
            bState.busySince = null;
            bState.totalProduced = 0;
            bState.targetProduced = 0;
            bState.islemId = null;
            bState.finished = false;
            bState.timerDisplay = '00:00';
        }

        const bStatus = document.getElementById(`status_${targetBant}`);
        if (bStatus) {
            bStatus.innerText = 'AKTİF (Boşta)';
            bStatus.style.color = '#27ae60';
            bStatus.style.fontSize = '1.1rem';
            bStatus.className = 'fw-bold';
        }
        const bBadge = document.getElementById(`badge_${targetBant}`);
        if (bBadge) {
            bBadge.className = 'badge bg-secondary';
            bBadge.innerText = targetBant.replace('BANT-', 'B') + '-OK';
        }
        const bProgress = document.getElementById(`progress_${targetBant}`);
        if (bProgress) {
            bProgress.className = 'progress-bar bg-success';
            bProgress.style.width = '100%';
        }
        const bProdCount = document.getElementById(`prodCount_${targetBant}`);
        if (bProdCount) bProdCount.innerHTML = '';

        const timerEl = document.getElementById(`timer_${targetBant}`);
        if (timerEl) timerEl.innerText = '⏱ 00:00';

        const bLogistic = document.getElementById(`logistic_${targetBant}`);
        if (bLogistic) {
            bLogistic.innerHTML = `<i class="bi bi-clock text-success me-1"></i> Son işlem: <span class="text-success fw-bold">Üretim Tamamlandı ✓</span>`;
            setTimeout(() => {
                if (!window.bandStates[targetBant]?.busySince) {
                    bLogistic.innerHTML = `<span class="text-muted"><i class="bi bi-pause-circle me-1"></i> Bekleniyor...</span>`;
                }
            }, 12000);
        }

        const actionRow = document.getElementById(`actionRow_${targetBant}`);
        if (actionRow) actionRow.style.display = 'none';

        // Modal sıfırla
        if (window.currentActiveModalBand === targetBant) {
            const taskEl = document.getElementById('modalCurrentTask');
            if (taskEl) { taskEl.innerText = 'Boşta (Görev Bekleniyor)'; taskEl.className = 'fw-bold text-success'; }
            const countEl = document.getElementById('modalProdCount');
            if (countEl) countEl.innerText = '0 / 0';
            const mTimerEl = document.getElementById('modalActiveTimer');
            if (mTimerEl) mTimerEl.innerText = '00:00';
        }

        // Etiket kartını kaldır
        const bEtiketCard = document.getElementById(`etiketCard_${targetBant}`);
        if (bEtiketCard) {
            bEtiketCard.remove();
            const listContainer = document.getElementById('etiketListContainer');
            if (listContainer && listContainer.children.length === 0) {
                listContainer.innerHTML = `<div id="bosEtiketDurumu" class="text-center text-muted my-4"><i class="bi bi-box-seam fs-1 text-light"></i><p class="mb-0 small fw-bold mt-2">Hazır / Görev Bekleniyor</p></div>`;
            }
        }

        document.dispatchEvent(new CustomEvent('mamulDepoYeniIslem', { detail: data }));
        if (typeof bantAkisGuncelle === 'function') bantAkisGuncelle(targetBant);
    }

    // Senaryo E: BANT YÖNETİMİNDEN ÜRETİM İPTAL EDİLDİ
    else if (topic.includes("fabrika/bant/uretim_iptal")) {
        statusBadge = `<span class="badge" style="background-color: #e74c3c;">Üretim İptal</span>`;

        const targetBant = data.hedef_bant; // Örn: BANT-2

        const bState = window.bandStates[targetBant];
        if (bState) {
            bState.busySince = null; // Sayacı durdur
            bState.totalProduced = 0;
            bState.timerDisplay = '00:00';
        }

        const bStatus = document.getElementById(`status_${targetBant}`);
        if (bStatus) {
            bStatus.innerText = "Normal";
            bStatus.className = "fs-4 fw-bold text-success animate__animated animate__fadeIn";
        }
        const bProgress = document.getElementById(`progress_${targetBant}`);
        if (bProgress) {
            bProgress.className = "progress-bar bg-success";
            bProgress.style.width = "100%";
        }

        const bLogistic = document.getElementById(`logistic_${targetBant}`);
        if (bLogistic) {
            bLogistic.innerHTML = `<i class="bi bi-x-circle text-danger me-1"></i> Son işlem: <span class="text-danger fw-bold">İptal Edildi</span>`;
            setTimeout(() => {
                if (window.bandStates[targetBant] && !window.bandStates[targetBant].busySince && bLogistic.innerHTML.includes("İptal Edildi")) {
                    bLogistic.innerHTML = `<i class="bi bi-pause-circle text-muted me-1"></i> Bekleniyor...`;
                }
            }, 10000); // 10 saniye sonra "Bekleniyor..." yazısına geri döner
        }

        // Etiket kartını listeden kaldır
        const bEtiketCard = document.getElementById(`etiketCard_${targetBant}`);
        if (bEtiketCard) {
            bEtiketCard.remove();
            
            // Eğer liste boş kaldıysa "Hazır" yazısını geri getir
            const listContainer = document.getElementById('etiketListContainer');
            if (listContainer && listContainer.children.length === 0) {
                listContainer.innerHTML = `
                    <div id="bosEtiketDurumu" class="text-center text-muted my-4">
                        <i class="bi bi-box-seam fs-1 text-light"></i>
                        <p class="mb-0 small fw-bold mt-2">Hazır / Görev Bekleniyor</p>
                    </div>
                `;
            }
        }

        // If modal is open for this band, update it immediately
        if (window.currentActiveModalBand === targetBant) {
            const taskEl = document.getElementById('modalCurrentTask');
            if (taskEl) {
                taskEl.innerText = 'Beklemede';
                taskEl.className = 'fw-bold text-success';
            }
            const countEl = document.getElementById('modalProdCount');
            if (countEl) countEl.innerText = '0 / 500';
            const timerEl = document.getElementById('modalActiveTimer');
            if (timerEl) timerEl.innerText = '00:00';
        }

        document.dispatchEvent(new CustomEvent('mamulDepoYeniIslem', { detail: data }));
        if (typeof bantAkisGuncelle === 'function') bantAkisGuncelle(targetBant);
    }

    // Tablo Satır İçeriğini Bas
    row.innerHTML = `
        <td><strong class="text-secondary">${now}</strong></td>
        <td><span class="font-monospace text-primary small">${topic}</span></td>
        <td>${statusBadge}</td>
        <td>
            <button class="btn btn-sm btn-outline-secondary" onclick="showDetails(${messageCount})">
                <i class="bi bi-search me-1"></i> Detay Gör
            </button>
        </td>
    `;
});

// Detay Gör Modalı
window.showDetails = function (id) {
    const msgData = messageHistory[id];
    let htmlContent = '<ul class="list-group list-group-flush">';
    for (const [key, value] of Object.entries(msgData)) {
        let cleanKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        htmlContent += `<li class="list-group-item d-flex justify-content-between align-items-center py-3">
                            <span class="text-muted small">${cleanKey}:</span> 
                            <span class="fw-bold text-dark">${value}</span>
                        </li>`;
    }
    htmlContent += '</ul>';
    document.getElementById('detailModalBody').innerHTML = htmlContent;
    const detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    detailModal.show();
};


// --- TAKTİKSEL PERSONEL VE VARDİYA VERİTABANI ---
const shiftTeams = {
    "Gündüz Vardiyası": [
        { isim: "Yunus Emre", gorev: "Sistem ve Otomasyon Amiri", tel: "+90 532 111 2233", durum: "Sahada", durumRenk: "success", ikon: "bi-star-fill" },
        { isim: "Selinay", gorev: "Taktik Lojistik Koordinatörü", tel: "+90 554 222 3344", durum: "Sahada", durumRenk: "success", ikon: "bi-headset" },
        { isim: "Ahmet Yılmaz", gorev: "Bant-1 Sorumlusu", tel: "+90 505 333 4455", durum: "İzinde", durumRenk: "danger", ikon: "bi-wrench" },
        { isim: "Kemal Demir", gorev: "Forklift Operatörü (A-Blok)", tel: "+90 544 444 5566", durum: "Sahada", durumRenk: "success", ikon: "bi-truck" }
    ],
    "Akşam Vardiyası": [
        { isim: "Mehmet Kaya", gorev: "Vardiya Amiri", tel: "+90 532 999 8877", durum: "Sahada", durumRenk: "success", ikon: "bi-star-half" },
        { isim: "Ayşe Çelik", gorev: "Etiket Depo Görevlisi", tel: "+90 554 888 7766", durum: "Sahada", durumRenk: "success", ikon: "bi-tags" },
        { isim: "Burak Can", gorev: "Bant-2 Sorumlusu", tel: "+90 505 777 6655", durum: "Raporlu", durumRenk: "warning", ikon: "bi-wrench" }
    ],
    "Gece Vardiyası": [
        { isim: "Hasan Şahin", gorev: "Gece Nöbetçi Amiri", tel: "+90 544 123 4567", durum: "Sahada", durumRenk: "success", ikon: "bi-moon-stars" },
        { isim: "Ali Vefa", gorev: "Acil Bakım Teknisyeni", tel: "+90 532 987 6543", durum: "Sahada", durumRenk: "success", ikon: "bi-tools" }
    ]
};

// Ekip Görüntüleme Motoru
window.showShiftTeam = function () {
    // 1. O anki aktif vardiyayı ekrandan oku
    const currentShift = document.getElementById('activeShift').innerText;

    // 2. Modal başlığını güncelle
    const modalTitle = document.getElementById('teamModalTitle');
    if (modalTitle) modalTitle.innerText = `${currentShift} - Operasyon Ekibi`;

    // 3. İlgili vardiyanın takımını seç
    const team = shiftTeams[currentShift] || [];
    let htmlContent = '';

    // 4. Takımdaki her bir kişi için şık bir kart oluştur
    team.forEach(person => {
        // İzindeyse kartı biraz soluk gösterelim (opacity)
        const opacity = person.durum !== "Sahada" ? "opacity-75" : "";

        htmlContent += `
            <div class="col-md-6 ${opacity}">
                <div class="card border-0 shadow-sm h-100" style="border-left: 4px solid var(--bs-${person.durumRenk}) !important;">
                    <div class="card-body p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="fw-bold mb-0 text-dark"><i class="bi ${person.ikon} text-secondary me-2"></i>${person.isim}</h6>
                            <span class="badge bg-${person.durumRenk}">${person.durum}</span>
                        </div>
                        <div class="text-muted small mb-2">${person.gorev}</div>
                        <div class="bg-light p-2 rounded small border d-flex justify-content-between">
                            <span><i class="bi bi-telephone-fill text-muted me-1"></i> İletişim:</span>
                            <a href="tel:${person.tel.replace(/\s/g, '')}" class="text-decoration-none fw-bold text-dark">${person.tel}</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    if (team.length === 0) {
        htmlContent = `<div class="col-12 text-center text-muted py-4">Bu vardiya için atanmış personel bulunamadı.</div>`;
    }

    // 5. Kartları Modal'ın içine bas ve göster
    document.getElementById('teamModalBody').innerHTML = htmlContent;
    const teamModal = new bootstrap.Modal(document.getElementById('teamModal'));
    teamModal.show();
};

// Bağlantıyı başlat
connection.start().catch(function (err) {
    return console.error(err.toString());
});

window.showSarjModal = function () {
    const sarjModal = new bootstrap.Modal(document.getElementById('sarjModal'));
    sarjModal.show();
};

window.sarjaAl = function (islemId, btnElement) {
    // Butonu hemen kilitleyerek çift tıklamayı önle
    if (btnElement) {
        btnElement.disabled = true;
        btnElement.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>İşleniyor...`;
        btnElement.className = "btn btn-sm btn-secondary px-2 py-0";
    }

    fetch('/Bant/SarjaAl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: islemId })
    })
    .then(res => res.json())
    .then(result => {
        if (result.success) {
            if (btnElement) {
                btnElement.innerHTML = `<i class="bi bi-check-all me-1"></i> Gönderildi → ${result.hedef || ''}`;
                btnElement.className = "btn btn-sm btn-outline-success px-2 py-0";
            }
            // Kart 2 saniye sonra animasyonla silinir (SignalR tetiklediğinde de silinir ama ek güvence)
            const card = document.getElementById(`mamulCard_${islemId}`);
            if (card) {
                setTimeout(() => {
                    card.classList.add('animate__zoomOutRight');
                    setTimeout(() => {
                        card.remove();
                        const listContainer = document.getElementById('mamulListContainer');
                        if (listContainer && listContainer.children.length === 0) {
                            listContainer.innerHTML = `
                                <div id="bosMamulDurumu" class="text-center text-muted my-4">
                                    <i class="bi bi-box-seam fs-1 text-light"></i>
                                    <p class="mb-0 small fw-bold mt-2">Hazır / Görev Bekleniyor</p>
                                </div>`;
                        }
                    }, 500);
                }, 2000);
            }
        } else {
            alert('Hata: ' + (result.message || 'Bilinmeyen hata'));
            if (btnElement) {
                btnElement.disabled = false;
                btnElement.innerHTML = `<i class="bi bi-check-circle me-1"></i> Şarja Al`;
                btnElement.className = "btn btn-sm btn-success px-2 py-0";
            }
        }
    })
    .catch(err => {
        console.error('SarjaAl hatası:', err);
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.innerHTML = `<i class="bi bi-check-circle me-1"></i> Şarja Al`;
            btnElement.className = "btn btn-sm btn-success px-2 py-0";
        }
    });
};


window.showReportModal = function () {
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();
};

window.saveManualReport = function () {
    // Form verilerini topla
    const akuTipi = document.getElementById('akuTipiSelect').value;
    const rafKonumu = document.getElementById('rafKonumuInput').value;
    const hedefBant = document.getElementById('hedefBantSelect').value;

    if (!akuTipi || !rafKonumu) {
        alert("Lütfen akü tipini ve raf konumunu eksiksiz girin!");
        return;
    }

    // API'ye gönderilecek JSON Paketi
    const payload = {
        akuTipi: akuTipi,
        rafKonumu: rafKonumu,
        hedefBant: hedefBant
    };

    // Arka uca (LogController) POST isteği at
    fetch('/api/log', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    })
        .then(response => {
            if (response.ok) {
                // Modalı gizle ve formu temizle
                const modal = bootstrap.Modal.getInstance(document.getElementById('reportModal'));
                modal.hide();
                document.getElementById('manuelRaporFormu').reset();

                // Başarılı kaydı canlı tabloya yeşil satır olarak ekle
                const noDataRow = document.getElementById('noDataRow');
                if (noDataRow) noDataRow.remove();

                const tableBody = document.getElementById('logTableBody');
                const row = tableBody.insertRow(0);
                const now = new Date().toLocaleTimeString('tr-TR');

                row.innerHTML = `
                <td><strong class="text-secondary">${now}</strong></td>
                <td><span class="font-monospace text-success small">fabrika/mamul_depo/manuel_rapor</span></td>
                <td><span class="badge bg-success">Manuel Kayıt (v9.000)</span></td>
                <td>${hedefBant} hattına ${rafKonumu} rafından ${akuTipi} sevk edildi.</td>
            `;
            } else {
                alert("Veritabanına kaydedilirken bir hata oluştu.");
            }
        })
        .catch(error => console.error("Hata:", error));
};

// Sayfa yüklendiğinde veritabanındaki geçmiş kayıtları tabloya çek
document.addEventListener("DOMContentLoaded", function () {

    // Rastgele otomatik başlangıç mantığı iptal edildi, bantlar varsayılan olarak Normal başlayacak.

    // 2. Logları Getir
    fetch('/api/log')
        .then(response => response.json())
        .then(data => {
            if (data && data.length > 0) {
                const noDataRow = document.getElementById('noDataRow');
                if (noDataRow) noDataRow.remove();

                const tableBody = document.getElementById('logTableBody');

                // Gelen her bir veritabanı kaydı için tabloya satır ekle
                data.forEach(log => {
                    const row = tableBody.insertRow();
                    const logTime = new Date(log.timestamp).toLocaleTimeString('tr-TR');

                    let statusBadge = "";
                    let islemMetni = "";

                    if (log.version === "MQTT") {
                        statusBadge = `<span class="badge" style="background-color: #8e44ad;">Otomatik Sistem</span>`;
                        islemMetni = `Hedef Bant: ${log.hedefBant || 'Bilinmiyor'} | Aksiyon: ${log.akuTipi || 'Akü'} (Forklift: ${log.forkliftId || 'Bilinmiyor'}) sevkiyatı yapıldı.`;
                    } else {
                        statusBadge = `<span class="badge bg-success">Manuel Kayıt (v${log.version || "9.000"})</span>`;
                        islemMetni = `${log.hedefBant} hattına ${log.rafKonumu} rafından ${log.akuTipi} sevk edildi.`;
                    }

                    row.innerHTML = `
                        <td><strong class="text-secondary">${logTime}</strong></td>
                        <td><span class="font-monospace text-success small">${log.topic}</span></td>
                        <td>${statusBadge}</td>
                        <td>${islemMetni}</td>
                    `;
                });
            }
        })
        .catch(err => console.error("Geçmiş loglar çekilemedi:", err));
});

// ===== YARDIMCI MOTOR: Tarih Formatını (29.06.2026 08:52) Milisaniyeye Çevirir =====
window.parseDateToMs = function (dateStr) {
    if (!dateStr) return Date.now();
    try {
        if (dateStr.includes('.')) {
            const parts = dateStr.split(' ');
            if (parts.length >= 2) {
                const d = parts[0].split('.'); // [29, 06, 2026]
                if (d.length === 3) {
                    const timeStr = parts[1].split(':').length === 2 ? parts[1] + ":00" : parts[1];
                    const iso = `${d[2]}-${d[1]}-${d[0]}T${timeStr}`;
                    const parsed = new Date(iso).getTime();
                    if (!isNaN(parsed)) return parsed;
                }
            }
        }
        const fallback = new Date(dateStr).getTime();
        return isNaN(fallback) ? Date.now() : fallback;
    } catch (e) {
        return Date.now();
    }
};

// === AKILLANDIRILMIŞ BANT DETAY FONKSİYONU ===
window.bantDetayGoster = function (bant) {
    document.getElementById('bantDetayBaslik').innerText = `${bant} — Akü ve İşlem Listesi`;
    document.getElementById('bantDetayYukleniyor').style.display = '';
    document.getElementById('bantDetayIcerik').style.display = 'none';
    document.getElementById('bantDetayBos').style.display = 'none';

    // Sisteme Hangi Bandın Açık Olduğunu Bildir
    window.currentActiveModalBand = bant;

    // Pencereyi aç
    const modal = new bootstrap.Modal(document.getElementById('bantDetayModal'));
    modal.show();

    // Veritabanından verileri çek
    fetch(`/MamulDepo/BantIslemleri?bant=${encodeURIComponent(bant)}`)
        .then(r => r.json())
        .then(data => {
            document.getElementById('bantDetayYukleniyor').style.display = 'none';
            const tablo = document.getElementById('bantDetayTablo');
            tablo.innerHTML = '';

            const bState = window.bandStates[bant];
            const timerEl = document.getElementById('modalActiveTimer');
            const countEl = document.getElementById('modalProdCount');

            if (!data || data.length === 0) {
                document.getElementById('bantDetayBos').style.display = '';
                if (timerEl) timerEl.innerText = "00:00";
                if (countEl) countEl.innerText = "0";
                return;
            }

            // --- 1. SİSTEMİ VERİTABANI İLE SENKRONİZE ET VE TARİHİ ÇÖZ ---
            const uretilenler = data.filter(x => x.islemDurumu === 'Üretiliyor');

            if (uretilenler.length > 0) {
                const aktifKayit = uretilenler[0];

                if (!bState.busySince) {
                    // YENİ TARİH MOTORUNU KULLANARAK SAYACI GEÇMİŞTEN BAŞLAT
                    const past = window.parseDateToMs(aktifKayit.islemZamani);
                    bState.busySince = past;

                    // Aradan geçen süreye göre üretilmiş akü sayısını bul
                    const uretilenAdet = Math.floor((Date.now() - past) / 10000);
                    bState.totalProduced = uretilenAdet > 0 && !isNaN(uretilenAdet) ? uretilenAdet : 0;
                    bState.targetProduced = aktifKayit.miktar || 500;
                }

                if (countEl) countEl.innerText = `${bState.totalProduced} / ${bState.targetProduced}`;
            } else {
                // Aktif bir iş yoksa sayacı kapa
                bState.busySince = null;
                if (timerEl) timerEl.innerText = "00:00";
                if (countEl) countEl.innerText = "0";
            }

            // --- 2. TABLOYU DOLDUR VE ANİMASYONLARI EKLE ---
            data.forEach(item => {
                let badgeClass = 'bg-secondary';
                let textClass = '';

                if (item.islemDurumu === 'Beklemede') {
                    badgeClass = 'bg-warning';
                    textClass = 'text-dark';
                } else if (item.islemDurumu === 'İptal Edildi') {
                    badgeClass = 'bg-danger';
                } else if (item.islemDurumu === 'Üretiliyor') {
                    // Yanıp sönen yeşil animasyon eklendi!
                    badgeClass = 'bg-success animate__animated animate__pulse animate__infinite';
                } else if (item.islemDurumu === 'Üretildi') {
                    badgeClass = 'bg-success';
                }

                const durumBadge = `<span class="badge ${badgeClass} ${textClass}">${item.islemDurumu}</span>`;

                tablo.innerHTML += `
                    <tr>
                        <td><code class="text-primary">${item.stokKodu || '—'}</code></td>
                        <td class="fw-semibold">${item.malzemeAciklamasi || '—'}</td>
                        <td><span class="badge bg-secondary">${item.lokasyonNo || '—'}</span></td>
                        <td><strong>${item.ulkeSeriNo || '—'}</strong></td>
                        <td>${durumBadge}</td>
                        <td class="text-muted small">${item.islemZamani}</td>
                    </tr>`;
            });

            document.getElementById('bantDetayIcerik').style.display = '';
            
            // Eğer daha önceden arama kutularına bir şey yazılmışsa, tabloyu yeniden filtrele
            if (window.filterBantTablo) {
                window.filterBantTablo();
            }
        });
};

// === 3. PENCERE KAPANINCA AKTİF BANT BİLGİSİNİ TEMİZLE ===
document.addEventListener('DOMContentLoaded', function () {
    const detailModalEl = document.getElementById('bantDetayModal');
    if (detailModalEl) {
        detailModalEl.addEventListener('hidden.bs.modal', function () {
            window.currentActiveModalBand = null;
        });
    }
});

// === 4. TABLO ARAMA (FİLTRELEME) MOTORU ===
window.filterBantTablo = function() {
    const inputs = document.querySelectorAll('.bant-search');
    const filters = Array.from(inputs).map(input => input.value.toLowerCase());
    
    const tbody = document.getElementById('bantDetayTablo');
    if (!tbody) return;
    
    const rows = tbody.getElementsByTagName('tr');
    
    for (let i = 0; i < rows.length; i++) {
        let rowVisible = true;
        const cells = rows[i].getElementsByTagName('td');
        
        for (let j = 0; j < filters.length; j++) {
            if (filters[j] && cells[j]) {
                const cellText = cells[j].textContent || cells[j].innerText;
                if (cellText.toLowerCase().indexOf(filters[j]) === -1) {
                    rowVisible = false;
                    break;
                }
            }
        }
        rows[i].style.display = rowVisible ? '' : 'none';
    }
};

document.addEventListener('input', function(e) {
    if (e.target && e.target.classList.contains('bant-search')) {
        window.filterBantTablo();
    }
});