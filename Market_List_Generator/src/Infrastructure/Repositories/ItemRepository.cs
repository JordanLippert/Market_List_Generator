using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Interfaces;

namespace Market_List_Generator.src.Infrastructure.Repositories;

// TEMPORARY stub — Task 9 replaces this with a CatalogLoader-backed implementation.
public sealed class ItemRepository : IItemRepository
{
    public IReadOnlyList<Item> GetAll() => Array.Empty<Item>();
}
