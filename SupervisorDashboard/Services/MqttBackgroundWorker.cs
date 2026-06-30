using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using MQTTnet;
using MQTTnet.Client; // Kütüphanenin tam isim uzayı
using SupervisorDashboard.Hubs;
using SupervisorDashboard.Data;
using SupervisorDashboard.Models;

namespace SupervisorDashboard.Services
{
    public class MqttBackgroundWorker : BackgroundService
    {
        private readonly IHubContext<FactoryHub> _hubContext;
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IMqttClient _mqttClient;

        public MqttBackgroundWorker(IHubContext<FactoryHub> hubContext, IServiceScopeFactory scopeFactory)
        {
            _hubContext = hubContext;
            _scopeFactory = scopeFactory;
            // MQTT Client nesnesini burada oluşturuyoruz
            var mqttFactory = new MqttFactory();
            _mqttClient = mqttFactory.CreateMqttClient();
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            // Bağlantı seçenekleri
            // Hatalı builder yerine bunu kullan
            var options = new MqttClientOptionsBuilder()
              .WithTcpServer("127.0.0.1", 1883)
              .WithClientId("DASHBOARD-WORKER")
              .Build();
            // Mesaj geldiğinde tetiklenecek olay
            _mqttClient.ApplicationMessageReceivedAsync += async e =>
            {
                var payload = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);
                var topic = e.ApplicationMessage.Topic;

                using (var scope = _scopeFactory.CreateScope())
                {
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var log = new FactoryLog { Topic = topic, Version = "MQTT", Timestamp = DateTime.Now };
                    try {
                        var json = JsonDocument.Parse(payload).RootElement;
                        if (json.TryGetProperty("hedef_bant", out var hb)) log.HedefBant = hb.GetString();
                        if (json.TryGetProperty("aku_tipi", out var at)) log.AkuTipi = at.GetString();
                        if (json.TryGetProperty("stok_kodu", out var sk)) log.AkuTipi = sk.GetString() + " " + log.AkuTipi;
                        if (json.TryGetProperty("forklift_id", out var fi)) log.ForkliftId = fi.GetString();
                    } catch {}
                    db.FactoryLogs.Add(log);
                    await db.SaveChangesAsync();
                }

                // SignalR üzerinden tarayıcıya yolla
                await _hubContext.Clients.All.SendAsync("ReceiveFactoryData", topic, payload, stoppingToken);
            };

            // Bağlan ve Abone Ol
            await _mqttClient.ConnectAsync(options, stoppingToken);

            var subscribeOptions = new MqttClientSubscribeOptionsBuilder()
                .WithTopicFilter(f => f.WithTopic("fabrika/#"))
                .Build();

            await _mqttClient.SubscribeAsync(subscribeOptions, stoppingToken);
        }
    }
}