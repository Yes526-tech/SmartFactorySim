using Microsoft.AspNetCore.Mvc.RazorPages;
using SupervisorDashboard.Data;
using SupervisorDashboard.Models;

namespace SupervisorDashboard.Pages
{
    public class OnaylananUretimlerModel : PageModel
    {
        private readonly AppDbContext _context;

        public OnaylananUretimlerModel(AppDbContext context)
        {
            _context = context;
        }

        public List<MamulDepoIslem> TamamlananUretimler { get; set; } = new();

        public void OnGet()
        {
            TamamlananUretimler = _context.MamulDepoIslemleri
                .Where(m => m.IslemDurumu == "Tamamlandı")
                .OrderByDescending(m => m.IslemZamani)
                .ToList();
        }
    }
}
