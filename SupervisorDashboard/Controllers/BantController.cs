using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SupervisorDashboard.Models;
using SupervisorDashboard.Data;
using SupervisorDashboard.Hubs;
using System.Text.Json;

namespace SupervisorDashboard.Controllers
{
    public class BantController : Controller
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<FactoryHub> _hubContext;

        public BantController(AppDbContext context, IHubContext<FactoryHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // Listeleme Sayfası
        public IActionResult Index()
        {
            var akuler = _context.MamulDepoIslemleri
                .Where(x => x.IslemDurumu == "Beklemede" || x.IslemDurumu == "Üretiliyor")
                .OrderBy(x => x.IslemZamani)
                .ToList();
                
            return View(akuler);
        }

        // Onay İşlemi
        [HttpPost]
        public async Task<IActionResult> Onayla(int id)
        {
            var islem = await _context.MamulDepoIslemleri.FindAsync(id);
            if (islem != null)
            {
                // Durumu güncelle
                islem.IslemDurumu = "Üretiliyor";
                await _context.SaveChangesAsync();

                // Dashboard'a üretim başladı sinyali gönder
                var payload = JsonSerializer.Serialize(new
                {
                    islem_id = islem.Id,
                    hedef_bant = islem.HedefBant,
                    stok_kodu = islem.StokKodu,
                    aku_tipi = islem.MalzemeAciklamasi,
                    islem_durumu = islem.IslemDurumu,
                    hedef_miktar = islem.Miktar,
                    zaman = DateTime.Now.ToString("dd.MM.yyyy HH:mm:ss")
                });

                await _hubContext.Clients.All.SendAsync(
                    "ReceiveFactoryData",
                    "fabrika/bant/uretim_basladi",
                    payload
                );
            }
            
            return RedirectToAction("Index");
        }

        // Üretimi Tamamlama İşlemi (Dashboard'daki Onayla butonundan çağrılır)
        [HttpPost]
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> UretimTamamla([FromBody] JsonElement data)
        {
            int? id = null;
            if (data.TryGetProperty("id", out var idProp) && idProp.ValueKind == JsonValueKind.Number)
            {
                id = idProp.GetInt32();
            }

            MamulDepoIslem? islem = null;

            if (id.HasValue && id.Value > 0)
            {
                islem = await _context.MamulDepoIslemleri.FindAsync(id.Value);
            }
            
            // Eğer id ile bulunamadıysa veya id yoksa, bantId üzerinden aktif işlemi bul
            if (islem == null && data.TryGetProperty("bantId", out var bantIdProp))
            {
                string? bantId = bantIdProp.GetString();
                islem = _context.MamulDepoIslemleri
                    .FirstOrDefault(m => m.HedefBant == bantId && m.IslemDurumu == "Üretiliyor");
            }

            if (islem == null)
            {
                return NotFound(new { success = false, message = "Bantta aktif bir işlem bulunamadı." });
            }

            if (islem.IslemDurumu != "Üretiliyor")
                return BadRequest(new { success = false, message = $"Bu işlem zaten '{islem.IslemDurumu}' durumunda." });

            // Durumu güncelle
            islem.IslemDurumu = "Tamamlandı";
            
            // İlgili banttaki etiket siparişlerini de tamamlandı yap
            var etiketler = _context.EtiketDepoIslemleri
                .Where(e => e.HedefBant == islem.HedefBant && e.IslemDurumu != "Tamamlandı" && e.IslemDurumu != "İptal Edildi")
                .ToList();
            foreach (var etiket in etiketler)
            {
                etiket.IslemDurumu = "Tamamlandı";
            }
            
            await _context.SaveChangesAsync();

            var payload = JsonSerializer.Serialize(new
            {
                islem_id = islem.Id,
                hedef_bant = islem.HedefBant,
                aku_tipi = islem.MalzemeAciklamasi,
                miktar = islem.Miktar,
                zaman = DateTime.Now.ToString("dd.MM.yyyy HH:mm:ss")
            });

            await _hubContext.Clients.All.SendAsync(
                "ReceiveFactoryData",
                "fabrika/bant/uretim_bitti",
                payload
            );

            return Ok(new { success = true, message = "Üretim başarıyla tamamlandı.", bant = islem.HedefBant });
        }

        // İptal İşlemi
        [HttpPost]
        public async Task<IActionResult> Iptal(int id)
        {
            var islem = await _context.MamulDepoIslemleri.FindAsync(id);
            if (islem != null && islem.IslemDurumu == "Üretiliyor")
            {
                // Durumu iptal olarak güncelle
                islem.IslemDurumu = "İptal Edildi";
                
                // İlgili banttaki etiket siparişlerini de iptal yap
                var etiketler = _context.EtiketDepoIslemleri
                    .Where(e => e.HedefBant == islem.HedefBant && e.IslemDurumu != "Tamamlandı" && e.IslemDurumu != "İptal Edildi")
                    .ToList();
                foreach (var etiket in etiketler)
                {
                    etiket.IslemDurumu = "İptal Edildi";
                }
                
                await _context.SaveChangesAsync();

                // Dashboard'a üretim iptal sinyali gönder
                var payload = JsonSerializer.Serialize(new
                {
                    islem_id = islem.Id,
                    hedef_bant = islem.HedefBant,
                    stok_kodu = islem.StokKodu,
                    aku_tipi = islem.MalzemeAciklamasi,
                    islem_durumu = islem.IslemDurumu,
                    zaman = DateTime.Now.ToString("dd.MM.yyyy HH:mm:ss")
                });

                await _hubContext.Clients.All.SendAsync(
                    "ReceiveFactoryData",
                    "fabrika/bant/uretim_iptal",
                    payload
                );
            }
            
            return RedirectToAction("Index");
        }

        // Şarj Talebi İşlemi
        [HttpPost]
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> SarjTalebi(string AkuTipi, int Miktar, string KaynakBant, string HedefBant)
        {
            var islem = new MamulDepoIslem
            {
                StokKodu = "SARJ-" + new Random().Next(1000, 9999),
                MalzemeAciklamasi = AkuTipi,
                Miktar = Miktar,
                HedefBant = "Mamül Depo (Şarj)",
                LokasyonNo = HedefBant,   // Şarj sonrası gönderilecek bant
                LokasyonAdi = KaynakBant, // Şarjı isteyen bant/konum
                IslemDurumu = "Şarj Bekliyor",
                IslemZamani = DateTime.Now
            };

            _context.MamulDepoIslemleri.Add(islem);
            await _context.SaveChangesAsync();

            var payload = JsonSerializer.Serialize(new
            {
                islem_id = islem.Id,
                aku_tipi = AkuTipi,
                miktar = Miktar,
                kaynak_bant = KaynakBant,
                hedef_bant = HedefBant, // gönderilecek bant
                zaman = DateTime.Now.ToString("dd.MM.yyyy HH:mm:ss")
            });

            await _hubContext.Clients.All.SendAsync(
                "ReceiveFactoryData",
                "fabrika/mamul_depo/sarj_talebi",
                payload
            );

            return Redirect("/"); // Dashboard'a geri dön (modal kapanır)
        }


        // Şarja Al (Onayla) İşlemi — Şarj edilecek aküyü hedef banda gönderir
        [HttpPost]
        [IgnoreAntiforgeryToken]
        public async Task<IActionResult> SarjaAl([FromBody] JsonElement data)
        {
            if (!data.TryGetProperty("id", out var idElement))
                return BadRequest(new { success = false, message = "Geçersiz veri." });

            int id = idElement.GetInt32();
            var islem = await _context.MamulDepoIslemleri.FindAsync(id);
            
            if (islem == null)
                return NotFound(new { success = false, message = "İşlem bulunamadı." });

            if (islem.IslemDurumu != "Şarj Bekliyor")
                return BadRequest(new { success = false, message = $"Bu işlem '{islem.IslemDurumu}' durumunda." });

            // Hedef bant: form'dan gelen HedefBant (LokasyonNo alanında saklandı)
            var hedefBant = islem.LokasyonNo ?? islem.LokasyonAdi ?? "BANT-1";
            
            islem.IslemDurumu = "Şarja Gönderildi";
            await _context.SaveChangesAsync();

            // Dashboard'a: şarj tamamlandı ve bant X'e gönderiliyor sinyali
            var payload = JsonSerializer.Serialize(new
            {
                islem_id = id,
                aku_tipi = islem.MalzemeAciklamasi,
                miktar = islem.Miktar,
                hedef_bant = hedefBant,
                kaynak = "Şarj Deposu",
                zaman = DateTime.Now.ToString("dd.MM.yyyy HH:mm:ss")
            });

            // 1. Şarj alındı sinyali (listeyi temizler)
            await _hubContext.Clients.All.SendAsync("ReceiveFactoryData", "fabrika/mamul_depo/sarj_alindi", payload);

            // 2. Bant'a şarjlı akü gönderildi sinyali (bant widget'ını günceller)
            await _hubContext.Clients.All.SendAsync("ReceiveFactoryData", "fabrika/mamul_depo/sarj_banta_gonderildi", payload);

            return Ok(new { success = true, message = $"Şarj edilmiş aküler {hedefBant} bandına gönderildi.", hedef = hedefBant });
        }

        // Etiket Depo Sevkiyatı (Bant Besleme)
        [HttpPost]
        public async Task<IActionResult> EtiketSevkiyat(string FirmaMarkasi, int Miktar, string HedefBant)
        {
            var agvId = "AGV-" + new Random().Next(10, 99);
            
            // Veritabanına kaydet
            var yeniIslem = new EtiketDepoIslem
            {
                FirmaMarkasi = FirmaMarkasi,
                Miktar = Miktar,
                HedefBant = HedefBant,
                IslemDurumu = "Sevkiyat Yapıldı",
                IslemZamani = DateTime.Now,
                TasiyiciAracId = agvId,
                KalanSeviyeYuzde = 100
            };
            
            _context.EtiketDepoIslemleri.Add(yeniIslem);
            await _context.SaveChangesAsync();

            var payload = JsonSerializer.Serialize(new
            {
                hedef_bant = HedefBant,
                etiket_tipi = FirmaMarkasi,
                miktar = Miktar,
                tasiyici_arac_id = agvId,
                kalan_seviye_yuzde = 100 // Yeni sevkiyat geldiği için %100 olarak başlıyor varsayıyoruz
            });

            await _hubContext.Clients.All.SendAsync(
                "ReceiveFactoryData",
                "fabrika/etiket_depo/sevkiyat",
                payload
            );

            return Redirect("/"); // Ana sayfaya (Dashboard) geri dön
        }
    }
}
