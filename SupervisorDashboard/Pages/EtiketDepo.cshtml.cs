using Microsoft.AspNetCore.Mvc.RazorPages;
using SupervisorDashboard.Data;
using SupervisorDashboard.Models;

namespace SupervisorDashboard.Pages
{
    public class EtiketDepoModel : PageModel
    {
        private readonly AppDbContext _context;

        public EtiketDepoModel(AppDbContext context)
        {
            _context = context;
        }

        public List<EtiketDepoIslem> EtiketIslemleri { get; set; } = new();

        public void OnGet()
        {
            EtiketIslemleri = _context.EtiketDepoIslemleri
                .OrderByDescending(e => e.IslemZamani)
                .ToList();
        }
    }
}
