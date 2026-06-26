using System.ComponentModel.DataAnnotations;

namespace SupervisorDashboard.Models
{
    public class FactoryLog
    {
        [Key]
        public int Id { get; set; }
        
        // Verinin ne zaman oluştuğu
        public DateTime Timestamp { get; set; } = DateTime.Now;
        
        // MQTT konusu (Örn: fabrika/mamul_depo/sevkiyat)
        public string Topic { get; set; } = string.Empty;
        
        // --- AKÜ SEVKİYAT ALANLARI ---
        public string? AkuTipi { get; set; }
        public string? RafKonumu { get; set; } // Manuel girilen veri
        public string? HedefBant { get; set; }
        public string? ForkliftId { get; set; }
        
        // --- ETİKET SEVKİYAT ALANLARI ---
        public string? EtiketTipi { get; set; }
        public int? Miktar { get; set; }
    }
}