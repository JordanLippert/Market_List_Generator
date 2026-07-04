using Market_List_Generator.src.Domain.Enums;

namespace Market_List_Generator.src.Domain.Entities;

public sealed record CategoryDescriptor(CategoryType Key, string Name, int Order);
