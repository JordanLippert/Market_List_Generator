using Market_List_Generator.src.Domain.Entities;
using Market_List_Generator.src.Domain.Enums;
using Market_List_Generator.src.Domain.Interfaces;

namespace Market_List_Generator.src.Infrastructure.Repositories;

public class ItemRepository : IItemRepository
{
    private static readonly IReadOnlyList<Item> _items = new List<Item>
    {
        // =========================
        // GrainsAndBakery
        // =========================
        new(1, "Arroz", CategoryType.GrainsAndBakery),
        new(2, "Feijão", CategoryType.GrainsAndBakery),
        new(3, "Macarrão", CategoryType.GrainsAndBakery),
        new(4, "Pão", CategoryType.GrainsAndBakery),
        new(5, "Pão de forma", CategoryType.GrainsAndBakery),
        new(6, "Farinha de trigo", CategoryType.GrainsAndBakery),
        new(7, "Farinha de mandioca", CategoryType.GrainsAndBakery),
        new(8, "Fubá", CategoryType.GrainsAndBakery),
        new(9, "Maizena", CategoryType.GrainsAndBakery),
        new(10, "Cereal", CategoryType.GrainsAndBakery),
        new(11, "Aveia", CategoryType.GrainsAndBakery),
        new(12, "Biscoito salgado", CategoryType.GrainsAndBakery),
        new(13, "Biscoito doce", CategoryType.GrainsAndBakery),
        new(14, "Torradas", CategoryType.GrainsAndBakery),
        new(15, "Pipoca", CategoryType.GrainsAndBakery),
        new(16, "Bolo pronto", CategoryType.GrainsAndBakery),

        // =========================
        // DairyAndEggs
        // =========================
        new(20, "Leite", CategoryType.DairyAndEggs),
        new(21, "Leite em pó", CategoryType.DairyAndEggs),
        new(22, "Manteiga", CategoryType.DairyAndEggs),
        new(23, "Margarina", CategoryType.DairyAndEggs),
        new(24, "Creme de leite", CategoryType.DairyAndEggs),
        new(25, "Leite condensado", CategoryType.DairyAndEggs),
        new(26, "Iogurte", CategoryType.DairyAndEggs),
        new(27, "Queijo", CategoryType.DairyAndEggs),
        new(28, "Queijo ralado", CategoryType.DairyAndEggs),
        new(29, "Requeijão", CategoryType.DairyAndEggs),
        new(30, "Ovos", CategoryType.DairyAndEggs),
        new(31, "Doce de leite", CategoryType.DairyAndEggs),
        new(32, "Nata", CategoryType.DairyAndEggs),

        // =========================
        // Meats
        // =========================
        new(40, "Frango inteiro", CategoryType.Meats),
        new(41, "Peito de frango", CategoryType.Meats),
        new(42, "Coxa e sobrecoxa", CategoryType.Meats),
        new(43, "Asa de frango", CategoryType.Meats),
        new(44, "Carne bovina (alcatra, patinho, etc)", CategoryType.Meats),
        new(45, "Carne moída", CategoryType.Meats),
        new(46, "Costela", CategoryType.Meats),
        new(47, "Carne de porco", CategoryType.Meats),
        new(48, "Linguiça", CategoryType.Meats),
        new(49, "Salsicha", CategoryType.Meats),
        new(50, "Bacon", CategoryType.Meats),
        new(51, "Presunto", CategoryType.Meats),
        new(52, "Peito de peru", CategoryType.Meats),
        new(53, "Mortadela", CategoryType.Meats),
        new(54, "Peixe", CategoryType.Meats),
        new(55, "Atum (lata)", CategoryType.Meats),
        new(56, "Sardinha (lata)", CategoryType.Meats),

        // =========================
        // Produce (Hortifruti)
        // =========================
        new(60, "Alface", CategoryType.Produce),
        new(61, "Tomate", CategoryType.Produce),
        new(62, "Cebola", CategoryType.Produce),
        new(63, "Alho", CategoryType.Produce),
        new(64, "Batata", CategoryType.Produce),
        new(65, "Batata doce", CategoryType.Produce),
        new(66, "Cenoura", CategoryType.Produce),
        new(67, "Beterraba", CategoryType.Produce),
        new(68, "Chuchu", CategoryType.Produce),
        new(69, "Abobrinha", CategoryType.Produce),
        new(70, "Abóbora", CategoryType.Produce),
        new(71, "Pepino", CategoryType.Produce),
        new(72, "Pimentão", CategoryType.Produce),
        new(73, "Brócolis", CategoryType.Produce),
        new(74, "Couve", CategoryType.Produce),
        new(75, "Repolho", CategoryType.Produce),
        new(76, "Couve-flor", CategoryType.Produce),
        new(77, "Berinjela", CategoryType.Produce),
        new(78, "Mandioca (Aipim)", CategoryType.Produce),
        new(79, "Inhame", CategoryType.Produce),
        new(80, "Banana", CategoryType.Produce),
        new(81, "Maçã", CategoryType.Produce),
        new(82, "Laranja", CategoryType.Produce),
        new(83, "Limão", CategoryType.Produce),
        new(84, "Mamão", CategoryType.Produce),
        new(85, "Melancia", CategoryType.Produce),
        new(86, "Melão", CategoryType.Produce),
        new(87, "Abacaxi", CategoryType.Produce),
        new(88, "Uva", CategoryType.Produce),
        new(89, "Morango", CategoryType.Produce),
        new(90, "Manga", CategoryType.Produce),
        new(91, "Pera", CategoryType.Produce),
        new(92, "Goiaba", CategoryType.Produce),
        new(93, "Tangerina (Bergamota)", CategoryType.Produce),

        // =========================
        // CondimentsAndSpices
        // =========================
        new(100, "Sal", CategoryType.CondimentsAndSpices),
        new(101, "Sal grosso", CategoryType.CondimentsAndSpices),
        new(102, "Açúcar", CategoryType.CondimentsAndSpices),
        new(103, "Açúcar mascavo", CategoryType.CondimentsAndSpices),
        new(104, "Óleo de cozinha", CategoryType.CondimentsAndSpices),
        new(105, "Azeite", CategoryType.CondimentsAndSpices),
        new(106, "Vinagre", CategoryType.CondimentsAndSpices),
        new(107, "Molho de tomate", CategoryType.CondimentsAndSpices),
        new(108, "Extrato de tomate", CategoryType.CondimentsAndSpices),
        new(109, "Ketchup", CategoryType.CondimentsAndSpices),
        new(110, "Mostarda", CategoryType.CondimentsAndSpices),
        new(111, "Maionese", CategoryType.CondimentsAndSpices),
        new(112, "Molho inglês", CategoryType.CondimentsAndSpices),
        new(113, "Molho shoyu", CategoryType.CondimentsAndSpices),
        new(114, "Tempero completo", CategoryType.CondimentsAndSpices),
        new(115, "Colorau", CategoryType.CondimentsAndSpices),
        new(116, "Cominho", CategoryType.CondimentsAndSpices),
        new(117, "Orégano", CategoryType.CondimentsAndSpices),
        new(118, "Pimenta do reino", CategoryType.CondimentsAndSpices),
        new(119, "Alho em pó", CategoryType.CondimentsAndSpices),
        new(120, "Caldo de galinha", CategoryType.CondimentsAndSpices),
        new(121, "Caldo de carne", CategoryType.CondimentsAndSpices),
        new(122, "Fermento em pó", CategoryType.CondimentsAndSpices),

        // =========================
        // BeveragesAndSnacks
        // =========================
        new(130, "Café", CategoryType.BeveragesAndSnacks),
        new(131, "Achocolatado em pó", CategoryType.BeveragesAndSnacks),
        new(132, "Suco de caixinha", CategoryType.BeveragesAndSnacks),
        new(133, "Suco em pó", CategoryType.BeveragesAndSnacks),
        new(134, "Refrigerante", CategoryType.BeveragesAndSnacks),
        new(135, "Água mineral", CategoryType.BeveragesAndSnacks),
        new(136, "Água com gás", CategoryType.BeveragesAndSnacks),
        new(137, "Chá", CategoryType.BeveragesAndSnacks),
        new(138, "Chocolate", CategoryType.BeveragesAndSnacks),
        new(139, "Bombom", CategoryType.BeveragesAndSnacks),
        new(140, "Bala", CategoryType.BeveragesAndSnacks),
        new(141, "Chiclete", CategoryType.BeveragesAndSnacks),
        new(142, "Sorvete", CategoryType.BeveragesAndSnacks),
        new(143, "Gelatina", CategoryType.BeveragesAndSnacks),
        new(144, "Pudim pronto", CategoryType.BeveragesAndSnacks),
        new(145, "Salgadinho", CategoryType.BeveragesAndSnacks),
        new(146, "Amendoim", CategoryType.BeveragesAndSnacks),
        new(147, "Castanha", CategoryType.BeveragesAndSnacks),

        // =========================
        // Cleaning
        // =========================
        new(150, "Sabão em pó", CategoryType.Cleaning),
        new(151, "Sabão em barra", CategoryType.Cleaning),
        new(152, "Amaciante", CategoryType.Cleaning),
        new(153, "Alvejante", CategoryType.Cleaning),
        new(154, "Detergente", CategoryType.Cleaning),
        new(155, "Esponja", CategoryType.Cleaning),
        new(156, "Palha de aço", CategoryType.Cleaning),
        new(157, "Água sanitária", CategoryType.Cleaning),
        new(158, "Desinfetante", CategoryType.Cleaning),
        new(159, "Limpador multiuso", CategoryType.Cleaning),
        new(160, "Desengordurante", CategoryType.Cleaning),
        new(161, "Limpa vidros", CategoryType.Cleaning),
        new(162, "Limpador de piso", CategoryType.Cleaning),
        new(163, "Lustra móveis", CategoryType.Cleaning),
        new(164, "Limpador de banheiro", CategoryType.Cleaning),
        new(165, "Saco de lixo", CategoryType.Cleaning),
        new(166, "Pano de chão", CategoryType.Cleaning),
        new(167, "Vassoura", CategoryType.Cleaning),
        new(168, "Rodo", CategoryType.Cleaning),
        // Itens de cozinha para preparo/armazenamento
        new(169, "Papel filme", CategoryType.Cleaning),
        new(190, "Papel manteiga", CategoryType.Cleaning),
        new(191, "Papel alumínio", CategoryType.Cleaning),

        // =========================
        // PersonalHygiene
        // =========================
        new(170, "Sabonete", CategoryType.PersonalHygiene),
        new(171, "Shampoo", CategoryType.PersonalHygiene),
        new(172, "Condicionador", CategoryType.PersonalHygiene),
        new(173, "Creme de pentear", CategoryType.PersonalHygiene),
        new(174, "Desodorante", CategoryType.PersonalHygiene),
        new(175, "Pasta de dente", CategoryType.PersonalHygiene),
        new(176, "Escova de dente", CategoryType.PersonalHygiene),
        new(177, "Fio dental", CategoryType.PersonalHygiene),
        new(178, "Enxaguante bucal", CategoryType.PersonalHygiene),
        new(179, "Papel higiênico", CategoryType.PersonalHygiene),
        new(180, "Absorvente", CategoryType.PersonalHygiene),
        new(181, "Fralda descartável", CategoryType.PersonalHygiene),
        new(182, "Lenço umedecido", CategoryType.PersonalHygiene),
        new(183, "Creme hidratante", CategoryType.PersonalHygiene),
        new(184, "Protetor solar", CategoryType.PersonalHygiene),
        new(185, "Repelente", CategoryType.PersonalHygiene),
        new(186, "Aparelho de barbear", CategoryType.PersonalHygiene),
        new(187, "Creme de barbear", CategoryType.PersonalHygiene),
        new(188, "Cotonete", CategoryType.PersonalHygiene),
        new(189, "Algodão", CategoryType.PersonalHygiene),
    };

    public IReadOnlyList<Item> GetAll() => _items;
}
