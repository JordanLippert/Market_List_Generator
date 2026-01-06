using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Enums;
using Market_List_Generator.src.Domain.Interfaces;

namespace Market_List_Generator.src.Application.Services
{
    public class MarketListService
    {
        private readonly IItemRepository _repository;

        public MarketListService(IItemRepository repository)
        {
            _repository = repository;
        }

        public IDictionary<CategoryType, List<Item>> GetItemsGroupedByCategory()
        {
            return _repository.GetAll()
                .GroupBy(item => item.Category)
                .ToDictionary(group => group.Key, group => group.ToList());
        }
    }
}
