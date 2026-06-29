using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SupervisorDashboard.Models; // <-- EKSİK OLAN VE SORUNU ÇÖZEN SATIR BURASI

[Table("mamul_depo_islemleri")]
public class MamulDepoIslem
{
    [Key]
    public int Id { get; set; }

    [Column("stok_kodu")]
    public string? StokKodu { get; set; }

    [Column("malzeme_aciklamasi")]
    public string? MalzemeAciklamasi { get; set; }

    [Column("lokasyon_no")]
    public string? LokasyonNo { get; set; }

    [Column("lokasyon_adi")]
    public string? LokasyonAdi { get; set; }

    [Column("lot_grup_no")]
    public string? LotGrupNo { get; set; }

    [Column("ulke_seri_no")]
    public string? UlkeSeriNo { get; set; }

    [Column("hedef_bant")]
    public string? HedefBant { get; set; }

    [Column("islem_durumu")]
    public string? IslemDurumu { get; set; } = "Beklemede";

    [Column("islem_zamani")]
    public DateTime IslemZamani { get; set; } = DateTime.Now;
}