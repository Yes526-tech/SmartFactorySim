using System;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using MQTTnet;
using MQTTnet.Client;

class Program
{
    static async Task Main(string[] args)
    {
        var mqttFactory = new MQTTnet.MqttFactory();
        var mqttClient = mqttFactory.CreateMqttClient();

        var options = new MqttClientOptionsBuilder()
            .WithClientId("DEPO-SIMULATOR")
            .WithTcpServer("localhost", 1883)
            .Build();

        // 1. MESAJ GELDİĞİNDE NE YAPACAĞINI BURADA TANIMLIYORUZ (Event Handler)
        mqttClient.ApplicationMessageReceivedAsync += async e =>
        {
            // Gelen bayt verisini string'e (JSON'a) çevir
            string gelenJson = Encoding.UTF8.GetString(e.ApplicationMessage.PayloadSegment);
            string gelenKanal = e.ApplicationMessage.Topic;
            
            Console.WriteLine($"\n[ACİL ÇAĞRI ALINDI] Kanal: {gelenKanal}");
            Console.WriteLine($"İçerik: {gelenJson}");
            Console.WriteLine("Sistem: Depo stoğu kontrol ediliyor...");
            
            // Gerçekçilik katmak için 2 saniye beklet (Stok kontrolü & AGV hazırlığı)
            await Task.Delay(2000);

            // 2. BANDA VERİLECEK YANITI HAZIRLA
            var aksiyonVerisi = new
            {
                zaman_damgasi = DateTime.UtcNow.ToString("O"),
                hedef_nokta = "BANT-2",
                aksiyon_durumu = "SEVKIYAT_BASLADI",
                tasiyici_arac_id = "AGV-04",
                tahmini_varis_suresi_sn = 120
            };

            string responsePayload = JsonSerializer.Serialize(aksiyonVerisi);

            var responseMessage = new MqttApplicationMessageBuilder()
                .WithTopic("fabrika/depolar/etiket_depo/aksiyon")
                .WithPayload(responsePayload)
                .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
                .Build();

            // Yanıtı MQTT sunucusuna fırlat
            await mqttClient.PublishAsync(responseMessage, System.Threading.CancellationToken.None);
            Console.WriteLine("-> Aksiyon alındı: Sevkiyat başladı yanıtı sisteme gönderildi!");
        };

        // 2. SUNUCUYA BAĞLAN
        Console.WriteLine("Etiket Deposu sistemi başlatılıyor...");
        await mqttClient.ConnectAsync(options, System.Threading.CancellationToken.None);
        Console.WriteLine("Ana sunucuya bağlanıldı.");

        // 3. KANALLARA ABONE OL (Subscribe)
        // '+' işareti bir jokerdir. bant1, bant2, bant3 hepsini dinler.
        var subscribeOptions = mqttFactory.CreateSubscribeOptionsBuilder()
            .WithTopicFilter(f => { f.WithTopic("fabrika/bantlar/+/talep"); })
            .Build();

        await mqttClient.SubscribeAsync(subscribeOptions, System.Threading.CancellationToken.None);
        Console.WriteLine("Tüm üretim bantları dinleniyor. Çağrı bekleniyor...\n");

        // Konsolun kapanmaması için sonsuz bekleme
        Console.ReadLine();
    }
}