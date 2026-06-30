using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace SupervisorDashboard.Pages;

    public class IndexModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;
        private readonly Data.AppDbContext _context;

        public IndexModel(ILogger<IndexModel> logger, Data.AppDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        public void OnGet()
        {
            // Bekleyen/Aktif etiket sevkiyatlarını al
            var aktifEtiketler = _context.EtiketDepoIslemleri
                .Where(e => e.IslemDurumu != "Tamamlandı" && e.IslemDurumu != "İptal Edildi")
                .OrderByDescending(e => e.IslemZamani)
                .Take(3)
                .ToList();

            ViewData["AktifEtiketler"] = aktifEtiketler;

            var aktifMamulIslemleri = _context.MamulDepoIslemleri
                .Where(m => m.IslemDurumu == "Şarj Bekliyor" || m.IslemDurumu == "Transferde")
                .OrderByDescending(m => m.IslemZamani)
                .Take(3)
                .ToList();
            
            ViewData["AktifMamulIslemleri"] = aktifMamulIslemleri;

            // Son tamamlanan üretimler (onaylananlar listesi)
            var tamamlananlar = _context.MamulDepoIslemleri
                .Where(m => m.IslemDurumu == "Tamamlandı")
                .OrderByDescending(m => m.IslemZamani)
                .Take(3)
                .ToList();

            ViewData["TamamlananUretimler"] = tamamlananlar;
        }
    }
