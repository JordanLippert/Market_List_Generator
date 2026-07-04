using Market_List_Generator.src.Domain.Enums;

namespace Market_List_Generator.src.Domain.Entities;

public sealed record Item(
    int Id,
    string Name,
    CategoryType Category,
    IReadOnlyList<Variation> Variations);
