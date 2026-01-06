using Market_List_Generator.src.Domain.Enums;

namespace Market_List_Generator.src.Domain.Entities
{
    public record Item(
        int Id,
        string Name,
        CategoryType Category
    );
}
