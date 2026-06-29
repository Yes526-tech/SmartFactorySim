using System.ComponentModel.DataAnnotations;

namespace SupervisorDashboard.Models
{
    public class FactoryLog
    {
        [Key]
        public int Id { get; set; }
        
        public DateTime Timestamp { get; set; } = DateTime.Now;
        public string Topic { get; set; } = string.Empty;
        
        // YENİ EKLENEN: Hatanın sebebi olan Versiyon Sütunu
        public string? Version { get; set; }
        
        // --- AKÜ SEVKİYAT ALANLARI ---
        public string? AkuTipi { get; set; }
        public string? RafKonumu { get; set; }
        public string? HedefBant { get; set; }
        public string? ForkliftId { get; set; }
        
        // --- ETİKET SEVKİYAT ALANLARI ---
        public string? EtiketTipi { get; set; }
        public int? Miktar { get; set; }
    }
}