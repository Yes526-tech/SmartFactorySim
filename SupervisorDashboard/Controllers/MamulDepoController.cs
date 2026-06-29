using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SupervisorDashboard.Models;
using SupervisorDashboard.Data;
using SupervisorDashboard.Hubs;
using System.Text.Json;
using MQTTnet;
using MQTTnet.Client;

namespace SupervisorDashboard.Controllers
{
    public class MamulDepoController : Controller
    {
        private readonly AppDbContext _context;
        private readonly IHubContext<FactoryHub> _hubContext;

        public MamulDepoController(AppDbContext context, IHubContext<FactoryHub> hubContext)
        {
            _context = context;
            _hubContext = hubContext;
        }

        // TEK SAYFA: Hem Listeleme Hem Modal İçin
        public IActionResult Index()
        {
            var veriler = _context.MamulDepoIslemleri.OrderByDescending(x => x.IslemZamani).ToList();
            return View(veriler);
        }

        // API: Belirli bir bandın aktif işlemlerini JSON olarak döndür (dashboard için)
        [HttpGet]
        public IActionResult BantIslemleri(string bant)
        {
            var islemler = _context.MamulDepoIslemleri
                .Where(x => x.HedefBant == bant)
                .OrderByDescending(x => x.IslemZamani)
                .Select(x => new {
                    x.Id,
                    x.StokKodu,
                    x.MalzemeAciklamasi,
                    x.LokasyonNo,
                    x.UlkeSeriNo,
                    x.IslemDurumu,
                    IslemZamani = x.IslemZamani.ToString("dd.MM.yyyy HH:mm")
                })
                .ToList();

            return Json(islemler);
        }

        // API: Tüm bantların işlem sayılarını döndür (dashboard widget için)
        [HttpGet]
        public IActionResult BantOzet()
        {
            var ozet = new[] { "BANT-1", "BANT-2", "BANT-3" }
                .Select(bant => new {
                    bant,
                    islemSayisi = _context.MamulDepoIslemleri.Count(x => x.HedefBant == bant),
                    sonIslem = _context.MamulDepoIslemleri
                        .Where(x => x.HedefBant == bant)
                        .OrderByDescending(x => x.IslemZamani)
                        .Select(x => x.MalzemeAciklamasi)
                        .FirstOrDefault() ?? "Kayıt yok"
                })
                .ToList();

            return Json(ozet);
        }

        // Modal İçindeki Formdan Gelen Veriyi Yakalama + SignalR Bildirimi
        [HttpPost]
        public async Task<IActionResult> Ekle(MamulDepoIslem yeniIslem)
        {
            // DB Kaydı - her zaman yapılır (ModelState bağımsız)
            yeniIslem.UlkeSeriNo = yeniIslem.UlkeSeriNo?.ToUpper();
            yeniIslem.IslemZamani = DateTime.Now;
            if (string.IsNullOrEmpty(yeniIslem.IslemDurumu))
                yeniIslem.IslemDurumu = "Beklemede";

            _context.MamulDepoIslemleri.Add(yeniIslem);
            _context.SaveChanges();

            // SignalR - ayrı try-catch, başarısız olursa DB kaydını etkilemez
            try
            {
                var payload = JsonSerializer.Serialize(new {
                    hedef_bant = yeniIslem.HedefBant,
                    stok_kodu = yeniIslem.StokKodu,
                    aku_tipi = yeniIslem.MalzemeAciklamasi,
                    ulke_seri_no = yeniIslem.UlkeSeriNo,
                    lokasyon = yeniIslem.LokasyonNo,
                    islem_durumu = yeniIslem.IslemDurumu,
                    forklift_id = "FRK-MANUEL",
                    cikis_bolumu = yeniIslem.LokasyonNo ?? "DEPO"
                });

                var topic = $"fabrika/mamul_depo/sevkiyat/{yeniIslem.HedefBant?.ToLower().Replace("-", "")}";

                await _hubContext.Clients.All.SendAsync(
                    "ReceiveFactoryData",
                    topic,
                    payload
                );

                // MQTT'ye de gönder
                try
                {
                    var mqttFactory = new MqttFactory();
                    using var mqttClient = mqttFactory.CreateMqttClient();
                    var options = new MqttClientOptionsBuilder()
                        .WithTcpServer("127.0.0.1", 1883)
                        .WithClientId($"DASHBOARD-PUB-{Guid.NewGuid()}")
                        .Build();

                    await mqttClient.ConnectAsync(options);
                    var applicationMessage = new MqttApplicationMessageBuilder()
                        .WithTopic(topic)
                        .WithPayload(payload)
                        .Build();
                    await mqttClient.PublishAsync(applicationMessage);
                    await mqttClient.DisconnectAsync();
                }
                catch { /* MQTT hatası kayıt işlemini engellemez */ }
            }
            catch { /* SignalR hatası kayıt işlemini engellemez */ }

            return RedirectToAction("Index");
        }
    }
}