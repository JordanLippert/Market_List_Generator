using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Interfaces;
using Market_List_Generator.src.Infrastructure.Catalog;

namespace Market_List_Generator.src.Infrastructure.Repositories;

public sealed class ItemRepository : IItemRepository
{
    private readonly IReadOnlyList<Item> _items;

    public ItemRepository(CatalogLoader loader)
    {
        var (_, items) = loader.Load();
        _items = items;
    }

    public IReadOnlyList<Item> GetAll() => _items;
}
