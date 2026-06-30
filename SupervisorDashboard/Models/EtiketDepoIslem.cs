using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupervisorDashboard.Models
{
    public class EtiketDepoIslem
    {
        [Key]
        public int Id { get; set; }
        
        [Required]
        public string FirmaMarkasi { get; set; } = string.Empty;
        
        [Required]
        public int Miktar { get; set; }
        
        [Required]
        public string HedefBant { get; set; } = string.Empty;
        
        public string IslemDurumu { get; set; } = "Sevkiyat Yapıldı";
        
        public DateTime IslemZamani { get; set; } = DateTime.Now;
        
        // AGV Tipi / Araç No vs ek bilgiler (Dashboard'da göstermek için)
        public string TasiyiciAracId { get; set; } = string.Empty;
        
        public int KalanSeviyeYuzde { get; set; } = 100;
    }
}
