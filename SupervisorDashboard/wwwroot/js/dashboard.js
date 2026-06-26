// 1. Canlı Saat ve Dinamik Vardiya Güncelleme (Otomatik Motor)
setInterval(() => {
    const now = new Date();
    
    // Saati Güncelle
    const liveClock = document.getElementById('liveClock');
    if (liveClock) {
        liveClock.innerText = now.toLocaleString('tr-TR');
    }

    // Vardiya Hesaplama Mantığı (0-24 Saat Formatı)
    const currentHour = now.getHours();
    let shiftName = "";
    let shiftColorClass = "";

    if (currentHour >= 8 && currentHour < 16) {
        shiftName = "Gündüz Vardiyası";
        shiftColorClass = "text-primary"; // Mavi
    } else if (currentHour >= 16 && currentHour < 24) {
        shiftName = "Akşam Vardiyası";
        shiftColorClass = "text-warning"; // Turuncu/Sarı
    } else {
        shiftName = "Gece Vardiyası";
        shiftColorClass = "text-info";    // Açık Mavi
    }

    // Ekrana Bas
    const activeShiftElement = document.getElementById('activeShift');
    if (activeShiftElement) {
        activeShiftElement.innerText = shiftName;
        // Vardiyaya göre metin rengini de dinamik değiştiriyoruz
        activeShiftElement.className = shiftColorClass + " fw-bold";
    }
}, 1000);

// 2. SignalR Bağlantısını Başlat
const connection = new signalR.HubConnectionBuilder()
    .withUrl("/factoryHub")
    .build();

let messageCount = 0;
let messageHistory = []; // Gelen verileri butonla eşleştirmek için hafızada tutuyoruz

connection.on("ReceiveFactoryData", function (topic, payload) {
    messageCount++;
    const logCounter = document.getElementById('logCounter');
    if (logCounter) logCounter.innerText = messageCount + " Mesaj";

    const noDataRow = document.getElementById('noDataRow');
    if (noDataRow) noDataRow.remove();

    const data = JSON.parse(payload);
    const now = new Date().toLocaleTimeString('tr-TR');
    
    // Mesajı hafızaya kaydet
    messageHistory[messageCount] = data;

    const tableBody = document.getElementById('logTableBody');
    if (!tableBody) return;
    
    const row = tableBody.insertRow(0);
    let statusBadge = `<span class="badge bg-info">Bilgi</span>`;
    
    // --- GERÇEK ZAMANLI OTOMASYON VE GÖRSELLEŞTİRME MANTIĞI ---
    if (topic.includes("talep")) {
        statusBadge = `<span class="badge bg-danger">Malzeme Talebi</span>`;
        
        document.getElementById('bant2Status').innerText = "MALZEME EKSİK";
        document.getElementById('bant2Status').className = "fs-4 fw-bold text-danger";
        
        const badge = document.getElementById('bant2Badge');
        badge.innerText = data.durum_kodu;
        badge.className = "badge bg-danger";
        
        const progressBar = document.getElementById('bant2Progress');
        progressBar.style.width = data.kalan_seviye_yuzde + "%";
        progressBar.className = "progress-bar bg-danger";
        
        // Not: Otomatik saat motoru ile çakışmaması için data.vardiya_id ataması buradan kaldırıldı.
    } 
    else if (topic.includes("aksiyon")) {
        statusBadge = `<span class="badge bg-success">Lojistik Sevkiyat</span>`;
        
        document.getElementById('depoStatus').innerText = data.aksiyon_durumu;
        document.getElementById('depoStatus').className = "fs-4 fw-bold text-success";
        document.getElementById('agvInfo').innerHTML = `<strong class="text-success">${data.tasiyici_arac_id}</strong> Yolda`;
        document.getElementById('depoLastAction').innerText = `Son Hareket: ${data.hedef_nokta}'ye malzeme çıkışı yapıldı.`;
        
        setTimeout(() => {
            document.getElementById('bant2Status').innerText = "MALZEME YOLDA";
            document.getElementById('bant2Status').className = "fs-4 fw-bold text-warning";
            document.getElementById('bant2Badge').className = "badge bg-warning text-dark";
            document.getElementById('bant2Progress').className = "progress-bar bg-warning progress-bar-striped progress-bar-animated";
        }, 500);
    }

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

// Detay Butonuna Tıklanınca Çalışacak Veri Düzenleme Motoru
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

// Bağlantıyı başlat
connection.start().catch(function (err) {
    return console.error(err.toString());
});