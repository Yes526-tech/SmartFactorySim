using System.Text;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Hosting;
using MQTTnet;
using MQTTnet.Client; // Kütüphanenin tam isim uzayı
using SupervisorDashboard.Hubs;

namespace SupervisorDashboard.Services
{
    public class MqttBackgroundWorker : BackgroundService
    {
        private readonly IHubContext<FactoryHub> _hubContext;
        private readonly IMqttClient _mqttClient;

        public MqttBackgroundWorker(IHubContext<FactoryHub> hubContext)
        {
            _hubContext = hubContext;
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
            _mqttClient.ApplicationMessageReceivedAsync += e =>
            {
                var payload = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);
                var topic = e.ApplicationMessage.Topic;

                // SignalR üzerinden tarayıcıya yolla
                return _hubContext.Clients.All.SendAsync("ReceiveFactoryData", topic, payload, stoppingToken);
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