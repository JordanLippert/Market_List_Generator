using Market_List_Generator.src.Application.Services;
using Market_List_Generator.src.Domain.Interfaces;
using Market_List_Generator.src.Infrastructure.Repositories;
using System.Text;

// Set UTF-8 encoding
Console.OutputEncoding = Encoding.UTF8;

// In development the wwwroot lives under Presentation/WebApp/wwwroot;
// in the published image it's copied to the content root (/app/wwwroot).
const string devWebRoot = "Presentation/WebApp/wwwroot";
var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = Directory.Exists(devWebRoot) ? devWebRoot : null
});

builder.Services.AddControllersWithViews()
    .AddRazorOptions(options =>
    {
        options.ViewLocationFormats.Add("/Presentation/WebApp/Views/{1}/{0}.cshtml");
        options.ViewLocationFormats.Add("/Presentation/WebApp/Views/Shared/{0}.cshtml");
    });

builder.Services.AddSingleton<IItemRepository, ItemRepository>();
builder.Services.AddSingleton<MarketListService>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

// Configure static files to serve from wwwroot
app.UseStaticFiles();

app.UseRouting();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

Console.WriteLine("Servidor iniciado!");
Console.WriteLine("Acesse: https://localhost:51773");
Console.WriteLine("Ou: http://localhost:51774");
Console.WriteLine("\nPressione Ctrl+C para encerrar.");

app.Run();
