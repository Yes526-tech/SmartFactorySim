using Microsoft.EntityFrameworkCore;
using SupervisorDashboard.Data;
using SupervisorDashboard.Hubs;
using SupervisorDashboard.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Gerekli Servisleri Kaydet
builder.Services.AddRazorPages();          
builder.Services.AddControllersWithViews(); 
builder.Services.AddControllers();         
builder.Services.AddSignalR();

// --- KRİTİK DÜZELTME: Sadece SQLite bağlantısı kalmalı ---
builder.Services.AddDbContext<AppDbContext>(options => 
    options.UseSqlite("Data Source=factory.db"));

builder.Services.AddHostedService<MqttBackgroundWorker>();

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

// 2. Razor Pages
app.MapRazorPages();
app.MapControllers();

// 3. MVC Route
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=MamulDepo}/{action=Index}/{id?}");

// 4. SignalR endpoint
app.MapHub<FactoryHub>("/factoryHub");

app.Run();