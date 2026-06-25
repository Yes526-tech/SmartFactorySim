using Microsoft.AspNetCore.SignalR;

namespace SupervisorDashboard.Hubs
{
    // Ön yüzdeki JavaScript bu sınıfa bağlanacak
    public class FactoryHub : Hub
    {
        // İhtiyaç halinde ön yüzden gelen komutlar da buradan dinlenebilir
    }
}