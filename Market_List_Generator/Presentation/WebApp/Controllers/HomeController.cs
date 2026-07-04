using Market_List_Generator.src.Application.DTOs;
using Market_List_Generator.src.Application.Services;
using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Enums;
using Market_List_Generator.src.Domain.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Text;

namespace Market_List_Generator.Controllers;

public class HomeController : Controller
{
    private readonly MarketListService _service;
    private readonly ICategoryRepository _categories;

    public HomeController(MarketListService service, ICategoryRepository categories)
    {
        _service = service;
        _categories = categories;
    }

    public IActionResult Index()
    {
        var groupedItems = _service.GetItemsGroupedByCategory();
        return View(groupedItems);
    }

    [HttpPost]
    public IActionResult GenerateWhatsAppLink([FromBody] List<SelectedItemDto> selected)
    {
        var byId = _service.GetItemsGroupedByCategory()
            .SelectMany(g => g.Value)
            .ToDictionary(item => item.Id);

        var picked = selected
            .Where(s => byId.ContainsKey(s.Id))
            .Select(s => (Item: byId[s.Id], Variation: s.VariationLabel))
            .ToList();

        var message = FormatMessage(picked);
        var whatsappUrl = $"https://api.whatsapp.com/send?text={Uri.EscapeDataString(message)}";

        return Json(new { url = whatsappUrl });
    }

    private string FormatMessage(List<(Item Item, string? Variation)> items)
    {
        var grouped = items
            .GroupBy(x => x.Item.Category)
            .OrderBy(g => g.Key);

        var sb = new StringBuilder();
        sb.AppendLine("*LISTA DE COMPRAS*");
        sb.AppendLine();

        foreach (var group in grouped)
        {
            sb.AppendLine($"*{_categories.GetName(group.Key)}*");
            foreach (var (item, variation) in group.OrderBy(x => x.Item.Name))
            {
                var suffix = string.IsNullOrWhiteSpace(variation) ? "" : $" ({variation})";
                sb.AppendLine($"  - {item.Name}{suffix}");
            }
            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }
}
