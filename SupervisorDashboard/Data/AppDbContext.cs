using Microsoft.EntityFrameworkCore;
using SupervisorDashboard.Models;

namespace SupervisorDashboard.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
        
        // Veritabanındaki tablomuz
        public DbSet<FactoryLog> FactoryLogs { get; set; }
    }
}