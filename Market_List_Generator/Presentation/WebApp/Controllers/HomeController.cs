using Market_List_Generator.src.Application.Services;
using Market_List_Generator.src.Domain.Entities;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace Market_List_Generator.Controllers;

public class HomeController : Controller
{
    private readonly MarketListService _service;

    public HomeController(MarketListService service)
    {
        _service = service;
    }

    public IActionResult Index()
    {
        var groupedItems = _service.GetItemsGroupedByCategory();
        return View(groupedItems);
    }

    [HttpPost]
    public IActionResult GenerateWhatsAppLink([FromBody] List<int> selectedIds)
    {
        var items = _service.GetItemsGroupedByCategory()
            .SelectMany(g => g.Value)
            .Where(item => selectedIds.Contains(item.Id))
            .ToList();

        var message = FormatMessage(items);
        var whatsappUrl = $"https://api.whatsapp.com/send?text={Uri.EscapeDataString(message)}";

        return Json(new { url = whatsappUrl });
    }

    private string FormatMessage(List<Item> items)
    {
        var grouped = items.GroupBy(i => i.Category)
            .OrderBy(g => g.Key);

        var sb = new StringBuilder();
        sb.AppendLine("*LISTA DE COMPRAS*");
        sb.AppendLine();

        foreach (var group in grouped)
        {
            sb.AppendLine($"*{GetCategoryName(group.Key)}*");
            foreach (var item in group.OrderBy(i => i.Name))
            {
                sb.AppendLine($"  - {item.Name}");
            }
            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }

    private string GetCategoryName(src.Domain.Enums.CategoryType category)
    {
        return category switch
        {
            src.Domain.Enums.CategoryType.Grains => "Grãos e Farinhas",
            src.Domain.Enums.CategoryType.Bakery => "Padaria e Massas",
            src.Domain.Enums.CategoryType.DairyAndEggs => "Laticínios e Ovos",
            src.Domain.Enums.CategoryType.Meats => "Carnes e Frios",
            src.Domain.Enums.CategoryType.Produce => "Hortifruti",
            src.Domain.Enums.CategoryType.CondimentsAndSpices => "Condimentos e Temperos",
            src.Domain.Enums.CategoryType.Beverages => "Bebidas",
            src.Domain.Enums.CategoryType.Snacks => "Doces e Lanches",
            src.Domain.Enums.CategoryType.Frozen => "Congelados",
            src.Domain.Enums.CategoryType.Alcoholic => "Bebidas Alcoólicas",
            src.Domain.Enums.CategoryType.Cleaning => "Limpeza",
            src.Domain.Enums.CategoryType.PersonalHygiene => "Higiene Pessoal",
            src.Domain.Enums.CategoryType.Pets => "Pet Shop",
            src.Domain.Enums.CategoryType.Utilities => "Utilidades e Bazar",
            _ => category.ToString()
        };
    }
}
