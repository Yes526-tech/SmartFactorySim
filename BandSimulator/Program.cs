using System;
using System.Text.Json;
using System.Threading.Tasks;
using MQTTnet;
using MQTTnet.Client;

class Program
{
    static async Task Main(string[] args)
    {
        // 1. MQTT İstemcisi Oluşturma
        var mqttFactory = new MqttFactory();
        var mqttClient = mqttFactory.CreateMqttClient();

        // 2. Bağlantı Ayarları (Sanal Fabrika Sunucusu)
        var options = new MqttClientOptionsBuilder()
            .WithClientId("BANT-2-SIMULATOR") 
            .WithTcpServer("localhost", 1883) 
            .Build();

        Console.WriteLine("Bant-2 Simülatörü başlatılıyor...");
        await mqttClient.ConnectAsync(options, System.Threading.CancellationToken.None);
        Console.WriteLine("Ana sunucuya başarıyla bağlanıldı!");

        // 3. Ortak Sözleşmemiz Olan JSON Verisini Hazırlama
        var talepVerisi = new
        {
            islem_id = "REQ-" + new Random().Next(10000, 99999),
            zaman_damgasi = DateTime.UtcNow.ToString("O"),
            kaynak_nokta = "BANT-2",
            malzeme_tipi = "Rulo Etiket (Tip A)",
            kalan_seviye_yuzde = 15,
            durum_kodu = "KRITIK_UYARI",
            vardiya_id = "VARD-Sabah"
        };

        string jsonPayload = JsonSerializer.Serialize(talepVerisi);

        // 4. Mesajı Paketleme ve İlgili Kanala (Topic) Gönderme
        var message = new MqttApplicationMessageBuilder()
            .WithTopic("fabrika/bantlar/bant2/talep")
            .WithPayload(jsonPayload)
            .WithQualityOfServiceLevel(MQTTnet.Protocol.MqttQualityOfServiceLevel.AtLeastOnce)
            .Build();

        Console.WriteLine("Kritik seviye algılandı! Malzeme talebi MQTT'ye fırlatılıyor...");
        await mqttClient.PublishAsync(message, System.Threading.CancellationToken.None);
        
        Console.WriteLine("Mesaj saniyeler içinde iletildi. Simülasyonu kapatmak için Enter'a basın.");
        Console.ReadLine();
    }
}