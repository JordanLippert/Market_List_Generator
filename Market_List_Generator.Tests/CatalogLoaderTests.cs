using Market_List_Generator.src.Domain.Enums;
using Market_List_Generator.src.Infrastructure.Catalog;
using Xunit;

namespace Market_List_Generator.Tests;

public class CatalogLoaderTests
{
    [Fact]
    public void Load_ReturnsAllCategoriesAndItems()
    {
        var loader = new CatalogLoader();

        var (categories, items) = loader.Load();

        Assert.NotEmpty(categories);
        Assert.NotEmpty(items);
        Assert.All(items, item => Assert.True(Enum.IsDefined(typeof(CategoryType), item.Category)));
        Assert.All(items, item => Assert.NotNull(item.Variations));
        Assert.Equal(14, categories.Count);
    }

    [Fact]
    public void Load_CategoriesAreSortedByOrder()
    {
        var loader = new CatalogLoader();

        var (categories, _) = loader.Load();

        var orders = categories.Select(c => c.Order).ToList();
        var sorted = orders.OrderBy(o => o).ToList();
        Assert.Equal(sorted, orders);
    }
}
