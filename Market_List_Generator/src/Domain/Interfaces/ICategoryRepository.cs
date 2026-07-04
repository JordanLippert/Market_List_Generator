using Market_List_Generator.src.Domain.Entities;

namespace Market_List_Generator.src.Domain.Interfaces;

public interface ICategoryRepository
{
    IReadOnlyList<CategoryDescriptor> GetAll();
    string GetName(Market_List_Generator.src.Domain.Enums.CategoryType key);
}
