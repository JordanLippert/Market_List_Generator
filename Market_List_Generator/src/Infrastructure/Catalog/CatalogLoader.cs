using System.Text.Json;
using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Enums;

namespace Market_List_Generator.src.Infrastructure.Catalog;

public sealed class CatalogLoader
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public (IReadOnlyList<CategoryDescriptor> Categories, IReadOnlyList<Item> Items) Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "shared", "catalog.json");
        if (!File.Exists(path))
        {
            throw new FileNotFoundException(
                $"Catalog file not found at '{path}'. The build must copy shared/catalog.json into the output directory.");
        }

        using var stream = File.OpenRead(path);
        var dto = JsonSerializer.Deserialize<CatalogFileDto>(stream, JsonOpts)
            ?? throw new InvalidDataException("Catalog file deserialized to null.");

        var categories = dto.Categories
            .Select(c => new CategoryDescriptor(
                ParseCategory(c.Key),
                c.Name,
                c.Order))
            .OrderBy(c => c.Order)
            .ToList();

        var items = dto.Items
            .Select(i => new Item(
                i.Id,
                i.Name,
                ParseCategory(i.Category),
                i.Variations
                    .Select(v => new Variation(v.Label, v.Unit, v.Qty))
                    .ToList()))
            .ToList();

        return (categories, items);
    }

    private static CategoryType ParseCategory(string key)
    {
        if (!Enum.TryParse<CategoryType>(key, ignoreCase: false, out var value))
        {
            throw new InvalidDataException(
                $"Catalog uses unknown category '{key}'. Add it to CategoryType or fix the JSON.");
        }
        return value;
    }
}
