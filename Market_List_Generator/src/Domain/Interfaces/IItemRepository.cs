using Market_List_Generator.src.Domain.Entities;

namespace Market_List_Generator.src.Domain.Interfaces
{
    public interface IItemRepository
    {
        IReadOnlyList<Item> GetAll();
    }
}
