using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SupervisorDashboard.Data;
using SupervisorDashboard.Models;

namespace SupervisorDashboard.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LogController : ControllerBase
    {
        private readonly AppDbContext _context;

        public LogController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<IActionResult> SaveLog([FromBody] FactoryLog log)
        {
            // Arka planda otomatik doldurulacak veriler
            log.Timestamp = DateTime.Now;
            log.Topic = "fabrika/mamul_depo/manuel_rapor";
            log.Version = "9.000"; 
            
            // Veritabanına kaydet
            _context.FactoryLogs.Add(log);
            await _context.SaveChangesAsync();
            
            return Ok(new { message = "Rapor başarıyla kaydedildi!" });
        }

        [HttpGet]
        public async Task<IActionResult> GetLogs()
        {
          // Veritabanından en yeni 50 kaydı çekip gönderiyoruz
          var logs = await _context.FactoryLogs
          .OrderByDescending(l => l.Timestamp)
          .Take(50)
          .ToListAsync();
        
        return Ok(logs);
        }
    }
}