using Microsoft.EntityFrameworkCore;
using SupervisorDashboard.Data; // AppDbContext bu klasörün içinde olduğu için bu şart!
using SupervisorDashboard.Hubs;
using SupervisorDashboard.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Gerekli Servisleri Kaydet
builder.Services.AddRazorPages();
builder.Services.AddSignalR(); // SignalR eklendi
builder.Services.AddHostedService<MqttBackgroundWorker>(); // Arka plan işçimiz eklendi

// Veritabanı bağlantısı (SQLite kullanıyoruz)
builder.Services.AddDbContext<AppDbContext>(options => 
    options.UseSqlite("Data Source=factory.db"));

var app = builder.Build();



if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthorization();

app.MapRazorPages();

// 2. JavaScript'in bağlanacağı SignalR endpoint yolunu tanımla
app.MapHub<FactoryHub>("/factoryHub");

app.Run();