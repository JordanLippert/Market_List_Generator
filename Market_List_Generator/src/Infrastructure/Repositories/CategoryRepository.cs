using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Enums;
using Market_List_Generator.src.Domain.Interfaces;
using Market_List_Generator.src.Infrastructure.Catalog;

namespace Market_List_Generator.src.Infrastructure.Repositories;

public sealed class CategoryRepository : ICategoryRepository
{
    private readonly IReadOnlyList<CategoryDescriptor> _categories;
    private readonly Dictionary<CategoryType, string> _names;

    public CategoryRepository(CatalogLoader loader)
    {
        var (categories, _) = loader.Load();
        _categories = categories;
        _names = categories.ToDictionary(c => c.Key, c => c.Name);
    }

    public IReadOnlyList<CategoryDescriptor> GetAll() => _categories;

    public string GetName(CategoryType key) =>
        _names.TryGetValue(key, out var name) ? name : key.ToString();
}
