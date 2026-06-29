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
    if (!tableBody) return;
    
    const row = tableBody.insertRow(0);
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
        
        // 1. Etiket Depo Kartını Güncelle
        document.getElementById('depoStatus').innerText = "SEVKİYAT YAPILDI";
        document.getElementById('depoStatus').className = "fs-4 fw-bold text-success";
        document.getElementById('agvInfo').innerHTML = `<span class="spinner-border spinner-border-sm text-success me-1"></span> <strong>${data.tasiyici_arac_id}</strong> Yolda`;
        document.getElementById('depoLastAction').innerText = `Son Hareket: ${targetBant} hattına malzeme çıkışı sağlandı.`;
        
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
        }, 4000);
    }
    
    // Senaryo C: MAMÜL DEPOSUNDAN BANTLARA AKÜ SEVKİYATI (FORKLİFT)
    else if (topic.includes("mamul_depo/sevkiyat")) {
        statusBadge = `<span class="badge" style="background-color: #8e44ad;">Akü Sevkiyatı</span>`;
        
        const targetBant = data.hedef_bant; // Örn: BANT-2
        
        // 1. Mamül Depo Kartını Güncelle (Mor Tema)
        document.getElementById('mamulStatus').innerText = "TRANSFERDE";
        document.getElementById('mamulStatus').style.color = "#8e44ad";
        document.getElementById('forkliftInfo').innerHTML = `<i class="bi bi-truck text-primary animate__animated animate__bounce animate__infinite"></i> <strong>${data.forklift_id}</strong> Aktif`;
        document.getElementById('mamulLastAction').innerText = `Son Rapor: [${data.cikis_bolumu}] konumundan ${targetBant} hattına yükleme yapıldı.`;
        
        // 2. Hedef Bandın Durumunu Güncelle
        const bStatus = document.getElementById(`status_${targetBant}`);
        if (bStatus) {
            bStatus.innerText = "AKÜ YOLDA";
            bStatus.className = "fs-4 fw-bold text-info";
        }
        const bProgress = document.getElementById(`progress_${targetBant}`);
        if (bProgress) bProgress.className = "progress-bar bg-info progress-bar-striped progress-bar-animated";
        
        const bLogistic = document.getElementById(`logistic_${targetBant}`);
        if (bLogistic) {
            bLogistic.innerHTML = `<i class="bi bi-lightning-charge-fill text-info me-1"></i> Lojistik Akış: <span class="text-info fw-bold">${data.aku_tipi}</span> forkliftle taşınıyor.`;
        }

        // Teslimat simülasyonu: 4 saniye sonra bant eski normal durumuna döner
        setTimeout(() => {
            if (document.getElementById(`status_${targetBant}`).innerText === "AKÜ YOLDA") {
                document.getElementById(`status_${targetBant}`).innerText = "Normal";
                document.getElementById(`status_${targetBant}`).className = "fs-4 fw-bold text-success";
                document.getElementById(`progress_${targetBant}`).className = "progress-bar bg-success";
                document.getElementById(`progress_${targetBant}`).style.width = "100%";
                document.getElementById(`logistic_${targetBant}`).querySelector(`#akis_${targetBant}`) &&
                    (document.getElementById(`akis_${targetBant}`).innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle-fill me-1"></i>Teslim Edildi</span>`);
                document.getElementById('mamulStatus').innerText = "TESLİM EDİLDİ";
                document.getElementById('mamulStatus').style.color = "#27ae60";
            }
        }, 4000);

        // Bant akış widget'ını anlık güncelle (Pages/Index.cshtml'deki bantAkisGuncelle'yi tetikle)
        document.dispatchEvent(new CustomEvent('mamulDepoYeniIslem', { detail: data }));
        // Eğer bantAkisGuncelle global scope'ta tanımlıysa direkt çağır
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
window.showDetails = function(id) {
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
window.showShiftTeam = function() {
    // 1. O anki aktif vardiyayı ekrandan oku
    const currentShift = document.getElementById('activeShift').innerText;
    
    // 2. Modal başlığını güncelle
    const modalTitle = document.getElementById('teamModalTitle');
    if(modalTitle) modalTitle.innerText = `${currentShift} - Operasyon Ekibi`;
    
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

    if(team.length === 0) {
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

window.showReportModal = function() {
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    modal.show();
};

window.saveManualReport = function() {
    // Form verilerini topla
    const akuTipi = document.getElementById('akuTipiSelect').value;
    const rafKonumu = document.getElementById('rafKonumuInput').value;
    const hedefBant = document.getElementById('hedefBantSelect').value;

    if(!akuTipi || !rafKonumu) {
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
        if(response.ok) {
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
document.addEventListener("DOMContentLoaded", function() {
    fetch('/api/log')
        .then(response => response.json())
        .then(data => {
            if(data && data.length > 0) {
                const noDataRow = document.getElementById('noDataRow');
                if (noDataRow) noDataRow.remove();

                const tableBody = document.getElementById('logTableBody');
                
                // Gelen her bir veritabanı kaydı için tabloya satır ekle
                data.forEach(log => {
                    const row = tableBody.insertRow();
                    const logTime = new Date(log.timestamp).toLocaleTimeString('tr-TR');
                    
                    let statusBadge = `<span class="badge bg-success">Manuel Kayıt (v${log.version || "9.000"})</span>`;
                    let islemMetni = `${log.hedefBant} hattına ${log.rafKonumu} rafından ${log.akuTipi} sevk edildi.`;

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