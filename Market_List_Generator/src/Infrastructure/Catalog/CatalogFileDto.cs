namespace Market_List_Generator.src.Infrastructure.Catalog;

internal sealed class CatalogFileDto
{
    public List<CategoryDto> Categories { get; set; } = new();
    public List<ItemDto> Items { get; set; } = new();
}

internal sealed class CategoryDto
{
    public string Key { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int Order { get; set; }
}

internal sealed class ItemDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public List<VariationDto> Variations { get; set; } = new();
}

internal sealed class VariationDto
{
    public string Label { get; set; } = string.Empty;
    public string? Unit { get; set; }
    public decimal? Qty { get; set; }
}
